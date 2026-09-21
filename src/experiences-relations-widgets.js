/* Concrete data editing, not a slide player. SQL remains in the existing
 * bounded interpreter and never crosses into JavaScript or a remote service. */
(() => {
'use strict';
const X=CSL.experiences,M=X.os,K=CSL.curriculum,h=CSL.h,B=X.html.button,T=X.html.table;
if(typeof document==='undefined')return;
X.registerWidget('normalization-rows',(root,a,current)=>{
 const scope=X.scope(root,current);let state=M.redundancyStart(),history=[],value='Aki-new';
 root.innerHTML='<div data-normal-board></div><p data-ex-status role="status" aria-live="polite"></p>';
 const board=root.firstElementChild,status=root.querySelector('[data-ex-status]');
 const table=rows=>T(['学生ID','名前','科目ID'],rows.map(r=>[r.student,r.name,r.course]));
 function paint(focus){
  const names=state.rows.filter(r=>r.student===1).map(r=>r.name),conflict=new Set(names).size>1;
  board.innerHTML=`<p>一つの学生名が二行に重複しています。まず最初の一行だけを書き換え、同じ学生IDが違う名前を持つ状態を作ってください。</p><div class="ex-os-two"><section class="ex-os-box"><h4>${state.mode==='flat'?'今の一枚の表':'分解した時点の元の表（比較用）'}</h4>${table(state.rows)}${state.mode==='flat'&&conflict?'<p class="ex-os-notice" data-normal-conflict>学生1に二つの名前があります。「学生IDが名前を決める」という規則と矛盾します。</p>':''}</section><section class="ex-os-box"><h4>${state.mode==='flat'?'分解の意味を考える':'事実を別々の表で持つ'}</h4>${state.mode==='split'?'<h5>学生ID → 名前</h5>'+T(['学生ID','名前'],state.students.map(s=>[s.id,s.name]))+'<h5>履修の組</h5>'+T(['学生ID','科目ID'],state.enrolments.map(e=>[e.student,e.course])):'<p>名前は学生IDで決まるのに、科目が変わるたび繰り返し保存しています。学生の事実と履修の事実を分けられるでしょうか。</p>'}</section></div><form data-normal-rename class="ex-storage-form"><label for="${scope.id}-name">学生1の新しい名前<input id="${scope.id}-name" name="studentName" value="${h(value)}" maxlength="20" required></label>${state.mode==='flat'?`<label><input name="all" type="checkbox">両方の重複行を同じ名前に直す</label>`:''}<button type="submit" class="ex-button" data-normal-action="rename">${state.mode==='flat'?'名前を書き換える':'学生表の一行だけを書き換える'}</button></form><div class="ex-actions">${B('学生と履修へ分解する',`data-normal-action="split"${state.mode==='split'?' disabled':''}`)}${B('直前へ戻す',`data-normal-action="undo"${history.length?'':' disabled'}`)}${B('最初から','data-normal-action="reset"')}</div>${state.mode==='split'?`<section data-normal-joined><h4>学生IDで結合して読み直した表</h4>${table(M.joinRedundancy(state))}<p>学生表の一行の変更が、同じ学生を参照する二つの履修に反映されます。結合結果は別々に名前を保存したコピーではありません。</p></section>`:''}<aside class="ex-why"><p>この例では「学生IDが常に名前を決める」という業務規則を仮定しています。少数の観測行が偶然一致しただけでは関数従属性を証明できません。矛盾がある表を分けても、正しい名前を自動で知ることはできません。</p></aside>`;
  root.dataset.normalState=JSON.stringify(state);current.completed.add(scope.id);
  if(focus){const el=board.querySelector(`[data-normal-action="${focus}"]`);if(el&&!el.disabled)el.focus({preventScroll:true});}
 }
 function act(action,focus){try{const after=M.redundancy(state,action);history.push(state);state=after;paint(focus);status.textContent=state.log.at(-1);status.className='';}catch(e){status.textContent=e.message;status.className='ex-os-notice';}}
 scope.on(root,'submit',e=>{if(!e.target.matches('[data-normal-rename]'))return;e.preventDefault();if(!e.target.reportValidity())return;value=e.target.elements.studentName.value;act({kind:'rename',name:value,all:!!e.target.elements.all?.checked},'rename');});
 scope.on(root,'click',e=>{const id=e.target.closest('[data-normal-action]')?.dataset.normalAction;if(id==='split')act({kind:'split'},'rename');if(id==='undo'&&history.length){state=history.pop();paint(history.length?'undo':'reset');status.textContent='直前の実験状態へ戻しました。';}if(id==='reset'){state=M.redundancyStart();history=[];value='Aki-new';paint('reset');status.textContent='元の矛盾のない表です。';}});
 paint();
});

X.registerWidget('sql-desk',(root,a,current)=>{
 const scope=X.scope(root,current),lab=CSL.labs.find(l=>l.id==='gap-090'),initial=JSON.parse(lab.defaults.data);
 let data=X.clone(initial),history=[],last=null,dirty=false;
 const examples=[
  ['個人の行を絞る','SELECT name, score FROM students WHERE score >= 75 ORDER BY score DESC;','WHEREは個人の行を残す条件です。'],
  ['所属ごとにまとめる','SELECT dept, COUNT(*) AS rows, COUNT(score) AS known, AVG(score) AS mean FROM students GROUP BY dept ORDER BY dept;','COUNT(*)とCOUNT(score)を、NULLを含む所属で比べます。'],
  ['グループを絞る','SELECT dept, COUNT(*) AS n FROM students GROUP BY dept HAVING COUNT(*) >= 2 ORDER BY dept;','HAVINGはまとめた後のグループへの条件です。'],
  ['所属名を結び付ける','SELECT s.name, d.label FROM students AS s LEFT JOIN departments AS d ON s.dept = d.id ORDER BY s.id;','学生のdeptから所属のidへ対応を探します。'],
  ['NULLの行を調べる','SELECT name FROM students WHERE score IS NULL;','NULLは値0や空文字列とは違います。'],
  ['値を変更して読む','UPDATE students SET score = 100 WHERE id = 1; SELECT name, score FROM students WHERE id = 1;','同じ作業台の表を実際に変更し、後のSELECTで読みます。']
 ];
 root.classList.add('ex-os-workspace');
 root.innerHTML=`<div data-sql-tables></div><form data-sql-form><label for="${scope.id}-sql"><strong>SQLを自分で書く</strong></label><textarea id="${scope.id}-sql" name="sql" rows="5" maxlength="4000" spellcheck="false" required>${h(a.source||examples[0][1])}</textarea><div class="ex-actions"><button type="submit" class="ex-button" data-sql-action="run">今の表に実行する</button>${B('表を初期状態へ戻す','data-sql-action="reset"')}${B('直前の実行前へ戻す','data-sql-action="undo" disabled')}</div></form><div class="ex-example-choices">${examples.map(([label],i)=>B(label,`data-sql-example="${i}"`)).join('')}</div><p data-sql-reason></p><p data-ex-status role="status" aria-live="polite"></p><div data-sql-results></div><aside class="ex-why"><p>この枠内の表だけを扱う有界SQLインタプリタです。途中の集計は行数と処理名であり、全ての段階の中間表を保存したものではありません。実DBへ接続せず、ページを離れると変更は消えます。複数文の途中でエラーになった場合は、この作業台では一括して反映しません。</p></aside>`;
 const form=root.querySelector('form'),area=form.elements.sql,tables=root.querySelector('[data-sql-tables]'),results=root.querySelector('[data-sql-results]'),status=root.querySelector('[data-ex-status]');
 function paintTables(){tables.innerHTML='<div class="ex-os-two">'+Object.entries(data).map(([name,rows])=>{const headers=[...new Set(rows.flatMap(Object.keys))];return '<section class="ex-os-box"><h4>'+h(name)+'</h4>'+T(headers,rows.map(r=>headers.map(key=>r[key]??'NULL')))+'</section>';}).join('')+'</div>';root.dataset.sqlData=JSON.stringify(data);root.querySelector('[data-sql-action="undo"]').disabled=!history.length;}
 function run(){
  results.replaceChildren();status.className='';
  if(!area.value.trim()){status.textContent='SQLを入力してください。';return;}
  if(history.length>=32){status.textContent='32回実行しました。表を初期状態へ戻してから続けてください。';return;}
  try{
   const before=X.clone(data),r=K.sql.run(area.value,data);data=r.data;history.push(before);last=r;dirty=false;paintTables();
   results.innerHTML=r.outputs.map((out,i)=>`<section data-sql-result="${i}"><h4>文${i+1}の結果</h4>${T(out.headers,out.rows.map(row=>row.map(v=>v===null?'NULL':v)))}</section>`).join('')+'<details><summary>どの段階で行・グループの数が変わったか</summary>'+T(['段階','件数','対象'],r.trace)+'</details>';
   status.textContent='このSQLを、直前の表に実行しました。表示した結果と現在の表はその実行に対応します。';current.completed.add(scope.id);
  }catch(e){last=null;dirty=true;status.textContent=e.message+' 表への変更は反映していません。';status.className='ex-os-notice';}
 }
 scope.on(form,'submit',e=>{e.preventDefault();if(form.reportValidity())run();});
 scope.on(area,'input',()=>{dirty=true;last=null;results.innerHTML='<p>SQLを編集中です。古い結果は隠しています。実行ボタンで新しい結果を求めます。</p>';status.textContent='表はまだ変えていません。';status.className='';});
 scope.on(root,'click',e=>{const button=e.target.closest('button');if(!button)return;if(button.hasAttribute('data-sql-example')){const ex=examples[Number(button.dataset.sqlExample)];area.value=ex[1];root.querySelector('[data-sql-reason]').textContent=ex[2];results.replaceChildren();dirty=true;last=null;status.textContent='例を編集欄へ入れました。まだ実行していません。';area.focus({preventScroll:true});}const action=button.dataset.sqlAction;if(action==='reset'||action==='undo'&&history.length){data=action==='reset'?X.clone(initial):history.pop();if(action==='reset')history=[];last=null;dirty=true;paintTables();results.replaceChildren();status.textContent='表を戻しました。今のSQLは、実行するまで表を変更しません。';}});
 paintTables();run();
});
})();
