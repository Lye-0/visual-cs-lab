/* Small shared lifecycle helper; the teaching objects/layouts are authored
 * separately below. Undo restores an experiment, not real network effects. */
(() => {
'use strict';
const L=CSL,X=L.experiences,N=X.net,h=L.h;
if(typeof document==='undefined')return;
const b=(label,action,attrs='')=>`<button type="button" class="ex-button" data-net-action="${h(action)}" ${attrs}>${h(label)}</button>`;
const box=(title,body)=>`<section class="ex-net-box"><h4>${h(title)}</h4>${body}</section>`;
const table=(head,rows)=>X.html.table(head,rows);
const text=t=>`<p>${h(t)}</p>`;
N.ui={b,box,table,text};
N.workbench=(root,current,config)=>{
 const scope=X.scope(root,current);let state=config.start(),history=[];
 root.classList.add('ex-net-workspace');
 root.innerHTML=`<p class="ex-operation-hint">${h(config.instruction)}</p><div class="ex-actions">${b('この実験を最初から','reset')}${b('一操作戻す','undo','disabled')}</div><div data-net-board></div><p data-net-status role="status" aria-live="polite"></p><details class="ex-net-history"><summary>操作と判断の記録</summary><ol data-net-log></ol></details>`;
 const board=root.querySelector('[data-net-board]'),status=root.querySelector('[data-net-status]');
 const field=(key,label,value,options={})=>{
  const id=scope.id+'-'+key,attr=`id="${id}" data-net-field="${key}"`,type=options.type||'number';let control;
  if(options.choices)control=`<select ${attr}>${options.choices.map(x=>{const v=Array.isArray(x)?x[0]:x,t=Array.isArray(x)?x[1]:x;return `<option value="${h(v)}"${String(v)===String(value)?' selected':''}>${h(t)}</option>`;}).join('')}</select>`;
  else if(type==='checkbox')control=`<input ${attr} type="checkbox"${value?' checked':''}>`;
  else if(type==='textarea')control=`<textarea ${attr} rows="${options.rows||4}" maxlength="${options.maxlength||8000}" spellcheck="false">${h(value)}</textarea>`;
  else control=`<input ${attr} type="${type}" value="${h(value)}"${type==='number'?` min="${options.min??0}" max="${options.max??120}" step="${options.step??1}" required`:` maxlength="${options.maxlength||120}" autocomplete="off"`}>`;
  return `<label class="ex-net-field" for="${id}"><span>${h(label)}</span>${control}</label>`;
 };
 const fields={get:key=>{const el=root.querySelector(`[data-net-field="${key}"]`);if(!el)throw Error('入力欄がありません: '+key);if(!el.checkValidity())throw Error('「'+el.closest('label').querySelector('span').textContent+'」の範囲を確認してください。');return el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;}};
 const inputs=()=>Object.fromEntries([...board.querySelectorAll('[data-net-field]')].map(el=>[el.dataset.netField,{value:el.value,checked:el.checked}]));
 function paint(preserve=true){
  if(!scope.alive())return;const values=preserve?inputs():{},active=document.activeElement,action=active?.dataset.netAction,key=active?.dataset.netField;
  board.innerHTML=config.render(state,{field});
  for(const el of board.querySelectorAll('[data-net-field]')){const old=values[el.dataset.netField];if(old){el.value=old.value;if(el.type==='checkbox')el.checked=old.checked;}}
  root.dataset.netState=JSON.stringify(state);root.querySelector('[data-net-action="undo"]').disabled=!history.length;
  root.querySelector('[data-net-log]').innerHTML=state.log.map(line=>'<li>'+h(line)+'</li>').join('');
  status.classList.remove('ex-error');status.textContent=state.log.at(-1)||'まず、上の説明にある操作を試してください。';
  const focus=[...root.querySelectorAll('[data-net-action],[data-net-field]')].find(el=>action&&el.dataset.netAction===action||key&&el.dataset.netField===key);
  if(focus&&!focus.disabled)focus.focus({preventScroll:true});current.completed.add(scope.id);
 }
 function apply(action,{fresh=false}={}){
  if(!scope.alive())return;
  try{const next=config.reduce(state,action);history.push(X.clone(state));if(history.length>64)history.shift();state=next;paint(!fresh);}catch(e){status.classList.add('ex-error');status.textContent=e.message;}
 }
 function activate(button){
  if(!button||button.disabled)return;const code=button.dataset.netAction;
  if(code==='reset'){state=config.start();history=[];paint(false);return;}
  if(code==='undo'){if(history.length){state=history.pop();paint(false);}return;}
  try{const action=config.action(code,fields,state);if(action)apply(action,{fresh:!!action.fresh});}catch(e){status.classList.add('ex-error');status.textContent=e.message;}
 }
 scope.on(root,'click',e=>{const button=e.target.closest('[data-net-action]');if(button&&root.contains(button))activate(button);});
 scope.on(root,'submit',e=>{e.preventDefault();activate(e.target.querySelector('[data-net-action]'));});
 const api={scope,board,state:()=>state,apply,paint};paint(false);return api;
};
X.registerWidget('bridge-lan',(root,a,c)=>N.workbench(root,c,{
 start:()=>N.bridgeStart(),reduce:(s,a)=>a.kind==='configure'?N.bridgeStart(a.root,a.vlan):N.bridge(s,a),
 instruction:'A→Bを送り、次にB→Aで返信し、もう一度A→Bを送ってください。各装置が「送信元から」学ぶ場所が変わります。',
 action:(code,f)=>{const [kind,from,to]=code.split(':');return kind==='send'?{kind,from,to}:kind==='wait'?{kind,seconds:60}:{kind:'configure',root:f.get('root'),vlan:Number(f.get('vlan')),fresh:true};},
 render:(s,{field})=>{
  const links=N.bridgeLinks(s),points={S1:[180,45],S2:[60,155],S3:[300,155]};
  const diagram=`<svg viewBox="0 0 360 190" role="img" aria-label="3台のスイッチと転送可能なリンク"><title>root ${s.root}につながる2本で転送します</title>${links.map(e=>`<line x1="${points[e.a][0]}" y1="${points[e.a][1]}" x2="${points[e.b][0]}" y2="${points[e.b][1]}" class="${e.forward?'net-link':'net-link-off'}"/>`).join('')}${Object.entries(points).map(([id,[x,y]])=>`<circle cx="${x}" cy="${y}" r="25" class="net-device"/><text x="${x}" y="${y+5}" text-anchor="middle">${id}</text>`).join('')}</svg>`;
  return `<div class="ex-net-two">${box('使う道と、待機する道',diagram+table(['リンク','転送'],links.map(e=>[e.a+'—'+e.b,e.forward?'使う':'alternate側で待機']))+text('全リンクのコストが等しい三角形の収束後モデルです。BPDU交換の全過程は別章で読みます。'))}${box('端末から一通送る',text('A=S1 / VLAN10、B=S2 / VLAN10、C=S3 / VLAN'+s.vlan)+`<div class="ex-actions">${b('A → B','send:A:B')}${b('B → A','send:B:A')}${b('A → C','send:A:C')}${b('C → A','send:C:A')}</div>`+text('時刻 '+s.time+'秒 / 最後の宛先への到着 '+s.arrivals.length+'回')+b('60秒待って学習期限を越える','wait'))}</div><div class="ex-net-three">${Object.entries(s.tables).map(([sw,entries])=>box(sw+'が知っている場所',table(['VID','端末MACの略名','入った口','残り秒'],entries.map(e=>[e.vlan,e.host,e.port,e.expires-s.time])))).join('')}</div>${box('最後の一通をどこへ出したか',table(['装置','出力先','理由','区間'],s.transfers.map(e=>[e.from,e.to,e.mode,e.tag])))}<details><summary>rootやCの所属を変えて、別の構成から試す</summary><form class="ex-net-form">${field('root','root bridge',s.root,{choices:['S1','S2','S3']})}${field('vlan','CのVLAN',s.vlan,{choices:[10,20]})}${b('この構成で最初から','configure')}</form></details>`;
 }
}));
X.registerWidget('dhcp-lease',(root,a,c)=>N.workbench(root,c,{
 start:N.leaseStart,reduce:N.lease,
 instruction:'DISCOVER → OFFER → REQUEST → ACKを自分で届けます。その後はACKを返さず時間だけ進め、貸出し期限を確かめてください。',
 action:code=>{const [kind,n]=code.split(':');return kind==='wait'?{kind,seconds:Number(n)}:{kind};},
 render:s=>`<div class="ex-net-two">${box('端末が現在知っていること',`<p class="ex-net-value">${h(s.state)}</p>`+text('使用できるアドレス：'+(s.address||'まだありません'))+text('現在時刻：'+s.time+'秒')+text('応答待ちREQUEST送信時刻：'+(s.requestAt??'なし')))}${box('メッセージを選んで届ける',`<div class="ex-actions">${b('1 DISCOVERを送る','discover',s.state!=='INIT'?'disabled':'')}${b('2 OFFERを返す','offer',s.state!=='SELECTING'?'disabled':'')}${b('3 REQUESTを送る','request',s.state!=='OFFERED'?'disabled':'')}${b('ACKを返す','ack',!['REQUESTING','RENEWING','REBINDING'].includes(s.state)?'disabled':'')}</div>`+text('OFFERは候補の提案です。まだ利用が確定していません。'))}</div>${box('期限は別々の出来事',table(['起点','T1：元の相手へ更新','T2：他の相手も探す','使用期限'],[[s.start??'未確定',s.t1??'未確定',s.t2??'未確定',s.expires??'未確定']])+`<div class="ex-actions">${[1,10,30,40,80].map(n=>b(n+'秒進める','wait:'+n)).join('')}</div>`+text('貸出し80秒、T1=40秒、T2=70秒はこの教材の設定です。初回ACKを遅らせても、REQUEST送信時刻を基準とする期限自体は伸びません。'))}`
}));
X.registerWidget('ip-fragments',(root,a,c)=>N.workbench(root,c,{
 start:N.fragmentStart,reduce:(s,a)=>a.kind==='configure'?N.fragmentStart(a.payload,a.mtu):N.fragment(s,a),
 instruction:'末尾の断片を先に届けてください。末尾が分かることと、全データがそろうことは違います。各断片を選ぶと8byte単位のoffsetとヘッダーが対応します。',
 action:(code,f)=>{const [kind,index]=code.split(':');return kind==='configure'?{kind,payload:f.get('payload'),mtu:f.get('mtu'),fresh:true}:{kind,index:Number(index)};},
 render:(s,{field})=>{
  const r=N.fragmentStatus(s),selected=s.fragments[s.selected];
  return `${box('元のデータのどの範囲が届いたか',`<div class="ex-net-fragments">${s.fragments.map(f=>`<button type="button" data-net-action="inspect:${f.index}" class="ex-net-fragment ${s.received.includes(f.index)?'arrived':''}" aria-pressed="${s.selected===f.index}"><strong>断片${f.index+1}</strong><span>[${f.start}, ${f.start+f.length})</span><small>${s.received.includes(f.index)?'受信済み':'未受信'}</small></button>`).join('')}</div>`+text('届いた量 '+r.bytes+' / '+s.payload+'byte。'+(r.complete?'穴なし：再構成可能。':'欠けた範囲：'+r.holes.map(([a,b])=>'['+a+', '+b+')').join('、'))))}<div class="ex-net-two">${box('配送順を自分で決める',`<div class="ex-actions">${s.fragments.map(f=>b('断片'+(f.index+1)+'を届ける','deliver:'+f.index)).join('')}</div>`+text('これはIPv4、DFなし、ヘッダー20byte、単一データグラムの小例です。重複受信は二重に数えません。'))}${box('選んだ断片の意味',table(['位置の計算','データ長','MF','IP全長'],[[selected.offset+' × 8 = '+selected.start,selected.length,selected.more?'1：後続あり':'0：末尾',20+selected.length]])+`<code class="ex-net-hexline">${selected.header.map(v=>v.toString(16).padStart(2,'0')).join(' ')}</code>`+text('検査値を含むIPv4ヘッダーです。非末尾のデータ長を8の倍数にそろえ、最後だけ端数を許します。'))}</div><details><summary>大きさを変えて最初から</summary><form class="ex-net-form">${field('payload','元データbyte数',s.payload,{min:1,max:2400})}${field('mtu','リンクMTU',s.mtu,{min:68,max:1500})}${b('この大きさで作り直す','configure')}</form></details>`;
 }
}));
X.registerWidget('dns-cache-desk',(root,a,c)=>N.workbench(root,c,{
 start:N.dnsStart,reduce:N.dns,
 instruction:'www.example.testのAを問い合わせ、権威側のappのAを書き換えます。すぐ再問い合わせした場合と40秒後を比べてください。',
 action:(code,f)=>code==='query'?{kind:code,name:f.get('query'),type:f.get('type')}:code==='set-a'?{kind:code,name:f.get('record'),value:f.get('address')}:code==='remove-a'?{kind:code,name:f.get('record')}:{kind:'wait',seconds:Number(code.split(':')[1])},
 render:(s,{field})=>`<form class="ex-net-form">${field('query','調べる名前','www.example.test',{choices:['www.example.test','app.example.test','new.example.test']})}${field('type','レコードの種類','A',{choices:['A','AAAA']})}${b('resolverへ問い合わせる','query')}</form><div class="ex-net-two">${box('権威側：現在の正しい設定',table(['名前','種類','値','TTL'],s.records.map(r=>[r.name,r.type,r.value,r.ttl]))+`<form class="ex-net-form">${field('record','変更するAの名前','app.example.test',{choices:['app.example.test','new.example.test']})}${field('address','新しいIPv4','192.0.2.20',{choices:['192.0.2.10','192.0.2.20','192.0.2.30']})}${b('権威側だけを書き換える','set-a')}${b('このAレコードを削除する','remove-a')}</form>`)}${box('resolver：まだ使える保存済み情報',text('現在 '+s.time+'秒 / 権威への照会 '+s.contacts+'回')+table(['名前','種類','値／否定','残り秒'],s.cache.map(e=>[e.name,e.type,e.value||e.status,e.expires-s.time]))+`<div class="ex-actions">${[1,30,40,60].map(n=>b(n+'秒進める','wait:'+n)).join('')}</div>`)}</div>${box('今回の答えと、その根拠',s.last?text(s.last.query+' '+s.last.type+' → '+(s.last.value||s.last.status))+table(['調べた名前','種類','答え','どこから','残り秒'],s.last.trail.map(e=>[e.name,e.type,e.value||e.status,e.origin==='cache'?'キャッシュ':'権威側',e.remaining])):text('まだ問い合わせていません。'))}${text('この操作は委任済みのzone内のRRごとの正・負キャッシュを扱います。CNAMEと参照先のAは別の期限を持ちます。委任先の発見は別章です。')}`
}));
})();
