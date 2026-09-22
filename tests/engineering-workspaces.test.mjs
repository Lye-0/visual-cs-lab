import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {modelModules,browserModules,styles} from '../scripts/modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
const L=CSL,X=L.experiences,E=X.engineeringDesk,near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const atomic=(fn,s,a)=>{const before=structuredClone(s);assert.throws(()=>fn(s,a));assert.deepEqual(s,before);};
const ids=Array.from({length:12},(_,i)=>'gap-'+(144+i));
test('最後の12単元を28章へ接続し、元の314単元を全て保持する',()=>{
 assert.equal(L.labs.length,314);assert.equal(X.lessons.size,314);assert.deepEqual([...X.lessons.keys()].sort(),L.labs.map(l=>l.id).sort());
 const defs=ids.map(id=>X.find(id));assert.ok(defs.every(Boolean));assert.equal(defs.reduce((n,d)=>n+d.chapters.length,0),28);
 const kinds=defs.flatMap(d=>d.chapters.flatMap(c=>c.activities.map(a=>a.kind)));
 for(const kind of ['requirements-desk','observer-mailboxes','order-state-desk','test-author-desk','merge-choice-desk','revision-gate','study-order','stakeholder-options','resampling-objects','claim-evidence','request-pipeline','feedback-specimen','target-specimen','accessibility-specimen','layout-specimen','event-specimen','form-specimen'])assert.equal(kinds.filter(x=>x===kind).length,1,kind);
});
test('使う全ての既存モデルの例と入力契約を実際に計算する',async()=>{
 for(const id of ids)for(const ch of X.find(id).chapters)for(const a of ch.activities){
  if(!['inspect','ledger','compare','editor','timeline'].includes(a.kind))continue;
  const lab=L.labs.find(l=>l.id===(a.model||id));
  for(const example of a.kind==='compare'?a.examples:[{patch:{}},...(a.examples||[])]){
   const p={...lab.defaults,...a.patch,...example.patch};for(const c of lab.controls.filter(c=>c.type==='select'))assert.ok(c.options.some(o=>o.value===p[c.key]),id+'/'+ch.id+'/'+c.key);
   const r=await L.run(lab,p);assert.ok(r.frames.length,id+'/'+ch.id);
  }
 }
});
test('専用部品が静的入口に含まれ、外部送信や永続的な学習履歴を追加しない',async()=>{
 for(const name of ['experiences-engineering-models','experiences-engineering-lessons'])assert.ok(modelModules.includes(name));
 for(const name of ['experiences-engineering-widgets','experiences-engineering-dom'])assert.ok(browserModules.includes(name));assert.ok(styles.includes('experiences-engineering'));
 for(const name of ['models','widgets','dom']){
  const s=await readFile(new URL('../src/experiences-engineering-'+name+'.js',import.meta.url),'utf8');assert.doesNotMatch(s,/\b(?:eval|fetch|WebSocket)\s*\(|\b(?:localStorage|sessionStorage|indexedDB)\b|new\s+Function\s*\(/);
 }
});
test('cacheの短い時間と、古い版の応答を独立して検査する',()=>{
 let s=E.design(E.designStart(),{kind:'read'});assert.equal(s.last.time,47);assert.equal(E.designView(s).fresh,true);
 s=E.design(s,{kind:'cache'});s=E.design(s,{kind:'read'});s=E.design(s,{kind:'edit',value:20});s=E.design(s,{kind:'read'});
 assert.equal(s.last.time,20);assert.equal(s.last.value,10);assert.equal(E.designView(s).fresh,false);
 s=E.design(s,{kind:'invalidate'});assert.equal(s.cached.value,10);s=E.design(s,{kind:'edit',value:21});s=E.design(s,{kind:'read'});assert.equal(s.last.value,21);assert.equal(E.designView(s).fresh,true);
});
test('DBを複製しても値の鮮度・CPU時間は自動で改善しない',()=>{
 let s=E.design(E.designStart(),{kind:'read'});const result=s.last;s=E.design(s,{kind:'replicas',value:2});assert.deepEqual(s.last,result);near(E.designView(s).availability,.9999*.999*.9999);assert.equal(E.designView(s).cost,9);atomic(E.design,s,{kind:'replicas',value:0});
});
test('Observerの解除は過去の受信を消さず、再登録も過去分を再送しない',()=>{
 let s=E.observer(E.observerStart(),{kind:'emit',value:'first'});s=E.observer(s,{kind:'subscribe',id:'B'});s=E.observer(s,{kind:'emit',value:'second'});
 assert.deepEqual(s.inboxes.B.map(x=>x.event),['first']);assert.equal(s.inboxes.A.length,2);s=E.observer(s,{kind:'subscribe',id:'B'});assert.equal(s.inboxes.B.length,1);atomic(E.observer,s,{kind:'emit',value:' '});
});
test('状態図にない注文操作を原子的に拒否し、prototype名も受理しない',()=>{
 let s=E.orderStart();atomic(E.order,s,{kind:'send'});atomic(E.order,s,{kind:'__proto__'});s=E.order(s,{kind:'approve'});s=E.order(s,{kind:'send'});assert.equal(s.state,'sent');atomic(E.order,s,{kind:'cancel'});
});
test('仕様から作った境界ケースは実装の不具合を検出する',()=>{
 let s=E.testing(E.testStart(),{kind:'add',x:10,expected:10});s=E.testing(s,{kind:'run'});const r=s.results.at(-1);assert.equal(r.actual,9);assert.equal(r.spec,10);assert.equal(r.pass,false);assert.equal(r.oracle,true);
});
test('不具合と同じ期待値を写すと自分のテストだけが通ってしまう',()=>{
 let s=E.testing(E.testStart(),{kind:'add',x:10,expected:9});s=E.testing(s,{kind:'run'});assert.equal(s.results.at(-1).pass,true);assert.equal(s.results.at(-1).correct,false);assert.equal(s.results.at(-1).oracle,false);
});
test('コードの修正はケースを保持し、旧結果を無効化する',()=>{
 let s=E.testing(E.testStart(),{kind:'add',x:10,expected:10});s=E.testing(s,{kind:'run'});const before=structuredClone(s.cases);
 s=E.testing(s,{kind:'code',value:s.program.replace('return 9;','return 10;')});assert.equal(s.results,null);assert.deepEqual(s.cases,before);s=E.testing(s,{kind:'run'});assert.ok(s.results.every(r=>r.pass&&r.correct));
 s=E.testing(s,{kind:'select',index:2});for(let i=0;i<100;i++)s=E.testing(s,{kind:'step',delta:1});const v=E.testView(s);assert.equal(s.step,v.trace.frames.length-1);assert.ok(v.frame.visual.output.includes('10'));
});
test('小言語の無限ループは実行上限で停止し、構文エラーは編集前の状態を保持',()=>{
 const s=E.testStart();atomic(E.testing,s,{kind:'code',value:'fn {'});const r=E.executeCase('while (true) { print(1); }',0);assert.ok(r.error);assert.ok(r.frames.length<300);
});
test('競合した色を解決しても、独立なsize=20の変更を失わない',()=>{
 const s=E.mergeStart();assert.equal(E.mergeView(s).conflicts.length,1);
 for(const side of ['left','right']){const n=E.merge(s,{kind:'resolve',side});assert.equal(E.mergeView(n).result[1],'size = 20');}
 assert.deepEqual(E.mergeView(E.mergeStart(false)).result,['color = green','size = 20','label = item']);
});
test('CIの古い版の成功では、新しい版を仮想配布できない',()=>{
 let s=E.ci(E.ciStart(),{kind:'start'});s=E.ci(s,{kind:'edit'});s=E.ci(s,{kind:'complete',id:1,pass:true});s=E.ci(s,{kind:'review'});s=E.ci(s,{kind:'build'});atomic(E.ci,s,{kind:'publish'});
 s=E.ci(s,{kind:'start'});s=E.ci(s,{kind:'complete',id:2,pass:true});s=E.ci(s,{kind:'publish'});assert.equal(s.published,1);
});
test('CIの遅い旧ジョブの成功は新しい失敗や実行中を覆さない',()=>{
 let s=E.ciStart();for(const kind of ['review','build','start','start'])s=E.ci(s,{kind});s=E.ci(s,{kind:'complete',id:2,pass:false});s=E.ci(s,{kind:'complete',id:1,pass:true});atomic(E.ci,s,{kind:'publish'});
 s=E.ci(s,{kind:'start'});s=E.ci(s,{kind:'complete',id:3,pass:true});s=E.ci(s,{kind:'start'});atomic(E.ci,s,{kind:'publish'});
});
test('割当の順序だけで平均差が変わり、基準時間は変わらない',()=>{
 let s=E.studyStart();const base=E.studyView(s).rows.map(r=>r.base);near(E.studyView(s).difference,-8);
 s=E.study(s,{kind:'balance'});near(E.studyView(s).difference,-3);assert.deepEqual(E.studyView(s).rows.map(r=>r.base),base);
 for(let i=0;i<8;i++)if(s.orders[i]==='AB')s=E.study(s,{kind:'order',index:i});near(E.studyView(s).difference,2);
});
test('倫理の事例は複数主体の利害を保持し、単一スコアで自動合格にしない',()=>{
 const rows=E.policyView(E.policy(E.policyStart(),{kind:'policy',value:'external'}));assert.equal(rows.length,3);assert.ok(rows.every(r=>r.benefit&&r.risk));assert.ok(rows.every(r=>!('score' in r)));
});
test('対応の入替えは元データを変えず、復元抽出には同じ組を重複して使える',()=>{
 const start=E.resampleStart();let s=E.resample(start,{kind:'swap',index:0});let v=E.resampleView(s);near(v.permuted[0],3);assert.deepEqual(s.a,start.a);
 s=E.resample(s,{kind:'draw',index:0});s=E.resample(s,{kind:'draw',index:0});v=E.resampleView(s);assert.equal(v.drawn.length,2);near(v.bootstrapMean,-3);near(v.pvalue,2/64);near(v.observed,-14/6);
});
test('根拠の有無と、平均・全称・因果の主張を区別する',()=>{
 let s=E.evidence(E.evidenceStart(),{kind:'evidence',value:'E1'});assert.match(E.evidenceView(s).verdict,/根拠/);
 s=E.evidence(s,{kind:'claim',value:'always'});s=E.evidence(s,{kind:'evidence',value:'E1'});assert.match(E.evidenceView(s).verdict,/反例/);
 s=E.evidence(s,{kind:'claim',value:'causal'});s=E.evidence(s,{kind:'evidence',value:'M1'});assert.match(E.evidenceView(s).detail,/順序/);
 s=E.evidence(s,{kind:'claim',value:'mean'});s=E.evidence(s,{kind:'evidence',value:'P1'});assert.match(E.evidenceView(s).verdict,/足りない/);
});
const request=patch=>({kind:'request',method:'GET',path:'/items/1',body:'{}',role:'user',actor:1,contentType:'application/json',failure:'none',...patch});
test('仮想APIは認証・所有者・本文を異なる判断として拒否する',()=>{
 const s=E.apiStart();assert.equal(E.api(s,request({role:'guest'})).last.status,401);assert.equal(E.api(s,request({path:'/items/2'})).last.status,403);
 assert.equal(E.api(s,request({method:'POST',path:'/items',body:'{'})).last.status,400);assert.equal(E.api(s,request({method:'POST',path:'/items',body:'{}'})).last.status,422);
 assert.equal(E.api(s,request({method:'POST',path:'/items',body:'{"name":"new"}',contentType:'text/plain'})).last.status,415);
});
test('APIの成功は次の要求へ残り、更新後の例外は旧データへ戻る',()=>{
 const s=E.apiStart(),before=structuredClone(s.rows);const failed=E.api(s,request({method:'PATCH',body:'{"name":"変更"}',failure:'after'}));assert.equal(failed.last.status,500);assert.deepEqual(failed.rows,before);
 const success=E.api(s,request({method:'PATCH',body:'{"name":"変更"}'}));assert.equal(success.last.status,200);assert.equal(success.rows[0].name,'変更');const next=E.api(success,request({}));assert.equal(next.last.body.name,'変更');assert.deepEqual(s.rows,before);
});
test('元状態を変更しない操作と、不正な状態変更の原子的拒否',()=>{
 for(const [start,reduce,a]of [[E.designStart,E.design,{kind:'cache'}],[E.observerStart,E.observer,{kind:'emit',value:'<b>literal</b>'}],[E.studyStart,E.study,{kind:'balance'}],[E.policyStart,E.policy,{kind:'policy',value:'detailed'}],[E.resampleStart,E.resample,{kind:'draw',index:0}]]){const s=start(),old=structuredClone(s),next=reduce(s,a);assert.deepEqual(s,old);assert.notEqual(s,next);}
 atomic(E.resample,E.resampleStart(),{kind:'draw',index:6});atomic(E.api,E.apiStart(),request({actor:NaN}));
});
