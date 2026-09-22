/* Mathematical evidence: a selected result retains its operands and reason.
 * Independently authored small examples, not transcribed pages from notes.
 * Exact rational rows are bounded to keep every integer operation safe. */
(() => {
'use strict';
const X=CSL.experiences,E=X.mathEvidence={};
const copy=X.clone;
const number=(v,min,max,label='値')=>{if(!Number.isFinite(v)||v<min||v>max)throw Error(label+'は'+min+'〜'+max+'の有限な値です。');return v;};
const integer=(v,min,max,label='番号')=>{number(v,min,max,label);if(!Number.isInteger(v))throw Error(label+'は整数です。');return v;};
const choice=(v,all)=>{if(!all.includes(v))throw Error('選択を確認してください。');return v;};
const begin=s=>{if((s.log?.length||0)>=120)throw Error('この例は120操作までです。最初へ戻してください。');return copy(s);};
const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b)[a,b]=[b,a%b];return a;};
const fraction=(n,d=1)=>{
 if(!Number.isSafeInteger(n)||!Number.isSafeInteger(d)||d===0)throw Error('分数の整数範囲を超えたか、分母が0です。');
 if(d<0){n=-n;d=-d;}const g=gcd(n,d);n/=g;d/=g;
 if(Math.abs(n)>1e9||d>1e9)throw Error('この教材の分数は、約分後の分子・分母を10億以内に制限しています。');return [n,d];
};
const parse=text=>{
 if(typeof text==='number'){if(!Number.isFinite(text))throw Error('有限の値を入力してください。');text=String(text);}
 if(typeof text!=='string')throw Error('整数・小数・分数を入力してください。');text=text.trim();
 if(/^[+-]?\d+\s*\/\s*[+-]?\d+$/.test(text)){const [n,d]=text.split('/').map(Number);return fraction(n,d);}
 if(!/^[+-]?\d+(?:\.\d{1,6})?$/.test(text))throw Error('整数、小数6桁まで、または1/3のような分数を入力してください。');
 const digits=text.includes('.')?text.split('.')[1].length:0;return fraction(Number(text.replace('.','')),10**digits);
};
const mul=(a,b)=>{const g=gcd(a[0],b[1]),h=gcd(b[0],a[1]);return fraction((a[0]/g)*(b[0]/h),(a[1]/h)*(b[1]/g));};
const add=(a,b)=>{const g=gcd(a[1],b[1]);return fraction(a[0]*(b[1]/g)+b[0]*(a[1]/g),(a[1]/g)*b[1]);};
const sub=(a,b)=>add(a,[-b[0],b[1]]);
const format=q=>q[1]===1?String(q[0]):q[0]+'/'+q[1];
E.rational={fraction,parse,mul,add,sub,format,value:q=>q[0]/q[1]};
E.rowStart=(preset='unique',inverse=false)=>{
 choice(preset,['unique','dependent','inconsistent']);
 const a=preset==='unique'?[[2,1],[1,-1]]:[[1,1],[2,2]],b=preset==='unique'?[5,1]:preset==='dependent'?[3,6]:[3,7];
 const initial=a.map((row,i)=>[...row,...(inverse?[Number(i===0),Number(i===1)]:[b[i]])].map(v=>fraction(v)));
 return {preset,inverse,initial,entries:[{matrix:copy(initial),reason:'初期の式。係数と右側の列を対応させます。',operation:null,terms:[]}],selected:0,log:[]};
};
E.row=(input,a)=>{
 if(a.kind==='preset')return E.rowStart(a.preset,input.inverse);
 const s=begin(input);
 if(a.kind==='select'){s.selected=integer(a.index,0,1);return s;}
 if(a.kind==='undo'){if(s.entries.length>1)s.entries.pop();return s;}
 if(a.kind!=='operate')throw Error('行操作を選んでください。');
 if(s.entries.length>=31)throw Error('この例は30回の行操作までです。戻すか初期化してください。');
 const row=integer(a.row,0,1),other=integer(a.other,0,1),op=choice(a.operation,['add','scale','swap']);
 const k=op==='swap'?[1,1]:parse(a.factor);if(Math.abs(k[0]/k[1])>100)throw Error('倍率は−100〜100で指定してください。');
 if(op==='add'&&row===other)throw Error('足す元には別の行を選んでください。');
 if(op==='scale'&&k[0]===0)throw Error('0倍すると条件を失います。逆数で戻せる0以外を選んでください。');
 const old=s.entries.at(-1).matrix,matrix=copy(old);let terms=[],reason='';
 if(op==='swap'){
  [matrix[row],matrix[other]]=[matrix[other],matrix[row]];
  reason='行'+(row+1)+'と行'+(other+1)+'を交換。条件の順序だけを変え、同じ交換で元へ戻せます。';
 }else{
  terms=old[row].map((value,j)=>{
   const source=op==='add'?old[other][j]:value,product=mul(k,source),result=op==='add'?add(value,product):product;
   return {column:j,before:copy(value),source:copy(source),factor:copy(k),product,result};
  });matrix[row]=terms.map(t=>t.result);
  reason=op==='add'?'行'+(row+1)+' ← 行'+(row+1)+' + ('+format(k)+') × 行'+(other+1)+'。元の行'+(other+1)+'は残します。逆の倍率を足せば戻せるため、解を失いません。':'行'+(row+1)+'を'+format(k)+'倍。右辺も同じ倍率にし、逆数を掛ければ元に戻せます。';
 }
 s.entries.push({matrix,reason,operation:{kind:op,row,other,factor:k},terms});s.selected=row;s.log.push(reason);return s;
};
E.rowView=s=>{
 const matrix=s.entries.at(-1).matrix,zero=q=>q[0]===0,unit=matrix.every((r,i)=>r.slice(0,2).every((q,j)=>q[0]===Number(i===j)*q[1]));
 const contradiction=!s.inverse&&matrix.findIndex(r=>zero(r[0])&&zero(r[1])&&!zero(r[2]));
 const redundant=matrix.findIndex(r=>zero(r[0])&&zero(r[1])&&r.slice(2).every(zero));
 const singular=s.inverse&&matrix.some(r=>zero(r[0])&&zero(r[1]));
 let outcome='まだ係数が混ざっています。選んだ行を式へ読み戻してから、次の操作を決めます。';
 if(unit)outcome=s.inverse?'左側が単位行列です。右側が逆行列です。下で元のAとの積を確認できます。':'x = '+format(matrix[0][2])+'、y = '+format(matrix[1][2])+'。元の二つの式へ代入して確かめます。';
 else if(contradiction!==false&&contradiction>=0)outcome='行'+(contradiction+1)+'が 0 = '+format(matrix[contradiction][2])+' になりました。どのx,yでも満たせず、解はありません。';
 else if(singular)outcome='左側に零行ができました。このAを単位行列へ変えられず、逆行列はありません。';
 else if(redundant>=0)outcome='0 = 0 の行は新しい条件ではありません。残る一本の式を満たす点が無数にあります。';
 const verification=unit?(s.inverse?s.initial.map(r=>[0,1].map(j=>add(mul(r[0],matrix[0][j+2]),mul(r[1],matrix[1][j+2])))):s.initial.map(r=>({left:add(mul(r[0],matrix[0][2]),mul(r[1],matrix[1][2])),right:r[2]}))):null;
 return {matrix,unit,contradiction,redundant,outcome,verification};
};
E.productStart=()=>({A:[[1,2,3],[4,5,6]],B:[[1,0],[0,1],[1,1]],order:'AB',row:0,col:0,log:[]});
const matrix=text=>{
 if(typeof text!=='string'||text.length>256)throw Error('行列は256文字以内です。');
 const rows=text.trim().split(/[;\n]+/).map(row=>row.trim().split(/[ ,]+/).map(Number));
 if(rows.length<1||rows.length>4||rows.some(row=>row.length!==rows[0].length||row.length<1||row.length>4||row.some(x=>!Number.isFinite(x)||Math.abs(x)>20)))throw Error('1〜4行・1〜4列の矩形で、各成分は−20〜20です。空の行や式は使いません。');
 if(!text.trim()||/[;,]\s*[,;]/.test(text))throw Error('空の成分を入れないでください。');return rows;
};
E.productView=s=>{
 const [left,right]=s.order==='AB'?[s.A,s.B]:[s.B,s.A],valid=left[0].length===right.length;
 if(!valid)return {left,right,valid,reason:'左の列数 '+left[0].length+' と右の行数 '+right.length+' が違うため、この順序の積は定義できません。'};
 const result=left.map(row=>right[0].map((_,j)=>row.reduce((sum,x,k)=>sum+x*right[k][j],0)));
 const terms=left[s.row].map((x,k)=>({k,left:x,right:right[k][s.col],product:x*right[k][s.col]}));
 return {left,right,valid,result,terms,value:result[s.row][s.col]};
};
E.product=(input,a)=>{
 const s=begin(input);
 if(a.kind==='load'){const A=matrix(a.A),B=matrix(a.B);s.A=A;s.B=B;s.row=s.col=0;s.log.push('二つの行列を反映。まず内側のサイズを照合し、結果の一成分を選びます。');return s;}
 if(a.kind==='order'){s.order=choice(a.value,['AB','BA']);s.row=s.col=0;s.log.push('掛ける順序だけを変更しました。同じ行列でも、積の形や定義できるかが変わります。');return s;}
 if(a.kind==='select'){const v=E.productView(s);if(!v.valid)throw Error('この順序の積は未定義です。');s.row=integer(a.row,0,v.result.length-1);s.col=integer(a.col,0,v.result[0].length-1);return s;}
 throw Error('未定義の行列操作です。');
};
E.gradientStart=()=>({shape:'bowl',point:[1,1],angle:0,step:.25,log:[]});
E.surface=(shape,x,y)=>shape==='bowl'?x*x+2*y*y:x*x-y*y;
E.gradientView=s=>{
 const [x,y]=s.point,sign=s.shape==='bowl'?2:-1,gradient=[2*x,2*sign*y],r=s.angle*Math.PI/180,u=[Math.cos(r),Math.sin(r)],parts=gradient.map((v,i)=>v*u[i]),slope=parts[0]+parts[1],next=[x+s.step*u[0],y+s.step*u[1]],value=E.surface(s.shape,x,y),linear=value+s.step*slope,actual=E.surface(s.shape,...next);
 return {gradient,u,parts,slope,next,value,linear,actual,error:actual-linear,norm:Math.hypot(...gradient)};
};
E.gradient=(input,a)=>{
 const s=begin(input);
 if(a.kind==='point'){s.point=[number(a.x,-2,2,'x'),number(a.y,-2,2,'y')];}
 else if(a.kind==='angle')s.angle=number(a.value,-180,180,'方向角');
 else if(a.kind==='step')s.step=number(a.value,.05,.5,'移動量');
 else if(a.kind==='shape')s.shape=choice(a.value,['bowl','saddle']);
 else if(a.kind==='direction'){
  const v=E.gradientView(s);if(v.norm<1e-12)throw Error('この点の勾配は零です。最急方向や接線方向をこの矢印から一つに決められません。');
  const shift=choice(a.value,['up','down','level'])==='up'?0:a.value==='down'?Math.PI:Math.PI/2;
  let angle=(Math.atan2(v.gradient[1],v.gradient[0])+shift)*180/Math.PI;angle=((angle+180)%360+360)%360-180;s.angle=angle;
 }else throw Error('未定義の勾配操作です。');
 s.log.push('同じ点での勾配と、選んだ方向を別々に読みます。接平面の一次近似と実際の値も区別します。');return s;
};
})();
