export const inkVertex = `#version 300 es
precision highp float;
layout(location=0) in vec3 a;
layout(location=1) in vec3 b;
layout(location=2) in vec4 color;
layout(location=3) in vec4 material;
uniform vec2 viewport;
uniform vec2 deviceViewport;
uniform vec3 camera;
uniform vec2 rotation;
uniform float pixelWorld;
uniform int routeCount;
uniform int routeBase;
uniform int routeSpan;
uniform highp isampler2D atlasRoutes;
flat out vec3 pa;
flat out vec3 pb;
flat out vec4 ink;
flat out vec4 pencil;
flat out vec2 deviceShift;
void main(){
 pa=a; pb=b; ink=color; pencil=material; deviceShift=vec2(0);
 if(max(a.z,b.z)<=0.0){gl_Position=vec4(2,2,0,1);return;}
 vec2 corners[6]=vec2[6](vec2(0,0),vec2(1,0),vec2(0,1),vec2(0,1),vec2(1,0),vec2(1,1));
 float r=max(a.z,b.z)+1.414214*pixelWorld;
 vec2 lo=min(a.xy,b.xy)-r,hi=max(a.xy,b.xy)+r;
 if(routeCount==0){
  vec2 pos=mix(lo,hi,corners[gl_VertexID]);
  vec2 rotated=vec2(rotation.x*pos.x-rotation.y*pos.y,rotation.y*pos.x+rotation.x*pos.y);
  vec2 screen=rotated*camera.z+camera.xy;
  gl_Position=vec4(screen/viewport*vec2(2,-2)+vec2(-1,1),0,1);
 }else{
  int row=(gl_InstanceID/routeCount)/routeSpan;
  int index=routeBase+row*routeCount+(gl_InstanceID%routeCount);
  vec4 route=vec4(texelFetch(atlasRoutes,ivec2(index%1024,index/1024),0))*64.0;
  if(route.z<0.0){gl_Position=vec4(2,2,0,1);return;}
  // Rotate the capsule centers before bounding. Reboxing a rotated world
  // rectangle adds empty corner area, especially for diagonal segments.
  // The radius and conservative AA support are rotation invariant.
  vec2 scale=deviceViewport/viewport;
  vec2 deviceA=(vec2(rotation.x*a.x-rotation.y*a.y,rotation.y*a.x+rotation.x*a.y)*camera.z+camera.xy)*scale;
  vec2 deviceB=(vec2(rotation.x*b.x-rotation.y*b.y,rotation.y*b.x+rotation.x*b.y)*camera.z+camera.xy)*scale;
  vec2 extent=vec2(r)*camera.z*scale;
  vec2 first=max(min(deviceA,deviceB)-extent,route.xy);
  vec2 last=min(max(deviceA,deviceB)+extent,route.xy+vec2(64));
  if(any(lessThanEqual(last,first))){gl_Position=vec4(2,2,0,1);return;}
  vec2 device=mix(first,last,corners[gl_VertexID]);
  vec2 atlas=device-route.xy+route.zw;
  deviceShift=route.xy-route.zw;
  gl_Position=vec4(atlas/2048.0*vec2(2,-2)+vec2(-1,1),0,1);
 }
}`;

export const inkFragment = `#version 300 es
precision highp float;
flat in vec2 deviceShift;
flat in vec3 pa;
flat in vec3 pb;
flat in vec4 ink;
flat in vec4 pencil;
out vec4 outColor;
uniform float pixelWorld;
uniform vec2 rotation;
uniform vec2 viewport;
uniform vec2 deviceViewport;
uniform vec3 camera;
uniform float rasterHeight;
uniform highp sampler2DArray pencilGrain;
// The lookup stores deposited graphite at increasing contact thresholds.
// Mipmaps integrate that deposited material, rather than averaging height and
// reapplying a nonlinear contact test at a different zoom.
float contactResponse(vec2 pos, float threshold, float lod, bool hard) {
  float level = clamp(threshold/1.125,0.0,1.0)*31.0;
  float lower = floor(level);
  float base = hard ? 0.0 : 32.0;
  vec2 uv = pos/64.0;
  return mix(textureLod(pencilGrain,vec3(uv,base+lower),lod).r,
             textureLod(pencilGrain,vec3(uv,base+min(31.0,lower+1.0)),lod).r,
             fract(level));
}
float contactThreshold(float q, float pressure, bool hard) {
  float indentation = (hard ? 0.35 : 0.48)+(hard ? 0.40 : 0.42)*pow(pressure,0.8);
  float center = 1.0-indentation;
  // The outermost response layer is identically empty. Keep material support
  // inside existing capsule/culling bounds without clipping deposited grains.
  return mix(center,1.125,pow(clamp(q,0.0,1.0),hard ? 2.4 : 2.8));
}
float pencilContact(vec2 pos, float radius, float dist, float width, bool hard, bool dab) {
  float aa = max(pixelWorld,0.00001);
  // This prototype estimates contact loading from derived width. Raw sample
  // pressure remains untouched; it is not yet carried as a separate GPU field.
  float pressure = sqrt(clamp(2.0*radius/width,0.0,1.0));
  float lod = max(0.0,log2(aa*8.0));
  float q = (dist+radius)/max(radius,0.00001);
  float resolved = smoothstep(0.5,2.0,radius/aa);
  float material = 0.0;
  if (resolved > 0.0) material = contactResponse(pos,contactThreshold(q,pressure,hard),lod,hard);
  if (resolved < 1.0) {
    // Integrate the same contact profile across an unresolved strip/dab. The
    // existing analytic coverage still supplies pixel weight and tiny-dab area.
    float mean = 0.0;
    for (int i=0;i<4;i++) {
      float v = (float(i)+0.5)/4.0;
      float radial = dab ? sqrt(v) : v;
      mean += contactResponse(pos,contactThreshold(radial,pressure,hard),lod,hard)*0.25;
    }
    material = mix(mean,material,resolved);
  }
  return material*(0.24+0.76*sqrt(pressure));
}
void main() {
  vec2 device = vec2(gl_FragCoord.x, rasterHeight - gl_FragCoord.y) + deviceShift;
  vec2 screen = (device * (viewport / deviceViewport) - camera.xy) / camera.z;
  vec2 pos = vec2(rotation.x*screen.x+rotation.y*screen.y, -rotation.y*screen.x+rotation.x*screen.y);
  if (max(pa.z, pb.z) <= 0.0 || ink.a <= 0.0) discard;
  vec2 d = pb.xy - pa.xy;
  float l = dot(d, d);
  float dr = pb.z - pa.z;
  float t = pb.z > pa.z ? 1.0 : 0.0;
  if (l > dr * dr + 0.000001) {
    float u = dot(pos - pa.xy, d) / l;
    float h2 = max(0.0, dot(pos - pa.xy, pos - pa.xy) - u * u * l);
    t = clamp(u + dr * sqrt(h2 / (l * (l - dr * dr))), 0.0, 1.0);
  }
  float radius = mix(pa.z, pb.z, t);
  float dist = length(pos - mix(pa.xy, pb.xy, t)) - radius;
  // A device-pixel footprint remains stable across the center of a hairline.
  float aa = max(pixelWorld, 0.00001);
  // Interval overlap preserves the weight of strips thinner than one pixel.
  float coverage = min(clamp(0.5 - dist / aa, 0.0, 1.0), 2.0 * radius / aa);
  if (l < 0.000001) {
    // A subpixel dab fades with area. Separable tent weights distribute that
    // area across neighboring pixels even when centered on a pixel corner.
    vec2 q = pos - mix(pa.xy, pb.xy, t);
    vec2 offset = vec2(rotation.x*q.x-rotation.y*q.y, rotation.y*q.x+rotation.x*q.y) / aa;
    float r = radius / aa;
    float tent = max(0.0, 1.0-abs(offset.x)) * max(0.0, 1.0-abs(offset.y));
    float area = min(1.0, 3.14159265359 * r * r * tent);
    coverage = mix(area, coverage, smoothstep(0.5, 1.0, r));
  }
  if (coverage <= 0.0) discard;
  // All pieces of one stroke share this opacity. MAX unions their coverage
  // once; separate overlapping translucent strokes composite in painter order.
  float alpha = coverage * ink.a;
  if (pencil.x > 0.0) {
    bool hard = pencil.x < 1.5 / 255.0;
    float width = exp2(dot(pencil.yz * 255.0, vec2(1,256)) / 1024.0 - 32.0);
    float graphite = pencilContact(pos,radius,dist,width,hard,l < 0.000001);
    alpha = ink.a * coverage * graphite;
  }
  outColor = vec4(ink.rgb * alpha, alpha);
}`;
