// Exercise the committed multi-file site over HTTP, including a Pages subpath.
// No page.setContent, no asset bundling, and no build performed by this test.
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,firefox,webkit} from 'playwright';
import {browserModules,styles} from '../scripts/modules.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const name=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[name];
if(!engine)throw Error('BROWSER must be chromium, firefox or webkit');
const report={sourceCommit:process.env.SOURCE_COMMIT||process.env.GITHUB_SHA||'local',engine:name,cases:[],errors:[]};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname.startsWith('/visual-cs-lab/'))pathname=pathname.slice('/visual-cs-lab'.length);
  if(pathname==='/')pathname='/index.html';
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  const body=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
async function check(label,fn){try{await fn();report.cases.push({name:label,passed:true});}catch(e){report.cases.push({name:label,passed:false,error:String(e.stack||e)});console.error('FAIL '+label+'\n'+e.stack);}}
async function ready(page,id){
 await page.waitForFunction(id=>{const A=globalThis.CSL?.app,c=A?.current;return A?.ready&&c?.reader&&c.lab.id===id&&!c.pending&&!c.dirty&&!c.error&&!!c.result;},id,{timeout:20000});
 // The DOM lessons install their handlers and measure boxes after rendering.
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
try{
 browser=await engine.launch({headless:true});report.browserVersion=browser.version();
 for(const prefix of ['/','/visual-cs-lab/'])for(const [label,viewport]of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  const scenario=prefix+' '+label;
  const context=await browser.newContext({viewport,hasTouch:label==='mobile',...(name!=='firefox'?{isMobile:label==='mobile'}:{}),reducedMotion:'reduce'});
  await context.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push({directive:e.effectiveDirective,blocked:e.blockedURI}));});
  const page=await context.newPage();page.setDefaultTimeout(8000);
  const statuses=[];page.on('response',r=>{if(r.status()>=400)statuses.push({url:r.url(),status:r.status()});});
  page.on('pageerror',e=>report.errors.push({scenario,message:e.message}));
  const url=origin+prefix;
  await check(scenario+': cold load reads all external scripts/styles in manifest order',async()=>{
   await page.goto(url);await page.waitForFunction(()=>globalThis.CSL?.app?.ready&&document.querySelector('#home-query'));
   // page.goto() already waits for the load event. `networkidle` is not a
   // correctness signal here and can remain unsettled in Firefox even after
   // every required local script and stylesheet has loaded. The assertions
   // below verify the actual application resources directly instead.
   const state=await page.evaluate(()=>({scripts:[...document.scripts].map(s=>({src:s.getAttribute('src'),defer:s.defer,text:s.textContent})),css:[...document.querySelectorAll('link[rel="stylesheet"]')].map(l=>l.getAttribute('href')),loaded:[...document.styleSheets].filter(s=>s.href).length,units:CSL.labs.length,areas:CSL.areas.length,bg:getComputedStyle(document.body).backgroundColor,csp:window.__csp}));
   assert.equal(state.units,314);assert.equal(state.areas,20);
   assert.deepEqual(state.scripts.map(s=>s.src),browserModules.map(n=>`./src/${n}.js`));
   assert.ok(state.scripts.every(s=>s.defer&&s.text.trim()===''));
   assert.deepEqual(state.css,styles.map(n=>`./src/${n}.css`));assert.equal(state.loaded,styles.length);
   assert.equal(state.bg,'rgb(11, 14, 19)');assert.deepEqual(state.csp,[]);assert.deepEqual(statuses,[]);
   const external=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.initiatorType==='script'||r.initiatorType==='link').map(r=>r.name));
   assert.ok(external.length>=browserModules.length+styles.length);
   for(const asset of external)assert.ok(asset.startsWith(url),asset+' escaped the publishing subpath');
   const icon=await context.request.get(url+'assets/favicon.svg');assert.equal(icon.status(),200);assert.match(icon.headers()['content-type'],/image\/svg\+xml/);
  });
  for(const id of ['c01-entropy','n03-switch','n11-tcp','gap-002','gap-037','s03-aes','gap-148','gap-150','gap-154','gap-155'])await check(scenario+': '+id+' direct link, rewind, variant and reset',async()=>{
   await page.goto(url+'#/lab/'+id);await ready(page,id);
   assert.equal(await page.locator('[data-r-phase]').count(),4);
   assert.ok((await page.locator('#reader-guidance').textContent()).length>50);
   const count=await page.evaluate(()=>CSL.app.current.result.frames.length);
   if(count>1){
    await page.locator('[data-r-action="last"]').click();assert.equal(await page.evaluate(()=>CSL.app.current.index),count-1);
    await page.locator('[data-r-action="first"]').click();assert.equal(await page.evaluate(()=>CSL.app.current.index),0);
   }
   if(id==='n03-switch'){
    const colors=await page.locator('#reader-diagram .network-node rect').first().evaluate(el=>({fill:getComputedStyle(el).fill,stroke:getComputedStyle(el).stroke}));
    assert.notEqual(colors.fill,'rgb(0, 0, 0)');assert.notEqual(colors.stroke,'none');
   }
   await page.locator('[data-r-phase="2"]').click();await page.locator('[data-r-action="variant"]').click();await ready(page,id);
   assert.equal(await page.evaluate(()=>CSL.app.current.playing),false);
   await page.locator('[data-r-action="reset"]').first().click();await ready(page,id);
   const reset=await page.evaluate(()=>({params:CSL.app.current.params,defaults:CSL.app.current.lab.defaults,index:CSL.app.current.index}));
   assert.deepEqual(reset.params,reset.defaults);assert.equal(reset.index,0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   assert.deepEqual(await page.evaluate(()=>window.__csp),[]);
  });
  await check(scenario+': browser-native DOM, labels and undo work under the external-script CSP',async()=>{
   await page.goto(url+'#/lab/gap-148');await ready(page,'gap-148');
   const items=page.locator('#reader-diagram [data-cv-items] li');const initial=await items.allTextContents();
   assert.deepEqual(initial,['項目A','項目B','項目C']);
   await page.locator('#reader-diagram [data-cv-action="delete"]').click();
   const confirm=page.locator('#reader-diagram [data-cv-action="confirm"]');if(await confirm.isVisible())await confirm.click();
   // This lesson deliberately simulates latency (0..2000 ms). Wait for its
   // completion, not just the click, without replacing the model's timer.
   await page.waitForFunction(count=>document.querySelectorAll('#reader-diagram [data-cv-items] li').length===count,initial.length-1,{timeout:5000});
   assert.deepEqual(await items.allTextContents(),initial.slice(0,-1));
   await page.locator('#reader-diagram [data-cv-action="undo"]').click();assert.deepEqual(await items.allTextContents(),initial);
   await page.goto(url+'#/lab/gap-150');await ready(page,'gap-150');
   await page.locator('#reader-diagram .cv-demo input').fill('TCP');
   await page.locator('#reader-diagram [data-cv-action="access"]').click();
   assert.ok((await page.locator('#reader-diagram [data-cv-output]').textContent()).includes('TCP'));
   await page.goto(url+'#/lab/gap-154');await ready(page,'gap-154');
   await page.locator('#reader-diagram [data-cv-output] tbody tr').first().waitFor();
   assert.equal(await page.locator('#reader-diagram [data-cv-output] tbody tr').count(),4);
   assert.deepEqual(await page.evaluate(()=>window.__csp),[]);
  });
  await check(scenario+': prefix-compatible controls, blur fallback and native scrolling',async()=>{
   await page.goto(url+'#/lab/n11-tcp');await ready(page,'n11-tcp');
   const appearance=await page.locator('#reader-scrubber').evaluate(el=>{const s=getComputedStyle(el);return s.getPropertyValue('appearance')||s.getPropertyValue('-webkit-appearance');});assert.equal(appearance,'none');
   await page.locator('[data-action="search"]').first().click();await page.locator('.modal-backdrop').waitFor();
   const blur=await page.locator('.modal-backdrop').evaluate(el=>{const s=getComputedStyle(el);return {supported:CSS.supports('backdrop-filter','blur(1px)')||CSS.supports('-webkit-backdrop-filter','blur(1px)'),value:s.getPropertyValue('backdrop-filter')||s.getPropertyValue('-webkit-backdrop-filter'),background:s.backgroundColor};});
   if(blur.supported)assert.match(blur.value,/blur/);else assert.ok(blur.background);
   await page.keyboard.press('Escape');
   const scroll=await page.evaluate(()=>{
    // Emulate browsers ignoring optional scrollbar styling: normal overflow must remain.
    function removeOptional(rules){for(const r of rules){if(r.style){r.style.removeProperty('scrollbar-color');r.style.removeProperty('scrollbar-width');}if(r.cssRules)removeOptional(r.cssRules);}}
    for(const sheet of document.styleSheets)removeOptional(sheet.cssRules);
    const box=document.createElement('div');box.className='table-wrap';box.style.cssText='width:220px;height:100px;overflow:auto';
    const content=document.createElement('div');content.style.cssText='width:1000px;height:1000px';content.textContent='スクロールの確認';box.append(content);document.body.append(box);
    box.scrollTop=80;box.scrollLeft=60;const result={top:box.scrollTop,left:box.scrollLeft,vertical:box.scrollHeight>box.clientHeight,horizontal:box.scrollWidth>box.clientWidth};box.remove();return result;
   });assert.deepEqual(scroll,{top:80,left:60,vertical:true,horizontal:true});
  });
  await check(scenario+': all normal requests and script policies stayed valid',async()=>{assert.deepEqual(statuses,[]);assert.deepEqual(await page.evaluate(()=>window.__csp),[]);});
  await mkdir('review-output/static-screenshots',{recursive:true});
  await page.goto(url+'#/lab/n03-switch');await ready(page,'n03-switch');
  await page.screenshot({path:`review-output/static-screenshots/${name}-${prefix==='/'?'root':'project'}-${label}.png`,fullPage:true});
  await context.close();
 }
 await check('delaying the final deferred file cannot break startup or the curriculum catalogue',async()=>{
  const context=await browser.newContext();const page=await context.newPage();
  await page.route('**/src/curriculum-navigation.js',async route=>{await new Promise(resolve=>setTimeout(resolve,400));await route.continue();});
  page.on('pageerror',e=>report.errors.push({scenario:'delayed-defer',message:e.message}));
  await page.goto(origin+'/visual-cs-lab/#/catalog');
  await page.locator('[data-cv-catalogue]').waitFor({timeout:20000});
  assert.equal(await page.evaluate(()=>CSL.labs.length),314);assert.equal(await page.evaluate(()=>CSL.app.ready),true);
  await context.close();
 });
}catch(e){report.errors.push({message:String(e.stack||e)});}
finally{
 await browser?.close();server.close();server.closeAllConnections?.();
 report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;
 await mkdir('review-output',{recursive:true});await writeFile(`review-output/static-${name}.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));if(report.failed||report.errors.length)process.exitCode=1;
}
