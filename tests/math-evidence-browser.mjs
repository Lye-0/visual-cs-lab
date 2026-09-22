// This suite uses the real committed site. It never rebuilds or patches it.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
const engine=process.env.BROWSER||'chromium',report={sourceCommit:process.env.GITHUB_SHA||'local',engine,scope:['c03-matrix','gap-002','gap-006','gap-008'],cases:[],errors:[],screenshotsReviewed:false};
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4211'},stdio:['ignore','ignore','pipe']});let serverErrors='',browser,serial=0;
server.stderr.on('data',d=>serverErrors+=d);server.on('error',e=>serverErrors+=e.message);
const base='http://127.0.0.1:4211/';
async function check(name,fn){try{await fn();report.cases.push({name,passed:true});}catch(e){report.cases.push({name,passed:false,error:String(e.stack||e)});console.error('FAIL '+name+'\n'+e.stack);}}
async function idle(page){await page.waitForFunction(()=>!document.querySelector('.experience [aria-busy="true"]'));}
async function open(page,id,chapter){
 await page.goto(base+'?review='+ ++serial+'#/lab/'+id+(chapter?'?chapter='+chapter:''));
 await page.waitForFunction(({id,chapter})=>{const c=globalThis.CSL?.app?.current;if(!c?.experience||c.lab.id!==id||chapter&&c.chapter!==chapter)return false;const ch=CSL.experiences.find(id)?.chapters.find(ch=>ch.id===c.chapter);return ch&&c.completed.size>=ch.activities.length&&!document.querySelector('.experience [aria-busy="true"]');},{id,chapter},{timeout:20000});
 assert.deepEqual(await page.evaluate(()=>CSL.app.current.errors),[]);
}
const action=async(page,code)=>{await page.locator('[data-sec-action="'+code+'"]').first().click();await idle(page);};
const state=page=>page.locator('[data-sec-state]').evaluate(el=>JSON.parse(el.dataset.secState));
const field=(page,key)=>page.locator('[data-sec-field="'+key+'"]');
const rowState=page=>page.locator('[data-row-state]').evaluate(el=>JSON.parse(el.dataset.rowState));
const odeState=page=>page.locator('[data-ode-state]').evaluate(el=>JSON.parse(el.dataset.odeState));
async function rowOp(page,operation,row,other,factor){const f=page.locator('.ex-row-controls');await f.locator('[name=kind]').selectOption(operation);await f.locator('[name=row]').selectOption(String(row));await f.locator('[name=other]').selectOption(String(other));await f.locator('[name=factor]').fill(factor);await f.locator('button[type=submit]').click();}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw Error(serverErrors||'server startup timeout');await sleep(100);}
 browser=await ({chromium,firefox,webkit}[engine]).launch({headless:true});report.version=browser.version();
 for(const width of [1440,390,320]){
  const ctx=await browser.newContext({viewport:{width,height:960},hasTouch:width<500,reducedMotion:'reduce'}),page=await ctx.newPage(),requests=[];page.setDefaultTimeout(9000);
  page.on('pageerror',e=>report.errors.push({width,message:e.message}));page.on('response',r=>{if(r.status()>=400)requests.push(r.url());});
  await ctx.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>__csp.push(e.effectiveDirective));});
  await open(page,'c03-matrix','meaning');const units=await page.evaluate(ids=>ids.map(id=>({id,chapters:CSL.experiences.find(id).chapters.map(c=>({id:c.id,count:c.activities.length}))})),report.scope);
  for(const unit of units)for(const chapter of unit.chapters)await check(width+'/'+unit.id+'/'+chapter.id+' real page, labels, bounds',async()=>{
   await open(page,unit.id,chapter.id);assert.equal(await page.locator('[data-ex-activity]').count(),chapter.count);assert.equal(await page.locator('.experience input[type=number]:invalid').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   assert.deepEqual(await page.locator('.experience label[for]').evaluateAll(labels=>labels.filter(l=>!document.getElementById(l.htmlFor)).map(l=>l.htmlFor)),[]);assert.deepEqual(await page.evaluate(()=>__csp),[]);
  });
  await check(width+': selected matrix cell links exactly one left row and one right column',async()=>{
   await open(page,'c03-matrix','product');await action(page,'select:1:0');assert.equal(await page.locator('[data-operand=true]').count(),6);assert.equal((await state(page)).row,1);assert.match(await page.locator('[data-sec-board]').textContent(),/第2行 × 第1列/);assert.match(await page.locator('[data-sec-board]').textContent(),/\(4\) × \(1\)/);
   await action(page,'order:BA');assert.equal((await state(page)).order,'BA');assert.equal(await page.locator('.ex-me-matrix').last().locator('button').count(),9);
  });
  await check(width+': dimension error is explanatory, malformed input is atomic',async()=>{
   await open(page,'c03-matrix','product');await page.locator('[data-sec-board]>details summary').click();await field(page,'B').fill('1;2;3');await action(page,'load');await action(page,'order:BA');assert.match(await page.locator('[data-sec-board]').textContent(),/この順序では定義できない/);
   const before=await state(page);await page.locator('[data-sec-board]>details summary').click();await field(page,'B').fill('1/0');await action(page,'load');assert.deepEqual(await state(page),before);assert.ok(await page.locator('[data-sec-status]').textContent());
   await action(page,'reset');assert.equal((await state(page)).order,'AB');
  });
  await check(width+': exact third is retained through solving, original equations are checked',async()=>{
   await open(page,'gap-002','equations');await rowOp(page,'add',0,1,'1');await rowOp(page,'scale',0,1,'1/3');let s=await rowState(page);assert.deepEqual(s.entries.at(-1).matrix[0],[[1,1],[0,1],[2,1]]);assert.match(await page.locator('[data-row-history]').textContent(),/1\/3/);
   await rowOp(page,'add',1,0,'-1');await rowOp(page,'scale',1,0,'-1');assert.match(await page.locator('[data-ex-status]').textContent(),/x = 2、y = 1/);assert.match(await page.locator('[data-row-result]').textContent(),/元の式/);
   const count=s.entries.length;assert.ok(await page.locator('[data-row-step]').count()>count);await page.locator('[data-row-undo]').click();assert.equal((await rowState(page)).entries.length,4);
  });
  await check(width+': inverse updates both halves without decimal drift',async()=>{
   await open(page,'gap-002','inverse');await rowOp(page,'add',0,1,'1');await rowOp(page,'scale',0,1,'1/3');await rowOp(page,'add',1,0,'-1');await rowOp(page,'scale',1,0,'-1');assert.match(await page.locator('[data-ex-status]').textContent(),/逆行列/);
   const s=await rowState(page);assert.deepEqual(s.entries.at(-1).matrix.map(r=>r.slice(2)),[[[1,3],[1,3]],[[1,3],[-2,3]]]);assert.match(await page.locator('[data-row-result]').textContent(),/A ×/);
  });
  await check(width+': contradictory and redundant rows are distinguishable by the learner',async()=>{
   await open(page,'gap-002','equations');await page.locator('[data-row-preset=inconsistent]').click();await rowOp(page,'add',1,0,'-2');assert.match(await page.locator('[data-ex-status]').textContent(),/0 = 1/);
   await page.locator('[data-row-preset=dependent]').click();await rowOp(page,'add',1,0,'-2');assert.match(await page.locator('[data-ex-status]').textContent(),/無数/);const s=await rowState(page);
   await rowOp(page,'scale',0,1,'0');assert.deepEqual(await rowState(page),s);assert.match(await page.locator('[data-ex-status]').textContent(),/0倍/);
  });
  await check(width+': gradient keeps the point while direction and approximation change',async()=>{
   await open(page,'gap-006','gradient');await action(page,'direction:up');const first=await state(page);assert.deepEqual(first.point,[1,1]);await action(page,'direction:level');const v=await page.evaluate(()=>CSL.experiences.mathEvidence.gradientView(JSON.parse(document.querySelector('[data-sec-state]').dataset.secState)));assert.ok(Math.abs(v.slope)<1e-9);assert.ok(v.error>0);assert.match(await page.locator('[data-sec-board]').textContent(),/直線を有限距離/);
   await field(page,'step').fill('0.125');await action(page,'step');assert.equal((await state(page)).step,.125);assert.deepEqual((await state(page)).point,first.point);
  });
  await check(width+': gradient pointer followed by keys retains focus on the new graph',async()=>{
   await open(page,'gap-006','gradient');const graph=page.locator('[data-me-gradient]');await graph.scrollIntoViewIfNeeded();const box=await graph.boundingBox();await page.mouse.click(box.x+box.width*.55,box.y+box.height*.5);await idle(page);assert.equal(await page.evaluate(()=>document.activeElement?.hasAttribute('data-me-gradient')),true);const old=await state(page);await page.keyboard.press('ArrowRight');await idle(page);assert.ok((await state(page)).point[0]>old.point[0]);assert.equal(Number(await field(page,'x').inputValue()),(await state(page)).point[0]);
  });
  await check(width+': zero gradient has no fabricated best direction',async()=>{
   await open(page,'gap-006','gradient');await field(page,'x').fill('0');await field(page,'y').fill('0');await action(page,'point');await action(page,'shape:saddle');const old=await state(page);await action(page,'direction:up');assert.deepEqual(await state(page),old);assert.match(await page.locator('[data-sec-status]').textContent(),/零/);assert.match(await page.locator('[data-sec-board]').textContent(),/極小か鞍点か/);
  });
  await check(width+': ODE explains a departure slope, not an arrival slope',async()=>{
   await open(page,'gap-008','family');const before=await page.locator('[data-ode-table]').textContent();await page.locator('[data-ode-step]').click();const s=await odeState(page);assert.equal(s.rows[1].departure.t,0);assert.equal(s.rows[1].departure.slope,-2);assert.equal(s.rows[1].t,.25);assert.match(await page.locator('[data-ode-evidence]').textContent(),/時刻0から0.25へ/);assert.match(await page.locator('[data-ode-evidence]').textContent(),/次の傾きは-1.5/);await page.locator('[data-ode-back]').click();assert.equal(await page.locator('[data-ode-table]').textContent(),before);
  });
  await check(width+': large numeric errors remain inside the chart and can be inspected',async()=>{
   await open(page,'gap-008','family');await page.locator('.ex-kind-ode [name=initial]').fill('3');await page.locator('.ex-kind-ode [name=k]').fill('3');await page.locator('.ex-kind-ode [name=h]').fill('1');await page.locator('.ex-kind-ode button[type=submit]').click();for(let i=0;i<4;i++)await page.locator('[data-ode-step]').click();assert.equal((await odeState(page)).rows[4].euler,48);
   const bounded=await page.locator('.ex-me-ode .ex-euler-dot').evaluateAll(nodes=>nodes.every(el=>Number(el.getAttribute('cx'))>=0&&Number(el.getAttribute('cx'))<=510&&Number(el.getAttribute('cy'))>=0&&Number(el.getAttribute('cy'))<=368));assert.equal(bounded,true);await page.locator('[data-ode-select="1"]').click();assert.equal((await odeState(page)).selected,1);assert.equal(await page.locator('.ex-family-line').count(),7);
  });
  await check(width+': page disposal and route-return do not restore study history',async()=>{
   await open(page,'gap-006','gradient');await action(page,'shape:saddle');await page.goto(base+'#/catalog');await page.waitForSelector('#catalog-query');await page.keyboard.press('ArrowRight');await open(page,'gap-006','gradient');assert.equal((await state(page)).shape,'bowl');assert.deepEqual(requests,[]);assert.deepEqual(await page.evaluate(()=>__csp),[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  });
  await mkdir('review-output/math-evidence-screenshots',{recursive:true});
  for(const [id,ch]of [['c03-matrix','product'],['gap-002','equations'],['gap-006','gradient'],['gap-008','family']]){await open(page,id,ch);await page.screenshot({path:`review-output/math-evidence-screenshots/${engine}-${width}-${id}.png`,fullPage:true});}
  await ctx.close();
 }
}catch(e){report.errors.push({message:String(e.stack||e)});console.error(e);}
finally{await browser?.close();server.kill();report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;await mkdir('review-output',{recursive:true});await writeFile(`review-output/math-evidence-${engine}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,cases:report.cases.filter(c=>!c.passed)},null,2));if(report.failed||report.errors.length)process.exitCode=1;}
