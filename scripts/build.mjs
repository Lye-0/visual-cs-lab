import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {publishedAssets,renderIndex,indexMatches} from './site-entry.mjs';
import {generateDelivery} from './delivery.mjs';
const root=new URL('../',import.meta.url);
const delivery=await generateDelivery();
for(const [path,content]of delivery.files){
 const target=new URL(path,root);
 if(process.argv.includes('--check')){
  const actual=await readFile(target,'utf8').catch(()=>null);
  if(actual===null||!indexMatches(actual,content))throw Error(path+' is out of date. Run npm run build. No file was changed.');
 }else{
  await mkdir(new URL('./',target),{recursive:true});await writeFile(target,content);
 }
}
for(const file of publishedAssets)await readFile(new URL(file,root));
const html=renderIndex(),target=new URL('index.html',root);
if(process.argv.includes('--check')){
 if(!indexMatches(await readFile(target,'utf8'),html))throw Error('index.html is out of date. Run npm run build and commit the entry.');
 console.log(`Static entry and ${delivery.units} on-demand lessons match the sources; nothing was written.`);
}else{
 await writeFile(target,html);
 console.log(`Built shell (${Buffer.byteLength(html)} bytes) and ${delivery.units} on-demand lessons. No runtime build or install is needed.`);
}
