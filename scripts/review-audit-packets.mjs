// Read-only exports. The complete rendered text remains in units/<id>.md.
// A compact dossier is an aid to manual review, never a pass/fail classifier.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const src='review-output/full-audit',dest='review-output/public-audit';
const r=JSON.parse(await readFile(src+'/chromium.json','utf8'));
await mkdir(dest+'/review-packets',{recursive:true});
const warnings=[],index=[];let packet='',ids=[];
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
async function flush(){if(!ids.length)return;const file='review-packets/packet-'+String(index.length+1).padStart(3,'0')+'.md';await writeFile(dest+'/'+file,packet);index.push({file,units:ids});packet='';ids=[];}
for(const u of r.units){
 let block='## '+u.id+' '+u.title+'\n'+u.lead+'\n';
 for(const ch of u.chapters){
  const row=r.chapters.find(p=>p.id===u.id&&p.chapter===ch.id&&p.width===1440);
  block+='### '+ch.id+': '+ch.title+'\n'+ch.question+'\n'+(ch.paragraphs||[]).join('\n')+'\n';
  if(ch.after?.length)block+='注記: '+ch.after.join(' / ')+'\n';
  ch.activities.forEach((a,i)=>{
   const observed=row?.observed?.activities[i];
   block+='形式 '+a.kind+' / '+a.title+' / 入力 '+JSON.stringify(a.keys||[])+'\n';
   if(a.examples?.length)block+='比較例: '+a.examples.map(e=>e.title||e.label||JSON.stringify(e)).join(' | ')+'\n';
   if(observed){
    // Repeated numbered cells are still present in the full per-unit record.
    const names=[...new Set(observed.controls.filter(Boolean))];
    block+='表示冒頭: '+clean(observed.text).slice(0,260)+'\n';
    block+='操作名 '+names.length+'個: '+(names.length<=14?names.join(' | '):names.slice(0,7).join(' | ')+' … '+names.slice(-7).join(' | ')+' （中間はunits/'+u.id+'.mdへ）')+'\n';
   }
  });
 }
 const observedWarnings=r.chapters.filter(p=>p.id===u.id&&p.observed?.candidates.length).map(p=>({width:p.width,chapter:p.chapter,candidates:p.observed.candidates}));
 if(observedWarnings.length)warnings.push({id:u.id,observations:observedWarnings});
 if(packet.length+block.length>6400)await flush();packet+=block+'\n';ids.push(u.id);
}
await flush();
await writeFile(dest+'/review-packets/index.json',JSON.stringify({sourceCommit:r.sourceCommit,units:r.units.length,packets:index},null,2));
await writeFile(dest+'/warnings.json',JSON.stringify(warnings,null,2));
await writeFile(dest+'/warnings-summary.md',warnings.map(w=>'## '+w.id+'\n'+w.observations.map(v=>v.width+' / '+v.chapter+'\n'+v.candidates.map(c=>c.type+': '+JSON.stringify(c)).join('\n')).join('\n')).join('\n'));
console.log('REVIEW_PACKETS '+JSON.stringify({units:r.units.length,packets:index.length,warningUnits:warnings.length}));
