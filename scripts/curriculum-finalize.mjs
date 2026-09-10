// Compatibility command: validation ONLY. Never patch, write, commit or push.
import {readFile,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {curriculumModules,modelModules,visualModules,browserModules,styles} from './modules.mjs';
const root=new URL('../',import.meta.url),at=p=>new URL(p,root);
const errors=[];
for(const dir of ['src','scripts','tests'])for(const name of await readdir(at(dir+'/'))){
 if(!/\.(js|mjs)$/.test(name))continue;
 const result=spawnSync(process.execPath,['--check',fileURLToPath(at(dir+'/'+name))],{encoding:'utf8'});
 if(result.status!==0)errors.push(dir+'/'+name+'\n'+result.stderr);
}
assert.deepEqual(errors,[],'Fix source syntax in the PR, not in the verifier');
for(const [label,items]of Object.entries({curriculumModules,modelModules,visualModules,browserModules,styles}))assert.equal(new Set(items).size,items.length,label+' has duplicates');
for(const name of browserModules)await readFile(at('src/'+name+'.js'));
for(const name of styles)await readFile(at('src/'+name+'.css'));
for(const name of [...modelModules,...visualModules])assert.ok(browserModules.includes(name),'Missing browser module: '+name);
for(const name of modelModules)await import(at('src/'+name+'.js'));
const K=globalThis.CSL.curriculum;
assert.equal(K.baselineIds.length,159);
assert.equal(K.entries.length,155);
assert.equal(globalThis.CSL.labs.length,314);
assert.deepEqual(K.entries.map(e=>e.number).sort((a,b)=>a-b),Array.from({length:155},(_,i)=>i+1));
assert.ok(K.coverage);
console.log('Read-only validation passed: 159 existing + 155 GAP models; source and manifest unchanged.');
