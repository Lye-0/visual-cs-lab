// Exercise the committed HTML/JS/CSS, not a generated test-only page.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
const name=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[name];if(!engine)throw Error('Unknown browser');
const report={sourceCommit:process.env.SOURCE_COMMIT||process.env.GITHUB_SHA||'local',engine:name,scope:'GAP-133..143',cases:[],errors:[]};
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4203'},stdio:['ignore','ignore','pipe']});let serverLog='',browser,serial=0;
server.stderr.on('data',d=>serverLog+=d);server.on('error',e=>serverLog+=e.message);
const base='http://127.0.0.1:4203/',ids=Array.from({length:11},(_,i)=>'gap-'+(133+i));
const field=(page,key)=>page.locator('[data-sec-field="'+key+'"]');
const state=page=>page.locator('[data-sec-state]').evaluate(el=>JSON.parse(el.dataset.secState));
const idle=page=>page.waitForFunction(()=>!document.querySelector('.experience [aria-busy="true"]'));
async function click(page,code){await page.locator('[data-sec-action="'+code+'"]').first().click();await idle(page);}
async function open(page,id,chapter=''){
 await page.goto(base+'?media='+ ++serial+'#/lab/'+id+(chapter?'?chapter='+chapter:''));
 await page.waitForFunction(({id,chapter})=>{const c=globalThis.CSL?.app?.current;if(!c?.experience||c.lab.id!==id||chapter&&c.chapter!==chapter)return false;const ch=CSL.experiences.find(id)?.chapters.find(x=>x.id===c.chapter);return ch&&c.completed.size>=ch.activities.length&&!document.querySelector('.experience [aria-busy="true"]');},{id,chapter},{timeout:20000});
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
  await open(page,'gap-133');const defs=await page.evaluate(ids=>ids.map(id=>({id,chapters:CSL.experiences.find(id).chapters.map(c=>({id:c.id,kinds:c.activities.map(a=>a.kind)}))})),ids);
  if(width===1440){report.chapters=defs.reduce((n,d)=>n+d.chapters.length,0);report.inventory=await page.evaluate(()=>CSL.experiences.inventory());}
  for(const d of defs)for(const ch of d.chapters)await check(width+'/'+d.id+'/'+ch.id+' render, labels and overflow',async()=>{
   await open(page,d.id,ch.id);assert.equal(await page.locator('[data-ex-kind]').count(),ch.kinds.length);
   assert.equal(await page.locator('.experience input[type="number"]:invalid').count(),0);
   assert.deepEqual(await page.locator('.experience label[for]').evaluateAll(ls=>ls.filter(l=>!document.getElementById(l.htmlFor)).map(l=>l.htmlFor)),[]);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   assert.deepEqual(await page.evaluate(()=>window.__csp),[]);
  });
  await check(width+': Fourier selection is reversible and the selected sample is kept',async()=>{
   await open(page,'gap-133');const before=await state(page);await click(page,'pair:2');assert.equal((await state(page)).keep.includes(2),false);
   assert.ok(await page.evaluate(()=>CSL.experiences.mediaDesk.fourierView(JSON.parse(document.querySelector('[data-sec-state]').dataset.secState)).error>.9));
   await click(page,'sample:7');assert.equal((await state(page)).sample,7);assert.match(await page.locator('[data-sec-board]').textContent(),/標本 n=7/);
   await click(page,'phase');assert.equal((await state(page)).phaseZero,true);await click(page,'undo');assert.equal((await state(page)).phaseZero,false);
   await click(page,'reset');assert.deepEqual(await state(page),before);
  });
  await check(width+': filtering edits input rather than a precomputed frame',async()=>{
   await open(page,'gap-134');await field(page,'index').fill('3');await field(page,'value').fill('-1');await click(page,'input');assert.equal((await state(page)).input[3],-1);
   await click(page,'feedback:0.6');await click(page,'sample:3');assert.equal(await field(page,'value').inputValue(),'-1');
   assert.match(await page.locator('[data-sec-board]').textContent(),/y\[3\]/);await click(page,'reset');assert.equal((await state(page)).input[3],0);
  });
  await check(width+': value precision and sampling time are independent',async()=>{
   await open(page,'gap-135');await click(page,'bits:8');const before=await state(page);assert.equal(before.rate,8);assert.equal(before.bits,8);
   assert.match(await page.locator('[data-sec-board]').textContent(),/全時刻で二つの標本値が同じ/);
   await click(page,'rate:20');assert.equal((await state(page)).bits,8);assert.match(await page.locator('[data-sec-board]').textContent(),/値に違い/);
   await click(page,'sample:19');await click(page,'rate:8');assert.equal((await state(page)).sample,7);
  });
  await check(width+': image cell and real neighborhood update together',async()=>{
   await open(page,'gap-136');await click(page,'cell:0');const input=page.locator('[data-sec-field^="pixel-0-"]');await input.fill('255');await click(page,'edit');assert.equal((await state(page)).pixels[0],255);
   await click(page,'operation:dilate');await click(page,'cell:0');assert.match(await page.locator('[data-sec-board]').textContent(),/画像外/);
   assert.equal(await page.locator('.ex-md-pixels [data-source="true"]').count(),4);
   await click(page,'bin:7');assert.equal((await state(page)).bin,7);await click(page,'reset');assert.equal((await state(page)).pixels[0],40);
  });
  await check(width+': depth and order are separate operations on the same vertices',async()=>{
   await open(page,'gap-137');await click(page,'cell:27');assert.match(await page.locator('[data-sec-board]').textContent(),/残る色は 手前/);
   await click(page,'depth');assert.match(await page.locator('[data-sec-board]').textContent(),/残る色は 奥/);
   await click(page,'reverse');assert.match(await page.locator('[data-sec-board]').textContent(),/残る色は 手前/);
   await click(page,'near:4.5');assert.match(await page.locator('[data-sec-board]').textContent(),/残る色は 背景/);
  });
  await check(width+': lighting rejects a zero vector without changing the surface',async()=>{
   await open(page,'gap-138');const old=await state(page);for(const key of ['lx','ly','lz'])await field(page,key).fill('0');await click(page,'light');assert.deepEqual(await state(page),old);assert.match(await page.locator('[data-sec-status]').textContent(),/0ベクトル/);
   await field(page,'lx').fill('1');await field(page,'lz').fill('1');await click(page,'light');assert.deepEqual((await state(page)).light,[1,0,1]);assert.equal((await state(page)).cell,old.cell);
   await click(page,'texture');assert.equal(await field(page,'lx').inputValue(),'1');await click(page,'cell:0');assert.match(await page.locator('[data-sec-board]').textContent(),/背景/);
  });
  await check(width+': Bezier pointer selection remains keyboard-operable after redraw',async()=>{
   await open(page,'gap-139','curve');await click(page,'select:1');const plane=page.locator('[data-md-plane]');await plane.scrollIntoViewIfNeeded();const bounds=await plane.boundingBox();
   await page.mouse.click(bounds.x+bounds.width*.6,bounds.y+bounds.height*.45);await idle(page);
   assert.equal(await page.evaluate(()=>document.activeElement?.hasAttribute('data-md-plane')),true);const before=await state(page);
   await page.keyboard.press('ArrowRight');await idle(page);const after=await state(page);assert.ok(after.points[1][0]>before.points[1][0]);assert.deepEqual(after.points[0],before.points[0]);
   assert.equal(Number(await field(page,'x-1').inputValue()),after.points[1][0]);
   await field(page,'t').fill('0');await click(page,'t');assert.equal((await state(page)).t,0);assert.match(await page.locator('[data-sec-board]').textContent(),/途中計算/);
  });
  await check(width+': DCT keeps original pixels and lets learner remove a coefficient',async()=>{
   await open(page,'gap-139','coefficients');const before=await state(page);await click(page,'dc');assert.deepEqual((await state(page)).keep,[0]);
   assert.ok(await page.evaluate(()=>CSL.experiences.mediaDesk.dctView(JSON.parse(document.querySelector('[data-sec-state]').dataset.secState)).back.flat().every(v=>Math.abs(v-130)<1e-9)));
   await click(page,'select:1');await click(page,'toggle');assert.deepEqual((await state(page)).pixels,before.pixels);assert.equal((await state(page)).keep.includes(1),true);await click(page,'all');assert.equal((await state(page)).keep.length,16);
  });
  await check(width+': register bits and the PWM counter are directly operated',async()=>{
   await open(page,'gap-140');await click(page,'bit:output:0');assert.equal((await state(page)).output,164);await click(page,'bit:direction:0');assert.equal((await state(page)).direction,241);
   await click(page,'compare:7');await click(page,'tick');assert.equal((await state(page)).counter,1);assert.equal((await state(page)).compare,7);
   await click(page,'undo');assert.equal((await state(page)).counter,0);
  });
  await check(width+': calibration needs measured references and preserves them across temperature change',async()=>{
   await open(page,'gap-141');await click(page,'calibrate');assert.equal((await state(page)).calibrated,false);assert.match(await page.locator('[data-sec-status]').textContent(),/二つ/);
   await click(page,'reference:0');await click(page,'reference:50');await click(page,'calibrate');const before=await state(page);assert.equal(before.calibrated,true);
   await field(page,'temperature').fill('30');await click(page,'temperature');assert.equal((await state(page)).temperature,30);assert.deepEqual((await state(page)).references,before.references);
   await click(page,'reset');assert.equal((await state(page)).temperature,25);
  });
  await check(width+': targets do not reset controller memory or plant state',async()=>{
   await open(page,'gap-142');await click(page,'advance:10');const before=await state(page);assert.equal(before.history.length,10);assert.ok(before.plants[0].I>0);
   await field(page,'target').fill('-0.5');await click(page,'target');assert.deepEqual((await state(page)).plants,before.plants);await click(page,'advance:1');assert.equal((await state(page)).history.length,11);assert.equal(await field(page,'target').inputValue(),'-0.5');
   await click(page,'undo');assert.deepEqual((await state(page)).plants,before.plants);await click(page,'reset');assert.equal((await state(page)).history.length,0);
  });
  await check(width+': learner chooses ready jobs; an invalid choice does not advance time',async()=>{
   await open(page,'gap-143');const before=await state(page);await click(page,'run:B@0');assert.deepEqual(await state(page),before);assert.match(await page.locator('[data-sec-status]').textContent(),/周期/);
   await click(page,'run:A@0');assert.equal((await state(page)).time,1);await click(page,'method:EDF');assert.equal((await state(page)).time,0);assert.equal((await state(page)).method,'EDF');
   await click(page,'run:A@0');await click(page,'run:A@0');await click(page,'run:B@0');assert.equal((await state(page)).time,3);
  });
  await check(width+': all original units remain alongside the authored media batch',async()=>{
   assert.equal(await page.evaluate(ids=>ids.every(id=>!!CSL.experiences.find(id)),ids),true);
   // Do not require a future lesson to remain absent. Full-314 coverage is checked independently.
   assert.equal(await page.evaluate(()=>CSL.labs.length),314);
  });
  await check(width+': route disposal, storage and request policies remain intact',async()=>{
   await open(page,'gap-139','curve');await click(page,'select:2');await page.goto(base+'#/catalog');await page.waitForSelector('#catalog-query');
   await page.keyboard.press('ArrowRight');await open(page,'gap-139','curve');assert.equal((await state(page)).selected,1);
   assert.deepEqual(httpErrors,[]);assert.deepEqual(await page.evaluate(()=>window.__csp),[]);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  });
  await mkdir('review-output/media-screenshots',{recursive:true});
  for(const [id,chapter]of [['gap-133','components'],['gap-136','pixels'],['gap-137','pixel'],['gap-139','curve'],['gap-142','states']]){
   await open(page,id,chapter);await page.screenshot({path:`review-output/media-screenshots/${name}-${width}-${id}.png`,fullPage:true});
  }
  await context.close();
 }
}catch(e){report.errors.push({message:String(e.stack||e)});console.error(e);}
finally{
 await browser?.close();server.kill();report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;
 await mkdir('review-output',{recursive:true});await writeFile(`review-output/media-${name}.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({...report,cases:report.cases.filter(c=>!c.passed)},null,2));if(report.failed||report.errors.length)process.exitCode=1;
}
