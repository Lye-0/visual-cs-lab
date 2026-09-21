import test from 'node:test';
import assert from 'node:assert/strict';
import {modelModules} from '../scripts/modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
const N=CSL.experiences.net,clone=CSL.experiences.clone;
const request=(s,method,path,text='edge')=>N.http(s,{kind:'request',method,path,text});
test('HTTPの最大IDを指定しても、読めないLocationを生成しない',()=>{
 let s=request(N.httpStart(),'PUT','/items/99');assert.equal(s.last.status,201);
 const before=clone(s);assert.throws(()=>request(s,'POST','/items'),/自動採番は99まで/);assert.deepEqual(s,before);
 s=request(s,'GET','/items/99');assert.equal(s.last.status,200);assert.deepEqual(s.last.body,{text:'edge'});
});
test('POSTで生成した境界99の資源はGETでき、次の作成だけを拒否する',()=>{
 let s=request(N.httpStart(),'PUT','/items/98');s=request(s,'POST','/items');const location=s.last.headers.Location;
 assert.equal(location,'/items/99');s=request(s,'GET',location);assert.equal(s.last.status,200);
 const before=clone(s);assert.throws(()=>request(s,'POST','/items'),/99まで/);assert.deepEqual(s,before);
 s=request(s,'DELETE','/items/99');assert.equal(s.last.status,204);
});
test('同じPUTの反復は自動採番や現在の表現を変えない',()=>{
 let s=request(N.httpStart(),'PUT','/items/9','hello'),next=s.next,resources=clone(s.resources);
 s=request(s,'PUT','/items/9','hello');assert.equal(s.next,next);assert.deepEqual(s.resources,resources);
 s=request(s,'POST','/items','new');assert.equal(s.last.headers.Location,'/items/10');assert.equal(s.resources['/items/9'].text,'hello');
});
