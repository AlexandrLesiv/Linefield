import { vertex, fragment } from "./gpu-shaders.ts";
const quad = ` float r=max(pa.z,pb.z)+1.414214;
 vec2 p=mix(min(pa.xy,pb.xy)-r,max(pa.xy,pb.xy)+r,corners[gl_VertexID]);`;
const routed = `
 int route=routing.x+((gl_InstanceID/routing.y)/routing.z)*routing.y+gl_InstanceID%routing.y;
 ivec4 entry=texelFetch(routeTable,ivec2(route%1024,route/1024),0);
 tile=entry*64;
 float r=max(pa.z,pb.z)+2.0;
 vec2 lo=max(floor(min(pa.xy,pb.xy)-r),vec2(tile.xy));
 vec2 hi=min(ceil(max(pa.xy,pb.xy)+r),min(vec2(tile.xy+64),viewport));
 vec2 p=(mix(lo,hi,corners[gl_VertexID])-vec2(tile.xy))+vec2(tile.zw);
 if(entry.z<0||any(lessThanEqual(hi,lo))){gl_Position=vec4(2,2,0,1);return;}`;
const position = ` vec2 pos=vec2(gl_FragCoord.x,viewport.y-gl_FragCoord.y);`;
const routedPosition = ` vec2 pos=(vec2(gl_FragCoord.x,viewport.y-gl_FragCoord.y)-vec2(tile.zw))+vec2(tile.xy);
 if(any(lessThan(pos,vec2(tile.xy)))||any(greaterThanEqual(pos,min(vec2(tile.xy+64),viewport))))discard;`;
if (!vertex.includes(quad) || !fragment.includes(position)) throw Error("sparse-reviewed-shader");
export const sparseVertex = vertex
  .replace("precision highp float;", "precision highp float;precision highp int;")
  .replace(
    "uniform mat3 placement;",
    `uniform mat3 placement;
uniform highp isampler2D routeTable;uniform ivec3 routing;flat out ivec4 tile;`,
  )
  .replace(quad, routed);
// Only pixel-coordinate reconstruction/ownership changes. The analytic body is verbatim.
export const sparseFragment = fragment
  .replace("precision highp float;", "precision highp float;precision highp int;")
  .replace("flat in vec3 pa;", "flat in ivec4 tile;flat in vec3 pa;")
  .replace(position, routedPosition);
export const sparsePresentVertex = `#version 300 es
precision highp float;precision highp int;
uniform vec2 viewport;uniform highp isampler2D routeTable;uniform int firstTile;
flat out ivec4 tile;
void main(){
 vec2 corners[6]=vec2[6](vec2(0,0),vec2(1,0),vec2(0,1),vec2(0,1),vec2(1,0),vec2(1,1));
 int i=firstTile+gl_InstanceID;tile=texelFetch(routeTable,ivec2(i%1024,i/1024),0)*64;
 vec2 p=mix(vec2(tile.xy),min(vec2(tile.xy+64),viewport),corners[gl_VertexID]);
 gl_Position=vec4(p/viewport*vec2(2,-2)+vec2(-1,1),0,1);
}`;
export const sparsePresentFragment = `#version 300 es
precision highp float;precision highp int;
uniform vec2 viewport;uniform sampler2D image;uniform bool packedMask;uniform vec3 groupColor;
flat in ivec4 tile;out vec4 outColor;
void main(){
 ivec2 d=ivec2(floor(vec2(gl_FragCoord.x,viewport.y-gl_FragCoord.y)));
 if(any(lessThan(d,tile.xy))||any(greaterThanEqual(d,min(tile.xy+64,ivec2(viewport)))))discard;
 ivec2 s=(d-tile.xy)+tile.zw;
 vec4 value=texelFetch(image,ivec2(s.x,int(viewport.y)-1-s.y),0);
 float a=packedMask?value.a:value.r;outColor=vec4(groupColor*a,a);
}`;
