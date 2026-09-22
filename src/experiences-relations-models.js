/* A concrete example precedes dependency symbols and decomposition rules. */
(() => {
'use strict';
const X=CSL.experiences,M=X.os;
M.redundancyStart=()=>({mode:'flat',rows:[{student:1,name:'Aki',course:10},{student:1,name:'Aki',course:20},{student:2,name:'Haru',course:10}],students:[{id:1,name:'Aki'},{id:2,name:'Haru'}],enrolments:[{student:1,course:10},{student:1,course:20},{student:2,course:10}],log:[]});
M.redundancy=(input,a)=>{
 const s=X.clone(input);if(s.log.length>=32)throw Error('32操作までです。最初へ戻してください。');
 if(a.kind==='split'){
  if(s.mode==='split')throw Error('既に分解した表です。');
  const names=new Map();
  for(const row of s.rows){if(names.has(row.student)&&names.get(row.student)!==row.name)throw Error('同じ学生の名前が矛盾しています。どちらが正しいかは分解だけでは分かりません。先に両方の行を直してください。');names.set(row.student,row.name);}
  s.students=[...names].map(([id,name])=>({id,name}));s.enrolments=s.rows.map(({student,course})=>({student,course}));s.mode='split';
  s.log.push('学生ID→名前を一つの表へ、履修の組を別の表へ分けました。矛盾する値を自動で正しい値へ修正したわけではありません。');return s;
 }
 if(a.kind!=='rename')throw Error('名前を変更する操作です。');
 const name=String(a.name||'').trim();if(!name||name.length>20)throw Error('名前を1〜20文字で入力してください。');
 if(s.mode==='flat'){s.rows[0].name=name;if(a.all)s.rows[1].name=name;s.log.push('学生1の名前を'+(a.all?'両方の行':'最初の行だけ')+'で変更しました。');}
 else{s.students.find(p=>p.id===1).name=name;s.log.push('学生表の一つの行だけを変更しました。履修を結合すると、どちらの科目でも同じ名前を参照します。');}return s;
};
M.joinRedundancy=s=>s.enrolments.map(e=>({...e,name:s.students.find(p=>p.id===e.student).name}));
})();
