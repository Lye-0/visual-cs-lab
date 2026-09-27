import test from 'node:test';
import assert from 'node:assert/strict';
import {L} from './helpers.mjs';
const M=L.epsilonDelta,base={mode:'linear',epsilon:.5,delta:.4,x:1.2,limit:.5,pointValue:'undefined'};
const view=p=>M.analyze({...base,...p});
test('one successful point is not a universal guarantee',()=>{const v=view({});assert.equal(v.point.meets,true);assert.equal(v.holds,false);assert.equal(v.witness.eligible,true);assert.equal(v.witness.meets,false);});
test('open endpoints permit equality of supremum, attained maxima do not',()=>{
 assert.equal(view({epsilon:1,delta:.5}).holds,true);assert.equal(view({epsilon:1,delta:.5001}).holds,false);
 assert.equal(view({mode:'square',epsilon:.5625,delta:.25}).holds,true);assert.equal(view({mode:'square',epsilon:.5625,delta:.2501}).holds,false);
 assert.equal(view({mode:'jump',epsilon:.5}).holds,false);assert.equal(view({mode:'jump',epsilon:.5001}).holds,true);
 for(const x of [1,.6,1.4])assert.equal(view({x}).point.eligible,false);
});
test('changing only the value at the hole preserves the limit condition',()=>{
 for(const pointValue of ['undefined','2','5']){const v=view({mode:'hole',pointValue,x:1});assert.equal(v.holds,true);assert.equal(v.point.eligible,false);assert.equal(v.continuous,pointValue==='2');}
});
test('suggested delta works throughout the epsilon control grid',()=>{
 for(const mode of ['linear','square','hole'])for(let i=1;i<=200;i++){const epsilon=i/100,v=view({mode,epsilon});assert.ok(v.safe>0);assert.equal(view({mode,epsilon,delta:v.safe}).holds,true,mode+' '+epsilon);}
});
test('every failed case supplies an interior counterexample, verified independently',()=>{
 const fraction=s=>s.split('/').map(BigInt),less=(s,t)=>{const [n,d=1n]=fraction(s),[a,b=1n]=fraction(t);return n*b<a*d;};
 for(const mode of ['linear','square','hole','jump'])for(const epsilon of [.01,.25,.5,1,2])for(const delta of [.0001,.2,.25,.4,1,2])for(const limit of [-.5,0,.5,1,1.5]){
  const v=view({mode,epsilon,delta,limit});if(!v.holds){const w=v.witness;assert.ok(less('0',w.exactDistance));assert.ok(less(w.exactDistance,String(Math.round(delta*10000))+'/10000'));assert.equal(less(w.exactError,String(Math.round(epsilon*100))+'/100'),false);}
 }
});
test('invalid and zero distances are rejected',()=>{for(const delta of [0,-1,Infinity,NaN])assert.throws(()=>view({delta}));});
