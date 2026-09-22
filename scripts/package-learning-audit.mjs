// Small public review evidence, kept away from the publishing branch.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const root='review-output/full-audit',report=JSON.parse(await readFile(root+'/chromium.json','utf8')),dest='review-output/public-audit';
await mkdir(dest+'/images',{recursive:true});await mkdir(dest+'/units',{recursive:true});
const clean=s=>String(s??'').replace(/[\r\n]+/g,' ').replace(/\|/g,'／');
const index={sourceCommit:report.sourceCommit,summary:report.summary,sheets:[],chapters:[]};
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1500,height:1700},deviceScaleFactor:1});
const items=report.chapters.filter(r=>r.width===1440&&r.capture);
for(let offset=0;offset<items.length;offset+=6){
 const group=items.slice(offset,offset+6),tiles=[];
 for(const r of group){const bytes=await readFile(root+'/captures/'+r.capture);tiles.push(`<section><header>${r.id} / ${r.chapter}</header><img src="data:image/jpeg;base64,${bytes.toString('base64')}"></section>`);}
 await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;background:#0d141c;color:#eef5fc;font:15px sans-serif}main{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:12px}section{border:1px solid #647286;height:826px;min-width:0}header{height:30px;padding:6px}img{display:block;max-width:100%;max-height:792px;margin:auto;object-fit:contain;object-position:top}</style><main>${tiles.join('')}</main>`);
 await page.evaluate(()=>Promise.all([...document.images].map(im=>im.decode())));
 const filename='sheet-'+String(offset/6+1).padStart(3,'0')+'.jpg';await page.screenshot({path:dest+'/images/'+filename,type:'jpeg',quality:85});
 index.sheets.push({file:filename,chapters:group.map(r=>r.id+'/'+r.chapter)});
}
await browser.close();
for(const unit of report.units){
 const rows=report.chapters.filter(r=>r.id===unit.id),text=['# '+unit.id+' '+unit.title,'','Source: '+report.sourceCommit,'',unit.lead,''];
 for(const c of unit.chapters){const match=rows.find(r=>r.chapter===c.id&&r.width===1440);text.push('## '+c.id+' / '+c.title,'','Question: '+c.question,'',...(c.paragraphs||[]),...((c.after||[]).map(p=>'After: '+p)),'','Activities: '+c.activities.map(a=>a.kind+' / '+a.title).join('; '),'');
 if(match?.observed)for(const a of match.observed.activities)text.push('### '+a.kind,'',a.text,'');
 text.push('### Viewport observations','');for(const r of rows.filter(r=>r.chapter===c.id))text.push(JSON.stringify({width:r.width,passed:r.passed,error:r.error,duplicates:r.observed?.duplicates,labels:r.observed?.orphanLabels,candidates:r.observed?.candidates,unnamed:r.observed?.controls.filter(c=>!c.name)}));text.push('');
 index.chapters.push({id:unit.id,chapter:c.id,passed:rows.filter(r=>r.chapter===c.id).every(r=>r.passed),candidates:match?.observed?.candidates||[],sourceCapture:match?.capture});
 }
 await writeFile(dest+'/units/'+unit.id+'.md',text.join('\n'));
}
await writeFile(dest+'/index.json',JSON.stringify(index,null,2));
await writeFile(dest+'/failures.json',JSON.stringify({failures:report.failures,runtime:report.runtime},null,2));
await writeFile(dest+'/README.md','# 全章検証の証跡\n\n対象ソース：`'+report.sourceCommit+'`\n\n'+JSON.stringify(report.summary,null,2)+'\n\n画像は自動撮影された証跡です。撮影済みというだけで目視承認済みではありません。`units/` は各章の実際の表示文・操作名・検査候補を記録します。アプリの公開ブランチには含めません。\n');
console.log('EVIDENCE '+JSON.stringify({sourceCommit:report.sourceCommit,units:report.units.length,sheets:index.sheets.length,chapters:index.chapters.length}));
