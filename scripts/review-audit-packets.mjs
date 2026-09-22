// Read-only review exports. Counts or heuristics never approve teaching quality.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const src='review-output/full-audit',dest='review-output/public-audit';
const r=JSON.parse(await readFile(src+'/chromium.json','utf8'));
await mkdir(dest+'/review-packets',{recursive:true});
const warning=[];
const packets=[];let text='',unitIds=[];
async function flush(){if(!unitIds.length)return;const file='review-packets/packet-'+String(packets.length+1).padStart(3,'0')+'.md';await writeFile(dest+'/'+file,text);packets.push({file,units:unitIds});text='';unitIds=[];}
for(const u of r.units){
 const observations=r.chapters.filter(row=>row.id===u.id);
 let section='## '+u.id+' '+u.title+'\n'+u.lead+'\n';
 for(const ch of u.chapters){
  const row=observations.find(v=>v.chapter===ch.id&&v.width===1440);
  section+='\n### '+ch.id+' — '+ch.title+'\n問い: '+ch.question+'\n'+(ch.paragraphs||[]).join('\n')+'\n';
  if(ch.after?.length)section+='補足: '+ch.after.join(' / ')+'\n';
  ch.activities.forEach((a,i)=>{
   const observed=row?.observed?.activities[i];
   section+='形式: '+a.kind+' / '+a.title+'\n';
   if(a.keys?.length)section+='モデル入力: '+JSON.stringify(a.keys)+'\n';
   if(a.patch&&Object.keys(a.patch).length)section+='固定例: '+JSON.stringify(a.patch)+'\n';
   if(a.examples?.length)section+='比較: '+a.examples.map(e=>e.label||e.title||JSON.stringify(e)).join(' | ')+'\n';
   if(observed){
    section+='実際の操作名: '+[...new Set(observed.controls)].join(' | ')+'\n';
    // Preserve the first-action instruction; full displayed content stays in units/<id>.md.
    section+='表示の冒頭: '+observed.text.replace(/\s+/g,' ').slice(0,650)+'\n';
   }
  });
 }
 const flags=observations.flatMap(row=>(row.observed?.candidates||[]).map(c=>({width:row.width,chapter:row.chapter,...c})));
 if(flags.length){warning.push({id:u.id,candidates:flags});section+='\n描画要確認: '+JSON.stringify(flags)+'\n';}
 if(text.length+section.length>14000)await flush();text+=section+'\n';unitIds.push(u.id);
}
await flush();
await writeFile(dest+'/review-packets/index.json',JSON.stringify({sourceCommit:r.sourceCommit,units:r.units.length,packets},null,2));
await writeFile(dest+'/warnings.json',JSON.stringify(warning,null,2));
console.log('REVIEW_PACKETS '+JSON.stringify({units:r.units.length,packets:packets.length,warningUnits:warning.length}));
