// Real cold starts, then race/retry/navigation tests. Never preloads the library.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {chromium,firefox,webkit} from 'playwright';
import {spawn} from 'node:child_process';
const name=process.env.BROWSER||'chromium',browser=await {chromium,firefox,webkit}[name].launch({headless:true});
let base=process.env.BASE_URL,server;
if(!base){
 server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
 base=await new Promise((resolve,reject)=>{
  let output='';const timer=setTimeout(()=>reject(Error('Server startup timeout')),8000);
  server.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]+'/');}});
  server.on('error',e=>{clearTimeout(timer);reject(e);});
 });
}
const report={browser:name,passed:0,failures:[],cold:[],resources:{}};
const check=async(label,fn)=>{try{await fn();report.passed++;}catch(e){report.failures.push({label,error:e.stack});console.log('FAIL '+label+' '+e.message);}};
async function ready(page,id){await page.waitForFunction(id=>{const c=CSL.app.current;return c?.experience&&c.lab.id===id&&c.completed.size>=CSL.experiences.find(id).chapters.find(ch=>ch.id===c.chapter).activities.length;},id,{timeout:7000});}
try{
 const page=await browser.newPage();await page.goto(base);await page.waitForFunction(()=>CSL?.app?.ready);
 const ids=await page.evaluate(()=>CSL.labs.map(l=>l.id));
 await check('home has searchable metadata but no engines or lesson bodies',async()=>{
  assert.equal(ids.length,314);assert.equal(await page.evaluate(()=>Object.keys(CSL.engines).length),0);
  assert.equal(await page.evaluate(()=>CSL.experiences===undefined),true);
  assert.ok((await page.locator('.sidebar [data-nav^="domain-"]').count())===8);
  report.resources.home=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({name:r.name,bytes:r.decodedBodySize})));
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  assert.deepEqual(errors,[],'Leaving discovery must not call an unloaded player');
 });
 await page.close();
 // A full document reload clears JavaScript state. Reuse the transport context
 // to avoid exhausting Windows ephemeral ports across hundreds of cold routes.
 const coldContext=await browser.newContext(),coldPage=await coldContext.newPage();
 for(const id of process.env.ONLY?process.env.ONLY.split(','):ids){
  await check('cold '+id,async()=>{
   const p=coldPage,errors=[],onError=e=>errors.push(e.message);
   p.on('pageerror',onError);
   try{
    await p.goto(base+'?cold='+id+'#/lab/'+id);try{await ready(p,id);}catch(e){throw Error(e.message+'; '+errors.join('; ')+'; '+(await p.locator('#main').innerText()).slice(0,900));}
    assert.deepEqual(errors,[]);assert.deepEqual(await p.evaluate(()=>CSL.app.current.errors),[]);
    assert.equal(await p.evaluate(()=>CSL.labs.length),314);
    const requests=await p.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name));
    assert.equal(requests.filter(u=>u.includes('/generated/lessons/')).length,1);
    report.cold.push({id,scripts:requests.filter(u=>u.endsWith('.js')).length});
   }finally{p.off('pageerror',onError);}
  });
 }
 await coldContext.close();
 const context=await browser.newContext(),p=await context.newPage();
 await check('cancel a slow lesson by navigating home',async()=>{
  let release;const held=new Promise(r=>release=r);
  await p.route('**/generated/lessons/c16-git.js',async r=>{await held;await r.continue();});
  await p.goto(base+'#/lab/c16-git',{waitUntil:'domcontentloaded'});await p.locator('.loading-lesson').waitFor();
  await p.locator('.brand').click();release();
  await p.waitForFunction(()=>CSL.app.page==='home');await p.evaluate(()=>CSL.delivery.ensure('c16-git'));
  assert.equal(await p.locator('.experience').count(),0);assert.equal(await p.locator('#main[aria-busy]').count(),0);
  await p.unrouteAll();
 });
 await check('failed payload can retry without duplicate widget registration',async()=>{
  let fail=true;await p.route('**/generated/lessons/gap-006.js',r=>fail?r.abort():r.continue());
  await p.goto(base+'#/lab/gap-006');await p.locator('[data-load-retry]').waitFor({timeout:8000});
  fail=false;await p.locator('[data-load-retry]').click();await ready(p,'gap-006');
  assert.deepEqual(await p.evaluate(()=>CSL.app.current.errors),[]);await p.unrouteAll();
 });
 await context.close();
 const recovery=await browser.newContext(),rp=await recovery.newPage();
 await check('partial common-file failure restores discovery and retries only the failed resource',async()=>{
  let fail=true;await rp.route('**/src/experiences-view.js',r=>fail?r.abort():r.continue());
  await rp.goto(base+'#/lab/c16-git');await rp.locator('[data-load-retry]').waitFor({timeout:8000});
  await rp.locator('.brand').click();await rp.locator('.library-home').waitFor();
  assert.equal(await rp.locator('.library-domain-card').count(),8);
  fail=false;await rp.goto(base+'#/lab/c16-git');await ready(rp,'c16-git');
  assert.deepEqual(await rp.evaluate(()=>CSL.app.current.errors),[]);
 });
 await check('an unknown lesson retains a usable not-found page',async()=>{
  const p=await recovery.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'#/lab/no-such-unit');await p.locator('#main h1').waitFor();
  assert.equal(await p.locator('.experience').count(),0);assert.deepEqual(errors,[]);await p.close();
 });
 await recovery.close();
}finally{
 await browser.close();server?.kill();await mkdir('review-output',{recursive:true});
 await writeFile('review-output/on-demand-'+name+'.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({browser:name,passed:report.passed,failed:report.failures.length,cold:report.cold.length}));
 if(report.failures.length)process.exitCode=1;
}


