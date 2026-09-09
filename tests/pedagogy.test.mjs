import test from 'node:test';
import assert from 'node:assert/strict';
import {L} from './helpers.mjs';
for(const lab of L.labs){
 test(`${lab.id} — 単元名・説明・操作・観察点・比較用条件を備える`,async()=>{
  for(const key of ['unit','summary','observe'])assert.ok(typeof lab[key]==='string'&&lab[key].length>=4,`${lab.id} ${key}`);
  assert.equal(lab.guide.length,3);assert.ok(lab.guide.every(x=>x.length>10));
  assert.ok(lab.exploration.label.length>3);const patch=lab.exploration.patch;assert.ok(Object.keys(patch).length>0);
  for(const key of Object.keys(patch))assert.ok(lab.controls.some(c=>c.key===key),`${lab.id} ${key}`);
  const params={...lab.defaults,...patch};const checked=L.validateParams(lab,params);
  for(const [key,value] of Object.entries(patch))assert.deepEqual(checked[key],value,`${lab.id} invalid example ${key}`);
  assert.ok(Object.keys(patch).some(k=>JSON.stringify(patch[k])!==JSON.stringify(lab.defaults[k])),lab.id+' must change a condition');
  const r=await L.run(lab,checked);assert.ok(r.frames.length>0);
  const initial=await L.run(lab,lab.defaults);assert.notDeepEqual(r,initial,lab.id+' must produce an observable difference, not just a changed control');
  for(const frame of r.frames){const html=L.visualize(frame.visual);assert.ok(html.length>0);assert.doesNotMatch(html,/\bNaN\b|="undefined"|="Infinity"/);}
  assert.doesNotMatch(lab.guide.join(' '),/ノート|お気に入り|学習履歴|理解済み/);
  if(lab.presentation==='direct'){assert.equal((await L.run(lab,lab.defaults)).frames.length,1);assert.equal(r.frames.length,1);assert.doesNotMatch(lab.guide[0],/1ステップ/);}
 });
}
test('即時結果の実験を正しく分類し、他の単元を削除しない',()=>{
 assert.equal(L.labs.length,144);assert.equal(L.labs.filter(l=>l.presentation==='direct').length,7);
 assert.equal(new Set(L.labs.map(l=>l.unit)).size,144);
});
