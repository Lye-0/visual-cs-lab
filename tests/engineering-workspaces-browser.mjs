// Run the committed separated site over HTTP. No source generation or repair.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
const name=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[name];if(!engine)throw Error('Unknown browser');
const report={sourceCommit:process.env.SOURCE_COMMIT||process.env.GITHUB_SHA||'local',engine:name,scope:'GAP-144..155',cases:[],errors:[]};
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4204'},stdio:['ignore','ignore','pipe']});let serverLog='',browser,serial=0;
server.stderr.on('data',d=>serverLog+=d);server.on('error',e=>serverLog+=e.message);
const base='http://127.0.0.1:4204/',ids=Array.from({length:12},(_,i)=>'gap-'+(144+i));
const field=(p,key)=>p.locator('[data-sec-field="'+key+'"]'),state=p=>p.locator('[data-sec-state]').evaluate(el=>JSON.parse(el.dataset.secState));
const idle=p=>p.waitForFunction(()=>!document.querySelector('.experience [aria-busy="true"]'));
async function click(p,action){await p.locator('[data-sec-action="'+action+'"]').first().click();await idle(p);}
async function open(p,id,chapter=''){
 await p.goto(base+'?engineering='+ ++serial+'#/lab/'+id+(chapter?'?chapter='+chapter:''));
 await p.waitForFunction(({id,chapter})=>{const c=globalThis.CSL?.app?.current;if(!c?.experience||c.lab.id!==id||chapter&&c.chapter!==chapter)return false;const ch=CSL.experiences.find(id)?.chapters.find(x=>x.id===c.chapter);return ch&&c.completed.size>=ch.activities.length&&!document.querySelector('.experience [aria-busy="true"]');},{id,chapter},{timeout:20000});
 assert.deepEqual(await p.evaluate(()=>CSL.app.current.errors),[]);
}
async function check(title,fn){try{await fn();report.cases.push({title,passed:true});}catch(e){report.cases.push({title,passed:false,error:String(e.stack||e)});console.error('FAIL '+title+'\n'+e.stack);}}
async function configure(page,fn){await page.locator('.eg-native-config summary').click();await fn();await page.locator('[data-native-action="apply"]').click();await idle(page);await page.waitForSelector('[data-native-ready="true"]');}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw Error(serverLog||'server unavailable');await sleep(100);}
 browser=await engine.launch({headless:true,...(name==='chromium'&&process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});report.version=browser.version();
 for(const width of [1440,390,320]){
  const context=await browser.newContext({viewport:{width,height:960},hasTouch:width<500,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(10000);
  await context.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.effectiveDirective));});
  const requests=[];page.on('response',r=>{if(r.status()>=400)requests.push(r.url());});page.on('pageerror',e=>report.errors.push({width,message:e.message}));
  await open(page,'gap-144');const defs=await page.evaluate(ids=>ids.map(id=>({id,chapters:CSL.experiences.find(id).chapters.map(c=>({id:c.id,kinds:c.activities.map(a=>a.kind)}))})),ids);
  if(width===1440){report.chapters=defs.reduce((n,d)=>n+d.chapters.length,0);report.inventory=await page.evaluate(()=>{const {units,chapters,activities}=CSL.experiences.inventory();return {units,chapters,activities};});}
  for(const def of defs)for(const ch of def.chapters)await check(width+'/'+def.id+'/'+ch.id+' render, labels, controls and page bounds',async()=>{
   await open(page,def.id,ch.id);assert.equal(await page.locator('[data-ex-kind]').count(),ch.kinds.length);
   assert.equal(await page.locator('.experience input[type=number]:invalid').count(),0);
   assert.deepEqual(await page.locator('.experience label[for]').evaluateAll(ls=>ls.filter(l=>!document.getElementById(l.htmlFor)).map(l=>l.htmlFor)),[]);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   assert.equal(await page.locator('#reader-scrubber,[data-r-phase]').count(),0);
   assert.deepEqual(await page.evaluate(()=>window.__csp),[]);
  });
  await check(width+': cache makes reads fast without promising freshness',async()=>{
   await open(page,'gap-144');await click(page,'read');assert.equal((await state(page)).last.time,47);
   await click(page,'cache');await click(page,'read');await field(page,'value').fill('22');await click(page,'edit');await click(page,'read');const stale=await state(page);assert.equal(stale.last.value,10);assert.equal(stale.last.time,20);assert.match(await page.locator('[data-sec-board]').textContent(),/古い版/);
   await click(page,'invalidate');await field(page,'value').fill('23');await click(page,'edit');await click(page,'read');assert.equal((await state(page)).last.value,23);assert.equal(await field(page,'value').inputValue(),'23');
   await click(page,'reset');assert.equal((await state(page)).value,10);
  });
  await check(width+': subscriber registration controls actual inboxes and literal text stays text',async()=>{
   await open(page,'gap-145');await field(page,'event').fill('<b>通知</b>');await click(page,'emit');await click(page,'subscribe:B');await field(page,'event').fill('二回目');await click(page,'emit');
   const s=await state(page);assert.equal(s.inboxes.A.length,2);assert.equal(s.inboxes.B.length,1);assert.equal(s.inboxes.B[0].event,'<b>通知</b>');assert.equal(await page.locator('[data-sec-board] b').count(),0);
   await click(page,'undo');assert.equal((await state(page)).inboxes.A.length,1);
  });
  await check(width+': order requires its state transition and rejects early send atomically',async()=>{
   await open(page,'gap-145','states');const s=await state(page);await click(page,'send');assert.deepEqual(await state(page),s);assert.match(await page.locator('[data-sec-status]').textContent(),/許可/);
   await click(page,'approve');await click(page,'send');assert.equal((await state(page)).state,'sent');
  });
  await check(width+': authored boundary test fails, then code edit really fixes the same test',async()=>{
   await open(page,'gap-146');await click(page,'add');await click(page,'run');assert.equal((await state(page)).results.at(-1).actual,9);assert.equal((await state(page)).results.at(-1).pass,false);
   await click(page,'select:2');await click(page,'step:1');assert.equal((await state(page)).step,1);assert.ok(await page.locator('.eg-code .running').count());
   const code=(await state(page)).program.replace('return 9;','return 10;');await field(page,'program').fill(code);await click(page,'code');assert.equal((await state(page)).results,null);await click(page,'run');assert.equal((await state(page)).results.at(-1).actual,10);assert.equal((await state(page)).results.at(-1).pass,true);
  });
  await check(width+': merging one conflicting line retains independent changes',async()=>{
   await open(page,'gap-147');await click(page,'resolve:left');assert.equal((await state(page)).resolution,'color = green');assert.match(await page.locator('[data-sec-board] pre').textContent(),/size = 20/);
   await click(page,'example:independent');assert.equal(await page.locator('[data-sec-action="resolve:left"]').count(),0);assert.match(await page.locator('[data-sec-board] pre').textContent(),/green/);
  });
  await check(width+': stale CI result cannot release current code, matching versions can',async()=>{
   await open(page,'gap-147','revision');await click(page,'start');await click(page,'edit');await click(page,'complete:1:pass');await click(page,'review');await click(page,'build');const s=await state(page);await click(page,'publish');assert.deepEqual(await state(page),s);
   await click(page,'start');await click(page,'complete:2:pass');await click(page,'publish');assert.equal((await state(page)).published,1);
  });
  await check(width+': feedback demo deletes asynchronously and actual undo restores items',async()=>{
   await open(page,'gap-148');await page.locator('.cv-demo [data-cv-action="delete"]').click();await page.waitForFunction(()=>document.querySelectorAll('[data-cv-items] li').length===2);await page.locator('[data-cv-action="undo"]').click();assert.equal(await page.locator('[data-cv-items] li').count(),3);
   await configure(page,async()=>{await page.locator('[data-native-field="confirmation"]').check();await page.locator('[data-native-field="delay"]').fill('0');});await page.locator('[data-cv-action="delete"]').click();assert.equal(await page.locator('[data-cv-items] li').count(),3);await page.locator('[data-cv-action="cancel"]').click();assert.equal(await page.locator('[data-cv-items] li').count(),3);
  });
  await check(width+': target is a real button and moves within its measured area',async()=>{
   await open(page,'gap-148','target');const target=page.locator('[data-cv-action="target"]');const before=await target.boundingBox();await target.click();const after=await target.boundingBox();assert.ok(after.x>before.x);await target.focus();await page.keyboard.press('Enter');assert.match(await page.locator('[data-cv-output]').textContent(),/キーボード/);
  });
  await check(width+': study order changes results but not participant baselines',async()=>{
   await open(page,'gap-149');assert.match(await page.locator('[data-sec-board]').textContent(),/-8秒/);await click(page,'balance');assert.equal((await state(page)).orders.filter(x=>x==='AB').length,4);assert.match(await page.locator('[data-sec-board]').textContent(),/-3秒/);
  });
  await check(width+': real accessible input and button support Tab Enter and their DOM is inspectable',async()=>{
   await open(page,'gap-150');const input=page.locator('.cv-demo input');await input.fill('TCP');await input.focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement?.dataset.cvAction),'access');await page.keyboard.press('Enter');assert.match(await page.locator('.cv-demo [data-cv-output]').textContent(),/TCP/);
   await configure(page,async()=>{await page.locator('[data-native-field="native"]').uncheck();await page.locator('[data-native-field="label"]').uncheck();});assert.equal(await page.locator('[data-cv-action="access"]').evaluate(el=>el.tagName),'DIV');assert.equal(await page.locator('.cv-demo input').evaluate(el=>el.labels.length),0);assert.match(await page.locator('[data-native-inspect]').textContent(),/labelなし/);
  });
  await check(width+': stakeholder comparison has separate benefits and costs rather than one score',async()=>{
   await open(page,'gap-151');await click(page,'policy:external');assert.equal((await state(page)).choice,'external');assert.match(await page.locator('[data-sec-board]').textContent(),/第三者|連携先/);await click(page,'undo');assert.equal((await state(page)).choice,'minimal');
  });
  await check(width+': resampling repeats original pairs and permutation swaps only labels',async()=>{
   await open(page,'gap-152');const before=await state(page);await click(page,'draw:0');await click(page,'draw:0');await click(page,'swap:0');const after=await state(page);assert.deepEqual(after.sample,[0,0]);assert.deepEqual(after.a,before.a);assert.equal(after.swaps[0],true);await click(page,'clear');assert.deepEqual((await state(page)).sample,[]);
  });
  await check(width+': evidence selection distinguishes supporting observation from counterexample and causality',async()=>{
   await open(page,'gap-153');await click(page,'evidence:E1');assert.match(await page.locator('[data-sec-board]').textContent(),/−1.75/);await click(page,'claim:always');await click(page,'evidence:E1');assert.match(await page.locator('[data-sec-board]').textContent(),/反例/);await click(page,'claim:causal');await click(page,'evidence:M1');assert.match(await page.locator('[data-sec-board]').textContent(),/順序/);
  });
  await check(width+': real layout box changes with box-sizing and keyboard picks measured element',async()=>{
   await open(page,'gap-154');const item=page.locator('.cv-layout-item').first();assert.equal(Math.round((await item.boundingBox()).width),100);await item.focus();await page.keyboard.press('Enter');assert.match(await page.locator('[data-native-inspect]').textContent(),/100px/);
   await configure(page,async()=>{await page.locator('[data-native-field="borderBox"]').uncheck();});assert.equal(Math.round((await page.locator('.cv-layout-item').first().boundingBox()).width),128);
  });
  await check(width+': real event propagation stops at chosen ancestor, not a fabricated record',async()=>{
   await open(page,'gap-154','events');await page.locator('[data-cv-event-target]').click();assert.equal(await page.locator('[data-cv-output] li').count(),6);
   await configure(page,async()=>{await page.locator('[data-native-field="stopAt"]').selectOption('outer-capture');});await page.locator('[data-cv-event-target]').click();assert.equal(await page.locator('[data-cv-output] li').count(),3);assert.doesNotMatch(await page.locator('[data-cv-output]').textContent(),/target capture/);
  });
  await check(width+': native form validates before submit and never sends to a server',async()=>{
   await open(page,'gap-154','form');
   const form=page.locator('[data-cv-native-form]'),input=form.locator('input'),button=form.locator('button'),output=page.locator('[data-cv-output]'),url=page.url();
   await button.click();
   // Observe the native constraint result instead of reading a possibly older
   // status immediately after the pointer action. No fixed sleep or retry click.
   await page.waitForFunction(()=>document.querySelector('[data-cv-output]')?.textContent.includes('制約検証'),null,{timeout:10000});
   assert.equal(await input.evaluate(el=>el.validity.valueMissing),true);
   assert.match(await output.textContent(),/制約検証/);
   await input.fill('DNS');
   assert.equal(await input.inputValue(),'DNS');
   assert.equal(await input.evaluate(el=>el.validity.valid),true);
   await button.click();
   await page.waitForFunction(()=>document.querySelector('[data-cv-output]')?.textContent==='検証を通過。模擬送信した単元名：DNS（外部送信はしていません）',null,{timeout:10000});
   assert.match(await output.textContent(),/DNS/);
   assert.equal(page.url(),url);
  });
  await check(width+': server pipeline persists successful data but rolls back a failed write',async()=>{
   await open(page,'gap-155');await field(page,'method').selectOption('PATCH');await field(page,'body').fill('{"name":"edited"}');await field(page,'failure').selectOption('after');await click(page,'request');let s=await state(page);assert.equal(s.last.status,500);assert.equal(s.rows[0].name,'利用者1の資料');
   await field(page,'failure').selectOption('none');await click(page,'request');s=await state(page);assert.equal(s.last.status,200);assert.equal(s.rows[0].name,'edited');await click(page,'stage:0');assert.equal((await state(page)).selected,0);assert.equal(await field(page,'body').inputValue(),'{"name":"edited"}');
  });
  await check(width+': pending native deletion is discarded on reconfigure and navigation',async()=>{
   await open(page,'gap-148');await page.locator('[data-cv-action="delete"]').click();await page.locator('.eg-native-config summary').click();await page.locator('[data-native-action="reset"]').click();await idle(page);await page.waitForTimeout(950);assert.equal(await page.locator('[data-cv-items] li').count(),3);
   await page.locator('[data-cv-action="delete"]').click();await page.goto(base+'#/catalog');await page.waitForSelector('#catalog-query');await open(page,'gap-148');await page.waitForTimeout(950);assert.equal(await page.locator('[data-cv-items] li').count(),3);
  });
  await check(width+': all314 are authored, policies and page boundaries remain intact',async()=>{
   assert.equal(await page.evaluate(()=>CSL.experiences.lessons.size),314);assert.equal(await page.evaluate(()=>CSL.labs.length),314);assert.deepEqual(await page.evaluate(()=>CSL.experiences.modes().filter(k=>!CSL.experiences.widgets.has(k))),[]);assert.deepEqual(requests,[]);assert.deepEqual(await page.evaluate(()=>window.__csp),[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  });
  await mkdir('review-output/engineering-screenshots',{recursive:true});
  for(const [id,ch]of [['gap-144','requirements'],['gap-146','write-test'],['gap-150','operate'],['gap-153','claims'],['gap-154','layout'],['gap-155','request']]){await open(page,id,ch);await page.screenshot({path:`review-output/engineering-screenshots/${name}-${width}-${id}.png`,fullPage:true});}
  await context.close();
 }
}catch(e){report.errors.push({message:String(e.stack||e)});console.error(e);}
finally{
 await browser?.close();server.kill();report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;
 await mkdir('review-output',{recursive:true});await writeFile(`review-output/engineering-${name}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,cases:report.cases.filter(c=>!c.passed)},null,2));if(report.failed||report.errors.length)process.exitCode=1;
}
