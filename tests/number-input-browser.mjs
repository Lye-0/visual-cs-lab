import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,firefox,webkit} from 'playwright';
const engine=process.env.BROWSER||'chromium',out='review-output/number-input',checks=[],errors=[];
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});let browser;
try{
 const base=await new Promise((resolve,reject)=>{let s='';const timer=setTimeout(()=>reject(Error('server timeout')),10000);server.stdout.on('data',d=>{s+=d;const m=s.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]+'/');}});server.on('error',reject);});
 browser=await {chromium,firefox,webkit}[engine].launch({headless:true});await mkdir(out,{recursive:true});
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:850},hasTouch:width<700,reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'#/lab/c03-derivative');await page.waitForSelector('.ex-kind-ledger .csl-number');
  const x=page.locator('.ex-kind-ledger [name=x]'),group=x.locator('..');await x.fill('1.1');await group.locator('button').last().click();assert.equal(await x.inputValue(),'1.2');await group.locator('button').first().click();assert.equal(await x.inputValue(),'1.1');checks.push(width+': decimal step and model input events');
  await page.locator('.ex-kind-ledger button[type=submit]').click();await page.waitForFunction(()=>!document.querySelector('.experience [aria-busy=true]'));assert.deepEqual(await page.evaluate(()=>CSL.app.current.errors),[]);
  await group.screenshot({path:`${out}/number-${width}-${engine}.png`});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.evaluate(()=>{document.getElementById('main').innerHTML='<form id="test-number"><label for="number">調整する値</label><input id="number" name="value" type="number" min="-1" max="2" step="0.1" value="1.1" required><button type="reset">リセット</button></form>';window.numberEvents=[];for(const name of ['input','change'])document.getElementById('number').addEventListener(name,e=>window.numberEvents.push(e.type));});
  const input=page.locator('#number'),root=input.locator('..');await page.waitForFunction(()=>document.getElementById('number').parentElement.classList.contains('csl-number'));const down=root.locator('button').first(),up=root.locator('button').last();
  await up.focus();await page.keyboard.press('Enter');await page.keyboard.press('Enter');assert.equal(await input.inputValue(),'1.3');assert.equal(await up.evaluate(e=>e===document.activeElement),true);assert.deepEqual(await page.evaluate(()=>window.numberEvents),['input','change','input','change']);checks.push(width+': repeated keyboard activation and one event pair per change');
  await input.fill('2');await page.waitForFunction(()=>document.querySelector('#number').parentElement.lastElementChild.disabled);await down.click();assert.equal(await input.inputValue(),'1.9');await input.fill('-1');await page.waitForFunction(()=>document.querySelector('#number').nextElementSibling.disabled);checks.push(width+': upper and lower limits');
  await input.focus();await page.keyboard.press('ArrowUp');assert.equal(await input.inputValue(),'-0.9');await page.keyboard.press('ArrowDown');assert.equal(await input.inputValue(),'-1');checks.push(width+': native direct entry and arrow keys');
  await page.evaluate(()=>document.getElementById('number').readOnly=true);await page.waitForFunction(()=>[...document.querySelectorAll('.csl-number button')].every(b=>b.disabled));await page.evaluate(()=>{const i=document.getElementById('number');i.readOnly=false;i.disabled=true;});await page.waitForFunction(()=>[...document.querySelectorAll('.csl-number button')].every(b=>b.disabled));await page.evaluate(()=>document.getElementById('number').disabled=false);checks.push(width+': readonly and disabled state');
  await page.getByRole('button',{name:'リセット',exact:true}).click();assert.equal(await input.inputValue(),'1.1');await page.evaluate(()=>{const i=document.getElementById('number');i.step='any';i.max='5';});await up.click();assert.equal(await input.inputValue(),'2.1');checks.push(width+': form reset and free-precision step');
  await input.fill('');assert.equal(await input.evaluate(i=>i.checkValidity()),false);if(width<700)await up.tap();else await up.click();assert.equal(await input.inputValue(),'1');checks.push(width+': empty input recovery and touch/click');
  await page.goto(base+'#/lab/c03-derivative?view=classic');await page.waitForSelector('.reader-range-pair .csl-number');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await page.locator('input[type=number]').evaluateAll(xs=>xs.every(i=>i.parentElement.classList.contains('csl-number'))),true);checks.push(width+': classic lesson coverage and layout');
  await page.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({engine,passed:checks.length,errors}));
}finally{await browser?.close();server.kill();await mkdir(out,{recursive:true});await writeFile(`${out}/${engine}.json`,JSON.stringify({engine,checks,errors},null,2));}
