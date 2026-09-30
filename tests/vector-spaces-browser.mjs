import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
let base=process.env.BASE_URL,server;
if(!base){
 server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
 try{base=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Server startup timeout')),8000);server.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]+'/');}});server.on('error',e=>{clearTimeout(timer);reject(e);});});}catch(e){server.kill();await browser.close();throw e;}
}
const report={cases:[],errors:[]};
await mkdir('review-output/vector-spaces',{recursive:true});
const check=async(label,fn)=>{try{await fn();report.cases.push({label,passed:true});}catch(e){report.cases.push({label,passed:false,error:e.stack});console.error(label,e.message);}};
const ready=async(page,id,chapter)=>{
 await page.waitForFunction(({id,chapter})=>{const c=globalThis.CSL?.app?.current;return c?.experience&&c.lab.id===id&&c.chapter===chapter&&c.completed.size===CSL.experiences.find(id).chapters.find(ch=>ch.id===chapter).activities.length;},{id,chapter});
 assert.deepEqual(await page.evaluate(()=>CSL.app.current.errors),[]);
};
const open=async(page,id,chapter)=>{await page.goto(base+'#/lab/'+id+'?chapter='+chapter);await ready(page,id,chapter);};
const noOverflow=async page=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
try{
 for(const width of [1440,390,320]){
  const context=await browser.newContext({viewport:{width,height:960},hasTouch:width<500,reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await check(width+': foundation renders its complete reading, including formal axioms',async()=>{
   await open(page,'c03-vector-space','foundation');await noOverflow(page);
   assert.equal(await page.locator('.vs-section').count(),8);
   assert.match(await page.locator('.vs-reading').innerText(),/分配法則/);
   await page.screenshot({path:'review-output/vector-spaces/foundation-'+width+'.png'});
  });
  await check(width+': coefficient changes update the same polynomial, sum and scalar multiple',async()=>{
   await page.locator('[name=a]').fill('2');await page.locator('[name=scalar]').fill('-2');
   await page.waitForFunction(()=>document.querySelector('[data-polynomial-output]')?.textContent.includes('λf=-2(2 + x)=−4 − 2x'));
   assert.match(await page.locator('[data-polynomial-output]').innerText(),/f\+g=5 \+ 2x³/);
   await page.locator('[name=a]').fill('');await page.waitForFunction(()=>document.querySelector('[data-ex-status]')?.textContent.includes('整数')||document.querySelector('[data-ex-status]')?.textContent.includes('指定'));
   assert.match(await page.locator('[data-polynomial-output]').innerText(),/λf=-2/);
   await page.locator('[name=a]').fill('0');await page.waitForFunction(()=>!document.querySelector('[data-polynomial-output][aria-busy=true]'));
   await page.locator('[data-polynomial-example=zero]').click();assert.match(await page.locator('[data-polynomial-output]').innerText(),/f=0 ↔/);
  });
  await check(width+': next lesson and all three tab destinations work through links',async()=>{
   await page.locator('.vs-next-link').click();await ready(page,'c03-subspace','criteria');await noOverflow(page);
   assert.equal(await page.locator('.ex-chapters-tabs a').count(),3);
   assert.equal(await page.locator('.ex-chapters-tabs [aria-current=page]').innerText(),'考え方と3条件');
   assert.match(await page.locator('.vs-containment').innerText(),/候補全体/);
   await page.locator('[data-geometry=axes]').click();assert.match(await page.locator('[data-geometry-result]').innerText(),/和で閉じていません/);
   assert.equal(await page.locator('[data-geometry=axes]').getAttribute('aria-pressed'),'true');
   await page.screenshot({path:'review-output/vector-spaces/criteria-'+width+'.png'});
   await page.locator('.ex-chapters-tabs a[href$="chapter=lecture"]').focus();await page.keyboard.press('Enter');await ready(page,'c03-subspace','lecture');await noOverflow(page);
   assert.equal(await page.locator('.vs-proof-step').count(),6);
   assert.match(await page.locator('.ex-chapter').innerText(),/入力𝐱はn成分/);
   assert.match(await page.locator('.ex-chapter').innerText(),/もう一つの点−1も必要/);
   await page.screenshot({path:'review-output/vector-spaces/lecture-'+width+'.png'});
   await page.locator('.ex-chapters-tabs a[href$="chapter=derivative"]').click();await ready(page,'c03-subspace','derivative');await noOverflow(page);
   assert.equal(await page.locator('.vs-proof-step').count(),3);
   assert.match(await page.locator('.vs-learner-quote').innerText(),/^つまり、\(i\)の最終目的としては/);
   assert.match(await page.locator('.ex-chapter').innerText(),/bは自由/);
  });
  await check(width+': nonzero members and a single-point false positive remain distinct',async()=>{
   const output=page.locator('[data-polynomial-output]');
   await page.locator('[data-polynomial-example=x]').click();assert.match(await output.innerText(),/はい → f∈W/);assert.match(await output.innerText(),/f自体が零多項式か\s*いいえ/);
   await page.locator('[data-polynomial-example=x2]').click();assert.match(await output.innerText(),/いいえ → f∉W/);assert.match(await output.innerText(),/x=0だけで条件式を評価すると\s*0/);
   await page.locator('[name=c]').fill('-2');await page.waitForFunction(()=>document.querySelector('[data-polynomial-output]')?.textContent.includes('xf′−f=−2x²'));
   await page.screenshot({path:'review-output/vector-spaces/membership-'+width+'.png'});
  });
  await check(width+': direct deep links and classic model remain available',async()=>{
   await open(page,'c03-subspace','lecture');assert.equal(await page.locator('.vs-proof-step').count(),6);
   await page.goto(base+'#/lab/c03-subspace?view=classic');await page.waitForFunction(()=>CSL.app.current?.lab?.id==='c03-subspace'&&!CSL.app.current.experience);
   assert.ok((await page.locator('#main').innerText()).includes('部分空間'));await noOverflow(page);
  });
  await context.close();
 }
 assert.deepEqual(report.errors,[]);
}finally{await writeFile('review-output/vector-spaces/browser.json',JSON.stringify(report,null,2));await browser.close();server?.kill();}
const failures=report.cases.filter(c=>!c.passed);console.log(JSON.stringify({passed:report.cases.length-failures.length,failed:failures.length,errors:report.errors}));
if(failures.length||report.errors.length)process.exitCode=1;
