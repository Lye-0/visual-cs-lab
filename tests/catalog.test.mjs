import test from 'node:test';
import assert from 'node:assert/strict';
import {L,run} from './helpers.mjs';

test('全20分野・旧144単元とノート対応15単元・N01–N20・S01–S24・総合8演習を維持',()=>{
 assert.equal(L.areas.length,20);assert.equal(L.legacyLabIds.length,144);
 assert.equal(L.curriculum.baselineIds.length,159);
 assert.equal(L.labs.length,159+L.curriculum.entries.length);
 assert.ok(L.curriculum.entries.length<=155);
 assert.equal(new Set(L.labs.map(l=>l.id)).size,L.labs.length);
 for(const id of L.curriculum.baselineIds)assert.ok(L.labs.some(l=>l.id===id),id);
 for(const id of L.legacyLabIds)assert.ok(L.labs.some(l=>l.id===id),id);
 for(const area of L.areas)assert.ok(L.labs.some(l=>l.area===area.id),area.id);
 for(const [prefix,total]of [['N',20],['S',24]])for(let i=1;i<=total;i++)assert.ok(L.labs.some(l=>l.topic===prefix+String(i).padStart(2,'0')),prefix+i);
 assert.equal(L.labs.filter(l=>l.track==='missions').length,8);
});
test('実験・ルート・科目・用語・出典に壊れた参照がない',()=>{
 for(const lab of L.labs){assert.ok(L.engines[lab.engine],lab.id);assert.ok(lab.title&&lab.question&&lab.guide.length===3&&lab.lesson&&lab.limits&&lab.scope,lab.id);for(const id of lab.prereq)assert.ok(L.labs.some(l=>l.id===id),id);for(const id of lab.sources)assert.ok(L.sources[id],id);assert.equal(lab.challenge?.options.length,3,lab.id);assert.ok(lab.challenge.answer>=0&&lab.challenge.answer<=2,lab.id);}
 for(const route of L.routes)for(const id of route.labs)assert.ok(L.labs.some(l=>l.id===id),id);
 for(const c of L.courses)for(const id of c.labs)assert.ok(L.labs.some(l=>l.id===id),id);
 for(const g of L.glossary)assert.ok(L.labs.some(l=>l.id===g.lab),g.term);
});
function checkResult(r,id){
 assert.ok(r.frames.length>0&&r.frames.length<=1000,id);
 for(const f of r.frames){assert.ok(f.title&&f.explain&&f.visual.type,id);const s=L.visualize(f.visual);assert.ok(s.length>0,id);assert.ok(!/\bNaN\b|="undefined"|="Infinity"/.test(s),id);}
 function finite(v){if(typeof v==='number')assert.ok(Number.isFinite(v),id);else if(v&&typeof v==='object')for(const x of Object.values(v))finite(x);}finite(r.metrics);finite(r.frames);
}
for(const lab of L.labs){
 test(`${lab.id} — 初期条件と全コントロールの境界・選択肢`,async t=>{
  const cases=[['初期条件',{}]];for(const c of lab.controls){if(c.type==='range'){cases.push([c.key+' min',{[c.key]:c.min}],[c.key+' max',{[c.key]:c.max}]);}else if(c.type==='toggle')cases.push([c.key+' toggle',{[c.key]:!c.value}]);else if(c.type==='select')for(const o of c.options)cases.push([c.key+'='+o.value,{[c.key]:o.value}]);}
  for(const [name,p]of cases)await t.test(name,async()=>checkResult(await run(lab.id,p),lab.id+' '+name));
 });
}
test('制御値の検証は範囲・ステップ・選択肢を守る',()=>{
 const lab=L.labs.find(l=>l.id==='n11-tcp'),p=L.validateParams(lab,{count:4.8,window:100,rtt:'bad',loss:-1});assert.equal(p.count,5);assert.equal(p.window,6);assert.equal(p.loss,0);assert.equal(p.rtt,lab.defaults.rtt);
 const s=L.labs.find(l=>l.id==='s08-access');assert.equal(L.validateParams(s,{role:'root'}).role,s.defaults.role);
});
test('既存図と拡張図の文字列はHTMLとして実行されずエスケープされる',()=>{
 const unsafe={label:'<img onerror=alert(1)>',values:['</script><script>alert(2)</script>']};
 const visuals=[{type:'cells',rows:[unsafe]},L.curriculum.cells([unsafe])];
 for(const visual of visuals){
  const html=L.visualize(visual);assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&lt;/script&gt;'));assert.ok(!html.includes('<script>'));
 }
});
