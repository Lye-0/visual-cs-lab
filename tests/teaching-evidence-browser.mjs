import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,firefox,webkit} from 'playwright';
const name=process.env.BROWSER||'chromium',out='review-output/teaching-evidence';
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
let browser;const errors=[],checks=[];
try{
 const base=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('server timeout')),10000);server.stdout.on('data',d=>{text+=d;const m=text.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]+'/');}});server.on('error',reject);});
 browser=await {chromium,firefox,webkit}[name].launch({headless:true});await mkdir(out,{recursive:true});
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:960},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  const open=async(id,chapter)=>{await page.goto(base+'#/lab/'+id+(chapter?'?chapter='+chapter:''));await page.waitForFunction(({id,chapter})=>{const c=CSL.app.current;return c?.experience&&c.lab.id===id&&(!chapter||c.chapter===chapter)&&c.completed.size>0&&!document.querySelector('.experience [aria-busy=true]');},{id,chapter});assert.deepEqual(await page.evaluate(()=>CSL.app.current.errors),[]);};
  const pick=async(box)=>{const cell=box.locator('[data-r-focus]').first();await cell.waitFor({state:'visible'});const key=await cell.getAttribute('data-r-focus');await cell.focus();await page.keyboard.press('Enter');assert.equal(await box.locator(`[data-r-focus="${key}"]`).getAttribute('aria-pressed'),'true');assert.ok(await box.locator('.cv-focus-note').isVisible());};
  await open('gap-002','solutions');const record=page.locator('[data-ex-evidence="0"]');await pick(record);assert.equal(await record.locator('xpath=ancestor::details').count(),0);checks.push(width+': ledger matrix is visible and responds to keyboard');
  await page.locator('.ex-kind-ledger [name=rhs]').fill('6,1');assert.equal(await page.locator('[data-ex-evidence]').count(),0);await page.locator('.ex-kind-ledger button[type=submit]').click();await page.waitForSelector('[data-ex-evidence="0"]');assert.match(await record.innerText(),/6/);checks.push(width+': editing clears old evidence and execution replaces it');
  await page.screenshot({path:`${out}/ledger-${width}.png`,fullPage:true});
  await open('gap-006','gradient-calculation');let details=page.locator('.ex-derivation');assert.equal(await details.locator('[data-ex-record]').count(),0);await details.locator('summary').click();await pick(details.locator('[data-ex-evidence="0"]'));checks.push(width+': inspect derivation retains selectable intermediate matrix');
  await open('gap-021','choose');details=page.locator('[data-ex-comparison="0"] .ex-derivation');await details.locator('summary').click();await pick(details.locator('[data-ex-evidence="0"]'));checks.push(width+': comparison derivation selection stays in its own record');
  await open('gap-006','jacobian-calculation');assert.equal(await page.locator('.ex-inputs [name=a]').count(),0);assert.equal(await page.locator('.ex-inputs [name=x]').count(),1);assert.doesNotMatch(await page.locator('[data-ex-values=result]').innerText(),/関数値|偏微分 x/);assert.match(await page.locator('[data-ex-evidence="0"]').innerText(),/T₁/);const titles=await page.locator('.ex-chapters strong').allTextContents();assert.equal(new Set(titles).size,titles.length);checks.push(width+': Jacobian uses T rather than unrelated height coefficients');
  await open('c03-integral','calculation');await page.locator('.ex-kind-ledger [name=n]').fill('8');await page.locator('.ex-kind-ledger button[type=submit]').click();await page.waitForSelector('[data-ex-more]');const first=await page.locator('[data-ex-evidence="0"]').innerText();await page.locator('[data-ex-more]').click();assert.equal(await page.locator('[data-ex-evidence="0"]').innerText(),first);checks.push(width+': more calculation records preserve earlier evidence');
  await open('c01-information');await page.locator('.ex-model-scope summary').click();assert.equal(await page.locator('.ex-model-scope a[href=""],.ex-model-scope a[href="undefined"]').count(),0);checks.push(width+': reference without a URL is not an empty link');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({engine:name,passed:checks.length,errors}));
}finally{await browser?.close();server.kill();await mkdir(out,{recursive:true});await writeFile(`${out}/${name}.json`,JSON.stringify({engine:name,checks,errors},null,2));}



