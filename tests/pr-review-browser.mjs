// Real HTTP regression checks for the reviewed behavior, not screenshot guesses.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright';
import {captureDiagram,normalizedDiagram} from './diagram-snapshot.mjs';
const report={sourceCommit:process.env.SOURCE_COMMIT||process.env.GITHUB_SHA||'local',cases:[],errors:[]};
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4191'},stdio:['ignore','pipe','pipe']});
const base='http://127.0.0.1:4191/';let browser,serverLog='';
server.stdout.on('data',d=>serverLog+=d);server.stderr.on('data',d=>serverLog+=d);server.on('error',e=>serverLog+=e.message);
const ready=(page,id)=>page.waitForFunction(id=>{const c=globalThis.CSL?.app?.current;return c?.reader&&c.lab.id===id&&!c.pending&&!c.dirty&&!c.error&&!!c.result;},id,{timeout:12000});
async function open(page,id){await page.goto(base+'#/lab/'+id);await ready(page,id);}
async function check(name,fn){try{await fn();report.cases.push({name,passed:true});}catch(e){report.cases.push({name,passed:false,error:String(e.stack||e)});console.error('FAIL '+name+'\n'+e.stack);}}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw Error('server unavailable: '+serverLog);await sleep(100);}
 browser=await chromium.launch({headless:true});report.browser=browser.version();
 for(const [label,viewport]of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  const context=await browser.newContext({viewport,isMobile:label==='mobile',hasTouch:label==='mobile',reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(6000);page.on('pageerror',e=>report.errors.push({label,error:e.message}));
  await check(label+': SVG nodes activate with Enter and Space, preserving focus without playing',async()=>{
   await open(page,'gap-047');
   for(const [offset,key]of [[0,'Enter'],[1,'Space']]){
    const node=page.locator('#reader-diagram .cv-graph-node[role="button"]').nth(offset);
    const identity=await node.getAttribute('data-r-focus');await node.focus();
    const before=await page.evaluate(()=>({index:CSL.app.current.index,playing:CSL.app.current.playing,scroll:scrollY}));
    await page.keyboard.press(key);
    await page.waitForFunction(id=>CSL.app.current.noteFocus===id,identity);
    assert.deepEqual(await page.evaluate(()=>({index:CSL.app.current.index,playing:CSL.app.current.playing,scroll:scrollY})),before);
    assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-r-focus')),identity);
    assert.equal(await page.locator('#reader-diagram .cv-graph-node').nth(offset).getAttribute('aria-pressed'),'true');
    assert.ok((await page.locator('#reader-diagram .cv-focus-note').textContent()).trim().length>0);
   }
  });
  await check(label+': repeated SVG keys do not activate or start playback',async()=>{
   await open(page,'gap-047');const node=page.locator('#reader-diagram .cv-graph-node').first();await node.focus();
   const before=await page.evaluate(()=>({note:CSL.app.current.noteFocus,index:CSL.app.current.index,playing:CSL.app.current.playing}));
   const accepted=await node.evaluate(el=>el.dispatchEvent(new KeyboardEvent('keydown',{key:' ',repeat:true,bubbles:true,cancelable:true})));
   assert.equal(accepted,false);
   assert.deepEqual(await page.evaluate(()=>({note:CSL.app.current.noteFocus,index:CSL.app.current.index,playing:CSL.app.current.playing})),before);
  });
  for(const id of ['gap-148','gap-150','gap-154'])await check(label+': '+id+' rewind restores meaningful DOM including label connections',async()=>{
   await open(page,id);const before=await captureDiagram(page);
   const idBefore=await page.locator('#reader-diagram .cv-demo').getAttribute('id');
   const slider=page.locator('#reader-scrubber');await slider.focus();await slider.press('End');await slider.press('Home');
   assert.equal(await captureDiagram(page),before);
   assert.notEqual(await page.locator('#reader-diagram .cv-demo').getAttribute('id'),idBefore);
  });
  await check(label+': snapshot normalization preserves text, values and disabled states',async()=>{
   await open(page,'gap-150');const original=await captureDiagram(page);
   await page.locator('#reader-diagram .cv-demo input').fill('変更した値 cv-demo-999');
   assert.notEqual(await captureDiagram(page),original);
   await page.locator('#reader-diagram .cv-demo input').fill('ネットワーク');assert.equal(await captureDiagram(page),original);
   await page.locator('#reader-diagram .cv-demo [data-cv-action="access"]').evaluate(el=>{el.disabled=true;});
   assert.notEqual(await captureDiagram(page),original);
  });
  await check(label+': broken label target and duplicate generated IDs cannot be hidden',async()=>{
   await open(page,'gap-150');
   await page.locator('#reader-diagram .cv-demo label').evaluate(el=>el.htmlFor='cv-demo-999999-input');
   await assert.rejects(captureDiagram(page),/Broken generated ID reference/);
   await open(page,'gap-150');
   await page.locator('#reader-diagram .cv-demo input').evaluate(el=>{const duplicate=document.createElement('input');duplicate.id=el.id;el.parentNode.append(duplicate);});
   await assert.rejects(captureDiagram(page),/Duplicate generated diagram ID/);
  });
  await check(label+': ordinary text resembling an ID is never normalized away',async()=>{
   await open(page,'gap-150');const original=await captureDiagram(page);
   await page.locator('#reader-diagram .cv-demo h3').evaluate(el=>el.textContent+=' cv-demo-123');
   const after=await captureDiagram(page);assert.notEqual(after,original);assert.ok(after.includes('cv-demo-123'));
  });
  await context.close();
 }
}catch(e){report.errors.push({error:String(e.stack||e)});}
finally{
 await browser?.close();server.kill();report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;
 await mkdir('review-output',{recursive:true});await writeFile('review-output/pr-review-browser.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));if(report.failed||report.errors.length)process.exitCode=1;
}
