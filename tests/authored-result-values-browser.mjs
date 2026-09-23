// Read-only browser assertions for values and stated-vs-effective conditions.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
const engine=process.env.BROWSER||'chromium',base='http://127.0.0.1:4219/';
const report={sourceCommit:process.env.GITHUB_SHA||'local',engine,cases:[],errors:[]};
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4219'},stdio:['ignore','ignore','pipe']});let browser,serverError='';server.stderr.on('data',d=>serverError+=d);server.on('error',e=>serverError+=e.message);
async function check(name,fn){try{await fn();report.cases.push({name,passed:true});}catch(e){report.cases.push({name,passed:false,error:String(e.stack||e)});console.error('FAIL '+name+'\n'+e.stack);}}
async function ready(page,id){await page.waitForFunction(id=>{const c=globalThis.CSL?.app?.current;return c?.experience&&c.lab.id===id&&!document.querySelector('.experience [aria-busy="true"]')&&c.completed.size>0;},id);assert.deepEqual(await page.evaluate(()=>CSL.app.current.errors),[]);}
async function open(page,id,chapter=''){await page.goto(base+'#/lab/'+id+(chapter?'?chapter='+chapter:''));await ready(page,id);}
const pairs=loc=>loc.evaluateAll(nodes=>nodes.flatMap(dl=>[...dl.children].map(row=>[row.querySelector('dt').textContent,row.querySelector('dd').textContent])));
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw Error(serverError||'server timeout');await sleep(100);}
 browser=await ({chromium,firefox,webkit}[engine]).launch({headless:true});
 for(const width of [1440,390,320]){
  const ctx=await browser.newContext({viewport:{width,height:960},hasTouch:width<500,reducedMotion:'reduce'}),page=await ctx.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>report.errors.push({width,error:e.message}));
  await check(width+': the label ten trials matches the computed comparison',async()=>{
   await open(page,'c03-probability');const panes=page.locator('[data-ex-comparison]');assert.equal(await panes.count(),2);
   assert.ok((await pairs(panes.nth(0).locator('[data-ex-values="result"]'))).some(([k,v])=>k==='試行回数'&&v==='10'));
   assert.ok((await pairs(panes.nth(1).locator('[data-ex-values="result"]'))).some(([k,v])=>k==='試行回数'&&v==='200'));
  });
  await check(width+': derivative operands and answers remain readable outside a closed figure',async()=>{
   await open(page,'c03-derivative');const ledger=page.locator('.ex-kind-ledger');await ledger.locator('[name=x]').fill('1');await ledger.locator('[name=h]').fill('0.1');await ledger.locator('button[type=submit]').click();await ready(page,'c03-derivative');
   const values=await pairs(ledger.locator('[data-ex-values="frame"]'));assert.ok(values.some(([k,v])=>k==='差分近似'&&v==='2.1'));assert.ok(values.some(([k,v])=>k==='厳密な微分 2x'&&v==='2'));
   assert.equal(await ledger.locator('details[open]').count(),0);assert.equal(await ledger.locator('[data-ex-values="frame"]').isVisible(),true);
  });
  await check(width+': final values are shown only after all ledger records are available',async()=>{
   await open(page,'c03-integral','calculation');const ledger=page.locator('.ex-kind-ledger');await ledger.locator('[name=n]').fill('8');await ledger.locator('button[type=submit]').click();await ready(page,'c03-integral');
   assert.equal(await ledger.locator('[data-ex-values="frame"]').count(),6);assert.equal(await ledger.locator('[data-ex-values="result"]').count(),0);
   await ledger.locator('[data-ex-more]').click();assert.equal(await ledger.locator('[data-ex-values="frame"]').count(),8);assert.equal(await ledger.locator('[data-ex-values="result"]').count(),1);
  });
  await check(width+': timeline result disappears when returning to an earlier state',async()=>{
   await open(page,'c01-hamming','calculation');const root=page.locator('.ex-kind-timeline');assert.equal(await root.locator('[data-ex-values="result"]').count(),0);
   await root.locator('[data-ex-event]').last().click();assert.equal(await root.locator('[data-ex-values="result"]').count(),1);
   await root.locator('[data-ex-previous]').click();assert.equal(await root.locator('[data-ex-values="result"]').count(),0);
  });
  await check(width+': editing an input removes its old values, reset restores actual defaults',async()=>{
   await open(page,'c03-derivative');const root=page.locator('.ex-kind-ledger');await root.locator('[name=x]').fill('');assert.equal(await root.locator('[data-ex-values]').count(),0);await root.locator('[data-ex-reset]').click();await ready(page,'c03-derivative');assert.ok(await root.locator('[data-ex-values="frame"]').count()>0);
  });
  await check(width+': inspect values are tied to the currently computed input',async()=>{
   await open(page,'c12-quorum');const root=page.locator('.ex-kind-inspect');assert.ok(await root.locator('[data-ex-values="result"]').count()>0);
   const before=await pairs(root.locator('[data-ex-values="result"]'));await root.locator('[name=failed]').fill('0');await root.locator('button[type=submit]').click();await ready(page,'c12-quorum');assert.notDeepEqual(await pairs(root.locator('[data-ex-values="result"]')),before);
  });
  await check(width+': calculated values are escaped and wrap without making the page wider',async()=>{
   await open(page,'c03-derivative');const content=await page.evaluate(()=>{const el=document.createElement('div');el.innerHTML=CSL.experiences.valuesMarkup({'<img src=x onerror=bad()>':'<script>bad()</script>'});return {images:el.querySelectorAll('img').length,scripts:el.querySelectorAll('script').length,text:el.textContent};});assert.equal(content.images,0);assert.equal(content.scripts,0);assert.match(content.text,/<script>/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  });
  await ctx.close();
 }
}catch(e){report.errors.push({message:String(e.stack||e)});console.error(e);}
finally{await browser?.close();server.kill();report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;await mkdir('review-output',{recursive:true});await writeFile(`review-output/authored-values-${engine}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,cases:report.cases.filter(c=>!c.passed)},null,2));if(report.failed||report.errors.length)process.exitCode=1;}
