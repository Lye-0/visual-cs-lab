// Inspect the real native scroll containers, including Windows-style classic
// scrollbar pseudo-elements, without replacing the page with test markup.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,firefox,webkit} from 'playwright';
const name=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[name];
if(!engine)throw Error('Unknown BROWSER');
const report={sourceCommit:process.env.GITHUB_SHA||'local',engine:name,cases:[],errors:[]};
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4193'},stdio:['ignore','pipe','pipe']});
let browser,serverLog='';server.stdout.on('data',b=>serverLog+=b);server.stderr.on('data',b=>serverLog+=b);server.on('error',e=>serverLog+=e.message);
const base='http://127.0.0.1:4193/';
async function check(title,fn){try{await fn();report.cases.push({name:title,passed:true});}catch(error){report.cases.push({name:title,passed:false,error:String(error.stack||error)});console.error('FAIL '+title+'\n'+error.stack);}}
async function open(page,route=''){
 await page.goto(base+route);
 await page.waitForFunction(()=>globalThis.CSL?.app?.ready&&document.querySelector('.sidebar>nav'));
 if(route.includes('/lab/'))await page.waitForFunction(()=>{const c=CSL.app.current;return c?.reader&&c.result&&!c.pending&&!c.error;});
}
async function finish(context){await context.close();}
async function inspect(locator){return locator.evaluate(el=>{
 const s=getComputedStyle(el),custom=CSS.supports('selector(::-webkit-scrollbar)');
 const p=part=>getComputedStyle(el,'::-webkit-scrollbar'+part);
 return {custom,width:s.scrollbarWidth,color:s.scrollbarColor,overflow:s.overflowY,client:el.clientHeight,scroll:el.scrollHeight,
  ...(custom?{barWidth:p('').width,barHeight:p('').height,thumb:p('-thumb').backgroundColor,clip:p('-thumb').backgroundClip,radius:p('-thumb').borderTopLeftRadius,button:p('-button').display,track:p('-track').backgroundColor}:{} )};
 });}
function assertTheme(s){
 if(s.custom){assert.equal(s.width,'auto');assert.equal(s.color,'auto');assert.equal(s.barWidth,'10px');assert.equal(s.barHeight,'10px');assert.equal(s.thumb,'rgb(97, 117, 130)');assert.equal(s.clip,'padding-box');assert.equal(s.radius,'999px');assert.equal(s.button,'none');assert.equal(s.track,'rgba(0, 0, 0, 0)');}
 else {assert.equal(s.width,'thin');assert.ok(s.color.startsWith('rgb(97, 117, 130)'),s.color);}
}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw Error(serverLog||'server startup failed');await sleep(100);}
 browser=await engine.launch({headless:true});report.browser=browser.version();
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>report.errors.push(e.message));
 await open(page);
 const nav=page.locator('.sidebar>nav');
 await check('sidebar uses a quiet native scrollbar, not the broad system track and arrows',async()=>{
  assert.equal(await page.evaluate(()=>matchMedia('(pointer:fine)').matches),true);
  const s=await inspect(nav);assert.ok(s.scroll>s.client);assert.equal(s.overflow,'auto');assertTheme(s);
  assert.equal(await page.evaluate(()=>CSL.labs.length),314);
  await mkdir('review-output/scrollbar-screenshots',{recursive:true});
  await page.locator('.sidebar').screenshot({path:`review-output/scrollbar-screenshots/${name}-sidebar.png`});
 });
 await check('wheel scroll stays inside the sidebar',async()=>{
  await nav.evaluate(el=>el.scrollTop=0);const box=await nav.boundingBox();const before=await page.evaluate(()=>scrollY);
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,350);
  await page.waitForFunction(()=>document.querySelector('.sidebar>nav').scrollTop>0);
  assert.equal(await page.evaluate(()=>scrollY),before);
 });
 await check('keyboard users can still scroll the navigation',async()=>{
  await nav.locator('a').first().focus();await nav.evaluate(el=>el.scrollTop=0);
  await page.keyboard.press('PageDown');await page.waitForFunction(()=>document.querySelector('.sidebar>nav').scrollTop>0);
 });
 await check('theme panel, lesson diagram and code input use the same finish',async()=>{
  await open(page,'#/catalog?domain=math');assertTheme(await inspect(page.locator('.library-category-panel')));
  await open(page,'#/lab/c16-git');assertTheme(await inspect(page.locator('#reader-diagram')));
  assertTheme(await inspect(page.locator('.reader-field textarea').first()));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 });
 await check('native horizontal and vertical overflow are preserved',async()=>{
  const s=await page.evaluate(()=>{
   const box=document.createElement('div');box.className='table-wrap';box.style.cssText='width:220px;height:100px;overflow:auto';
   const content=document.createElement('div');content.style.cssText='width:1400px;height:400px';box.append(content);document.querySelector('#main').append(box);
   box.scrollLeft=80;box.scrollTop=60;const result={left:box.scrollLeft,top:box.scrollTop};box.remove();return result;
  });assert.deepEqual(s,{left:80,top:60});
 });
 await check('forced colors restores platform scrollbars instead of hiding the control',async()=>{
  await page.emulateMedia({forcedColors:'active'});await open(page);
  assert.equal(await page.evaluate(()=>matchMedia('(forced-colors:active)').matches),true);
  const s=await inspect(nav);assert.equal(s.width,'auto');assert.equal(s.color,'auto');
  await nav.evaluate(el=>el.scrollTop=80);assert.equal(await nav.evaluate(el=>el.scrollTop),80);
  await page.emulateMedia({forcedColors:'none'});
 });
 await finish(context);
 await check('touch viewport keeps native scrolling and fits without horizontal overflow',async()=>{
  const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,...(name==='firefox'?{}:{isMobile:true}),reducedMotion:'reduce'});
  try{
   const page=await mobile.newPage();page.on('pageerror',e=>report.errors.push(e.message));await open(page);
   await page.locator('.mobile-menu').click();
   const nav=page.locator('.sidebar>nav');await nav.waitFor({state:'visible'});
   const s=await inspect(nav),coarse=await page.evaluate(()=>matchMedia('(pointer:coarse)').matches);
   if(coarse){assert.equal(s.width,'auto');assert.equal(s.color,'auto');}else assertTheme(s);
   await nav.evaluate(el=>el.scrollTop=100);assert.ok(await nav.evaluate(el=>el.scrollTop>0));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   await page.locator('.sidebar').screenshot({path:`review-output/scrollbar-screenshots/${name}-mobile.png`});
  }finally{await finish(mobile);}
 });
}catch(error){report.errors.push(String(error.stack||error));}
finally{
 await browser?.close();server.kill();
 report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;
 await mkdir('review-output',{recursive:true});await writeFile(`review-output/scrollbars-${name}.json`,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));if(report.failed||report.errors.length)process.exitCode=1;
}
