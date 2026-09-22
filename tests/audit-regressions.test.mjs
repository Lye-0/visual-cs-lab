// Regressions discovered by the full 314-unit browser audit.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {modelModules} from '../scripts/modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
await import('../src/visuals.js');
await import('../src/curriculum-visuals.js');
const ids=markup=>[...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const references=markup=>[...markup.matchAll(/url\(#([^\)]+)\)/g)].map(m=>m[1]);
function isolated(markup){
 const defined=ids(markup);assert.equal(defined.length,new Set(defined).size);
 for(const ref of references(markup))assert.ok(defined.includes(ref),'reference resolves within its own diagram: '+ref);
}
const graph={type:'curriculum-board',kind:'graph',directed:true,nodes:[{id:'A',label:'A'},{id:'B',label:'B'}],edges:[{from:'A',to:'B',label:'send'}]};
test('two same-size curriculum graphs never share a marker ID',()=>{
 const one=CSL.visualize(graph),two=CSL.visualize(graph);isolated(one);isolated(two);assert.ok(references(one).length>0);assert.deepEqual(ids(one).filter(id=>ids(two).includes(id)),[]);
});
test('legacy comparison diagrams keep their own arrowhead and grid',()=>{
 const body='<path d="M0 0L10 10" marker-end="url(#arrowhead)"/>';
 const one=CSL.svg(body),two=CSL.svg(body);isolated(one);isolated(two);assert.equal(ids(one+two).length,4);assert.equal(new Set(ids(one+two)).size,4);
});
test('legacy network rendering also scopes references made inside the renderer',()=>{
 const network={type:'network',directed:true,nodes:[{id:'A',x:100,y:100},{id:'B',x:300,y:100}],edges:[{a:'A',b:'B'}]};
 const one=CSL.visualize(network),two=CSL.visualize(network);isolated(one);isolated(two);assert.equal(new Set(ids(one+two)).size,ids(one+two).length);
});
test('SVG scoping does not alter labels, escaped values, or external references',()=>{
 const markup=CSL.svg('<text>url(#arrowhead)</text><path fill="url(#arrowhead)"/><use href="https://example.test/image.svg#arrowhead"/>',100,100,'<diagram>');
 assert.match(markup,/<text>url\(#arrowhead\)<\/text>/);assert.match(markup,/https:\/\/example.test\/image.svg#arrowhead/);assert.match(markup,/aria-label="&lt;diagram&gt;"/);
});
test('repeated redraws and mixed visual families keep document IDs distinct',()=>{
 const markup=Array.from({length:60},(_,i)=>i%2?CSL.visualize(graph):CSL.svg('<path marker-start="url(#arrowhead)" marker-end="url(#arrowhead)"/>')).join('');
 assert.equal(new Set(ids(markup)).size,ids(markup).length);
});
test('verification uses inventory check mode, not regeneration',async()=>{
 const packageJson=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
 assert.match(packageJson.scripts.check,/inventory\s+--\s+--check/);
});
test('inventory --check compares both committed documents without writing either',async()=>{
 const paths=['../docs/EXPERIMENTS.md','../docs/experiments.json'].map(p=>new URL(p,import.meta.url));
 const before=await Promise.all(paths.map(p=>readFile(p,'utf8')));
 const {stdout}=await promisify(execFile)(process.execPath,['scripts/inventory.mjs','--check'],{cwd:new URL('..',import.meta.url),maxBuffer:1024*1024});
 assert.equal(JSON.parse(stdout).total,314);assert.deepEqual(await Promise.all(paths.map(p=>readFile(p,'utf8'))),before);
});
