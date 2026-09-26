import {fixtureDefinitions,fixtureInventory} from './lesson-fixtures.mjs';
// Browser-backed review of live view state, not a screenshot/teaching approval.
// Tests never modify source files, inject styling, or replace application logic.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
const engineName=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[engineName];
if(!engine)throw Error('Unknown browser: '+engineName);
const output=process.env.VIEW_REVIEW_OUTPUT||'review-output/view-state';
const report={sourceCommit:process.env.GITHUB_SHA||'local',engine:engineName,cases:[],runtime:[],visualReview:'not-performed',scope:'Twelve units: all initial chapters, plus named interaction regressions. Not every possible state.'};
const units=['c01-bits','c01-hamming','c03-integral','c03-probability','c05-heap','c06-dp','c09-pipeline','c12-race','c03-matrix','gap-002','gap-006','gap-008'];
const base='http://127.0.0.1:4223/';
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4223'},stdio:['ignore','ignore','pipe']});
let browser,serverError='',serial=0;
server.on('error',e=>serverError+=e.message);server.stderr.on('data',s=>serverError+=s);
async function check(id,fn){try{const evidence=await fn();report.cases.push({id,passed:true,evidence});}catch(error){report.cases.push({id,passed:false,error:String(error.stack||error)});console.error('VIEW_FAILURE '+id+' '+error.message);}}
const idle=page=>page.waitForFunction(()=>!document.querySelector('.experience [aria-busy="true"]'));
const field=(page,key)=>page.locator('[data-sec-field="'+key+'"]');
const state=page=>page.locator('[data-sec-state]').evaluate(el=>JSON.parse(el.dataset.secState));
async function action(page,code){await page.locator('[data-sec-action="'+code+'"]').first().click();await idle(page);}
async function open(page,id,chapter){
 await page.goto(base+'?view-review='+ ++serial+'#/lab/'+id+(chapter?'?chapter='+chapter:''));
 await page.waitForFunction(({id,chapter})=>{const c=globalThis.CSL?.app?.current;if(!c?.experience||c.lab.id!==id||(chapter&&c.chapter!==chapter))return false;const d=CSL.experiences.find(id)?.chapters.find(ch=>ch.id===c.chapter);return d&&c.completed.size>=d.activities.length&&!document.querySelector('.experience [aria-busy="true"]');},{id,chapter},{timeout:18000});
 await page.evaluate(()=>document.fonts.ready);
}
const itemDetails=page=>page.locator('.ex-fr-details').last();
const detailState=page=>itemDetails(page).evaluate(el=>el.open);
try{
 await mkdir(output,{recursive:true});
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw Error(serverError||'Server did not start');await sleep(100);}
 browser=await engine.launch({headless:true});report.version=browser.version();
 for(const width of [1440,390,320]){
  const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<500,reducedMotion:'reduce'}),page=await context.newPage();
  page.setDefaultTimeout(7000);
  await context.addInitScript(()=>{window.__viewCsp=[];document.addEventListener('securitypolicyviolation',e=>__viewCsp.push(e.effectiveDirective));});
  page.on('pageerror',e=>report.runtime.push({width,message:e.message}));
  page.on('response',r=>{if(r.status()>=400)report.runtime.push({width,status:r.status(),url:r.url()});});
  await open(page,'c01-bits');
  const definitions=fixtureDefinitions(units);
  for(const unit of definitions)for(const chapter of unit.chapters)await check(`${width}/entry/${unit.id}/${chapter.id}`,async()=>{
   await open(page,unit.id,chapter.id);
   assert.deepEqual(await page.evaluate(()=>CSL.app.current.errors),[]);
   assert.deepEqual(await page.evaluate(()=>__viewCsp),[]);
   assert.equal(await page.locator('[data-ex-kind]').count(),chapter.count);
   assert.equal(await page.locator('.experience input[type=number]:invalid').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   const missing=await page.locator('.experience label[for]').evaluateAll(labels=>labels.filter(el=>!document.getElementById(el.htmlFor)).map(el=>el.htmlFor));assert.deepEqual(missing,[]);
   return {chapter:chapter.id,activities:chapter.count};
  });
  await check(`${width}/details-remain-open-after-item-edit`,async()=>{
   await open(page,'c06-dp','meaning');await itemDetails(page).locator('summary').click();
   await field(page,'value-3').fill('12');await action(page,'item:3');
   assert.equal((await state(page)).items[3].value,12);
   assert.equal(await detailState(page),true,'editing an item closed its own section');
   assert.equal(await page.evaluate(()=>document.activeElement?.dataset.secAction),'item:3');
   await field(page,'weight-3').fill('4');await action(page,'item:3');
   assert.equal((await state(page)).items[3].weight,4);assert.equal(await detailState(page),true);
   return {value:12,weight:4,open:true};
  });
  await check(`${width}/undo-keeps-reading-context-reset-clears-it`,async()=>{
   await open(page,'c06-dp','meaning');await itemDetails(page).locator('summary').click();await field(page,'value-3').fill('12');await action(page,'item:3');
   // Both baseline and candidate are placed in the same open state before undo.
   if(!await detailState(page))await itemDetails(page).locator('summary').click();
   await action(page,'undo');assert.equal((await state(page)).items[3].value,8);
   assert.equal(await detailState(page),true,'undo discarded an open reading section');
   assert.equal(await field(page,'value-3').inputValue(),'8');
   await action(page,'reset');assert.equal(await detailState(page),false);
   return {undoValue:8,undoOpen:true,resetOpen:false};
  });
  await check(`${width}/unsubmitted-input-survives-cell-selection`,async()=>{
   await open(page,'c06-dp','meaning');await itemDetails(page).locator('summary').click();await field(page,'value-3').fill('10');
   await action(page,'select:3:2');assert.equal((await state(page)).items[3].value,8);
   assert.equal(await field(page,'value-3').inputValue(),'10');assert.equal(await detailState(page),true);
   await action(page,'item:3');assert.equal((await state(page)).items[3].value,10);
   return {beforeApply:8,draft:10,afterApply:10};
  });
  if(width<500)await check(`${width}/dp-horizontal-reading-position-survives-redraw`,async()=>{
   await open(page,'c06-dp','meaning');await field(page,'capacity').fill('12');await action(page,'capacity');
   const area=page.locator('.ex-fr-table-scroll');const before=await area.evaluate(el=>{el.scrollLeft=el.scrollWidth-el.clientWidth;return {left:el.scrollLeft,max:el.scrollWidth-el.clientWidth};});
   assert.ok(before.max>20,'expected the real table to overflow on a narrow display');
   await action(page,'select:4:12');const after=await area.evaluate(el=>({left:el.scrollLeft,max:el.scrollWidth-el.clientWidth}));
   assert.ok(after.left>20,'table jumped back to the first columns');
   assert.ok(Math.abs(after.left-before.left)<3,JSON.stringify({before,after}));
   assert.equal((await state(page)).col,12);
   return {before,after};
  });
  await check(`${width}/sum-button-keeps-focus-in-the-sum`,async()=>{
   await open(page,'c03-integral','meaning');const selected=page.locator('.ex-fr-sum [data-sec-action="select:3"]');await selected.focus();await page.keyboard.press('Enter');await idle(page);
   assert.equal((await state(page)).selected,3);
   const focused=await page.evaluate(()=>({action:document.activeElement?.dataset.secAction,inSum:!!document.activeElement?.closest('.ex-fr-sum')}));
   assert.equal(focused.action,'select:3');assert.equal(focused.inSum,true,'same action in an earlier region stole focus');
   await page.keyboard.press('Enter');await idle(page);assert.equal(await page.evaluate(()=>!!document.activeElement?.closest('.ex-fr-sum')),true);
   return focused;
  });
  await check(`${width}/interval-button-keeps-focus-in-the-interval-list`,async()=>{
   await open(page,'c03-integral','meaning');await page.locator('[data-sec-action="select:3"]').first().focus();await page.keyboard.press('Enter');await idle(page);
   assert.equal((await state(page)).selected,3);assert.equal(await page.evaluate(()=>!!document.activeElement?.closest('.ex-fr-sum')),false);
  });
  await check(`${width}/channel-positions-are-visible-not-only-accessible-labels`,async()=>{
   await open(page,'c01-hamming','meaning');await action(page,'encode');
   const labels=await page.locator('[data-fr-word=channel] button').allTextContents();assert.equal(labels.length,7);
   labels.forEach((label,i)=>assert.ok(label.includes('位置'+(i+1)),`position ${i+1} absent from visible content`));
   await action(page,'flip:2');assert.equal((await state(page)).channel[2],0);
   return {labels};
  });
  await check(`${width}/reverse-integral-does-not-call-its-first-endpoint-left`,async()=>{
   await open(page,'c03-integral','meaning');await field(page,'start').fill('2');await field(page,'end').fill('0');await action(page,'configure');
   const text=await page.locator('[data-sec-board]').textContent();assert.ok(!text.includes('左側の計算端点'),'first endpoint is on the right when integrating backwards');
   assert.ok(text.includes('始点側の計算端点'));assert.ok(text.includes('Δxは負'));
   const cell=await page.evaluate(()=>CSL.experiences.foundationReview.integralView(JSON.parse(document.querySelector('[data-sec-state]').dataset.secState)).selected);
   assert.ok(cell.x0>cell.x1);assert.ok(cell.contribution<0);return cell;
  });
  await check(`${width}/view-state-does-not-persist-between-visits`,async()=>{
   await open(page,'c06-dp','meaning');await itemDetails(page).locator('summary').click();await field(page,'value-3').fill('11');await action(page,'item:3');
   await page.goto(base+'#/catalog');await page.waitForSelector('#catalog-query');await open(page,'c06-dp','meaning');
   assert.equal(await detailState(page),false);assert.equal((await state(page)).items[3].value,8);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  });
  await mkdir(output+'/captures',{recursive:true});
  for(const id of ['c01-hamming','c03-integral','c06-dp']){await open(page,id,'meaning');await page.locator('.experience').screenshot({path:`${output}/captures/${engineName}-${width}-${id}.png`});}
  await context.close();
 }
}catch(error){report.runtime.push({message:String(error.stack||error)});console.error(error);}
finally{
 await browser?.close();server.kill();
 report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;
 await mkdir(output,{recursive:true});await writeFile(`${output}/${engineName}.json`,JSON.stringify(report,null,2));
 console.log('VIEW_SUMMARY '+JSON.stringify({sourceCommit:report.sourceCommit,engine:engineName,passed:report.passed,failed:report.failed,runtime:report.runtime.length,failures:report.cases.filter(c=>!c.passed).map(c=>({id:c.id,error:c.error}))}));
 if(report.failed||report.runtime.length)process.exitCode=1;
}
