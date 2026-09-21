import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {modelModules} from '../scripts/modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
await import('../src/experiences-core.js');
const authorFiles=['foundations','systems','network','security','media-practice','math','theory','code','hardware','os-data','advanced-network','advanced-security','ai-media','engineering'];
const present=new Set(await readdir(new URL('../src/',import.meta.url)));
for(const name of authorFiles)if(present.has('experiences-'+name+'.js'))await import('../src/experiences-'+name+'.js');
const L=globalThis.CSL,X=L.experiences;
test('全314単元に明示的に執筆した個別教材があり、欠落・重複がない',()=>{
 assert.equal(X.lessons.size,314);
 assert.deepEqual([...X.lessons.keys()].sort(),L.labs.map(l=>l.id).sort());
 for(const [id,def]of X.lessons){assert.ok(def.lead.length>=15,id);assert.ok(def.chapters.length,id);for(const chapter of def.chapters){assert.ok(chapter.question.length>=8,id);assert.ok(chapter.paragraphs.join('').length>=30,id);assert.ok(chapter.activities.length,id);}}
});
test('個別教材は同じ4段階や一種類のプレーヤーだけに揃えない',()=>{
 const kinds=X.modes();for(const kind of ['vectors','rowlab','ode','bits','utf8','float','entropy','conditional','sets','regression','container','objects','race','switch','tcp','diagnose','derivation','cases','compare','inspect','editor','timeline','ledger'])assert.ok(kinds.includes(kind),kind);
 assert.ok([...X.lessons.values()].some(l=>l.chapters.length>=4));
 assert.ok([...X.lessons.values()].some(l=>l.chapters.length===1));
});
test('全ての執筆された章と比較例が実際のモデルで計算できる',async t=>{
 for(const [id,def]of X.lessons)for(const ch of def.chapters)for(const [i,a]of ch.activities.entries()){
  if(!['inspect','ledger','editor','timeline','compare'].includes(a.kind))continue;
  await t.test(id+'/'+ch.id+'/'+i,async()=>{
   const lab=L.labs.find(l=>l.id===(a.model||id)),examples=a.kind==='compare'?a.examples:[{patch:{}},...(a.examples||[])];
   for(const example of examples){const params=X.modelParams(lab.id,{...a.patch,...example.patch});const result=await L.run(lab,params);assert.ok(result.frames.length);assert.ok(result.frames.every(f=>f.title&&f.explain));}
  });
 }
});
test('基底の独立性・到達性・射影を独立した期待値で検査',()=>{
 assert.deepEqual(X.models.linear([1,0],[0,1],[2,3]).coefficients,[2,3]);
 assert.equal(X.models.linear([1,0],[2,0],[2,3]).reachable,false);
 assert.equal(X.models.linear([1,0],[2,0],[3,0]).reachable,true);
 assert.equal(X.models.linear([0,0],[0,0],[0,0]).rank,0);
 assert.equal(X.models.linear([0,0],[0,0],[1,0]).reachable,false);
 const r=X.models.linear([1,1],[1,0],[0,0]);assert.deepEqual(r.projection,[.5,.5]);assert.deepEqual(r.perpendicular,[.5,-.5]);
});
test('行操作が元に戻り、解を保ち、0倍などを拒否する',()=>{
 const original=[[2,1,5],[1,-1,1]],r=X.models.rowOperation(original,{kind:'add',row:0,other:1,factor:1});assert.deepEqual(r,[[3,0,6],[1,-1,1]]);assert.deepEqual(original,[[2,1,5],[1,-1,1]]);
 assert.deepEqual(X.models.rowOperation(r,{kind:'add',row:0,other:1,factor:-1}),original);
 assert.throws(()=>X.models.rowOperation(original,{kind:'scale',row:0,factor:0}),/0倍/);
 assert.throws(()=>X.models.rowOperation(original,{kind:'add',row:0,other:0,factor:1}),/別の行/);
 for(const op of [{kind:'swap',row:0,other:1},{kind:'scale',row:0,factor:2},{kind:'add',row:1,other:0,factor:-.5}])for(const row of X.models.rowOperation(original,op))assert.ok(Math.abs(row[0]*2+row[1]-row[2])<1e-9);
});
test('ODEのEuler一歩とRK4の重み',()=>{
 const r=X.models.odeStep(2,1,.25);assert.equal(r.euler,1.5);assert.ok(Math.abs(r.rk4-2*Math.exp(-.25))<.00002);assert.equal(X.models.odeStep(2,0,.25).rk4,2);
});
test('スタックとキューは同じ操作から異なる順序を生成',()=>{
 for(const kind of ['stack','queue']){let s={items:[],output:[],history:[]};s=X.models.container(s,'put','7',kind);s=X.models.container(s,'put','3',kind);s=X.models.container(s,'take',null,kind);assert.equal(s.output[0],kind==='stack'?'3':'7');s=X.models.container(s,'take',null,kind);s=X.models.container(s,'take',null,kind);assert.equal(s.items.length,0);assert.equal(s.history.at(-1).action,'空なので取り出せない');}
});
test('競合を手動の順番で再現し、ロックは読取り前から守る',()=>{
 const fresh=lock=>({shared:100,lock,owner:null,actors:{A:{pc:0,local:null,delta:10},B:{pc:0,local:null,delta:20}},history:[]});
 let s=fresh(false);for(const a of ['A','B','A','B','A','B'])s=X.models.race(s,a);assert.equal(s.shared,120);
 s=fresh(true);s=X.models.race(s,'A');s=X.models.race(s,'B');assert.equal(s.actors.B.local,null);for(const a of ['A','A','B','B','B'])s=X.models.race(s,a);assert.equal(s.shared,130);assert.equal(s.owner,null);
});
test('スイッチは送信元を学習してから宛先の転送先を選ぶ',()=>{
 let s=X.models.switchSend({table:{},history:[]},'A','B');assert.deepEqual(s.table,{A:1});assert.deepEqual(s.history[0].targets,[2,3]);s=X.models.switchSend(s,'B','A');assert.deepEqual(s.table,{A:1,B:2});assert.deepEqual(s.history[1].targets,[1]);assert.throws(()=>X.models.switchSend(s,'A','A'));
});
test('新しい画面は学習の永続保存や未信頼コードのevalを追加しない',async()=>{
 for(const file of present){if(!/^experiences-.*\.js$/.test(file))continue;const source=await readFile(new URL('../src/'+file,import.meta.url),'utf8');assert.doesNotMatch(source,/\b(?:localStorage|sessionStorage)\s*\.|\beval\s*\(|new\s+Function\s*\(/,file);}
});
