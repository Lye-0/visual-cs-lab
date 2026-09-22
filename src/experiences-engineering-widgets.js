/* Purpose-built workspaces: requirements, objects, tests, revisions and evidence.
 * Only lifecycle/form safety is shared with the other subject areas. */
(() => {
'use strict';
if(typeof document==='undefined')return;
const L=CSL,X=L.experiences,E=X.engineeringDesk,S=X.securityDesk,h=L.h,f=X.format;
const {b,p,box,table}=S.ui;
E.ui={b,p,box,table};
E.mount=(root,c,config)=>{root.classList.add('ex-engineering');return S.mount(root,c,config);};
E.raw=(heads,rows)=>`<div class="table-wrap"><table><thead><tr>${heads.map(x=>'<th scope="col">'+h(x)+'</th>').join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')}</tbody></table></div>`;
const raw=E.raw;
X.registerWidget('requirements-desk',(root,a,c)=>E.mount(root,c,{
 start:E.designStart,reduce:E.design,
 instruction:'「現在の値を読む」を押します。次にキャッシュを追加して2回読み、DBだけを更新してからもう一度読んでください。速さと、今の値が届くことは両立しているでしょうか。',
 action:(code,fields)=>{const [kind,v]=code.split(':');return kind==='select'?{kind,value:v}:kind==='replicas'?{kind,value:+v}:kind==='edit'?{kind,value:fields.get('value')}:{kind};},
 render:(s,{field})=>{
  const v=E.designView(s),roles={UI:'受け取った値を表示します。値が新しいかを独自に判定する情報は持っていません。',API:'要求を受け、保存先やキャッシュを選びます。',Cache:'以前に受け取った版と値を保存します。更新を知る仕組みがなければ古い値を返し得ます。',DB:'値と版を保持します。ここを変えても、別の場所のコピーへ自動で伝わるとは限りません。'};
  return box('要求が通る部品を選ぶ',`<div class="eg-route">${['UI','API',...(s.cache?['Cache']:[]),'DB'].map(id=>b(id+(id==='DB'?' ×'+s.replicas:''),'select:'+id,`aria-pressed="${s.component===id}"`)).join('<span aria-hidden="true">→</span>')}</div>`+p(roles[s.component]))+
   `<div class="eg-two">${box('対象を更新して要求を送る',p('DB：値 '+s.value+' / v'+s.version)+`<form class="eg-form">${field('value','DBへ書く値',20,{min:0,max:99})}${b('DBだけを更新','edit')}</form>`+b('現在の値を読む','read')+p(s.last?'画面に届いた値：'+s.last.value+' / v'+s.last.version+'、経路 '+s.last.path.join(' → '):'まだ応答はありません。'))}${box('構成と更新通知を選ぶ',`<div class="ex-actions">${b('キャッシュ：'+(s.cache?'あり':'なし'),'cache',`aria-pressed="${s.cache}"`)}${b('更新時にキャッシュを破棄：'+(s.invalidate?'する':'しない'),'invalidate',`aria-pressed="${s.invalidate}"`)}</div><div class="ex-actions">${[1,2,3].map(n=>b('DB '+n+'台','replicas:'+n,`aria-pressed="${s.replicas===n}"`)).join('')}</div>`+p('キャッシュ：'+(s.cached?'値 '+s.cached.value+' / v'+s.cached.version:'空')))}</div>`+
   box('一つの点数にせず、要求ごとに見る',table(['要求','今回の構成・応答','確認'],[['現在の値を表示する',s.last?'応答v'+s.last.version+' / DB v'+s.version:'未要求',s.last?(v.fresh?'一致':'古い版のまま'):'まだ判定しない'],['応答時間40ms以内',s.last?s.last.time+'ms':'未要求',s.last?(s.last.time<=40?'満たす':'超える'):'まだ判定しない'],['構成コスト8以内',v.cost,v.cost<=8?'満たす':'超える'],['可用性0.999以上',f(v.availability,8),v.availability>=.999?'前提付きで満たす':'この前提では不足']]))+
   p('処理時間とコストは架空です。可用性はDBの独立故障・切替成功・cache故障時のDB退避を仮定します。共通原因の故障や実際の運用を保証する値ではありません。');
 }
}));
X.registerWidget('observer-mailboxes',(root,a,c)=>E.mount(root,c,{
 start:E.observerStart,reduce:E.observer,
 instruction:'通知を一度送り、Bを解除してから別の通知を送ってください。発行者の処理を変えずに届く先が変わり、Bが前に受け取った通知は残ります。',
 action:(code,fields)=>{const [kind,id]=code.split(':');return kind==='subscribe'?{kind,id}:{kind:'emit',value:fields.get('event')};},
 render:(s,{field})=>box('発行者：登録先へ通知する',`<form class="eg-form">${field('event','今回の通知','更新しました',{type:'text'})}${b('通知を発行','emit')}</form>`)+`<div class="eg-two">${['A','B'].map(id=>box('受信オブジェクト '+id,b(s.subscribed[id]?'通知先から解除する':'通知先へ登録する','subscribe:'+id,`aria-pressed="${s.subscribed[id]}"`)+p(s.subscribed[id]?'現在は登録されています。':'現在は解除されています。')+table(['通知番号','受信した内容'],s.inboxes[id].map(r=>[r.id,r.event])))).join('')}</div>`+p('これは通知を同期して送る小例です。登録し直しただけでは、解除中の通知や過去の通知を再送しません。受信履歴はこの実験だけの一時状態です。')
}));
X.registerWidget('order-state-desk',(root,a,c)=>E.mount(root,c,{
 start:E.orderStart,reduce:E.order,
 instruction:'作成直後に送信を試してください。拒否されたら承認してから送ります。どの操作もいつでも使えるのではなく、現在の状態が前提になります。',
 action:kind=>({kind}),
 render:s=>box('注文一件の現在の状態',`<p class="eg-value">${h(s.state)}</p><div class="ex-actions">${b('承認する','approve')}${b('送信する','send')}${b('取り消す','cancel')}</div>`)+box('許す遷移と、実際に通った遷移',p('created → approve → approved → send → sent。created / approved からcancelledへ進めます。')+table(['操作前','操作','操作後'],s.history.map(r=>[r.before,r.action,r.after])))+p('拒否された操作は状態を変更しません。実際の注文サービスの仕様ではなく、この図で明示した有限状態機械です。')
}));
X.registerWidget('test-author-desk',(root,a,c)=>E.mount(root,c,{
 start:E.testStart,reduce:E.testing,
 instruction:'仕様は「0未満なら0、10を超えたら10、他は入力のまま」です。入力10・期待値10のケースを追加して実行し、失敗したケースの実行を見てコードを直してください。',
 action:(code,fields)=>{const [kind,v]=code.split(':');return kind==='code'?{kind,value:fields.get('program')}:kind==='add'?{kind,x:fields.get('input'),expected:fields.get('expected')}:kind==='select'?{kind,index:+v}:kind==='step'?{kind,delta:+v}:{kind};},
 render:(s,{field})=>{
  const v=E.testView(s),trace=v.frame;
  return `<div class="eg-two">${box('実装と別に、ケースを作る',`<form class="eg-form">${field('input','試す入力',10,{min:-50,max:50})}${field('expected','あなたが考えた期待値',10,{min:-50,max:50})}${b('ケースを追加','add')}</form>`+table(['入力','自分の期待値'],s.cases.map(r=>[r.x,r.expected]))+b('現在の版で全ケースを実行','run'))}${box('限られた教材言語を編集する',`<form class="eg-form">${field('program','プログラム',s.program,{type:'textarea',maxLength:2400})}${b('コードを適用して結果を無効化','code')}</form>`+p('現在の版 '+s.revision+'。fn、if、return、input、printを解釈する小言語です。ブラウザのJavaScriptを実行していません。'))}</div>`+
   (s.results?box('期待値・仕様・実装を混ぜずに比較',raw(['ケース','自分の期待','独立した仕様','実装の最後の出力','自分の期待に一致','仕様に一致'],s.results.map((r,i)=>[b('入力 '+r.x,'select:'+i,`aria-pressed="${s.selected===i}"`),h(r.expected),h(r.spec),h(r.error||(r.actual??'出力なし')),r.pass?'一致':'不一致',r.correct?'一致':'不一致'])))+p(s.results.some(r=>!r.oracle)?'期待値そのものが仕様と異なるケースがあります。緑のテストだけでは十分ではありません。':'今回の期待値は、この仕様から計算した値と一致しています。'):p('ケースかコードを変えたため、まだ現在の結果はありません。'))+
   (trace?box('選んだ失敗例を、実際に実行した順で読む',`<div class="ex-actions">${b('前の文へ','step:-1')}${b('次の文へ','step:1')}</div><p>${h(trace.title)}（${s.step+1}/${v.trace.frames.length}）</p><pre class="eg-code">${s.program.split('\n').map((line,i)=>`<span${i===trace.visual?.line?' class="running"':''}><em>${i+1}</em>${h(line)}</span>`).join('')}</pre>`+p(trace.explain)+table(['現在の変数','値'],Object.entries(trace.visual?.values||{}))+p('その時点の出力：'+(trace.visual?.output||[]).join(', '))):'')+
   p('有限の入力での観察です。全行を訪問しても、全入力の正しさを証明したことにはなりません。実装から期待値をコピーせず、仕様を読みます。');
 }
}));
X.registerWidget('merge-choice-desk',(root,a,c)=>E.mount(root,c,{
 start:E.mergeStart,reduce:E.merge,
 instruction:'共通の元と左右を比較し、競合した色の行だけを選んでください。右だけが変更したsize=20は、色の判断とは独立して残します。',
 action:(code,fields)=>{const [kind,value]=code.split(':');return kind==='example'?{kind,value}:{kind:'resolve',side:value,value:value==='custom'?fields.get('color'):''};},
 render:(s,{field})=>{const v=E.mergeView(s);return `<div class="ex-actions">${b('同じ行が競合する例','example:conflict')}${b('別の行だけを変えた例','example:independent')}</div>`+box('同じ元から、何を変えたか',table(['行','共通の元','左','右'],s.base.map((x,i)=>[i+1,x,s.left[i],s.right[i]])))+(v.conflicts.length?box('色の行を判断する',`<div class="ex-actions">${b('左のgreenを使う','resolve:left')}${b('右のredを使う','resolve:right')}</div><form class="eg-form">${field('color','別の色へ統合する','purple',{type:'text'})}${b('自分の案を使う','resolve:custom')}</form>`):p('別々の行の変更なので、行単位では自動で統合できます。'))+box('統合案を残して読む','<pre>'+h(v.result.join('\n'))+'</pre>')+p('この例は3行の設定です。行の競合がなくなっても、組み合わせた動作が利用者の仕様に合うかは別に検証します。実Gitを書き換えてはいません。');}
}));
X.registerWidget('revision-gate',(root,a,c)=>E.mount(root,c,{
 start:E.ciStart,reduce:E.ci,
 instruction:'テストを開始し、完了する前に編集してください。古い版のテストを成功させても、現在の版を配布できないことを、版番号から確認します。',
 action:code=>{const [kind,id,result]=code.split(':');return kind==='complete'?{kind,id:+id,pass:result==='pass'}:{kind};},
 render:s=>`<p class="eg-value">現在のコード：r${s.revision}</p><div class="ex-actions">${b('コードを編集して版を進める','edit')}${b('この版のテストを開始','start')}${b('この版をレビュー','review')}${b('この版をビルド','build')}${b('現在の版を仮想配布','publish')}</div>`+box('実行中：開始時の版が検査対象',raw(['ジョブ','対象','完了させる'],s.queue.map(q=>[h(q.id),'r'+q.revision,b('成功で完了','complete:'+q.id+':pass')+b('失敗で完了','complete:'+q.id+':fail')])))+`<div class="eg-two">${box('完了した結果は元の版を保持',table(['ジョブ','対象revision','結果'],s.results.map(r=>[r.id,r.revision,r.pass?'成功':'失敗'])))}${box('比較する版番号',table(['種類','版'],[['レビュー',s.reviewed??'なし'],['生成物',s.built??'なし'],['仮想配布',s.published??'なし']]))}</div>`+p('このモデルでは同じ版の最新開始ジョブの結果を使います。古いジョブの遅い成功で、新しい失敗や実行中の結果を上書きしません。実際のCIサービスへの命令は送りません。')
}));
X.registerWidget('study-order',(root,a,c)=>E.mount(root,c,{
 start:E.studyStart,reduce:E.study,
 instruction:'全員A→Bの結果を読みます。半数をB→Aへ変えたとき、同じ人の基準時間と、見かけの平均差のどちらが変わるでしょうか。',
 action:(code,fields)=>{const [kind,i]=code.split(':');return kind==='order'?{kind,index:+i}:kind==='parameters'?{kind,effect:fields.get('effect'),practice:fields.get('practice')}:{kind};},
 render:(s,{field})=>{const v=E.studyView(s);return box('参加者ごとの実施順を自分で決める',raw(['仮想参加者','基準時間','順序','Aの時間','Bの時間','B−A'],v.rows.map((r,i)=>[h(r.id),h(r.base),b(r.order==='AB'?'A → B':'B → A','order:'+i),h(r.a),h(r.b),h(r.diff)]))+b('AB/BAを4人ずつにする','balance'))+`<div class="eg-two">${box('見えている差と、設定した差',p('観測平均B−A：'+f(v.difference)+'秒')+p('設定したB自体の差：'+s.effect+'秒')+p(v.balanced?'この単純な加法モデルでは、平均で順序の寄与が相殺されます。':'同じ順序に偏ると、2回目の慣れが見かけの差に混ざります。'))}${box('架空データの生成規則',`<form class="eg-form">${field('effect','B自体の時間差',s.effect,{min:-10,max:10,step:'any'})}${field('practice','2回目に短縮する秒数',s.practice,{min:0,max:10,step:'any'})}${b('生成条件を適用','parameters')}</form>`)}</div>`+p('この8人は架空の計算です。実調査では持越し効果・疲労・割当や欠測などもあり、半数ずつにすれば必ずすべての交絡が消えるわけではありません。');}
}));
X.registerWidget('stakeholder-options',(root,a,c)=>E.mount(root,c,{
 start:E.policyStart,reduce:E.policy,
 instruction:'同じ機能を提供する三つの案を選び、利用者・運用担当・連携先の列を読みます。利点と不利益を一つの合計点にして消してしまわないでください。',
 action:code=>{const [kind,value]=code.split(':');return {kind,value};},
 render:s=>box('架空の案を比較する',`<div class="ex-actions">${[['minimal','必要な機能と集計だけ'],['detailed','細かい操作履歴も保存'],['external','詳細な履歴を第三者にも共有']].map(([id,label])=>b(label,'policy:'+id,`aria-pressed="${s.choice===id}"`)).join('')}</div>`)+`<div class="eg-three">${E.policyView(s).map(r=>box(r.name,p('想定する利点：'+r.benefit)+p('不利益・確認すべき点：'+r.risk))).join('')}</div>`+p('実施前には目的、必要性、説明、本人の選択、保持期間、管理権限、変更や撤回の方法を検討します。ここに列挙した項目だけで倫理や法令への適合を認定するものではありません。')
}));
X.registerWidget('resampling-objects',(root,a,c)=>E.mount(root,c,{
 start:E.resampleStart,reduce:E.resample,
 instruction:'左では同じ人のA/Bラベルだけを交換します。右では元の人の組を重複して選び、6件の新しい標本を作ります。何を固定し何を入れ替えたかを比べてください。',
 action:code=>{const [kind,i]=code.split(':');return {kind,...(i!==undefined?{index:+i}:{})};},
 render:s=>{const v=E.resampleView(s);return box('最初の6組は両方で共通',table(['組','A','B','B−A'],s.a.map((x,i)=>[i+1,x,s.b[i],v.difference[i]])))+`<div class="eg-two">${box('対応ありの置換：人の中でラベル交換',raw(['組','交換','今回の差'],v.permuted.map((d,i)=>[h(i+1),b(s.swaps[i]?'B/Aへ交換済み':'A/Bのまま','swap:'+i,`aria-pressed="${s.swaps[i]}"`),h(d)]))+p('元の平均差 '+f(v.observed)+' → 今回 '+f(v.permutedMean))+p('交換可能性を仮定した全64通りの両側p値：'+f(v.pvalue)+ '。これは任意の調査へ自動適用できる保証ではありません。'))}${box('bootstrap：同じ組を再び選んでもよい',`<div class="ex-actions">${s.a.map((_,i)=>b('元の組'+(i+1)+'を選ぶ','draw:'+i)).join('')}</div>`+table(['新しい行','元の組','差'],v.drawn.map((r,i)=>[i+1,r.source+1,r.difference]))+p(v.bootstrapMean===null?'まだ選んでいません。':'選んだ'+v.drawn.length+'行の平均差：'+f(v.bootstrapMean))+b('再標本だけを空にする','clear'))}</div>`+p('手で選んだ一つの再標本から信頼区間を計算したとは言いません。次の章で、仮定を確認して乱数による多数回の再標本化を扱います。元データは変更しません。');}
}));
X.registerWidget('claim-evidence',(root,a,c)=>E.mount(root,c,{
 start:E.evidenceStart,reduce:E.evidence,
 instruction:'主張を選び、それを支えると思う資料を選んでください。今回の平均、すべての場合、原因の説明では、必要な根拠が異なります。',
 action:code=>{const [kind,value]=code.split(':');return {kind,value};},
 render:s=>{const v=E.evidenceView(s),sentences={methods:'同じ4人がAの後にBを操作し、時間を記録した。',results:'この4組の平均差B−Aは−1.75だった。',discussion:'差にはUIの違いだけでなく、慣れや実施順が影響した可能性がある。',limitations:'4人・同じ順序の観測から、全員への一般化や因果を確定できない。'};return box('どの強さの主張をしたいか',`<div class="ex-actions">${[['mean','今回の平均ではBが速かった'],['always','Bは誰にとっても常に速い'],['causal','Bという方法が速さの原因だ']].map(([id,label])=>b(label,'claim:'+id,`aria-pressed="${s.claim===id}"`)).join('')}</div>`)+`<div class="eg-three">${E.evidenceCards.map(e=>box(e.id+' / '+e.name,p(e.text)+b('この資料を根拠に選ぶ','evidence:'+e.id,`aria-pressed="${s.evidence===e.id}"`))).join('')}</div>`+box('資料の存在より、主張との対応を読む',p(v.verdict)+p(v.detail))+box('同じ実験の文章にも役割がある',`<div class="ex-actions">${[['methods','方法'],['results','結果'],['discussion','考察'],['limitations','限界']].map(([id,label])=>b(label,'section:'+id,`aria-pressed="${s.section===id}"`)).join('')}</div>`+p(sentences[s.section]))+p('あらかじめ定義した事例の説明です。実在の論文の内容や、自由記述の論証をAIが判定したものではありません。');}
}));
X.registerWidget('request-pipeline',(root,a,c)=>E.mount(root,c,{
 start:E.apiStart,reduce:E.api,
 instruction:'利用者1として/items/1を読み、次に/items/2を要求してください。その後PATCHで自分の資料を変え、更新後の障害を挿入して前後の表を比較します。',
 action:(code,fields)=>{const [kind,i]=code.split(':');return kind==='stage'?{kind,index:+i}:{kind:'request',...Object.fromEntries(['method','path','body','role','actor','contentType','failure'].map(k=>[k,fields.get(k)]))};},
 render:(s,{field})=>`<div class="eg-two">${box('ブラウザ側：一つの要求を作る',`<form class="eg-form">${field('method','メソッド','GET',{choices:['GET','POST','PATCH','DELETE','PUT']})}${field('path','パス','/items/1',{type:'text'})}${field('body','JSON本文','{"name":"更新した資料"}',{type:'textarea',maxLength:2000})}${field('role','仮想の主体','user',{choices:[['guest','未認証'],['user','一般利用者'],['admin','管理者']]})}${field('actor','利用者ID',1,{min:1,max:3})}${field('contentType','Content-Type','application/json',{choices:['application/json','text/plain']})}${field('failure','DB処理の失敗','none',{choices:[['none','なし'],['before','書込み前'],['after','作業コピーの変更後']]})}${b('この要求を送る','request')}</form>`)}${box('サーバー側：実際に通った処理',s.last?`<div class="ex-actions eg-stages">${s.last.trace.map((t,i)=>b(t[0],'stage:'+i,`aria-pressed="${s.selected===i}"`)).join('')}</div>`+p(s.last.trace[s.selected]?.[1]||'前提確認で停止')+`<p class="eg-value">応答 ${s.last.status}</p><pre>${h(JSON.stringify({headers:s.last.headers,body:s.last.body},null,2))}</pre>`:p('要求を送ると、通った段階だけがここに現れます。'))}</div>`+`<div class="eg-two">${box('その要求を受ける前',table(['id','所有者','名前'],(s.last?.before||s.rows).map(r=>[r.id,r.owner,r.name])))}${box('今の公開データ',table(['id','所有者','名前'],s.rows.map(r=>[r.id,r.owner,r.name])))}</div>`+p('要求・認証条件・DBはすべてこの枠内の仮想物です。複数要求の間ではデータを保持しますが、実験を最初からにすると初期化します。DB更新後の失敗は作業コピーを捨ててロールバックします。')
}));
})();
