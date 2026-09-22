// Committed, separated assets over HTTP. No generated replacement lessons.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
const name=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[name];if(!engine)throw Error('Unknown browser');
const report={sourceCommit:process.env.SOURCE_COMMIT||process.env.GITHUB_SHA||'local',engine:name,scope:'GAP-122..132',cases:[],errors:[]};
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4202'},stdio:['ignore','ignore','pipe']});let serverLog='',browser,serial=0;
server.stderr.on('data',d=>serverLog+=d);server.on('error',e=>serverLog+=e.message);const base='http://127.0.0.1:4202/';
const ids=Array.from({length:11},(_,i)=>'gap-'+(122+i)),field=(page,key)=>page.locator('[data-sec-field="'+key+'"]'),state=page=>page.locator('[data-sec-state]').evaluate(el=>JSON.parse(el.dataset.secState));
const idle=page=>page.waitForFunction(()=>!document.querySelector('.experience [aria-busy="true"]'));
async function click(page,code){await page.locator('[data-sec-action="'+code+'"]').first().click();await idle(page);}
async function open(page,id,chapter=''){
 await page.goto(base+'?ai='+ ++serial+'#/lab/'+id+(chapter?'?chapter='+chapter:''));
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
  await open(page,'gap-122');const defs=await page.evaluate(ids=>ids.map(id=>({id,chapters:CSL.experiences.find(id).chapters.map(c=>({id:c.id,kinds:c.activities.map(a=>a.kind)}))})),ids);
  if(width===1440){report.chapters=defs.reduce((n,d)=>n+d.chapters.length,0);report.inventory=await page.evaluate(()=>CSL.experiences.inventory());}
  for(const d of defs)for(const ch of d.chapters)await check(width+'/'+d.id+'/'+ch.id+' render and labels',async()=>{
   await open(page,d.id,ch.id);assert.equal(await page.locator('[data-ex-kind]').count(),ch.kinds.length);
   assert.equal(await page.locator('.experience input[type="number"]:invalid').count(),0);
   assert.deepEqual(await page.locator('.experience label[for]').evaluateAll(ls=>ls.filter(l=>!document.getElementById(l.htmlFor)).map(l=>l.htmlFor)),[]);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   assert.deepEqual(await page.evaluate(()=>window.__csp),[]);
  });
  await check(width+': preprocessing has separate fit/apply and test does not refit',async()=>{
   await open(page,'gap-122');await click(page,'apply');assert.equal((await state(page)).stats,null);assert.match(await page.locator('[data-sec-status]').textContent(),/fit/);
   await click(page,'fit');await click(page,'apply');const before=await state(page);assert.equal(before.output[2].numeric.age.value,0);
   await click(page,'select:6');await field(page,'income').fill('2000');await field(page,'city').fill('Z');await click(page,'edit');assert.deepEqual((await state(page)).stats,before.stats);await click(page,'apply');assert.deepEqual((await state(page)).output[6].city,[0,0,1]);
   await click(page,'select:0');await field(page,'age').fill('100');await click(page,'edit');assert.equal((await state(page)).stats,null);
   await click(page,'reset');assert.equal((await state(page)).rows[0].age,20);
  });
  await check(width+': classifier pointer selection is followed by keyboard movement',async()=>{
   await open(page,'gap-123');const plane=page.locator('[data-ai-plane]');await plane.scrollIntoViewIfNeeded();const bounds=await plane.boundingBox();
   await page.mouse.click(bounds.x+bounds.width*.62,bounds.y+bounds.height*.48);await idle(page);assert.equal(await page.evaluate(()=>document.activeElement?.hasAttribute('data-ai-plane')),true);
   const before=await state(page);await page.keyboard.press('ArrowRight');await idle(page);assert.ok((await state(page)).point[0]>before.point[0]);
   await click(page,'method:tree');assert.equal((await state(page)).method,'tree');assert.match(await page.locator('[data-sec-board]').textContent(),/葉/);
   await click(page,'method:forest');assert.match(await page.locator('[data-sec-board]').textContent(),/最初の木だけ/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  });
  await check(width+': validation locks the choice and retains the fact test was seen across reset',async()=>{
   await open(page,'gap-124');await click(page,'fit');await click(page,'reveal');assert.equal((await state(page)).revealed,false);
   await click(page,'lock');await click(page,'reveal');assert.equal((await state(page)).revealed,true);await click(page,'reset');assert.equal((await state(page)).revealed,false);assert.match(await page.locator('[data-sec-board]').textContent(),/一度見ています/);
   await field(page,'degree').fill('3');await click(page,'fit');assert.equal(await field(page,'degree').inputValue(),'3');assert.equal((await state(page)).trials[0].degree,3);
  });
  await check(width+': gradient step changes real weights and the editable field is not stale',async()=>{
   await open(page,'gap-125');await click(page,'update');assert.equal((await state(page)).iterations,0);
   await field(page,'rate').fill('0.3');await click(page,'forward');await click(page,'backward');const old=await state(page);await click(page,'update');const after=await state(page);
   assert.equal(after.iterations,1);assert.notEqual(after.model.W1[0][0],old.model.W1[0][0]);
   const weight=page.locator('[data-sec-field^="weight-"]');assert.equal(Number(await weight.inputValue()),after.model.W1[0][0]);assert.equal(await field(page,'rate').inputValue(),'0.3');
   await click(page,'undo');assert.equal((await state(page)).iterations,0);assert.match(await page.locator('[data-sec-board]').textContent(),/連鎖律/);
  });
  await check(width+': learner chooses the A-star frontier and wrong choice is atomic',async()=>{
   await open(page,'gap-126');await click(page,'expand:0');const before=await state(page);const wrong=await page.evaluate(()=>{const s=JSON.parse(document.querySelector('[data-sec-state]').dataset.secState),rows=CSL.experiences.aiDesk.searchView(s).frontier;return rows.at(-1).id;});
   await click(page,'expand:'+wrong);assert.deepEqual(await state(page),before);assert.match(await page.locator('[data-sec-status]').textContent(),/最小/);
   const next=await page.evaluate(()=>CSL.experiences.aiDesk.searchView(JSON.parse(document.querySelector('[data-sec-state]').dataset.secState)).frontier[0].id);await click(page,'expand:'+next);assert.equal((await state(page)).expanded.length,2);await click(page,'undo');assert.deepEqual(await state(page),before);
  });
  await check(width+': Q learning separates experience from update and keeps the chosen action under slip',async()=>{
   await open(page,'gap-127');await field(page,'slip').check();await click(page,'move:1');let s=await state(page);assert.equal(s.position,4);assert.ok(s.Q.flat().every(v=>v===0));
   await field(page,'alpha').fill('1');await field(page,'gamma').fill('0');await click(page,'update');s=await state(page);assert.equal(s.Q[0][1],-.03);assert.equal(s.Q[0][2],0);await click(page,'restart');assert.equal((await state(page)).Q[0][1],-.03);
  });
  await check(width+': word boundaries change actual cost and keyboard focus survives',async()=>{
   await open(page,'gap-128');await page.locator('[data-sec-action="cut:3"]').focus();await page.keyboard.press('Enter');await idle(page);
   assert.equal(await page.evaluate(()=>document.activeElement?.dataset.secAction),'cut:3');const cost=await page.evaluate(()=>CSL.experiences.aiDesk.segmentView(JSON.parse(document.querySelector('[data-sec-state]').dataset.secState)).manual.cost);assert.equal(cost,13);
   await click(page,'context');assert.match(await page.locator('[data-sec-board]').textContent(),/合計 10/);await click(page,'reset');assert.match(await page.locator('[data-sec-board]').textContent(),/合計 5/);
  });
  await check(width+': TF-IDF query changes do not add unknown vocabulary and text remains inert',async()=>{
   await open(page,'gap-129');await field(page,'query').fill('zzzzunknown');await click(page,'query');assert.match(await page.locator('[data-sec-board]').textContent(),/定義できません/);
   await field(page,'query').fill('<img src=x onerror="window.AI_BUG=true">');await click(page,'query');assert.equal(await page.evaluate(()=>window.AI_BUG),undefined);assert.equal(await page.locator('.ex-ai-workspace img').count(),0);
   await click(page,'reset');await click(page,'word:network');await click(page,'document:1');assert.equal((await state(page)).document,1);
  });
  await check(width+': dependency transitions build an actual single-root tree',async()=>{
   await open(page,'gap-130');await click(page,'left');assert.deepEqual((await state(page)).arcs,[]);await click(page,'shift');await click(page,'shift');await click(page,'left');await click(page,'shift');await field(page,'label').selectOption('obj');await click(page,'right');await field(page,'label').selectOption('root');await click(page,'right');const s=await state(page);assert.equal(s.arcs.length,3);assert.deepEqual(s.stack,[0]);assert.deepEqual(s.buffer,[]);
  });
  await check(width+': attention changes V without changing weights and mask removes only future',async()=>{
   await open(page,'gap-131');const before=await page.evaluate(()=>CSL.experiences.aiDesk.attentionView(JSON.parse(document.querySelector('[data-sec-state]').dataset.secState)).weights);
   await click(page,'select:1');await field(page,'value0').fill('6');await click(page,'value');const after=await page.evaluate(()=>CSL.experiences.aiDesk.attentionView(JSON.parse(document.querySelector('[data-sec-state]').dataset.secState)));assert.deepEqual(after.weights,before);assert.ok(after.output[0]>2*before[0]);
   await click(page,'mask');const masked=await page.evaluate(()=>CSL.experiences.aiDesk.attentionView(JSON.parse(document.querySelector('[data-sec-state]').dataset.secState)));assert.deepEqual(masked.weights,[1,0]);assert.deepEqual(masked.output,[2,0]);
  });
  await check(width+': confusion cells show their evidence and edit only the evaluation example',async()=>{
   await open(page,'gap-132');const before=await state(page);await click(page,'cell:food:net');assert.equal(await page.locator('[data-sec-action^="select:"]').count(),1);await click(page,'select:3');await field(page,'text').fill('fresh fruit');await click(page,'edit');assert.deepEqual((await state(page)).training,before.training);
   const matrix=await page.evaluate(()=>CSL.experiences.aiDesk.evaluationView(JSON.parse(document.querySelector('[data-sec-state]').dataset.secState)).matrix);assert.deepEqual(matrix,[[2,0],[0,2]]);
  });
  await check(width+': retrieval labels change metrics but not score ranking',async()=>{
   await open(page,'gap-132','retrieval');const scores=await page.evaluate(()=>CSL.experiences.aiDesk.wordsView(JSON.parse(document.querySelector('[data-sec-state]').dataset.secState)).ranked.map(r=>r.score));await click(page,'relevance:0');await click(page,'relevance:1');assert.match(await page.locator('[data-sec-board]').textContent(),/未定義/);
   const after=await page.evaluate(()=>CSL.experiences.aiDesk.wordsView(JSON.parse(document.querySelector('[data-sec-state]').dataset.secState)).ranked.map(r=>r.score));assert.deepEqual(after,scores);
  });
  await check(width+': invalid input, reset and navigation do not leak handlers or mutate state',async()=>{
   await open(page,'gap-131');const before=await state(page);await field(page,'query0').fill('99');await click(page,'query');assert.deepEqual(await state(page),before);await click(page,'reset');assert.equal(await field(page,'query0').inputValue(),'1');
   await open(page,'gap-128');await click(page,'cut:3');assert.equal((await state(page)).cuts.filter(i=>i===3).length,1);await open(page,'gap-131');assert.deepEqual((await state(page)).query,[1,0]);assert.deepEqual(httpErrors,[]);assert.deepEqual(await page.evaluate(()=>window.__csp),[]);
  });
  await mkdir('review-output/ai-screenshots',{recursive:true});
  for(const [id,chapter]of [['gap-122','fit'],['gap-123','boundary'],['gap-125','gradient'],['gap-128','boundaries'],['gap-131','two-positions'],['gap-132','classification']]){
   await open(page,id,chapter);await page.screenshot({path:`review-output/ai-screenshots/${name}-${width}-${id}.png`,fullPage:true});
  }
  await context.close();
 }
}catch(e){report.errors.push({message:String(e.stack||e)});}
finally{
 await browser?.close();server.kill();await mkdir('review-output',{recursive:true});report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;
 await writeFile(`review-output/ai-${name}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,cases:undefined,inventory:report.inventory?{units:report.inventory.units,chapters:report.inventory.chapters,activities:report.inventory.activities}:undefined,failures:report.cases.filter(c=>!c.passed)},null,2));if(report.failed||report.errors.length)process.exitCode=1;
}
