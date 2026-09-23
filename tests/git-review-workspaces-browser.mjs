// Real-browser verification on the committed linked site. No source rewrites.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
const name=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[name];if(!engine)throw Error('Unknown browser');
const ids=['c16-git','c16-reset','c16-branches','c16-rebase','c16-remote','c16-undo'];
const base='http://127.0.0.1:4237/',out='review-output/git-review';
const report={sourceCommit:process.env.GITHUB_SHA||'local',engine:name,cases:[],errors:[],visualReview:'not-certified-by-test'};
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4237'},stdio:['ignore','ignore','pipe']});let browser,serverLog='',serial=0;
server.stderr.on('data',s=>serverLog+=s);server.on('error',e=>serverLog+=e.message);
const idle=page=>page.waitForFunction(()=>!document.querySelector('.experience [aria-busy="true"]'));
const state=page=>page.locator('[data-sec-state]').evaluate(e=>JSON.parse(e.dataset.secState));
const field=(page,key)=>page.locator('[data-sec-field="'+key+'"]');
const click=async(page,code)=>{await page.locator('[data-sec-action="'+code+'"]').first().click();await idle(page);};
const repoHead=s=>s.repo.detached||s.repo.refs[s.repo.head];
async function open(page,id,chapter='objects'){
 await page.goto(base+'?git-review='+ ++serial+'#/lab/'+id+'?chapter='+chapter);
 await page.waitForFunction(({id,chapter})=>{const c=CSL?.app?.current,ch=CSL.experiences.find(id)?.chapters.find(ch=>ch.id===chapter);return c?.experience&&c.lab.id===id&&c.chapter===chapter&&c.completed.size>=ch.activities.length&&!document.querySelector('.experience [aria-busy="true"]');},{id,chapter},{timeout:20000});
 assert.deepEqual(await page.evaluate(()=>CSL.app.current.errors),[]);
}
async function check(id,fn){try{await fn();report.cases.push({id,passed:true});}catch(error){report.cases.push({id,passed:false,error:String(error.stack||error)});console.error('GIT_REVIEW_FAIL '+id+' '+error.message);}}
async function capture(page,width,id){await page.locator('.experience').screenshot({path:`${out}/${name}-${width}-${id}.png`});}
try{
 await mkdir(out,{recursive:true});for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw Error(serverLog||'server unavailable');await sleep(100);}
 browser=await engine.launch({headless:true});report.version=browser.version();
 for(const width of [1440,390,320]){
  const ctx=await browser.newContext({viewport:{width,height:1000},hasTouch:width<500,reducedMotion:'reduce'}),page=await ctx.newPage();page.setDefaultTimeout(8000);
  await ctx.addInitScript(()=>{window.__gitCsp=[];document.addEventListener('securitypolicyviolation',e=>__gitCsp.push(e.effectiveDirective));});
  page.on('pageerror',e=>report.errors.push({width,message:e.message}));page.on('response',r=>{if(r.status()>=400)report.errors.push({width,url:r.url(),status:r.status()});});
  for(const id of ids)for(const chapter of ['objects','commands'])await check(`${width}/${id}/${chapter}/entry`,async()=>{
   await open(page,id,chapter);assert.equal(await page.locator('[data-ex-kind]').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   assert.deepEqual(await page.evaluate(()=>__gitCsp),[]);assert.deepEqual(await page.locator('.experience label[for]').evaluateAll(ls=>ls.filter(l=>!document.getElementById(l.htmlFor)).map(l=>l.htmlFor)),[]);
   assert.equal(await page.locator('.experience input[type=number]:invalid').count(),0);
   if(chapter==='objects')await capture(page,width,id+'-initial');
  });
  await check(`${width}/stage/later-edit-is-not-automatically-staged`,async()=>{
   await open(page,'c16-git');await field(page,'content').fill('one');await click(page,'edit');await click(page,'add');await field(page,'content').fill('two');await click(page,'edit');await click(page,'commit');const s=await state(page);assert.equal(repoHead(s),'C1');assert.equal(s.repo.index['notes.txt'],'one');assert.equal(s.repo.objects.C1.tree['notes.txt'],'one');assert.equal(s.repo.work['notes.txt'],'two');await capture(page,width,'stage-after-commit');
   await click(page,'select:C0');assert.equal((await state(page)).selected,'C0');assert.equal(repoHead(await state(page)),'C1');
  });
  await check(`${width}/stage/input-remains-data-and-errors-are-atomic`,async()=>{
   await open(page,'c16-git');const old=await state(page);await click(page,'commit');assert.deepEqual(await state(page),old);assert.match(await page.locator('[data-sec-status]').textContent(),/ステージ/);
   await field(page,'content').fill('<img src=x onerror="window.pwned=true">');await click(page,'edit');await click(page,'add');await click(page,'commit');assert.equal(await page.locator('[data-sec-board] img').count(),0);assert.equal(await page.evaluate(()=>window.pwned),undefined);
   await click(page,'reset');assert.equal((await state(page)).repo.work['notes.txt'],'start');
  });
  await check(`${width}/reset/modes-fork-the-same-baseline`,async()=>{
   await open(page,'c16-reset');for(const mode of ['hard','soft','mixed']){await click(page,'compare:'+mode);const s=await state(page);assert.equal(repoHead(s),'C0');assert.equal(s.repo.index['notes.txt'],mode==='soft'?'staged':'start');assert.equal(s.repo.work['notes.txt'],mode==='hard'?'start':'working');}
   await click(page,'target:C1');await click(page,'compare:hard');assert.equal((await state(page)).repo.work['notes.txt'],'committed');await capture(page,width,'reset-comparison');
  });
  await check(`${width}/merge/ff-merge-and-explicit-conflict-resolution`,async()=>{
   await open(page,'c16-branches');await click(page,'scenario:ff');await click(page,'merge');assert.equal(Object.keys((await state(page)).repo.objects).length,2);
   await click(page,'scenario:default');await click(page,'merge');assert.deepEqual((await state(page)).repo.objects.C3.parents,['C2','C1']);const px={};for(const id of ['C2','C1'])px[id]=await page.locator('g[data-sec-action="select:'+id+'"] circle').getAttribute('cx');assert.notEqual(px.C2,px.C1);await capture(page,width,'merge-two-parent-lanes');
   await click(page,'scenario:conflict');await click(page,'merge');assert.equal(await page.locator('[data-sec-action=finish]').isDisabled(),true);await capture(page,width,'merge-conflict');
   await field(page,'resolved').fill('decided');await click(page,'resolve');await click(page,'finish');const s=await state(page);assert.equal(s.repo.objects.C3.tree['notes.txt'],'decided');assert.deepEqual(s.repo.objects.C3.parents,['C2','C1']);assert.equal(s.repo.pending,null);
  });
  await check(`${width}/rebase/new-parents-same-patches`,async()=>{
   await open(page,'c16-rebase');await click(page,'compare:merge');assert.equal(repoHead(await state(page)),'C4');await click(page,'compare:rebase');const s=await state(page);assert.equal(repoHead(s),'C5');assert.deepEqual(s.repo.objects.C4.parents,['C3']);assert.deepEqual(s.mapping,[{old:'C1',new:'C4'},{old:'C2',new:'C5'}]);await page.locator('[data-sec-view="mapping-C1"] summary').click();assert.equal(await page.locator('[data-sec-view="mapping-C1"]').evaluate(e=>e.open),true);await capture(page,width,'rebase-mapping');
  });
  await check(`${width}/remote/unknown-commit-not-in-local-graph`,async()=>{
   await open(page,'c16-remote');await click(page,'remote');let s=await state(page);assert.equal(s.repo.tracking['origin/main'],'C0');assert.equal(await page.locator('g[data-sec-action="select:C1"]').count(),0);await capture(page,width,'remote-before-fetch');
   await click(page,'fetch');s=await state(page);assert.equal(s.repo.refs.main,'C0');assert.equal(s.repo.work['remote.txt'],undefined);assert.equal(await page.locator('g[data-sec-action="select:C1"]').count(),1);
   await click(page,'merge');assert.equal((await state(page)).repo.refs.main,'C1');assert.equal((await state(page)).repo.work['remote.txt'],'相手の変更');
  });
  await check(`${width}/remote/non-fast-forward-rejection-and-recovery`,async()=>{
   await open(page,'c16-remote');await click(page,'remote');await click(page,'local');const old=await state(page);await click(page,'push');assert.deepEqual(await state(page),old);assert.match(await page.locator('[data-sec-status]').textContent(),/non-fast-forward/);await click(page,'fetch');await click(page,'merge');await click(page,'push');const s=await state(page);assert.equal(s.repo.remote.main,s.repo.refs.main);await capture(page,width,'remote-after-push');
  });
  await check(`${width}/undo/revert-and-amend-are-independent`,async()=>{
   await open(page,'c16-undo');await click(page,'compare:revert');assert.deepEqual((await state(page)).repo.objects.C2.parents,['C1']);await field(page,'amended').fill('fixed');await click(page,'compare:amend');const s=await state(page);assert.deepEqual(s.repo.objects.C2.parents,['C0']);assert.equal(s.repo.objects.C2.tree['notes.txt'],'fixed');assert.equal(s.repo.objects.C1.tree['notes.txt'],'first');await capture(page,width,'undo-amend');
  });
  await check(`${width}/keyboard/graph-selection-and-draft-retention`,async()=>{
   await open(page,'c16-undo');await field(page,'amended').fill('draft');const node=page.locator('g[data-sec-action="select:C0"]');await node.focus();await page.keyboard.press('Enter');await idle(page);assert.equal((await state(page)).selected,'C0');assert.equal(await field(page,'amended').inputValue(),'draft');assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-sec-action')),'select:C0');
  });
  await check(`${width}/reading/before-after-values-stay-visible`,async()=>{
   await open(page,'c16-reset');await click(page,'compare:hard');
   // Only the operation comparison, not the separate collapsed commit diff.
   const panel=page.locator('.ex-git-paired').first();
   const rows=await panel.locator(':scope>div').evaluateAll(els=>els.map(el=>({label:el.querySelector('dt').textContent,values:[...el.querySelectorAll('pre')].map(p=>p.textContent)})));
   assert.equal(rows.length,5);assert.deepEqual(rows.find(r=>r.label==='notes.txt / worktree').values,['working','start']);
   assert.deepEqual(rows.find(r=>r.label==='notes.txt / index').values,['staged','start']);
   const unreadable=await panel.locator('pre').evaluateAll(els=>els.filter(el=>{const r=el.getBoundingClientRect();return r.width<=0||el.scrollWidth>el.clientWidth+1;}).map(el=>el.textContent));assert.deepEqual(unreadable,[]);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await capture(page,width,'reset-visible-comparison');
   await click(page,'target:C1');await click(page,'compare:hard');assert.equal(repoHead(await state(page)),'C1');assert.match(await page.locator('[data-sec-board]').textContent(),/参照をC0へ戻した場合でも/);const broken=await panel.locator('pre').evaluateAll(els=>els.filter(el=>{if(el.textContent!=='committed')return false;const r=document.createRange();r.selectNodeContents(el);return new Set([...r.getClientRects()].map(x=>Math.round(x.y))).size>1;}).map(el=>el.textContent));assert.deepEqual(broken,[]);
  });
  await check(`${width}/lifecycle/revisit-does-not-save-study-history`,async()=>{
   await open(page,'c16-git');await field(page,'content').fill('unsaved');await click(page,'edit');await page.goto(base+'#/catalog');await page.waitForSelector('#catalog-query');await open(page,'c16-git');assert.equal((await state(page)).repo.work['notes.txt'],'start');assert.deepEqual(await page.evaluate(()=>__gitCsp),[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  });
  await ctx.close();
 }
}catch(error){report.errors.push({message:String(error.stack||error)});console.error(error);}
finally{await browser?.close();server.kill();report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;await mkdir(out,{recursive:true});await writeFile(out+'/'+name+'.json',JSON.stringify(report,null,2));console.log('GIT_REVIEW_SUMMARY '+JSON.stringify({...report,cases:report.cases.filter(c=>!c.passed)}));if(report.failed||report.errors.length)process.exitCode=1;}
