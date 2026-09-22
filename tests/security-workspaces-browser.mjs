// Only committed files over HTTP. No repairs, generated HTML or fake click handlers.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
const name=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[name];if(!engine)throw Error('Unknown browser');
const report={sourceCommit:process.env.SOURCE_COMMIT||process.env.GITHUB_SHA||'local',engine:name,scope:'GAP-109..121',cases:[],errors:[]};
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4201'},stdio:['ignore','ignore','pipe']});let serverLog='',browser,serial=0;
server.stderr.on('data',d=>serverLog+=d);server.on('error',e=>serverLog+=e.message);const base='http://127.0.0.1:4201/';
const ids=Array.from({length:13},(_,i)=>'gap-'+(109+i));
const field=(page,key)=>page.locator('[data-sec-field="'+key+'"]');
const state=page=>page.locator('[data-sec-state]').evaluate(el=>JSON.parse(el.dataset.secState));
const idle=page=>page.waitForFunction(()=>!document.querySelector('.experience [aria-busy="true"]'));
async function click(page,code){await page.locator('[data-sec-action="'+code+'"]').click();await idle(page);}
async function open(page,id,chapter=''){
 await page.goto(base+'?security='+ ++serial+'#/lab/'+id+(chapter?'?chapter='+chapter:''));
 await page.waitForFunction(({id,chapter})=>{
  const c=globalThis.CSL?.app?.current;if(!c?.experience||c.lab.id!==id||chapter&&c.chapter!==chapter)return false;
  const ch=CSL.experiences.find(id)?.chapters.find(x=>x.id===c.chapter);return ch&&c.completed.size>=ch.activities.length&&!document.querySelector('.experience [aria-busy="true"]');
 },{id,chapter},{timeout:20000});
 assert.deepEqual(await page.evaluate(()=>CSL.app.current.errors),[]);
}
async function check(title,fn){try{await fn();report.cases.push({title,passed:true});}catch(e){report.cases.push({title,passed:false,error:String(e.stack||e)});console.error('FAIL '+title+'\n'+e.stack);}}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw Error(serverLog||'HTTP server unavailable');await sleep(100);}
 browser=await engine.launch({headless:true});report.version=browser.version();
 for(const width of [1440,390,320]){
  const context=await browser.newContext({viewport:{width,height:960},hasTouch:width<500,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(10000);
  await context.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.effectiveDirective));});
  const httpErrors=[];page.on('pageerror',e=>report.errors.push({width,message:e.message}));page.on('response',r=>{if(r.status()>=400)httpErrors.push(r.url());});
  await open(page,'gap-109');const defs=await page.evaluate(ids=>ids.map(id=>({id,chapters:CSL.experiences.find(id).chapters.map(c=>({id:c.id,kinds:c.activities.map(a=>a.kind)}))})),ids);
  if(width===1440)report.chapters=defs.reduce((n,d)=>n+d.chapters.length,0);
  for(const d of defs)for(const ch of d.chapters)await check(width+'/'+d.id+'/'+ch.id+' render and labels',async()=>{
   await open(page,d.id,ch.id);assert.equal(await page.locator('[data-ex-kind]').count(),ch.kinds.length);
   assert.equal(await page.locator('.experience input[type="number"]:invalid').count(),0);
   assert.deepEqual(await page.locator('.experience label[for]').evaluateAll(ls=>ls.filter(l=>!document.getElementById(l.htmlFor)).map(l=>l.htmlFor)),[]);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   assert.deepEqual(await page.evaluate(()=>window.__csp),[]);
  });
  await check(width+': asset paths preserve legitimate work while closing the alternate leak',async()=>{
   await open(page,'gap-109');await click(page,'legacy');assert.equal((await state(page)).checks.legacy,true);
   assert.equal(await page.evaluate(()=>CSL.experiences.securityDesk.threatView(JSON.parse(document.querySelector('[data-sec-state]').dataset.secState)).every(x=>x.correct)),true);
   await click(page,'undo');assert.equal((await state(page)).checks.legacy,false);
  });
  await check(width+': AES byte selection maps one output to the actual input and retains keyboard focus',async()=>{
   await open(page,'gap-111');await click(page,'step:3');const cell=page.locator('[data-sec-action="cell:1"]');await cell.focus();await page.keyboard.press('Enter');await idle(page);
   assert.equal((await state(page)).cell,1);assert.equal(await page.evaluate(()=>document.activeElement?.dataset.secAction),'cell:1');
   assert.match(await page.locator('[data-sec-board]').textContent(),/入力\(1,1\)/);
   const before=await state(page);await click(page,'flip');assert.notEqual((await state(page)).plain,before.plain);await click(page,'undo');assert.deepEqual(await state(page),before);
  });
  await check(width+': JWT decode, actual verification and unsigned payload edit are different actions',async()=>{
   await open(page,'gap-114');await click(page,'issue');await click(page,'decode');assert.equal((await state(page)).accepted,null);
   await click(page,'verify');assert.equal((await state(page)).accepted,true);
   await click(page,'tamper');assert.equal((await state(page)).accepted,null);assert.equal((await state(page)).claims.role,'admin');
   await click(page,'verify');assert.equal((await state(page)).accepted,false);assert.equal((await state(page)).checks[1][1],false);
  });
  await check(width+': changing receiver conditions invalidates old verdict and preserves input',async()=>{
   await open(page,'gap-114');await click(page,'issue');const original=(await state(page)).token;
   await field(page,'now').fill('600');await click(page,'context');assert.equal((await state(page)).accepted,null);await click(page,'verify');assert.equal((await state(page)).accepted,false);assert.equal((await state(page)).checks[1][1],true);
   assert.equal(await field(page,'now').inputValue(),'600');assert.equal((await state(page)).token,original);
   await click(page,'reset');assert.equal(await field(page,'now').inputValue(),'100');assert.equal((await state(page)).token,'');
  });
  await check(width+': malformed token and script-like text are inert and do not mutate verified state',async()=>{
   await open(page,'gap-114');await click(page,'issue');await field(page,'token').fill('<img src=x onerror="window.SECURITY_BUG=true">');await click(page,'edit');const before=await state(page);
   await click(page,'verify');assert.deepEqual(await state(page),before);assert.equal(await page.evaluate(()=>window.SECURITY_BUG),undefined);assert.ok((await page.locator('[data-sec-status]').textContent()).includes('3部分'));
  });
  await check(width+': lost refresh response leaves client with a used token and replay revokes family',async()=>{
   await open(page,'gap-114','refresh');await click(page,'use-client');assert.equal((await state(page)).client,'R0');assert.deepEqual((await state(page)).responses,['R1']);
   await click(page,'lose');await click(page,'use-client');assert.equal((await state(page)).revoked,true);
   await click(page,'reset');await click(page,'use-client');await click(page,'deliver');assert.equal((await state(page)).client,'R1');
  });
  await check(width+': ownership, role and separation of duties use distinct checks',async()=>{
   await open(page,'gap-115');await field(page,'object').selectOption('haru');await click(page,'set');assert.equal(await page.locator('[data-sec-verdict]').textContent(),'拒否');
   await field(page,'actor').selectOption('haru');await field(page,'mode').selectOption('approval');await field(page,'operation').selectOption('approve');await click(page,'set');assert.equal(await page.locator('[data-sec-verdict]').textContent(),'拒否');
   await field(page,'object').selectOption('aki');await click(page,'set');assert.equal(await page.locator('[data-sec-verdict]').textContent(),'許可');
  });
  await check(width+': memory guards act before write, at return and at execution separately',async()=>{
   await open(page,'gap-118');await click(page,'write');assert.deepEqual((await state(page)).memory,[0,0,0,0,165,165,64,64]);
   await click(page,'toggle:bounds');await click(page,'write');assert.equal((await state(page)).memory[4],65);await click(page,'return');assert.match((await state(page)).last,/不一致/);
   await click(page,'execute');assert.match((await state(page)).last,/NX/);assert.equal((await state(page)).memory[4],65);await click(page,'reset');await click(page,'free');await click(page,'allocate');await click(page,'read');assert.match((await state(page)).last,/世代/);
  });
  await check(width+': evidence edit preserves original hash and prevents an invalid handover',async()=>{
   await open(page,'gap-120');await click(page,'acquire');const s=await state(page);await click(page,'verify');assert.equal((await state(page)).same,true);
   await field(page,'copy').fill(s.copy+' ');await click(page,'edit');await click(page,'verify');assert.equal((await state(page)).same,false);assert.equal((await state(page)).sealed,s.sealed);
   const before=await state(page);await click(page,'handover');assert.deepEqual(await state(page),before);assert.match(await page.locator('[data-sec-status]').textContent(),/拒否/);
  });
  await check(width+': arbitrary three shares determine the secret, fewer do not',async()=>{
   await open(page,'gap-121');await click(page,'toggle:2');await click(page,'toggle:5');assert.match(await page.locator('[data-sec-verdict]').textContent(),/17個/);
   await click(page,'toggle:1');assert.equal(await page.locator('[data-sec-verdict]').textContent(),'一意に決まる：7');await click(page,'undo');assert.match(await page.locator('[data-sec-verdict]').textContent(),/17個/);
  });
  await check(width+': reset and navigation discard delayed cryptography, without stale DOM writes',async()=>{
   await open(page,'gap-114');
   await page.evaluate(()=>{const S=CSL.experiences.securityDesk,original=S.jwt;S.jwt=async(...args)=>{await new Promise(r=>setTimeout(r,120));return original(...args);};});
   await page.locator('[data-sec-action="issue"]').click();await click(page,'reset');await sleep(170);assert.equal((await state(page)).token,'');
   const retired=await page.locator('[data-sec-state]').elementHandle();await page.locator('[data-sec-action="issue"]').click();await page.evaluate(()=>{location.hash='#/catalog';});await page.locator('#catalog-results').waitFor();await sleep(170);
   assert.equal(await retired.evaluate(el=>JSON.parse(el.dataset.secState).token),'');assert.equal(await page.locator('[data-sec-state]').count(),0);
  });
  await check(width+': no failed requests or CSP violations',async()=>{assert.deepEqual(httpErrors,[]);assert.deepEqual(await page.evaluate(()=>window.__csp),[]);});
  if(width===1440){await mkdir('review-output/security-screenshots',{recursive:true});for(const id of ['gap-109','gap-111','gap-114','gap-118','gap-120','gap-121']){await open(page,id);await page.screenshot({path:`review-output/security-screenshots/${name}-${id}.png`,fullPage:true});}}
  await context.close();
 }
}catch(e){report.errors.push(String(e.stack||e));}
finally{
 await browser?.close();server.kill();report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;
 await mkdir('review-output',{recursive:true});await writeFile('review-output/security-'+name+'.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({...report,cases:undefined,failures:report.cases.filter(c=>!c.passed)},null,2));if(report.failed||report.errors.length)process.exitCode=1;
}
