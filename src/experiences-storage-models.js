/* Bounded in-memory storage models. No host paths or persistent student data. */
(() => {
'use strict';
const X=CSL.experiences,M=X.os,copy=X.clone;
const next=s=>{if(s.log.length>=64)throw Error('64操作までです。実験を最初から始めてください。');return copy(s);};
const note=(s,text)=>{s.log.push(text);return s;};
const path=p=>{if(typeof p!=='string'||!/^\/[a-z]{1,12}$/.test(p))throw Error('/docのような短い仮想ファイル名にしてください。');return p;};
M.filesStart=()=>({entries:{'/doc':{kind:'file',inode:1}},inodes:{1:{text:'hello',links:1,opens:0}},fds:{},nextFd:3,lastRead:null,log:[]});
M.resolveFile=(s,name)=>{
 const seen=new Set();let p=path(name);
 for(let depth=0;depth<8;depth++){
  if(seen.has(p))throw Error('ELOOP：シンボリックリンクが循環しています。');seen.add(p);
  const e=s.entries[p];if(!e)throw Error('ENOENT：'+p+'がありません。');
  if(e.kind==='file')return e.inode;p=e.target;
 }
 throw Error('リンクの解決は8段以内です。');
};
M.files=(input,a)=>{
 const s=next(input),collect=id=>{const inode=s.inodes[id];if(inode&&inode.links===0&&inode.opens===0)delete s.inodes[id];};
 if(a.kind==='open'){const inode=M.resolveFile(s,a.path),fd=s.nextFd++;s.fds[fd]=inode;s.inodes[inode].opens++;return note(s,a.path+'を開く → fd '+fd+' → inode '+inode+'。名前とは別の参照を保持します。');}
 if(a.kind==='read'){const inode=s.fds[a.fd];if(!inode)throw Error('EBADF：そのfdは開いていません。');s.lastRead={fd:a.fd,inode,text:s.inodes[inode].text};return note(s,'fd '+a.fd+'はinode '+inode+'の '+s.lastRead.text+' を読みました。名前を引き直してはいません。');}
 if(a.kind==='close'){const inode=s.fds[a.fd];if(!inode)throw Error('EBADF：そのfdは開いていません。');delete s.fds[a.fd];s.inodes[inode].opens--;collect(inode);return note(s,'fd '+a.fd+'を閉じました。名前数とopen参照数の両方が0なら内容を解放します。');}
 if(a.kind==='unlink'){const p=path(a.path),entry=s.entries[p];if(!entry)throw Error('ENOENT：その名前はありません。');delete s.entries[p];if(entry.kind==='file'){s.inodes[entry.inode].links--;collect(entry.inode);}return note(s,p+'という名前だけを外しました。symlinkの場合、指していたinodeの名前数は減りません。');}
 if(a.kind==='link'||a.kind==='symlink'){
  const target=path(a.target);if(s.entries[target])throw Error('EEXIST：その名前は既に使われています。');
  const from=path(a.from);
  if(a.kind==='link'){const inode=M.resolveFile(s,from);s.entries[target]={kind:'file',inode};s.inodes[inode].links++;return note(s,target+'も同じinode '+inode+'へ対応させました。中身のコピーではありません。');}
  s.entries[target]={kind:'symlink',target:from};return note(s,target+'へパス文字列 '+from+' を保存しました。参照先の存在や寿命は保証しません。');
 }
 throw Error('未定義のファイル操作です。');
};

M.schemaStart=()=>({students:[{id:1,name:'Aki'},{id:2,name:'Haru'}],courses:[{id:10,name:'Network'},{id:20,name:'Database'}],enrolments:[{student:1,course:10},{student:2,course:20}],log:[]});
M.schema=(input,a)=>{
 const s=next(input),id=a.student,course=a.course;
 if(a.kind==='enrol'){
  if(!s.students.some(x=>x.id===id))throw Error('外部キー違反：学生'+id+'は学生表に存在しません。');
  if(!s.courses.some(x=>x.id===course))throw Error('外部キー違反：科目'+course+'は科目表に存在しません。');
  if(s.enrolments.some(x=>x.student===id&&x.course===course))throw Error('複合主キー違反：学生'+id+'と科目'+course+'の組は登録済みです。');
  s.enrolments.push({student:id,course});return note(s,'履修('+id+', '+course+')を追加しました。両方の参照先の存在と、組の一意性を検査しました。');
 }
 if(a.kind==='unenrol'){
  const i=s.enrolments.findIndex(x=>x.student===id&&x.course===course);if(i<0)throw Error('その履修はありません。');s.enrolments.splice(i,1);return note(s,'履修('+id+', '+course+')だけを削除しました。学生や科目は残ります。');
 }
 if(a.kind==='student'){
  if(!Number.isInteger(id)||id<1||id>5)throw Error('学生IDは1〜5です。');
  if(s.students.some(x=>x.id===id))throw Error('主キー違反：学生ID '+id+'は登録済みです。');
  const name=String(a.name||'').trim();if(!name||name.length>20)throw Error('名前を1〜20文字で入力してください。');s.students.push({id,name});return note(s,'学生'+id+' '+name+'を追加しました。履修はまだ追加していません。');
 }
 if(a.kind==='delete-student'){
  if(!s.students.some(x=>x.id===id))throw Error('その学生はありません。');
  if(s.enrolments.some(x=>x.student===id))throw Error('参照されている学生です。先に履修を外してください。この例はRESTRICT方式です。');
  s.students=s.students.filter(x=>x.id!==id);return note(s,'参照されていない学生'+id+'を削除しました。');
 }
 throw Error('未定義の表操作です。');
};

M.bankStart=(available=[1,1])=>({allocation:[[1,0],[0,1],[1,1]],maximum:[[2,1],[1,2],[2,2]],work:available.slice(),finished:[false,false,false],sequence:[],log:[]});
M.bank=(input,a)=>{
 const s=next(input),i=a.process;if(!Number.isInteger(i)||i<0||i>2)throw Error('P0〜P2を選びます。');
 if(s.finished[i])throw Error('この仕事は既に仮に完了させました。');
 const need=s.maximum[i].map((x,j)=>x-s.allocation[i][j]);
 const missing=need.flatMap((x,j)=>x>s.work[j]?['資源'+(j+1)+'が'+(x-s.work[j])+'個不足']:[]);
 if(missing.length)throw Error(missing.join('、')+'です。合計だけでなく各資源で比較してください。');
 const before=s.work.slice();s.work=s.work.map((x,j)=>x+s.allocation[i][j]);s.finished[i]=true;s.sequence.push(i);
 return note(s,'P'+i+'を仮に完了。残り必要数('+need.join(',')+')を満たし、保持していた('+s.allocation[i].join(',')+')を返すのでworkは('+before.join(',')+')→('+s.work.join(',')+')です。');
};

M.walStart=(wal=true)=>({wal,phase:'live',memory:{x:{value:1,lsn:0},y:{value:2,lsn:0}},disk:{x:{value:1,lsn:0},y:{value:2,lsn:0}},records:[],durable:0,transactions:{},locks:{},log:[]});
M.wal=(input,a)=>{
 const s=next(input),append=record=>{const lsn=s.records.length+1;s.records.push({...record,lsn});return lsn;};
 if(a.kind==='redo'){
  if(s.phase!=='crashed')throw Error('クラッシュ後の永続した情報にだけREDOします。');
  for(const e of s.records)if(e.type==='update'&&s.disk[e.key].lsn<e.lsn)s.disk[e.key]={value:e.after,lsn:e.lsn};
  s.phase='redone';return note(s,'永続した更新ログをLSN順に読み、ページLSNより新しい変更をREDOしました。未確定TXの変更もこの段階では含まれます。');
 }
 if(a.kind==='undo'){
  if(s.phase!=='redone')throw Error('REDO後に、未確定TXだけをUNDOします。');
  const committed=new Set(s.records.filter(e=>e.type==='commit').map(e=>e.tx));
  for(const e of s.records.slice().reverse())if(e.type==='update'&&!committed.has(e.tx))s.disk[e.key].value=e.before;
  s.phase='recovered';return note(s,'commit記録のないTXの更新を、永続ログの逆順でUNDOしました。存在しないログのbefore値を推測して戻すことはできません。');
 }
 if(s.phase!=='live')throw Error('故障後はREDO・UNDOを行います。通常操作へ戻るには実験を最初から始めてください。');
 if(a.kind==='crash'){
  s.memory=null;s.records=s.records.slice(0,s.durable);s.transactions={};s.locks={};s.phase='crashed';return note(s,'メモリと未永続ログを失いました。ここから先は、ディスクと残ったログだけで判断します。');
 }
 if(a.kind==='flush'){
  if(!s.memory[a.key])throw Error('ページはxかyです。');
  if(s.wal)s.durable=Math.max(s.durable,s.memory[a.key].lsn);s.disk[a.key]=copy(s.memory[a.key]);return note(s,a.key+'のページを保存。'+(s.wal?'対応する更新ログを先に永続化しました。':'反例：対応するログを先に保存していません。'));
 }
 if(a.kind==='checkpoint'){append({type:'checkpoint'});s.durable=s.records.length;return note(s,'チェックポイントをログへ記録して永続化しました。ここではデータページのflushや古いログの削除は行いません。');}
 if(!['T1','T2'].includes(a.tx))throw Error('T1かT2を選びます。');
 if(a.kind==='set'){
  if(!s.memory[a.key])throw Error('ページはxかyです。');
  if(!Number.isInteger(a.value)||a.value<0||a.value>99)throw Error('値は0〜99です。');
  if(s.transactions[a.tx]==='committed')throw Error('確定済みTXの名前を再利用しません。');
  if(s.locks[a.key]&&s.locks[a.key]!==a.tx)throw Error('別のTXがこのページを書込み中です。');
  s.transactions[a.tx]='active';s.locks[a.key]=a.tx;
  const lsn=append({type:'update',tx:a.tx,key:a.key,before:s.memory[a.key].value,after:a.value});s.memory[a.key]={value:a.value,lsn};return note(s,a.tx+'が'+a.key+'='+a.value+'をメモリに書き、更新ログLSN '+lsn+'を作りました。まだcommitでもディスクへの保存でもありません。');
 }
 if(a.kind==='commit'){
  if(s.transactions[a.tx]!=='active')throw Error('先にこのTXでSETしてください。');
  append({type:'commit',tx:a.tx});s.durable=s.records.length;s.transactions[a.tx]='committed';for(const key of ['x','y'])if(s.locks[key]===a.tx)delete s.locks[key];
  return note(s,a.tx+'のcommit記録までを永続化しました。ページが未保存でも、更新を記録から復元できます。');
 }
 throw Error('未定義の永続化操作です。');
};
})();
