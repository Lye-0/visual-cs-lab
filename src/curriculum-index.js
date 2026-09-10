/* Register the bounded curriculum models as searchable learning content.
 * Coverage means an explicit model exists for each audit identifier, not that
 * every implementation detail of every scientific discipline is reproduced.
 */
(() => {
'use strict';
const L=CSL,K=L.curriculum;
if(!K)throw Error('カリキュラムの登録基盤がありません。');
const expected=Array.from({length:155},(_,i)=>'gap-'+String(i+1).padStart(3,'0'));
const ids=new Set(L.labs.map(l=>l.id));
if(K.baselineIds.length!==159||K.baselineIds.some(id=>!ids.has(id)))throw Error('既存159単元が保持されていません。');
if(new Set(K.entries.map(e=>e.id)).size!==155||expected.some(id=>!ids.has(id)))throw Error('GAP-001〜155の教材登録がそろっていません。');
for(const entry of K.entries){
 const lab=L.labs.find(l=>l.id===entry.id);
 if(!lab||typeof L.engines[lab.engine]!=='function'||!lab.reading?.sections?.length)throw Error(entry.tag+' の計算・説明が不足しています。');
 lab.reading.terms=lab.reading.sections.slice(0,5).map(([term,definition])=>({term,definition,lab:lab.id}));
 for(const term of lab.reading.terms)if(!L.glossary.some(g=>g.term===term.term&&g.lab===lab.id))L.glossary.push(term);
}
L.readingCourses=L.readingCourses||[];
for(const group of K.groups){
 const entries=K.entries.filter(e=>e.group===group.id).sort((a,b)=>a.number-b.number);
 const course={id:'curriculum-'+group.id.toLowerCase(),name:group.name,description:'科目との対応は学修要覧の科目名を参考にした構成です。具体的な授業範囲とは区別して、各教材の再現範囲を明記しています。',groups:[[group.course,entries.map(e=>e.id)]]};
 if(!L.readingCourses.some(c=>c.id===course.id))L.readingCourses.push(course);
 K.groups.find(g=>g.id===group.id).labs=entries.map(e=>e.id);
}
const courseMap=new Map();
for(const group of K.groups)for(const course of group.course.split('・').filter(Boolean)){
 if(!courseMap.has(course))courseMap.set(course,new Set());
 for(const id of group.labs)courseMap.get(course).add(id);
}
for(const [name,links]of courseMap){
 const existing=(L.courses||[]).find(c=>c.name===name);
 if(existing)existing.labs=[...new Set([...(existing.labs||[]),...links])];
 else{L.courses=L.courses||[];L.courses.push({id:'curriculum-course-'+L.courses.length,name,description:'関連する追加教材。授業の公式な履修範囲とは区別します。',labs:[...links]});}
}
K.expectedIds=expected;
K.coverage={target:155,registered:K.entries.length,baseline:K.baselineIds.length,units:L.labs.length,kind:'bounded-teaching-models',groups:K.groups.map(g=>({id:g.id,name:g.name,course:g.course,ids:g.labs})),entries:K.entries.slice().sort((a,b)=>a.number-b.number),limitations:['各GAPの見出しには関連する細目が含まれます。再現する方式・規模・前提は個別のscopeに明記します。','科目との対応は科目名からの推定であり、大学の公式シラバスの確認済み範囲ではありません。','構造検査・数値テスト・ブラウザテストは、初心者の学習効果や科学分野全体の網羅を保証するものではありません。']};
})();
