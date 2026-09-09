// Regression for shared SVG colors in the lesson reader.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright';

const output='review-output';
await mkdir(`${output}/screenshots`,{recursive:true});
const report={sourceCommit:process.env.GITHUB_SHA||'local',started:new Date().toISOString(),cases:[],errors:[]};
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4178'},stdio:['ignore','pipe','pipe']});
let serverLog='',browser;
server.stdout.on('data',d=>serverLog+=d);server.stderr.on('data',d=>serverLog+=d);
const base='http://127.0.0.1:4178/';
async function check(name,fn){try{await fn();report.cases.push({name,passed:true});}catch(error){report.cases.push({name,passed:false,error:String(error.stack||error)});console.error(`FAIL ${name}\n${error.message}`);}}
const ready=(page,id)=>page.waitForFunction(id=>{const c=globalThis.CSL?.app.current;return c?.reader&&c.lab.id===id&&!c.pending&&!c.dirty&&!c.error&&!!c.result;},id,{timeout:12000});
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw Error(serverLog||'Server unavailable');await sleep(100);}
 browser=await chromium.launch({headless:true});report.browser=browser.version();
 for(const [label,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  const context=await browser.newContext({viewport,isMobile:label==='mobile',hasTouch:label==='mobile',reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(6000);
  page.on('pageerror',error=>report.errors.push({viewport:label,url:page.url(),message:error.message}));
  await check(`${label}: ネットワーク図の機器・文字・配線が黒既定色に落ちない`,async()=>{
   await page.goto(`${base}#/lab/n03-switch`);await ready(page,'n03-switch');
   const styles=await page.evaluate(()=>{
    const node=document.querySelector('#reader-diagram .network-node');
    if(!node)throw new Error('network node not found');
    const outer=node.querySelector(':scope > rect');
    const symbol=node.querySelector('.node-symbol');
    const symbolShape=symbol?.querySelector('rect,path,line,circle');
    const label=node.querySelector('.svg-label');
    const sub=node.querySelector('.svg-small');
    const edge=document.querySelector('#reader-diagram .network-edge');
    const style=el=>el?getComputedStyle(el):null;
    return {
      outerFill:style(outer)?.fill,outerStroke:style(outer)?.stroke,
      symbolFill:style(symbolShape)?.fill,symbolStroke:style(symbolShape)?.stroke,
      labelFill:style(label)?.fill,subFill:style(sub)?.fill,edgeStroke:style(edge)?.stroke
    };
   });
   const black=new Set(['rgb(0, 0, 0)','rgba(0, 0, 0, 1)','black']);
   assert.ok(styles.outerFill&&!black.has(styles.outerFill),`outer fill = ${styles.outerFill}`);
   assert.ok(styles.outerStroke&&!black.has(styles.outerStroke),`outer stroke = ${styles.outerStroke}`);
   assert.equal(styles.symbolFill,'none');
   assert.ok(styles.symbolStroke&&!black.has(styles.symbolStroke),`symbol stroke = ${styles.symbolStroke}`);
   assert.ok(styles.labelFill&&!black.has(styles.labelFill),`label fill = ${styles.labelFill}`);
   assert.ok(styles.subFill&&!black.has(styles.subFill),`sub label fill = ${styles.subFill}`);
   assert.ok(styles.edgeStroke&&!black.has(styles.edgeStroke),`edge stroke = ${styles.edgeStroke}`);
   await page.screenshot({path:`${output}/screenshots/n03-switch-svg-theme-${label}.png`,fullPage:true});
  });
  await context.close();
 }
}catch(error){report.errors.push({message:String(error.stack||error)});}
finally{
 await browser?.close();server.kill();
 report.finished=new Date().toISOString();report.passed=report.cases.filter(x=>x.passed).length;report.failed=report.cases.filter(x=>!x.passed).length;
 await writeFile(`${output}/reader-svg-theme.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({browser:report.browser,passed:report.passed,failed:report.failed,errors:report.errors},null,2));
 if(report.failed||report.errors.length)process.exitCode=1;
}
