/* Transport and routing are different learning objects, not one player. */
(() => {
'use strict';
const L=CSL,X=L.experiences,N=X.net,h=L.h;
if(typeof document==='undefined')return;
const {b,box,table,text}=N.ui;
X.registerWidget('tcp-byte-desk',(root,a,c)=>N.workbench(root,c,{
 start:N.tcpStart,reduce:N.tcp,
 instruction:'4つのデータを送り、2番目以外を先に届けてください。受信側の穴、累積ACK、送信側が確認できた範囲がどう違うかを読みます。',
 action:code=>{const [kind,id]=code.split(':');return kind==='send'?{kind,index:Number(id)}:{kind,id:Number(id)};},
 render:s=>{
  const v=N.tcpView(s),bytes=(side)=>`<div class="ex-net-bytes">${[...s.text].map((ch,i)=>`<span class="${(side==='receiver'?s.received[i]:s.base+i<s.una)?'arrived':''}"><small>${s.base+i}</small><strong>${side==='receiver'&&!s.received[i]?'·':ch}</strong></span>`).join('')}</div>`;
  return `<div class="ex-net-two">${box('送信側：ACKで確認できた範囲',text('未確認の先頭 UNA = '+s.una)+bytes('sender')+`<div class="ex-actions">${[0,1,2,3].map(i=>b((s.sent[i]?'同じ範囲を再送：':'送る：')+s.text.slice(i*6,i*6+6)+' / SEQ '+(1001+i*6),'send:'+i)).join('')}</div>`)}${box('受信側：届いたbyteと、まだ空いている穴',text('次に必要な位置 NEXT = '+v.next)+bytes('receiver')+text('先頭からそろってアプリへ渡せる文字：'+(v.application||'まだなし'))+text('それより先の受信範囲（SACK）：'+(v.ranges.map(([a,b])=>'['+a+', '+b+')').join('、')||'なし')))}</div><div class="ex-net-two">${box('データの配送待ち',s.data.length?s.data.map(p=>`<div class="ex-net-packet"><strong>SEQ ${s.base+p.index*s.mss} / ${h(s.text.slice(p.index*6,p.index*6+6))}</strong><div class="ex-actions">${b('受信側へ届ける','deliver-data:'+p.id)}${b('途中で落とす','drop-data:'+p.id)}</div></div>`).join(''):text('まだ配送待ちのデータはありません。'))}${box('ACKの配送待ち',s.acks.length?s.acks.map(p=>`<div class="ex-net-packet"><strong>ACK ${p.ack}</strong>${text('SACK '+(p.ranges.map(x=>x.join('–')).join(', ')||'なし'))}<div class="ex-actions">${b('送信側へ届ける','deliver-ack:'+p.id)}${b('ACKだけ落とす','drop-ack:'+p.id)}</div></div>`).join(''):text('データを受信するとACKが生成されます。'))}</div>${text('接続確立済み、24byte、1segmentは6byteです。自動タイマー・輻輳制御・番号の周回はこの直接操作には含めません。末尾を含まない範囲 [a,b) で表し、受信済みと送信側の確認を別々に更新します。')}`;
 }
}));
X.registerWidget('tcp-window-desk',(root,a,c)=>N.workbench(root,c,{
 start:N.windowStart,reduce:N.window,
 instruction:'rwndを0にしてからcwndだけ増やしてみてください。どちらの制約を変えれば送れるようになるかを、未確認の量と一緒に確かめます。',
 action:(code,f)=>code==='send'?{kind:code,count:f.get('amount')}:code==='ack'?{kind:code}:{kind:code,value:f.get(code)},
 render:(s,{field})=>{
  const slots=(n)=>`<div class="ex-net-slots">${Array.from({length:12},(_,i)=>`<span class="${i<n?'arrived':''}">${i+1}</span>`).join('')}</div>`;
  return `<div class="ex-net-three">${box('受信側が通知した余裕 rwnd',slots(s.rwnd)+`<form class="ex-net-form">${field('rwnd','通知rwnd',s.rwnd,{max:12})}${b('受信側の余裕だけを変える','rwnd')}</form>`)}${box('送信側の混雑への上限 cwnd',slots(s.cwnd)+`<form class="ex-net-form">${field('cwnd','cwnd',s.cwnd,{min:1,max:12})}${b('cwndだけを変える','cwnd')}</form>`)}${box('既に送って、まだ未確認',slots(s.flight)+text('in flight = '+s.flight)+b('1単位をACKで確認する','ack',s.flight?'':'disabled'))}</div>${box('今、新しく送れる量',`<p class="ex-net-value">max(0, min(${s.rwnd}, ${s.cwnd}) − ${s.flight}) = ${N.windowAllowance(s)}</p><form class="ex-net-form">${field('amount','新しく送る単位数',1,{min:1,max:12})}${b('この量を送る','send')}</form>`+text('この小例は上限の引き算に集中しています。rwnd・cwndの通知やACKを独立に指定しており、自動的なTCPの完全な送信制御ではありません。'))}`;
 }
}));
X.registerWidget('linkstate-desk',(root,a,c)=>N.workbench(root,c,{
 start:N.routeStart,reduce:N.route,
 instruction:'C-Dを切断し、Aが持つ地図を先に見てください。新しい広告を一通ずつ届けると、物理の状態と各装置が知ることの差が見えます。',
 action:code=>{const [kind,value]=code.split(':');return kind==='select'?{kind,router:value}:kind==='link'?{kind,up:value==='up'}:{kind,id:Number(value)};},
 render:s=>{
  const view=N.routeView(s),cd=s.links.find(e=>e.a==='C'&&e.b==='D');
  return `<div class="ex-net-two">${box('実際の配線（教材の観測者が見る全体）',table(['リンク','コスト','状態'],s.links.map(e=>[e.a+'—'+e.b,e.cost,e.up?'接続中':'切断']))+`<div class="ex-actions">${b('C-Dを切る','link:down',cd.up?'':'disabled')}${b('C-Dを戻す','link:up',cd.up?'disabled':'')}</div>`)}${box('見るルーターを選ぶ',`<div class="ex-actions">${['A','B','C','D'].map(id=>b(id+'の地図','select:'+id,`aria-pressed="${s.selected===id}"`)).join('')}</div>`+text(s.selected+'が計算したDへの経路：'+(view.path.join(' → ')||'なし'))+text('合計コスト：'+view.distance)+`<p class="${view.broken?'ex-net-warning':'ex-net-note'}">${view.broken?'この地図では道があると思っていますが、実際には切れたリンクを含んでいます。':'この経路に、現在切れた物理リンクは含まれていません。'}</p>`)}</div>${box(s.selected+'が保存している広告',table(['誰の情報か','版','その機器の接続先'],Object.values(s.db[s.selected]).map(r=>[r.origin,r.seq,r.neighbors.map(n=>n.id+'('+n.cost+')').join('、')])))}${box('まだ届いていない広告',s.pending.length?`<div class="ex-net-packets">${s.pending.map(p=>`<div class="ex-net-packet"><strong>${p.from} → ${p.to}</strong>${text(p.record.origin+'の情報 v'+p.record.seq)}${b('この広告を届ける','deliver:'+p.id)}</div>`).join('')}</div>`:text('配送待ちはありません。'))}${text('4ルーターの小さなリンク状態モデルです。広告の版と各装置の知識を扱い、OSPFの全パケット形式・確認応答・全タイマーを再現するものではありません。古い広告を後から届けても、新しい地図を巻き戻しません。')}`;
 }
}));
X.registerWidget('little-area',(root,a,c)=>N.workbench(root,c,{
 start:N.queueStart,reduce:N.queue,
 instruction:'一つの仕事を選ぶと、到着から終了までの滞在区間が強調されます。仕事ごとの長さの和と、各時刻の人数の面積が同じになることを読みます。',
 action:(code,f)=>{const [kind,value]=code.split(':');return kind==='add'?{kind,arrival:f.get('arrival'),service:f.get('service')}:kind==='select'?{kind,index:Number(value)}:{kind};},
 render:(s,{field})=>{
  const v=N.queueView(s),scale=v.T?500/v.T:1;
  const svg=`<svg viewBox="0 0 640 ${80+v.jobs.length*42}" role="img" aria-label="仕事ごとの到着から処理終了までの時間"><title>細い帯が待ち、太い帯が処理中です。どちらも滞在時間に含めます。</title>${v.jobs.map((j,i)=>`<text x="12" y="${47+i*42}">仕事${i+1}</text><line x1="${100+j.arrival*scale}" y1="${42+i*42}" x2="${100+j.end*scale}" y2="${42+i*42}" class="net-stay ${s.selected===i?'selected':''}"/><line x1="${100+j.start*scale}" y1="${42+i*42}" x2="${100+j.end*scale}" y2="${42+i*42}" class="net-service"/><text x="${100+j.arrival*scale}" y="${28+i*42}">${j.arrival}</text><text x="${100+j.end*scale}" y="${65+i*42}">${j.end}</text>`).join('')}</svg>`;
  return `${box('到着・待ち・処理・終了',svg+`<div class="ex-actions">${v.jobs.map(j=>b('仕事'+(j.index+1)+'を選ぶ','select:'+j.index,`aria-pressed="${s.selected===j.index}"`)).join('')}</div>`)}<div class="ex-net-two">${box('仕事ごとに足す',table(['仕事','到着','処理開始','終了','滞在時間'],v.jobs.map(j=>[j.index+1,j.arrival,j.start,j.end,j.stay]))+text('滞在時間の和 = '+v.area))}${box('時間帯ごとに足す',table(['区間','系内人数','時間×人数'],v.intervals.map(i=>['['+i.start+', '+i.end+')',i.count,(i.end-i.start)*i.count]))+text('人数の面積の和 = '+v.intervals.reduce((n,i)=>n+(i.end-i.start)*i.count,0)))}</div>${box('同じ観測区間で比べる',v.T?text('T='+v.T+'、N='+v.jobs.length+'。L='+X.format(v.L)+'、λ=N/T='+X.format(v.lambda)+'、W='+X.format(v.W)+'。L = λW = '+X.format(v.lambda*v.W)):text('仕事を追加すると、観測区間を決められます。'))}<form class="ex-net-form">${field('arrival','到着時刻',s.jobs.at(-1)?.arrival||0,{max:20})}${field('service','処理時間',1,{min:1,max:8})}${b('仕事を追加する','add')}${b('空から仕事を作る','clear')}</form>${text('空から始め、最後の仕事が終わるまでを観測します。破棄はなく全仕事を数えます。この有限標本の等式を、M/M/1の定常平均や安定性の証明へ読み替えません。')}`;
 }
}));
})();
