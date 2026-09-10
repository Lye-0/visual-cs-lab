/* Searchable curriculum models. Course names are explicit, never split on ・.
 * Connections are editorial guides, not verified university syllabus coverage.
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
 const course={id:'curriculum-'+group.id.toLowerCase(),name:group.name,description:'関連する内容をまとめたサイト独自の学習ガイドです。大学の正式な科目や、授業の実施順序とは区別してください。',groups:[[group.name,entries.map(e=>e.id)]]};
 if(!L.readingCourses.some(c=>c.id===course.id))L.readingCourses.push(course);
 group.labs=entries.map(e=>e.id);
}
// Keep the established course titles and legacy links. Add relevant units per
// course, instead of assigning an entire broad GAP group to every name fragment.
const span=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
const additions=[
 ['数学',span(1,8)],['数学演習',span(1,8)],
 ['情報基礎数学',[1,2,7,18,19,20,21]],
 ['確率・統計',span(11,16)],['多変量解析',[11,15,17,122,124]],
 ['データ線形分析法',[1,2,3,17]],['数値解析',[8,9,10]],
 ['離散数学',[18,19,20,21,22,23]],
 ['計算機科学入門',[18,22,24,26,34,66,74,95,109]],
 ['情報理論',span(28,33)],
 ['プログラミング演習1',[35,36,41,42]],
 ['プログラミング演習2',[37,38,39,43,44,45,46,146,147]],
 ['プログラミング言語',[35,36,37,38,39,40,41,42,57]],
 ['オブジェクト指向論',[37,38,39,144,145]],
 ['コンピュータプログラミング論',[35,36,39,40,41,42,43,50]],
 ['データ構造とアルゴリズム',[19,22,23,...span(43,51)]],
 ['言語処理系',[24,25,...span(52,58)]],
 ['システムソフトウェア構成論',[55,56,57,58,68,74,76,79,80]],
 ['電気電子回路',[59,60,61]],['論理回路',span(62,65)],
 ['計算機構成論',[63,64,65,66,67,68,70,72]],
 ['計算機アーキテクチャ',span(66,73)],
 ['オペレーティングシステム',[68,70,72,...span(74,81),143]],
 ['分散システム',[71,77,78,81,...span(82,87)]],
 ['データモデル論',[88,89,94]],['データベース',span(88,94)],
 ['コンピュータネットワーク',[95,96,97,98,99,100,101,102,103,106,108]],
 ['インターネット技術',[96,97,98,99,101,105,106,107,108,154,155]],
 ['情報通信ネットワーク',[29,31,32,95,99,100,101,102,103,104,105,106]],
 ['セキュリティ・ネットワーク概論',[95,96,98,109,114,115]],
 ['ネットワークセキュリティ',[107,109,113,114,117,120]],
 ['システムセキュリティ',[109,114,115,116,118,119,120]],
 ['暗号理論',[7,20,110,111,112,113,121]],
 ['人工知能',[123,124,125,126,127]],
 ['データサイエンス',[11,12,13,14,15,16,17,122,123,124]],
 ['自然言語処理',span(128,132)],
 ['フーリエ解析',[7,133,134,135]],['デジタル信号処理',span(133,136)],
 ['コンピュータグラフィックス',[1,7,136,137,138,139]],
 ['IoT',[68,85,103,108,140,141,142,143]],
 ['ソフトウェア工学',[37,38,41,42,119,144,145,146,147]],
 ['ユーザビリティ工学',[148,149,150]],['ヒューマンインタフェース',[148,149,150,154]],
 ['情報倫理と情報技術',[109,151,153]],
 ['セキュリティ・ネットワーク開発演習',[108,116,119,140,141,144,146,147,155]],
 ['セキュリティ・ネットワーク学実験',[106,108,117,120,149,152,153]]
];
for(const [name,numbers]of additions){
 const links=numbers.map(n=>'gap-'+String(n).padStart(3,'0'));
 if(links.some(id=>!ids.has(id)))throw Error('科目の参照が壊れています: '+name);
 const existing=L.courses.find(c=>c.name===name);
 if(existing)existing.labs=[...new Set([...existing.labs,...links])];
 else L.courses.push({id:'curriculum-course-'+L.courses.length,name,description:'科目名を入口とする独自の関連づけです。授業の公式な学習範囲の保証とは区別します。',labs:[...new Set(links)]});
}
K.expectedIds=expected;
K.coverage={target:155,registered:K.entries.length,baseline:K.baselineIds.length,units:L.labs.length,kind:'bounded-teaching-models',groups:K.groups.map(g=>({id:g.id,name:g.name,course:g.course,ids:g.labs})),entries:K.entries.slice().sort((a,b)=>a.number-b.number),limitations:['各GAPの見出しには関連する細目が含まれます。再現する方式・規模・前提は個別のscopeに明記します。','科目との対応は科目名からの推定であり、大学の公式シラバスの確認済み範囲ではありません。','構造検査・数値テスト・ブラウザテストは、初心者の学習効果や科学分野全体の網羅を保証するものではありません。']};
})();
