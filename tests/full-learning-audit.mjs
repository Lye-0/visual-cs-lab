// Full-scope verification of committed sources. Structural success is not a
// claim that all teaching requirements or all input combinations were tested.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
import {installGeometryAudit,verifyGeometryAudit} from './audit-geometry.mjs';
const name=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[name];if(!engine)throw Error('Unknown engine');
const out='review-output/full-audit',capture=name==='chromium';
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4217'},stdio:['ignore','ignore','pipe']});
let serverError='',browser;server.stderr.on('data',d=>serverError+=d);server.on('error',e=>serverError+=e.message);
const report={sourceCommit:process.env.GITHUB_SHA||'local',engine:name,widths:[1440,390,320],units:[],chapters:[],failures:[],runtime:[],scope:'All registered authored chapters; visual candidates are not automatic failures or pedagogical approvals.'};
const base='http://127.0.0.1:4217/';
const digest=s=>createHash('sha256').update(s).digest('hex');
async function ready(page,id,ch){
 await page.waitForFunction(({id,ch})=>{const c=globalThis.CSL?.app?.current;if(!c?.experience||c.lab.id!==id||c.chapter!==ch)return false;const a=CSL.experiences.find(id)?.chapters.find(x=>x.id===ch);return a&&c.completed.size>=a.activities.length&&!document.querySelector('.experience [aria-busy="true"]');},{id,ch},{timeout:18000});
 await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
}
async function inspect(page){return page.evaluate(()=>{
 const root=document.querySelector('.experience'),current=CSL.app.current;
 const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!el.closest('[hidden]');};
 const name=el=>(el.getAttribute('aria-label')||[...(el.labels||[])].map(l=>l.textContent).join(' ')||el.getAttribute('title')||el.textContent||'').replace(/\s+/g,' ').trim();
 const controls=[...root.querySelectorAll('input:not([type=hidden]),select,textarea,button,[role=button]')].filter(visible).map(el=>({tag:el.tagName,type:el.type||el.getAttribute('role'),name:name(el),key:el.name||el.dataset.secField||el.dataset.netField||'',disabled:el.disabled||false,valid:el.validity?el.validity.valid:true}));
 const ids=[...document.querySelectorAll('[id]')].map(el=>el.id),duplicates=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
 const orphanLabels=[...root.querySelectorAll('label[for]')].filter(el=>!document.getElementById(el.htmlFor)).map(el=>el.htmlFor);
 const candidates=[];
 for(const svg of root.querySelectorAll('svg')){
  if(!visible(svg)||!svg.viewBox?.baseVal?.width)continue;
  const vb=svg.viewBox.baseVal;
  for(const el of svg.querySelectorAll('text')){
   if(!visible(el)||!el.textContent.trim())continue;
   try{
    // getBBox() alone is local to the text. Map all four corners through the
    // ancestor transforms before comparing to this SVG's viewBox.
    const b=__auditSvgBox(el,svg),style=getComputedStyle(el);
    if(__auditSvgOutside(el,svg))candidates.push({type:'svg-text-outside-viewbox',text:el.textContent.slice(0,100),box:b,viewBox:[vb.x,vb.y,vb.width,vb.height]});
    if(style.fill==='rgb(0, 0, 0)')candidates.push({type:'black-svg-text',text:el.textContent.slice(0,100)});
   }catch(e){candidates.push({type:'geometry-measurement-failed',text:el.textContent.slice(0,100),error:e.message});}
  }
 }
 for(const el of root.querySelectorAll('button,label,h1,h2,h3,h4,summary,.ex-instruction,[data-sec-status]')){
  if(!visible(el))continue;const s=getComputedStyle(el);
  if(el.scrollWidth>el.clientWidth+3&&el.clientWidth>0&&['hidden','clip'].includes(s.overflowX))candidates.push({type:'clipped-ui-text',tag:el.tagName,text:name(el).slice(0,140)});
 }
 return {title:root.querySelector('h1')?.textContent,errors:current.errors,chapter:root.querySelector('[data-ex-chapter]')?.dataset.exChapter,activities:[...root.querySelectorAll('[data-ex-kind]')].map(el=>({kind:el.dataset.exKind,text:el.innerText,controls:[...el.querySelectorAll('button,input,select,textarea')].filter(visible).map(name)})),controls,duplicates,orphanLabels,candidates,overflow:document.documentElement.scrollWidth>innerWidth+2,csp:window.__auditCsp||[],text:root.innerText};
 });}
try{
 await mkdir(out+'/captures',{recursive:true});
 for(let i=0;i<120;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===119)throw Error(serverError||'server timeout');await sleep(100);}
 browser=await engine.launch({headless:true});report.version=browser.version();
 report.geometrySelfTest=await verifyGeometryAudit(browser);
 for(const width of report.widths){
  const ctx=await browser.newContext({viewport:{width,height:1000},hasTouch:width<500,reducedMotion:'reduce'}),page=await ctx.newPage();page.setDefaultTimeout(10000);
  await ctx.addInitScript(installGeometryAudit);
  await ctx.addInitScript(()=>{window.__auditCsp=[];document.addEventListener('securitypolicyviolation',e=>__auditCsp.push(e.effectiveDirective));});
  let location=null;page.on('pageerror',e=>report.runtime.push({width,location,message:e.message}));
  page.on('response',r=>{if(r.status()>=400)report.runtime.push({width,location,http:r.status(),url:r.url()});});
  await page.goto(base);await page.waitForFunction(()=>CSL?.app?.ready);
  const units=await page.evaluate(()=>CSL.labs.map(l=>{const d=CSL.experiences.find(l.id);return {id:l.id,title:l.unit,lead:d?.lead,chapters:d?.chapters||[],scope:l.scope||l.limits||null};}));
  assert.equal(units.length,314);assert.equal(await page.evaluate(()=>CSL.experiences.inventory().units),314);
  if(!report.units.length)report.units=units;
  for(const unit of units)for(const chapter of unit.chapters){
   const row={id:unit.id,chapter:chapter.id,width,passed:false};location=unit.id+'/'+chapter.id;
   try{
    await page.goto(base+'#/lab/'+unit.id+'?chapter='+chapter.id);await ready(page,unit.id,chapter.id);
    const view=await inspect(page);row.observed={...view};delete row.observed.text;row.textHash=digest(view.text.replace(/\s+/g,' ').trim());
    assert.equal(view.title,unit.title);assert.equal(view.chapter,chapter.id);assert.deepEqual(view.errors,[]);assert.deepEqual(view.csp,[]);assert.equal(view.overflow,false,'body overflow');
    assert.equal(view.activities.length,chapter.activities.length);assert.deepEqual(view.controls.filter(c=>c.tag==='INPUT'&&c.type==='number'&&!c.valid),[]);
    assert.deepEqual(view.orphanLabels,[]);assert.deepEqual(view.duplicates,[],'duplicate DOM IDs');
    row.passed=true;
    if(capture&&width===1440)await writeFile(`${out}/captures/${unit.id}--${chapter.id}.txt`,view.text);
    if(capture&&(width===1440||width===390)){
     const path=`${out}/captures/${unit.id}--${chapter.id}--${width}.jpg`;
     await page.locator('.experience').screenshot({path,type:'jpeg',quality:68,timeout:15000});row.capture=path.split('/').at(-1);
    }
   }catch(e){row.error=String(e.stack||e);report.failures.push({id:unit.id,chapter:chapter.id,width,error:row.error});console.error('AUDIT_FAILURE '+JSON.stringify(report.failures.at(-1)));}
   report.chapters.push(row);
  }
  await ctx.close();console.log('WIDTH_DONE '+JSON.stringify({engine:name,width,checked:report.chapters.filter(r=>r.width===width).length,failed:report.failures.filter(r=>r.width===width).length}));
 }
}catch(e){report.runtime.push({error:String(e.stack||e)});console.error(e);}
finally{
 await browser?.close();server.kill();
 report.summary={units:report.units.length,uniqueChapters:report.units.reduce((n,u)=>n+u.chapters.length,0),visited:report.chapters.length,passed:report.chapters.filter(r=>r.passed).length,failed:report.failures.length,runtime:report.runtime.length,candidatePages:report.chapters.filter(r=>r.observed?.candidates.length).length};
 await mkdir(out,{recursive:true});await writeFile(`${out}/${name}.json`,JSON.stringify(report,null,2));
 if(capture)await writeFile(`${out}/inventory.ndjson`,report.units.map(u=>JSON.stringify(u)).join('\n'));
 console.log('AUDIT_SUMMARY '+JSON.stringify(report.summary));
 console.log('VISUAL_CANDIDATES '+JSON.stringify(report.chapters.filter(r=>r.width===1440&&r.observed?.candidates.length).map(r=>({id:r.id,chapter:r.chapter,candidates:r.observed.candidates}))));
 if(report.failures.length||report.runtime.length)process.exitCode=1;
}
