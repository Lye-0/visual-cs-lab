import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium,firefox,webkit} from 'playwright';
const name=process.env.BROWSER||'chromium',browserType={chromium,firefox,webkit}[name];
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});let browser;
try{
 const base=await new Promise((resolve,reject)=>{let log='';const timer=setTimeout(()=>reject(Error(log)),10000);server.stdout.on('data',chunk=>{log+=chunk;const match=log.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]+'/');}});server.on('error',reject);});
 browser=await browserType.launch({headless:true});
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:3200}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const view of ['authored','classic','experiment']){
   const classic=view==='classic',experiment=view==='experiment';
   await page.goto(base+'#/lab/c18-projection'+(classic?'?view=classic':experiment?'?view=experiment':''));
   await page.waitForSelector('svg[data-orbit-projection]');
   if(classic)await page.waitForFunction(()=>CSL.app.current?.reader&&CSL.app.current.result);
   else if(experiment)await page.waitForFunction(()=>CSL.app.current?.result&&document.querySelector('#visualization svg[data-orbit-projection]'));
   else await page.waitForFunction(()=>CSL.app.current?.experience&&CSL.app.current.completed.size===1);
   const selector=k=>classic?'#reader-input-'+k+'-number':experiment?'#num-p-'+k:'[data-ex-form] [name='+k+']',key=k=>page.locator(selector(k)),svg=page.locator(experiment?'#visualization svg[data-orbit-projection]':'svg[data-orbit-projection]');
   assert.equal(Number(await key('pitch').inputValue()),0);
   const before=await svg.innerHTML(),box=await svg.boundingBox();
   await page.mouse.move(box.x+box.width*.5,box.y+Math.min(100,box.height/2));
   await page.mouse.down({button:'middle'});await page.mouse.move(box.x+box.width*.61,box.y+Math.min(45,box.height*.2),{steps:6});await page.mouse.up({button:'middle'});
   await page.waitForFunction(({classic,experiment})=>{const field=k=>document.querySelector(classic?'#reader-input-'+k+'-number':experiment?'#num-p-'+k:'[data-ex-form] [name='+k+']');return Number(field('angle').value)!==30&&Number(field('pitch').value)!==0&&!document.querySelector(classic?'#reader-diagram[aria-busy=true]':experiment?'#visual-panel[aria-busy=true]':'[data-ex-result][data-update-state=pending]');},{classic,experiment});
   assert.notEqual(await svg.innerHTML(),before);assert.ok(Number(await key('angle').inputValue())<30,'右ドラッグではY回転角が減る');assert.ok(Number(await key('pitch').inputValue())>0);
   const d=Number(await key('distance').inputValue()),next=await svg.boundingBox();await page.mouse.move(next.x+next.width*.5,next.y+Math.min(100,next.height/2));await page.mouse.wheel(0,-180);
   await page.waitForFunction(({classic,experiment,d})=>Number(document.querySelector(classic?'#reader-input-distance-number':experiment?'#num-p-distance':'[data-ex-form] [name=distance]').value)<d,{classic,experiment,d});
   await page.locator('svg[data-orbit-projection]').focus();const pitch=Number(await key('pitch').inputValue());await page.keyboard.press('ArrowUp');
   await page.waitForFunction(({classic,experiment,pitch})=>Number(document.querySelector(classic?'#reader-input-pitch-number':experiment?'#num-p-pitch':'[data-ex-form] [name=pitch]').value)>pitch,{classic,experiment,pitch});
   await page.waitForFunction(()=>document.activeElement?.matches?.('svg[data-orbit-projection]'));
   const angle=Number(await key('angle').inputValue());await page.keyboard.press('ArrowRight');
   await page.waitForFunction(({classic,experiment,angle})=>Number(document.querySelector(classic?'#reader-input-angle-number':experiment?'#num-p-angle':'[data-ex-form] [name=angle]').value)<angle,{classic,experiment,angle});
   await page.waitForFunction(()=>document.activeElement?.matches?.('svg[data-orbit-projection]'));
   const rightAngle=Number(await key('angle').inputValue());await page.keyboard.press('ArrowLeft');
   await page.waitForFunction(({classic,experiment,rightAngle})=>Number(document.querySelector(classic?'#reader-input-angle-number':experiment?'#num-p-angle':'[data-ex-form] [name=angle]').value)>rightAngle,{classic,experiment,rightAngle});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   if(classic){await page.locator('[data-r-action=reset]').click();await page.waitForFunction(()=>CSL.app.current.params?.pitch===0);}
   else if(experiment){await page.locator('[data-action=reset]').first().click();await page.waitForFunction(()=>CSL.app.current.params?.pitch===0);}
   else{await page.locator('[data-ex-reset]').click();await page.waitForFunction(()=>document.querySelector('[data-ex-form] [name=pitch]').value==='0');}
   assert.equal(Number(await key('distance').inputValue()),5);
  }
  await page.goto(base+'#/lab/gap-004');await page.waitForSelector('[data-ex-lesson=gap-004]');assert.equal(await page.locator('svg[data-orbit-projection]').count(),0);
  assert.deepEqual(errors,[]);await page.close();console.log(name+' '+width+' PASS');
 }
}finally{await browser?.close();server.kill();}
