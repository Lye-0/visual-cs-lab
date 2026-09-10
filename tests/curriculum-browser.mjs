// Real HTTP browser checks. These tests do not represent a learner study.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright';
const out='review-output';await mkdir(out+'/screenshots',{recursive:true});
const report={sourceCommit:process.env.GITHUB_SHA||'local',started:new Date().toISOString(),transport:'HTTP on 127.0.0.1',cases:[],errors:[],viewports:[],units:0};
const base='http://127.0.0.1:4182/';
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4182'},stdio:['ignore','pipe','pipe']});
let log='',browser;server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);server.on('error',e=>log+=e.stack);
const ready=(page,id)=>page.waitForFunction(id=>{const c=globalThis.CSL?.app?.current;return c?.reader&&c.lab.id===id&&!c.pending&&!c.dirty&&!c.error&&!!c.result;},id,{timeout:15000});
async function visit(page,id){await page.goto(base+'#/lab/'+id);await ready(page,id);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function check(name,fn){try{await fn();report.cases.push({name,passed:true});}catch(e){report.cases.push({name,passed:false,error:String(e.stack||e)});console.error('FAIL '+name+'\n'+e.stack);}}
async function expand(page){for(const details of await page.locator('.reader-more-controls').all())if(!await details.evaluate(el=>el.open))await details.locator('summary').click();}
async function setParam(page,key,value){
 await expand(page);
 const selectors=[`[data-r-number="${key}"]`,`[data-r-param="${key}"]`];let field;
 for(const selector of selectors){for(const candidate of await page.locator(selector).all()){const tag=await candidate.evaluate(el=>el.tagName);if(['INPUT','SELECT','TEXTAREA'].includes(tag)&&await candidate.isVisible()){field=candidate;break;}}if(field)break;}
 assert.ok(field,'操作用の入力欄が見つからない: '+key);
 const info=await field.evaluate(el=>({tag:el.tagName,type:el.type}));
 if(info.tag==='SELECT')await field.selectOption(String(value));
 else if(info.type==='checkbox')await field.setChecked(Boolean(value));
 else if(info.type==='range')await field.evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);
 else await field.fill(String(value));
}
async function applyPatch(page,id,patch){for(const [key,value]of Object.entries(patch))await setParam(page,key,value);const apply=page.locator('[data-r-action="apply"]').first();if(await apply.count()&&await apply.isVisible()&&!await apply.isDisabled())await apply.click();await ready(page,id);await page.waitForFunction(patch=>{const p=CSL.app.current.params;return Object.entries(patch).every(([key,value])=>JSON.stringify(p[key])===JSON.stringify(value));},patch,{timeout:8000});}
async function inspectDiagram(page){
 const data=await page.evaluate(()=>{
  const diagram=document.getElementById('reader-diagram'),issues=[];
  if(!diagram)return ['図の領域がない'];
  for(const node of diagram.querySelectorAll('.network-node>rect')){const s=getComputedStyle(node);if(s.fill==='rgb(0, 0, 0)'||s.stroke==='none')issues.push('ネットワーク機器の配色がない');}
  for(const node of diagram.querySelectorAll('svg .svg-label'))if(getComputedStyle(node).fill==='rgb(0, 0, 0)')issues.push('SVGラベルが黒');
  for(const node of diagram.querySelectorAll('svg .network-edge'))if(getComputedStyle(node).stroke==='none')issues.push('接続線が不可視');
  if(/可視化が未登録|Cannot read properties|ReferenceError/.test(diagram.textContent))issues.push('描画エラー');
  if(document.documentElement.scrollWidth>innerWidth+3)issues.push('ページ全体が横へはみ出している');
  if(!diagram.querySelector('svg,.visual-html,.curriculum-visual,.cv-board,.cv-raster,.cv-demo,table,figure,.cv-visual')&&!diagram.textContent.trim())issues.push('図が空');
  return issues;
 });assert.deepEqual(data,[]);
}
const representatives=new Set(['gap-001','gap-011','gap-018','gap-028','gap-037','gap-047','gap-052','gap-059','gap-066','gap-074','gap-084','gap-090','gap-108','gap-118','gap-125','gap-131','gap-136','gap-137','gap-140','gap-148','gap-150','gap-154','gap-155']);
try{
 for(let i=0;i<150;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===149)throw Error('HTTP server unavailable\n'+log);await sleep(100);}
 browser=await chromium.launch({headless:true});report.browser=browser.version();
 for(const [name,viewport]of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  report.viewports.push({name,...viewport});const context=await browser.newContext({viewport,isMobile:name==='mobile',hasTouch:name==='mobile',reducedMotion:'reduce',locale:'ja-JP'});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===new URL(base).origin||url.protocol==='data:')return route.continue();report.errors.push({viewport:name,url:url.href,message:'予期しない外部要求'});return route.abort();});
  const page=await context.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>report.errors.push({viewport:name,url:page.url(),message:e.message}));
  await page.goto(base+'#/catalog');await page.waitForFunction(()=>globalThis.CSL?.labs?.length===314);
  const labs=await page.evaluate(()=>CSL.labs.map(l=>({id:l.id,title:l.unit||l.title,patch:l.exploration.patch,gap:!!l.gapId})));report.units=labs.length;
  assert.equal(labs.length,314);
  for(const lab of labs)await check(`${name}: ${lab.id} 初期例・移動・比較・説明`,async()=>{
   await visit(page,lab.id);assert.ok((await page.locator('body').textContent()).includes(lab.title));
   const initial=await page.evaluate(()=>JSON.stringify(CSL.app.current.result));await inspectDiagram(page);
   if(lab.gap){assert.equal(await page.locator('[data-cv-topic-guide]').count(),1);assert.ok(await page.locator('[data-cv-topic-guide] details').count()>0);}
   const slider=page.locator('#reader-scrubber');if(await slider.count()&&await slider.isVisible()&&!await slider.isDisabled()){await slider.focus();await slider.press('End');const position=await page.evaluate(()=>{const c=CSL.app.current;return [c.index,c.result.frames.length-1];});assert.equal(position[0],position[1]);await inspectDiagram(page);await slider.press('Home');assert.equal(await page.evaluate(()=>CSL.app.current.index),0);}
   if(representatives.has(lab.id))await page.locator('#reader-figure').screenshot({path:`${out}/screenshots/${lab.id}-${name}.png`});
   await applyPatch(page,lab.id,lab.patch);await inspectDiagram(page);
   const changed=await page.evaluate(()=>JSON.stringify(CSL.app.current.result));assert.notEqual(changed,initial,'条件変更が計算に反映されない');
   for(const phase of ['1','2','3','0']){const control=page.locator(`[data-r-phase="${phase}"]`);if(await control.count())await control.click();}
   await page.locator('[data-r-action="reset"]').first().click();await ready(page,lab.id);
   const reset=await page.evaluate(()=>({params:CSL.app.current.params,defaults:CSL.app.current.lab.defaults,index:CSL.app.current.index}));assert.deepEqual(reset.params,reset.defaults,'初期条件へ戻る');assert.equal(reset.index,0);
  });
  await check(`${name}: GAP番号で教材を共通検索して直接開く`,async()=>{
   // GAP lessons now share the normal catalogue. Do not revive the removed
   // duplicate gateway just to satisfy its obsolete DOM selectors.
   await page.goto(base+'#/catalog');await page.locator('#catalog-query').waitFor();
   await page.locator('#catalog-query').fill('GAP-155');
   await page.waitForFunction(()=>document.querySelectorAll('#catalog-results .library-unit').length===1);
   assert.equal(await page.locator('#catalog-results .library-unit').getAttribute('data-lab-id'),'gap-155');
   assert.ok((await page.locator('#catalog-count').textContent()).startsWith('1 '));
   await page.locator('#catalog-results a[href="#/lab/gap-155"]').click();await ready(page,'gap-155');
  });
  for(const id of ['n11-tcp','gap-143'])await check(`${name}: ${id} 再生・停止・巻戻し`,async()=>{
   await visit(page,id);const play=page.locator('#reader-play');await play.click();await page.waitForFunction(()=>CSL.app.current.index>0,{},{timeout:7000});await play.click();const stopped=await page.evaluate(()=>CSL.app.current.index);await sleep(400);assert.equal(await page.evaluate(()=>CSL.app.current.index),stopped);await page.locator('[data-r-action="back"]').first().click();assert.equal(await page.evaluate(()=>CSL.app.current.index),Math.max(0,stopped-1));
  });
  await check(`${name}: 画素を選び、矢印キーで位置を変える`,async()=>{
   await visit(page,'gap-136');const first=page.locator('.cv-pixel[tabindex="0"]');await first.focus();await first.press('ArrowRight');await page.waitForFunction(()=>document.activeElement?.getAttribute('data-r-focus')==='cv:pixel:0:1');assert.ok((await page.locator('.cv-pixel-readout').textContent()).includes('x=1'));await page.locator('.cv-pixel[tabindex="0"]').press('ArrowDown');await page.waitForFunction(()=>document.activeElement?.getAttribute('data-r-focus')==='cv:pixel:1:1');
  });
  await check(`${name}: 模擬削除と取消しが枠内だけで動く`,async()=>{
   await visit(page,'gap-148');await page.locator('[data-cv-action="delete"]').click();await page.waitForFunction(()=>document.querySelectorAll('[data-cv-items] li').length===2);await page.locator('[data-cv-action="undo"]').click();assert.equal(await page.locator('[data-cv-items] li').count(),3);
  });
  await check(`${name}: DOM実験は実際の配置矩形を測定する`,async()=>{
   await visit(page,'gap-154');await page.waitForFunction(()=>document.querySelector('[data-cv-layout]')&&document.querySelector('.cv-demo .data-table'));
   const dimensions=await page.locator('.cv-layout-item').first().evaluate(el=>({width:el.getBoundingClientRect().width,sizing:getComputedStyle(el).boxSizing}));assert.equal(dimensions.sizing,'border-box');assert.ok(Math.abs(dimensions.width-100)<1);
   await applyPatch(page,'gap-154',{borderBox:false});await page.waitForFunction(()=>document.querySelector('.cv-demo .data-table'));assert.ok(Math.abs(await page.locator('.cv-layout-item').first().evaluate(el=>el.getBoundingClientRect().width)-128)<1);
  });
  await check(`${name}: capture・target・bubbleは実際のクリックの記録`,async()=>{
   await visit(page,'gap-154');await applyPatch(page,'gap-154',{mode:'events'});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));await page.locator('[data-cv-event-target]').click();const rows=await page.locator('.cv-demo [data-cv-output] li').allTextContents();assert.deepEqual(rows.map(x=>x.split(' /')[0]),['root capture','outer capture','target capture','target bubble','outer bubble','root bubble']);
   await applyPatch(page,'gap-154',{stopAt:'outer-capture'});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));await page.locator('[data-cv-event-target]').click();assert.ok(!(await page.locator('.cv-demo [data-cv-output]').textContent()).includes('target bubble'));
  });
  await check(`${name}: フォームは制約検証し、外部へ送信しない`,async()=>{
   await visit(page,'gap-154');await applyPatch(page,'gap-154',{mode:'form'});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));await page.locator('.cv-demo button[type="submit"]').click();assert.ok((await page.locator('.cv-demo [data-cv-output]').textContent()).includes('制約検証'));
   await page.locator('.cv-demo input').fill('TCP');await page.locator('.cv-demo button[type="submit"]').click();assert.ok((await page.locator('.cv-demo [data-cv-output]').textContent()).includes('TCP'));assert.ok(page.url().includes('#/lab/gap-154'));
  });
  await context.close();
 }
 await check('幅320pxで新しい画像・DOM教材がページ全体を押し広げない',async()=>{
  const context=await browser.newContext({viewport:{width:320,height:780},isMobile:true,hasTouch:true});const page=await context.newPage();
  try{for(const id of ['gap-002','gap-108','gap-131','gap-137','gap-148','gap-150','gap-154','gap-155']){await visit(page,id);await inspectDiagram(page);}}finally{await context.close();}
 });
}catch(error){report.errors.push({message:String(error.stack||error)});}
finally{
 await browser?.close();server.kill();
 report.finished=new Date().toISOString();report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;
 await writeFile(out+'/curriculum-browser.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({units:report.units,browser:report.browser,passed:report.passed,failed:report.failed,errors:report.errors},null,2));
 if(report.failed||report.errors.length)process.exitCode=1;
}
