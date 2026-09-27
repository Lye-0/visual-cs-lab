import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium,firefox,webkit} from 'playwright';
const engine=process.env.BROWSER||'chromium',server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});let browser;
try{
 const base=await new Promise((resolve,reject)=>{let log='';const timer=setTimeout(()=>reject(Error(log)),10000);server.stdout.on('data',part=>{log+=part;const found=log.match(/http:\/\/127\.0\.0\.1:\d+/);if(found){clearTimeout(timer);resolve(found[0]+'/');}});server.on('error',reject);});
 browser=await({chromium,firefox,webkit}[engine]).launch({headless:true});
 for(const width of [390,320]){
  const page=await browser.newPage({viewport:{width,height:3200},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const view of ['authored','classic','experiment']){
   const classic=view==='classic',experiment=view==='experiment',selector=key=>classic?'#reader-input-'+key+'-number':experiment?'#num-p-'+key:'[data-ex-form] [name='+key+']';
   await page.goto(base+'#/lab/c18-projection'+(classic?'?view=classic':experiment?'?view=experiment':''));
   const graph=page.locator(experiment?'#visualization svg[data-orbit-projection]':'svg[data-orbit-projection]');await graph.waitFor();
   assert.equal(await graph.evaluate(el=>getComputedStyle(el).touchAction),'none');
   const box=await graph.boundingBox(),x=box.x+box.width*.5,y=box.y+Math.min(80,box.height*.5),field=key=>page.locator(selector(key));
   assert.equal(Number(await field('angle').inputValue()),30);assert.equal(Number(await field('pitch').inputValue()),0);
   async function touch(type,points){
    if(engine==='chromium'){
     const session=page.__orbitCdp ||= await page.context().newCDPSession(page);
     await session.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,px,py])=>({id,x:px,y:py}))});
    }else await page.evaluate(({type,points})=>{
     const svg=document.querySelector('svg[data-orbit-projection]'),root=svg.closest('.ex-activity-body,#reader-diagram,#visualization');
     for(const [id,px,py]of points){const target=type==='pointerdown'?svg:root;target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:id,isPrimary:id===1,button:type==='pointermove'?-1:0,buttons:type==='pointerup'?0:1,clientX:px,clientY:py}));}
    },{type,points});
   }
   if(engine==='chromium'){
    await touch('touchStart',[[1,x,y]]);await touch('touchMove',[[1,x+65,y-28]]);await touch('touchEnd',[]);
   }else{
    await touch('pointerdown',[[1,x,y]]);await touch('pointermove',[[1,x+65,y-28]]);await touch('pointerup',[[1,x+65,y-28]]);
   }
   await page.waitForFunction(({selector})=>Number(document.querySelector(selector.angle).value)<30&&Number(document.querySelector(selector.pitch).value)>0,{selector:{angle:selector('angle'),pitch:selector('pitch')}});
   const rotated=await graph.boundingBox(),cx=rotated.x+rotated.width*.5,cy=rotated.y+Math.min(80,rotated.height*.5),before=Number(await field('distance').inputValue());
   if(engine==='chromium'){
    await touch('touchStart',[[11,cx-24,cy],[12,cx+24,cy]]);await touch('touchMove',[[11,cx-65,cy],[12,cx+65,cy]]);await touch('touchEnd',[]);
   }else{
    await touch('pointerdown',[[11,cx-24,cy],[12,cx+24,cy]]);await touch('pointermove',[[11,cx-65,cy],[12,cx+65,cy]]);await touch('pointerup',[[11,cx-65,cy],[12,cx+65,cy]]);
   }
   await page.waitForFunction(({selector,before})=>Number(document.querySelector(selector).value)<before,{selector:selector('distance'),before});
  }
  assert.deepEqual(errors,[]);await page.close();console.log(engine+' '+width+' PASS');
 }
}finally{await browser?.close();server.kill();}
