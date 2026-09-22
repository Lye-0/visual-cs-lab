import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {modelModules,browserModules,styles} from '../scripts/modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
const L=CSL,X=L.experiences,S=X.securityDesk,C=L.curriculum.cryptoTools;
const clone=X.clone;
function atomic(fn,state,action,pattern){const before=clone(state);assert.throws(()=>fn(state,action),pattern);assert.deepEqual(state,before);}
async function asyncAtomic(fn,state,action,pattern){const before=clone(state);await assert.rejects(fn(state,action),pattern);assert.deepEqual(state,before);}

test('13単元と8つの専用操作が読み込み対象へ接続されている',()=>{
 for(const file of ['experiences-security-models','experiences-security-auth','experiences-security-lessons'])assert.ok(modelModules.includes(file),file);
 for(const file of ['experiences-security-widgets','experiences-security-auth-widgets'])assert.ok(browserModules.includes(file),file);
 assert.ok(styles.includes('experiences-security'));
 for(let n=109;n<=121;n++)assert.ok(X.find('gap-'+n),'gap-'+n);
 for(const [n,kinds]of [[109,['asset-paths']],[111,['aes-byte-map']],[114,['jwt-check-desk','refresh-delivery']],[115,['policy-request']],[118,['memory-boundary']],[120,['evidence-copy']],[121,['shamir-candidates']]]){
  const registered=X.find('gap-'+n).chapters.flatMap(c=>c.activities.map(a=>a.kind));for(const kind of kinds)assert.ok(registered.includes(kind),kind);
 }
});
test('全13単元の各章と比較例を実モデルで計算する',async t=>{
 for(let n=109;n<=121;n++)for(const ch of X.find('gap-'+n).chapters){
  assert.ok(ch.paragraphs.join('').length>=30,'gap-'+n+'/'+ch.id);
  for(const [i,a]of ch.activities.entries())if(['inspect','ledger','timeline','editor','compare'].includes(a.kind))await t.test(n+'/'+ch.id+'/'+i,async()=>{
   const lab=L.labs.find(l=>l.id===(a.model||'gap-'+n));
   for(const ex of a.kind==='compare'?a.examples:[{patch:{}},...(a.examples||[])]){
    const params={...clone(lab.defaults),...a.patch,...ex.patch};
    for(const c of lab.controls){if(c.type==='select')assert.ok(c.options.some(o=>o.value===params[c.key]),n+'/'+c.key);if(c.type==='range'){const v=params[c.key];assert.ok(Number.isFinite(v)&&v>=c.min&&v<=c.max);assert.ok(Math.abs((v-c.min)/c.step-Math.round((v-c.min)/c.step))<1e-7,n+'/'+c.key+' step');}}
    const result=await L.run(lab,params);assert.ok(result.frames.length>0);assert.ok(result.frames.every(f=>f.title&&f.explain));
   }
  });
 }
});
test('別経路の認可漏れを塞いでも、所有者の利用と他人の申請承認を残す',()=>{
 const before=S.threatStart();assert.equal(S.threatView(before).find(x=>x.actor==='guest').actual,true);
 const fixed=S.threat(before,{kind:'toggle',key:'legacy'});assert.ok(S.threatView(fixed).every(x=>x.correct));assert.equal(before.checks.legacy,false);
 atomic(S.threat,before,{kind:'toggle',key:'__proto__'},/選んで/);
});
test('AESをNIST公開ベクトルと照合し、全処理の選択が有効な前後を返す',()=>{
 const initial=S.aesStart();assert.equal(S.aesView(initial).cipher,'69c4e0d86a7b0430d8cdb78070b4c55a');
 assert.equal(C.hex(C.aes128(new Uint8Array(16),new Uint8Array(16)).bytes),'66e94bd4ef8a2c3b884cfa59ca342b2e');
 for(let step=0;step<=40;step++)for(let cell=0;cell<16;cell++){
  const view=S.aesView({...initial,step,cell});assert.ok(view.sources.every(i=>i>=0&&i<16));assert.ok(view.explanation.length>10);
  if(view.step.operation==='ShiftRows')assert.equal(view.step.state[cell],view.previous.state[view.sources[0]]);
  if(view.step.operation==='AddRoundKey')assert.equal(view.step.state[cell],view.previous.state[cell]^view.step.key[cell]);
  if(view.step.operation==='MixColumns')assert.equal(view.step.state[cell],view.terms.reduce((a,x)=>a^parseInt(x[1],16),0));
 }
});
test('AESの行移動はrow1 column0へcolumn1から値を移す',()=>{
 const s=S.aesStart(),trace=S.aesView(s).trace,index=trace.findIndex(t=>t.operation==='ShiftRows');
 const view=S.aesView({...s,step:index,cell:1});assert.deepEqual(view.sources,[5]);
 const flipped=S.aes(s,{kind:'flip'});assert.equal(flipped.key,s.key);assert.notEqual(flipped.plain,s.plain);atomic(S.aes,s,{kind:'cell',value:16},/byte番号/);
});
test('少ない共有片に残る全多項式と秘密の分布を独立した件数で検査',()=>{
 let s=S.shareStart();assert.deepEqual(S.shareView(s).counts,Array(17).fill(289));
 s=S.share(s,{kind:'toggle',x:2});assert.deepEqual(S.shareView(s).counts,Array(17).fill(17));
 s=S.share(s,{kind:'toggle',x:5});assert.deepEqual(S.shareView(s).counts,Array(17).fill(1));
 s=S.share(s,{kind:'toggle',x:1});assert.deepEqual(S.shareView(s).candidates,[7]);assert.equal(S.shareView(s).polynomials,1);
});
test('どの3片でも復元し、片の順番や秘密を変えても受信側の候補は正しい',()=>{
 for(const secret of [0,7,16])for(let i=1;i<=3;i++)for(let j=i+1;j<=4;j++)for(let k=j+1;k<=5;k++){
  const s={...S.shareStart(),secret,selected:[k,i,j]};assert.deepEqual(S.shareView(s).candidates,[secret]);
 }
 const s=S.shareStart();atomic(S.share,s,{kind:'toggle',x:0},/共有片/);
});
test('本人確認と対象の認可、承認の役割と職務分離を別々に満たす',()=>{
 let s=S.policyStart();assert.equal(S.policyView(s).allowed,true);
 s=S.policy(s,{kind:'set',actor:'aki',object:'haru',operation:'read',hour:12,mode:'owner'});assert.equal(S.policyView(s).allowed,false);
 s=S.policy(s,{kind:'set',actor:'haru',object:'aki',operation:'approve',hour:9,mode:'approval'});assert.equal(S.policyView(s).allowed,true);
 assert.equal(S.policyView({...s,object:'haru'}).allowed,false);assert.equal(S.policyView({...s,hour:18}).allowed,false);assert.equal(S.policyView({...s,actor:'guest'}).allowed,false);
});
test('書込み前の拒否と破損後の検出、NXを区別し状態を保持する',()=>{
 let s=S.memoryStart();const unchanged=clone(s.memory);s=S.memory(s,{kind:'write',count:6});assert.deepEqual(s.memory,unchanged);
 s=S.memory(s,{kind:'toggle',key:'bounds'});s=S.memory(s,{kind:'write',count:6});assert.deepEqual(s.memory,[65,65,65,65,65,65,64,64]);
 s=S.memory(s,{kind:'return'});assert.match(s.last,/不一致/);s=S.memory(s,{kind:'execute'});assert.match(s.last,/NX/);assert.equal(s.memory[4],65);
 atomic(S.memory,s,{kind:'write',count:9},/byte数/);
});
test('番地の再利用でも古いハンドルの世代は戻らない',()=>{
 let s=S.memoryStart();s=S.memory(s,{kind:'free'});s=S.memory(s,{kind:'allocate'});s=S.memory(s,{kind:'read'});assert.match(s.last,/世代/);
 s=S.memory(s,{kind:'toggle',key:'bounds'});s=S.memory(s,{kind:'read'});assert.match(s.last,/9/);
});
test('JWTのデコードは受理ではなく、MACを実際に検証する',async()=>{
 let s=await S.jwt(S.jwtStart(),{kind:'issue'});const original=s.token;s=await S.jwt(s,{kind:'decode'});assert.equal(s.claims.role,'reader');assert.equal(s.accepted,null);
 s=await S.jwt(s,{kind:'verify'});assert.equal(s.accepted,true);s=await S.jwt(s,{kind:'tamper'});assert.equal(s.claims.role,'admin');assert.equal(s.accepted,null);assert.notEqual(s.token,original);
 s=await S.jwt(s,{kind:'verify'});assert.equal(s.accepted,false);assert.equal(s.checks[1][1],false);
});
test('正しいMACでもaudienceと有効期間の境界で拒否する',async()=>{
 const issued=await S.jwt(S.jwtStart(),{kind:'issue'});
 let s=await S.jwt(issued,{kind:'context',now:599,audience:'classroom-api'});s=await S.jwt(s,{kind:'verify'});assert.equal(s.accepted,true);
 s=await S.jwt(s,{kind:'context',now:600,audience:'classroom-api'});s=await S.jwt(s,{kind:'verify'});assert.equal(s.accepted,false);assert.equal(s.checks[1][1],true);
 s=await S.jwt(issued,{kind:'context',now:100,audience:'other-api'});s=await S.jwt(s,{kind:'verify'});assert.equal(s.accepted,false);assert.equal(s.token,issued.token);
});
test('JWTで許可していない算法と壊れたJSONは受理しない',async()=>{
 const issued=await S.jwt(S.jwtStart(),{kind:'issue'}),parts=issued.token.split('.');parts[0]=C.b64(C.utf8(JSON.stringify({alg:'none'})));
 const s=await S.jwt({...issued,token:parts.join('.')},{kind:'verify'});assert.equal(s.accepted,false);assert.equal(s.checks[0][1],false);
 await asyncAtomic(S.jwt,issued,{kind:'context',now:NaN,audience:'classroom-api'},/整数/);
 await asyncAtomic(S.jwt,{...issued,token:'eA.eA.eA'},{kind:'verify'},/JSON/);
});
test('refresh応答を失ってもサーバーの使用済み化は戻らない',()=>{
 let s=S.refreshStart();s=S.refresh(s,{kind:'use',token:'R0'});assert.equal(s.tokens.R0.used,true);assert.equal(s.client,'R0');assert.deepEqual(s.responses,['R1']);
 s=S.refresh(s,{kind:'lose'});s=S.refresh(s,{kind:'use',token:'R0'});assert.equal(s.revoked,true);
 s=S.refresh(s,{kind:'use',token:'R1'});assert.deepEqual(Object.keys(s.tokens),['R0','R1']);
});
test('正常なrefresh交換と、不明tokenの原子的拒否',()=>{
 let s=S.refreshStart();s=S.refresh(s,{kind:'use',token:'R0'});s=S.refresh(s,{kind:'deliver'});assert.equal(s.client,'R1');
 s=S.refresh(s,{kind:'use',token:'R1'});assert.equal(s.revoked,false);assert.ok(s.tokens.R2);atomic(S.refresh,s,{kind:'use',token:'__proto__'},/選んで/);
});
test('証拠の取得hashは上書きせず、空白の変更をSHA-256で検出',async()=>{
 let s=await S.evidence(S.evidenceStart(),{kind:'acquire'});const sealed=s.sealed,original=s.original;
 s=await S.evidence(s,{kind:'verify'});assert.equal(s.same,true);s=await S.evidence(s,{kind:'edit',text:s.copy+' '});assert.equal(s.same,null);
 s=await S.evidence(s,{kind:'verify'});assert.equal(s.same,false);assert.equal(s.sealed,sealed);assert.equal(s.original,original);
 await asyncAtomic(S.evidence,s,{kind:'handover'},/拒否/);await asyncAtomic(S.evidence,s,{kind:'acquire'},/上書き/);
});
test('証拠の受渡しは前のhashと同じ証拠hashを結び付ける',async()=>{
 let s=await S.evidence(S.evidenceStart(),{kind:'acquire'});for(let i=0;i<3;i++)s=await S.evidence(s,{kind:'handover'});
 assert.equal(s.handovers[0].previous,s.sealed);assert.equal(s.handovers[2].previous,s.handovers[1].hash);assert.ok(s.handovers.every(r=>r.evidence===s.sealed));
});
test('公開教材は外部通信・永続記録・任意JavaScriptの実行を追加しない',async()=>{
 for(const file of ['models','auth','widgets','auth-widgets','lessons']){
  const source=await readFile(new URL('../src/experiences-security-'+file+'.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|eval)\s*\(|new\s+Function\b|\b(?:localStorage|sessionStorage|indexedDB)\b/);
 }
});
