// Adapted from the owner-supplied 5207 capsule renderer; see docs/reuse-ledger.md.
export const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec3 a;
layout(location=1) in vec3 b;
uniform vec2 viewport;
uniform mat3 placement;
uniform vec2 integerOffset;
uniform bool integerQuad;
flat out vec3 pa;
flat out vec3 pb;
void main(){
 vec2 corners[6]=vec2[6](vec2(0,0),vec2(1,0),vec2(0,1),vec2(0,1),vec2(1,0),vec2(1,1));
 float scale=length(placement[0].xy);
 pa=vec3((placement*vec3(a.xy,1)).xy,a.z*scale);
 pb=vec3((placement*vec3(b.xy,1)).xy,b.z*scale);
 float r=max(pa.z,pb.z)+2.0;
 vec2 lo=floor(min(pa.xy,pb.xy)-r)+integerOffset;
 vec2 hi=ceil(max(pa.xy,pb.xy)+r)+integerOffset;
 vec2 p=mix(clamp(lo,vec2(0),viewport),clamp(hi,vec2(0),viewport),corners[gl_VertexID]);
 if(!integerQuad){float oldR=max(pa.z,pb.z)+1.414214;p=mix(min(pa.xy,pb.xy)-oldR,max(pa.xy,pb.xy)+oldR,corners[gl_VertexID]);}
 gl_Position=vec4(p/viewport*vec2(2,-2)+vec2(-1,1),0,1);
}`;
export const fragment = `#version 300 es
precision highp float;
flat in vec3 pa; flat in vec3 pb;
uniform vec2 viewport; uniform vec4 color; uniform vec2 integerOffset;
out vec4 outColor;
float capGap(vec2 pos,float radius){
 float t=clamp((radius-pa.z)/(pb.z-pa.z),0.0,1.0);
 return 0.5-length(pos-mix(pa.xy,pb.xy,t))-radius;
}
void main(){
 vec2 pos=vec2(gl_FragCoord.x,viewport.y-gl_FragCoord.y)-integerOffset;
 vec2 d=pb.xy-pa.xy; float l=dot(d,d), dr=pb.z-pa.z;
 float t=pb.z>pa.z?1.0:0.0;
 float dist=length(pos-mix(pa.xy,pb.xy,t))-mix(pa.z,pb.z,t);
 float len=sqrt(l);
 if(l>=0.000001 && len>abs(dr)){
  vec2 axis=d/len,q=pos-pa.xy;
  float u=dot(q,axis),v=abs(q.x*axis.y-q.y*axis.x),slope=dr/len;
  float root=sqrt(max(0.0,(len-abs(dr))*(len+abs(dr))))/len;
  float k=root*u+slope*v;
  if(k<=0.0){t=0.0;dist=length(q)-pa.z;}
  else if(k>=root*len){t=1.0;dist=length(pos-pb.xy)-pb.z;}
  else{t=clamp(k/(root*len),0.0,1.0);dist=root*v-slope*u-pa.z;}
 }
 float radius=mix(pa.z,pb.z,t);
 float coverage=min(clamp(0.5-dist,0.0,1.0),2.0*radius);
 if(l>=0.000001 && dr!=0.0 && 0.5-dist>2.0*radius){
  float lo=radius,hi=min(0.5,max(pa.z,pb.z));
  if(capGap(pos,hi)>=0.0)coverage=max(coverage,2.0*hi);
  else{
   for(int i=0;i<8;i++){float mid=(lo+hi)*0.5;if(capGap(pos,mid)>=0.0)lo=mid;else hi=mid;}
   coverage=max(coverage,clamp(2.0*lo+min(capGap(pos,lo),0.0),0.0,1.0));
  }
 }
 if(l<0.000001){vec2 q=pos-mix(pa.xy,pb.xy,t);float tent=max(0.0,1.0-abs(q.x))*max(0.0,1.0-abs(q.y));float area=min(1.0,3.14159265359*radius*radius*tent);coverage=mix(area,coverage,smoothstep(0.5,1.0,radius));}
 float alpha=coverage*color.a;if(alpha<=0.0)discard;outColor=vec4(alpha);
}`;
export const screenVertex = `#version 300 es
precision highp float;out vec2 uv;uniform vec2 viewport;uniform mat3 transform;
void main(){vec2 corners[6]=vec2[6](vec2(0,0),vec2(1,0),vec2(0,1),vec2(0,1),vec2(1,0),vec2(1,1));vec2 p=corners[gl_VertexID];uv=vec2(p.x,1.0-p.y);vec2 screen=(transform*vec3(p*viewport,1)).xy;gl_Position=vec4(screen/viewport*vec2(2,-2)+vec2(-1,1),0,1);}`;
export const screenFragment = `#version 300 es
precision highp float;in vec2 uv;uniform sampler2D image;uniform sampler2D secondImage;uniform bool combine;uniform bool coverage;uniform bool alphaOnly;uniform bool packedMask;uniform vec4 groupColor;out vec4 outColor;
void main(){vec4 value=texture(image,uv);float a=packedMask?value.a:value.r;if(combine){vec4 other=texture(secondImage,uv);a=max(a,packedMask?other.a:other.r);}outColor=alphaOnly?vec4(a):coverage?vec4(groupColor.rgb*a,a):vec4(value.rgb,1);}`;
