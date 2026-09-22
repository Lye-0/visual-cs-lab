// Run against committed files. A geometric correspondence is not just a caption.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
const engine=process.env.BROWSER||'chromium',report={sourceCommit:process.env.GITHUB_SHA||'local',engine,cases:[],errors:[]};
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4212'},stdio:'ignore'});let browser,serial=0;
const base='http://127.0.0.1:4212/';
async function check(name,fn){try{await fn();report.cases.push({name,passed:true});}catch(error){report.cases.push({name,passed:false,error:String(error.stack||error)});console.error(name,error);}}
async function open(page,id,chapter){await page.goto(base+'?review='+ ++serial+'#/lab/'+id+'?chapter='+chapter);await page.waitForFunction(({id,chapter})=>{const c=globalThis.CSL?.app?.current;return c?.experience&&c.lab.id===id&&c.chapter===chapter&&c.completed.size>0&&!document.querySelector('.experience [aria-busy=true]');},{id,chapter});assert.deepEqual(await page.evaluate(()=>CSL.app.current.errors),[]);}
async function action(page,code){await page.locator('[data-sec-action="'+code+'"]').click();await page.waitForFunction(()=>!document.querySelector('.experience [aria-busy=true]'));}
async function eliminate(page){const f=page.locator('.ex-row-controls');await f.locator('[name=row]').selectOption('1');await f.locator('[name=other]').selectOption('0');await f.locator('[name=factor]').fill('-2');await f.locator('button[type=submit]').click();}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw Error('server startup');await sleep(100);}
 browser=await ({chromium,firefox,webkit}[engine]).launch({headless:true});
 for(const width of [1440,390,320]){
  const context=await browser.newContext({viewport:{width,height:960},hasTouch:width<500,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.errors.push(e.message));
  await check(width+': original and transformed equations share the same intersection',async()=>{
   await open(page,'gap-002','equations');assert.equal(await page.locator('[data-row-intersection]').count(),2);const original=await page.locator('.ex-me-equation-plot').first().innerHTML();await page.locator('.ex-row-controls button[type=submit]').click();
   assert.equal(await page.locator('.ex-me-equation-plot').first().innerHTML(),original);const points=await page.locator('[data-row-intersection]').evaluateAll(nodes=>nodes.map(n=>[n.getAttribute('cx'),n.getAttribute('cy')]));assert.deepEqual(points[0],points[1]);
   await page.locator('[data-row-select="1"]').click();assert.equal(await page.locator('[data-row-line="1"].selected').count(),2);assert.equal(await page.evaluate(()=>document.activeElement?.dataset.rowSelect),'1');
  });
  await check(width+': 0=0 is shown as every point, not as a horizontal line',async()=>{
   await open(page,'gap-002','equations');await page.locator('[data-row-preset=dependent]').click();await eliminate(page);assert.equal(await page.locator('.ex-me-equation-plot').last().locator('[data-row-line]').count(),1);assert.match(await page.locator('[data-row-geometry]').textContent(),/平面上の全て/);assert.equal(await page.locator('[data-row-intersection]').count(),0);
  });
  await check(width+': 0=1 is shown as no point and inverse has no misleading equation plot',async()=>{
   await open(page,'gap-002','equations');await page.locator('[data-row-preset=inconsistent]').click();await eliminate(page);assert.match(await page.locator('[data-row-line-kind=empty]').textContent(),/どの点も|満たす点はない/);assert.equal(await page.locator('[data-row-intersection]').count(),0);
   await open(page,'gap-002','inverse');assert.equal(await page.locator('.ex-me-equation-plot').count(),0);
  });
  await check(width+': the two coordinate sections are unchanged when only direction is changed',async()=>{
   await open(page,'gap-006','gradient');assert.equal(await page.locator('[data-gradient-section]').count(),3);const before=await page.locator('[data-section-slope]').allTextContents();await action(page,'direction:level');const after=await page.locator('[data-section-slope]').allTextContents();assert.deepEqual(after.slice(0,2),before.slice(0,2));assert.ok(Math.abs(Number(after[2]))<1e-8);
  });
  await check(width+': moving P updates section centers and partial derivatives together',async()=>{
   await open(page,'gap-006','gradient');await page.locator('[data-sec-field=x]').fill('0');await page.locator('[data-sec-field=y]').fill('0');await action(page,'point');await action(page,'shape:saddle');assert.deepEqual(await page.locator('[data-section-slope]').allTextContents(),['0','0','0']);
   const paths=await page.locator('.ex-me-section-curve').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('points')));assert.notEqual(paths[0],paths[1]);
  });
  await check(width+': equation and section panels fit the actual viewport',async()=>{
   for(const [id,chapter]of [['gap-002','equations'],['gap-006','gradient']]){await open(page,id,chapter);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.equal(await page.locator('.experience input[type=number]:invalid').count(),0);}
  });
  await mkdir('review-output/math-correspondence-screenshots',{recursive:true});
  for(const [id,chapter]of [['gap-002','equations'],['gap-006','gradient']]){await open(page,id,chapter);await page.screenshot({path:`review-output/math-correspondence-screenshots/${engine}-${width}-${id}.png`,fullPage:true});}
  await context.close();
 }
}catch(e){report.errors.push(String(e.stack||e));}
finally{await browser?.close();server.kill();report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;await mkdir('review-output',{recursive:true});await writeFile(`review-output/math-correspondence-${engine}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,cases:report.cases.filter(c=>!c.passed)},null,2));if(report.failed||report.errors.length)process.exitCode=1;}
