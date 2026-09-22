/* Small, pure models for learner-authored boundaries, leaves and merges.
 * These operations do not advance a prerecorded movie. No DOM or storage. */
(() => {
'use strict';
const X=CSL.experiences;
const copy=value=>JSON.parse(JSON.stringify(value));
function words(input){
 const list=Array.isArray(input)?input.slice():String(input).trim().split(/[\s,、]+/).filter(Boolean);
 if(list.length<1||list.length>8||list.some(w=>typeof w!=='string'||! /^[01]{1,8}$/.test(w)))throw Error('符号語は1〜8桁の0と1を、1〜8個指定してください。');
 if(new Set(list).size!==list.length)throw Error('異なる記号へ同じ符号語を割り当てないでください。');
 return list;
}
function binary(input){
 if(typeof input!=='string'||! /^[01]{1,20}$/.test(input))throw Error('受信列は1〜20桁の0と1で指定してください。');
 return input;
}
function codeProperties(input){
 const codes=words(input),initial=new Set();
 for(const a of codes)for(const b of codes)if(a!==b&&b.startsWith(a))initial.add(b.slice(a.length));
 // Sardinas–Patterson reachability: remainders are proper suffixes of codewords.
 // Exploring each remainder once is finite; reaching epsilon witnesses ambiguity.
 const seen=new Set(initial),queue=[...initial],steps=[];
 for(let i=0;i<queue.length;i++){
  const tail=queue[i],next=new Set();
  for(const word of codes){
   if(tail.startsWith(word))next.add(tail.slice(word.length));
   if(word.startsWith(tail))next.add(word.slice(tail.length));
  }
  steps.push({tail,next:[...next]});
  if(next.has(''))return {prefixFree:false,uniquelyDecodable:false,initial:[...initial],steps};
  for(const suffix of next)if(!seen.has(suffix)){seen.add(suffix);queue.push(suffix);}
 }
 return {prefixFree:initial.size===0,uniquelyDecodable:true,initial:[...initial],steps};
}
function segment(input,stream,cuts=[]){
 const codes=words(input);binary(stream);
 if(!Array.isArray(cuts)||cuts.some(n=>!Number.isInteger(n)||n<=0||n>=stream.length))throw Error('区切りはビットとビットの間に置いてください。');
 const positions=[0,...new Set(cuts.slice().sort((a,b)=>a-b)),stream.length];
 const parts=positions.slice(1).map((end,i)=>{
  const start=positions[i],bits=stream.slice(start,end),index=codes.indexOf(bits);
  return {start,end,bits,index,symbol:index<0?null:String.fromCharCode(65+index)};
 });
 return {parts,valid:parts.every(p=>p.index>=0),text:parts.map(p=>p.symbol||'?').join(''),notation:parts.map(p=>p.bits).join(' | ')};
}
function decodings(input,stream,limit=12){
 const codes=words(input);binary(stream);
 if(!Number.isInteger(limit)||limit<1||limit>64)throw Error('表示候補数の上限は1〜64です。');
 const out=[];
 function visit(offset,cuts){
  if(out.length>limit)return;
  if(offset===stream.length){out.push(segment(codes,stream,cuts));return;}
  for(const word of codes)if(stream.startsWith(word,offset)){
   const end=offset+word.length;visit(end,end<stream.length?[...cuts,end]:cuts);
   if(out.length>limit)return;
  }
 }
 visit(0,[]);return {readings:out.slice(0,limit),truncated:out.length>limit};
}
function leafState(placed,path,depth=4){
 if(!Number.isInteger(depth)||depth<1||depth>6||typeof path!=='string'||! /^[01]+$/.test(path)||path.length>depth)throw Error('この木にある0と1の道を選んでください。');
 const exact=placed.includes(path);
 const ancestor=placed.find(p=>p!==path&&path.startsWith(p));
 const descendant=placed.find(p=>p!==path&&p.startsWith(path));
 return {state:exact?'placed':ancestor?'below-leaf':descendant?'above-leaf':'free',conflict:ancestor||descendant||null};
}
function placeLeaf(placed,path,depth=4){
 const info=leafState(placed,path,depth);
 if(info.state==='placed')throw Error(path+' は既に符号語です。');
 if(info.state==='below-leaf')throw Error(info.conflict+' で既に読み終わるため、その下の '+path+' は置けません。');
 if(info.state==='above-leaf')throw Error(path+' を符号語にすると、既存の '+info.conflict+' の途中で読み終わってしまいます。');
 return [...placed,path];
}
function slots(placed,depth=4){
 let accepted=[];
 for(const p of placed)accepted=placeLeaf(accepted,p,depth);
 const total=2**depth,used=placed.reduce((sum,p)=>sum+2**(depth-p.length),0);
 return {total,used,remaining:total-used,kraft:used/total};
}
function huffmanStart(weights=[4,2,1,1]){
 if(!Array.isArray(weights)||weights.length<2||weights.length>8||weights.some(w=>!Number.isInteger(w)||w<1||w>1000))throw Error('頻度は1〜1000の整数を2〜8個指定してください。');
 return {weights:weights.slice(),next:0,roots:weights.map((weight,i)=>({id:'leaf-'+String.fromCharCode(65+i),weight,symbol:String.fromCharCode(65+i)})),history:[]};
}
function merge(state,ids){
 if(state.roots.length<2)throw Error('既に一本の木になっています。');
 if(!Array.isArray(ids)||ids.length!==2||ids[0]===ids[1])throw Error('異なる二つの候補を選んでください。');
 const chosen=ids.map(id=>state.roots.find(n=>n.id===id));
 if(chosen.some(n=>!n))throw Error('いま残っている候補を選んでください。');
 const ordered=state.roots.map(n=>n.weight).sort((a,b)=>a-b),actual=chosen.map(n=>n.weight).sort((a,b)=>a-b);
 if(actual[0]!==ordered[0]||actual[1]!==ordered[1])throw Error('いま小さい二つの頻度は '+ordered[0]+' と '+ordered[1]+' です。同じ頻度の候補は、どれを選んでも構いません。');
 const result=copy(state),[left,right]=chosen.map(copy),node={id:'join-'+state.next,weight:left.weight+right.weight,left,right};
 result.history.push({before:copy(state.roots),next:state.next,left:left.id,right:right.id,leftWeight:left.weight,rightWeight:right.weight,weight:node.weight});
 result.next++;result.roots=result.roots.filter(n=>!ids.includes(n.id));result.roots.push(node);
 return result;
}
function undo(state){
 if(!state.history.length)return copy(state);
 const result=copy(state),last=result.history.pop();result.roots=last.before;result.next=last.next;return result;
}
function codeTable(state){
 if(state.roots.length!==1)return null;
 const rows=[];
 function visit(node,path){if(node.symbol){rows.push({symbol:node.symbol,weight:node.weight,code:path,length:path.length});return;}visit(node.left,path+'0');visit(node.right,path+'1');}
 visit(state.roots[0],'');rows.sort((a,b)=>a.symbol.localeCompare(b.symbol));
 const total=state.weights.reduce((a,b)=>a+b,0),weighted=rows.reduce((s,r)=>s+r.weight*r.length,0);
 return {rows,total,weighted,average:weighted/total};
}
X.coding={words,binary,codeProperties,segment,decodings,leafState,placeLeaf,slots,huffmanStart,merge,undo,codeTable};
})();
