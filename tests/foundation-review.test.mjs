import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {modelModules} from '../scripts/modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
const X=CSL.experiences,V=X.foundationReview,copy=structuredClone;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const apply=(s,...actions)=>actions.reduce((state,a)=>V.hamming(state,a),s);
const encode={kind:'encode'},deliver={kind:'deliver'},inspect={kind:'inspect'},correct={kind:'correct'};
const hamming=(a,b)=>a.reduce((n,bit,i)=>n+Number(bit!==b[i]),0);
test('Hamming known word uses the documented positions and even parity',()=>{
 assert.deepEqual(V.encode([1,0,1,1]),[0,1,1,0,0,1,1]);
 assert.deepEqual(V.receive([0,1,1,0,0,1,1]).checks.map(c=>c.parity),[0,0,0]);
});
test('every four-bit message survives each possible single-bit error',()=>{
 for(let n=0;n<16;n++){const m=n.toString(2).padStart(4,'0').split('').map(Number),sent=V.encode(m);
  for(let i=-1;i<7;i++){const received=sent.slice();if(i>=0)received[i]^=1;const r=V.receive(received);assert.deepEqual(r.message,m);assert.deepEqual(r.candidate,sent);assert.equal(r.syndrome,i+1);}
 }
});
test('all distinct codewords have distance at least three independently of decoder',()=>{
 const words=Array.from({length:16},(_,n)=>V.encode(n.toString(2).padStart(4,'0').split('').map(Number)));
 let minimum=7;for(let i=0;i<16;i++)for(let j=i+1;j<16;j++)minimum=Math.min(minimum,hamming(words[i],words[j]));assert.equal(minimum,3);
});
test('a concrete two-bit error is not silently reported as successful recovery',()=>{
 const sent=V.encode([1,0,1,1]),received=sent.slice();received[0]^=1;received[1]^=1;const r=V.receive(received);
 assert.equal(r.syndrome,3);assert.notDeepEqual(r.candidate,sent);assert.notDeepEqual(r.message,[1,0,1,1]);
});
test('receiver calculation is a function only of received bits',()=>{
 const s=apply(V.hammingStart(),encode,deliver),r=V.hamming(s,inspect);
 const changed={...copy(s),sent:[1,1,1,1,1,1,1],channel:[0,0,0,0,0,0,0],message:[0,0,0,0]};
 assert.deepEqual(V.hamming(changed,inspect).report,r.report);assert.deepEqual(s.received,s.sent);
});
test('channel editing does not retroactively edit a delivered reception',()=>{
 const s=apply(V.hammingStart(),encode,deliver,inspect,correct),before=copy(s),next=V.hamming(s,{kind:'flip',index:2});
 assert.deepEqual(s,before);assert.deepEqual(next.received,s.received);assert.deepEqual(next.report,s.report);assert.deepEqual(next.repaired,s.repaired);
 const redelivered=V.hamming(next,deliver);assert.notDeepEqual(redelivered.received,s.received);assert.equal(redelivered.report,null);assert.equal(redelivered.repaired,null);
});
test('information changes invalidate every later role, selecting a check does not',()=>{
 const s=apply(V.hammingStart(),encode,deliver,inspect),selected=V.hamming(s,{kind:'check',mask:4});assert.deepEqual(selected.report,s.report);
 const changed=V.hamming(s,{kind:'message',index:0});for(const key of ['sent','channel','received','report','repaired'])assert.equal(changed[key],null);
});
test('out-of-order and malformed operations cannot partially change state',()=>{
 const s=V.hammingStart(),before=copy(s);for(const a of [deliver,inspect,correct,{kind:'flip',index:0},{kind:'message',index:4},{kind:'check',mask:3}])assert.throws(()=>V.hamming(s,a));assert.deepEqual(s,before);
 for(const value of [[1,0,1],[1,0,1,2],'1011'])assert.throws(()=>V.encode(value));
});
test('selected parity check names exactly its participating positions',()=>{
 const r=V.receive([0,1,1,0,0,1,1]);assert.deepEqual(r.checks.map(c=>c.positions),[[1,3,5,7],[2,3,6,7],[4,5,6,7]]);
});
test('the trapezoid workbook has an independently known initial sum',()=>{
 const v=V.integralView(V.integralStart());close(v.sum,2.75);close(v.exact,8/3);close(v.error,1/12);assert.equal(v.selected.i,1);
});
test('trapezoid terms add up and agree with the analytic error for x squared',()=>{
 for(const [start,end]of [[0,2],[-2,1],[2,-1],[-1,-1]])for(const n of [1,2,4,16]){
  const s=V.integral(V.integralStart(),{kind:'configure',start,end,n}),v=V.integralView(s);
  close(v.sum-v.exact,(end-start)**3/(6*n*n));close(v.sum,v.cells.reduce((total,t)=>total+t.dx*(t.y0+t.y1)/2,0));
 }
});
test('reversing integration reverses the sign, zero interval remains finite',()=>{
 const s=V.integralStart(),v=V.integralView(s),reverse=V.integralView(V.integral(s,{kind:'configure',start:2,end:0,n:4}));close(v.sum,-reverse.sum);
 const zero=V.integralView(V.integral(s,{kind:'configure',start:1,end:1,n:4}));close(zero.sum,0);assert.ok(zero.cells.every(t=>Number.isFinite(t.contribution)));
});
test('selecting a term keeps the function and partition unchanged',()=>{
 const s=V.integralStart(),next=V.integral(s,{kind:'select',index:3});assert.equal(next.selected,3);assert.deepEqual(V.integralView(s).cells,V.integralView(next).cells);
 const changed=V.integral(next,{kind:'configure',start:0,end:2,n:1});assert.equal(changed.selected,0);
});
test('invalid integral configurations are rejected atomically',()=>{
 const s=V.integralStart(),before=copy(s);for(const a of [{start:NaN},{end:4},{n:0},{n:2.5}])assert.throws(()=>V.integral(s,{kind:'configure',start:0,end:2,n:4,...a}));assert.deepEqual(s,before);
});
const exhaustive=(items,capacity)=>{let best=0;for(let subset=0;subset<2**items.length;subset++){let w=0,v=0;items.forEach((it,i)=>{if(subset&(1<<i)){w+=it.weight;v+=it.value;}});if(w<=capacity)best=Math.max(best,v);}return best;};
test('every DP cell matches an independent enumeration of subsets',()=>{
 for(let capacity=0;capacity<=12;capacity++){
  const s=V.knapsack(V.knapsackStart(),{kind:'capacity',value:capacity}),v=V.knapsackView(s);
  v.dp.forEach((row,i)=>row.forEach((value,c)=>assert.equal(value,exhaustive(s.items.slice(0,i),c))));
 }
});
test('selected last cell names two genuine predecessors and a winning candidate',()=>{
 const v=V.knapsackView(V.knapsackStart());assert.deepEqual(v.skip,{row:3,col:7,value:9});assert.deepEqual(v.take,{row:3,col:2,previous:3,added:8,value:11});assert.equal(v.value,11);assert.deepEqual(v.bag,['A','D']);
});
test('base row and overweight item do not fabricate negative-capacity references',()=>{
 const s=V.knapsackStart(),base=V.knapsackView(V.knapsack(s,{kind:'select',row:0,col:7}));assert.equal(base.item,null);assert.equal(base.take,null);assert.equal(base.value,0);
 const small=V.knapsackView(V.knapsack(s,{kind:'select',row:4,col:1}));assert.equal(small.take,null);assert.deepEqual(small.skip,{row:3,col:1,value:0});
});
test('ties are explicit and reverse reconstruction still produces a feasible optimum',()=>{
 let s=V.knapsackStart();s=V.knapsack(s,{kind:'item',index:1,weight:2,value:3});s=V.knapsack(s,{kind:'select',row:2,col:2});assert.equal(V.knapsackView(s).tie,true);
 for(let cap=0;cap<=12;cap++){const trial=V.knapsack(s,{kind:'capacity',value:cap}),v=V.knapsackView(trial),chosen=trial.items.filter(i=>v.bag.includes(i.name));assert.ok(chosen.reduce((n,it)=>n+it.weight,0)<=cap);assert.equal(chosen.reduce((n,it)=>n+it.value,0),v.optimum);}
});
test('zero values, edited weights and empty capacity are supported',()=>{
 let s=V.knapsackStart();for(let i=0;i<4;i++)s=V.knapsack(s,{kind:'item',index:i,weight:1+i,value:0});assert.equal(V.knapsackView(s).optimum,0);assert.deepEqual(V.knapsackView(s).bag,[]);s=V.knapsack(s,{kind:'capacity',value:0});assert.equal(s.col,0);
});
test('invalid item edits do not change even the valid first field',()=>{
 const s=V.knapsackStart(),before=copy(s);assert.throws(()=>V.knapsack(s,{kind:'item',index:0,weight:3,value:-1}));assert.throws(()=>V.knapsack(s,{kind:'item',index:0,weight:0,value:3}));assert.throws(()=>V.knapsack(s,{kind:'select',row:5,col:0}));assert.deepEqual(s,before);
});
test('registered lesson routes remain stable and now select the three direct workspaces',()=>{
 const expected={'c01-hamming':'hamming-roles','c03-integral':'trapezoid-select','c06-dp':'knapsack-cells'};assert.equal(X.lessons.size,314);
 for(const [id,kind]of Object.entries(expected)){const chapter=X.find(id).chapters[0];assert.equal(chapter.id,'meaning');assert.equal(chapter.activities[0].kind,kind);}
});
test('probability exposes a real seed control while fixed comparison still shares seed42',()=>{
 const def=X.find('c03-probability'),activities=def.chapters[0].activities,lab=CSL.labs.find(l=>l.id===def.id);
 assert.ok(lab.controls.some(c=>c.key==='seed'));assert.ok(activities[1].keys.some(k=>(k.key||k)==='seed'));assert.equal(activities[0].patch.seed,42);
});
test('labels match insertion and instruction granularity, race question matches its numbers',()=>{
 assert.match(X.find('c05-heap').chapters[0].activities[0].advance,/挿入/);
 assert.match(X.find('c09-pipeline').chapters[0].activities[1].advance,/命令/);
 assert.match(X.find('c12-race').chapters[0].question,/100/);assert.match(X.find('c12-race').chapters[0].question,/130/);
});
test('renderers avoid duplicate attributes and numeric placeholders are actually filled',async()=>{
 const widget=await readFile(new URL('../src/experiences-foundation-review-widgets.js',import.meta.url),'utf8');assert.ok(!widget.includes('class="ex-fr-bit-button"'));
 const objects=await readFile(new URL('../src/experiences-objects.js',import.meta.url),'utf8');assert.match(objects,/join\(' \+ '\)\|\|'0'/);assert.match(objects,/data-race-mode-note/);
});
