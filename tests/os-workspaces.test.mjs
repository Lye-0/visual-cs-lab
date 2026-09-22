import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {modelModules,browserModules,styles} from '../scripts/modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
const L=globalThis.CSL,X=L.experiences,M=X.os,K=L.curriculum;
const clone=v=>JSON.parse(JSON.stringify(v));
const sameAfterFailure=(fn,state,action,pattern)=>{const before=clone(state);assert.throws(()=>fn(state,action),pattern);assert.deepEqual(state,before);};

test('21単元と新しい作業台が実際の読み込み一覧へ接続されている',()=>{
 for(const name of ['experiences-os-models','experiences-os-state','experiences-storage-models','experiences-relations-models','experiences-os-data'])assert.ok(modelModules.includes(name),name);
 for(const name of ['experiences-os-widgets','experiences-storage-widgets','experiences-relations-widgets'])assert.ok(browserModules.includes(name),name);
 assert.ok(styles.includes('experiences-os'));
 for(let n=74;n<=94;n++)assert.ok(X.find('gap-'+String(n).padStart(3,'0')),'gap-'+n);
 const expected={74:'process-space',76:'pipe-fds',77:'condition-wait',78:'banker-order',79:'file-references',82:'causal-clocks',84:'raft-console',85:'rpc-delivery',88:'schema-rows',89:'normalization-rows',90:'sql-desk',92:'mvcc-versions',93:'wal-recovery'};
 for(const [n,kind]of Object.entries(expected))assert.ok(X.find('gap-'+n.padStart(3,'0')).chapters.flatMap(c=>c.activities).some(a=>a.kind===kind),kind);
});
test('今回の全章と比較例が実モデルの入力契約を満たす',async t=>{
 for(let n=74;n<=94;n++){
  const id='gap-'+String(n).padStart(3,'0'),definition=X.find(id);
  for(const chapter of definition.chapters){assert.ok(chapter.paragraphs.join('').length>=30,id+'/'+chapter.id);
   for(const [i,a]of chapter.activities.entries())if(['inspect','timeline','ledger','editor','compare'].includes(a.kind))await t.test(id+'/'+chapter.id+'/'+i,async()=>{
    const lab=L.labs.find(l=>l.id===(a.model||id));
    for(const example of a.kind==='compare'?a.examples:[{patch:{}},...(a.examples||[])]){
     const p=X.modelParams(lab.id,{...a.patch,...example.patch});
     for(const c of lab.controls)if(c.type==='select')assert.ok(c.options.some(o=>o.value===p[c.key]),id+'/'+c.key+':'+p[c.key]);
     const result=await L.run(lab,p);assert.ok(result.frames.length);assert.ok(result.frames.every(f=>f.title&&f.explain));
    }
   });
  }
 }
});
test('forkは別のメモリ、threadは同じメモリを参照する',()=>{
 for(const mode of ['fork','thread']){const original=M.processStart();let s=M.process(original,{kind:'spawn',mode});assert.equal(original.tasks.C,undefined);s=M.process(s,{kind:'switch',actor:'C'});s=M.process(s,{kind:'write',value:9});s=M.process(s,{kind:'switch',actor:'P'});s=M.process(s,{kind:'read'});assert.equal(s.tasks.P.lastRead,mode==='fork'?5:9);assert.equal(s.tasks.C.pid,mode==='fork'?2:1);}
});
test('fork前の変更とexec後の共有空間を説明文にも反映する',()=>{
 let s=M.processStart();s=M.process(s,{kind:'write',value:17});s=M.process(s,{kind:'spawn',mode:'fork'});assert.equal(s.memory[s.tasks.C.mem].x,17);assert.match(s.log.at(-1),/17/);
 s=M.processStart();s=M.process(s,{kind:'exec'});s=M.process(s,{kind:'spawn',mode:'thread'});assert.equal(s.tasks.C.mem,'M2');assert.match(s.log.at(-1),/M2/);
});
test('execはPIDを保ち、同じプロセスの他スレッドを終了させる',()=>{
 let s=M.process(M.processStart(),{kind:'spawn',mode:'thread'});s=M.process(s,{kind:'switch',actor:'C'});s=M.process(s,{kind:'exec'});assert.equal(s.tasks.C.pid,1);assert.equal(s.tasks.P.status,'ended');assert.equal(s.tasks.C.pc,0);assert.equal(s.memory[s.tasks.C.mem].x,0);
 sameAfterFailure(M.process,s,{kind:'switch',actor:'P'},/終了/);
});
test('CPUを持たない主体の書込みと値範囲外を拒否する',()=>{
 const s=M.process(M.processStart(),{kind:'spawn',mode:'fork'});sameAfterFailure(M.process,s,{kind:'write',actor:'C',value:8},/切り替え/);sameAfterFailure(M.process,s,{kind:'write',value:100},/整数/);
});
test('空のreadを待たせ、writeを分割して受け取る',()=>{
 let s=M.pipeStart();s=M.pipe(s,{kind:'read',count:2});assert.deepEqual(s.pending,{count:2});s=M.pipe(s,{kind:'write',text:'abcd'});assert.deepEqual(s.received,['ab']);assert.deepEqual(s.buffer,['c','d']);assert.equal(s.pending,null);s=M.pipe(s,{kind:'read',count:4});assert.deepEqual(s.received,['ab','cd']);
});
test('複製した書き口が残る間はEOFを返さず、最後のcloseで再開する',()=>{
 let s=M.pipe(M.pipeStart(),{kind:'dup'});s=M.pipe(s,{kind:'close',fd:4});assert.equal(M.pipeWriters(s),1);s=M.pipe(s,{kind:'read',count:4});assert.ok(s.pending);s=M.pipe(s,{kind:'close',fd:5});assert.equal(s.pending,null);assert.deepEqual(s.received,['EOF']);
});
test('全書き手を閉じても、残るbyteを先に読んでからEOF',()=>{
 let s=M.pipe(M.pipeStart(),{kind:'write',text:'ab'});s=M.pipe(s,{kind:'close',fd:4});s=M.pipe(s,{kind:'read',count:4});assert.deepEqual(s.received,['ab']);s=M.pipe(s,{kind:'read',count:1});assert.deepEqual(s.received,['ab','EOF']);
});
test('満杯write・二重close・読み手なしのwriteは元を壊さない',()=>{
 let s=M.pipe(M.pipeStart(),{kind:'write',text:'abcd'});sameAfterFailure(M.pipe,s,{kind:'write',text:'a'},/容量/);s=M.pipe(s,{kind:'close',actor:'P2',fd:3});sameAfterFailure(M.pipe,s,{kind:'write',text:'a'},/EPIPE/);sameAfterFailure(M.pipe,s,{kind:'close',actor:'P2',fd:3},/閉じ/);
});
const stolen=guard=>{let s=M.conditionStart(guard,true);for(const a of [{kind:'get',actor:'C1'},{kind:'put',value:7},{kind:'get',actor:'C2'},{kind:'resume',actor:'C1'}])s=M.condition(s,a);return s;};
test('起床と取出しは別：whileは再待機し、ifは不正な取出しになる',()=>{let s=stolen('while');assert.deepEqual(s.consumers.C2.received,[7]);assert.equal(s.invalid,0);assert.equal(s.consumers.C1.status,'waiting');s=stolen('if');assert.equal(s.invalid,1);assert.deepEqual(s.consumers.C1.received,[]);});
test('waitがmutexを解放しない反例では生産者も進めない',()=>{const s=M.condition(M.conditionStart('while',false),{kind:'get',actor:'C1'});assert.equal(s.owner,'C1');sameAfterFailure(M.condition,s,{kind:'put',value:7},/mutex/);});
test('データを変えない起床でもwhileは安全に条件を再確認する',()=>{let s=M.condition(M.conditionStart(),{kind:'get',actor:'C1'});sameAfterFailure(M.condition,s,{kind:'resume',actor:'C1'},/起床/);s=M.condition(s,{kind:'wake',actor:'C1'});s=M.condition(s,{kind:'resume',actor:'C1'});assert.equal(s.invalid,0);assert.equal(s.consumers.C1.status,'waiting');});
test('Lamportの大小があっても、別機器のイベントは並行になり得る',()=>{
 let s=M.clockStart();s=M.clock(s,{kind:'local',actor:'C'});s=M.clock(s,{kind:'local',actor:'A'});s=M.clock(s,{kind:'local',actor:'A'});const r=M.causality(s,1,3);assert.deepEqual(r,{relation:'concurrent',vector:'concurrent',scalar:'<'});
});
test('送信時計はコピーで、受信後の因果順序とベクトルが一致する',()=>{
 let s=M.clock(M.clockStart(),{kind:'send',actor:'A',to:'B'});s=M.clock(s,{kind:'local',actor:'A'});assert.deepEqual(s.messages[0].vector,[1,0,0]);s=M.clock(s,{kind:'receive',actor:'B',id:'m1'});assert.deepEqual(s.nodes.B.vector,[1,1,0]);assert.equal(M.causality(s,1,3).relation,'before');assert.equal(M.causality(s,2,3).relation,'concurrent');
 for(const a of s.events)for(const b of s.events){const r=M.causality(s,a.id,b.id);assert.equal(r.relation,r.vector);}
 sameAfterFailure(M.clock,s,{kind:'receive',actor:'B',id:'m1'},/未受信/);
});
const retry=deduplicate=>{let s=M.rpcStart(deduplicate);for(const a of [{kind:'send'},{kind:'deliver-request'},{kind:'drop-response'},{kind:'timeout'},{kind:'send'},{kind:'deliver-request'},{kind:'deliver-response'}])s=M.rpc(s,a);return s;};
test('応答だけ失った再試行は、同じIDの記録があれば注文を増やさない',()=>{assert.equal(retry(true).orders.length,1);assert.equal(retry(false).orders.length,2);assert.match(retry(true).client,/O1/);});
test('timeoutはサーバーの処理を取り消さず、要求喪失と応答喪失を区別する',()=>{
 let s=M.rpc(M.rpcStart(),{kind:'send'});s=M.rpc(s,{kind:'deliver-request'});s=M.rpc(s,{kind:'timeout'});assert.equal(s.orders.length,1);assert.match(s.client,/結果不明/);
 s=M.rpc(M.rpcStart(),{kind:'send'});s=M.rpc(s,{kind:'drop-request'});s=M.rpc(s,{kind:'timeout'});assert.equal(s.orders.length,0);assert.match(s.client,/結果不明/);
});
test('同じIDの違う数量は拒否、別IDの新要求は追加',()=>{
 let s=retry(true);s=M.rpc(s,{kind:'send',key:'order-1',quantity:2});s=M.rpc(s,{kind:'deliver-request'});assert.equal(s.orders.length,1);assert.equal(s.responses.at(-1).result.status,409);s=M.rpc(s,{kind:'send',key:'order-2',quantity:2});s=M.rpc(s,{kind:'deliver-request'});assert.equal(s.orders.length,2);
});
function repeatedRead(isolation){let s=M.mvccStart(isolation);for(const a of [{kind:'begin',actor:'A'},{kind:'read',actor:'A'},{kind:'begin',actor:'B'},{kind:'write',actor:'B',value:200},{kind:'commit',actor:'B'},{kind:'read',actor:'A'}])s=M.mvcc(s,a);return s;}
test('RCと固定スナップショットのreadを既知の二つの値で比較',()=>{assert.deepEqual(repeatedRead('rc').tx.A.reads.map(r=>r.value),[100,200]);assert.deepEqual(repeatedRead('rr').tx.A.reads.map(r=>r.value),[100,100]);});
test('固定版をBEGINでなく最初のデータ操作で取得する',()=>{
 let s=M.mvccStart('rr');for(const a of [{kind:'begin',actor:'A'},{kind:'begin',actor:'B'},{kind:'write',actor:'B',value:200},{kind:'commit',actor:'B'},{kind:'read',actor:'A'}])s=M.mvcc(s,a);assert.equal(s.tx.A.reads[0].value,200);assert.equal(s.tx.A.snapshot,1);
});
test('自分のdraftだけが見え、rollbackで他方の確定を取り消さない',()=>{
 let s=M.mvccStart('rc');for(const a of [{kind:'begin',actor:'A'},{kind:'begin',actor:'B'},{kind:'write',actor:'A',value:150},{kind:'read',actor:'A'},{kind:'read',actor:'B'},{kind:'rollback',actor:'A'}])s=M.mvcc(s,a);assert.equal(s.tx.A.reads[0].value,150);assert.equal(s.tx.B.reads[0].value,100);assert.equal(s.versions.at(-1).value,100);
});
test('同じ行の固定版後の競合をcommit時に中止する',()=>{let s=repeatedRead('rr');s=M.mvcc(s,{kind:'write',actor:'A',value:300});s=M.mvcc(s,{kind:'commit',actor:'A'});assert.equal(s.tx.A.status,'aborted');assert.equal(s.versions.at(-1).value,200);});
test('open済みfdは名前の削除後も内容を読み、最後のcloseで解放する',()=>{
 let s=M.filesStart();s=M.files(s,{kind:'open',path:'/doc'});s=M.files(s,{kind:'unlink',path:'/doc'});assert.equal(Object.keys(s.entries).length,0);assert.equal(s.inodes[1].opens,1);s=M.files(s,{kind:'read',fd:3});assert.equal(s.lastRead.text,'hello');s=M.files(s,{kind:'close',fd:3});assert.equal(Object.keys(s.inodes).length,0);
});
test('hardlinkとsymlinkは異なる参照を持ち、壊れたsymlinkを拒否する',()=>{
 let s=M.filesStart();s=M.files(s,{kind:'link',from:'/doc',target:'/copy'});s=M.files(s,{kind:'symlink',from:'/copy',target:'/shortcut'});assert.equal(s.inodes[1].links,2);s=M.files(s,{kind:'unlink',path:'/copy'});assert.ok(s.entries['/shortcut']);sameAfterFailure(M.files,s,{kind:'open',path:'/shortcut'},/ENOENT/);assert.equal(M.resolveFile(s,'/doc'),1);
});
test('symlink循環と重複名の失敗で参照数を変えない',()=>{
 let s=M.filesStart();s=M.files(s,{kind:'symlink',from:'/two',target:'/one'});s=M.files(s,{kind:'symlink',from:'/one',target:'/two'});sameAfterFailure(M.files,s,{kind:'open',path:'/one'},/ELOOP/);sameAfterFailure(M.files,s,{kind:'link',from:'/doc',target:'/doc'},/EEXIST/);
});
test('履修の複合キー、両FK、RESTRICT削除を個別に検査',()=>{
 let s=M.schemaStart();sameAfterFailure(M.schema,s,{kind:'enrol',student:1,course:10},/主キー/);sameAfterFailure(M.schema,s,{kind:'enrol',student:3,course:20},/外部キー/);sameAfterFailure(M.schema,s,{kind:'enrol',student:1,course:30},/外部キー/);sameAfterFailure(M.schema,s,{kind:'delete-student',student:1},/参照/);
 s=M.schema(s,{kind:'student',student:3,name:'Sora'});s=M.schema(s,{kind:'enrol',student:3,course:20});s=M.schema(s,{kind:'unenrol',student:3,course:20});s=M.schema(s,{kind:'delete-student',student:3});assert.equal(s.students.length,2);
});
test('安全系列は選ぶ順序が複数あり、資源を成分ごとに比較する',()=>{
 for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]){let s=M.bankStart();for(const process of order)s=M.bank(s,{process});assert.deepEqual(s.sequence,order);assert.deepEqual(s.work,[3,3]);}
 const s=M.bankStart([3,0]);for(const process of [0,1,2])sameAfterFailure(M.bank,s,{process},/資源2/);
});
test('矛盾した名前は分解で自動修正せず、修復後は結合で同じ情報を戻す',()=>{
 let s=M.redundancyStart();const original=clone(s.rows);s=M.redundancy(s,{kind:'rename',name:'New',all:false});sameAfterFailure(M.redundancy,s,{kind:'split'},/矛盾/);s=M.redundancy(s,{kind:'rename',name:'New',all:true});s=M.redundancy(s,{kind:'split'});assert.deepEqual(M.joinRedundancy(s).map(r=>r.name),['New','New','Haru']);s=M.redundancy(s,{kind:'rename',name:'Another'});assert.deepEqual(M.joinRedundancy(s).map(r=>r.name),['Another','Another','Haru']);assert.deepEqual(M.joinRedundancy(M.redundancy(M.redundancyStart(),{kind:'split'})),original);
});
test('確定xはREDO、未確定yはUNDOする',()=>{
 let s=M.walStart();for(const a of [{kind:'set',tx:'T1',key:'x',value:7},{kind:'commit',tx:'T1'},{kind:'set',tx:'T2',key:'y',value:9},{kind:'flush',key:'y'},{kind:'crash'}])s=M.wal(s,a);assert.equal(s.memory,null);assert.equal(s.disk.x.value,1);assert.equal(s.disk.y.value,9);s=M.wal(s,{kind:'redo'});assert.equal(s.disk.x.value,7);s=M.wal(s,{kind:'undo'});assert.equal(s.disk.y.value,2);assert.equal(s.disk.x.value,7);
});
test('WAL違反で消えたbefore値を復旧処理へ持ち込まない',()=>{
 let s=M.walStart(false);for(const a of [{kind:'set',tx:'T2',key:'y',value:9},{kind:'flush',key:'y'},{kind:'crash'},{kind:'redo'},{kind:'undo'}])s=M.wal(s,a);assert.equal(s.records.length,0);assert.equal(s.memory,null);assert.equal(s.disk.y.value,9);
});
test('write lock・終了TX再利用・故障後の通常操作を拒否する',()=>{
 let s=M.wal(M.walStart(),{kind:'set',tx:'T1',key:'x',value:7});sameAfterFailure(M.wal,s,{kind:'set',tx:'T2',key:'x',value:9},/別のTX/);s=M.wal(s,{kind:'commit',tx:'T1'});sameAfterFailure(M.wal,s,{kind:'set',tx:'T1',key:'y',value:8},/確定済み/);s=M.wal(s,{kind:'crash'});sameAfterFailure(M.wal,s,{kind:'set',tx:'T2',key:'x',value:8},/故障後/);
});
test('Raftの受理・一台への複製・leaderの確定・通知を区別する',()=>{
 const run=commands=>K.raftRun(commands.join('\n'),3),base=['elect A','put A 7'];let r=run([...base,'commit A']);assert.equal(r.nodes.A.commit,0);r=run([...base,'replicate A B','commit A']);assert.equal(r.nodes.A.commit,1);assert.equal(r.nodes.B.commit,0);r=run([...base,'replicate A B','commit A','replicate A B']);assert.equal(r.nodes.B.commit,1);assert.equal(r.nodes.C.log.length,0);
});
test('SQL作業台の例が行・集約・NULL・更新を実際に計算する',()=>{
 const data=JSON.parse(L.labs.find(l=>l.id==='gap-090').defaults.data);
 assert.deepEqual(K.sql.run('SELECT name FROM students WHERE score IS NULL;',data).outputs[0].rows,[['Ren']]);
 const r=K.sql.run('SELECT dept, COUNT(*) AS rows, COUNT(score) AS known FROM students GROUP BY dept ORDER BY dept;',data);assert.deepEqual(r.outputs[0].rows,[['ai',2,1],['cg',1,1],['net',2,2]]);
 const changed=K.sql.run('UPDATE students SET score = 100 WHERE id = 1; SELECT score FROM students WHERE id = 1;',data);assert.equal(changed.data.students[0].score,100);assert.equal(data.students[0].score,80);assert.deepEqual(changed.outputs.at(-1).rows,[[100]]);
 const before=clone(data);assert.throws(()=>K.sql.run('UPDATE students SET score = 100 WHERE id = 1; SELECT missing FROM students;',data));assert.deepEqual(data,before);
});
test('新しい直接操作は学習履歴の保存や任意JavaScript実行を追加しない',async()=>{
 for(const file of ['os-models','os-state','storage-models','relations-models','os-widgets','storage-widgets','relations-widgets','os-data']){const source=await readFile(new URL('../src/experiences-'+file+'.js',import.meta.url),'utf8');assert.doesNotMatch(source,/\b(?:localStorage|sessionStorage)\s*\.|\beval\s*\(|new\s+Function\s*\(/,file);}
});
