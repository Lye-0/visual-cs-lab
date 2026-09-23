// Real committed site: source rows, NULL provenance, lock timing and B+ keys.
// No test patches to rendering or CSS. Every independent case reloads a document.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
const name=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[name];if(!engine)throw Error('Unknown browser');
const report={sourceCommit:process.env.GITHUB_SHA||'local',engine:name,cases:[],errors:[],visualReview:'not-performed-by-test'},out='review-output/database';
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4231'},stdio:['ignore','ignore','pipe']});let serial=0,browser,serverLog='';server.stderr.on('data',d=>serverLog+=d);server.on('error',e=>serverLog+=e.message);
const base='http://127.0.0.1:4231/',ids=['c14-index','c14-join','c14-transaction','c14-bplus'];
const state=page=>page.locator('[data-sec-state]').evaluate(el=>JSON.parse(el.dataset.secState));
const field=(page,key)=>page.locator('[data-sec-field="'+key+'"]');
const idle=page=>page.waitForFunction(()=>!document.querySelector('.experience [aria-busy="true"]'));
async function click(page,code){await page.locator('[data-sec-action="'+code+'"]').first().click();await idle(page);}
async function open(page,id,chapter='objects'){
 await page.goto(base+'?db-case='+ ++serial+'#/lab/'+id+'?chapter='+chapter);
 await page.waitForFunction(({id,chapter})=>{const c=CSL?.app?.current,ch=CSL.experiences.find(id)?.chapters.find(ch=>ch.id===chapter);return c?.experience&&c.lab.id===id&&c.chapter===chapter&&ch&&c.completed.size>=ch.activities.length&&!document.querySelector('.experience [aria-busy="true"]');},{id,chapter},{timeout:18000});
 assert.deepEqual(await page.evaluate(()=>CSL.app.current.errors),[]);
}
async function check(id,fn){try{await fn();report.cases.push({id,passed:true});}catch(e){report.cases.push({id,passed:false,error:String(e.stack||e)});console.error('DB_FAIL '+id+' '+e.message);}}
async function capture(page,width,id){await page.locator('.experience').screenshot({path:`${out}/${name}-${width}-${id}.png`});}
try{
 await mkdir(out,{recursive:true});for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw Error(serverLog||'server failed');await sleep(100);}
 browser=await engine.launch({headless:true});report.version=browser.version();
 for(const width of [1440,390,320]){
  const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<500,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(8000);
  await context.addInitScript(()=>{window.__dbCsp=[];document.addEventListener('securitypolicyviolation',e=>__dbCsp.push(e.effectiveDirective));});
  page.on('pageerror',e=>report.errors.push({width,error:e.message}));page.on('response',r=>{if(r.status()>=400)report.errors.push({width,status:r.status(),url:r.url()});});
  for(const id of ids)for(const chapter of ['objects','calculation'])await check(`${width}/${id}/${chapter}/entry`,async()=>{
   await open(page,id,chapter);assert.equal(await page.locator('.experience input[type=number]:invalid').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   assert.deepEqual(await page.evaluate(()=>__dbCsp),[]);assert.deepEqual(await page.locator('.experience label[for]').evaluateAll(a=>a.filter(el=>!document.getElementById(el.htmlFor)).map(el=>el.htmlFor)),[]);
   await capture(page,width,id+'-'+chapter);
  });
  await check(`${width}/index/seek-then-fetch`,async()=>{
   await open(page,'c14-index');assert.deepEqual((await state(page)).found,[]);
   for(let i=0;i<3;i++){await click(page,'next');assert.deepEqual((await state(page)).found,[]);}
   assert.equal((await state(page)).phase,'scan');await click(page,'next');assert.deepEqual((await state(page)).found,[5]);assert.equal(await page.locator('[data-db-source="5"][data-active=true]').count(),1);
   await click(page,'next');await click(page,'next');assert.equal((await state(page)).phase,'done');assert.deepEqual((await state(page)).found,[5,1,3]);assert.equal(await page.locator('[data-sec-action=next]').isDisabled(),true);await capture(page,width,'index-finished');
   await click(page,'method:scan');for(let i=0;i<6;i++)await click(page,'next');assert.deepEqual((await state(page)).found,[1,3,5]);
  });
  await check(`${width}/index/row-reference-empty-query-and-undo`,async()=>{
   await open(page,'c14-index');await click(page,'entry:0');assert.equal((await state(page)).selected,4);await click(page,'source:1');assert.match(await page.locator('[data-sec-board]').textContent(),/索引の位置5（age=22）/);
   await field(page,'age').fill('99');await click(page,'query');for(let i=0;i<2;i++)await click(page,'next');assert.equal((await state(page)).phase,'done');assert.deepEqual((await state(page)).found,[]);
   await click(page,'undo');assert.equal((await state(page)).phase,'seek');const before=await state(page);await field(page,'age').fill('100');await click(page,'query');assert.deepEqual(await state(page),before);await click(page,'reset');assert.equal((await state(page)).age,21);
  });
  await check(`${width}/join/multiple-partners-and-no-partner`,async()=>{
   await open(page,'c14-join');assert.equal(await page.locator('[data-db-origin=unmatched-padding]').count(),3);await click(page,'left:0');assert.equal(await page.locator('[data-db-right][data-active=true]').count(),2);
   await click(page,'output:1');assert.equal((await state(page)).leftIndex,0);assert.equal((await state(page)).rightIndex,1);
   await click(page,'left:1');await click(page,'method:INNER');assert.match(await page.locator('[data-sec-board]').textContent(),/この左行からの出力は0行/);assert.equal(await page.locator('[data-db-origin=unmatched-padding]').count(),0);await click(page,'method:LEFT');await capture(page,width,'join-unmatched');
  });
  await check(`${width}/join/null-provenance-and-null-keys`,async()=>{
   await open(page,'c14-join');await click(page,'preset:nulls');assert.equal(await page.locator('[data-db-origin=stored-null]').count(),1);assert.equal(await page.locator('[data-db-origin=unmatched-padding]').count(),2);
   assert.match(await page.locator('[data-sec-board]').textContent(),/"NULL"（文字列）/);await click(page,'left:6');assert.equal(await page.locator('[data-db-right][data-active=true]').count(),0);assert.match(await page.locator('[data-sec-board]').textContent(),/一致する右行はありません/);await capture(page,width,'join-nulls');
  });
  await check(`${width}/join/edit-preserves-disclosure-draft-and-undo`,async()=>{
   await open(page,'c14-join');const details=page.locator('[data-sec-view=join-editor]');await details.locator('summary').click();await field(page,'uid').fill('2');await field(page,'title').fill('<b>safe</b>');await click(page,'left:1');assert.equal(await field(page,'title').inputValue(),'<b>safe</b>');assert.equal((await state(page)).right[0].uid,1);
   await click(page,'edit');assert.equal((await state(page)).right[0].uid,2);assert.equal(await details.evaluate(el=>el.open),true);assert.equal(await page.locator('[data-db-origin] b').count(),0);assert.match(await page.locator('[data-db-origin]').allTextContents().then(a=>a.join(' ')),/<b>safe<\/b>/);
   const before=await state(page);await field(page,'uid').fill('1e1');await click(page,'edit');assert.deepEqual(await state(page),before);await click(page,'undo');assert.equal((await state(page)).right[0].uid,1);
  });
  await check(`${width}/transaction/no-future-read-or-premature-commit`,async()=>{
   await open(page,'c14-transaction');await click(page,'step:A');let s=await state(page);assert.equal(s.actors.B.read,null);await click(page,'step:A');assert.equal((await state(page)).committed,100);await click(page,'step:A');s=await state(page);assert.equal(s.committed,100);assert.equal(s.actors.A.pending,120);assert.equal(s.owner,'A');await capture(page,width,'transaction-pending');
   await click(page,'step:B');assert.equal((await state(page)).actors.B.read,100);await click(page,'step:A');assert.equal((await state(page)).committed,120);assert.equal((await state(page)).actors.A.pending,null);
   await click(page,'event:0');s=await state(page);assert.equal(s.committed,120);assert.equal(s.events[0].snapshot.committed,100);
  });
  await check(`${width}/transaction/stale-update-waits-and-then-loses-update`,async()=>{
   await open(page,'c14-transaction');for(const id of ['A','B','A','B','A','B'])await click(page,'step:'+id);let s=await state(page);assert.equal(s.actors.B.pc,2);assert.equal(s.committed,100);assert.match(s.events.at(-1).name,/待つ/);
   for(const id of ['A','B','B'])await click(page,'step:'+id);s=await state(page);assert.equal(s.committed,90);assert.ok(Object.values(s.actors).every(p=>p.pc===4));await capture(page,width,'transaction-lost-update');await click(page,'undo');assert.equal((await state(page)).committed,120);
  });
  await check(`${width}/transaction/lock-before-read-preserves-both-updates`,async()=>{
   await open(page,'c14-transaction');await click(page,'mode:locked');await click(page,'step:A');await click(page,'step:B');assert.equal((await state(page)).actors.B.read,null);
   for(const id of ['A','A','A','B','B','B','B'])await click(page,'step:'+id);assert.equal((await state(page)).committed,110);assert.equal((await state(page)).owner,null);await capture(page,width,'transaction-locked');
  });
  await check(`${width}/bplus/parent-and-leaf-retain-different-roles`,async()=>{
   await open(page,'c14-bplus');await click(page,'example');assert.equal((await state(page)).values.length,4);assert.equal(await page.locator('.ex-db-tree-node').count(),3);assert.equal(await page.locator('.ex-db-tree-node button[aria-pressed=true]').count(),2);assert.match(await page.locator('[data-sec-board]').textContent(),/境界と同じキーは右へ/);await capture(page,width,'bplus-split');
   await field(page,'query').fill('11');await click(page,'query');assert.match(await page.locator('[data-sec-board]').textContent(),/この葉にデータがない/);
  });
  await check(`${width}/bplus/insert-history-duplicate-and-keyboard`,async()=>{
   await open(page,'c14-bplus');await click(page,'example');await field(page,'insert').fill('12');await click(page,'insert');assert.deepEqual((await state(page)).values,[10,20,5,6,12]);await click(page,'step:2');assert.equal((await state(page)).selectedStep,2);assert.equal(await page.locator('.ex-db-tree-node').count(),1);
   await field(page,'insert').fill('12');await click(page,'insert');assert.equal((await state(page)).values.length,5);assert.match(await page.locator('[data-sec-status]').textContent(),/追加していません/);
   await click(page,'step:4');const key=page.locator('.ex-db-tree-node [data-sec-action="key:12"]').first();await key.focus();await page.keyboard.press('Enter');await idle(page);assert.equal((await state(page)).key,12);assert.equal(await page.evaluate(()=>document.activeElement?.dataset.secAction),'key:12');
  });
  await check(`${width}/route-return-is-a-new-experiment`,async()=>{
   await open(page,'c14-join');await click(page,'preset:nulls');await page.goto(base+'#/catalog');await page.waitForSelector('#catalog-query');await open(page,'c14-join');assert.equal((await state(page)).preset,'original');assert.deepEqual(await page.evaluate(()=>__dbCsp),[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  });
  await context.close();
 }
}catch(e){report.errors.push({message:String(e.stack||e)});console.error(e);}
finally{await browser?.close();server.kill();report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;await mkdir(out,{recursive:true});await writeFile(`${out}/${name}.json`,JSON.stringify(report,null,2));console.log('DB_SUMMARY '+JSON.stringify({...report,cases:report.cases.filter(c=>!c.passed)}));if(report.failed||report.errors.length)process.exitCode=1;}
