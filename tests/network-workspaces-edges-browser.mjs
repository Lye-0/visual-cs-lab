// Regression checks for real pointer placement and bounded resource creation.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
const name=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[name];if(!engine)throw Error('Invalid BROWSER');
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4199'},stdio:'ignore'});
const base='http://127.0.0.1:4199/',report={sourceCommit:process.env.GITHUB_SHA||'local',engine:name,cases:[],errors:[]};let browser,serial=0;
const state=page=>page.locator('[data-net-state]').evaluate(el=>JSON.parse(el.dataset.netState));
const action=(page,key)=>page.locator('[data-net-action="'+key+'"]').click();
const field=(page,key)=>page.locator('[data-net-field="'+key+'"]');
async function open(page,id){await page.goto(base+'?edge='+ ++serial+'#/lab/'+id);await page.waitForFunction(id=>CSL.app.current?.experience&&CSL.app.current.lab.id===id&&!!document.querySelector('[data-net-state]'),id);}
async function check(title,fn){try{await fn();report.cases.push({title,passed:true});}catch(e){report.cases.push({title,passed:false,error:String(e.stack||e)});}}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw Error('Server unavailable');await sleep(100);}
 browser=await engine.launch();
 for(const width of [1440,390,320]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});const page=await context.newPage();page.setDefaultTimeout(10000);
  page.on('pageerror',e=>report.errors.push(e.message));
  await check(width+': pointer selects a received point without changing the transmitted symbol',async()=>{
   await open(page,'gap-104');const graph=page.locator('[data-net-signal]');await graph.scrollIntoViewIfNeeded();
   // Transform a known graph coordinate (-1,-1) to actual screen coordinates.
   const point=await graph.evaluate(svg=>{const p=svg.createSVGPoint();p.x=120;p.y=300;const q=p.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};});
   await page.mouse.click(point.x,point.y);
   const s=await state(page);assert.equal(s.sent,'00');assert.ok(Math.abs(s.received[0]+1)<.03&&Math.abs(s.received[1]+1)<.03);
   assert.equal(await page.locator('[data-net-decision]').textContent(),'11');
   await page.keyboard.press('ArrowUp');assert.ok((await state(page)).received[1]>s.received[1]);
  });
  await check(width+': maximum resource ID rejects only the unsupported new operation and reset remains usable',async()=>{
   await open(page,'gap-105');await field(page,'method').selectOption('PUT');await field(page,'path').fill('/items/99');await action(page,'request');
   const before=await state(page);await field(page,'method').selectOption('POST');await field(page,'path').fill('/items');await action(page,'request');
   assert.deepEqual(await state(page),before);assert.match(await page.locator('[data-net-status]').textContent(),/99まで/);
   await field(page,'method').selectOption('GET');await field(page,'path').fill('/items/99');await action(page,'request');assert.equal((await state(page)).last.status,200);
   await action(page,'reset');await field(page,'method').selectOption('POST');await field(page,'path').fill('/items');await action(page,'request');assert.equal((await state(page)).last.headers.Location,'/items/2');
  });
  await context.close();
 }
}catch(e){report.errors.push(String(e.stack||e));}
finally{
 await browser?.close();server.kill();report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;
 await mkdir('review-output',{recursive:true});await writeFile('review-output/network-edges-'+name+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.failed||report.errors.length)process.exitCode=1;
}
