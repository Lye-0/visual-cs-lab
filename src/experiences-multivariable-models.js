/* Small, inspectable examples for GAP-006. No persistence or external input.
 * T and f match the existing calculation chapters. Only the representation
 * changes: a local displacement, or the domain being summed, is selectable. */
(() => {
'use strict';
const X=CSL.experiences,M=X.multivariable={};
const number=(v,min,max,name)=>{if(!Number.isFinite(v)||v<min||v>max)throw Error(name+'は'+min+'〜'+max+'の有限な数です。');return v;};
const integer=(v,min,max,name)=>{number(v,min,max,name);if(!Number.isInteger(v))throw Error(name+'は整数です。');return v;};
const start=s=>{if(s.log.length>=160)throw Error('この例は160操作までです。実験を最初からにしてください。');return X.clone(s);};
const note=(s,message)=>{s.log.push(message);return s;};
M.transform=(x,y)=>[x*x-y*y,2*x*y];
M.localStart=()=>({point:[1,.5],h:.5,corner:2,entry:0,log:[]});
M.localView=s=>{
 const [x,y]=s.point,h=s.h,J=[[2*x,-2*y],[2*y,2*x]],base=M.transform(x,y);
 const displacements=[[0,0],[h,0],[h,h],[0,h]];
 const map=delta=>{
  const at=[x+delta[0],y+delta[1]],actual=M.transform(...at).map((v,i)=>v-base[i]);
  const predicted=J.map(row=>row[0]*delta[0]+row[1]*delta[1]);
  return {delta,at,actual,predicted,error:actual.map((v,i)=>v-predicted[i])};
 };
 const vertices=displacements.map(map),selected=vertices[s.corner],boundary=[];
 for(let edge=0;edge<4;edge++)for(let k=0;k<=16;k++){
  const a=displacements[edge],b=displacements[(edge+1)%4],t=k/16;
  boundary.push(map(a.map((v,i)=>v+(b[i]-v)*t)));
 }
 return {J,base,vertices,boundary,selected,det:4*(x*x+y*y),linearArea:4*(x*x+y*y)*h*h,
  absoluteError:Math.hypot(...selected.error),terms:J.map(row=>row.map((v,i)=>v*selected.delta[i])),
  // Fixed as h changes: shrinking the square does not secretly zoom it back up.
  outputExtent:Math.max(2,2*(Math.abs(x)+Math.abs(y))+1.4)};
};
M.local=(input,a)=>{
 const s=start(input);
 if(a.kind==='point'){
  const point=[number(a.x,-1.5,1.5,'Pのx'),number(a.y,-1.5,1.5,'Pのy')];s.point=point;
  return note(s,'点Pを変更しました。同じPの偏微分を並べたJ(P)と、T(P)を計算し直します。');
 }
 if(a.kind==='h'){s.h=number(a.value,.05,.8,'正方形の一辺h');return note(s,'Pは変えず、変位の大きさだけを変更しました。図の目盛りはhの変更では変わりません。');}
 if(a.kind==='corner'){s.corner=integer(a.index,0,3,'頂点');return s;}
 if(a.kind==='entry'){s.entry=integer(a.index,0,3,'行列の成分');return s;}
 throw Error('未定義の局所変形操作です。');
};
M.regionStart=()=>({n:4,included:Array(16).fill(true),selected:5,coefficients:[1,1,2],edit:false,log:[]});
M.height=(coefficients,x,y)=>coefficients[0]*x*x+coefficients[1]*x*y+coefficients[2]*y*y;
M.cellIntegral=(coefficients,x0,x1,y0,y1)=>coefficients[0]*(x1**3-x0**3)*(y1-y0)/3+coefficients[1]*(x1*x1-x0*x0)*(y1*y1-y0*y0)/4+coefficients[2]*(y1**3-y0**3)*(x1-x0)/3;
M.regionView=s=>{
 const n=s.n,dx=1/n,cellArea=dx*dx;
 const cells=s.included.map((included,index)=>{
  const i=index%n,j=Math.floor(index/n),x0=i/n,x1=(i+1)/n,y0=j/n,y1=(j+1)/n,x=(i+.5)/n,y=(j+.5)/n;
  const height=M.height(s.coefficients,x,y),raw=height*cellArea,exact=M.cellIntegral(s.coefficients,x0,x1,y0,y1);
  return {index,i,j,x0,x1,y0,y1,x,y,height,cellArea,included,raw,contribution:included?raw:0,exact:included?exact:0};
 });
 const sum=cells.reduce((v,c)=>v+c.contribution,0),exact=cells.reduce((v,c)=>v+c.exact,0),count=s.included.filter(Boolean).length;
 const strips=Array.from({length:n},(_,j)=>({j,sum:cells.filter(c=>c.j===j).reduce((v,c)=>v+c.contribution,0)}));
 return {cells,selected:cells[s.selected],dx,cellArea,count,area:count*cellArea,sum,exact,error:sum-exact,strips};
};
M.region=(input,a)=>{
 const s=start(input);
 if(a.kind==='focus-cell'){s.selected=integer(a.index,0,s.n*s.n-1,'区画');return s;}
 if(a.kind==='cell'){
  s.selected=integer(a.index,0,s.n*s.n-1,'区画');
  if(s.edit)s.included[s.selected]=!s.included[s.selected];
  return note(s,s.edit?'選んだ区画の所属を変えました。高さの関数は変えず、この区画を和へ含めるかだけを変更します。':'区画を選びました。領域の所属と関数の係数は変えていません。');
 }
 if(a.kind==='mode'){if(typeof a.edit!=='boolean')throw Error('操作モードが不正です。');s.edit=a.edit;return note(s,s.edit?'領域編集：区画を押すと、その区画を含める／外すを切り替えます。':'区画を調べる：押しても領域は変えず、座標と寄与を読みます。');}
 if(a.kind==='toggle'){s.included[s.selected]=!s.included[s.selected];return note(s,'選んだ区画だけの所属を変更しました。除外しても、そこでの関数値が0になるわけではありません。');}
 if(a.kind==='coefficients'){
  const coefficients=[a.a,a.b,a.c].map((v,i)=>number(v,-3,3,['a','b','c'][i]));s.coefficients=coefficients;
  return note(s,'領域はそのまま、高さの関数を変更しました。負の高さの区画は、符号付きの負の寄与になります。');
 }
 if(a.kind==='preset'){
  if(!['square','L','empty'].includes(a.value))throw Error('領域を選び直してください。');
  s.n=4;s.selected=5;s.included=Array.from({length:16},(_,i)=>a.value==='square'||a.value==='L'&&(i%4<2||Math.floor(i/4)<2));
  return note(s,'領域と分割を指定例へ戻しました。係数は保持しています。L字は右上の1/4を除いた領域です。');
 }
 if(a.kind==='refine'){
  if(s.n>=16)throw Error('細分化は16×16までです。');
  const old=s.n,next=old*2;s.included=Array.from({length:next*next},(_,i)=>s.included[Math.floor(Math.floor(i/next)/2)*old+Math.floor((i%next)/2)]);
  s.selected=2*Math.floor(s.selected/old)*next+2*(s.selected%old);s.n=next;
  return note(s,'全区画を縦横2等分しました。領域そのものは変えず、各中点の高さと面積要素を計算し直します。選択は元の区画の左下の子区画へ移ります。');
 }
 throw Error('未定義の領域操作です。');
};
})();
