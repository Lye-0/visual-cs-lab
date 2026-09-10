// Incremental model audit. This report never marks unregistered GAPs as covered.
import assert from 'node:assert/strict';
import {readdir,mkdir,writeFile,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {modelModules} from './modules.mjs';
const root=new URL('../',import.meta.url);
for(const file of await readdir(new URL('src/',root))){if(!file.endsWith('.js'))continue;const result=spawnSync(process.execPath,['--check',new URL('src/'+file,root).pathname],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);}
for(const name of modelModules)await import(new URL('src/'+name+'.js',root));
if(!globalThis.CSL.curriculum)await import(new URL('src/curriculum-kit.js',root));
const wanted=/^curriculum-(math|statistics|theory|information|programming|algorithms|compilers|circuits|architecture|systems|distributed|databases|network|security|ai|media|embedded|engineering|web)\.js$/;
// Dependencies are limited to curriculum-kit. Files may be developed independently.
for(const file of (await readdir(new URL('src/',root))).filter(f=>wanted.test(f)).sort())await import(new URL('src/'+file,root));
const L=globalThis.CSL,K=L.curriculum;
const report={sourceCommit:process.env.GITHUB_SHA||'local',at:new Date().toISOString(),registered:K.entries.length,target:155,cases:[],missing:[],errors:[]};
async function check(name,fn){try{await fn();report.cases.push({name,passed:true});}catch(error){report.cases.push({name,passed:false,error:String(error.stack||error)});console.error('FAIL '+name+'\n'+error.stack);}}
function inspect(value,path){if(typeof value==='number')assert.ok(Number.isFinite(value),path);else if(value&&typeof value==='object')for(const [key,child]of Object.entries(value))inspect(child,path+'.'+key);}
for(let n=1;n<=155;n++)if(!K.entries.some(e=>e.number===n))report.missing.push('GAP-'+String(n).padStart(3,'0'));
for(const entry of K.entries.sort((a,b)=>a.number-b.number)){
 const lab=L.labs.find(l=>l.id===entry.id),cases=[['default',{}],['comparison',lab.exploration.patch]];
 for(const ctrl of lab.controls){if(ctrl.type==='range')cases.push([ctrl.key+' min',{[ctrl.key]:ctrl.min}],[ctrl.key+' max',{[ctrl.key]:ctrl.max}]);else if(ctrl.type==='toggle')cases.push([ctrl.key+' toggle',{[ctrl.key]:!ctrl.value}]);else if(ctrl.type==='select')for(const option of ctrl.options)cases.push([ctrl.key+'='+option.value,{[ctrl.key]:option.value}]);}
 for(const [label,params]of cases)await check(entry.tag+' '+label,async()=>{const result=await L.run(lab,{...lab.defaults,...params});assert.ok(result.frames.length>0&&result.frames.length<=1000,'frame bound');for(const frame of result.frames){assert.ok(frame.title&&frame.explain&&frame.visual.type);inspect(frame,'frame');}inspect(result.metrics,'metrics');assert.ok(Object.keys(result.metrics).length>0);});
 await check(entry.tag+' alternative is a real change',async()=>{const a=await L.run(lab,lab.defaults),b=await L.run(lab,{...lab.defaults,...lab.exploration.patch});assert.notDeepEqual(a,b);});
}
for(const item of K.tests)await check(item.id+' independent expected example '+JSON.stringify(item.params),async()=>{
 const lab=L.labs.find(l=>l.id===item.id),result=await L.run(lab,{...lab.defaults,...item.params});
 for(const [key,expected]of Object.entries(item.expected)){const actual=result.metrics[key];if(typeof expected==='number')assert.ok(typeof actual==='number'&&Math.abs(actual-expected)<=1e-5*Math.max(1,Math.abs(expected)),`${key}: ${actual} != ${expected}`);else assert.deepEqual(actual,expected,key);}
});
await check('linear algebra helpers against independent identities',()=>{
 assert.deepEqual(K.solve([[2,1],[1,-1]],[5,1]).solution,[2,1]);
 for(const a of [[[2,1],[1,2]],[[3,1,0],[1,4,2],[0,2,5]]]){const eig=K.eigenSym(a),qt=K.transpose(eig.vectors),reconstructed=K.multiply(K.multiply(eig.vectors,eig.values.map((v,i)=>eig.values.map((_,j)=>i===j?v:0))),qt);for(let i=0;i<a.length;i++)for(let j=0;j<a.length;j++)assert.ok(Math.abs(reconstructed[i][j]-a[i][j])<1e-8);}
 assert.ok(Math.abs(K.tCDF(1,1)-.75)<1e-8);assert.ok(Math.abs(K.gammaP(1,1)-(1-Math.exp(-1)))<1e-8);
});
report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;
await mkdir(new URL('review-output/',root),{recursive:true});await writeFile(new URL('review-output/curriculum-probe.json',root),JSON.stringify(report,null,2));
console.log(JSON.stringify({registered:report.registered,target:report.target,passed:report.passed,failed:report.failed,missing:report.missing},null,2));
if(report.failed)process.exitCode=1;
