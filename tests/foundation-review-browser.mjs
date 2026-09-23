// Read-only tests against the linked HTML committed on the work branch.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
const name=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[name];if(!engine)throw Error('Unknown engine');
const report={sourceCommit:process.env.GITHUB_SHA||'local',engine:name,cases:[],errors:[],visualReview:'not-performed-by-this-test'};
const base='http://127.0.0.1:4219/',server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4219'},stdio:['ignore','ignore','pipe']});let serverLog='',browser,serial=0;
server.stderr.on('data',s=>serverLog+=s);server.on('error',e=>serverLog+=e.message);
const ids=['c01-bits','c01-hamming','c03-integral','c03-probability','c05-heap','c06-dp','c09-pipeline','c12-race'];
const field=(page,key)=>page.locator('[data-sec-field="'+key+'"]');
const state=page=>page.locator('[data-sec-state]').evaluate(el=>JSON.parse(el.dataset.secState));
const race=page=>page.locator('[data-race-state]').evaluate(el=>JSON.parse(el.dataset.raceState));
const idle=page=>page.waitForFunction(()=>!document.querySelector('.experience [aria-busy="true"]'));
async function click(page,code){await page.locator('[data-sec-action="'+code+'"]').first().click();await idle(page);}
async function open(page,id){
 const chapter=id==='c09-pipeline'||id==='c12-race'?'objects':'meaning';
 await page.goto(base+'?review='+ ++serial+'#/lab/'+id+'?chapter='+chapter);
 await page.waitForFunction(({id,chapter})=>{const c=globalThis.CSL?.app?.current;if(!c?.experience||c.lab.id!==id||c.chapter!==chapter)return false;const ch=CSL.experiences.find(id)?.chapters.find(ch=>ch.id===chapter);return ch&&c.completed.size>=ch.activities.length&&!document.querySelector('.experience [aria-busy="true"]');},{id,chapter},{timeout:18000});
 assert.deepEqual(await page.evaluate(()=>CSL.app.current.errors),[]);
}
async function check(title,fn){try{await fn();report.cases.push({title,passed:true});}catch(e){report.cases.push({title,passed:false,error:String(e.stack||e)});console.error('FAIL '+title+'\n'+e.stack);}}
try{
 for(let i=0;i<120;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===119)throw Error(serverLog||'Server unavailable');await sleep(100);}
 browser=await engine.launch({headless:true});report.version=browser.version();
 for(const width of [1440,390,320]){
  const ctx=await browser.newContext({viewport:{width,height:1000},hasTouch:width<500,reducedMotion:'reduce'}),page=await ctx.newPage(),http=[];page.setDefaultTimeout(10000);
  await ctx.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.effectiveDirective));});
  page.on('pageerror',e=>report.errors.push({width,message:e.message}));page.on('response',r=>{if(r.status()>=400)http.push(r.url());});
  for(const id of ids)await check(width+'/'+id+' entry, labels and document bounds',async()=>{
   await open(page,id);assert.equal(await page.locator('.experience input[type=number]:invalid').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   assert.deepEqual(await page.locator('.experience label[for]').evaluateAll(labels=>labels.filter(l=>!document.getElementById(l.htmlFor)).map(l=>l.htmlFor)),[]);
   assert.deepEqual(await page.evaluate(()=>window.__csp),[]);
  });
  await check(width+': zero bit sum has a real zero term and keyboard focus survives reset',async()=>{
   await open(page,'c01-bits');await page.locator('[data-bit-zero]').click();assert.match(await page.locator('.ex-bit-readout').textContent(),/符号なし：0 = 0/);
   assert.equal(await page.evaluate(()=>document.activeElement?.hasAttribute('data-bit-zero')),true);
   await page.locator('[data-bit-all]').focus();await page.keyboard.press('Enter');assert.match(await page.locator('.ex-bit-readout').textContent(),/255/);assert.equal(await page.evaluate(()=>document.activeElement?.hasAttribute('data-bit-all')),true);
  });
  await check(width+': sender, channel and receiver only advance on their own actions',async()=>{
   await open(page,'c01-hamming');assert.equal((await state(page)).sent,null);assert.equal(await page.locator('[data-fr-word=received]').count(),0);
   await click(page,'encode');assert.deepEqual((await state(page)).sent,[0,1,1,0,0,1,1]);await click(page,'flip:2');assert.equal((await state(page)).received,null);
   await click(page,'deliver');assert.equal((await state(page)).report,null);await click(page,'inspect');assert.equal((await state(page)).report.syndrome,3);assert.equal(await page.locator('[data-fr-word=repaired]').count(),0);
   await click(page,'check:4');assert.equal(await page.locator('[data-fr-word=received] .ex-fr-source').count(),4);
   await click(page,'correct');const s=await state(page);assert.deepEqual(s.repaired,s.sent);assert.match(await page.locator('[data-sec-board]').textContent(),/送信列も知る実験者/);
  });
  await check(width+': a later channel error does not alter the old reception, redelivery invalidates the old answer',async()=>{
   await open(page,'c01-hamming');await click(page,'encode');await click(page,'deliver');await click(page,'inspect');await click(page,'correct');const old=await state(page);
   await click(page,'flip:0');assert.deepEqual((await state(page)).received,old.received);assert.deepEqual((await state(page)).report,old.report);
   await click(page,'deliver');assert.equal((await state(page)).report,null);assert.equal((await state(page)).repaired,null);await click(page,'inspect');assert.equal((await state(page)).report.syndrome,1);
   await click(page,'undo');assert.equal((await state(page)).report,null);await click(page,'reset');assert.equal((await state(page)).sent,null);
  });
  await check(width+': two-bit counterexample is explained rather than marked recovered',async()=>{
   await open(page,'c01-hamming');for(const code of ['encode','flip:0','flip:1','deliver','inspect','correct'])await click(page,code);
   const s=await state(page);assert.notDeepEqual(s.repaired,s.sent);assert.match(await page.locator('[data-sec-board]').textContent(),/不一致/);assert.match(await page.locator('[data-sec-board]').textContent(),/単一誤りの仮定を超えています/);
   await click(page,'message:1');assert.equal((await state(page)).received,null);assert.equal((await state(page)).sent,null);
  });
  await check(width+': selecting an area term links the same interval and arithmetic',async()=>{
   await open(page,'c03-integral');await click(page,'select:3');assert.equal((await state(page)).selected,3);assert.match(await page.locator('[data-sec-board]').textContent(),/選んだ区間4/);
   assert.equal(await page.locator('[data-fr-area="3"].is-active').count(),1);assert.equal(await page.locator('[data-sec-action="select:3"][aria-pressed=true]').count(),2);
   await page.locator('[data-sec-action="select:1"]').first().focus();await page.keyboard.press('Enter');await idle(page);assert.equal((await state(page)).selected,1);
  });
  await check(width+': plotting and integration preserve sign and the zero-width case',async()=>{
   await open(page,'c03-integral');await field(page,'start').fill('2');await field(page,'end').fill('0');await click(page,'configure');assert.match(await page.locator('[data-sec-board]').textContent(),/Δxは負/);
   assert.equal(await page.evaluate(()=>CSL.experiences.foundationReview.integralView(JSON.parse(document.querySelector('[data-sec-state]').dataset.secState)).sum),-2.75);
   await field(page,'end').fill('2');await click(page,'configure');assert.match(await page.locator('[data-sec-board]').textContent(),/幅は0/);assert.ok(!/NaN|Infinity/.test(await page.locator('.ex-fr-area-plot').innerHTML()));
   const s=await state(page);await field(page,'n').fill('0');await click(page,'configure');assert.deepEqual(await state(page),s);assert.match(await page.locator('[data-sec-status]').textContent(),/入力範囲/);await click(page,'reset');assert.equal((await state(page)).n,4);
  });
  await check(width+': clicking a trapezoid refocuses an equivalent keyboard control',async()=>{
   await open(page,'c03-integral');await page.locator('[data-fr-area="2"]').click();await idle(page);assert.equal((await state(page)).selected,2);assert.equal(await page.evaluate(()=>document.activeElement?.dataset.secAction),'select:2');
  });
  await check(width+': DP target and two predecessor cells describe actual numbers',async()=>{
   await open(page,'c06-dp');const s=await state(page);assert.equal(s.row,4);assert.equal(s.col,7);
   assert.equal(await page.locator('.ex-fr-dp .ex-fr-skip').count(),1);assert.equal(await page.locator('.ex-fr-dp .ex-fr-take').count(),1);assert.match(await page.locator('[data-sec-board]').textContent(),/max\(9, 11\) = 11/);
   await click(page,'select:4:1');assert.equal(await page.locator('.ex-fr-take').count(),0);assert.match(await page.locator('[data-sec-board]').textContent(),/負の容量を表に探しません/);
   await click(page,'select:0:1');assert.match(await page.locator('[data-sec-board]').textContent(),/使う品物がない行/);
  });
  await check(width+': empty capacity and edited item conditions update the real DP table',async()=>{
   await open(page,'c06-dp');await field(page,'capacity').fill('0');await click(page,'capacity');assert.equal((await state(page)).col,0);assert.equal(await page.locator('.ex-fr-dp tbody tr').first().locator('button').count(),1);
   await click(page,'reset');await page.locator('.ex-fr-details').last().locator('summary').click();await field(page,'value-3').fill('12');await click(page,'item:3');assert.equal((await state(page)).items[3].value,12);
   assert.equal(await page.evaluate(()=>CSL.experiences.foundationReview.knapsackView(JSON.parse(document.querySelector('[data-sec-state]').dataset.secState)).optimum),15);
   await click(page,'undo');assert.equal((await state(page)).items[3].value,8);
  });
  await check(width+': seed42 repeats exactly, another seed changes the observed experiment',async()=>{
   await open(page,'c03-probability');const section=page.locator('[data-ex-kind=inspect]'),input=section.locator('[name=seed]');assert.equal(await input.count(),1);assert.match(await section.textContent(),/試行列の番号/);
   const submit=async()=>{await section.locator('button[type=submit]').click();await idle(page);return section.locator('[data-ex-result]').textContent();};
   await input.fill('42');const first=await submit();await input.fill('43');const second=await submit();assert.notEqual(first,second);await input.fill('42');assert.equal(await submit(),first);
  });
  await check(width+': timeline buttons name the size of their actual records',async()=>{
   await open(page,'c05-heap');assert.match(await page.locator('[data-ex-next]').textContent(),/挿入/);await page.locator('[data-ex-next]').click();assert.match(await page.locator('[data-ex-frame] h4').textContent(),/を最小ヒープに追加$/);assert.equal(await page.locator('[data-ex-event][aria-current=step]').getAttribute('data-ex-event'),'1');
   await open(page,'c09-pipeline');assert.match(await page.locator('[data-ex-next]').textContent(),/命令/);await page.locator('[data-ex-next]').click();assert.match(await page.locator('[data-ex-kind=timeline] [data-ex-frame]').textContent(),/命令 2 を投入/);
  });
  await check(width+': unlocked lost update and locked completion use mode-specific explanations',async()=>{
   await open(page,'c12-race');assert.match(await page.locator('.experience').textContent(),/100に10と20/);
   for(const id of ['A','B','A','B','A','B'])await page.locator('[data-race-actor="'+id+'"]').click();assert.equal((await race(page)).shared,120);
   await page.locator('[data-race-reset=true]').click();assert.match(await page.locator('[data-race-mode-note]').textContent(),/読む前に待機/);
   await page.locator('[data-race-actor=A]').click();await page.locator('[data-race-actor=B]').click();assert.equal((await race(page)).actors.B.pc,0);
   await page.locator('[data-race-actor=A]').focus();await page.keyboard.press('Enter');assert.equal((await race(page)).actors.A.pc,2);assert.equal(await page.evaluate(()=>document.activeElement?.dataset.raceActor),'A');
   await page.keyboard.press('Enter');assert.equal((await race(page)).shared,110);assert.equal(await page.evaluate(()=>document.activeElement?.dataset.raceActor),'B');
   for(let i=0;i<3;i++)await page.keyboard.press('Enter');assert.equal((await race(page)).shared,130);
  });
  await check(width+': route disposal has no stale action, persistent study state or request error',async()=>{
   await open(page,'c01-hamming');await click(page,'encode');await page.goto(base+'#/catalog');await page.waitForSelector('#catalog-query');await page.keyboard.press('Enter');await open(page,'c01-hamming');assert.equal((await state(page)).sent,null);
   assert.deepEqual(http,[]);assert.deepEqual(await page.evaluate(()=>window.__csp),[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  });
  await mkdir('review-output/foundation-review-screenshots',{recursive:true});
  for(const id of ['c01-hamming','c03-integral','c06-dp','c12-race']){await open(page,id);await page.screenshot({path:`review-output/foundation-review-screenshots/${name}-${width}-${id}.png`,fullPage:true});}
  await ctx.close();
 }
}catch(e){report.errors.push({message:String(e.stack||e)});console.error(e);}
finally{await browser?.close();server.kill();report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;await mkdir('review-output',{recursive:true});await writeFile(`review-output/foundation-review-${name}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,cases:report.cases.filter(c=>!c.passed)},null,2));if(report.failed||report.errors.length)process.exitCode=1;}
