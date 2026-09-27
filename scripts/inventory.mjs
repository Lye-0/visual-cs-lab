import {writeFile,readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {modelModules} from './modules.mjs';
for(const name of modelModules)await import(`../src/${name}.js`);
const L=globalThis.CSL,root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const inventory={
 version:L.version,total:L.labs.length,legacyTotal:L.legacyLabIds.length,engineCount:Object.keys(L.engines).length,
 counts:Object.fromEntries(['core','network','security','missions'].map(track=>[track,L.labs.filter(lab=>lab.track===track).length])),
 areas:L.areas.map(({id,name})=>({id,name})),
 labs:L.labs.map(({id,unit,area})=>({id,unit,area}))
};
const checkOnly=process.argv.includes('--check');
async function emit(file,content){
 if(checkOnly){
  const current=await readFile(file,'utf8');
  if(current.replace(/\r\n/g,'\n')!==content.replace(/\r\n/g,'\n'))throw Error(path.relative(root,file)+' is stale; run npm run inventory and commit the generated files. No file was changed.');
 }else await writeFile(file,content);
}
const start='<!-- UNIT_CATALOG_START -->',end='<!-- UNIT_CATALOG_END -->';
const readmePath=path.join(root,'README.md'),readme=(await readFile(readmePath,'utf8')).replace(/\r\n/g,'\n');
if(readme.split(start).length!==2||readme.split(end).length!==2||readme.indexOf(start)>readme.indexOf(end))throw Error('README unit catalog markers are missing or repeated.');
const escapeHtml=text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const escapeMarkdown=text=>String(text).replaceAll('\\','\\\\').replace(/([\[\]_*`])/g,'\\$1');
let catalog=`${inventory.total}単元を20分野に分けて掲載します。分野名を開くと単元へ移動できます。\n\n`;
for(const area of inventory.areas){
 const labs=inventory.labs.filter(lab=>lab.area===area.id);
 catalog+=`<details>\n<summary>${escapeHtml(area.id+' '+area.name+'（'+labs.length+'単元）')}</summary>\n\n`;
 for(const lab of labs)catalog+=`- [${lab.id} — ${escapeMarkdown(lab.unit)}](https://lye-0.github.io/visual-cs-lab/#/lab/${encodeURIComponent(lab.id)})\n`;
 catalog+='\n</details>\n\n';
}
const updated=readme.slice(0,readme.indexOf(start)+start.length)+'\n\n'+catalog+readme.slice(readme.indexOf(end));
if(!checkOnly)await mkdir(path.join(root,'data'),{recursive:true});
await emit(readmePath,updated);
await emit(path.join(root,'data/experiments.json'),JSON.stringify(inventory,null,2)+'\n');
console.log(JSON.stringify({total:inventory.total,legacy:inventory.legacyTotal,engines:inventory.engineCount,counts:inventory.counts},null,2));
