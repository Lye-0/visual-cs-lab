// Interaction regressions on real HTTP documents. Delayed-model tests are
// explicitly synthetic; Web Crypto is exercised without mocks by reader-browser.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright';

const output='review-output';
await mkdir(`${output}/screenshots`,{recursive:true});
const report={sourceCommit:process.env.GITHUB_SHA||'local',started:new Date().toISOString(),transport:'HTTP on 127.0.0.1',cases:[],errors:[]};
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4176'},stdio:['ignore','pipe','pipe']});
let serverLog='',browser,visit=0;
server.stdout.on('data',d=>serverLog+=d);server.stderr.on('data',d=>serverLog+=d);
server.on('error',e=>serverLog+=e.message);
const base='http://127.0.0.1:4176/';
async function check(name,fn){try{await fn();report.cases.push({name,passed:true});}catch(e){report.cases.push({name,passed:false,error:String(e.stack||e)});console.error(`FAIL ${name}\n${e.message}`);}}
const ready=(page,id)=>page.waitForFunction(id=>{const c=globalThis.CSL?.app.current;return c?.reader&&c.lab.id===id&&!c.pending&&!c.dirty&&!c.error&&!!c.result;},id,{timeout:12000});
async function open(page,id){await page.goto(`${base}?regression=${++visit}#/lab/${id}`);await ready(page,id);}
async function options(page){const more=page.locator('.reader-more-controls');if(await more.count()&&!(await more.evaluate(el=>el.open)))await more.locator('summary').click();}
const current=page=>page.evaluate(()=>{const c=CSL.app.current;return {params:c.params,index:c.index,playing:c.playing,dirty:c.dirty,pending:c.pending,error:c.error,hasResult:!!c.result,invalid:c.invalidInputs,answer:c.answer,codeDirty:c.codeDirty,noteFocus:c.noteFocus,metrics:c.result?.metrics};});
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw Error(serverLog||'Server unavailable');await sleep(100);}
 browser=await chromium.launch({headless:true});report.browser=browser.version();
 for(const [label,viewport]of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  const context=await browser.newContext({viewport,isMobile:label==='mobile',hasTouch:label==='mobile',reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(6000);
  page.on('pageerror',e=>report.errors.push({viewport:label,url:page.url(),message:e.message}));
  await check(`${label}: 複数の入力エラーを個別に保持し、別項目の変更で消さない`,async()=>{
   await open(page,'n11-tcp');await options(page);
   const numbers=page.locator('[data-r-number]'),first=numbers.nth(0),second=numbers.nth(1);
   const a=await first.inputValue(),b=await second.inputValue();
   await first.fill('');await second.fill('');
   assert.equal(Object.keys((await current(page)).invalid).length,2);
   await first.fill(a);await sleep(150);
   assert.equal(await second.getAttribute('aria-invalid'),'true');
   assert.equal((await current(page)).hasResult,false);
   await page.locator('[data-r-action="apply"]').click();
   assert.equal((await current(page)).hasResult,false);
   const third=numbers.nth(2);await third.fill(await third.inputValue());await sleep(150);
   assert.equal((await current(page)).hasResult,false);
   await second.fill(b);await ready(page,'n11-tcp');
   assert.equal(Object.keys((await current(page)).invalid).length,0);
   assert.equal(await second.getAttribute('aria-invalid'),'false');
  });
  await check(`${label}: 数値の範囲外入力とEnterでも古い計算結果を再利用しない`,async()=>{
   await open(page,'n11-tcp');await options(page);
   const number=page.locator('[data-r-number]').first(),original=await number.inputValue();
   const max=Number(await number.getAttribute('max'));await number.fill(String(max+1));await number.press('Enter');
   assert.equal((await current(page)).hasResult,false);assert.equal(await number.getAttribute('aria-invalid'),'true');
   assert.ok((await page.locator('#reader-input-status').textContent()).includes('入力を確認'));
   await number.fill(original);await ready(page,'n11-tcp');
  });
  await check(`${label}: 意味的な入力エラーを説明し、修正すると復帰する`,async()=>{
   await open(page,'c01-entropy');await page.locator('[data-r-param="weights"]').fill('0,0,0,0');
   await page.waitForFunction(()=>!!CSL.app.current.error);
   assert.equal((await current(page)).hasResult,false);
   assert.ok((await page.locator('#reader-diagram').textContent()).includes('少なくとも1個'));
   await page.locator('[data-r-param="weights"]').fill('1,1,1,1');await ready(page,'c01-entropy');
   assert.equal((await current(page)).metrics['エントロピー (bit/記号)'],2);
  });
  await check(`${label}: コードは明示的な反映まで実行せず、説明切替でも送信しない`,async()=>{
   await open(page,'c09-cpu');await options(page);
   const field=page.locator('textarea[data-r-param]').first(),key=await field.getAttribute('data-r-param');
   const draft=(await field.inputValue())+'\n';await field.fill(draft);await sleep(400);
   assert.equal((await current(page)).codeDirty,true);assert.equal((await current(page)).hasResult,false);
   await page.locator('[data-r-phase="1"]').click();await sleep(100);
   assert.equal((await current(page)).hasResult,false);
   await page.locator('[data-r-action="apply"]').click();await ready(page,'c09-cpu');
   assert.equal((await current(page)).codeDirty,false);assert.equal((await current(page)).params[key].trim(),draft.trim());
  });
  await check(`${label}: 行列を開いたままビットの対応を選び、段階を進められる`,async()=>{
   await open(page,'c01-linear-code');
   const matrix=page.locator('#reader-diagram details');await matrix.locator('summary').click();
   await page.locator('[data-r-focus="bit-0"]').click();
   assert.equal(await matrix.evaluate(el=>el.open),true);assert.ok(await matrix.locator('td.is-linked').count()>0);
   await page.locator('#reader-scrubber').focus();await page.locator('#reader-scrubber').press('End');
   assert.equal(await matrix.evaluate(el=>el.open),true);assert.equal((await current(page)).noteFocus,null);
   await page.screenshot({path:`${output}/screenshots/linear-matrix-${label}.png`,fullPage:true});
  });
  await check(`${label}: 手動の強調を次の計算段階へ持ち越さない`,async()=>{
   await open(page,'c01-entropy');await page.locator('[data-r-focus="entropy-A"]').first().click();
   assert.equal((await current(page)).noteFocus,'entropy-A');
   const slider=page.locator('#reader-scrubber');await slider.focus();await slider.press('ArrowRight');await slider.press('ArrowRight');
   assert.equal((await current(page)).index,2);assert.equal((await current(page)).noteFocus,null);
   assert.equal((await page.locator('.study-table tbody tr.is-linked th').textContent()).trim(),'B');
  });
  await check(`${label}: 即時入力の例には無意味な次段階ボタンを出さない`,async()=>{
   await open(page,'c08-gate');await page.locator('[data-r-phase="1"]').click();
   assert.equal(await page.locator('#reader-sequence-tools').isVisible(),false);
   assert.equal(await page.locator('#reader-guidance [data-r-action="next"]').count(),0);
   await page.locator('#reader-guidance [data-r-action="controls"]').click();
   assert.equal(await page.evaluate(()=>document.activeElement.id),'reader-controls');
  });
  await check(`${label}: 最終段階で説明タブを切り替えても進むボタンは無効`,async()=>{
   await open(page,'n11-tcp');const slider=page.locator('#reader-scrubber');await slider.focus();await slider.press('End');
   await page.locator('[data-r-phase="1"]').click();
   assert.equal(await page.locator('#reader-guidance [data-r-action="next"]').isDisabled(),true);
   await page.locator('[data-r-action="back"]').click();
   assert.equal(await page.locator('#reader-guidance [data-r-action="next"]').isDisabled(),false);
  });
  await check(`${label}: 初期化すると回答と見た目の回答状態をともに消す`,async()=>{
   await open(page,'c01-entropy');await page.locator('[data-r-phase="3"]').click();await page.locator('[data-r-answer]').first().click();
   assert.ok((await page.locator('#reader-answer-feedback').textContent()).length>0);
   await page.locator('[data-r-action="reset"]').click();await ready(page,'c01-entropy');
   assert.equal((await current(page)).answer,null);assert.equal((await page.locator('#reader-answer-feedback').textContent()).trim(),'');
   assert.equal(await page.locator('[data-r-answer][aria-pressed="true"]').count(),0);
  });
  await check(`${label}: 遅延計算を注入しても古い結果が新しい入力を上書きしない`,async()=>{
   await open(page,'c01-entropy');
   await page.evaluate(()=>{const original=CSL.run;CSL.run=async(l,p)=>{const r=await original(l,p);if(l.id==='c01-entropy'&&p.weights==='1,1,1,1')await new Promise(resolve=>setTimeout(resolve,900));return r;};});
   await page.locator('[data-r-param="weights"]').fill('1,1,1,1');await page.waitForFunction(()=>CSL.app.current.pending);
   await page.locator('[data-r-param="weights"]').fill('4,2,1,1');await ready(page,'c01-entropy');await sleep(1000);
   assert.equal((await current(page)).params.weights,'4,2,1,1');assert.equal((await current(page)).metrics['エントロピー (bit/記号)'],1.75);
  });
  await check(`${label}: 入力直後の画面移動で計算予約と旧画面の状態を破棄する`,async()=>{
   await open(page,'c01-entropy');await page.locator('[data-r-param="weights"]').fill('1,1,1,1');
   await page.locator('.reader-title-links a[href="#/catalog"]').click();await sleep(600);
   assert.equal(await page.evaluate(()=>CSL.app.current),null);
   await page.goto(`${base}#/lab/c01-entropy`);await ready(page,'c01-entropy');
   assert.equal((await current(page)).params.weights,'4,2,1,1');
  });
  await check(`${label}: 進行バーのマウス・タッチで段階を移動し、再生を止める`,async()=>{
   await open(page,'n11-tcp');await page.locator('#reader-play').click();
   const slider=page.locator('#reader-scrubber');await slider.scrollIntoViewIfNeeded();
   const box=await slider.boundingBox();assert.ok(box&&box.height>=40);
   if(label==='mobile')await page.touchscreen.tap(box.x+box.width*.72,box.y+box.height/2);
   else{await page.mouse.move(box.x+box.width*.2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.72,box.y+box.height/2,{steps:6});await page.mouse.up();}
   const s=await current(page);assert.equal(s.playing,false);assert.ok(s.index>0);
   await sleep(350);assert.equal((await current(page)).index,s.index);
  });
  await check(`${label}: 説明・図・条件の間をボタンとキーボードで移動できる`,async()=>{
   await open(page,'c01-linear-code');await page.locator('[data-r-action="diagram"]').click();
   assert.equal(await page.evaluate(()=>document.activeElement.id),'reader-figure');
   await page.locator('[data-r-action="guidance"]').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'reader-guidance');
  });
  await context.close();
 }
 await check('幅320px: 大きい図は内部でスクロールし、ページを押し広げない',async()=>{
  const context=await browser.newContext({viewport:{width:320,height:780},isMobile:true,hasTouch:true});const page=await context.newPage();
  try{for(const id of ['c01-linear-code','c01-entropy','c10-address-spaces','n11-tcp','s10-cors']){await open(page,id);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,id);}}finally{await context.close();}
 });
}catch(e){report.errors.push({message:String(e.stack||e)});}
finally{
 await browser?.close();server.kill();
 report.finished=new Date().toISOString();report.passed=report.cases.filter(x=>x.passed).length;report.failed=report.cases.filter(x=>!x.passed).length;
 await writeFile(`${output}/reader-regressions.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({browser:report.browser,passed:report.passed,failed:report.failed,errors:report.errors},null,2));
 if(report.failed||report.errors.length)process.exitCode=1;
}
