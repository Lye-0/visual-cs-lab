import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/live-input.js',import.meta.url),'utf8');
function fixture(){
 const context=vm.createContext({CSL:{experiences:{}},document:{activeElement:null},setTimeout,clearTimeout});vm.runInContext(source,context);
 const events={},cleanups=[],root={querySelectorAll:()=>[]},el={type:'text',tagName:'INPUT',value:'2',matches:()=>true};let count=0;
 const send=type=>events[type]({type,target:el});
 const scope={alive:()=>true,on:(_el,type,fn)=>{events[type]=fn;},cleanup:fn=>cleanups.push(fn)};
 const live=context.CSL.experiences.liveInput(root,scope,{accept:()=>true,apply:()=>{count++;send('change');}});
 return {el,send,live,count:()=>count,close:()=>cleanups.forEach(fn=>fn())};
}
test('blur/change during rendering does not apply the input twice',async()=>{
 const f=fixture();try{f.send('input');await f.live.settle();assert.equal(f.count(),1);assert.equal(f.live.pending,false);}finally{f.close();}
});
test('later edits, including a repeated value, still apply once',async()=>{
 const f=fixture();try{for(const value of ['2','3','2']){f.el.value=value;f.send('input');await f.live.settle();}assert.equal(f.count(),3);}finally{f.close();}
});
