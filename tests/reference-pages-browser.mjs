import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,firefox,webkit} from 'playwright';
import {fixtureLabs} from './lesson-fixtures.mjs';
const name=process.env.BROWSER||'chromium',checks=[],errors=[],out='review-output/reference-pages';let browser;
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
try{
 const base=await new Promise((resolve,reject)=>{let s='';const timer=setTimeout(()=>reject(Error('server timeout')),10000);server.stdout.on('data',d=>{s+=d;const m=s.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]+'/');}});server.on('error',reject);});
 browser=await {chromium,firefox,webkit}[name].launch({headless:true});await mkdir(out,{recursive:true});
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',e=>errors.push(e.message));
  const nav=async(id)=>{const menu=page.locator('[data-action=menu]');if(await menu.isVisible()&&await menu.getAttribute('aria-expanded')!=='true')await menu.click();await page.locator(`[data-nav=${id}]`).click();};
  const counts=async()=>{await page.locator('.source-card').first().waitFor();const ids=await page.evaluate(()=>Object.keys(CSL.sources)),actual=await page.locator('.source-usage').allTextContents();assert.deepEqual(actual.map(s=>Number(s.match(/\d+/)[0])),ids.map(id=>fixtureLabs.filter(l=>l.sources.includes(id)).length));assert.equal(await page.locator('#breadcrumb-page').innerText(),'教材と参考資料');};
  await page.goto(base+'#/sources');await counts();assert.equal(await page.evaluate(()=>Object.keys(CSL.engines).length),0);assert.equal(await page.locator('script[src*="generated/lessons/"]').count(),0);checks.push(width+': cold sources renders full reference counts without loading models');
  await page.goto(base+'#/settings');await page.locator('#reduce-motion').waitFor();await nav('sources');await counts();await nav('settings');await page.locator('#reduce-motion').check();assert.equal(await page.evaluate(()=>CSL.app.settings.reduceMotion),true);checks.push(width+': actual sidebar links work in both directions');
  await page.locator('[data-action=glossary]').click();await page.locator('.modal').waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('.modal').count(),0);checks.push(width+': settings controls and glossary work before a lesson');
  await page.goto(base+'#/lab/n13-http');await page.waitForFunction(()=>CSL.app.current?.experience&&CSL.app.current.completed.size>0);await nav('sources');await counts();await nav('settings');await page.locator('#reduce-motion').waitFor();assert.ok((await page.locator('#main').innerText()).includes('キーボードで操作する'));checks.push(width+': pages remain available after lazy lesson loading');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(name==='chromium'){await page.screenshot({path:`${out}/settings-${width}.png`,fullPage:true});await nav('sources');await page.screenshot({path:`${out}/sources-${width}.png`,fullPage:true});}
  await page.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({browser:name,passed:checks.length,errors}));
}finally{await browser?.close();server.kill();await mkdir(out,{recursive:true});await writeFile(`${out}/${name}.json`,JSON.stringify({checks,errors},null,2));}
