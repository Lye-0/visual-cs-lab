import test from 'node:test';
import assert from 'node:assert/strict';
import {modelModules} from '../scripts/modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
const L=CSL,X=L.experiences;
test('every authored numeric or selected preset survives the actual model normalization',()=>{
 const drift=[];let examples=0;
 for(const [id,d]of X.lessons)for(const ch of d.chapters)for(const a of ch.activities){
  if(!['inspect','ledger','timeline','editor','compare'].includes(a.kind))continue;
  const lab=L.labs.find(l=>l.id===(a.model||id));
  for(const e of a.kind==='compare'?a.examples:[{label:'initial',patch:{}},...(a.examples||[])]){
   examples++;const patch={...a.patch,...e.patch},input=X.modelParams(lab.id,patch),actual=L.validateParams(lab,input);
   for(const key of Object.keys(patch))if(typeof input[key]==='number'&&typeof actual[key]==='number'?Math.abs(input[key]-actual[key])>1e-8:JSON.stringify(input[key])!==JSON.stringify(actual[key]))drift.push({id,chapter:ch.id,example:e.label,key,declared:input[key],actual:actual[key]});
  }
 }
 assert.equal(X.lessons.size,314);assert.ok(examples>500);assert.deepEqual(drift,[]);
});
test('one, ten and two hundred really perform the declared number of trials',async()=>{
 const lab=L.labs.find(l=>l.id==='c03-probability');
 for(const n of [1,10,200]){const result=await L.run(lab,{...lab.defaults,n});assert.equal(result.metrics['試行回数'],n);assert.equal(result.frames.at(-1).title,n+'回の試行');}
});
test('trial prefixes use the same random draws and retain the documented bound',async()=>{
 const lab=L.labs.find(l=>l.id==='c03-probability');
 let rng=L.rng(42),expected=0;for(let i=0;i<10;i++)expected+=Number(rng()<.5);
 const r=await L.run(lab,{...lab.defaults,n:10,seed:42,probability:50});assert.equal(r.metrics['成功回数'],expected);assert.equal(L.validateParams(lab,{...lab.defaults,n:100000}).n,1000);
});
test('calculated values keep zero, false, very small errors and explicit missing data',()=>{
 assert.deepEqual(X.valueEntries({zero:0,flag:false,error:1e-12,missing:null}),[{label:'zero',text:'0'},{label:'flag',text:'false'},{label:'error',text:'1e-12'},{label:'missing',text:'—'}]);
 assert.equal(X.valuesMarkup({}),'');assert.equal(X.valuesMarkup(null),'');
});
test('values escape both labels and content instead of rendering executable text',()=>{
 const html=X.valuesMarkup({'<img onerror="boom">':'<script>bad()</script>',array:['a','<b>']});assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img/);assert.match(html,/&quot;/);
});
test('final answers are not revealed by an earlier selected state',()=>{
 const r={frames:[{},{},{}],metrics:{answer:99}};
 for(const kind of ['timeline','editor','inspect']){assert.deepEqual(X.finalValues(r,kind,0,6),{});assert.deepEqual(X.finalValues(r,kind,2,6),{answer:99});assert.deepEqual(X.finalValues(r,kind,1,6),{});}
 assert.deepEqual(X.finalValues(r,'ledger',0,2),{});assert.deepEqual(X.finalValues(r,'ledger',0,3),{answer:99});
});
test('frames and results contain the derivative values that must be visible',async()=>{
 const lab=L.labs.find(l=>l.id==='c03-derivative'),r=await L.run(lab,{...lab.defaults,x:1,h:.1});
 assert.equal(r.frames[0].stats['差分近似'],2.1);assert.equal(r.frames[0].stats['厳密な微分 2x'],2);
 const html=X.valuesMarkup(r.frames[0].stats);assert.match(html,/2\.1/);assert.match(html,/厳密な微分/);
});
