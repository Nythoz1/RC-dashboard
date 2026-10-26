// The Engine Lab: an engine on a stand in a shop, built part by part, that runs, explodes, cuts away,
// shows its air / fuel / coolant / oil paths, walks through an out-of-frame build, and (for diagnosis)
// highlights the parts to check for a set of symptoms. Engine-agnostic: each engine is a definition in
// ./engines/ (meta, geo, SYS, P, STEPS, flows, spin, builders). Opened as engine-lab.html?engine=<id>,
// usually inside the dashboard's Engine Lab view. 1 scene unit = 100 mm.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {CSS2DRenderer,CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export function runLab(E,opts={}){
const {meta,geo,SYS,P,STEPS}=E;
const D2R=Math.PI/180;
const {S,R,L,DECK,PH,FIRING,IN_PEAK,EX_PEAK}=geo;
const X=i=>(3.5-i)*S;                          // cylinder 1 at the front (+X)
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const PB={}; P.forEach(p=>PB[p.id]=p);
const partStep={}; STEPS.forEach((s,i)=>s.p.forEach(id=>partStep[id]=i));

/* ================= THREE SETUP ================= */
const stage=document.getElementById('stage');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.localClippingEnabled=true;
stage.appendChild(renderer.domElement);
const labelR=new CSS2DRenderer(); labelR.setSize(innerWidth,innerHeight); labelR.domElement.className='labels'; stage.appendChild(labelR.domElement);

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x16171a);
scene.fog=new THREE.Fog(0x16171a,80,200);
const pmrem=new THREE.PMREMGenerator(renderer);
/* photo-studio environment: graded dome + softboxes, so chrome and machined metal have something real to reflect */
scene.environment=(()=>{const s=new THREE.Scene(),geo=new THREE.SphereGeometry(50,48,24),p=geo.attributes.position,cols=[];
  const top=new THREE.Color(0xa7aeb6),hor=new THREE.Color(0x585d64),bot=new THREE.Color(0x1c1d1f);
  for(let i=0;i<p.count;i++){const y=p.getY(i)/50;const c=y>0?hor.clone().lerp(top,Math.pow(y,0.7)):hor.clone().lerp(bot,Math.min(1,-y*2));cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));s.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
  const panel=(w,h,pos,k)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(1,0.97,0.93).multiplyScalar(k),side:THREE.DoubleSide}));m.position.set(...pos);m.lookAt(0,0,0);s.add(m);};
  panel(34,12,[0,36,8],7);panel(14,26,[38,8,22],4.5);panel(14,26,[-36,10,-18],3);panel(44,3,[0,10,-42],2.5);panel(20,4,[-30,4,30],2);
  return pmrem.fromScene(s,0.02).texture;})();

const camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,0.1,300);
const HOME={pos:new THREE.Vector3(19,8,23),tgt:new THREE.Vector3(0.6,1.2,0.3)};
camera.position.copy(HOME.pos);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.copy(HOME.tgt); controls.enableDamping=true; controls.dampingFactor=0.08;
controls.zoomToCursor=true; controls.zoomSpeed=1.15; controls.minDistance=2.5; controls.maxDistance=70; controls.autoRotateSpeed=0.7;
controls.update();

scene.add(new THREE.HemisphereLight(0xcfd8e6,0x2a221c,0.55));
const key=new THREE.DirectionalLight(0xfff1e2,2.4); key.position.set(10,20,12); key.castShadow=true;
key.shadow.mapSize.set(3072,3072); Object.assign(key.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:90}); key.shadow.bias=-0.0004; key.shadow.normalBias=0.02;
key.target.position.set(0,1,0); scene.add(key,key.target);
const rim=new THREE.DirectionalLight(0x9cc3ff,1.1); rim.position.set(-12,8,-10); scene.add(rim);
const fill=new THREE.DirectionalLight(0xffc9a0,0.5); fill.position.set(8,-2,-12); scene.add(fill);

const floorG=new THREE.Group(); scene.add(floorG);   // the shop (built after the part helpers below)
const FLOOR_Y=-11; floorG.position.y=FLOOR_Y;          // engine sits on stands ~0.8 m above the floor

const engine=new THREE.Group(); scene.add(engine);

/* ambient occlusion (post-process). Loaded lazily; plain rendering is used until it is ready or if it fails */
let composer=null,aoWanted=innerWidth>860;
(async()=>{try{
  const [{EffectComposer},{RenderPass},{GTAOPass},{OutputPass}]=await Promise.all([import('three/addons/postprocessing/EffectComposer.js'),import('three/addons/postprocessing/RenderPass.js'),import('three/addons/postprocessing/GTAOPass.js'),import('three/addons/postprocessing/OutputPass.js')]);
  const rt=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:4});
  const c=new EffectComposer(renderer,rt);c.setPixelRatio(renderer.getPixelRatio());c.setSize(innerWidth,innerHeight);
  c.addPass(new RenderPass(scene,camera));
  const ao=new GTAOPass(scene,camera,innerWidth,innerHeight);ao.updateGtaoMaterial({radius:0.45,distanceExponent:1.4,thickness:1.0,scale:1.1,samples:16});ao.blendIntensity=1.0;
  c.addPass(ao);c.addPass(new OutputPass());composer=c;document.getElementById('tAO').classList.toggle('on',aoWanted);
}catch(e){console.warn('Ambient occlusion unavailable',e);document.getElementById('tAO').hidden=true;}})();
const cutPlane=new THREE.Plane(new THREE.Vector3(0,0,-1),0); // keeps z <= 0

/* ================= HELPERS ================= */
/* ---- procedural surface textures: tileable value noise, 1 UV unit = 100 mm ---- */
function noiseTex(size,layers,lo=0,hi=1,srgb=false){const acc=new Float32Array(size*size);
  for(const[fx,fy,amp]of layers){const g=new Float32Array(fx*fy);for(let k=0;k<g.length;k++)g[k]=Math.random();
    for(let j=0;j<size;j++){const v=j/size*fy,j0=Math.floor(v),tj=v-j0,sj=tj*tj*(3-2*tj),j1=(j0+1)%fy;
      for(let i=0;i<size;i++){const u=i/size*fx,i0=Math.floor(u),ti=u-i0,si=ti*ti*(3-2*ti),i1=(i0+1)%fx;
        const a=g[j0*fx+i0],b=g[j0*fx+i1],c=g[j1*fx+i0],d=g[j1*fx+i1],top=a+(b-a)*si,bot=c+(d-c)*si;acc[j*size+i]+=amp*(top+(bot-top)*sj);}}}
  let mn=1e9,mx=-1e9;for(const v of acc){if(v<mn)mn=v;if(v>mx)mx=v;}
  const cv=document.createElement('canvas');cv.width=cv.height=size;const cx=cv.getContext('2d'),img=cx.createImageData(size,size);
  for(let k=0;k<acc.length;k++){const v=Math.round(255*(lo+(hi-lo)*(acc[k]-mn)/(mx-mn)));img.data[k*4]=img.data[k*4+1]=img.data[k*4+2]=v;img.data[k*4+3]=255;}
  cx.putImageData(img,0,0);const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;if(srgb)t.colorSpace=THREE.SRGBColorSpace;return t;}
const TX={
  cast:noiseTex(512,[[48,48,1],[96,96,.9],[192,192,.8],[384,384,.6]]),        // sand-cast grain
  roughCast:noiseTex(256,[[24,24,1],[64,64,.7],[160,160,.5]],0.6,1),
  peel:noiseTex(256,[[18,18,1],[36,36,.5]]),                                     // paint orange-peel
  fine:noiseTex(256,[[96,96,1],[192,192,.8]]),                                   // die-cast / plastic grain
  brush:noiseTex(512,[[2,160,1],[4,320,.7],[1,64,.4]]),                          // machined streaks
  brushR:noiseTex(512,[[2,160,1],[4,320,.7]],0.55,1),
  mottle:noiseTex(256,[[3,3,1],[6,6,.7],[12,12,.5],[24,24,.35]],0.72,1,true),    // tone variation / grime
};
TX.mottle.repeat.set(0.3,0.3);
const MAT={
  orange:()=>new THREE.MeshPhysicalMaterial({color:0xd0571f,roughness:.5,metalness:.05,map:TX.mottle,bumpMap:TX.cast,bumpScale:.6,clearcoat:.9,clearcoatRoughness:.14}),
  chrome:()=>new THREE.MeshStandardMaterial({color:0xf3f5f7,roughness:.06,metalness:1,envMapIntensity:1.4}),
  alu:()=>new THREE.MeshStandardMaterial({color:0xc4c9ce,roughness:.55,roughnessMap:TX.roughCast,metalness:.8,bumpMap:TX.fine,bumpScale:.12}),
  steel:()=>new THREE.MeshStandardMaterial({color:0xb4bac0,roughness:.38,roughnessMap:TX.brushR,metalness:1,bumpMap:TX.brush,bumpScale:.2}),
  dark:()=>new THREE.MeshStandardMaterial({color:0x5a5f66,roughness:.6,roughnessMap:TX.roughCast,metalness:.85,map:TX.mottle,bumpMap:TX.cast,bumpScale:.6}),
  iron:()=>new THREE.MeshStandardMaterial({color:0x736a63,roughness:.9,roughnessMap:TX.roughCast,metalness:.45,map:TX.mottle,bumpMap:TX.cast,bumpScale:1.3}),
  hot:()=>new THREE.MeshStandardMaterial({color:0x7a4f39,roughness:.95,roughnessMap:TX.roughCast,metalness:.35,map:TX.mottle,bumpMap:TX.cast,bumpScale:1.6}),
  black:()=>new THREE.MeshPhysicalMaterial({color:0x1d1e21,roughness:.5,metalness:.15,bumpMap:TX.peel,bumpScale:.4,clearcoat:.35,clearcoatRoughness:.3}),
  rubber:()=>new THREE.MeshStandardMaterial({color:0x17181a,roughness:.92,metalness:0,bumpMap:TX.fine,bumpScale:.35}),
  bronze:()=>new THREE.MeshStandardMaterial({color:0xc29358,roughness:.32,roughnessMap:TX.brushR,metalness:1,bumpMap:TX.brush,bumpScale:.15}),
  gasket:()=>new THREE.MeshStandardMaterial({color:0x83868a,roughness:.4,metalness:.9,bumpMap:TX.fine,bumpScale:.3}),
  filter:()=>new THREE.MeshPhysicalMaterial({color:0x2d4a63,roughness:.45,metalness:.2,bumpMap:TX.peel,bumpScale:.4,clearcoat:.6,clearcoatRoughness:.2}),
  plastic:()=>new THREE.MeshStandardMaterial({color:0x26282c,roughness:.65,metalness:0,bumpMap:TX.fine,bumpScale:.3}),
  zinc:()=>new THREE.MeshStandardMaterial({color:0xd3cfbf,roughness:.32,metalness:.95,flatShading:true}),
};
/* box-projected UVs so every texture is real-world scale regardless of part size */
function boxUV(g){if(g.userData.uv||!g.attributes.normal)return;g.userData.uv=1;const p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));let u,v;
    if(ax>=ay&&ax>=az){u=p.getZ(i);v=p.getY(i);}else if(ay>=az){u=p.getX(i);v=p.getZ(i);}else{u=p.getX(i);v=p.getY(i);}uv[i*2]=u;uv[i*2+1]=v;}
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));}
function mesh(g,m,x=0,y=0,z=0){boxUV(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;return o;}
function box(w,h,d,m,x,y,z){const r=Math.min(0.05,Math.min(w,h,d)*0.2);return mesh(new RoundedBoxGeometry(w,h,d,2,r),m,x,y,z);}
function rbox(w,h,d,r,m,x,y,z){return mesh(new RoundedBoxGeometry(w,h,d,3,r),m,x,y,z);}
/* closed cylinders get small chamfered edges (machined look); hex/low-poly and open tubes stay plain */
function cylG(r1,r2,len,axis,seg=32,open=false){let g;
  if(open||seg<12)g=new THREE.CylinderGeometry(r1,r2,len,seg,1,open);
  else{const h=len/2,c=Math.min(r1,r2,len)*0.14,raw=[[0,-h],[r2-c,-h],[r2,-h+c],[r1,h-c],[r1-c,h],[0,h]],pts=[];
    for(let i=0;i<raw.length-1;i++){const[a0,b0]=raw[i],[a1,b1]=raw[i+1];pts.push([a0,b0]);if(i!==1&&i!==3)pts.push([a0+(a1-a0)*0.04,b0+(b1-b0)*0.04],[a0+(a1-a0)*0.96,b0+(b1-b0)*0.96]);}
    pts.push(raw[raw.length-1]);g=new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(Math.max(r,1e-4),y)),seg);}
  if(axis==='x')g.rotateZ(-Math.PI/2);else if(axis==='z')g.rotateX(Math.PI/2);return g;}
function hex(g,x,y,z,axis,s,m){g.add(cyl(s,s,s*0.8,axis,m,x,y,z,6));}
function voluteGeo(R0,R1,t0,t1,a0){const U=72,V=20,pos=[],idx=[];
  for(let i=0;i<=U;i++){const u=i/U,a=a0+u*Math.PI*2*0.92,Rc=R0+(R1-R0)*u,rt=t0+(t1-t0)*Math.pow(u,0.8),ca=Math.cos(a),sa=Math.sin(a);
    for(let j=0;j<=V;j++){const v=j/V*Math.PI*2,rr=Rc+rt*Math.cos(v);pos.push(rt*Math.sin(v),rr*ca,rr*sa);}}
  for(let i=0;i<U;i++)for(let j=0;j<V;j++){const a=i*(V+1)+j,b=a+V+1;idx.push(a,b,a+1,b,b+1,a+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;}
function cyl(r1,r2,len,axis,m,x,y,z,seg=32,open=false){return mesh(cylG(r1,r2,len,axis,seg,open),m,x,y,z);}
function torus(R0,r,axis,m,x,y,z,seg=48){const g=new THREE.TorusGeometry(R0,r,10,seg);if(axis==='x')g.rotateY(Math.PI/2);else if(axis==='y')g.rotateX(Math.PI/2);return mesh(g,m,x,y,z);}
function tube(pts,r,m,seg=64,closed=false){const c=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)),closed,'centripetal');return mesh(new THREE.TubeGeometry(c,seg,r,14,closed),m);}
function shapeYZ(pts){const s=new THREE.Shape();pts.forEach(([y,z],i)=>i?s.lineTo(-z,y):s.moveTo(-z,y));s.closePath();return s;}
function extrudeX(shape,x0,x1,m,bevel=0){const g=new THREE.ExtrudeGeometry(shape,{depth:x1-x0-2*bevel,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,curveSegments:24});g.rotateY(Math.PI/2);g.translate(x0+bevel,0,0);return mesh(g,m);}
function beamYZ(g,p1,p2,tx,tw,m){const dy=p2[0]-p1[0],dz=p2[1]-p1[1],len=Math.hypot(dy,dz);const b=box(tx,len,tw,m,0,(p1[0]+p2[0])/2,(p1[1]+p2[1])/2);b.rotation.x=Math.atan2(dz,dy);g.add(b);return b;}
function gearGeo(T,r,thick){const md=2*r/T,ra=r+md*0.9,rd=r-md*1.15,st=2*Math.PI/T,s=new THREE.Shape();
  for(let i=0;i<T;i++){const a=i*st;[[rd,a],[rd,a+st*.12],[ra,a+st*.32],[ra,a+st*.58],[rd,a+st*.78]].forEach(([rr,aa],k)=>{const x=rr*Math.cos(aa),y=rr*Math.sin(aa);(i===0&&k===0)?s.moveTo(x,y):s.lineTo(x,y);});}
  s.closePath();
  if(T>=30&&T<=48){const n=T>=40?6:5;for(let k=0;k<n;k++){const a=k/n*Math.PI*2,p=new THREE.Path();p.absarc(r*0.58*Math.cos(a),r*0.58*Math.sin(a),r*0.17,0,Math.PI*2,true);s.holes.push(p);}}
  const g=new THREE.ExtrudeGeometry(s,{depth:thick,bevelEnabled:false,curveSegments:8});g.rotateY(Math.PI/2);g.translate(-thick/2,0,0);return g;}
function hull2(pts){pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],up=[];
  for(const p of pts){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}
  for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}
  up.pop();lo.pop();return lo.concat(up);}
function circlesHull(cs,seg=48){const pts=[];for(const[y,z,r]of cs)for(let k=0;k<seg;k++){const a=k/seg*Math.PI*2;pts.push([y+r*Math.cos(a),z+r*Math.sin(a)]);}return hull2(pts);}
class Helix extends THREE.Curve{constructor(r,h,t){super();this.r=r;this.h=h;this.t=t;}getPoint(u,o=new THREE.Vector3()){const a=u*this.t*Math.PI*2;return o.set(this.r*Math.cos(a),u*this.h,this.r*Math.sin(a));}}
function glowTex(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);return t;}
const GLOW=glowTex();
function lift(c,peak){let d=c-peak;d=((d+360)%720+720)%720-360;return Math.abs(d)<120?0.15*Math.cos(Math.PI/2*d/120)**2:0;}
function lobe(x,noseDeg,m){const pts=[];for(let b=0;b<360;b+=3){const d=((b-noseDeg)%360+540)%360-180;const rr=0.2+(Math.abs(d)<60?0.15*Math.cos(Math.PI/2*d/60)**2:0);pts.push([rr*Math.cos(b*D2R),rr*Math.sin(b*D2R)]);}return extrudeX(shapeYZ(pts),x-0.08,x+0.08,m);}
function webShape(a){const pts=[],py=R*Math.cos(a),pz=R*Math.sin(a);
  for(let t=-90;t<=90;t+=10){const b=a+t*D2R;pts.push([py+0.5*Math.cos(b),pz+0.5*Math.sin(b)]);}
  for(let t=110;t<=250;t+=7){const b=a+t*D2R;pts.push([1.12*Math.cos(b),1.12*Math.sin(b)]);}
  return shapeYZ(pts);}
/* lathe around the X axis: pts are [radius, distance along +X (dir 1) or -X (dir -1)] */
function latheX(pts,m,x,y,z,seg=64,dir=1){const g=new THREE.LatheGeometry(pts.map(([r,h])=>new THREE.Vector2(Math.max(r,1e-4),h)),seg);g.rotateZ(dir>0?-Math.PI/2:Math.PI/2);return mesh(g,m,x,y,z);}
/* spin-on canister: rolled seam at the top, wrench flutes at the bottom */
function canister(g,x,yTop,z,r,h,m){g.add(cyl(r,r,h,'y',m,x,yTop-h/2,z,40));g.add(torus(r-0.01,.025,'y',MAT.steel(),x,yTop-0.04,z));
  const fm=MAT.dark();for(let k=0;k<16;k++){const a=k/16*Math.PI*2,f=box(.05,.14,.06,fm,x+(r+0.005)*Math.cos(a),yTop-h+0.08,z+(r+0.005)*Math.sin(a));f.rotation.y=-a;g.add(f);}}

/* ================= ANIMATED REFERENCES ================= */
const A={pist:[],ring:[],pin:[],rod:[],vI:[],vE:[],sI:[],sE:[],tI:[],tE:[],chI:[],chE:[],rkI:[],rkE:[],flame:[],spray:[]};
const FXMAT=new Set();

const B=E.builders({THREE,D2R,X,S,R,L,DECK,PH,IN_PEAK,EX_PEAK,A,FXMAT,GLOW,MAT,TX,mesh,box,rbox,cyl,cylG,hex,torus,tube,shapeYZ,extrudeX,beamYZ,gearGeo,circlesHull,hull2,Helix,latheX,voluteGeo,lobe,webShape,canister});

/* ================= SHOP =================
   Room 9 × 9 m (1 unit = 100 mm). Walls and ceiling face inward only, so orbiting outside the room looks straight through them. */
function canvasTex(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.repeat.set(...rep);return t;}
function speckle(x,w,h,n,cols){for(let k=0;k<n;k++){x.fillStyle=cols[k%cols.length];x.globalAlpha=Math.random()*0.35;const s=Math.random()*2.5+0.5;x.fillRect(Math.random()*w,Math.random()*h,s,s);}x.globalAlpha=1;}
let standG;
function buildShop(){
  const H=40,W=45;
  // sealed concrete with saw-cut joints every 3 m, tyre marks and oil stains
  const conc=canvasTex(1024,1024,(x,w,h)=>{x.fillStyle='#6c6a65';x.fillRect(0,0,w,h);speckle(x,w,h,60000,['#55534f','#8a8883','#605e5a']);
    for(let k=0;k<14;k++){const cx=Math.random()*w,cy=Math.random()*h,r=20+Math.random()*90,g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(35,30,25,.38)');g.addColorStop(1,'rgba(35,30,25,0)');x.fillStyle=g;x.fillRect(cx-r,cy-r,2*r,2*r);}
    x.strokeStyle='rgba(40,40,40,.35)';x.lineWidth=26;x.beginPath();x.moveTo(0,700);x.bezierCurveTo(300,640,700,760,1024,690);x.stroke();
    x.fillStyle='#4d4b47';x.fillRect(0,0,w,3);x.fillRect(0,0,3,h);},[1/30,1/30]);
  const floor=mesh(new THREE.PlaneGeometry(W*2,W*2).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:conc,roughness:.82,roughnessMap:TX.roughCast,metalness:0,bumpMap:TX.fine,bumpScale:.4}));
  floor.castShadow=false;floorG.add(floor);conc.repeat.set(1/30,1/30);
  // yellow bay lines and a floor drain
  const yl=new THREE.MeshStandardMaterial({color:0xe0b21c,roughness:.6});for(const[w,d,x,z]of[[34,.6,0,-13],[34,.6,0,13],[.6,26.6,-17,0],[.6,26.6,17,0]]){const p=new THREE.Mesh(new THREE.PlaneGeometry(w,d).rotateX(-Math.PI/2),yl);p.position.set(x,0.01,z);p.receiveShadow=true;floorG.add(p);}
  const drain=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:0x2a2b2d,metalness:.7,roughness:.5,bumpMap:canvasTex(64,64,(x)=>{x.fillStyle='#000';x.fillRect(0,0,64,64);x.fillStyle='#fff';for(let k=0;k<8;k++)x.fillRect(k*8+2,4,4,56);},[1,1])}));drain.position.set(9,0.012,6);floorG.add(drain);
  // painted concrete-block walls with a grey wainscot and a safety stripe
  const blk=canvasTex(1024,1024,(x,w,h)=>{x.fillStyle='#c4c1b9';x.fillRect(0,0,w,h);speckle(x,w,h,30000,['#aeaaa2','#d3d0c8']);x.fillStyle='#a19d95';
    for(let r=0;r<4;r++){x.fillRect(0,r*256,w,7);const off=r%2?256:0;for(let c=0;c<3;c++)x.fillRect((off+c*512)%w,r*256,7,256);}},[1/8.12,1/8.12]);
  const wallM=new THREE.MeshStandardMaterial({map:blk,roughness:.92,bumpMap:blk,bumpScale:.6});
  const band=new THREE.MeshStandardMaterial({color:0x4b5058,roughness:.85});const stripe=new THREE.MeshStandardMaterial({color:0xe0b21c,roughness:.6});
  for(const[rx,ry,px,pz]of[[0,0,0,-W],[0,Math.PI/2,-W,0],[0,-Math.PI/2,W,0],[0,Math.PI,0,W]]){
    const wall=mesh(new THREE.PlaneGeometry(W*2,H),wallM);wall.rotation.set(rx,ry,0);wall.position.set(px,H/2,pz);wall.castShadow=false;floorG.add(wall);
    const nx=Math.sin(ry)*0.06,nz=Math.cos(ry)*0.06;
    const b=new THREE.Mesh(new THREE.PlaneGeometry(W*2,12),band);b.rotation.y=ry;b.position.set(px+nx,6,pz+nz);b.receiveShadow=true;floorG.add(b);
    const s=new THREE.Mesh(new THREE.PlaneGeometry(W*2,.8),stripe);s.rotation.y=ry;s.position.set(px+nx*1.5,12.4,pz+nz*1.5);floorG.add(s);}
  // roll-up door on the left wall
  const door=canvasTex(256,256,(x,w,h)=>{for(let k=0;k<16;k++){const g=x.createLinearGradient(0,k*16,0,k*16+16);g.addColorStop(0,'#9aa3ab');g.addColorStop(.5,'#c9d0d6');g.addColorStop(1,'#7e868e');x.fillStyle=g;x.fillRect(0,k*16,w,16);}},[1/30,1/4]);
  const dm=new THREE.Mesh(new THREE.PlaneGeometry(30,28),new THREE.MeshStandardMaterial({map:door,metalness:.6,roughness:.45}));dm.rotation.y=Math.PI/2;dm.position.set(-W+0.1,14,4);floorG.add(dm);
  const dtrim=new THREE.MeshStandardMaterial({color:0x2c2f33,roughness:.6});for(const[w,h,y,z]of[[31,1,28.5,4],[1,29,14,-11.5],[1,29,14,19.5]]){const t=new THREE.Mesh(new THREE.BoxGeometry(.3,h,w===31?31:1),dtrim);t.position.set(-W+0.2,y,z);floorG.add(t);}
  // ceiling and hanging LED strip lights
  const ceil=new THREE.Mesh(new THREE.PlaneGeometry(W*2,W*2).rotateX(Math.PI/2),new THREE.MeshStandardMaterial({color:0x2a2c30,roughness:1}));ceil.position.y=H;floorG.add(ceil);
  const lit=new THREE.MeshBasicMaterial({color:0xfff6e8}),hous=new THREE.MeshStandardMaterial({color:0xd8d8d8,roughness:.5,metalness:.3});
  for(const x of[-22,0,22])for(const z of[-22,0,22]){const h=new THREE.Mesh(new THREE.BoxGeometry(14,.5,1.4),hous);h.position.set(x,H-6,z);floorG.add(h);
    const l=new THREE.Mesh(new THREE.PlaneGeometry(13.6,1.1).rotateX(Math.PI/2),lit);l.position.set(x,H-6.26,z);floorG.add(l);
    for(const dx of[-6,6]){const c=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,6,4),hous);c.position.set(x+dx,H-3,z);floorG.add(c);}}
  const P=(o,x,y,z)=>{o.position.set(x,y,z);floorG.add(o);return o;};
  // workbench with butcher-block top, steel frame, pegboard and bench vise
  const wood=new THREE.MeshStandardMaterial({color:0xa0703f,roughness:.6,map:TX.brush,bumpMap:TX.brush,bumpScale:.4});
  const frame=MAT.black(),steelP=new THREE.MeshPhysicalMaterial({color:0x5b636b,roughness:.45,metalness:.5,clearcoat:.4});
  P(box(26,.6,7,wood,0,8.7,0),10,0,-41);for(const dx of[-12.4,12.4])for(const dz of[-3,3])P(box(.6,8.4,.6,frame,0,4.2,0),10+dx,0,-41+dz);
  P(box(25,.3,6,steelP,0,2.2,0),10,0,-41);P(box(26,.4,.4,frame,0,7.8,0),10,0,-37.8);
  const peg=canvasTex(256,256,(x,w,h)=>{x.fillStyle='#b8a27c';x.fillRect(0,0,w,h);x.fillStyle='#6d5d44';for(let i=0;i<16;i++)for(let j=0;j<16;j++){x.beginPath();x.arc(i*16+8,j*16+8,2.2,0,7);x.fill();}},[1/2.5,1/2.5]);
  P(mesh(new THREE.PlaneGeometry(26,11),new THREE.MeshStandardMaterial({map:peg,roughness:.85})),10,15.5,-44.9);
  const chromeT=MAT.chrome();for(let k=0;k<9;k++){const len=3+k*0.45;const w=box(.5,len,.12,chromeT,0,0,0);w.rotation.z=0.08;P(w,0.5+k*1.25,17-len/2,-44.7);P(cyl(.45,.45,.12,'z',chromeT,0,0,0,6),0.5+k*1.25,17.3,-44.7);}
  for(let k=0;k<5;k++){const hnd=cyl(.35,.35,3,'y',new THREE.MeshStandardMaterial({color:[0xc62828,0x1565c0,0xf9a825,0x2e7d32,0xc62828][k],roughness:.5}),0,0,0,16);P(hnd,13+k*1.6,15,-44.4);P(cyl(.12,.12,2.5,'y',chromeT,0,0,0,12),13+k*1.6,12.3,-44.4);}
  const vise=new THREE.Group();vise.add(box(2.2,1.4,1.6,steelP,0,.7,0));vise.add(box(2.4,.8,.5,steelP,0,1.6,.9));vise.add(cyl(.12,.12,3,'z',chromeT,0,1.0,1.8,12));P(vise,1,9,-38.8);
  // rolling tool chest
  const red=new THREE.MeshPhysicalMaterial({color:0xb3141c,roughness:.35,metalness:.3,clearcoat:.8,clearcoatRoughness:.15});
  const chest=new THREE.Group();chest.add(box(14,9.5,5.5,red,0,5.4,0));chest.add(box(13,5,5,red,0,12.8,0));chest.add(box(13.2,.6,5.2,MAT.black(),0,10.4,0));
  for(let k=0;k<5;k++){chest.add(box(13.4,.08,.1,MAT.black(),0,1.6+k*1.8,2.76));chest.add(box(9,.25,.25,chromeT,0,2.4+k*1.8,2.95));}
  for(let k=0;k<3;k++){chest.add(box(12.4,.08,.1,MAT.black(),0,10.9+k*1.4,2.51));chest.add(box(7,.2,.2,chromeT,0,11.5+k*1.4,2.65));}
  for(const dx of[-6,6])for(const dz of[-2,2])chest.add(cyl(.5,.5,.5,'z',MAT.rubber(),dx,.5,dz,16));
  chest.rotation.y=0.25;P(chest,-22,0,-38);
  // 55-gal drums
  const blue=new THREE.MeshPhysicalMaterial({color:0x1d4f8f,roughness:.4,metalness:.4,clearcoat:.6,bumpMap:TX.peel,bumpScale:.3});
  for(const[x,z]of[[34,-36],[37.5,-31],[30,-31.5]]){const d=new THREE.Group();d.add(latheX([[0.001,0],[2.9,0],[2.95,.15],[2.95,8.6],[2.9,8.8],[0.001,8.8]],blue,0,0,0,48));d.rotation.z=Math.PI/2;
    for(const y of[3,5.8])d.add(torus(2.98,.08,'x',blue,y,0,0,48));d.add(cyl(.35,.35,.15,'x',MAT.steel(),8.85,1.5,0,6));P(d,x,0,z);}
  // engine stands (front cradle under the mount pads, rear cradle bolted to the block skirt)
  standG=new THREE.Group();floorG.add(standG);const yel=new THREE.MeshPhysicalMaterial({color:meta.stand||0xd9a215,roughness:.45,metalness:.3,clearcoat:.5,bumpMap:TX.peel,bumpScale:.3});
  const top=-FLOOR_Y;
  for(const[x,yTop]of[[3.9,top+0.38],[-4.6,top-0.2]]){
    standG.add(box(1.2,.6,7.5,yel,x,.6,0));for(const dz of[-3.4,3.4]){standG.add(box(2.6,.4,1,yel,x,.4,dz));for(const dx of[-1,1])standG.add(cyl(.45,.45,.4,'z',MAT.rubber(),x+dx,.45,dz,16));}
    for(const s of[-1,1]){standG.add(box(.6,yTop-0.9,.6,yel,x,(yTop+0.9)/2,s*1.95));standG.add(box(1.0,.25,.9,yel,x,yTop,s*1.85));}
  }
  for(const s of[-1,1])standG.add(box(8.5,.4,.4,yel,-0.35,.4,s*3.4));
}
buildShop();

/* ================= ASSEMBLE ================= */
const parts={}; const pickables=[];
for(const def of P){
  const root=new THREE.Group();root.name=def.id;engine.add(root);
  (B[def.id]||(()=>{}))(root);
  const part={def,root,mats:new Set(),ex:new THREE.Vector3(...def.ex),fly:new THREE.Vector3(),installed:true,flash:0};
  root.traverse(o=>{if(o.isMesh||o.isSprite){if(o.userData.fx)return;o.userData.part=def.id;if(o.isMesh)pickables.push(o);
    const m=o.material;if(!FXMAT.has(m)){part.mats.add(m);m.userData.base={opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite,side:m.side};}}});
  const el=document.createElement('div');el.className='lbl';el.style.setProperty('--c',SYS[def.s].c);
  const sp=document.createElement('span');sp.textContent=def.n;el.appendChild(sp);
  el.addEventListener('pointerdown',e=>e.stopPropagation());
  el.addEventListener('click',e=>{e.stopPropagation();select(def.id,true);});
  const lab=new CSS2DObject(el);lab.position.set(...def.a);root.add(lab);
  part.label=lab;part.el=el;parts[def.id]=part;
}

/* ================= FLOWS ================= */
const FLOWS=E.flows(X);
const flowG=new THREE.Group();flowG.visible=false;scene.add(flowG);
for(const f of FLOWS){f.curve=new THREE.CatmullRomCurve3(f.pts.map(p=>new THREE.Vector3(...p)),false,'centripetal',0.4);f.len=f.curve.getLength();f.n=f.n||Math.max(18,Math.round(f.len*5));
  const pos=new Float32Array(f.n*3);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  f.pts3=new THREE.Points(geo,new THREE.PointsMaterial({color:f.c,size:0.24,map:GLOW,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));
  f.pts3.frustumCulled=false;f.off=[...Array(f.n)].map((_,k)=>k/f.n);flowG.add(f.pts3);
  const guide=new THREE.Mesh(new THREE.TubeGeometry(f.curve,Math.round(f.len*8),0.03,6,false),new THREE.MeshBasicMaterial({color:f.c,transparent:true,opacity:.22,depthWrite:false}));flowG.add(guide);}
let flowT=0;

/* ================= STATE ================= */
// check: the parts to look at for a diagnosis (?parts=…&why=…): highlighted, listed on the right, the rest faded when only=true
const st={check:null,running:false,rpmSet:650,rpm:0,theta:0,speed:0.05,cranking:0,explode:0,explodeT:0,cut:false,flow:false,lbl:'all',sel:null,hover:null,isolate:false,buildStep:STEPS.length-1,building:false,autoplay:null,showcase:null,sysOn:Object.fromEntries(Object.keys(SYS).map(k=>[k,true]))};
const $=id=>document.getElementById(id);

/* ================= MATERIAL STATE ================= */
const ACC=new THREE.Color(0xe2702c),HOV=new THREE.Color(0x8fb8ff),CHK=new THREE.Color(0xffb020);
const inCheck=id=>!!(st.check&&st.check.ids.includes(id));
function isGhost(p){return (st.isolate&&st.sel&&p.def.id!==st.sel)||(st.check&&st.check.only&&!st.sel&&!inCheck(p.def.id))||(st.cut&&p.def.cut==='ghost'&&p.def.id!==st.sel);}
function applyMats(){for(const p of Object.values(parts)){const ghost=isGhost(p),clip=st.cut&&p.def.cut==='clip';
  for(const m of p.mats){const b=m.userData.base;m.transparent=ghost||b.transparent;m.opacity=ghost?0.1:b.opacity;m.depthWrite=ghost?false:b.depthWrite;
    m.clippingPlanes=clip?[cutPlane]:null;m.clipShadows=true;m.side=clip?THREE.DoubleSide:b.side;m.needsUpdate=true;}
  p.root.traverse(o=>{if(o.isMesh&&!o.userData.fx)o.castShadow=!ghost;});}
  applyEmissive();}
function applyEmissive(){for(const p of Object.values(parts)){const id=p.def.id;let c=null,k=0;
  if(id===st.sel){c=ACC;k=0.32;}else if(id===st.hover){c=HOV;k=0.16;}else if(inCheck(id)&&!st.sel){c=CHK;k=0.3;}
  if(p.flash>0){c=ACC;k=Math.max(k,0.45*p.flash);}
  for(const m of p.mats){if(!m.emissive)continue;if(c){m.emissive.copy(c).multiplyScalar(k);}else m.emissive.setRGB(0,0,0);}}}

/* ================= LABELS ================= */
function refreshLabels(){for(const p of Object.values(parts)){const on=st.lbl!=='off'&&st.sysOn[p.def.s]&&p.root.visible&&!st.showcase&&(!(st.isolate&&st.sel)||p.def.id===st.sel)&&(!(st.check&&st.check.only&&!st.sel)||inCheck(p.def.id));
  p.label.visible=on;p.el.classList.toggle('chk',inCheck(p.def.id)&&!st.sel);p.el.classList.toggle('sel',p.def.id===st.sel);p.el.classList.toggle('dim',isGhost(p));}
  labelR.domElement.classList.toggle('dotsonly',st.lbl==='dots');}
/* hide names that would overlap; nearest and selected win, the rest show as dots until you zoom in */
const lv=new THREE.Vector3();
function declutter(){const list=[],w=innerWidth,h=innerHeight;
  for(const p of Object.values(parts)){if(!p.label.visible||st.lbl!=='all'){p.el.classList.remove('hid');continue;}
    p.label.getWorldPosition(lv);const d=lv.distanceTo(camera.position);lv.project(camera);if(lv.z>1)continue;
    const x=(lv.x+1)/2*w,y=(1-lv.y)/2*h,tw=p.def.n.length*6.2+18;
    const pri=p.def.id===st.sel?-1e9:p.def.id===st.hover?-1e8:d+(isGhost(p)?1000:0);
    list.push({p,pri,r:[x-tw/2,x+tw/2,y-35,y-11]});}
  list.sort((a,b)=>a.pri-b.pri);const placed=[];
  for(const it of list){const r=it.r;const hit=placed.some(q=>r[0]<q[1]&&r[1]>q[0]&&r[2]<q[3]&&r[3]>q[2]);it.p.el.classList.toggle('hid',hit);if(!hit)placed.push(r);}}

const esc=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
/* ================= SELECTION / CAMERA ================= */
function frameCheck(){if(!st.check||!st.check.ids.length)return;engine.updateMatrixWorld(true);const b=new THREE.Box3();st.check.ids.forEach(id=>{const p=parts[id];if(p&&p.root.visible)b.union(partBox(p));});if(b.isEmpty())return;
  const c=b.getCenter(new THREE.Vector3()),off=camera.position.clone().sub(controls.target).normalize();animCam(c,c.clone().add(off.multiplyScalar(THREE.MathUtils.clamp(b.getSize(new THREE.Vector3()).length()*1.4,8,26))),1.0);}
let camAnim=null;
function animCam(tgt,pos,dur=0.8){camAnim={t:0,dur,ft:controls.target.clone(),fp:camera.position.clone(),tt:tgt.clone(),tp:pos.clone()};}
function partBox(p){const b=new THREE.Box3();p.root.traverse(o=>{if(o.isMesh&&!o.userData.fx){o.geometry.computeBoundingBox();const bb=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);b.union(bb);}});return b;}
function focusPart(id,zoom=true){const p=parts[id];if(!p||!p.root.visible)return;engine.updateMatrixWorld(true);const b=partBox(p);if(b.isEmpty())return;
  const c=b.getCenter(new THREE.Vector3()),size=b.getSize(new THREE.Vector3()).length();const dir=camera.position.clone().sub(controls.target).normalize();
  const dist=zoom?THREE.MathUtils.clamp(size*1.9,4.5,30):camera.position.distanceTo(controls.target);animCam(c,c.clone().add(dir.multiplyScalar(dist)));}
function select(id,focus=false){st.sel=id;if(!id)st.isolate=false;applyMats();refreshLabels();renderInfo();renderParts();if(id&&focus)focusPart(id);
  if(id&&innerWidth<=860)openPanel('info');}

/* ================= EXPLODE / BUILD POSITIONS ================= */
const flyAnims=[];
function setBuildStep(n,animate){st.buildStep=n;STEPS.forEach((s,i)=>s.p.forEach(id=>{const p=parts[id];p.installed=i<=n;p.root.visible=p.installed;}));
  if(animate&&n>=0){const ids=STEPS[n].p;ids.forEach((id,j)=>{const p=parts[id];const d=p.ex.lengthSq()>0.01?p.ex.clone().normalize():new THREE.Vector3(0,1,0);
    flyAnims.push({p,from:d.multiplyScalar(5).add(new THREE.Vector3(0,2.5,0)),t:-j*0.12,dur:1.15});p.flash=1;});
    if($('bFollow').checked&&ids.length){engine.updateMatrixWorld(true);const b=new THREE.Box3();ids.forEach(id=>b.union(partBox(parts[id])));const c=b.getCenter(new THREE.Vector3());
      const off=camera.position.clone().sub(controls.target);const dist=THREE.MathUtils.clamp(b.getSize(new THREE.Vector3()).length()*1.5,9,22);animCam(c,c.clone().add(off.normalize().multiplyScalar(dist)),1.0);}}
  refreshLabels();renderBuild();renderInfo();}

/* ================= UI: PARTS ================= */
const plist=$('plist');
function renderParts(){const q=$('q').value.trim().toLowerCase();let h='';
  for(const[k,s]of Object.entries(SYS)){const items=P.filter(p=>p.s===k&&(!q||(p.n+' '+p.fn+' '+p.mech).toLowerCase().includes(q)));if(!items.length)continue;
    h+=`<div class="grp"><div class="gh" style="--c:${s.c}"><span class="dot"></span>${s.name}<button class="eye ${st.sysOn[k]?'on':''}" data-sys="${k}" title="Show or hide this system's labels">${st.sysOn[k]?'Labels on':'Labels off'}</button></div><ul>`+
      items.map(p=>`<li><button class="pi ${st.sel===p.id?'sel':''} ${parts[p.id].installed?'':'off'}" data-id="${p.id}">${p.n}</button></li>`).join('')+`</ul></div>`;}
  plist.innerHTML=h||'<p class="sub">No parts match that search.</p>';}
plist.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.sys){st.sysOn[b.dataset.sys]=!st.sysOn[b.dataset.sys];renderParts();refreshLabels();return;}
  if(b.dataset.id){const id=b.dataset.id;if(!parts[id].installed){setBuildStep(partStep[id],false);}select(id,true);}});
$('q').addEventListener('input',renderParts);

/* ================= UI: INFO ================= */
const right=$('right');
function stdList(step,key){return `<ul class="chk">${step.std.map((s,i)=>`<li><label><input type="checkbox" id="chk-${key}-${i}"><span>${s}</span></label></li>`).join('')}</ul>`;}
function renderInfo(){
  if(st.sel){const p=PB[st.sel],sys=SYS[p.s],si=partStep[p.id],step=STEPS[si];
    right.innerHTML=`<span class="chip" style="--c:${sys.c}"><span class="dot"></span>${sys.name}</span><h2>${p.n}</h2>
      <p class="sub">Installed at build step ${si+1} of ${STEPS.length}: ${step.t}</p>
      <div class="sec"><h3>What it does</h3><p>${p.fn}</p></div>
      <div class="sec"><h3>How it works</h3><p>${p.mech}</p></div>
      <div class="sec"><h3>Build standard at this step</h3>${stdList(step,p.id)}</div>
      <div class="acts"><button class="btn" data-act="focus">Zoom to part</button><button class="btn ${st.isolate?'on':''}" data-act="iso">${st.isolate?'Show all parts':'Isolate part'}</button><button class="btn" data-act="step">Go to build step ${si+1}</button><button class="btn" data-act="close">Close</button></div>
      <p class="note">Torque values, clearances and lash settings depend on the engine serial number. Take the numbers from ${meta.manual}.</p>`;return;}
  if(st.building&&st.buildStep<STEPS.length){const i=Math.max(0,st.buildStep),s=STEPS[i];
    right.innerHTML=`<span class="chip" style="--c:var(--accent)">Build step ${st.buildStep<0?0:i+1} of ${STEPS.length}</span>
      <h2>${st.buildStep<0?'Bare engine stand':s.t}</h2>
      ${st.buildStep<0?`<p class="sub">Press <b>Next step</b> to begin. Each step installs its parts in the order a rebuilder would, with the checks that apply at that moment.</p>`:`
      <div class="sec"><h3>Why now</h3><p>${s.why}</p></div>
      ${s.p.length?`<div class="sec"><h3>Parts installed</h3><div class="partchips">${s.p.map(id=>`<button class="chip" style="--c:${SYS[PB[id].s].c}" data-pid="${id}">${PB[id].n}</button>`).join('')}</div></div>`:''}
      <div class="sec"><h3>Standard & checks</h3>${stdList(s,'s'+i)}</div>
      ${i===STEPS.length-1?`<div class="acts"><button class="btn primary" data-act="start">Start the engine</button></div>`:''}`}
      <p class="note">Torque values, clearances and lash settings depend on the engine serial number. Take the numbers from ${meta.manual}.</p>`;return;}
  if(st.check){const ids=st.check.ids;
    right.innerHTML=`<span class="chip" style="--c:#ffb020">Diagnosis · ${meta.name}</span><h2>Parts to check</h2>
      ${st.check.why?`<p class="sub">For: ${esc(st.check.why)}</p>`:''}
      ${ids.length?`<ol class="chklist">${ids.map(id=>{const p=PB[id];return `<li><button data-pid="${id}"><span class="dot" style="--c:${SYS[p.s].c}"></span><b>${p.n}</b><small>${p.fn}</small></button></li>`;}).join('')}</ol>`:`<p class="sub">No parts on this engine are linked to these symptoms yet. Browse the parts list.</p>`}
      <div class="acts"><button class="btn ${st.check.only?'on':''}" data-act="chkOnly">${st.check.only?'Show the whole engine':'Only these parts'}</button><button class="btn" data-act="chkFrame">Frame them</button><button class="btn" data-act="chkClear">Clear</button></div>
      <p class="note">These are the usual places to look for these symptoms on this engine, not a diagnosis. Confirm with readings, fault codes and ${meta.manual}.</p>`;return;}
  right.innerHTML=`<span class="chip" style="--c:var(--accent)">${meta.name}</span><h2>${meta.overview}</h2>
    <p class="sub">Click any part, label or list item to see what it does, how it works, and the build standard that applies when it goes on.</p>
    <dl class="specs">${meta.specs.map(([a,b])=>`<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl>
    <div class="hint"><b>Controls</b><br>Drag to orbit · right-drag or two fingers to pan · <b>scroll wheel to zoom</b> toward the cursor<br><kbd>Shift</kbd> + scroll (or <kbd>E</kbd>) to explode the engine · <kbd>Space</kbd> run/stop · <kbd>C</kbd> cutaway · <kbd>F</kbd> flow paths · <kbd>L</kbd> labels · <kbd>[</kbd> <kbd>]</kbd> turn the crank 15°</div>
    <div class="sec"><h3>The four strokes</h3><p><b style="color:var(--s-intake)">Intake</b> the piston moves down and the intake valves let in boosted air. <b style="color:var(--s-comp)">Compression</b> the valves close and air is squeezed until it is hot enough to ignite diesel. <b style="color:var(--s-power)">Power</b> fuel is injected near top dead centre, burns, and drives the piston down. <b style="color:var(--s-exhaust)">Exhaust</b> the exhaust valves open and the piston pushes the gas out to the turbo. One cycle takes two crank turns (720°).</p></div>
    <p class="note">Values on screen such as boost and rail pressure are typical figures for learning, not live data. The lab model is built to the engine's real bore, stroke and layout; part shapes are simplified.</p>`;}
right.addEventListener('click',e=>{const b=e.target.closest('[data-act],[data-pid]');if(!b)return;
  if(b.dataset.pid){select(b.dataset.pid,true);return;}
  const a=b.dataset.act;if(a==='focus')focusPart(st.sel);else if(a==='iso'){st.isolate=!st.isolate;applyMats();refreshLabels();renderInfo();if(st.isolate)focusPart(st.sel);}
  else if(a==='close')select(null);else if(a==='chkOnly'){st.check.only=!st.check.only;applyMats();refreshLabels();renderInfo();}else if(a==='chkFrame')frameCheck();else if(a==='chkClear'){st.check=null;applyMats();refreshLabels();renderInfo();}else if(a==='step'){const i=partStep[st.sel];showTab('build');st.building=true;st.sel=null;setBuildStep(i,true);applyMats();}
  else if(a==='start'){startEngine();}});

/* ================= UI: BUILD ================= */
function renderBuild(){const n=st.buildStep;$('bprog').style.width=((n+1)/STEPS.length*100)+'%';
  $('bstat').textContent=n<0?'Bare engine stand: nothing installed':(n>=STEPS.length-1?`Complete: all ${STEPS.length} steps done`:`Step ${n+1} of ${STEPS.length}: ${STEPS[n].t}`);
  $('slist').innerHTML=STEPS.map((s,i)=>`<li><button class="step ${i<n?'done':''} ${i===n?'cur':''}" data-i="${i}"><span class="n">${i+1}</span><b>${s.t}</b></button></li>`).join('');
  $('bPrev').disabled=n<0;$('bNext').disabled=n>=STEPS.length-1;$('bPlay').textContent=st.autoplay?'Pause':'Auto-build';
  const cur=$('slist').querySelector('.cur');if(cur)cur.scrollIntoView({block:'nearest'});renderParts();}
$('slist').addEventListener('click',e=>{const b=e.target.closest('.step');if(!b)return;st.building=true;st.sel=null;setBuildStep(+b.dataset.i,true);applyMats();});
$('bStart').onclick=()=>{stopAuto();st.building=true;st.sel=null;stopEngine(true);setBuildStep(-1,false);applyMats();animCam(HOME.tgt,HOME.pos);};
$('bPrev').onclick=()=>{stopAuto();st.building=true;st.sel=null;setBuildStep(st.buildStep-1,false);applyMats();};
$('bNext').onclick=()=>{st.building=true;st.sel=null;if(st.buildStep<STEPS.length-1)setBuildStep(st.buildStep+1,true);applyMats();};
$('bAll').onclick=()=>{stopAuto();st.building=true;st.sel=null;setBuildStep(STEPS.length-1,false);applyMats();};
function stopAuto(){if(st.autoplay){clearInterval(st.autoplay);st.autoplay=null;renderBuild();}}
$('bPlay').onclick=()=>{if(st.autoplay){stopAuto();return;}st.building=true;st.sel=null;if(st.buildStep>=STEPS.length-1)setBuildStep(-1,false);
  st.autoplay=setInterval(()=>{if(st.buildStep>=STEPS.length-1){stopAuto();return;}setBuildStep(st.buildStep+1,true);},3200);renderBuild();};

/* ================= TABS / PANELS ================= */
function showTab(t){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));$('tab-parts').hidden=t!=='parts';$('tab-build').hidden=t!=='build';
  if(t==='build'){st.building=true;renderBuild();}else{st.building=false;}renderInfo();}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
function openPanel(w){const L=$('left'),Rp=$('right');if(w==='info'){L.classList.remove('open');Rp.classList.add('open');}else{Rp.classList.remove('open');L.classList.add('open');showTab(w);}
  document.querySelectorAll('[data-open]').forEach(b=>b.classList.toggle('on',(w==='info'?Rp:L).classList.contains('open')&&b.dataset.open===w));}
document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{const w=b.dataset.open;const panel=w==='info'?$('right'):$('left');
  if(panel.classList.contains('open')&&b.classList.contains('on')){panel.classList.remove('open');b.classList.remove('on');}else openPanel(w);});

/* ================= RUN CONTROLS ================= */
function startEngine(){if(st.buildStep<STEPS.length-1){setBuildStep(STEPS.length-1,false);applyMats();}st.running=true;st.cranking=st.rpm<100?1.5:0;updRun();}
function stopEngine(now){st.running=false;st.cranking=0;if(now)st.rpm=0;updRun();}
function updRun(){$('runBtn').textContent=st.running?'Stop engine':'Start engine';$('runBtn').classList.toggle('primary',!st.running);}
$('runBtn').onclick=()=>st.running?stopEngine():startEngine();
$('rpm').oninput=e=>{st.rpmSet=+e.target.value;$('rpmO').textContent=st.rpmSet;};
$('spd').onchange=e=>st.speed=+e.target.value;
$('stepB').onclick=()=>{st.theta-=15;};$('stepF').onclick=()=>{st.theta+=15;};
$('exp').oninput=e=>{st.explodeT=+e.target.value;};
function setCut(v){st.cut=v;$('tCut').classList.toggle('on',v);$('tCut').setAttribute('aria-pressed',v);applyMats();refreshLabels();}
function setFlow(v){st.flow=v;$('tFlow').classList.toggle('on',v);$('tFlow').setAttribute('aria-pressed',v);}
$('tAO').onclick=()=>{aoWanted=!aoWanted;$('tAO').classList.toggle('on',aoWanted);$('tAO').setAttribute('aria-pressed',aoWanted);};
$('tCut').onclick=()=>setCut(!st.cut);$('tFlow').onclick=()=>setFlow(!st.flow);
$('tLbl').onchange=e=>{st.lbl=e.target.value;refreshLabels();};
$('tRot').onclick=()=>{controls.autoRotate=!controls.autoRotate;$('tRot').classList.toggle('on',controls.autoRotate);};
$('tHome').onclick=()=>{animCam(HOME.tgt.clone().add(new THREE.Vector3(0,st.explode*6.5,0)),HOME.pos.clone().add(new THREE.Vector3(0,st.explode*6.5,0)));};

/* cycle HUD */
const cylrow=$('cylrow');cylrow.innerHTML=[1,2,3,4,5,6].map(i=>`<div class="cyl" id="cy${i}"><span class="cn">${i}</span><span class="st"></span><i class="bar"></i></div>`).join('');
$('fo').innerHTML=FIRING.map(n=>`<i data-c="${n}">${n}</i>`).join('<i>-</i>');
const STROKE=[['Power','--s-power'],['Exhaust','--s-exhaust'],['Intake','--s-intake'],['Compression','--s-comp']];
const cylEls=[1,2,3,4,5,6].map(i=>{const el=$('cy'+i);return{el,st:el.querySelector('.st'),bar:el.querySelector('.bar'),last:-1};});
const foEls=[...document.querySelectorAll('#fo i[data-c]')];

/* ================= INPUT: hover, click, wheel ================= */
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let down=null,hoverQ=null;const tip=$('tip');
function pick(ev){const r=renderer.domElement.getBoundingClientRect();mouse.set((ev.clientX-r.left)/r.width*2-1,-(ev.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);
  const hits=ray.intersectObjects(pickables,false);let fb=null;
  for(const h of hits){const p=parts[h.object.userData.part];if(!p||!p.root.visible)continue;if(st.cut&&p.def.cut==='clip'&&h.point.z>0)continue;if(isGhost(p)){fb=fb||p;continue;}return p;}return fb;}
renderer.domElement.addEventListener('pointermove',e=>{hoverQ=e;});
renderer.domElement.addEventListener('pointerleave',()=>{hoverQ=null;st.hover=null;tip.style.display='none';applyEmissive();});
renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerup',e=>{if(!down)return;const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;if(moved>5||st.showcase)return;const p=pick(e);select(p?p.def.id:null,false);});
renderer.domElement.addEventListener('dblclick',e=>{const p=pick(e);if(p)select(p.def.id,true);});
stage.addEventListener('wheel',e=>{if(!e.shiftKey)return;e.preventDefault();e.stopPropagation();const d=e.deltaY||e.deltaX;st.explodeT=THREE.MathUtils.clamp(st.explodeT-d*0.0012,0,1);$('exp').value=st.explodeT;},{capture:true,passive:false});
function doHover(){if(!hoverQ||st.showcase)return;const e=hoverQ;hoverQ=null;const p=pick(e);const id=p?p.def.id:null;
  if(id!==st.hover){st.hover=id;applyEmissive();renderer.domElement.style.cursor=id?'pointer':'grab';}
  if(p){tip.style.display='block';tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.innerHTML=`<b>${p.def.n}</b><small>${SYS[p.def.s].name}</small>`;}else tip.style.display='none';}
addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea'))return;const k=e.key.toLowerCase();
  if(k===' '){e.preventDefault();st.running?stopEngine():startEngine();}else if(k==='c')setCut(!st.cut);else if(k==='f')setFlow(!st.flow);
  else if(k==='l'){const o=['all','dots','off'];st.lbl=o[(o.indexOf(st.lbl)+1)%3];$('tLbl').value=st.lbl;refreshLabels();}
  else if(k==='e'){st.explodeT=st.explodeT>0.5?0:1;$('exp').value=st.explodeT;}else if(k==='['){st.theta-=15;}else if(k===']'){st.theta+=15;}
  else if(k==='escape'){select(null);}else if(k==='arrowright'&&st.building){$('bNext').click();}else if(k==='arrowleft'&&st.building){$('bPrev').click();}});

/* ================= GLB SHOWCASE ================= */
const modal=$('modal'),banner=$('banner');
$('glbBtn').onclick=()=>{if(st.showcase){exitShowcase();return;}modal.hidden=false;};
$('mClose').onclick=()=>modal.hidden=true;
$('glbFile').onchange=e=>{const f=e.target.files[0];if(f)loadGLB(f);};
const drop=$('drop');drop.addEventListener('dragover',e=>{e.preventDefault();drop.style.borderColor='var(--accent)';});
drop.addEventListener('dragleave',()=>drop.style.borderColor='');drop.addEventListener('drop',e=>{e.preventDefault();drop.style.borderColor='';const f=e.dataTransfer.files[0];if(f)loadGLB(f);});
async function loadGLB(file){drop.textContent='Loading '+file.name+'…';
  try{const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');const {MeshoptDecoder}=await import('three/addons/libs/meshopt_decoder.module.js');
    const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);const buf=await file.arrayBuffer();
    loader.parse(buf,'',gltf=>{const m=gltf.scene;let meshes=0;m.traverse(o=>{if(o.isMesh){meshes++;o.castShadow=o.receiveShadow=true;}});
      const holder=new THREE.Group();holder.add(m);const b=new THREE.Box3().setFromObject(m),sz=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());
      m.position.sub(c);holder.scale.setScalar(11/Math.max(sz.x,sz.y,sz.z));holder.position.set(0.5,2.3,0);scene.add(holder);
      st.showcase={holder,name:file.name,meshes};engine.visible=false;flowG.visible=false;select(null);refreshLabels();modal.hidden=true;controls.autoRotate=true;$('tRot').classList.add('on');
      $('glbBtn').textContent='Back to the lab';animCam(HOME.tgt,HOME.pos);
      banner.hidden=false;banner.innerHTML=`<b>${file.name.replace(/</g,'&lt;')}</b><span>${meshes===1?'Single merged mesh, so parts can’t be labelled individually.':meshes+' meshes'}</span>
        <button class="btn" data-r="x">Rotate X 90°</button><button class="btn" data-r="y">Rotate Y 90°</button><button class="btn" data-r="z">Rotate Z 90°</button><button class="btn primary" id="backLab">Back to the lab</button>`;
    },err=>{drop.textContent='That file could not be read as a glTF/GLB model. Try exporting it again as .glb.';console.error(err);});
  }catch(err){drop.textContent='The model loader could not start. Check your connection and try again.';console.error(err);}}
banner.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!st.showcase)return;if(b.id==='backLab'){exitShowcase();return;}
  const ax=b.dataset.r;const h=st.showcase.holder.children[0];h.rotation[ax]+=Math.PI/2;});
function exitShowcase(){if(!st.showcase)return;scene.remove(st.showcase.holder);st.showcase=null;engine.visible=true;banner.hidden=true;$('glbBtn').textContent='View your .glb model';controls.autoRotate=false;$('tRot').classList.remove('on');refreshLabels();}

/* ================= MECHANISM UPDATE ================= */
const tmpV=new THREE.Vector3();
function updateMechanism(dt){
  const th=st.theta*D2R;
  for(const k of['crank','rodBrg','fly','damper'])if(A[k])A[k].rotation.x=th;
  E.spin(A,th,st.theta);   // th: crank angle in radians; st.theta: the same in degrees (0–720 per cycle repeats)
  for(let i=0;i<6;i++){const ph=PH[i];const phi=th-ph*D2R;const yc=R*Math.cos(phi),zc=R*Math.sin(phi);const yp=yc+Math.sqrt(L*L-zc*zc);
    A.rod[i].position.set(X(i+1),yc,zc);A.rod[i].rotation.x=Math.atan2(-zc,yp-yc);
    A.pist[i].position.y=yp;A.ring[i].position.y=yp;A.pin[i].position.y=yp;
    const c=((st.theta-ph)%720+720)%720;const li=lift(c,IN_PEAK),le=lift(c,EX_PEAK);
    A.vI[i].position.y=-li;A.vE[i].position.y=-le;A.tI[i].position.y=-li;A.tE[i].position.y=-le;A.chI[i].position.y=-li;A.chE[i].position.y=-le;
    A.sI[i].forEach(s=>s.scale.y=(0.35-li)/0.35);A.sE[i].forEach(s=>s.scale.y=(0.35-le)/0.35);
    A.rkI[i].rotation.x=-li/0.45;A.rkE[i].rotation.x=-le/0.45;
    const live=st.rpm>40;const fl=live&&c<70?Math.min(1,c/5)*Math.exp(-c/22):0;A.flame[i].visible=fl>0.02;A.flame[i].material.opacity=fl;A.flame[i].scale.setScalar(0.6+fl*1.2);
    A.spray[i].visible=live&&(c>706||c<10);
    const si=Math.floor(c/180),ce=cylEls[i];if(ce.last!==si){ce.last=si;ce.st.textContent=STROKE[si][0];ce.el.style.setProperty('--sc',`var(${STROKE[si][1]})`);ce.el.classList.toggle('fire',si===0);}
    ce.bar.style.width=((c%180)/180*100).toFixed(1)+'%';}
  let latest=0,best=1e9;for(let i=0;i<6;i++){const c=((st.theta-PH[i])%720+720)%720;if(c<best){best=c;latest=i+1;}}
  foEls.forEach(el=>el.classList.toggle('hot',+el.dataset.c===latest));
}

/* ================= LOOP ================= */
const clock=new THREE.Clock();let hudT=0;
function ease(t){return t<0?0:t>1?1:t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
function tick(){const dt=Math.min(clock.getDelta(),0.05);
  // rpm
  let target=0;if(st.running){if(st.cranking>0){st.cranking-=dt;target=160;}else target=st.rpmSet;}
  st.rpm+=(target-st.rpm)*Math.min(1,dt*(st.running?1.6:1.2));if(!st.running&&st.rpm<3)st.rpm=0;
  st.theta+=st.rpm*6*dt*st.speed;
  // explode
  const prev=st.explode;st.explode+=(st.explodeT-st.explode)*Math.min(1,dt*6);const dE=st.explode-prev;
  if(Math.abs(dE)>1e-5){const dy=dE*6.5;controls.target.y+=dy;camera.position.y+=dy;const off=camera.position.clone().sub(controls.target).multiplyScalar(1+dE*0.5);camera.position.copy(controls.target).add(off);}
  // fly-in
  for(let k=flyAnims.length-1;k>=0;k--){const f=flyAnims[k];f.t+=dt;const u=ease(f.t/f.dur);f.p.fly.copy(f.from).multiplyScalar(1-u);if(f.t>=f.dur){f.p.fly.set(0,0,0);flyAnims.splice(k,1);}}
  let flashing=false;
  for(const p of Object.values(parts)){p.root.position.copy(p.ex).multiplyScalar(st.explode).add(p.fly);if(p.flash>0){p.flash=Math.max(0,p.flash-dt*0.6);flashing=true;}}
  if(flashing)applyEmissive();
  updateMechanism(dt);
  // flows
  const allIn=st.buildStep>=STEPS.length-1;flowG.visible=st.flow&&st.explode<0.03&&allIn&&!st.showcase;
  if(flowG.visible){flowT+=dt*(0.25+st.rpm/650*0.55)*(st.rpm>0?1:0.15);for(const f of FLOWS){const a=f.pts3.geometry.attributes.position;const sp=1.6/f.len;
    for(let k=0;k<f.n;k++){const u=(f.off[k]+flowT*sp)%1;f.curve.getPointAt(u,tmpV);a.setXYZ(k,tmpV.x,tmpV.y,tmpV.z);}a.needsUpdate=true;}}
  // camera tween
  if(camAnim){camAnim.t+=dt;const u=ease(camAnim.t/camAnim.dur);controls.target.lerpVectors(camAnim.ft,camAnim.tt,u);camera.position.lerpVectors(camAnim.fp,camAnim.tp,u);if(camAnim.t>=camAnim.dur)camAnim=null;}
  if(st.showcase)st.showcase.holder.position.y=2.3+st.explode*6.5;
  if(standG)standG.visible=!st.showcase;
  controls.update();doHover();
  // HUD
  hudT-=dt;if(hudT<=0){hudT=0.1;declutter();$('expO').textContent=Math.round(st.explodeT*100)+'%';const r=st.rpm;const crank=((st.theta%720)+720)%720;
    $('rCrank').textContent=crank.toFixed(0)+'°';$('rRpm').textContent=r.toFixed(0)+' rpm';$('rCam').textContent=(r/2).toFixed(0)+' rpm';
    $('rPs').textContent=(r/20).toFixed(1)+' /s';$('rPv').textContent=(2*geo.stroke*r/60).toFixed(1)+' m/s';
    const k=THREE.MathUtils.clamp((r-600)/1500,0,1);$('rBoost').textContent=r>200?(3+k*32).toFixed(0)+' psi':'–';$('rRail').textContent=r>100?meta.hud.railVal(k):'–';
    const s=$('state');const label=!st.running?(r>5?'Spinning down':'Stopped'):st.cranking>0?'Cranking':'Running';s.textContent=label+(r>5&&st.speed<1?` · ${Math.round(st.speed*100)}% speed`:'');s.classList.toggle('live',st.running&&st.cranking<=0);}
  const useAO=composer&&aoWanted&&!st.cut&&!(st.isolate&&st.sel)&&!flowG.visible;
  if(useAO)composer.render(dt);else renderer.render(scene,camera);labelR.render(scene,camera);}

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);labelR.setSize(innerWidth,innerHeight);if(composer)composer.setSize(innerWidth,innerHeight);});

/* ================= START ================= */
document.title=meta.name+' · Engine Lab · Rollin Coal';$('mark').textContent=meta.mark;$('engSub').textContent=meta.sub;$('rRailL').textContent=meta.hud.rail;if(meta.hud.boost)$('rBoostL').textContent=meta.hud.boost;
$('q').placeholder=`Search ${P.length} parts`;
const chk0=opts.parts&&opts.parts.length?opts.parts.filter(id=>parts[id]):[];
if(opts.parts&&opts.parts.length){st.check={ids:[...new Set(chk0)],why:opts.why||'',only:true};}
applyMats();refreshLabels();renderParts();renderBuild();renderInfo();
if(innerWidth<=860){camera.position.set(19,11,22);HOME.pos.set(19,11,22);}
if(!reduceMotion){st.running=true;st.rpm=650;}
updRun();
$('loading').remove();
renderer.setAnimationLoop(tick);
if(opts.part&&parts[opts.part])setTimeout(()=>select(opts.part,true),300);else if(st.check&&st.check.ids.length)setTimeout(frameCheck,300);
/* The dashboard's Diagnose panel drives the checklist from outside, without reloading the engine:
   {type:'rc-lab-check', ids, why} shows those parts (none: clears it), {type:'rc-lab-part', id} opens one.
   Same origin only. The lab says {type:'rc-lab-ready', engine, parts:[[id,name]…]} once it's up. */
addEventListener('message',e=>{if(e.origin!==location.origin)return;const m=e.data||{};
  if(m.type==='rc-lab-check'){const ids=[...new Set((m.ids||[]).filter(id=>parts[id]))];st.check=ids.length?{ids,why:m.why||'',only:true}:null;st.sel=null;st.isolate=false;
    if(st.building)showTab('parts');if(st.buildStep<STEPS.length-1)setBuildStep(STEPS.length-1,false);applyMats();refreshLabels();renderParts();renderInfo();if(ids.length)frameCheck();}
  else if(m.type==='rc-lab-part'&&parts[m.id])select(m.id,true);});
if(parent!==window)parent.postMessage({type:'rc-lab-ready',engine:meta.id,parts:P.map(p=>[p.id,p.n])},location.origin);
}
