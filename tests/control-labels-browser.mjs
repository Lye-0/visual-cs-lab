import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,firefox,webkit} from 'playwright';
const name=process.env.BROWSER||'chromium',checks=[],errors=[],out='review-output/control-labels';let browser;
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
try{
 const base=await new Promise((resolve,reject)=>{let s='';const timer=setTimeout(()=>reject(Error('server timeout')),10000);server.stdout.on('data',d=>{s+=d;const m=s.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]+'/');}});server.on('error',reject);});
 browser=await {chromium,firefox,webkit}[name].launch({headless:true});
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<700});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'#/lab/c08-gate');await page.waitForSelector('.ex-field input[type=checkbox]');
  const real=page.locator('.ex-field input[type=checkbox]').first(),id=await real.getAttribute('id'),before=await real.isChecked();await page.locator(`label[for="${id}"]`).click();assert.equal(await real.isChecked(),before);await real.click();assert.equal(await real.isChecked(),!before);checks.push(width+': actual gate checkbox responds only on control');
  await page.goto(base+'#/lab/c09-cpu');await page.waitForSelector('.ex-field textarea');const code=page.locator('.ex-field textarea').first(),codeId=await code.getAttribute('id');await page.locator(`label[for="${codeId}"]`).click();assert.equal(await code.evaluate(e=>e===document.activeElement),false);await code.click();assert.equal(await code.evaluate(e=>e===document.activeElement),true);checks.push(width+': actual CPU editor label does not focus code');
  await page.evaluate(()=>{document.getElementById('main').innerHTML='<button id="anchor">別の操作</button><form id="fields"></form>';const form=document.getElementById('fields');for(const type of ['number','checkbox','radio','text','range','textarea']){const field=type==='textarea'?'<textarea id="f-textarea">原文</textarea>':`<input id="f-${type}" type="${type}" value="1" min="0" max="5">`;form.insertAdjacentHTML('beforeend',`<label id="l-${type}" style="display:block;padding:12px"><span>${type}のラベル</span>${field}</label>`);}form.insertAdjacentHTML('beforeend','<label for="external" id="external-label">別置きのラベル</label><input id="external" type="text" value="元の値">');});
  await page.waitForSelector('#f-number + .csl-number-step');
  for(const type of ['number','checkbox','radio','text','range','textarea']){
   const input=page.locator('#f-'+type),label=page.locator('#l-'+type),value=await input.inputValue(),checked=await input.evaluate(e=>!!e.checked);
   await page.locator('#anchor').focus();await label.locator(':scope > span:first-child').click();await label.click({position:{x:4,y:4}});if(width<700)await label.locator(':scope > span:first-child').tap();
   assert.equal(await input.evaluate(e=>e===document.activeElement),false,type);assert.equal(await input.inputValue(),value);assert.equal(await input.evaluate(e=>!!e.checked),checked);checks.push(width+': '+type+' label text/row/touch is inert');
  }
  await page.locator('#external-label').click();assert.equal(await page.locator('#external').evaluate(e=>e===document.activeElement),false);await page.locator('#external').fill('編集した値');assert.equal(await page.locator('#external').inputValue(),'編集した値');checks.push(width+': separate text label is inert; typing works');
  const number=page.locator('#f-number');await number.locator('..').locator('button').last().click();assert.equal(await number.inputValue(),'2');await number.focus();await page.keyboard.press('ArrowDown');assert.equal(await number.inputValue(),'1');
  await page.locator('#f-checkbox').focus();await page.keyboard.press('Space');assert.equal(await page.locator('#f-checkbox').isChecked(),true);await page.locator('#f-radio').click();assert.equal(await page.locator('#f-radio').isChecked(),true);await page.locator('#f-textarea').fill('書き換え');assert.equal(await page.locator('#f-textarea').inputValue(),'書き換え');checks.push(width+': direct numeric, keyboard, checkbox, radio and editor controls still work');
  await page.goto(base+'#/settings');await page.locator('#reduce-motion').waitFor({state:'attached'});const initial=await page.locator('#reduce-motion').isChecked();await page.getByText('動きを最小限にする',{exact:true}).click();assert.equal(await page.locator('#reduce-motion').isChecked(),initial);await page.locator('.toggle-switch').click();assert.equal(await page.locator('#reduce-motion').isChecked(),!initial);checks.push(width+': visible switch track works while its label is inert');
  await page.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({browser:name,passed:checks.length,errors}));
}finally{await browser?.close();server.kill();await mkdir(out,{recursive:true});await writeFile(`${out}/${name}.json`,JSON.stringify({checks,errors},null,2));}
