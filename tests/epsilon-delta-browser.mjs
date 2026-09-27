import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
const engine=process.env.BROWSER||'chromium',server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4237'},stdio:'ignore'}),base='http://127.0.0.1:4237/';let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await sleep(100);}
 browser=await({chromium,firefox,webkit}[engine]).launch({headless:true});await mkdir('review-output/epsilon-delta',{recursive:true});
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const open=async chapter=>{await page.goto(base+'#/lab/c03-epsilon-delta?chapter='+chapter);await page.waitForFunction(chapter=>CSL.app.current?.chapter===chapter&&CSL.app.current?.completed?.size===1,chapter);};
  const fill=async(key,value)=>{await page.locator('[name='+key+']').fill(String(value));await sleep(350);};
  for(const chapter of ['bands','order','proof','continuity','failure']){
   await open(chapter);assert.equal(await page.locator('.ed-plot').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(await page.evaluate(()=>CSL.app.current.errors),[]);
   assert.equal(await page.locator('.experience input:invalid').count(),0);
  }
  await open('bands');assert.match(await page.locator('[data-point]').textContent(),/この一点は条件を満たす/);assert.match(await page.locator('[data-range]').textContent(),/条件を破る/);
  await page.locator('[data-action=witness]').click();await sleep(50);assert.match(await page.locator('[data-point]').textContent(),/この一点が反例/);
  await page.locator('[data-action=safe]').click();await sleep(50);assert.match(await page.locator('[data-range]').textContent(),/すべての対象xで成立/);
  const delta=await page.locator('[name=delta]').inputValue();await page.locator('[data-action=epsilon]').click();await sleep(50);assert.equal(await page.locator('[name=delta]').inputValue(),delta);assert.match(await page.locator('[data-range]').textContent(),/条件を破る/);
  await page.evaluate(()=>{window.savedPlot=document.querySelector('.ed-plot');window.savedView=savedPlot.getAttribute('viewBox');});
  await fill('delta',.05);assert.match(await page.locator('[data-range]').textContent(),/すべての対象xで成立/);assert.equal(await page.evaluate(()=>savedPlot===document.querySelector('.ed-plot')&&savedView===savedPlot.getAttribute('viewBox')),true);
  await fill('x',1);assert.match(await page.locator('[data-point]').textContent(),/対象の範囲外/);
  await page.locator('.ed-plot').focus();await page.keyboard.press('ArrowRight');assert.equal(Number(await page.locator('[name=x]').inputValue()),1.01);
  await page.screenshot({path:`review-output/epsilon-delta/${engine}-${width}.png`,fullPage:true});
  await page.locator('[name=epsilon]').fill('0.3');await page.locator('[data-action=safe]').click();await page.waitForFunction(()=>document.querySelector('[name=delta]').value==='0.15');
  await open('proof');await page.locator('[data-action=safe]').click();await sleep(50);assert.match(await page.locator('[data-range]').textContent(),/すべての対象xで成立/);
  await open('continuity');const before=await page.locator('[data-range]').textContent();await page.locator('[name=pointValue]').selectOption('2',{force:true});await sleep(100);assert.equal(await page.locator('[data-range]').textContent(),before);assert.match(await page.locator('[data-proof]').textContent(),/一致するので連続/);
  await open('failure');await fill('epsilon',1);assert.match(await page.locator('[data-range]').textContent(),/すべての対象xで成立/);await page.locator('[data-action=challenge]').click();await fill('delta',.0001);await page.locator('[data-action=witness]').click();await sleep(50);assert.match(await page.locator('[data-point]').textContent(),/この一点が反例/);
  await page.locator('.ex-secondary a[href="#/lab/gap-004"]').click();await page.waitForSelector('[data-ex-lesson=gap-004]');assert.equal(await page.locator('.ex-secondary a[href="#/lab/c03-epsilon-delta"]').count(),1);
  assert.deepEqual(errors,[]);console.log(engine+' '+width+' PASS');await page.close();
 }
}finally{await browser?.close();server.kill();}
