(() => {
'use strict';
const L=CSL,X=L.experiences,N=X.net,h=L.h;
if(typeof document==='undefined')return;
const {b,box,table,text}=N.ui;
X.registerWidget('signal-decision',(root,a,c)=>{
 const ui=N.workbench(root,c,{
  start:N.signalStart,reduce:(s,a)=>a.kind==='mode'?N.signalStart(a.mode):N.signal(s,a),
  instruction:'送信するbitを選び、図の中をクリックして受信点だけを動かしてください。図にフォーカスして矢印キーでも動かせます。元の送信bitと受信側の判定を別に見ます。',
  action:(code,f)=>{const [kind,value]=code.split(':');return kind==='mode'?{kind,mode:value,fresh:true}:kind==='send'?{kind,bits:value,fresh:true}:{kind:'move',z:[f.get('I'),f.get('Q')],fresh:true};},
  render:(s,{field})=>{
   const v=N.signalView(s),points=N.constellation(s.mode),bounds=s.mode==='16QAM'?[-2/Math.sqrt(10),0,2/Math.sqrt(10)]:[0];
   const plane=`<svg class="ex-net-signal" data-net-signal tabindex="0" role="group" aria-label="受信点の平面。クリックまたは矢印キーで移動。IとQは数値欄でも指定できます" viewBox="0 0 420 420"><title>丸は送信候補、十字は受信した点です</title><rect x="30" y="30" width="360" height="360" class="net-plot-bg"/>${bounds.map(x=>`<line x1="${210+90*x}" y1="30" x2="${210+90*x}" y2="390" class="net-boundary"/>${s.mode==='BPSK'?'':`<line x1="30" y1="${210-90*x}" x2="390" y2="${210-90*x}" class="net-boundary"/>`}`).join('')}<text x="392" y="207">I</text><text x="215" y="22">Q</text>${points.map(p=>`<circle cx="${210+90*p.z[0]}" cy="${210-90*p.z[1]}" r="${p.bits===s.sent?8:5}" class="net-constellation ${p.bits===s.sent?'sent':''}"/><text x="${220+90*p.z[0]}" y="${202-90*p.z[1]}" class="net-point-label">${p.bits}</text>`).join('')}<path d="M${202+90*s.received[0]},${210-90*s.received[1]} h16 M${210+90*s.received[0]},${202-90*s.received[1]} v16" class="net-received"/></svg>`;
   return `<div class="ex-actions">${['BPSK','QPSK','16QAM'].map(mode=>b(mode+'で最初から','mode:'+mode,`aria-pressed="${s.mode===mode}"`)).join('')}</div><div class="ex-net-two">${box('候補点・判定境界・受信点',plane)}${box('送ったものと、受信側が選ぶもの',text('送信bit：'+s.sent)+`<div class="ex-actions">${points.map(p=>b(p.bits+'を送信','send:'+p.bits,`aria-pressed="${s.sent===p.bits}"`)).join('')}</div>`+`<p class="ex-net-value" data-net-decision>${v.nearest.length>1?'同じ距離の候補が複数あります':h(v.nearest[0].bits)}</p>`+text(v.nearest.length>1?'境界上の同距離です。勝手に一方が正解と決めません。':v.error?'受信側は別のbitを選びました。教材側は送信bitを知るため比較できます。':'この受信点からは送ったbitと同じ候補を選びます。')+`<form class="ex-net-form">${field('I','受信点 I',s.received[0],{min:-2,max:2,step:'any'})}${field('Q','受信点 Q',s.received[1],{min:-2,max:2,step:'any'})}${b('数値で受信点を動かす','move')}</form>`)}</div>${box('各候補との距離の二乗',table(['候補bit','I','Q','距離²'],v.distances.map(p=>[p.bits,X.format(p.z[0]),X.format(p.z[1]),X.format(p.d2)])))}${text('平均symbol energyを1にそろえた配置です。手で動かした一例から理論BERや全方式の性能順位を決めません。OFDMの合成・分離は次の章で扱います。')}`;
  }
 });
 ui.scope.on(root,'pointerdown',e=>{
  const svg=e.target.closest('[data-net-signal]');if(!svg||e.button!==0)return;
  const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const matrix=svg.getScreenCTM();if(!matrix)return;const local=p.matrixTransform(matrix.inverse());
  if(local.x<30||local.x>390||local.y<30||local.y>390)return;
  svg.focus({preventScroll:true});ui.apply({kind:'move',z:[(local.x-210)/90,(210-local.y)/90]},{fresh:true});root.querySelector('[data-net-signal]')?.focus({preventScroll:true});
 });
 ui.scope.on(root,'keydown',e=>{
  if(!e.target.matches('[data-net-signal]')||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();e.stopImmediatePropagation();const z=ui.state().received.slice(),axis=e.key==='ArrowLeft'||e.key==='ArrowRight'?0:1,delta=e.key==='ArrowLeft'||e.key==='ArrowDown'?-.05:.05;
  z[axis]=Math.max(-2,Math.min(2,z[axis]+delta));ui.apply({kind:'move',z},{fresh:true});root.querySelector('[data-net-signal]')?.focus({preventScroll:true});
 });
});
X.registerWidget('http-resource-desk',(root,a,c)=>N.workbench(root,c,{
 start:N.httpStart,reduce:N.http,
 instruction:'POST /itemsを2回送り、資源の増え方を見ます。次にPUT /items/1を同じ内容で2回送り、最後の状態と応答を比べてください。',
 action:(_,f)=>({kind:'request',method:f.get('method'),path:f.get('path'),text:f.get('text'),ifNoneMatch:f.get('condition')}),
 render:(s,{field})=>`<div class="ex-net-two">${box('要求を作る',`<form class="ex-net-form">${field('method','メソッド','GET',{choices:['GET','HEAD','POST','PUT','DELETE']})}${field('path','対象パス','/items/1',{type:'text'})}${field('text','本文のtext','hello',{type:'text'})}${field('condition','If-None-Match（空欄なら付けない）','',{type:'text'})}${b('この要求を送る','request')}</form>`+text('POSTの新規作成は/itemsへ。PUTは/items/番号の表現を置き換えます。ETagは表の値をそのまま条件欄へ写してください。'))}${box('応答：status・header・bodyを分ける',s.last?`<p class="ex-net-value">${s.last.status}</p>${text(s.last.method+' '+s.last.path)}${table(['ヘッダー','値'],Object.entries(s.last.headers))}<pre class="ex-net-output">${h(s.last.body===null?'本文なし':JSON.stringify(s.last.body,null,2))}</pre>`:text('まだ要求を送っていません。'))}</div>${box('サーバーに残っている資源',table(['パス','text','ETag'],Object.entries(s.resources).map(([path,r])=>[path,r.text,'"v'+r.version+'"'])))}${text('これは仮想資源です。外部HTTP要求は送りません。冪等性は、同じ要求の反復が意図するサーバー状態についての性質であり、statusが毎回同じという意味ではありません。')}`
}));
X.registerWidget('stream-hol',(root,a,c)=>N.workbench(root,c,{
 start:()=>({h2:N.streamStart('h2'),h3:N.streamStart('h3'),log:[]}),
 reduce:(s,a)=>{const next={h2:N.stream(s.h2,a),h3:N.stream(s.h3,a),log:s.log.slice()};return N.note(next,'同じ転送単位'+a.id+'を、両方式の受信側へ届けました。');},
 instruction:'2番目の転送単位を残し、1・3・4・5・6を届けてください。他streamまで待つ範囲と、同じstream内で待つ範囲を比較します。',
 action:code=>({kind:'deliver',id:Number(code.split(':')[1])}),
 render:s=>{
  const pane=(key,title)=>box(title,`<div class="ex-net-streams">${['A','B','C'].map(stream=>`<section><h5>stream ${stream}</h5>${N.streamView(s[key]).filter(u=>u.stream===stream).map(u=>`<div class="ex-net-packet ${u.delivered?'arrived':''}"><strong>転送${u.id} / offset ${u.offset}</strong>${text(u.delivered?'順番がそろいアプリへ渡せる':u.received?'受信済みだが順序待ち':'まだ受信していない')}</div>`).join('')}</section>`).join('')}</div>`);
  return `<div class="ex-actions">${N.streamUnits().map(u=>b('転送'+u.id+'（'+u.stream+u.offset+'）を届ける','deliver:'+u.id)).join('')}</div><div class="ex-net-two">${pane('h2','HTTP/2 over TCP：接続全体のbyte順')}${pane('h3','HTTP/3 over QUIC：streamごとの順')}</div>${text('6個の論理的な転送単位に簡略化しています。実際のpacket/frame境界、QPACK、輻輳やフロー制御は含めません。HTTP/3なら必ず速いという実測ではありません。')}`;
 }
}));
X.registerWidget('replay-window',(root,a,c)=>N.workbench(root,c,{
 start:N.replayStart,reduce:N.replay,
 instruction:'1、2、2、4、3の順で受理を試します。次に認証を失敗にしてSEQ99を送っても、正規のwindowが動かないことを確認してください。',
 action:(_,f)=>({kind:'receive',sequence:f.get('sequence'),authenticated:f.get('authenticated')}),
 render:(s,{field})=>`${box('認証済みで受理した番号の範囲',text('最高SEQ = '+s.high+'、window幅 = '+s.width)+`<div class="ex-net-fragments">${Array.from({length:s.width},(_,i)=>s.high-s.width+1+i).map(seq=>`<div class="ex-net-fragment ${s.seen.includes(seq)?'arrived':''}"><strong>${seq>0?seq:'—'}</strong><small>${seq<=0?'有効番号ではない':s.seen.includes(seq)?'受理済み':'未受信'}</small></div>`).join('')}</div>`)}<form class="ex-net-form">${field('sequence','今回のSEQ',1,{min:1,max:99})}${field('authenticated','認証検証に成功したという条件',true,{type:'checkbox'})}${b('この受信を判定する','receive')}</form>${box('判定の記録',table(['SEQ','認証','受理','理由','判定後の最高SEQ'],s.decisions.map(d=>[d.sequence,d.authenticated?'成功':'失敗',d.accepted?'受理':'拒否',d.reason,d.high])))}${text('この画面は認証の結果を条件として与え、windowの更新規則を調べます。暗号認証そのものを実行した結果ではありません。次の章では実際のWeb Crypto検証と組み合わせます。')}`
}));
})();
