import {fixtureUnits,fixtureInventory} from './lesson-fixtures.mjs';
// Tests the default authored pages, not the optional classic simulation view.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
const engine=process.env.BROWSER||'chromium';
const report={sourceCommit:process.env.GITHUB_SHA||'local',engine,cases:[],errors:[],inventory:null};
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4197'},stdio:['ignore','pipe','pipe']});
const base='http://127.0.0.1:4197/';let browser,serverError='';
server.stderr.on('data',d=>serverError+=d);server.on('error',e=>serverError+=e.message);
async function check(name,fn){try{await fn();report.cases.push({name,passed:true});}catch(e){report.cases.push({name,passed:false,error:String(e.stack||e)});console.error('FAIL '+name+'\n'+e.stack);}}
async function ready(page,id,chapter){
 await page.waitForFunction(({id,chapter})=>{const c=globalThis.CSL?.app?.current;return c?.experience&&c.lab.id===id&&(!chapter||c.chapter===chapter)&&!document.querySelector('.experience [aria-busy="true"]');},{id,chapter},{timeout:20000});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 assert.deepEqual(await page.evaluate(()=>CSL.app.current.errors),[]);
}
async function open(page,id,chapter){await page.goto(base+'#/lab/'+id+(chapter?'?chapter='+chapter:''));await ready(page,id,chapter);}
async function submit(page,selector){await page.locator(selector+' button[type=submit]').click();await ready(page,await page.evaluate(()=>CSL.app.current.lab.id));}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw Error(serverError||'server startup timeout');await sleep(100);}
 browser=await ({chromium,firefox,webkit}[engine]).launch({headless:true});report.browserVersion=browser.version();
 for(const [size,viewport]of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  const context=await browser.newContext({viewport,hasTouch:size==='mobile',reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(6000);
  await context.addInitScript(()=>{globalThis.__experienceCsp=[];document.addEventListener('securitypolicyviolation',e=>__experienceCsp.push(e.effectiveDirective+':'+e.blockedURI));});
  page.on('pageerror',e=>report.errors.push({size,message:e.message}));
  await page.goto(base);await page.waitForFunction(()=>globalThis.CSL?.app?.ready);
  const units=fixtureUnits.map(u=>({...u,chapters:u.chapters.map(c=>({id:c.id,kinds:c.activities.map(a=>a.kind)}))}));
  report.inventory=fixtureInventory;
  await check(size+': all 314 units are authored and all activity renderers exist',async()=>{
   assert.equal(units.length,314);assert.equal(report.inventory.units,314);
   assert.ok(units.every(u=>u.chapters.length>0)); // Each actual renderer is verified after its lazy route loads below.
  });
  for(const unit of units){
   if(!unit.chapters.length){report.cases.push({name:size+'/'+unit.id,passed:false,error:'No authored chapters'});continue;}
   // All chapters, including non-default modes, are exercised on both widths.
   for(const chapter of unit.chapters)await check(size+'/'+unit.id+'/'+chapter.id,async()=>{
    await open(page,unit.id,chapter.id);
    assert.equal(await page.locator('.experience h1').textContent(),unit.title);
    assert.equal(await page.locator('[data-ex-chapter]').getAttribute('data-ex-chapter'),chapter.id);
    assert.equal(await page.locator('[data-ex-activity]').count(),chapter.kinds.length);
    assert.equal(await page.locator('#reader-scrubber,[data-r-phase]').count(),0,'No compulsory old player/phases');
    assert.equal(await page.locator('.experience .ex-error').count(),0);
    const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+2,invalid:[...document.querySelectorAll('.experience input[type=number]')].filter(el=>!el.validity.valid).map(el=>el.name+':'+el.value),csp:__experienceCsp}));
    assert.equal(state.overflow,false,'Page must not overflow horizontally');assert.deepEqual(state.invalid,[],'Initial numbers must be valid');assert.deepEqual(state.csp,[]);
    const toggles=page.locator('.ex-model-scope summary');await toggles.click();assert.ok((await page.locator('.ex-model-scope').textContent()).length>80);await toggles.click();
   });
  }
  await check(size+': bits change the same pattern in both interpretations',async()=>{
   await open(page,'c01-bits');await page.locator('[data-bit-all]').click();assert.match(await page.locator('.ex-bit-readout').textContent(),/255/);assert.match(await page.locator('.ex-bit-readout').textContent(),/−128|\-1/);
   await page.locator('[data-bit-index="7"]').click();assert.equal(await page.locator('[data-bit-index="7"]').getAttribute('aria-pressed'),'false');
   assert.equal(await page.evaluate(()=>document.activeElement?.dataset.bitIndex),'7');
  });
  await check(size+': direct stack/queue preserve different removal orders',async()=>{
   for(const [id,expected]of [['c05-stack','3'],['c05-queue','7']]){
    await open(page,id);await page.locator('.ex-kind-container input[name=value]').fill('7');await submit(page,'.ex-kind-container form');
    await page.locator('.ex-kind-container input[name=value]').fill('3');await submit(page,'.ex-kind-container form');await page.locator('[data-container-take]').click();
    assert.ok((await page.locator('[data-container-state]').textContent()).includes('取り出した順：'+expected));
    await page.locator('[data-container-reset]').click();assert.match(await page.locator('[data-container-state]').textContent(),/いまは空/);
   }
  });
  await check(size+': row operations keep previous equations and undo removes only the last',async()=>{
   await open(page,'gap-002','equations');const before=await page.locator('[data-row-history]').textContent();
   await page.locator('.ex-row-controls button[type=submit]').click();const after=await page.locator('[data-row-history]').textContent();assert.notEqual(after,before);assert.ok(after.includes('初期の式'));
   await page.locator('[data-row-undo]').click();assert.equal(await page.locator('[data-row-history]').textContent(),before);
   await page.locator('.ex-row-controls [name=kind]').selectOption('scale');await page.locator('.ex-row-controls [name=factor]').fill('0');await page.locator('.ex-row-controls button[type=submit]').click();assert.match(await page.locator('.ex-kind-rowlab [data-ex-status]').textContent(),/0倍/);
  });
  await check(size+': basis handles have keyboard alternatives and dependent vectors are explained',async()=>{
   await open(page,'gap-001','basis');await page.locator('[data-ex-handle=w]').focus();await page.keyboard.press('ArrowRight');assert.match(await page.locator('.ex-kind-vectors [data-ex-status]').textContent(),/2.25/);
   assert.equal(await page.evaluate(()=>document.activeElement?.dataset.exHandle),'w');await page.locator('[data-ex-parallel]').click();assert.match(await page.locator('[data-ex-explanation]').textContent(),/届きません/);
  });
  await check(size+': ODE advances by one step and can undo without clearing the family',async()=>{
   await open(page,'gap-008','family');const before=await page.locator('[data-ode-table]').textContent();await page.locator('[data-ode-step]').click();assert.notEqual(await page.locator('[data-ode-table]').textContent(),before);assert.ok(await page.locator('.ex-family-line').count()>1);await page.locator('[data-ode-back]').click();assert.equal(await page.locator('[data-ode-table]').textContent(),before);
  });
  await check(size+': lost update is controlled by instruction order, not a prerecorded movie',async()=>{
   await open(page,'c12-race');for(const actor of ['A','B','A','B','A','B'])await page.locator(`[data-race-actor=${actor}]`).click();assert.equal(await page.locator('.ex-shared-value strong').textContent(),'120');
   await page.locator('[data-race-reset=true]').click();for(const actor of ['A','B','A','A','B','B','B'])await page.locator(`[data-race-actor=${actor}]`).click();assert.equal(await page.locator('.ex-shared-value strong').textContent(),'130');
  });
  await check(size+': switch learns the source and changes flooding to directed forwarding',async()=>{
   await open(page,'n03-switch');await submit(page,'.ex-kind-switch form');assert.match(await page.locator('[data-switch-log]').textContent(),/2, 3/);
   await page.locator('.ex-kind-switch [name=from]').selectOption('B');await page.locator('.ex-kind-switch [name=to]').selectOption('A');await submit(page,'.ex-kind-switch form');assert.match(await page.locator('[data-switch-log]').textContent(),/表で宛先が分かった/);
  });
  await check(size+': TCP delivery and acknowledgement represent separate knowledge',async()=>{
   await open(page,'n11-tcp');await page.locator('[data-tcp-send]').click();await page.locator('[data-tcp-deliver]').first().click();
   assert.match(await page.locator('.ex-side-by-side>section').first().textContent(),/ACKで確認できた範囲：まだない/);
   await page.locator('[data-tcp-deliver]').first().click();assert.match(await page.locator('.ex-side-by-side>section').first().textContent(),/ACKで確認できた範囲：1〜1/);
   await page.locator('[data-tcp-reset]').click();assert.equal(await page.locator('[data-tcp-deliver]').count(),0);
  });
  await check(size+': error, source edits and navigation cannot leak stale computations',async()=>{
   await open(page,'c01-markov');const form=page.locator('.ex-kind-ledger form');await form.locator('[name=a]').fill('');await form.locator('[name=a]').press('Tab');
   assert.match(await page.locator('.ex-kind-ledger [data-ex-result]').textContent(),/編集中/);await page.locator('.ex-kind-ledger [data-ex-reset]').click();await ready(page,'c01-markov');assert.equal(await page.locator('.ex-kind-ledger [name=a]').inputValue(),'30');
   await open(page,'s03-aes');await page.goto(base+'#/lab/c05-stack');await ready(page,'c05-stack');await page.waitForTimeout(150);assert.equal(await page.locator('[data-ex-lesson]').getAttribute('data-ex-lesson'),'c05-stack');
  });
  await check(size+': new object lesson exists and aliases share the same instance',async()=>{
   await open(page,'gap-037');await page.locator('[data-object-alias]').click();await page.locator('[data-object=a][data-method=add]').click();const values=await page.locator('.ex-kind-objects .ex-side-by-side strong').allTextContents();assert.deepEqual(values,['11','11']);
  });
  await check(size+': classic detail view remains available without corrupting a new lesson',async()=>{
   await page.goto(base+'#/lab/n11-tcp?view=classic');await page.waitForFunction(()=>CSL.app.current?.reader&&!!CSL.app.current.result);assert.equal(await page.locator('[data-r-phase]').count(),4);
   await open(page,'n11-tcp');await page.locator('h1').click();await page.keyboard.press(' ');assert.equal(await page.evaluate(()=>CSL.app.current.playing),false);
  });
  await mkdir('review-output/experience-screenshots',{recursive:true});
  for(const id of ['gap-002','gap-008','c01-entropy','c12-race','n11-tcp','s01-threat']){
   await open(page,id);await page.screenshot({path:`review-output/experience-screenshots/${engine}-${size}-${id}.png`,fullPage:true});
  }
  await context.close();
 }
}catch(e){report.errors.push({message:String(e.stack||e)});console.error(e);}
finally{
 await browser?.close();server.kill();report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;
 await mkdir('review-output',{recursive:true});await writeFile(`review-output/experiences-${engine}.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({sourceCommit:report.sourceCommit,engine,inventory:report.inventory,passed:report.passed,failed:report.failed,errors:report.errors,failures:report.cases.filter(c=>!c.passed)},null,2));
 if(report.failed||report.errors.length)process.exitCode=1;
}
