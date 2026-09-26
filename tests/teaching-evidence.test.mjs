import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureUnits} from './lesson-fixtures.mjs';
test('chapters distinguish their learning tasks in navigation',()=>{
 for(const u of fixtureUnits)assert.equal(new Set(u.chapters.map(c=>c.title)).size,u.chapters.length,u.id);
});
test('Jacobian evidence is independent of scalar-surface coefficients',async()=>{
 const l=CSL.labs.find(l=>l.id==='gap-006');
 const run=p=>CSL.run(l,{...l.defaults,...p});
 const a=await run({mode:'jacobian',x:1,y:2}),b=await run({mode:'jacobian',x:1,y:2,a:-3,b:0,c:3});
 assert.deepEqual(a,b);assert.deepEqual(a.frames.at(-1).visual.matrix,[[2,-4],[4,2]]);
 assert.equal(a.metrics['局所面積倍率'],20);assert.equal(a.metrics['出力 T₁'],-3);assert.equal(a.metrics['出力 T₂'],4);
 assert.equal(a.metrics['関数値'],undefined);
});
test('integral evidence reports region totals rather than an unrelated point gradient',async()=>{
 const l=CSL.labs.find(l=>l.id==='gap-006'),r=await CSL.run(l,{...l.defaults,mode:'integral'});
 assert.equal(r.metrics['厳密な積分'],1.25);assert.ok(Math.abs(r.metrics['近似積分']-1.25)<.003);assert.equal(r.metrics['偏微分 x'],undefined);
});
