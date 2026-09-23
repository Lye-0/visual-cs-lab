/* A source row, a join partner, an uncommitted value and a routing key are
 * different learning objects. These four layouts deliberately differ. */
(() => {
'use strict';
if(typeof document==='undefined')return;
const L=CSL,X=L.experiences,D=X.databaseReview,S=X.securityDesk,h=L.h;
const {b,p,box,table}=S.ui,formula=X.html.formula;
const dash=value=>value===null?'—':String(value);
const grid=(heads,rows,label,view='')=>`<div class="ex-db-scroll" ${view?'data-sec-view="'+view+'"':''} role="region" aria-label="${h(label)}" tabindex="0"><table class="ex-db-table"><caption>${h(label)}</caption><thead><tr>${heads.map(x=>'<th scope="col">'+h(x)+'</th>').join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
const row=(cells,attrs='')=>'<tr '+attrs+'>'+cells.map(x=>'<td>'+x+'</td>').join('')+'</tr>';
const val=(x)=>x===null?'<code class="ex-db-null">NULL</code>':x===''?'""（空文字列）':x==='NULL'?'"NULL"（文字列）':h(String(x));
X.registerWidget('index-correspondence',(root,a,c)=>S.mount(root,c,{
 start:D.indexStart,reduce:D.index,
 instruction:'最初はageが21以上の人を探します。「開始位置の候補を比較」を一回ずつ押し、索引のどこを調べたかを読みます。開始位置が決まったら、索引項目から元の行を取得してください。',
 action:(code,f)=>{const [kind,v]=code.split(':');return kind==='query'?{kind,age:f.get('age'),fresh:true}:kind==='method'?{kind,value:v,fresh:true}:kind==='source'||kind==='entry'?{kind,index:Number(v)}:{kind};},
 render:(s,{field})=>{
  const v=D.indexView(s),done=s.phase==='done',selected=s.selected;
  const source=grid(['元表の行','name','age'],v.people.map((person,i)=>row([b('行'+(i+1)+' / id='+person.id,'source:'+i,`aria-pressed="${selected===i}"`),h(person.name),person.age],`data-db-source="${i}" data-active="${selected===i}"`)),'元の表：行の順序は変えない','index-source');
  const index=grid(['索引の位置','age','元の行への参照'],v.entries.map((entry,i)=>row([b('位置'+(i+1),'entry:'+i,`aria-label="索引の位置${i+1}から元の行${entry.source+1}へ" aria-pressed="${selected===entry.source}"`),entry.age,'行'+(entry.source+1)+' / id='+entry.id],`data-db-entry="${i}" data-active="${selected===entry.source}" data-candidate="${s.phase==='seek'&&i>=s.lo&&i<s.hi}"`)),'age順の索引：値と元の行への参照','index-entries');
  return `<div class="ex-actions">${b('索引を使う','method:index',`aria-pressed="${s.method==='index'}"`)}${b('元表を全て走査する','method:scan',`aria-pressed="${s.method==='scan'}"`)}</div><div class="ex-db-fields">${field('age','ageがいくつ以上か',s.age,{min:0,max:99})}${b('条件を変えて最初から調べる','query')}</div>`+formula('SELECT id, name, age FROM users WHERE age >= '+s.age+' ORDER BY id;')+
   `<div class="ex-db-two">${box('元の行はどこか',source)}${box('索引項目はどこを指すか',index)}</div>`+
   box('選択した二つの場所を対応させる',p('索引の位置'+(v.indexPosition+1)+'（age='+v.source.age+'） → 元表の行'+(selected+1)+' / '+v.source.name+'。同じ人物を二つの場所に複製したのではなく、ここでは参照で結んでいます。'))+
   box(done?'今回の検索は完了':s.phase==='seek'?'まず開始位置を求める':'元の行を読んで結果を作る',p(s.phase==='seek'?'次は索引の位置'+(v.next+1)+'と条件を比較します。内部の半開区間 ['+s.lo+', '+s.hi+') は0始まりの候補範囲です。':s.phase==='scan'?(s.method==='index'?'次は索引の位置':'次は元表の行')+(v.next+1)+'を読みます。':'まだ調べていない行を、先に結果へ表示することはしません。')+b(s.phase==='seek'?'開始位置の候補を比較':s.method==='index'?'次の索引項目から元の行を取得':'元表の次の一行を照合','next',done?'disabled':'')+table(['見つかったid','name','age'],v.result.map(r=>[r.id,r.name,r.age]))+p('表示結果はid順です。検索の途中の取得順とは区別しています。'))+
   table(['数える作業','今回の回数'],[['開始位置の二分探索での比較',v.costs.seekComparisons],['開始位置より後に読んだ索引項目',v.costs.indexEntries],['読んだ元表の行',v.costs.tableRows]])+
   `<details class="ex-db-details" data-sec-view="index-evidence"><summary>これまで調べた場所と判断</summary>${table(['索引位置（1始まり）','比較したage','比較後の候補 [lo,hi)'],s.probes.map(q=>[q.position+1,q.age,'['+q.after.join(', ')+')']))}${table(['順番','元表の行','age','条件に一致'],s.reads.map((r,i)=>[i+1,r.source+1,r.age,r.matches?'はい':'いいえ']))}</details>`+
   p('索引を整列配列として表した小例です。比較・索引項目・元表の行は違う作業なので、回数をそのまま秒数へ置き換えません。実際のB+木の深さ、キャッシュ、ディスクI/O、索引更新コストはこの画面では計算しません。');
 }
}));
X.registerWidget('join-provenance',(root,a,c)=>S.mount(root,c,{
 start:D.joinStart,reduce:D.join,
 instruction:'左のRenを選ぶと、対応する右行がない場合を調べられます。次にAoiを選び、一つの左行から二つの出力行ができる理由を見ます。「NULLを含む比較例」では、元からあるNULLと補われたNULLを比べてください。',
 action:(code,f)=>{const [kind,value]=code.split(':');if(kind==='method'||kind==='preset')return {kind,value,fresh:kind==='preset'};if(kind==='edit')return {kind,uid:f.get('uid'),title:f.get('title'),titleNull:f.get('titleNull')};return {kind,index:Number(value),fresh:kind==='right'||kind==='output'};},
 render:(s,{field})=>{
  const v=D.joinView(s),right=s.right[s.rightIndex];
  const leftTable=grid(['左行','id','name'],s.left.map((person,i)=>row([b('左'+(i+1),'left:'+i,`aria-label="左行${i+1} ${h(person.name)}を調べる" aria-pressed="${i===s.leftIndex}"`),val(person.id),h(person.name)],`data-db-left="${i}" data-active="${i===s.leftIndex}"`)),'users：結合の左側','join-left');
  const rightTable=grid(['右行','uid','title','選んだ左行との一致'],s.right.map((course,i)=>row([b('右'+(i+1)+'を編集','right:'+i,`aria-pressed="${i===s.rightIndex}"`),val(course.uid),val(course.title),v.matches.includes(i)?'一致':'不一致'],`data-db-right="${i}" data-active="${v.matches.includes(i)}"`)),'courses：結合の右側','join-right');
  const origins={'stored-null':'一致した右行に元からあるNULL','stored-value':'一致した右行の値','unmatched-padding':'右行がないため補ったNULL'};
  const outputs=grid(['出力','左id','name','title','値の出所'],v.rows.map((r,i)=>row([b('出力'+(i+1),'output:'+i,`aria-label="出力行${i+1}の出所を調べる" aria-pressed="${s.outputIndex===i}"`),val(r.id),h(r.name),val(r.title),h(origins[r.origin])],`data-db-origin="${r.origin}" data-active="${r.li===s.leftIndex}"`)),'結合結果：出力行から元の行へ戻れる','join-output');
  return `<div class="ex-actions">${b('INNER JOIN','method:INNER',`aria-pressed="${s.method==='INNER'}"`)}${b('LEFT JOIN','method:LEFT',`aria-pressed="${s.method==='LEFT'}"`)}${b('元の6人・4講座に戻す','preset:original')}${b('NULLを含む比較例に戻す','preset:nulls')}</div>`+formula('users u '+s.method+' JOIN courses c ON u.id = c.uid')+
   `<div class="ex-db-two">${box('左の一行を選ぶ',leftTable)}${box('一致する右行を確認する',rightTable)}</div>`+
   box('いま選んでいる左行：'+v.left.name,p(v.matches.length?'ON条件が真になる右行は '+v.matches.map(i=>'右'+(i+1)).join('、')+' です。左行一つにつき、対応する右行との組をそれぞれ出力します。':s.method==='LEFT'?'一致する右行はありません。LEFT JOINなので左の行を残し、右側の列をNULLで補います。':'一致する右行はありません。INNER JOINなので、この左行からの出力は0行です。')+p('選んだ左行からの出力数：'+v.outputs.length+'。全体の出力数：'+v.rows.length+'。'))+outputs+
   p('NULL同士は「=」のON条件では一致しません。NULLと、4文字の文字列"NULL"、空文字列""は別です。ここでは入力の行順で結果を並べていますが、SQL一般で結果順が保証されるという意味ではありません。')+
   `<details class="ex-db-details" data-sec-view="join-editor"><summary>右${s.rightIndex+1}のデータを変更する</summary><div class="ex-db-fields">${field('uid','uid：空欄はNULL',right.uid===null?'':String(right.uid),{type:'text'})}${field('title','title：空欄は空文字列',right.title===null?'':right.title,{type:'text'})}${field('titleNull','titleを文字列ではなくNULLにする',right.title===null,{type:'checkbox'})}${b('選んだ右行の変更を反映','edit')}</div>${p('結合キーは0〜99またはNULL。titleは40文字以内です。左行の選択だけでは入力中の内容を確定しません。編集対象を変更すると入力欄もその行の値に切り替わります。')}</details>`+
   p(s.preset==='nulls'?'比較例では、Renに対応するtitle=NULL、Soraに対応する文字列"NULL"、左右にNULLの結合キーを持つ比較行を追加しています。これらは元の4講座へ追加した教材上の例です。':'元の教材と同じ6人・4講座です。Aoiには2講座、Ren・Sora・Rinには対応する講座がありません。');
 }
}));
const txWords=['SELECTで読む','読んだ値から計算','UPDATEして未確定にする','COMMITする','確定済み'];
X.registerWidget('transaction-order',(root,a,c)=>S.mount(root,c,{
 start:D.txStart,reduce:D.tx,
 instruction:'AとBを両方「SELECTで読む」まで進めてください。その後AをCOMMITまで進め、続いてBをCOMMITします。次に「読む前から行ロック」で同じ順番を試し、Bが読める時点を比べます。',
 action:code=>{const [kind,value]=code.split(':');return kind==='mode'?{kind,value,fresh:true}:kind==='step'?{kind,actor:value}:{kind:'event',index:Number(value)};},
 render:s=>{
  const v=D.txView(s),selected=v.selected;
  const actors=Object.entries(s.actors).map(([id,actor])=>box(id+'：'+(actor.delta>0?'入金 +20':'出金 −10'),table(['何の値か','現在'],[['読取済みの値',dash(actor.read)],['アプリ側の計算結果',dash(actor.local)],['未確定の書込値',actor.pc>=4?'—（COMMIT済み）':dash(actor.pending)],['次の処理',txWords[actor.pc]]])+b(id+'：'+txWords[actor.pc],'step:'+id,actor.pc>=4?'disabled':''))).join('');
  return `<div class="ex-actions">${b('通常のSELECT → アプリで計算','mode:plain',`aria-pressed="${s.mode==='plain'}"`)}${b('読む前から行ロック','mode:locked',`aria-pressed="${s.mode==='locked'}"`)}</div>`+
   box('現在の確定済み残高',formula(String(s.committed))+p('行ロックの保持者：'+(s.owner||'なし')+'。UPDATEの未確定値と、他の通常SELECTが読む確定値は分けて表示しています。'))+
   `<div class="ex-db-two">${actors}</div>`+p(s.mode==='plain'?'通常SELECTは他者の未確定書込みを読まず、その時点の確定値を読みます。UPDATE同士は行ロックで待ちますが、先にアプリへ読んだ古い値まで自動で計算し直すわけではありません。':'この例ではSELECT FOR UPDATEからCOMMITまで同じ行をロックします。相手は読む前に待つので、先行処理がCOMMITした後の値を読んで計算します。')+
   (v.bothDone?box(s.committed===v.expected?'両方の増減が残った':'更新が失われた',formula('両方の増減を反映する値：100 + 20 − 10 = 110')+p('今回の確定残高：'+s.committed+'。'+(s.committed===v.expected?'この操作順では一致しました。':'どちらが古い値を読み、どのCOMMITで上書きしたかを記録へ戻ってください。'))):'')+
   box('記録を選ぶ：その時点の値だけを読む',grid(['記録','その処理','確定残高','行ロック'],s.events.map((e,i)=>row([b(String(i),'event:'+i,`aria-label="記録${i} ${h(e.name)}を読む" aria-pressed="${i===s.selectedEvent}"`),h(e.name),e.snapshot.committed,h(e.snapshot.owner||'なし')],`data-db-event="${i}"`)),'読取り・計算・未確定書込み・COMMITの順序','transaction-history')+p('選択中の記録'+s.selectedEvent+'：'+selected.name+'。この選択は履歴の閲覧であり、実験の現在状態を過去へ戻しません。')+p(selected.explain)+table(['その時点の処理','読取値','計算結果','未確定書込値','次の処理'],Object.entries(selected.snapshot.actors).map(([id,a])=>[id,dash(a.read),dash(a.local),a.pc>=4?'—（COMMIT済み）':dash(a.pending),txWords[a.pc]])))+
   p('1行の残高に対する、READ COMMITTEDと行ロックの主要な関係に絞った教材です。計算済みの定数をUPDATE SET balance=:valueで書く例であり、UPDATE SET balance=balance+:deltaという式の更新とは別です。全DB製品の内部動作や全ての隔離レベル、ロールバック・障害回復は再現しません。');
 }
}));
const nodeName=path=>path==='root'?'根': '根'+path.split('-').slice(1).map(i=>' → 子'+(Number(i)+1)).join('');
X.registerWidget('bplus-routing',(root,a,c)=>S.mount(root,c,{
 start:D.bplusStart,reduce:D.bplus,
 instruction:'「葉が分割される例」で、キー10が根と右の葉に現れる状態を作ります。その10を押して、案内用のキーと葉のデータを区別してください。別のキーを追加し、同じ見方で確認できます。',
 action:(code,f)=>{const [kind,value]=code.split(':');return kind==='insert'?{kind,value:f.get('insert'),fresh:true}:kind==='query'?{kind:'key',value:f.get('query')}:kind==='key'?{kind,value:Number(value),fresh:true}:kind==='step'?{kind,index:Number(value)}:{kind,fresh:true};},
 render:(s,{field})=>{
  const v=D.bplusView(s);
  const treeNode=(n,path)=>'<li><div class="ex-db-tree-node" data-leaf="'+n.leaf+'" data-on-route="'+v.route.some(r=>r.path===path)+'"><small>'+h(n.leaf?'葉：データ':'内部：案内')+'</small>'+n.label.split('|').map(t=>Number(t.trim())).map(k=>b(String(k),'key:'+k,'aria-label="'+h(nodeName(path))+'のキー'+k+'" aria-pressed="'+(s.key===k)+'"')).join('')+'</div>'+(n.children?'<ul>'+n.children.map((child,i)=>treeNode(child,path+'-'+i)).join('')+'</ul>':'')+'</li>';
  const tree=v.root?'<div class="ex-db-tree" data-sec-view="bplus-tree" role="region" tabindex="0" aria-label="B+木の階層図。内部の案内と葉のデータ"><ul>'+treeNode(v.root,'root')+'</ul></div>':p('まだ木は空です。');
  const nodes=grid(['ノードの位置','役割','そこに表示されるキー'],v.nodes.map(n=>row([h(nodeName(n.path)),n.leaf?'葉のデータ':'内部の案内',n.keys.map(k=>b(String(k),'key:'+k,`aria-label="${h(nodeName(n.path))}の${n.leaf?'データ':'案内キー'}${k}を調べる" aria-pressed="${s.key===k}"`)).join(' ')],`data-db-leaf="${n.leaf}" data-active="${v.route.some(r=>r.path===n.path)}"`)),'木の位置と、葉／内部ノードの役割','bplus-nodes');
  return `<div class="ex-actions">${b('葉が分割される例へ戻す','example')}</div><div class="ex-db-fields">${field('insert','追加するキー',s.key,{min:-1000,max:1000})}${b('このキーを一つ追加する','insert')}${field('query','調べるキー',s.key,{min:-1000,max:1000})}${b('このキーの案内と葉を読む','query')}</div>`+
   box('挿入の記録を選ぶ',`<div class="ex-actions">${s.values.map((key,i)=>b((i+1)+'：'+key+'を追加','step:'+i,`aria-pressed="${s.selectedStep===i}"`)).join('')}</div>`+p(s.selectedStep<0?'まだキーはありません。例を使うか、一つ追加してください。':'表示中は'+(s.selectedStep+1)+'回目の挿入後です。過去の記録を見ているときも、新規の追加は最新の木の続きに行います。'))+
   box('木を選んで、同じ数字の役割を比べる',tree)+nodes+box('キー'+s.key+'を探す道',table(['通るノード','ここでの判断'],v.route.map(n=>[nodeName(n.path),n.leaf?(n.found?'この葉にデータがある':'この葉にデータがない'):'区切り ['+n.keys.join(', ')+'] と比べ、子'+(n.child+1)+'へ進む。境界と同じキーは右へ進む。'])))+
   box('同じ数字でも役割が違う',table(['キー'+s.key+'が現れる場所','意味'],v.occurrences.map(n=>[nodeName(n.path),n.leaf?'保存するデータキー':'子へ進むための境界']))+p('葉を分割したときは右の葉の最小値を親の案内にも使います。案内へ同じ数字を載せても、元のデータは葉に残ります。内部ノード自身の分割は、案内キーの分配であり、葉データの複製とは別です。'))+
   p('元の挿入エンジンをそのまま使用しています。上限3キー、重複は1個にまとめる挿入専用の小例です。削除・実ディスク・並行更新は対象外です。既存の木の図は「挿入の計算記録」の章にも残しています。');
 }
}));
})();
