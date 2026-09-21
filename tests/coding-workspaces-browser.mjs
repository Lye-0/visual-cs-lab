// Verify actual learner actions, including wrong choices, ties, undo and focus.
// This focused suite does not claim the remaining curriculum is complete.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
const name=process.env.BROWSER||'chromium';
const engine={chromium,firefox,webkit}[name];if(!engine)throw Error('Unknown browser');
const report={sourceCommit:process.env.SOURCE_COMMIT||process.env.GITHUB_SHA||'local',browser:name,cases:[],errors:[]};
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4196'},stdio:['ignore','ignore','pipe']});let browser,serverLog='';
server.stderr.on('data',d=>serverLog+=d);server.on('error',e=>serverLog+=e.message);
const base='http://127.0.0.1:4196/';
async function check(title,action){try{await action();report.cases.push({title,passed:true});}catch(error){report.cases.push({title,passed:false,error:String(error.stack||error)});console.error('FAIL '+title+'\n'+error.stack);}}
async function open(page,id,chapter=''){
 await page.goto(base+'#/lab/'+id+(chapter?'?chapter='+chapter:''));
 await page.waitForFunction(({id,chapter})=>{const c=globalThis.CSL?.app?.current;return c?.experience&&c.lab.id===id&&(!chapter||c.chapter===chapter)&&!document.querySelector('.experience [aria-busy=true]');},{id,chapter});
 assert.deepEqual(await page.evaluate(()=>CSL.app.current.errors),[]);
}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw Error(serverLog||'server unavailable');await sleep(100);}
 browser=await engine.launch({headless:true});report.version=browser.version();
 for(const [size,viewport]of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}],['narrow',{width:320,height:760}]]){
  const context=await browser.newContext({viewport,hasTouch:size!=='desktop',reducedMotion:'reduce'});
  await context.addInitScript(()=>{globalThis.__violations=[];document.addEventListener('securitypolicyviolation',e=>__violations.push(e.effectiveDirective+':'+e.blockedURI));});
  const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push({size,message:e.message}));
  await check(size+': same bitstream has two learner-created interpretations',async()=>{
   await open(page,'c01-prefix');
   assert.equal(await page.locator('[data-prefix-valid]').getAttribute('data-prefix-valid'),'false');
   await page.locator('[data-prefix-cut="1"]').focus();await page.keyboard.press(' ');
   assert.equal(await page.evaluate(()=>document.activeElement?.dataset.prefixCut),'1');
   assert.equal(await page.locator('[data-prefix-valid]').getAttribute('data-prefix-valid'),'true');
   await page.locator('[data-prefix-pin]').click();
   await page.locator('[data-prefix-cut="1"]').click();await page.locator('[data-prefix-cut="2"]').click();await page.locator('[data-prefix-pin]').click();
   const rows=await page.locator('[data-prefix-pinned] tbody tr').allTextContents();assert.equal(rows.length,2);assert.ok(rows.some(r=>r.includes('AC')));assert.ok(rows.some(r=>r.includes('BA')));
   await page.locator('[data-prefix-pin]').click();assert.equal(await page.locator('[data-prefix-pinned] tbody tr').count(),2,'same interpretation is not counted twice');
   await page.locator('[data-prefix-clear]').click();assert.equal(await page.locator('[data-prefix-valid]').getAttribute('data-prefix-valid'),'false');assert.equal(await page.locator('[data-prefix-pinned] tbody tr').count(),2);
   assert.equal(await page.evaluate(()=>CSL.app.current.playing),false);
  });
  await check(size+': delayed unique decoding is not mistaken for a prefix-free code',async()=>{
   await open(page,'c01-prefix');await page.locator('[data-prefix-preset="1"]').click();
   assert.match(await page.locator('.ex-coding-explanation').textContent(),/接頭辞が重なる符号/);
   assert.match(await page.locator('.ex-coding-explanation').textContent(),/一意に復号できます/);
   await page.locator('[data-prefix-answers]').click();assert.equal(await page.locator('[data-prefix-solutions] tbody tr').count(),1);
   await page.locator('[data-prefix-preset="2"]').click();assert.equal(await page.locator('[data-prefix-pinned] tbody tr').count(),0);
   assert.match(await page.locator('.ex-coding-explanation').textContent(),/接頭辞が重ならない符号/);
  });
  await check(size+': a placed leaf occupies descendants and can be undone',async()=>{
   await open(page,'c01-kraft');await page.locator('[data-kraft-leaf="0"]').click();
   assert.match(await page.locator('[data-kraft-total]').textContent(),/使用 8 \/ 16/);
   assert.equal(await page.locator('[data-kraft-leaf="00"]').getAttribute('data-leaf-state'),'below-leaf');
   await page.locator('[data-kraft-leaf="00"]').focus();await page.keyboard.press('Enter');
   assert.match(await page.locator('.ex-kind-kraft-tree [data-ex-status]').textContent(),/下/);
   assert.equal(await page.locator('[data-kraft-placed] tbody tr').count(),1);
   for(const path of ['10','110','111'])await page.locator(`[data-kraft-leaf="${path}"]`).click();
   assert.equal(await page.locator('[data-kraft-solved]').getAttribute('data-kraft-solved'),'true');
   assert.match(await page.locator('[data-kraft-total]').textContent(),/使用 16 \/ 16/);
   await page.locator('[data-kraft-undo]').click();assert.equal(await page.locator('[data-kraft-placed] tbody tr').count(),3);
   assert.match(await page.locator('[data-kraft-total]').textContent(),/使用 14 \/ 16/);
   await page.locator('[data-kraft-reset]').click();assert.equal(await page.locator('[data-kraft-placed] tbody tr').count(),0);
   await page.locator('[data-kraft-leaf="00"]').click();await page.locator('[data-kraft-leaf="0"]').focus();await page.keyboard.press(' ');
   assert.match(await page.locator('.ex-kind-kraft-tree [data-ex-status]').textContent(),/途中/);
   assert.equal(await page.locator('[data-kraft-placed] tbody tr').count(),1);
  });
  await check(size+': Huffman rejects a wrong pair without inventing a merge',async()=>{
   await open(page,'c01-huffman');
   await page.locator('[data-huffman-pick="leaf-A"]').click();await page.locator('[data-huffman-pick="leaf-B"]').click();await page.locator('[data-huffman-merge]').click();
   assert.match(await page.locator('.ex-kind-huffman-build [data-ex-status]').textContent(),/小さい二つ/);
   assert.equal(await page.locator('[data-huffman-roots] button').count(),4);assert.equal(await page.locator('[data-huffman-history] li').count(),0);
   await page.locator('[data-huffman-pick="leaf-A"]').click();await page.locator('[data-huffman-pick="leaf-B"]').click();
   for(const id of ['leaf-C','leaf-D']){await page.locator(`[data-huffman-pick="${id}"]`).focus();await page.keyboard.press('Enter');}
   await page.locator('[data-huffman-merge]').click();assert.equal(await page.locator('[data-huffman-history] li').count(),1);
   for(const id of ['leaf-B','join-0'])await page.locator(`[data-huffman-pick="${id}"]`).click();await page.locator('[data-huffman-merge]').click();
   for(const id of ['leaf-A','join-1'])await page.locator(`[data-huffman-pick="${id}"]`).click();await page.locator('[data-huffman-merge]').click();
   assert.match(await page.locator('[data-huffman-average]').textContent(),/1\.75/);assert.equal(await page.locator('[data-huffman-codes] tbody tr').count(),4);
   assert.equal(await page.locator('[data-huffman-history] li').count(),3);
   await page.locator('[data-huffman-undo]').click();assert.equal(await page.locator('[data-huffman-roots] button').count(),2);assert.equal(await page.locator('[data-huffman-codes]').count(),0);
   assert.equal(await page.locator('[data-huffman-history] li').count(),2);
  });
  await check(size+': ties accept alternative choices and preserve keyboard focus',async()=>{
   await open(page,'c01-huffman');await page.locator('[data-huffman-preset="equal"]').click();
   for(const id of ['leaf-D','leaf-B']){await page.locator(`[data-huffman-pick="${id}"]`).focus();await page.keyboard.press(' ');assert.equal(await page.evaluate(()=>document.activeElement?.dataset.huffmanPick),id);}
   await page.locator('[data-huffman-merge]').click();assert.equal(await page.locator('.ex-kind-huffman-build .ex-error').count(),0);assert.equal(await page.locator('[data-huffman-roots] button').count(),3);
  });
  await check(size+': set tokens change membership; swapping changes a difference',async()=>{
   await open(page,'c02-set');assert.equal(await page.locator('.ex-kind-sets').count(),1);
   assert.match(await page.locator('.ex-set-answer strong').textContent(),/3, 4/);
   await page.locator('[data-set-op="difference"]').click();assert.match(await page.locator('.ex-set-answer strong').textContent(),/1, 2/);
   await page.locator('[data-set-swap]').click();assert.match(await page.locator('.ex-set-answer strong').textContent(),/5/);
   const token=page.locator('[data-set="A"][data-value="6"]');await token.focus();await page.keyboard.press(' ');
   assert.equal(await page.evaluate(()=>document.activeElement?.dataset.value),'6');assert.match(await page.locator('.ex-set-answer strong').textContent(),/5, 6/);
  });
  await check(size+': manual regression input is not overwritten by the submit click',async()=>{
   await open(page,'c17-regression');const form=page.locator('.ex-kind-regression form');
   await form.locator('[name=slope]').fill('1.5');await form.locator('[name=intercept]').fill('0.7');await form.locator('button[type=submit]').click();
   assert.match(await page.locator('[data-reg-table]').textContent(),/1\.5x \+ 0\.7/);
   await page.locator('[data-reg-step]').click();
   assert.deepEqual(await form.locator('input').evaluateAll(nodes=>nodes.filter(n=>!n.checkValidity()).map(n=>n.name)),[]);
  });
  await check(size+': representative workspaces remain inside the viewport and retain semantic controls',async()=>{
   for(const id of ['c01-prefix','c01-kraft','c01-huffman','c02-set','c01-joint','gap-002','gap-008']){
    await open(page,id);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,id);
    assert.equal(await page.locator('#reader-scrubber,[data-r-phase]').count(),0,id);
    const duplicate=await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);});assert.deepEqual(duplicate,[],id);
    assert.deepEqual(await page.evaluate(()=>__violations),[],id);
   }
  });
  await check(size+': leaving and reopening does not retain the learner choices',async()=>{
   await open(page,'c01-prefix');await page.locator('[data-prefix-cut="1"]').click();await page.locator('[data-prefix-pin]').click();
   await open(page,'c02-set');await open(page,'c01-prefix');assert.equal(await page.locator('[data-prefix-pinned] tbody tr').count(),0);
  });
  await mkdir('review-output/coding-screenshots',{recursive:true});
  for(const id of ['c01-prefix','c01-kraft','c01-huffman','c02-set']){await open(page,id);await page.screenshot({path:`review-output/coding-screenshots/${name}-${size}-${id}.png`,fullPage:true});}
  await context.close();
 }
}catch(error){report.errors.push({message:String(error.stack||error)});}
finally{
 await browser?.close();server.kill();
 report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;
 await mkdir('review-output',{recursive:true});await writeFile('review-output/coding-'+name+'.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));if(report.failed||report.errors.length)process.exitCode=1;
}
