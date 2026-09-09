// Actual HTTP documents only: do not use page.setContent or mocked Web Crypto.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright';

const output = 'review-output';
await mkdir(`${output}/screenshots`, {recursive:true});
const report = {sourceCommit:process.env.GITHUB_SHA || 'local', started:new Date().toISOString(), transport:'HTTP on 127.0.0.1', cases:[], errors:[]};
const server = spawn(process.execPath, ['scripts/server.mjs'], {env:{...process.env, PORT:'4175'}, stdio:['ignore','pipe','pipe']});
let serverLog = '';
server.stdout.on('data', data => serverLog += data);
server.stderr.on('data', data => serverLog += data);
const base = 'http://127.0.0.1:4175/';
let browser;
async function check(name, fn) {
 try { await fn(); report.cases.push({name, passed:true}); }
 catch (error) { report.cases.push({name, passed:false, error:String(error.stack || error)}); console.error(`FAIL ${name}\n${error.message}`); }
}
const ready = (page, id, reader=true) => page.waitForFunction(({id, reader}) => {
 const c=globalThis.CSL?.app.current;
 return c?.lab.id===id && Boolean(c.reader)===reader && !c.pending && !c.dirty && Boolean(c.result) && !c.error;
}, {id, reader}, {timeout:12000});
async function open(page, id, suffix='') {
 await page.goto(`${base}#/lab/${id}${suffix}`);
 await ready(page, id, !suffix.includes('experiment'));
}
const state = page => page.evaluate(() => {const c=CSL.app.current;return {id:c.lab.id,index:c.index,playing:c.playing,count:c.result.frames.length,params:c.params,metrics:c.result.metrics,phase:c.phase};});
const screenshotUnits = new Set(['c01-entropy','c01-linear-code','n01-forwarding','c10-address-spaces','c08-adder','n11-tcp','s10-cors','c16-git']);
try {
 for(let i=0;i<100;i++) {try { if((await fetch(base)).ok)break; }catch{} if(i===99)throw Error(serverLog || 'HTTP server did not start'); await sleep(100);}
 browser = await chromium.launch({headless:true});
 report.browser = browser.version();
 for (const [label, viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]) {
  const context = await browser.newContext({viewport, isMobile:label==='mobile',hasTouch:label==='mobile',reducedMotion:'reduce'});
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.on('pageerror', e => report.errors.push({viewport:label, url:page.url(), message:e.message}));
  await page.goto(base);
  await page.waitForFunction(() => !!globalThis.CSL?.app && document.querySelector('#home-query'));
  const labs = await page.evaluate(() => CSL.labs.map(l => ({id:l.id,unit:l.unit,controls:l.controls,patch:l.exploration.patch})));
  report.units = labs.length;
  await page.screenshot({path:`${output}/screenshots/home-${label}.png`,fullPage:true});
  await check(`${label}: 検索からエントロピーを直接開く`, async () => {
   await page.locator('#home-query').fill('エントロピー');
   await page.locator('#home-results a[href="#/lab/c01-entropy"]').waitFor();
   await page.locator('#home-results a[href="#/lab/c01-entropy"]').click();
   await ready(page,'c01-entropy');
  });
  for (const lab of labs) {
   await check(`${label}: ${lab.id}: 解説・図・四段階・比較・巻戻し`, async () => {
    await open(page,lab.id);
    assert.equal(await page.locator('.reader-title h1').textContent(),lab.unit);
    assert.ok((await page.locator('#reader-guidance').textContent()).length>60);
    assert.equal(await page.locator('[data-r-phase]').count(),4);
    const first = await state(page);
    const originalDiagram = await page.locator('#reader-diagram').innerHTML();
    const originalExplanation = await page.locator('#reader-event').textContent();
    assert.ok(originalDiagram.length>60);
    if(first.count>1) {
     await page.locator('[data-r-action="next"]').last().click();
     assert.equal((await state(page)).index,1);
     const slider=page.locator('#reader-scrubber');
     await slider.focus();await slider.press('End');
     assert.equal((await state(page)).index,first.count-1);
     await slider.press('Home');assert.equal((await state(page)).index,0);
     assert.equal(await page.locator('#reader-diagram').innerHTML(),originalDiagram);
     assert.equal(await page.locator('#reader-event').textContent(),originalExplanation);
    } else assert.equal(await page.locator('#reader-sequence-tools').isVisible(),false);
    await page.locator('[data-r-phase="1"]').click();
    assert.ok((await page.locator('#reader-guidance').textContent()).length>30);
    await page.locator('[data-r-phase="2"]').click();
    await page.locator('[data-r-action="variant"]').click();
    await ready(page,lab.id);
    const after=await state(page);
    for(const [key,value]of Object.entries(lab.patch)) assert.deepEqual(after.params[key],value,`${key} not applied`);
    assert.equal(after.playing,false);
    assert.ok(await page.locator('#reader-comparison table').count()>0);
    await page.locator('[data-r-phase="3"]').click();
    await page.locator('[data-r-answer]').first().click();
    assert.ok((await page.locator('#reader-answer-feedback').textContent()).length>10);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
    assert.equal(overflow,false,'page has horizontal overflow');
    if(screenshotUnits.has(lab.id)) await page.screenshot({path:`${output}/screenshots/${lab.id}-${label}.png`,fullPage:true});
   });
  }
  await check(`${label}: 再生・停止・途中再開・最終位置から再生`, async()=>{
   await open(page,'n11-tcp');
   await page.locator('#reader-speed').selectOption('4');
   await page.locator('#reader-play').click();
   await page.waitForFunction(()=>CSL.app.current.index>0);
   await page.locator('#reader-play').click();
   let s=await state(page);assert.equal(s.playing,false);let index=s.index;
   await sleep(350);assert.equal((await state(page)).index,index);
   await page.locator('#reader-play').click();
   await page.waitForFunction(i=>CSL.app.current.index>i,index);
   await page.locator('#reader-scrubber').focus();await page.locator('#reader-scrubber').press('End');
   assert.equal((await state(page)).playing,false);
   await page.locator('#reader-play').click();
   assert.ok((await state(page)).index<(await state(page)).count-1);
   await page.goto(`${base}#/`);await page.locator('#home-query').waitFor();await sleep(350);
   assert.equal(await page.evaluate(()=>CSL.app.current),null);
  });
  await check(`${label}: 即時入力・キーボードでビット変更`,async()=>{
   await open(page,'c01-bits');
   let before=(await state(page)).params.value;
   const bit=page.locator('[data-r-bit]').first();await bit.focus();await bit.press('Enter');await ready(page,'c01-bits');
   assert.notEqual((await state(page)).params.value,before);
  });
  await check(`${label}: 数値入力のエラーと復帰`,async()=>{
   await open(page,'n11-tcp');
   const numeric=page.locator('[data-r-number]').first();
   const original=await numeric.inputValue();
   await numeric.fill('');
   assert.equal(await page.evaluate(()=>CSL.app.current.result),null);
   assert.equal(await page.locator('#reader-play').isDisabled(),true);
   await numeric.fill(original);await ready(page,'n11-tcp');
  });
  await check(`${label}: 図と式の対応箇所を選ぶ`,async()=>{
   await open(page,'c01-entropy');
   const focus=page.locator('[data-r-focus]').first();await focus.click();
   assert.ok(await page.evaluate(()=>CSL.app.current.noteFocus));
  });
  for(const id of ['s03-aes','s04-hash','s04-hmac','s04-signature','s07-password']) {
   await check(`${label}: ${id}: ブラウザの実Web Cryptoで計算`,async()=>{
    await open(page,id);
    assert.equal(await page.evaluate(()=>isSecureContext&&!!crypto.subtle),true);
    assert.ok(Object.keys((await state(page)).metrics).length);
    await page.locator('[data-r-phase="2"]').click();await page.locator('[data-r-action="variant"]').click();await ready(page,id);
   });
  }
  await check(`${label}: 単元間の入力・比較・回答を保存しない`,async()=>{
   await open(page,'c01-entropy');await page.locator('[data-r-phase="2"]').click();await page.locator('[data-r-action="variant"]').click();await ready(page,'c01-entropy');
   await open(page,'c08-gate');await open(page,'c01-entropy');
   assert.equal((await state(page)).params.weights,'4,2,1,1');
   assert.equal(await page.evaluate(()=>CSL.app.current.baseline),null);
   assert.equal(await page.evaluate(()=>CSL.app.current.answer),null);
   assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  });
  for(const id of ['c16-git','n11-tcp','x01-build']) await check(`${label}: ${id}: 自由実験の既存画面も維持`,async()=>{
   await open(page,id,'?view=experiment');
   assert.equal(Boolean(await page.evaluate(()=>CSL.app.current.reader)),false);
   await page.locator('.reader-advanced-banner a').click();await ready(page,id);
  });
  await context.close();
 }
 await check('HTTP: ストレージが禁止されても起動',async()=>{
  const context=await browser.newContext();await context.addInitScript(()=>{
   for(const key of ['localStorage','sessionStorage'])Object.defineProperty(window,key,{get(){throw new Error('Storage disabled');}});
  });
  const page=await context.newPage();await open(page,'c01-entropy');await context.close();
 });
} catch(error){report.errors.push({message:String(error.stack||error)});}
finally {
 await browser?.close();server.kill();
 report.finished=new Date().toISOString();report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.filter(c=>!c.passed).length;
 await writeFile(`${output}/reader-browser.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({units:report.units,browser:report.browser,passed:report.passed,failed:report.failed,pageErrors:report.errors},null,2));
 if(report.failed||report.errors.length)process.exitCode=1;
}
