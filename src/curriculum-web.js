/* GAP-154..155. Real local DOM demonstrations and a deterministic virtual HTTP service. */
(() => {
'use strict';
const L=CSL,K=L.curriculum,{define:D,f:F,result:out,r,s,t,codeInput:code}=K;
D(154,{
 title:'DOM・CSS・レイアウト・イベント・フォームの内部',question:'同じ要素でも、CSSやイベントの段階で何が変わる？',
 scope:'枠内の本物のDOM要素でblock/flex/gridの配置と矩形を測定。入れ子のcapture/target/bubbleとフォーム検証を試します。ブラウザ全体の描画器を再実装する教材ではありません。',
 controls:[s('mode','実験','layout',['layout','events','form']),s('layout','配置方式','flex',['block','flex','grid']),r('width','実験枠の幅',320,200,600,20,'px'),r('gap','要素間の余白',10,0,30,2,'px'),r('items','子要素の数',4,2,6),K.b('borderBox','border-boxで幅を数える',true),s('stopAt','伝播を止める場所','none',['none','outer-capture','target']),K.b('required','入力を必須にする',true),t('value','フォームの初期入力','')],
 alt:['同じ要素をgridで配置する',{layout:'grid'}],
 intro:['HTMLは意味と構造を持つ木ですが、その木がどこへ表示されるかはCSSや画面の条件に依存します。イベントも木の中を決められた段階で伝わります。','DOM、スタイルの計算、レイアウト、描画を区別します。クリックがどこで発生したかと、どの祖先の処理が実行されるかも別の情報です。','同じ4要素をflexで配置します。画素単位の実測値を枠の下で読み、CSSを変えたときの要素の位置と幅を比較してください。','イベントの例では内側のボタンを押します。伝播を止める場所だけを変えて、呼ばれた処理の順を確認します。フォームでは空欄と入力済みを比べます。','実験枠の外のページ構造や入力設定は変更しません。フォームは外部へ送信せず、出力値もこの枠を離れると破棄します。ブラウザごとの画素の丸めは実測値として扱います。'],
 topics:[['DOM','要素と親子関係を持つ木です。'],['CSSとレイアウト','スタイルの規則と配置された矩形を区別します。'],['box model','contentとpaddingとborderが幅へどう含まれるかを見ます。'],['イベント伝播','capture・target・bubbleを順に追います。'],['フォーム','制約の検証と送信の動作を分けます。']],
 quiz:['stopPropagationとpreventDefaultは？','イベントの伝播を止めることと既定動作を止めることで役割が異なる','完全に同じ動作','どちらもDOMを削除する','この例ではフォームの外部送信をpreventDefaultで止め、伝播は別の条件で操作します。'],sources:['whatwg','fetch-standard']
},p=>{
 const kind=p.mode==='layout'?'browser-layout':p.mode==='events'?'browser-events':'browser-form';
 return out([F('枠内の実際の要素で確かめる',p.mode==='layout'?'配置はブラウザが計算しています。画面幅と実験枠の幅が違う場合は、この図の中だけスクロールできます。':p.mode==='events'?'内側のボタンを押すと、実際に呼ばれたイベント処理を順に表示します。':'空欄と入力済みでボタンを押してください。外部への送信は行いません。',K.demo(kind,{...p})),F('担当する段階を区別する','見た目、構造、実際のイベント処理を別々に説明できるか確認します。',K.table(['段階','この例で確認すること'],[['DOM','親子関係と要素の種類'],['Style','display、gap、box-sizingなど'],['Layout','getBoundingClientRectで読める位置と大きさ'],['Event','伝わった順と止めた場所'],['Form','validityと送信の取消し']]))],{'実験':p.mode,'配置方式':p.layout,'box-sizing':p.borderBox?'border-box':'content-box','伝播停止':p.stopAt});
});
function virtualRequest(state,request,configuration){
 const rows=[],before=JSON.parse(JSON.stringify(state)),reply=(status,body,headers={})=>({status,body,headers:{'content-type':'application/json; charset=utf-8',...headers},trace:rows,before,after:JSON.parse(JSON.stringify(state))});
 const method=String(request.method||'GET').toUpperCase(),rawPath=String(request.path||'/');if(!rawPath.startsWith('/'))return reply(400,{error:'Path must begin with /'});
 const url=new URL(rawPath,'https://example.invalid'),path=url.pathname;rows.push(['ルーティング',method+' '+path]);
 if(path==='/health')return method==='GET'?reply(200,{ok:true}):reply(405,{error:'Method not allowed'},{allow:'GET'});
 const match=path.match(/^\/items(?:\/(\d+))?$/);if(!match)return reply(404,{error:'Route not found'});
 const id=match[1]?Number(match[1]):null,allowed=id===null?['GET','POST']:['GET','PATCH','DELETE'];if(!allowed.includes(method))return reply(405,{error:'Method not allowed'},{allow:allowed.join(', ')});
 rows.push(['認証','設定した仮想の主体を確認']);if(configuration.role==='guest')return reply(401,{error:'Authentication required'});const item=id===null?null:state.find(row=>row.id===id);if(id!==null&&!item)return reply(404,{error:'Item not found'});
 rows.push(['認可',configuration.role==='admin'?'管理者':`利用者${configuration.actor}`]);if(item&&configuration.role!=='admin'&&item.owner!==configuration.actor)return reply(403,{error:'Access denied'});if(method==='DELETE'&&configuration.role!=='admin')return reply(403,{error:'Admin role required'});
 if(method==='GET'){const body=id===null?state.filter(row=>configuration.role==='admin'||row.owner===configuration.actor):item;rows.push(['DB読取り',id===null?'主体が見られる行だけを選択':'指定行を読取り']);return reply(200,JSON.parse(JSON.stringify(body)));}
 let body={};if(method==='POST'||method==='PATCH'){rows.push(['入力の検証','Content-TypeとJSONと値の制約を別々に検査']);if(configuration.contentType!=='application/json')return reply(415,{error:'JSON required'});try{body=typeof request.body==='string'?JSON.parse(request.body):request.body;}catch{return reply(400,{error:'Malformed JSON'});}if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.name!=='string'||body.name.trim().length<1||body.name.trim().length>40)return reply(422,{error:'name must contain 1 to 40 characters'});}
 const pending=JSON.parse(JSON.stringify(state));let changed;
 try{
  if(configuration.failure==='before')throw Error('injected storage error');
  if(method==='POST'){changed={id:Math.max(0,...pending.map(row=>row.id))+1,name:body.name.trim(),owner:configuration.actor};pending.push(changed);}
  else if(method==='PATCH'){changed=pending.find(row=>row.id===id);changed.name=body.name.trim();}
  else pending.splice(pending.findIndex(row=>row.id===id),1);
  rows.push(['トランザクション内の変更',JSON.stringify(pending)]);
  if(configuration.failure==='after')throw Error('injected storage error');
  state.splice(0,state.length,...pending);rows.push(['コミット','変更を公開状態へ反映']);
 }catch{rows.push(['ロールバック','公開状態は変更しない。内部例外の詳細は応答しない']);return reply(500,{error:'Internal server error'});}
 return method==='POST'?reply(201,changed,{location:'/items/'+changed.id}):method==='PATCH'?reply(200,changed):reply(204,null);
}
K.virtualRequest=virtualRequest;
D(155,{
 title:'サーバー側のルーティング・API・検証・認可・DB',question:'要求が届いてから、どの条件でデータを返し、変更を確定する？',
 scope:'仮想のHTTP要求を実際のroute/validator/権限/メモリDB関数へ通すモデル。GET/POST/PATCH/DELETE、4xx/5xx、独立した更新コピーによるrollbackを再現。外部APIや実DBへ接続しません。',
 controls:[s('method','要求メソッド','GET',['GET','POST','PATCH','DELETE','PUT']),t('path','要求パス','/items/1'),code('body','JSONボディ','{"name":"更新した教材データ"}'),s('role','仮想の利用者','user',['guest','user','admin']),r('actor','利用者ID',1,1,3),s('contentType','Content-Type','application/json',['application/json','text/plain']),s('failure','ストレージの失敗を挿入','none',['none','before','after']),K.b('batch','複数の要求を順に送る',false),code('requests','要求の配列JSON','[{"method":"POST","path":"/items","body":{"name":"new"}},{"method":"GET","path":"/items"}]')],
 alt:['別の利用者のデータを要求する',{path:'/items/2'}],
 intro:['サーバーへ届いた要求が、そのままDBの変更になるわけではありません。宛先の処理を選び、主体と権限を確認し、入力を検証してから実行します。','ルーティング、認証、認可、入力検証、データ操作、応答を分けます。エラーの段階によって状態が変わるか、どんな応答を返すかも違います。','利用者1として/items/1を読みます。次に/items/2へ変え、行が存在することと読む権限があることを区別してください。','POSTやPATCHで値を変更し、JSONや名前を不正にします。更新後の失敗も挿入し、ロールバックで元の公開データが残るか確認できます。','使うのはこのモデル内の架空データです。実行ごとに初期状態から始め、複数要求モードの間だけ変更を共有します。実フレームワークや実DBの全機能・永続性の保証はありません。'],
 topics:[['ルーティング','メソッドとパスから処理を選びます。'],['認証と認可','誰かと何を許すかを分けます。'],['入力検証','構文、型、値の制約を確認します。'],['データ連携と更新','公開状態と更新中の状態を分けます。'],['HTTP応答とエラー','失敗段階に応じた応答を返し、内部情報を出しすぎないようにします。']],
 quiz:['データが存在すれば誰に返してもよい？','存在の確認とは別に、要求した主体の権限を確認する','存在すれば認可は不要','入力がJSONなら必ず許可する','ルーティング、入力の妥当性、認証、認可は別の条件です。'],
 tests:[[{},{'最終ステータス':200,'DB行数':2}],[{path:'/items/2'},{'最終ステータス':403,'DB行数':2}],[{method:'POST',path:'/items',body:'{"name":"new"}'},{'最終ステータス':201,'DB行数':3}],[{method:'PATCH',failure:'after'},{'最終ステータス':500,'DB行数':2}]],sources:['rfc9110','whatwg','owasp-asvs']
},p=>{
 const state=[{id:1,name:'利用者1の資料',owner:1},{id:2,name:'利用者2の資料',owner:2}],initial=JSON.parse(JSON.stringify(state));let requests=[{method:p.method,path:p.path,body:p.body}];if(p.batch){try{requests=JSON.parse(p.requests);}catch{throw Error('要求はJSON配列で入力してください。');}if(!Array.isArray(requests)||!requests.length||requests.length>8||requests.some(x=>!x||typeof x!=='object'))throw Error('要求を1〜8個のオブジェクトで指定してください。');}
 const frames=[F('変更前の公開状態を見る','各行はownerを持ちます。要求を送る利用者と、行の所有者を別々に確認します。',K.table(['id','name','owner'],state.map(row=>[row.id,row.name,row.owner])))];let last,errors=0;
 for(let i=0;i<requests.length;i++){last=virtualRequest(state,requests[i],p);if(last.status>=400)errors++;frames.push(F(`要求${i+1}の処理をたどる`,'各段階を通過した場合だけ、後の処理を行っています。',K.table(['段階','処理'],last.trace)));frames.push(F(`応答 ${last.status}`,'このJSONは仮想サービスが返した内容です。入力された文字列をHTMLとして実行しません。',K.code(JSON.stringify({status:last.status,headers:last.headers,body:last.body},null,2).split('\n'),0,{'要求番号':i+1})));}
 frames.push(F('公開状態が変わったか比較する','失敗した更新は作業用コピーを捨て、公開状態を変更しません。実DBではログや永続化の仕組みも必要です。',K.table(['id','name','owner'],state.map(row=>[row.id,row.name,row.owner]))));
 return out(frames,{'最終ステータス':last.status,'DB行数':state.length,'失敗応答数':errors,'DBが初期状態から変化':JSON.stringify(initial)!==JSON.stringify(state),'要求数':requests.length});
});
})();
