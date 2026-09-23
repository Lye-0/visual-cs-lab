// Runs the committed HTML and assets. No test-only renderer or source changes.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
const name=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[name];if(!engine)throw Error('Unknown browser');
const out='review-output/multivariable',base='http://127.0.0.1:4229/';
const report={sourceCommit:process.env.GITHUB_SHA||'local',engine:name,cases:[],errors:[],screenshots:[],visualReview:'not-performed-by-test'};
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4229'},stdio:['ignore','ignore','pipe']});let browser,logs='';server.stderr.on('data',v=>logs+=v);server.on('error',e=>logs+=e.message);
const state=page=>page.locator('[data-sec-state]').evaluate(e=>JSON.parse(e.dataset.secState));
const field=(page,key)=>page.locator('[data-sec-field="'+key+'"]');
const idle=page=>page.waitForFunction(()=>!document.querySelector('.experience [aria-busy="true"]'));
const click=async(page,code)=>{await page.locator('[data-sec-action="'+code+'"]').first().click();await idle(page);};
const value=(page,kind)=>page.evaluate(kind=>CSL.experiences.multivariable[kind+'View'](JSON.parse(document.querySelector('[data-sec-state]').dataset.secState)),kind);
async function open(page,chapter){await page.goto(base+'#/lab/gap-006?chapter='+chapter);await page.waitForFunction(ch=>{const c=CSL?.app?.current,d=CSL.experiences.find('gap-006').chapters.find(x=>x.id===ch);return c?.experience&&c.lab.id==='gap-006'&&c.chapter===ch&&c.completed.size>=d.activities.length&&!document.querySelector('.experience [aria-busy="true"]');},chapter,{timeout:18000});}
async function check(id,fn){try{await fn();report.cases.push({id,passed:true});}catch(error){report.cases.push({id,passed:false,error:String(error.stack||error)});console.error('MULTI_FAIL '+id+' '+error.message);}}
async function capture(page,width,slug){const file=`${out}/${name}-${width}-${slug}.png`;await page.locator('.experience').screenshot({path:file});report.screenshots.push(file);}
try{
 await mkdir(out,{recursive:true});for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw Error(logs||'Server unavailable');await sleep(100);}
 browser=await engine.launch({headless:true});report.version=browser.version();
 for(const width of [1440,390,320]){
  const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<500,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(8000);
  await context.addInitScript(()=>{window.__multiCsp=[];document.addEventListener('securitypolicyviolation',e=>__multiCsp.push(e.effectiveDirective));});
  page.on('pageerror',e=>report.errors.push({width,message:e.message}));page.on('response',r=>{if(r.status()>=400)report.errors.push({width,url:r.url(),status:r.status()});});
  for(const ch of ['gradient','gradient-calculation','jacobian','jacobian-calculation','area','area-calculation'])await check(width+'/'+ch+'/entry',async()=>{
   await open(page,ch);assert.deepEqual(await page.evaluate(()=>CSL.app.current.errors),[]);assert.equal(await page.locator('[data-ex-kind]').count(),1);assert.equal(await page.locator('.experience input[type=number]:invalid').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(await page.evaluate(()=>__multiCsp),[]);
   assert.deepEqual(await page.locator('.experience label[for]').evaluateAll(a=>a.filter(l=>!document.getElementById(l.htmlFor)).map(l=>l.htmlFor)),[]);
   await capture(page,width,ch+'-initial');
  });
  await check(width+'/jacobian/correspondence',async()=>{
   await open(page,'jacobian');assert.equal(await page.locator('.ex-mv-plane').count(),2);
   for(let entry=0;entry<4;entry++){await click(page,'entry:'+entry);assert.equal((await state(page)).entry,entry);}
   await click(page,'corner:1');assert.deepEqual((await value(page,'local')).selected.predicted,[1,.5]);
   await click(page,'corner:2');const before=await value(page,'local');await click(page,'half');const after=await value(page,'local');assert.equal(after.outputExtent,before.outputExtent);assert.equal(before.absoluteError,4*after.absoluteError);assert.equal(await field(page,'h').inputValue(),'0.25');assert.deepEqual((await state(page)).point,[1,.5]);await capture(page,width,'jacobian-half');
  });
  await check(width+'/jacobian/zero-and-validation',async()=>{
   await open(page,'jacobian');await click(page,'preset:zero');const v=await value(page,'local');assert.equal(v.det,0);assert.equal(v.absoluteError,.5);assert.match(await page.locator('[data-sec-board]').textContent(),/一定という意味ではありません/);await capture(page,width,'jacobian-zero');
   const before=await state(page);await field(page,'x').fill('2');await click(page,'point');assert.deepEqual(await state(page),before);assert.match(await page.locator('[data-sec-status]').textContent(),/入力範囲/);await click(page,'reset');assert.equal(await field(page,'x').inputValue(),'1');
  });
  await check(width+'/area/selection-versus-membership',async()=>{
   await open(page,'area');await click(page,'cell:5');const v=await value(page,'region');assert.equal(v.count,16);assert.equal(v.selected.height,.5625);await click(page,'toggle');const removed=await value(page,'region');assert.equal(removed.sum,v.sum-v.selected.raw);assert.equal(removed.selected.height,v.selected.height);assert.equal(removed.count,15);await capture(page,width,'area-excluded');
   await click(page,'undo');assert.equal((await value(page,'region')).count,16);
  });
  await check(width+'/area/edit-and-keyboard',async()=>{
   await open(page,'area');await click(page,'mode:edit');await click(page,'cell:0');assert.equal((await state(page)).included[0],false);
   const original=(await state(page)).included;await page.keyboard.press('ArrowUp');await idle(page);assert.equal((await state(page)).selected,4);assert.deepEqual((await state(page)).included,original);assert.equal(await page.evaluate(()=>document.activeElement?.dataset.mvCell),'4');await page.keyboard.press('Enter');await idle(page);assert.equal((await state(page)).included[4],false);
   await click(page,'mode:inspect');await click(page,'cell:3');assert.equal((await state(page)).included[3],true);
  });
  await check(width+'/area/region-preserving-refinement',async()=>{
   await open(page,'area');await click(page,'preset:L');const v=await value(page,'region');assert.equal(v.area,.75);await capture(page,width,'area-L');await click(page,'refine');const fine=await value(page,'region');assert.equal((await state(page)).n,8);assert.equal(fine.area,v.area);assert.ok(Math.abs(fine.exact-v.exact)<1e-9);assert.ok(Math.abs(4*fine.error-v.error)<1e-9);await capture(page,width,'area-L-refined');
   await click(page,'refine');assert.equal((await state(page)).n,16);assert.equal(await page.locator('[data-sec-action=refine]').isDisabled(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await click(page,'undo');assert.equal((await state(page)).n,8);
  });
  await check(width+'/area/signed-height-and-open-context',async()=>{
   await open(page,'area');const details=page.locator('[data-sec-view=domain-coefficients]');await details.locator('summary').click();for(const [key,v]of [['a','-1'],['b','-1'],['c','-2']])await field(page,key).fill(v);await click(page,'coefficients');const result=await value(page,'region');assert.equal(result.exact,-1.25);assert.equal(result.sum,-1.234375);assert.equal(result.area,1);assert.equal(await details.evaluate(e=>e.open),true);await capture(page,width,'area-negative');
   const s=await state(page);await field(page,'a').fill('8');await click(page,'coefficients');assert.deepEqual(await state(page),s);await click(page,'reset');assert.deepEqual((await state(page)).coefficients,[1,1,2]);
  });
  await check(width+'/area/empty-and-draft',async()=>{
   await open(page,'area');await click(page,'preset:empty');const v=await value(page,'region');assert.equal(v.area,0);assert.equal(v.sum,0);assert.ok(v.selected.height>0);await click(page,'toggle');assert.equal((await value(page,'region')).count,1);
   await page.locator('[data-sec-view=domain-coefficients] summary').click();await field(page,'a').fill('2');await click(page,'cell:3');assert.equal(await field(page,'a').inputValue(),'2');assert.equal((await state(page)).coefficients[0],1);
  });
  await check(width+'/navigation/no-persistent-progress',async()=>{
   await open(page,'area');await click(page,'preset:empty');await page.goto(base+'#/catalog');await page.waitForSelector('#catalog-query');await open(page,'area');assert.equal((await value(page,'region')).count,16);assert.equal((await state(page)).edit,false);assert.deepEqual(await page.evaluate(()=>__multiCsp),[]);
  });
  await context.close();
 }
}catch(error){report.errors.push({message:String(error.stack||error)});console.error(error);}
finally{await browser?.close();server.kill();report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;await mkdir(out,{recursive:true});await writeFile(`${out}/${name}.json`,JSON.stringify(report,null,2));console.log('MULTI_SUMMARY '+JSON.stringify({sourceCommit:report.sourceCommit,engine:name,passed:report.passed,failed:report.failed,errors:report.errors,failures:report.cases.filter(c=>!c.passed)}));if(report.failed||report.errors.length)process.exitCode=1;}
