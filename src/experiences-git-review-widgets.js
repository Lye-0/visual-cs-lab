/* Shared state lifecycle; six different questions and operation layouts.
 * All operations affect a bounded teaching repository in memory only. */
(() => {
'use strict';
if(typeof document==='undefined')return;
const L=CSL,X=L.experiences,Q=X.gitReview,G=L.git,S=X.securityDesk,h=L.h;
const {b,p,box,table}=S.ui;
const literal=v=>v===undefined||v===null?'（なし）':v===''?'（空文字列）':v;
const files=tree=>Object.entries(tree).length?Object.entries(tree).map(([name,value])=>`<div class="ex-git-file"><code>${h(name)}</code><pre>${h(literal(value))}</pre></div>`).join(''):p('ファイルなし');
const changes=rows=>rows.length?table(['ファイル','変更前','変更後'],rows.map(r=>[r.file,literal(r.before),literal(r.after)])):p('差分はありません。');
const refs=r=>table(['参照','指しているコミット'],[['HEAD',r.head?'ブランチ '+r.head:r.detached],...Object.entries(r.refs)]);
const scopes='この枠は仮想リポジトリです。実ファイル・GitHub・ネットワークは変更しません。C0等は説明用IDで実際のハッシュではありません。「一つ前の操作へ」は教材の取消しで、実Gitの復元コマンドではありません。';
const triple=r=>`<div class="ex-git-three">${box('1　作業中の内容 / worktree',files(r.work))}${box('2　次に保存する内容 / index',files(r.index))}${box('3　HEADのコミットに保存した内容',p('HEAD → '+(r.head||'detached')+' → '+G.oid(r))+files(r.objects[G.oid(r)].tree))}</div>`;
function graph(s,label,token,interactive=true){
 const r=s.repo,v=Q.view(s),ids=v.commits.map(c=>c.id),main=G.ancestors(r,r.refs.main),active=G.ancestors(r,G.oid(r));
 const positions=Object.fromEntries(ids.map((id,i)=>[id,[52+(main.has(id)?0:active.has(id)?1:2)*66,36+i*60]]));
 const edges=ids.flatMap(id=>r.objects[id].parents.filter(parent=>positions[parent]).map(parent=>{const [x,y]=positions[id],[xx,yy]=positions[parent];return `<path d="M${x} ${y+10} C${x} ${y+26},${xx} ${yy-26},${xx} ${yy-10}" class="ex-git-edge" marker-end="url(#${token})"/>`;})).join('');
 const nodes=ids.map(id=>{const [x,y]=positions[id],commit=r.objects[id],labels=[...Object.entries(r.refs).filter(([,v])=>v===id).map(([k])=>k),...Object.entries(r.tracking).filter(([,v])=>v===id).map(([k])=>k),G.oid(r)===id?'HEAD':''].filter(Boolean).join(' / ');return `<g ${interactive?`data-sec-action="select:${id}" role="button" tabindex="0" aria-label="コミット${id}を選ぶ"`:''} class="ex-git-node${active.has(id)?'':' is-old'}${s.selected===id?' is-selected':''}"><circle cx="${x}" cy="${y}" r="10"/><text x="234" y="${y+5}">${h(id+'　'+labels)}</text></g>`;}).join('');
 return `<div class="ex-git-graph-wrap" data-sec-view="${token}-scroll" tabindex="0" role="region" aria-label="${h(label)}"><svg viewBox="0 0 590 ${Math.max(120,ids.length*60+25)}" class="ex-git-graph" role="group" aria-label="${h(label)}"><title>${h(label)}</title><defs><marker id="${token}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z"/></marker></defs>${edges}${nodes}</svg></div>`+p('線の矢印はコミットから親へ向かいます。縦方向は作成順の目安で、横の列はブランチの所有権ではありません。破線の点は現在のHEADの祖先でないオブジェクトです。');
}
const commitDetail=s=>{const v=Q.view(s),c=v.selected;return box('選んだコミット '+c.id,p(c.message)+p('親：'+(c.parents.join('、')||'なし'))+files(c.tree)+`<details class="ex-git-details" data-sec-view="commit-diff"><summary>第1親から何が変わったか</summary>${changes(v.delta)}${p(c.parents.length>1?'マージには親が二つあります。ここは第1親との比較で、全ての合流情報を一つの差分にまとめたものではありません。':'ルートでは空の状態と比べます。内容が同じでも親や履歴が違えば、同じコミットとは限りません。')}</details>`);};
function compareRepos(s){const before=s.baseline,after=s.repo;return box('同じ出発点から何が変わったか',table(['領域','出発点','今回'],[['HEADの指すID',G.oid(before),G.oid(after)],['notes.txt / HEAD',literal(before.objects[G.oid(before)].tree['notes.txt']),literal(after.objects[G.oid(after)].tree['notes.txt'])],['notes.txt / index',literal(before.index['notes.txt']),literal(after.index['notes.txt'])],['notes.txt / worktree',literal(before.work['notes.txt']),literal(after.work['notes.txt'])],['存在するコミット数',Object.keys(before.objects).length,Object.keys(after.objects).length]]));}
const renderers={
 stage(s,field,token){const v=Q.view(s);return p('①内容を書き換える → ②add → ③もう一度書き換える → ④commitを試してください。commitに入るのは②の時点の内容です。')+
 `<div class="ex-git-fields">${field('filename','編集する仮想ファイル',s.file,{choices:['notes.txt','extra.txt']})}${b('このファイルを選ぶ','file')}</div>`+
 `<div class="ex-git-three">${box('作業ファイルを編集',field('content','新しい内容',s.repo.work[s.file]??'',{type:'textarea',maxLength:400})+b('作業内容だけを変更','edit'))}${box('次のコミットへ選ぶ',p('対象：'+s.file)+b('このファイルをaddする','add')+p('addは、その瞬間の内容をindexへ写します。以後の編集が自動で追従するわけではありません。'))}${box('ステージをコミット',field('message','コミットの説明','変更を保存',{type:'text'})+b('indexをcommitする','commit')+p('indexがHEADと同じなら新しい変更はありません。'))}</div>`+
 triple(s.repo)+`<div class="ex-git-two">${box('未ステージ差分 / index → worktree',changes(v.unstaged))}${box('ステージ済み差分 / HEAD → index',changes(v.staged))}</div>`+graph(s,'保存されたコミット',token)+commitDetail(s);},
 reset(s,field,token){return p('出発点では、保存済み・ステージ・作業中のnotes.txtが全て異なります。各モードは、この同じ出発点から独立に試します。')+
 box('戻す先を選ぶ',`<div class="ex-actions">${['C0','C1'].map(id=>b(id+'を対象にする','target:'+id,`aria-pressed="${s.target===id}"`)).join('')}</div>`+p('C0の内容はstart、C1の内容はcommittedです。indexはstaged、worktreeはworkingという区別できる文字列から始めます。'))+
 `<div class="ex-git-three">${box('soft',b('同じ出発点でsoftを比較','compare:soft',`aria-pressed="${s.comparison==='soft'}"`)+p('現在ブランチの参照を動かし、indexとworktreeは保ちます。'))}${box('mixed',b('同じ出発点でmixedを比較','compare:mixed',`aria-pressed="${s.comparison==='mixed'}"`)+p('参照とindexを対象へそろえます。worktreeは保ちます。'))}${box('hard',b('同じ出発点でhardを比較','compare:hard',`aria-pressed="${s.comparison==='hard'}"`)+p('参照・index・追跡中のworktreeを対象へそろえます。実Gitでは未保存内容の破棄に注意が必要です。'))}</div>`+
 compareRepos(s)+graph(s,'reset後も残るコミット',token)+commitDetail(s)+p('参照から外れたC1が、この教材のオブジェクト一覧には残ることも確認してください。実Gitでもreset直後にコミットを物理削除するわけではありませんが、保存していない作業内容までreflogから回復できるわけではありません。GC・未追跡ファイル・path指定のresetはこの例の範囲外です。');},
 merge(s,field,token){const r=s.repo,ancestor=s.baseline.objects.C0.tree,left=s.baseline.objects[s.baseline.refs.main].tree,right=s.baseline.objects[s.baseline.refs.feature].tree;return `<div class="ex-actions">${[['ff','mainは進んでいない'],['default','別ファイルを変更した'],['conflict','同じファイルを変更した']].map(([id,label])=>b(label,'scenario:'+id,`aria-pressed="${s.scenario===id}"`)).join('')}</div>`+
 p('比較する出発点を選ぶと初期化します。実Gitの行単位マージではなく、この教材はファイル単位で競合を判定します。')+
 `<div class="ex-git-three">${box('共通祖先 C0',files(ancestor))}${box('main側の保存内容',files(left))}${box('feature側の保存内容',files(right))}</div>`+
 b('mainでfeatureをmergeする','merge',s.comparison?'disabled':'')+graph(s,'二つの親と参照の移動',token)+refs(r)+
 (r.pending?box('競合：まだマージコミットは作っていない',p('notes.txtについて、mainとfeatureのどちらを残すか、または両方を組み合わせるかを自分で決めます。')+field('resolved','最終的に残す内容',s.resolution??'main と feature を統合',{type:'textarea',maxLength:400})+`<div class="ex-actions">${b('この内容を作業・indexへ反映','resolve')}${b('解決済みindexで2親のcommitを作る','finish',s.resolution===null?'disabled':'')}</div>`+files(r.index)):s.comparison?box('今回の結果',p(s.scenario==='ff'?'既存のfeatureへmainを前進させました。コミットを新規作成していません。':'両側を親に持つマージコミットを作りました。')+files(r.objects[G.oid(r)].tree)):'')+commitDetail(s);},
 rebase(s,field,token){return p('mainが1回、featureが2回進んだ出発点です。feature上からmainを取り込む二つの方法を、毎回同じ出発点で比較します。')+
 `<div class="ex-actions">${b('同じ出発点でmerge main','compare:merge',`aria-pressed="${s.comparison==='merge'}"`)}${b('同じ出発点でrebase main','compare:rebase',`aria-pressed="${s.comparison==='rebase'}"`)}</div>`+
 `<div class="ex-git-two">${box('変更前',graph({...s,repo:s.baseline},'変更前の親子関係',token+'-before',false))}${box('変更後',graph(s,'変更後の親子関係',token))}</div>`+
 (s.mapping.length?box('変更は似ていても、親とIDは作り直す',table(['元のID → 新しいID','元の親','新しい親'],s.mapping.map(m=>[m.old+' → '+m.new,s.repo.objects[m.old].parents.join(', '),s.repo.objects[m.new].parents.join(', ')]))+s.mapping.map(m=>`<details class="ex-git-details" data-sec-view="mapping-${m.old}"><summary>${m.old}と${m.new}の差分を対応させる</summary>${changes(Q.diff(s.repo.objects[s.repo.objects[m.old].parents[0]].tree,s.repo.objects[m.old].tree))}${changes(Q.diff(s.repo.objects[s.repo.objects[m.new].parents[0]].tree,s.repo.objects[m.new].tree))}</details>`).join('')):p(s.comparison?'mergeは元のコミットをそのまま親に残し、合流のコミットを一つ追加します。':'方法を選ぶ前の履歴を表示しています。'))+
 commitDetail(s)+p('この例は競合しない線形の2コミットに限定しています。rebaseで既に共有したブランチの履歴を作り直すと、他の利用者の履歴と食い違います。この枠の実験が、共有ブランチをforce pushしてよいという推奨ではありません。');},
 remote(s,field,token){const r=s.repo,v=Q.view(s);return p('別の開発者による変更を作り、fetchの前後を比べます。右の観測用パネルは実験者向けで、ローカルがまだ取得していない情報も含みます。')+
 `<div class="ex-git-three">${box('自分のローカル main',p('main → '+r.refs.main)+files(r.objects[r.refs.main].tree)+field('local','自分のlocal.txtの内容','自分の変更',{type:'text'})+b('編集・add・commitを行う','local'))}${box('手元の記録 origin/main',p('origin/main → '+(r.tracking['origin/main']||'未取得'))+files(v.trackingTree||{})+p('この参照はローカルにあります。相手が更新しただけでは、ここは動きません。'))}${box('相手側の実際のmain（観測用）',p('remote main → '+r.remote.main)+files(v.remoteTree)+field('remote','別の開発者のremote.txtの内容','相手の変更',{type:'text'})+b('相手側だけでcommitする','remote'))}</div>`+
 `<div class="ex-git-remote-actions">${box('1　取得',b('fetch','fetch')+p('相手のコミットを取得し、追跡参照を更新。自分のmainと作業ファイルは動かしません。'))}${box('2　統合',b('merge origin/main','merge')+b('fetchしてからmerge（教材のpull）','pull')+p('自分のブランチへ取り込みます。この教材のpullはfetch＋mergeに固定。実Gitのpullは設定やオプションで動作が変わります。'))}${box('3　送信',b('push','push')+p('相手を巻き戻す更新は拒否します。先にfetch・統合してからもう一度試してください。'))}</div>`+
 box('手元の記録だけから分かる差',table(['比較','コミット数'],[['mainにだけある（origin/main基準）',v.knownAhead],['origin/mainにだけある（main基準）',v.knownBehind]]))+graph(s,'ローカルで既知のコミットだけを表示',token)+commitDetail(s)+
 `<details class="ex-git-details" data-sec-view="remote-work">${'<summary>現在のworktreeを確認する</summary>'+files(r.work)}</details>`+p('内部エンジンは仮想オブジェクト空間を共有しますが、この画面のローカル履歴は未取得の相手コミットを隠しています。pack転送・認証・実通信時間・任意のリモート設定は再現していません。');},
 undo(s,field,token){return p('どちらもC1まで保存した同じ状態から試します。revertの後にamendを連続適用する比較ではありません。')+
 `<div class="ex-git-two">${box('revert：打消しを追加する',p('C1で変更したnotes.txtを元へ戻す、新しいコミットを作ります。')+b('同じ出発点でrevert C1','compare:revert',`aria-pressed="${s.comparison==='revert'}"`))}${box('amend：先頭を作り直す',field('amended','保存し直すnotes.txtの内容','first を訂正',{type:'textarea',maxLength:400})+field('amend-message','作り直すコミットの説明','内容を訂正',{type:'text'})+b('編集・addしてamendする','compare:amend',`aria-pressed="${s.comparison==='amend'}"`))}</div>`+
 compareRepos(s)+graph(s,'追加した履歴と作り直した履歴',token)+commitDetail(s)+p(s.comparison==='amend'?'amendはC1の親を保つ新しいC2を作りました。古いC1もオブジェクトとして残りますが、mainは新しい方を指します。共有済みの履歴のamendには注意が必要です。':s.comparison==='revert'?'revertはC1を親とするC2を追加しました。C1の存在や、変更したという履歴は消えていません。':'方法を選び、親と内容の違いを比べてください。');}
};
for(const lesson of ['stage','reset','merge','rebase','remote','undo'])X.registerWidget('git-'+lesson+'-desk',(root,a,c)=>{
 const token='git-arrow-'+c.lab.id+'-'+c.chapter;
 const ui=S.mount(root,c,{start:()=>Q.start(lesson),reduce:Q.reduce,instruction:scopes,
 action:(code,f,s)=>{const [kind,value]=code.split(':');
  if(kind==='select')return {kind,id:value};
  if(kind==='scenario')return {kind,value,fresh:true};
  if(kind==='target')return {kind,id:value};
  if(kind==='file')return {kind,value:f.get('filename'),fresh:true};
  if(kind==='edit')return {kind,value:f.get('content')};
  if(kind==='resolve')return {kind,value:f.get('resolved')};
  if(kind==='commit')return {kind,message:f.get('message')};
  if(kind==='local'||kind==='remote')return {kind,value:f.get(kind)};
  if(kind==='compare')return value==='amend'?{kind,value,valueText:f.get('amended'),message:f.get('amend-message')}:{kind,value};
  return {kind};
 },render:(s,{field})=>renderers[lesson](s,field,token)});
 ui.scope.on(root,'keydown',event=>{const node=event.target.closest('g[data-sec-action]');if(!node||!['Enter',' '].includes(event.key))return;event.preventDefault();event.stopPropagation();void ui.apply({kind:'select',id:node.dataset.secAction.split(':')[1]});});
});
})();
