import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import vm from 'node:vm';
import {generateDelivery,shellModules,shellStyles} from '../scripts/delivery.mjs';
const root=new URL('../',import.meta.url),delivery=await generateDelivery();
test('all 314 generated payloads match their authored sources, including Windows checkouts',async()=>{
 assert.equal(delivery.units,314);assert.equal(delivery.chapters,588);
 for(const [path,content]of delivery.files){assert.equal((await readFile(new URL(path,root),'utf8')).replace(/\r\n/g,'\n'),content,path);}
});
test('discovery retains every searchable unit without model code or lesson body',async()=>{
 const context=vm.createContext({});
 vm.runInContext(await readFile(new URL('src/core.js',root),'utf8'),context);
 vm.runInContext(delivery.files.get('src/generated/catalog.js'),context);
 assert.equal(context.CSL.labs.length,314);assert.equal(Object.keys(context.CSL.engines).length,0);
 assert.ok(context.CSL.labs.every(l=>!l.controls&&!l.reading&&!l.defaults));
 assert.equal(context.CSL.experiences,undefined);
});
test('initial source-byte budget and script count stay below the former all-library load',async()=>{
 let bytes=0;for(const [names,ext]of [[shellModules,'js'],[shellStyles,'css']])for(const n of names)bytes+=(await stat(new URL(`src/${n}.${ext}`,root))).size;
 assert.ok(bytes<750000,`Initial source bytes: ${bytes}`);assert.ok(shellModules.length<=10);
});
test('Git and basic binary do not request unrelated curriculum engines or widgets',()=>{
 const git=delivery.manifest.lessons['c16-git'].modules;
 assert.ok(git.includes('git'));assert.ok(git.includes('experiences-git-review-widgets'));
 assert.ok(!git.some(n=>/curriculum-ai|media|network/.test(n)));
 assert.ok(!delivery.manifest.lessons['c01-bits'].modules.some(n=>/git-review|ai-widgets|network-widgets/.test(n)));
});
