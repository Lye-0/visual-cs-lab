// Enumerate real lessons without upgrading unreviewed units to approved.
// Outputs are developer review artifacts, never user study records or runtime state.
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {modelModules} from './modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
const manual=JSON.parse(await readFile(new URL('../docs/review/MATH_EVIDENCE_REVIEW.json',import.meta.url),'utf8'));
const X=CSL.experiences,records=new Map();
for(const item of manual.reviews){
 if(records.has(item.id)||!X.find(item.id))throw Error('Unknown/repeated review ID: '+item.id);
 if(!item.originalPlan||!item.changes.length||!item.remaining.length||item.visualReview!=='pending'||item.planReview!=='partial')throw Error('Review evidence must distinguish revisions and remaining work: '+item.id);
 for(const path of item.sourcePaths)await access(new URL('../'+path,import.meta.url));records.set(item.id,item);
}
const units=CSL.labs.map(lab=>{
 const def=X.find(lab.id);if(!def)throw Error('A real unit lacks its authored definition: '+lab.id);
 const review=records.get(lab.id)||null;
 return {id:lab.id,title:lab.unit,registration:'present',definitionHash:createHash('sha256').update(JSON.stringify(def)).digest('hex'),
  codeReview:review?.codeReview||'not-reviewed-in-this-pass',planReview:review?.planReview||'pending',visualReview:'pending',review,
  lead:def.lead,chapters:def.chapters.map(ch=>({id:ch.id,title:ch.title,question:ch.question,paragraphs:ch.paragraphs,after:ch.after,activities:ch.activities.map(a=>({kind:a.kind,title:a.title,fields:a.keys,model:a.model||lab.id}))}))};
});
if(units.length!==314||new Set(units.map(u=>u.id)).size!==314)throw Error('All 314 distinct units must stay in scope.');
const summary={sourceCommit:process.env.GITHUB_SHA||'local',units:units.length,chapters:X.inventory().chapters,activities:X.inventory().activities,revisedInThisPass:records.size,pendingIndividualReviewThisPass:units.length-records.size,completePlanApprovals:0,completedVisualReviews:0};
const clean=text=>String(text).replaceAll('|','／').replace(/[\r\n]/g,' '),warning='これは実装の棚卸しと確認記録です。構造の列挙、専用操作の有無、自動テストの成功は、教え方・目視・当初計画の全面的な承認ではありません。';
const md='# 全314単元の見直し台帳\n\n対象commit：'+summary.sourceCommit+'\n\n'+warning+'\n\n| ID | 単元 | 章数 | 実際の表現 | 今回の個別見直し | 計画照合 | 目視 |\n|---|---|---:|---|---|---|---|\n'+units.map(u=>'| '+[u.id,u.title,u.chapters.length,[...new Set(u.chapters.flatMap(c=>c.activities.map(a=>a.kind)))].join('、'),u.review?'具体的な修正あり':'この回では未確認',u.review?'一部対応・残課題あり':'未確認','未完了'].map(clean).join(' | ')+' |').join('\n')+'\n';
await mkdir('review-output',{recursive:true});await writeFile('review-output/learning-audit.json',JSON.stringify({summary,warning,units},null,2));await writeFile('review-output/learning-audit.md',md);console.log(JSON.stringify(summary,null,2));
