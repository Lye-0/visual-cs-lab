// The same bounded workspace checks as CI, runnable from Windows or POSIX.
import {readdir,mkdir,open,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const names=(await readdir(new URL('./',import.meta.url))).filter(n=>/workspaces.*browser\.mjs$/.test(n));
names.push('math-evidence-browser.mjs','math-correspondence-browser.mjs','foundation-review-browser.mjs','workspace-view-state-browser.mjs','authored-result-values-browser.mjs','teaching-evidence-browser.mjs','custom-select-browser.mjs','number-input-browser.mjs','reference-pages-browser.mjs','control-labels-browser.mjs');
await mkdir('review-output/workspaces',{recursive:true});
const rows=[];
for(const name of names){
 const log=await open('review-output/workspaces/'+name+'.log','w');
 try{
  const child=spawn(process.execPath,['tests/'+name],{env:process.env,stdio:['ignore',log.fd,log.fd]});
  const [code]=await once(child,'exit');rows.push({script:name,code});console.log(name+': '+(code===0?'PASS':'FAIL'));
 }finally{await log.close();}
}
await writeFile('review-output/workspaces/summary.json',JSON.stringify({browser:process.env.BROWSER||'chromium',results:rows},null,2));
if(rows.some(r=>r.code!==0))process.exitCode=1;
