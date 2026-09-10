import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {L} from './helpers.mjs';
const K=L.curriculum;
const finalState=r=>r.frames.at(-1);
function cleanStack(r){
 assert.equal(finalState(r).stats['呼出し深さ'],0);
 assert.equal(finalState(r).visual.scopes.length,1);
 assert.match(finalState(r).visual.scopes[0].label,/^main /);
}
for(const [name,program]of [
 ['first argument','fn f(a: number) { return a; } f("bad");'],
 ['later argument','fn f(a: number, b: number) { return a+b; } f(1,"bad");']
])test('typed call rejects '+name+' without leaking an environment',()=>{
 const r=K.runtime.execute(program,{checkTypes:true});
 assert.match(r.error,/引数.*型/);cleanStack(r);
 assert.ok(!r.frames.some(f=>f.title==='fへ引数を渡す'));
});
test('repeated caught argument errors do not exhaust maxDepth or pollute later calls',()=>{
 const r=K.runtime.execute('fn f(a: number): number { return a+1; } for (let i=0; i<4; i++) { try { f("bad"); } catch (e) { print("caught"); } } print(f(6));',{checkTypes:true,maxDepth:1});
 assert.equal(r.error,null);assert.deepEqual(r.output,['caught','caught','caught','caught','7']);cleanStack(r);
 for(const frame of r.frames.filter(f=>f.title==='例外を受け取る'))assert.equal(frame.stats['呼出し深さ'],0);
});
test('nested invalid call unwinds to its live caller rather than a leaked callee',()=>{
 const r=K.runtime.execute('fn inner(x: number): number { return x; } fn outer(x: number): number { try { inner("bad"); } catch (e) { print(x); } return inner(x); } print(outer(7));',{checkTypes:true,maxDepth:2});
 assert.equal(r.error,null);assert.deepEqual(r.output,['7','7']);cleanStack(r);
 const caught=r.frames.find(f=>f.title==='例外を受け取る');
 assert.equal(caught.stats['呼出し深さ'],1);assert.ok(!caught.visual.scopes.some(s=>s.label.startsWith('inner()')));
});
test('return-type failures and body throws also restore the caller',()=>{
 for(const program of ['fn f(): number { return "bad"; } f();','fn f() { throw "boom"; } f();']){
  const r=K.runtime.execute(program,{checkTypes:true});assert.ok(r.error);cleanStack(r);
 }
});
test('scheduler records the END of three CPU ticks as time 3, not 2 or 4',()=>{
 const r=K.scheduleJobs('A 0 3 0',{policy:'FCFS'});
 assert.deepEqual(r.timeline.map(t=>[t.time,t.label]),[[0,'A'],[1,'A'],[2,'A']]);
 assert.equal(r.jobs[0].first,0);assert.equal(r.jobs[0].finished,3);assert.equal(r.time,3);
});
test('I/O starts after the CPU burst and wakes at 5 for CPU3/IO2/CPU1',()=>{
 const r=K.scheduleJobs('A 0 3/2/1 0',{policy:'FCFS'});
 assert.deepEqual(r.timeline.map(t=>t.label),['A','A','A','idle','idle','A']);
 assert.equal(r.jobs[0].wake,5);assert.equal(r.jobs[0].finished,6);assert.equal(r.jobs[0].wait,0);
});
test('arrival and overlapping I/O accounting stay on interval boundaries',()=>{
 const late=K.scheduleJobs('A 2 3 0',{policy:'FCFS'});
 assert.equal(late.jobs[0].first,2);assert.equal(late.jobs[0].finished,5);
 const r=K.scheduleJobs('A 0 3/2/1 0\nB 3 2 0',{policy:'FCFS'});
 assert.deepEqual(r.timeline.map(t=>t.label),['A','A','A','B','B','A']);
 assert.deepEqual(r.jobs.map(j=>j.finished),[6,5]);
 for(const j of r.jobs)assert.equal(j.finished-j.arrival,j.parts.reduce((a,b)=>a+b,0)+j.wait);
});
const dynamic=patch=>{const lab=L.labs.find(l=>l.id==='gap-043');return L.run(lab,{...lab.defaults,structure:'dynamic',...patch});};
test('dynamic arrays reject an already over-capacity initial state explicitly',async()=>{
 await assert.rejects(dynamic({values:'1,2,3,4,5',capacity:4}),/初期.*容量/);
 await assert.rejects(dynamic({capacity:2}),/初期.*容量/);
});
test('valid dynamic insertion doubles capacity and counts the real copies',async()=>{
 const r=await dynamic({values:'1,2,3,4,5',capacity:5});
 assert.equal(r.metrics['容量'],10);assert.equal(r.metrics['再確保コピー'],5);
 assert.equal(r.metrics['値'].split(',').length,6);
 const spare=await dynamic({capacity:5});assert.equal(spare.metrics['容量'],5);assert.equal(spare.metrics['再確保コピー'],0);
 const remove=await dynamic({operation:'delete'});assert.equal(remove.metrics['容量'],4);assert.equal(remove.metrics['再確保コピー'],0);
});
test('committed module checker is read-only and patch plans cannot run again',async()=>{
 const changed=()=>execFileSync('git',['diff','HEAD','--','src','scripts','tests','package.json','.github'],{encoding:'utf8'});
 const before=changed();execFileSync(process.execPath,['scripts/curriculum-finalize.mjs'],{stdio:'pipe'});assert.equal(changed(),before);
 assert.deepEqual((await readdir('scripts')).filter(n=>/^curriculum-patches.*\.json$/.test(n)),[]);
 for(const file of ['curriculum-verification.yml','lesson-review.yml']){
  const text=await readFile('.github/workflows/'+file,'utf8');assert.match(text,/contents: read/);
  assert.doesNotMatch(text,/contents: write|git push|git commit|pull_request_target/);
 }
 const files=await readdir('docs/verification');assert.ok(!files.includes('curriculum-status.json'));
});
