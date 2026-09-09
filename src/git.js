(() => {
'use strict';
const L=CSL,{clone,frame:F,result:out,register:R}=L;
const equal=(a,b)=>JSON.stringify(Object.entries(a).sort())===JSON.stringify(Object.entries(b).sort());
function initial(){return {objects:{C0:{id:'C0',parents:[],message:'初期コミット',tree:{'notes.txt':'start'}}},refs:{main:'C0'},head:'main',detached:null,index:{'notes.txt':'start'},work:{'notes.txt':'start'},remote:{main:'C0'},tracking:{},reflog:[],pending:null,serial:1};}
function oid(s){return s.detached||s.refs[s.head];}
function resolve(s,ref){if(!ref||ref==='HEAD')return oid(s);let m=ref.match(/^(.*)~(\d+)$/);if(m){let id=resolve(s,m[1]);for(let i=0;i<+m[2];i++){id=s.objects[id]?.parents[0];if(!id)throw Error('その位置に祖先コミットはありません。');}return id;}const id=s.refs[ref]||s.tracking[ref]||(s.objects[ref]?ref:null);if(!id)throw Error(`参照 ${ref} が見つかりません。`);return id;}
function ancestors(s,id){let found=new Set(),q=[id];while(q.length){let u=q.shift();if(found.has(u))continue;found.add(u);q.push(...(s.objects[u]?.parents||[]));}return found;}
function base(s,a,b){let aSet=ancestors(s,a),q=[b],seen=new Set();while(q.length){let u=q.shift();if(seen.has(u))continue;seen.add(u);if(aSet.has(u))return u;q.push(...s.objects[u].parents);}throw Error('共通祖先がありません。');}
function move(s,id,event){const old=oid(s);if(s.detached)s.detached=id;else s.refs[s.head]=id;s.reflog.push({old,new:id,event});}
function clean(s){return equal(s.work,s.index)&&equal(s.index,s.objects[oid(s)].tree);}
function materialize(s,tree){s.index=clone(tree);s.work=clone(tree);}
function patch(target,from,to){let result=clone(target);for(const f of new Set([...Object.keys(from),...Object.keys(to)])){if(from[f]===to[f])continue;if(result[f]!==from[f]&&result[f]!==to[f])throw Error(`競合: ${f}。この行単位でない教材モデルでは自動解決しません。`);if(to[f]===undefined)delete result[f];else result[f]=to[f];}return result;}
function create(s,tree,message,parents){const id='C'+s.serial++;s.objects[id]={id,parents,message,tree:clone(tree)};move(s,id,message);return id;}
function tokenize(s){const tokens=s.match(/"(?:\\.|[^"\\])*"|'[^']*'|\S+/g)||[];return tokens.map(t=>t[0]==='"'?JSON.parse(t):t[0]==="'"?t.slice(1,-1):t);}
function execute(state,line){const s=clone(state),t=tokenize(line);if(t[0]==='git')t.shift();let [cmd,...a]=t;let notice='';
 const checkClean=()=>{if(!clean(s))throw Error('先に変更をコミットするか、reset --hardで破棄してください。作業中の変更を保護しています。');};
 const current=()=>s.objects[oid(s)];
 if(cmd==='edit'){if(a.length<2)throw Error('edit ファイル名 "内容" の形で入力します。');if(a[0]==='__proto__'||a[0]==='constructor'||a[0]==='prototype')throw Error('このファイル名は使えません。');s.work[a[0]]=a.slice(1).join(' ');notice='作業ファイルだけを変更しました。ステージとコミットはまだ変わりません。';}
 else if(cmd==='remove'){delete s.work[a[0]];notice='作業ファイルを削除しました。削除をコミットするにはaddが必要です。';}
 else if(cmd==='add'){if(!a.length||a[0]==='.')s.index=clone(s.work);else for(const f of a){if(s.work[f]===undefined)delete s.index[f];else s.index[f]=s.work[f];}notice='現在の作業内容をステージに反映しました。この後の編集が自動でステージされるわけではありません。';}
 else if(cmd==='commit'||cmd==='amend'){
  let amend=cmd==='amend'||a.includes('--amend');let message=a.filter(x=>!['-m','--amend'].includes(x)).join(' ')||'変更を保存';if(equal(s.index,current().tree)&&!amend&&!s.pending)throw Error('ステージされた変更がありません。');let parents=amend?clone(current().parents):s.pending||[oid(s)];create(s,s.index,message,parents);s.pending=null;notice=amend?'同じ親を持つ新しいコミットを作りました。古いオブジェクトは残ります。':'ステージのスナップショットをコミットとして保存しました。';}
 else if(cmd==='branch'){let name=a[0];if(!/^[A-Za-z][\w/-]{0,30}$/.test(name||'')||['__proto__','constructor','prototype'].includes(name))throw Error('ブランチ名は英字から始まる31文字以内にしてください。');if(s.refs[name])throw Error('同名のブランチが存在します。');s.refs[name]=resolve(s,a[1]||'HEAD');notice='ブランチの参照を追加しました。ブランチ作成そのものはコミットを作りません。';}
 else if(cmd==='switch'||cmd==='checkout'){checkClean();const id=resolve(s,a[0]);if(s.refs[a[0]]){s.head=a[0];s.detached=null;}else{s.head=null;s.detached=id;}materialize(s,s.objects[id].tree);notice=s.detached?'コミットを直接指すdetached HEADになりました。':'HEADが指すブランチを切り替えました。';}
 else if(cmd==='reset'){
  let mode=a.find(x=>x.startsWith('--'))||'--mixed';if(!['--soft','--mixed','--hard'].includes(mode))throw Error('対応モードはsoft・mixed・hardです。');let target=resolve(s,a.find(x=>!x.startsWith('--'))||'HEAD');move(s,target,'reset '+mode);if(mode!=='--soft')s.index=clone(s.objects[target].tree);if(mode==='--hard')s.work=clone(s.objects[target].tree);s.pending=null;notice=mode==='--soft'?'HEAD側の参照だけを移動しました。indexとworktreeは維持されます。':mode==='--mixed'?'参照とindexを戻しました。作業ファイルは維持されます。':'参照、index、worktreeを対象コミットにそろえました。変更は教材内で破棄されます。';}
 else if(cmd==='merge'){
  checkClean();let target=resolve(s,a[0]),old=oid(s);if(ancestors(s,old).has(target)){notice='すでに取り込まれています。';}
  else if(ancestors(s,target).has(old)){move(s,target,'merge fast-forward');materialize(s,s.objects[target].tree);notice='Fast-forwardです。参照を前へ動かし、新しいコミットは作りません。';}
  else{let ancestor=base(s,old,target);try{let tree=patch(s.objects[old].tree,s.objects[ancestor].tree,s.objects[target].tree);create(s,tree,'マージ '+a[0],[old,target]);materialize(s,tree);notice='2つの親を持つマージコミットを作りました。';}catch(e){s.pending=[old,target];notice=e.message+' 作業ファイルをeditし、add→commitで教材内の競合を解決できます。';}}
 }
 else if(cmd==='rebase'){
  checkClean();let onto=resolve(s,a[0]),old=oid(s),ancestor=base(s,old,onto);if(onto===old||ancestor===onto){notice='この線形教材例では付け替えが不要です。';}else{
  let chain=[],u=old;while(u!==ancestor){if(s.objects[u].parents.length!==1)throw Error('このrebase教材は線形履歴に限ります。マージコミットの付け替えは扱いません。');chain.unshift(u);u=s.objects[u].parents[0];}
  move(s,onto,'rebase onto');materialize(s,s.objects[onto].tree);for(const id of chain){let c=s.objects[id],parent=s.objects[c.parents[0]],tree=patch(current().tree,parent.tree,c.tree);create(s,tree,c.message+'（再適用）',[oid(s)]);materialize(s,tree);}notice='変更を新しい土台へ順番に適用し、新しいコミットを作りました。古いオブジェクトを消したわけではありません。';}
 }
 else if(cmd==='cherry-pick'||cmd==='revert'){
  checkClean();let id=resolve(s,a[0]),c=s.objects[id];if(c.parents.length!==1)throw Error('ここでは親が1つのコミットだけが対象です。');let parent=s.objects[c.parents[0]],tree=cmd==='revert'?patch(current().tree,c.tree,parent.tree):patch(current().tree,parent.tree,c.tree);create(s,tree,cmd+' '+id,[oid(s)]);materialize(s,tree);notice=cmd==='revert'?'変更を打ち消す新しいコミットを作りました。履歴の位置を戻すresetとは違います。':'指定コミットの変更を適用して、新しいコミットを作りました。';
 }
 else if(cmd==='fetch'){for(const [name,id]of Object.entries(s.remote))s.tracking['origin/'+name]=id;notice='remoteの状態を追跡参照へ反映しました。作業ブランチや作業ファイルは移動しません。';}
 else if(cmd==='push'){
  if(!s.head)throw Error('この教材ではブランチ上からpushします。');let prev=s.remote[s.head];if(prev&&!ancestors(s,oid(s)).has(prev))throw Error('non-fast-forward: リモート側の履歴を先に取り込んでください。');s.remote[s.head]=oid(s);s.tracking['origin/'+s.head]=oid(s);notice='仮想リモートのブランチを更新しました。外部ネットワークには接続していません。';}
 else if(cmd==='pull'){
  checkClean();let target=s.remote[s.head];if(!target)throw Error('対応するリモート参照がありません。');s.tracking['origin/'+s.head]=target;let next=execute(s,'merge origin/'+s.head);return {...next,notice:'fetchの後、仮想リモート追跡参照をmergeしました。 '+next.notice};}
 else if(cmd==='remote-edit'){
  let branch=a[0]||'main',prior=s.remote[branch];if(!prior)throw Error('そのリモートブランチはありません。');let tree=clone(s.objects[prior].tree);if(!a[1]||['__proto__','constructor','prototype'].includes(a[1]))throw Error('安全なファイル名を指定してください。');tree[a[1]]=a.slice(2).join(' ');let id='C'+s.serial++;s.objects[id]={id,parents:[prior],message:'リモートの変更',tree};s.remote[branch]=id;notice='別の開発者による仮想リモートの変更を発生させました。ローカルの追跡参照はまだ古いままです。';}
 else if(cmd==='status'){notice='作業ファイル、index、HEADの違いを観察します。状態を変更しません。';}
 else throw Error('対応していないコマンドです。画面のコマンド一覧を確認してください。');
 return {state:s,notice};
}
function gitVisual(s){let id=oid(s),reachable=new Set();for(const ref of [...Object.values(s.refs),...Object.values(s.remote),...Object.values(s.tracking),id])for(const a of ancestors(s,ref))reachable.add(a);return {type:'git',state:clone(s),current:id,reachable:[...reachable]};}
L.git={initial,execute,resolve,oid,ancestors,clean};
R('git',(p)=>{
 let state=initial(),frames=[F('仮想リポジトリを初期化','コミットC0とmainから開始します。C0などは説明用のIDで、実際のGitハッシュではありません。',gitVisual(state))],lines=p.script.split('\n').map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));if(lines.length>60)throw Error('コマンドは60行以内にしてください。');
 let error=null;
 for(let i=0;i<lines.length;i++){try{let r=execute(state,lines[i]);state=r.state;frames.push(F(lines[i],r.notice,gitVisual(state),{'HEAD':oid(state),'ブランチ':state.head||'detached'},{headers:['ファイル','HEAD','index','worktree'],rows:[...new Set([...Object.keys(state.work),...Object.keys(state.index),...Object.keys(state.objects[oid(state)].tree)])].map(f=>[f,state.objects[oid(state)].tree[f]??'（なし）',state.index[f]??'（なし）',state.work[f]??'（なし）'])}));}catch(e){error=`${i+1}行目: ${e.message}`;frames.push(F('コマンドを停止: '+lines[i],error,gitVisual(state),{'実行':'停止'}));break;}}
 let staged=!equal(state.index,state.objects[oid(state)].tree),unstaged=!equal(state.work,state.index);return out(frames,{'HEAD':oid(state),'コミットオブジェクト':Object.keys(state.objects).length,'ステージ変更':staged?'あり':'なし','未ステージ変更':unstaged?'あり':'なし'},error||'作業ファイル・ステージ・コミット・参照の違いを、同時に確かめてください。');
});
})();
