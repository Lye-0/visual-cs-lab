/* Small software graphics: select a point, pixel, coefficient or control point.
 * Calculation stages coexist. Screen coordinates use y downward, depth −1..1. */
(() => {
'use strict';
const X=CSL.experiences,K=CSL.curriculum,M=X.mediaDesk;
const {integer:int,number:num,choice,begin,note,range}=M;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a.map((v,i)=>(1-t)*v+t*b[i]);
M.rasterStart=()=>({cell:27,vertex:0,depth:true,reverse:false,near:.5,log:[]});
M.rasterView=s=>{
 const world=[[-.9,-.8,1],[.9,-.8,1],[0,.9,2],[-.9,-.8,0],[.9,-.8,0],[0,.9,0]],view=world.map(([x,y,z])=>[x,y,z-4]);
 const clip=view.map(([x,y,z])=>[2*x,2*y,(12+s.near)/(s.near-12)*z+24*s.near/(s.near-12),-z]);
 let triangles=[];
 for(const [ids,color,name]of [[[0,1,2],[60,205,180],'手前'],[[3,4,5],[180,110,210],'奥']]){
  const polygon=K.clipPolygon(ids.map(i=>({clip:clip[i],color})));
  for(let i=1;i<polygon.length-1;i++)triangles.push({name,points:[polygon[0],polygon[i],polygon[i+1]]});
 }
 if(s.reverse)triangles.reverse();
 const render=K.rasterTriangles(triangles.map(t=>t.points),8,s.depth,false),point={x:s.cell%8+.5,y:Math.floor(s.cell/8)+.5};
 const edge=(a,b,p)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);let stored=null,winner='背景';
 const trace=triangles.map(t=>{
  const v=t.points.map(p=>({x:(p.clip[0]/p.clip[3]+1)*3.5,y:(1-p.clip[1]/p.clip[3])*3.5,z:p.clip[2]/p.clip[3]})),area=edge(v[0],v[1],v[2]);
  if(Math.abs(area)<1e-9)return {name:t.name,inside:false,reason:'面積0'};
  const weights=[edge(v[1],v[2],point),edge(v[2],v[0],point),edge(v[0],v[1],point)].map(x=>x/area),inside=weights.every(x=>x>=-1e-9),z=weights.reduce((sum,w,i)=>sum+w*v[i].z,0),before=stored;
  const pass=inside&&(!s.depth||stored===null||z<stored);
  if(pass){stored=z;winner=t.name;}
  return {name:t.name,inside,weights,z,before,pass,reason:!inside?'画素中心が外':pass?'色と深度を保存':'既存の面より奥／同じ深度'};
 });
 return {world,view,clip,ndc:clip.map(p=>p.slice(0,3).map(v=>v/p[3])),image:render.image,trace,winner,point,triangles:triangles.length};
};
M.raster=(input,a)=>{
 const s=begin(input);
 if(a.kind==='cell'){s.cell=int(a.index,0,63);return s;}
 if(a.kind==='vertex'){s.vertex=int(a.index,0,5);return s;}
 if(a.kind==='depth'||a.kind==='reverse'){s[a.kind]=!s[a.kind];return note(s,'同じ頂点を再描画。'+(a.kind==='depth'?'深度検査':'三角形の順序')+'だけを変更しました。');}
 if(a.kind==='near'){s.near=choice(a.value,[.5,2.5,3.5,4.5]);return note(s,'near='+s.near+'。平面との交点を追加してから画素を計算します。');}
 throw Error('未定義の描画操作です。');
};
M.lightStart=()=>({cell:27,light:[-.5,.5,1],exponent:16,texture:false,log:[]});
M.lightView=s=>{
 const size=Math.hypot(...s.light),light=s.light.map(v=>v/size);
 const points=range(64,i=>{
  const x=2*(i%8+.5)/8-1,y=1-2*(Math.floor(i/8)+.5)/8,r=x*x+y*y;
  if(r>1)return {inside:false,rgb:[15,24,34]};
  const normal=[x,y,Math.sqrt(1-r)],dot=normal.reduce((sum,v,j)=>sum+v*light[j],0),diffuse=Math.max(0,dot),reflection=normal.map((v,j)=>2*dot*v-light[j]),specular=dot>0?Math.max(0,reflection[2])**s.exponent:0;
  const uv=[.5+Math.atan2(normal[2],x)/(2*Math.PI),Math.acos(y)/Math.PI],checker=(Math.floor(uv[0]*8)+Math.floor(uv[1]*8))%2;
  const albedo=s.texture?(checker?[.75,.8,.9]:[.1,.16,.22]):[.25,.65,.6],raw=albedo.map(a=>(.07+.75*diffuse)*a+.5*specular);
  return {inside:true,normal,dot,diffuse,reflection,specular,uv,albedo,raw,rgb:raw.map(v=>Math.round(clamp(v,0,1)*255))};
 });
 return {light,points,selected:points[s.cell]};
};
M.light=(input,a)=>{
 const s=begin(input);
 if(a.kind==='cell'){s.cell=int(a.index,0,63);return s;}
 if(a.kind==='light'){if(!Array.isArray(a.vector)||a.vector.length!==3)throw Error('光は3成分で指定します。');const v=a.vector.map(x=>num(x,-2,2));if(Math.hypot(...v)<1e-9)throw Error('0ベクトルでは光の向きが決まりません。');s.light=v;return note(s,'光の方向だけを変更。表面上の位置と法線はそのままです。');}
 if(a.kind==='texture'){s.texture=!s.texture;return note(s,'同じUVで参照する表面色を切り替えました。法線の色ではありません。');}
 if(a.kind==='exponent'){s.exponent=int(a.value,1,64,'指数');return note(s,'経験的な鏡面項の指数を変更しました。');}
 throw Error('未定義の照明操作です。');
};
M.bezierStart=()=>({points:[[0,0],[1,3],[3,-1],[4,2]],selected:1,t:.5,log:[]});
M.bezierLevels=(points,t)=>{const levels=[points.map(p=>p.slice())];while(levels.at(-1).length>1){const last=levels.at(-1);levels.push(last.slice(0,-1).map((p,i)=>mix(p,last[i+1],t)));}return levels;};
M.bezier=(input,a)=>{
 const s=begin(input);
 if(a.kind==='select'){s.selected=int(a.index,0,3);return s;}
 if(a.kind==='move'){if(!Array.isArray(a.point)||a.point.length!==2)throw Error('2成分の点です。');s.points[s.selected]=a.point.map(v=>num(v,-2,5));return note(s,'P'+s.selected+'だけを移動。他の制御点を保持し、全補間段階を計算し直しました。');}
 if(a.kind==='t'){s.t=num(a.value,0,1,'t');return note(s,'同じ制御点でt='+s.t+'の内分を追います。');}
 throw Error('未定義の曲線操作です。');
};
M.dctStart=()=>({pixels:range(4,y=>range(4,x=>x<2?60+10*y:200-10*y)),keep:range(16,i=>i),coefficient:0,cell:5,log:[]});
M.dctView=s=>{
 const input=s.pixels.map(r=>r.map(v=>v-128)),coefficients=K.dct2(input),selected=coefficients.map((r,y)=>r.map((v,x)=>s.keep.includes(y*4+x)?v:0)),back=K.dct2(selected,true).map(r=>r.map(v=>v+128));
 const u=s.coefficient%4,v=Math.floor(s.coefficient/4),alpha=k=>k===0?.5:Math.sqrt(.5),basis=range(16,i=>alpha(u)*alpha(v)*Math.cos(Math.PI*(2*(i%4)+1)*u/8)*Math.cos(Math.PI*(2*Math.floor(i/4)+1)*v/8));
 return {coefficients,back,basis,contribution:basis.map(x=>x*selected[v][u]),error:Math.max(...back.flat().map((v,i)=>Math.abs(v-s.pixels[Math.floor(i/4)][i%4])))};
};
M.dct=(input,a)=>{
 const s=begin(input);
 if(a.kind==='select'){s.coefficient=int(a.index,0,15);return s;}
 if(a.kind==='cell'){s.cell=int(a.index,0,15);return s;}
 if(a.kind==='toggle'){const i=s.coefficient;s.keep=s.keep.includes(i)?s.keep.filter(x=>x!==i):[...s.keep,i];return note(s,'係数('+i%4+','+Math.floor(i/4)+')を'+(s.keep.includes(i)?'戻しました。':'0にしました。')+'元の画素は変更していません。');}
 if(a.kind==='dc'){s.keep=[0];return note(s,'平均に対応するDC係数だけを残しました。');}
 if(a.kind==='all'){s.keep=range(16,i=>i);return note(s,'全係数を戻しました。量子化はせず、丸め前の逆変換値で照合します。');}
 throw Error('未定義の係数操作です。');
};
})();