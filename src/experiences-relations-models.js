/* A concrete example precedes dependency symbols and decomposition rules. */
(() => {
'use strict';
const X=CSL.experiences,M=X.os;
M.redundancyStart=()=>({mode:'flat',rows:[{student:1,name:'Aki',course:10},{student:1,name:'Aki',course:20},{student:2,name:'Haru',course:10}],students:[{id:1,name:'Aki'},{id:2,name:'Haru'}],enrolments:[{student:1,course:10},{student:1,course:20},{student:2,course:10}],log:[]});
M.redundancy=(input,a)=>{
 const s=X.clone(input);if(s.log.length>=32)throw Error('32操作までです。最初へ戻してください。');
 if(a.kind==='split'){s.mode='split';s.log.push('元の同一内容を、学生ID→名前と、学生ID・科目の組へ分けた例に切り替えました。壊れた表から勝手に正解を推定する処理ではありません。');return s;}
 if(a.kind!=='rename')throw Error('名前を変更する操作です。');
 const name=String(a.name||'').trim();if(!name||name.length>20)throw Error('名前を1〜20文字で入力してください。');
 if(s.mode==='flat'){s.rows[0].name=name;if(a.all)s.rows[1].name=name;s.log.push('学生1の名前を'+(a.all?'両方の行':'最初の行だけ')+'で変更しました。');}
 else{s.students[0].name=name;s.log.push('学生表の一つの行だけを変更しました。履修を結合すると、どちらの科目でも同じ名前を参照します。');}return s;
};
M.joinRedundancy=s=>s.enrolments.map(e=>({...e,name:s.students.find(p=>p.id===e.student).name}));
})();
