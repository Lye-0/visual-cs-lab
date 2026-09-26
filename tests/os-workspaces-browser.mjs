import {fixtureDefinitions,fixtureInventory} from './lesson-fixtures.mjs';
// Read-only browser verification of the committed static files.
// This slice verifies GAP-074..094, not completion of the remaining 61 units.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
const name=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[name];if(!engine)throw Error('Invalid BROWSER');
const report={sourceCommit:process.env.SOURCE_COMMIT||process.env.GITHUB_SHA||'local',browser:name,scope:'GAP-074..094',cases:[],errors:[]};
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4197'},stdio:['ignore','ignore','pipe']});let browser,serverLog='';
server.stderr.on('data',d=>serverLog+=d);server.on('error',e=>serverLog+=e.message);
const base='http://127.0.0.1:4197/';
const ids=Array.from({length:21},(_,i)=>'gap-'+String(i+74).padStart(3,'0'));
async function check(title,action){try{await action();report.cases.push({title,passed:true});}catch(e){report.cases.push({title,passed:false,error:String(e.stack||e)});console.error('FAIL '+title+'\n'+e.stack);}}
async function open(page,id,chapter=''){
 const url=base+'#/lab/'+id+(chapter?'?chapter='+chapter:'');
 // Navigating to the same fragment need not reload a document. Independent
 // trials explicitly reload it, rather than silently reusing the previous state.
 if(page.url()===url)await page.reload();else await page.goto(url);
 await page.waitForFunction(({id,chapter})=>{const c=globalThis.CSL?.app?.current;return c?.experience&&c.lab.id===id&&(!chapter||c.chapter===chapter)&&!document.querySelector('.experience [aria-busy="true"]');},{id,chapter});
 assert.deepEqual(await page.evaluate(()=>CSL.app.current.errors),[]);
}
const os=(page,id)=>page.locator('[data-os-id="'+id+'"]');
const store=(page,id)=>page.locator('[data-store-action="'+id+'"]');
const osState=page=>page.locator('[data-os-state]').evaluate(el=>JSON.parse(el.dataset.osState));
const storeState=page=>page.locator('[data-store-state]').evaluate(el=>JSON.parse(el.dataset.storeState));
async function shot(page,label,size){if(size==='desktop'){await mkdir('review-output/os-screenshots',{recursive:true});await page.screenshot({path:'review-output/os-screenshots/'+name+'-'+label+'.png',fullPage:true});}}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw Error(serverLog||'server unavailable');await sleep(100);}
 browser=await engine.launch({headless:true});report.version=browser.version();
 for(const [size,viewport]of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}],['narrow',{width:320,height:760}]]){
  const context=await browser.newContext({viewport,hasTouch:size!=='desktop',reducedMotion:'reduce'});
  await context.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.effectiveDirective+':'+e.blockedURI));});
  const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push({size,message:e.message}));
  const failures=[];page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
  await open(page,'gap-074');
  const definitions=fixtureDefinitions(ids);
  await check(size+': 21 units exist and every configured widget is available',async()=>{
   assert.equal(definitions.length,21);assert.ok(definitions.every(d=>d.chapters?.length));
   // Registration is checked on each loaded chapter below, not before demand.
  });
  for(const d of definitions)for(const c of d.chapters||[])await check(size+'/'+d.id+'/'+c.id+': full authored chapter loads, labels work and layout fits',async()=>{
   await open(page,d.id,c.id);assert.equal(await page.locator('[data-ex-kind]').count(),c.kinds.length);
   assert.deepEqual(await page.evaluate(kinds=>kinds.filter(k=>!CSL.experiences.widgets.has(k)),c.kinds),[]);
   assert.ok((await page.locator('.ex-chapter').textContent()).length>100);
   const invalid=await page.locator('.experience input[type="number"]').evaluateAll(els=>els.filter(e=>!e.checkValidity()).map(e=>e.name+':'+e.value));assert.deepEqual(invalid,[]);
   const unlabeled=await page.locator('.experience input,.experience select,.experience textarea').evaluateAll(els=>els.filter(e=>!e.labels?.length&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')).map(e=>e.outerHTML.slice(0,100)));assert.deepEqual(unlabeled,[]);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'document horizontal overflow');
   assert.deepEqual(await page.evaluate(()=>window.__csp),[]);assert.equal(await page.evaluate(()=>CSL.app.current.playing),false);
  });
  await check(size+': fork/thread edits follow the visible owner, exec keeps PID and keyboard remains usable',async()=>{
   for(const mode of ['fork','thread']){
    await open(page,'gap-074');await os(page,mode).click();await os(page,'switch-C').click();await os(page,'write').click();await os(page,'switch-P').click();await os(page,'read').focus();await page.keyboard.press(' ');
    const s=await osState(page);assert.equal(s.tasks.P.lastRead,mode==='fork'?5:9);assert.equal(await page.evaluate(()=>document.activeElement?.dataset.osId),'read');assert.equal(await page.evaluate(()=>CSL.app.current.playing),false);
   }
   await os(page,'exec').click();let s=await osState(page);assert.equal(s.tasks.P.pid,1);assert.equal(s.tasks.C.status,'ended');await os(page,'undo').click();s=await osState(page);assert.equal(s.tasks.C.status,'ready');await shot(page,'process-ownership',size);
  });
  await check(size+': pipe read blocks, consumes partial data and EOF waits for the last writer',async()=>{
   await open(page,'gap-076');await os(page,'dup').click();await os(page,'close-4').click();await os(page,'pipe-read').click();assert.ok((await osState(page)).pending);
   await os(page,'pipe-write').click();let s=await osState(page);assert.deepEqual(s.received,['ab']);assert.deepEqual(s.buffer,['c','d']);
   await os(page,'pipe-read').click();s=await osState(page);assert.deepEqual(s.received,['ab','cd']);await os(page,'pipe-read').click();assert.ok((await osState(page)).pending);
   await os(page,'close-5').click();s=await osState(page);assert.deepEqual(s.received,['ab','cd','EOF']);assert.equal(s.pending,null);await shot(page,'pipe-eof',size);
  });
  await check(size+': condition wake does not reserve data; while retries and if fails',async()=>{
   for(const guard of ['while','if']){
    await open(page,'gap-077');await os(page,'guard-'+guard).click();await os(page,'get-C1').click();await os(page,'put').click();assert.equal((await osState(page)).consumers.C1.status,'notified');
    await os(page,'get-C2').click();await os(page,'resume-C1').click();const s=await osState(page);assert.deepEqual(s.consumers.C2.received,[7]);assert.equal(s.invalid,guard==='if'?1:0);assert.equal(s.consumers.C1.status,guard==='if'?'ready':'waiting');
   }
   await os(page,'guard-hold').click();await os(page,'get-C1').click();const before=await osState(page);await os(page,'put').click();assert.deepEqual(await osState(page),before);assert.match(await page.locator('.ex-kind-condition-wait [data-ex-status]').textContent(),/mutex/);await shot(page,'condition-variable',size);
  });
  await check(size+': learner chooses a safe sequence and an invalid choice preserves allocation',async()=>{
   await open(page,'gap-078');await store(page,'stock-empty').click();const before=await storeState(page);await store(page,'finish:0').focus();await page.keyboard.press('Enter');assert.deepEqual(await storeState(page),before);assert.match(await page.locator('.ex-kind-banker-order [data-ex-status]').textContent(),/不足/);
   await store(page,'stock-enough').click();for(const i of [2,0,1])await store(page,'finish:'+i).click();const s=await storeState(page);assert.deepEqual(s.sequence,[2,0,1]);assert.deepEqual(s.work,[3,3]);await store(page,'undo').click();assert.deepEqual((await storeState(page)).sequence,[2,0]);
  });
  await check(size+': unlink does not remove an open file and close releases its final reference',async()=>{
   await open(page,'gap-079');await store(page,'open:/doc').click();await store(page,'unlink:/doc').click();await store(page,'read:3').click();let s=await storeState(page);assert.equal(s.lastRead.text,'hello');assert.equal(s.inodes[1].links,0);assert.equal(s.inodes[1].opens,1);await store(page,'close:3').click();assert.equal(Object.keys((await storeState(page)).inodes).length,0);await store(page,'undo').click();assert.ok((await storeState(page)).inodes[1]);await shot(page,'file-references',size);
  });
  await check(size+': a dangling symlink is explained without deleting the remaining file',async()=>{
   await open(page,'gap-079');await store(page,'new-link').click();const form=page.locator('[data-file-link]');await form.locator('[name="kind"]').selectOption('symlink');await form.locator('[name="from"]').fill('/copy');await form.locator('[name="target"]').fill('/shortcut');await store(page,'new-link').click();await store(page,'unlink:/copy').click();const before=await storeState(page);await store(page,'open:/shortcut').click();assert.deepEqual(await storeState(page),before);assert.match(await page.locator('.ex-kind-file-references [data-ex-status]').textContent(),/ENOENT/);
  });
  await check(size+': causal comparison distinguishes numeric order from a message path',async()=>{
   await open(page,'gap-082');for(const id of ['local-C','local-A','local-A'])await os(page,id).click();await page.locator('[data-clock-compare] [name="first"]').selectOption('1');await page.locator('[data-clock-compare] [name="second"]').selectOption('3');await os(page,'compare').click();assert.equal(await page.locator('[data-clock-relation]').getAttribute('data-clock-relation'),'concurrent');
   await os(page,'send-A-B').click();await os(page,'recv-m1').click();const s=await osState(page);assert.deepEqual(s.nodes.B.vector,[3,1,0]);await page.locator('[data-clock-compare] [name="first"]').selectOption('4');await page.locator('[data-clock-compare] [name="second"]').selectOption('5');await os(page,'compare').click();assert.equal(await page.locator('[data-clock-relation]').getAttribute('data-clock-relation'),'before');await shot(page,'causal-clocks',size);
  });
  await check(size+': Raft needs replication before commit and a later delivery to notify followers',async()=>{
   await open(page,'gap-084');await store(page,'elect:A').click();await store(page,'put:A').click();await store(page,'commit:A').click();let s=await storeState(page);assert.equal(s.nodes.find(n=>n.id==='A').commit,0);
   await store(page,'replicate:A:B').click();await store(page,'commit:A').click();s=await storeState(page);assert.equal(s.nodes.find(n=>n.id==='A').commit,1);assert.equal(s.nodes.find(n=>n.id==='B').commit,0);await store(page,'replicate:A:B').click();s=await storeState(page);assert.equal(s.nodes.find(n=>n.id==='B').commit,1);assert.equal(s.nodes.find(n=>n.id==='C').log.length,0);await shot(page,'raft-delivery',size);
  });
  await check(size+': lost RPC response keeps real order, stable ID deduplicates and changed payload is refused',async()=>{
   for(const dedup of [true,false]){
    await open(page,'gap-085');await os(page,dedup?'dedup-on':'dedup-off').click();for(const id of ['rpc-send','deliver-request','drop-response','timeout'])await os(page,id).click();assert.match((await osState(page)).client,/結果不明/);assert.equal((await osState(page)).orders.length,1);for(const id of ['rpc-send','deliver-request','deliver-response'])await os(page,id).click();assert.equal((await osState(page)).orders.length,dedup?1:2);
   }
   await os(page,'dedup-on').click();await os(page,'rpc-send').click();await os(page,'deliver-request').click();await page.locator('[data-rpc-send] [name="value"]').fill('2');await os(page,'rpc-send').click();await os(page,'deliver-request').click();const s=await osState(page);assert.equal(s.orders.length,1);assert.equal(s.responses.at(-1).result.status,409);await shot(page,'rpc-uncertainty',size);
  });
  await check(size+': relational editing rejects duplicate keys and missing references atomically',async()=>{
   await open(page,'gap-088');await store(page,'enrol').click();const before=await storeState(page);assert.equal(before.enrolments.length,3);await store(page,'enrol').click();assert.deepEqual(await storeState(page),before);assert.match(await page.locator('.ex-kind-schema-rows [data-ex-status]').textContent(),/主キー/);
   await page.locator('[data-schema-enrol] [name="student"]').selectOption('3');await store(page,'enrol').click();assert.deepEqual(await storeState(page),before);assert.match(await page.locator('.ex-kind-schema-rows [data-ex-status]').textContent(),/外部キー/);await store(page,'new-student').click();await page.locator('[data-schema-enrol] [name="student"]').selectOption('3');await store(page,'enrol').click();assert.equal((await storeState(page)).enrolments.length,4);await shot(page,'schema-rows',size);
  });
  await check(size+': normalization cannot guess the correct name; repaired rows split and rejoin',async()=>{
   await open(page,'gap-089');await page.locator('[data-normal-action="rename"]').click();assert.equal(await page.locator('[data-normal-conflict]').count(),1);await page.locator('[data-normal-action="split"]').click();assert.match(await page.locator('.ex-kind-normalization-rows [data-ex-status]').textContent(),/矛盾/);
   await page.locator('[data-normal-rename] [name="all"]').check();await page.locator('[data-normal-action="rename"]').click();await page.locator('[data-normal-action="split"]').click();await page.locator('[data-normal-rename] [name="studentName"]').fill('Another');await page.locator('[data-normal-action="rename"]').click();const names=await page.locator('[data-normal-joined] tbody tr').allTextContents();assert.equal(names.filter(s=>s.includes('Another')).length,2);await shot(page,'normalization',size);
  });
  await check(size+': SQL edits compute actual results, dirty output hides and failed batches keep the table',async()=>{
   await open(page,'gap-090');const area=page.locator('[data-sql-form] textarea');await area.fill('SELECT name FROM students WHERE score IS NULL;');assert.equal(await page.locator('[data-sql-result]').count(),0);await page.locator('[data-sql-action="run"]').click();assert.match(await page.locator('[data-sql-result]').textContent(),/Ren/);
   const before=await page.locator('[data-sql-data]').getAttribute('data-sql-data');await area.fill('UPDATE students SET score = 100 WHERE id = 1; SELECT missing FROM students;');await page.locator('[data-sql-action="run"]').click();assert.equal(await page.locator('[data-sql-data]').getAttribute('data-sql-data'),before);assert.equal(await page.locator('[data-sql-result]').count(),0);
   await area.fill('UPDATE students SET score = 100 WHERE id = 1; SELECT score FROM students WHERE id = 1;');await page.locator('[data-sql-action="run"]').click();assert.match(await page.locator('[data-sql-result="1"]').textContent(),/100/);await page.locator('[data-sql-action="undo"]').click();assert.equal(await page.locator('[data-sql-data]').getAttribute('data-sql-data'),before);await shot(page,'sql-desk',size);
  });
  await check(size+': MVCC renders both transactions and preserves read snapshots across another commit',async()=>{
   for(const mode of ['rc','rr']){
    await open(page,'gap-092');await os(page,'isolation-'+mode).click();for(const id of ['begin-A','read-A','begin-B','write-B','commit-B','read-A'])await os(page,id).click();assert.deepEqual((await osState(page)).tx.A.reads.map(r=>r.value),mode==='rc'?[100,200]:[100,100]);
   }await shot(page,'mvcc-versions',size);
  });
  await check(size+': crash discards memory; REDO and UNDO use different evidence',async()=>{
   await open(page,'gap-093');await store(page,'set').click();await store(page,'commit:T1').click();const f=page.locator('[data-wal-set]');await f.locator('[name="tx"]').selectOption('T2');await f.locator('[name="key"]').selectOption('y');await f.locator('[name="value"]').fill('9');await store(page,'set').click();await store(page,'flush:y').click();await store(page,'crash').click();let s=await storeState(page);assert.equal(s.memory,null);assert.equal(s.disk.x.value,1);assert.equal(s.disk.y.value,9);await store(page,'redo').click();s=await storeState(page);assert.equal(s.disk.x.value,7);await store(page,'undo-records').click();s=await storeState(page);assert.equal(s.disk.y.value,2);assert.equal(s.phase,'recovered');await shot(page,'wal-recovery',size);
  });
  await check(size+': repaint preserves input drafts and an explicit reset clears them',async()=>{
   await open(page,'gap-085');
   const quantity=page.locator('[data-rpc-send] [name="value"]');
   await quantity.fill('3');await os(page,'rpc-send').click();
   assert.equal(await quantity.inputValue(),'3');
   await os(page,'deliver-request').click();await os(page,'drop-response').click();await os(page,'timeout').click();
   assert.equal(await quantity.inputValue(),'3');
   await os(page,'rpc-send').click();await os(page,'deliver-request').click();
   assert.equal((await osState(page)).orders.length,1);
   assert.equal((await osState(page)).orders[0].quantity,3);
   await os(page,'reset').click();assert.equal(await quantity.inputValue(),'1');
   await open(page,'gap-079');
   const target=page.locator('[data-file-link] [name="target"]');
   await target.fill('/saved');await store(page,'new-link').click();
   assert.equal(await target.inputValue(),'/saved');
   assert.ok((await storeState(page)).entries['/saved']);
   await store(page,'reset').click();assert.equal(await target.inputValue(),'/copy');
  });
  await check(size+': navigating away removes old handlers and returning starts a fresh experiment',async()=>{
   await open(page,'gap-085');await os(page,'rpc-send').click();await os(page,'deliver-request').click();const old=await page.locator('[data-os-id="rpc-send"]').elementHandle();
   await open(page,'gap-079');await old.evaluate(el=>el.click());assert.equal((await storeState(page)).log.length,0);await open(page,'gap-085');assert.equal((await osState(page)).orders.length,0);assert.equal((await osState(page)).log.length,0);
   assert.deepEqual(failures,[]);assert.deepEqual(await page.evaluate(()=>window.__csp),[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  });
  await context.close();
 }
}catch(e){report.errors.push({message:String(e.stack||e)});}
finally{
 await browser?.close();server.kill();report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;
 await mkdir('review-output',{recursive:true});await writeFile('review-output/os-'+name+'.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({sourceCommit:report.sourceCommit,browser:name,scope:report.scope,passed:report.passed,failed:report.failed,errors:report.errors,failures:report.cases.filter(c=>!c.passed)},null,2));if(report.failed||report.errors.length)process.exitCode=1;
}
