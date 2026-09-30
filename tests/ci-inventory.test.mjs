// Keep CI evidence complete as lessons are added to the committed catalogue.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {fixtureLabs} from './lesson-fixtures.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const sourceCommit='inventory-regression-fixture';
const completeReport=cases=>({sourceCommit,passed:cases.length,failed:0,errors:[],cases});

async function verifyFixture(t,change=()=>{}){
 const cwd=await mkdtemp(path.join(tmpdir(),'visual-cs-report-'));
 t.after(()=>rm(cwd,{recursive:true,force:true}));
 await mkdir(path.join(cwd,'review-output'));await mkdir(path.join(cwd,'data'));
 for(const file of ['index.html','README.md','data/experiments.json'])await copyFile(path.join(root,file),path.join(cwd,file));
 const reports={
  probe:{...completeReport([{name:'independent model example',passed:true}]),registered:155,missing:[]},
  browser:{...completeReport(['desktop','mobile'].flatMap(viewport=>fixtureLabs.map(lab=>({name:`${viewport}: ${lab.id} 初期例・移動・比較・説明`,passed:true})))),units:fixtureLabs.length,viewports:['desktop','mobile'],browser:'test fixture'},
  regressions:completeReport([{name:'retained regression',passed:true}])
 };
 change(reports);
 await writeFile(path.join(cwd,'review-output/curriculum-node.txt'),'# tests 1\n# pass 1\n# fail 0\n# skipped 0\n# cancelled 0\n');
 for(const [key,file]of [['probe','curriculum-probe'],['browser','curriculum-browser'],['regressions','reader-regressions']])await writeFile(path.join(cwd,'review-output',file+'.json'),JSON.stringify(reports[key]));
 const result=spawnSync(process.execPath,[path.join(root,'scripts/curriculum-verification-report.mjs')],{cwd,env:{...process.env,SOURCE_COMMIT:sourceCommit},encoding:'utf8'});
 return {cwd,result};
}

test('curriculum evidence accepts every current lesson and reports current counts',async t=>{
 const {cwd,result}=await verifyFixture(t);assert.equal(result.status,0,result.stderr);
 const report=JSON.parse(await readFile(path.join(cwd,'review-output/curriculum-verification.json'),'utf8'));
 assert.equal(report.units,fixtureLabs.length);assert.equal(report.additionalUnits,fixtureLabs.length-159-155);
 const markdown=await readFile(path.join(cwd,'review-output/CURRICULUM_REPORT.md'),'utf8');
 assert.ok(markdown.includes(`追加${report.additionalUnits}単元＝${fixtureLabs.length}単元`));
 assert.ok(markdown.includes(`全${fixtureLabs.length}単元`));
});
for(const id of ['c03-vector-space','c03-subspace'])test('curriculum evidence rejects missing lesson coverage: '+id,async t=>{
 const {result}=await verifyFixture(t,reports=>{reports.browser.cases=reports.browser.cases.filter(c=>!c.name.includes(id));reports.browser.passed=reports.browser.cases.length;});
 assert.notEqual(result.status,0);assert.match(result.stderr,/Missing actual page check/);
});
for(const [name,change]of [
 ['stale source revision',r=>{r.browser.sourceCommit='old';}],
 ['stale unit count',r=>{r.browser.units=315;}],
 ['failed browser case',r=>{r.browser.cases[0].passed=false;r.browser.failed=1;}]
])test('curriculum evidence rejects '+name,async t=>{
 const {result}=await verifyFixture(t,change);assert.notEqual(result.status,0);assert.match(result.stderr,/AssertionError/);
});
