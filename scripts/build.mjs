// Regenerate only the lightweight entry, never inline or copy the JS/CSS.
import {readFile,writeFile} from 'node:fs/promises';
import {publishedAssets,renderIndex} from './site-entry.mjs';
const root=new URL('../',import.meta.url);
for(const file of publishedAssets)await readFile(new URL(file,root));
const html=renderIndex(),target=new URL('index.html',root);
if(process.argv.includes('--check')){
 if(await readFile(target,'utf8')!==html)throw Error('index.html is out of date. Run npm run build and commit the entry.');
 console.log('Static entry matches the manifest; nothing was written.');
}else{
 await writeFile(target,html);
 console.log(`Built linked index.html (${Buffer.byteLength(html)} bytes). ${publishedAssets.length} local assets remain separate. No runtime build or install is needed.`);
}
