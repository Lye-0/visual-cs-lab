(() => {
'use strict';
const L=CSL,X=L.experiences,N=X.net,h=L.h;
if(typeof document==='undefined')return;
const {b,box,table,text}=N.ui;
X.registerWidget('pcap-inspector',(root,a,c)=>N.workbench(root,c,{
 start:N.captureStart,reduce:N.capture,
 instruction:'packetを一つ選び、SEQやACKのフィールドを押してください。同じbyteが強調され、値の出所を確認できます。記録に直接ある事実と、原因の推測は分けて読みます。',
 action:(code,f)=>{const [kind,value]=code.split(':');return kind==='packet'?{kind,index:Number(value)}:kind==='field'?{kind,field:value}:kind==='load'?{kind,hex:f.get('hex'),fresh:true}:{kind};},
 render:(s,{field})=>{
  const packets=N.capturePackets(s),p=packets[s.selected],fields=N.captureFields(p),selected=fields.find(f=>f.id===s.field)||fields[0];
  const duplicate=packets.filter((x,i)=>x.protocol==='TCP'&&x.dataLength>0&&packets.slice(0,i).some(y=>y.source===x.source&&y.sourcePort===x.sourcePort&&y.target===x.target&&y.targetPort===x.targetPort&&y.seq===x.seq&&y.dataLength===x.dataLength)).length;
  return `<div class="ex-net-inspector">${box('観測したpacketを選ぶ',`<ol class="ex-net-packet-list">${packets.map((p,i)=>`<li>${b('#'+(i+1)+' / '+X.format(p.time)+'ms / '+p.protocol+' '+p.flags+' / SEQ '+(p.seq??'—'),'packet:'+i,`aria-pressed="${s.selected===i}"`)}</li>`).join('')}</ol>`)}${box('選んだpacketから読める値',table(['項目','値'],[['送信元',p.source+':'+(p.sourcePort??'')],['宛先',p.target+':'+(p.targetPort??'')],['SEQ',p.seq??'対象外'],['ACK',p.ack??'対象外'],['データbyte数',p.dataLength??'対象外'],['IPv4 checksum',p.checksum],['記録の切詰め',p.truncated?'あり':'検出なし']])+`<div class="ex-actions">${fields.map(f=>b(f.name,'field:'+f.id,`aria-pressed="${selected.id===f.id}"`)).join('')}</div>`)}</div>${box(selected.name+'のbyte位置',text('frame先頭から ['+selected.start+', '+selected.end+') byte。'+selected.why)+`<div class="ex-net-byte-grid" aria-label="frameの16進byte列">${p.bytes.slice(0,320).map((v,i)=>`<span class="${i>=selected.start&&i<selected.end?'selected':''}" data-net-byte="${i}"><small>${i}</small><code>${v.toString(16).padStart(2,'0')}</code></span>`).join('')}</div>`+(p.bytes.length>320?text('表示は先頭320byteです。ヘッダーの選択対象はこの範囲にあります。'):''))}${box('確認できることと、まだ断定できないこと',text('同じ向き・同じデータSEQ・同じデータ長が再び記録された候補：'+duplicate+'件。')+text('これは再送の候補です。データの損失、ACKの損失、取得地点での観測漏れのどれかを、この一致だけで断定しません。')+text('教材captureは合成データです。IPv4 checksumは検算しますが、TCP checksumやTLSの復号はこの画面では検証しません。'))}<details><summary>小さなclassic PCAPの16進数を読み込む</summary><form class="ex-net-form">${field('hex','PCAPの16進数（空欄で教材に戻す）','',{type:'textarea',maxlength:120000})}${b('このbyte列を解析する','load')}</form></details>`;
 }
}));
X.registerWidget('network-config-desk',(root,a,c)=>N.workbench(root,c,{
 start:()=>({...N.configStart(),interface:0}),
 reduce:(s,a)=>{
  if(a.kind==='interface'){const next=X.clone(s),d=s.config.devices.find(d=>d.id===s.selected);next.interface=N.int(a.index,0,d.interfaces.length-1,'interface番号');return next;}
  const next=N.config(s,a);if(a.kind==='select')next.interface=0;return next;
 },
 instruction:'まず「ページを開く」を試します。次にrouterのDNS許可を外して再実行し、どの段階で止まるかを確認してください。設定を直したら、同じ試験をもう一度行います。',
 action:(code,f,s)=>{
  const [kind,value]=code.split(':'),d=s.config.devices.find(d=>d.id===s.selected);
  if(kind==='select')return {kind,id:value,fresh:true};
  if(kind==='interface')return {kind,index:Number(value),fresh:true};
  if(kind==='device')return {kind,index:s.interface||0,ip:f.get('ip'),prefix:f.get('prefix'),lan:f.get('lan'),gateway:d.kind==='router'?'':f.get('gateway'),dns:d.kind==='host'?f.get('dns'):'',certificate:d.kind==='web'?f.get('certificate'):undefined};
  if(kind==='record')return {kind,value:f.get('answer')};
  if(kind==='rules')return {kind,dns:f.get('allowDNS'),web:f.get('allowWeb'),stateful:f.get('stateful')};
  return {kind:'run'};
 },
 render:(s,{field})=>{
  const d=s.config.devices.find(d=>d.id===s.selected),nic=d.interfaces[s.interface||0];
  const interfaces=`<div class="ex-actions">${d.interfaces.map((n,i)=>b(n.lan+'側のinterface','interface:'+i,`aria-pressed="${(s.interface||0)===i}"`)).join('')}</div>`;
  const form=`<form class="ex-net-form">${field('ip','このinterfaceのIPv4',nic.ip,{type:'text'})}${field('prefix','prefix長',nic.prefix,{min:1,max:30})}${field('lan','接続するLAN名',nic.lan,{type:'text',maxlength:16})}${d.kind!=='router'?field('gateway','gatewayのIPv4',d.gateway||'',{type:'text'}):''}${d.kind==='host'?field('dns','問い合わせ先DNS',d.dns,{type:'text'}):''}${d.kind==='web'?field('certificate','証明書にある名前',d.certificate,{type:'text'}):''}${b('この機器の設定を反映する','device')}</form>`;
  const rules=d.kind==='router'?`<form class="ex-net-form">${field('allowDNS','UDP宛先53番を許可',s.config.rules.find(r=>r.protocol==='UDP')?.action==='allow',{type:'checkbox'})}${field('allowWeb','TCP宛先443番を許可',s.config.rules.find(r=>r.protocol==='TCP')?.action==='allow',{type:'checkbox'})}${field('stateful','許可した通信の戻りを認める',s.config.stateful,{type:'checkbox'})}${b('通信規則を反映する','rules')}</form>`:'';
  const record=d.kind==='dns'?`<form class="ex-net-form">${field('answer','web.example.testへの回答IP',d.records['web.example.test'],{type:'text'})}${b('DNSレコードを反映する','record')}</form>`:'';
  return `<div class="ex-net-devices">${s.config.devices.map(device=>`<button type="button" class="ex-net-device-card" data-net-action="select:${device.id}" aria-pressed="${s.selected===device.id}"><strong>${h(device.id)}</strong>${device.interfaces.map(n=>`<span>${h(n.ip)}/${n.prefix}</span><small>${h(n.lan)}</small>`).join('')}</button>`).join('')}</div><div class="ex-net-two">${box(d.id+'の設定',interfaces+form+rules+record)}${box('同じ名前で通信を確かめる',text('https://'+s.hostname+'/ を開く仮想試験です。')+b('ページを開く','run')+`<p class="ex-net-value" data-net-config-result>${s.dirty?'未確認':s.result?.success?'200 OK':'途中で停止'}</p>`+text(s.result?.stopped||'設定を編集した場合、以前の成功結果は消してから確認します。')+text('client → LAN-A → router → LAN-B → dns / web。要求だけでなく戻りの経路も必要です。'))}</div>${s.result?box('機器がその時点で判断した記録',`<ol class="ex-net-evidence">${s.result.records.map((e,i)=>`<li><strong>${i+1}. ${h(e.stage)} / ${h(e.from)} → ${h(e.to)}</strong><p>${h(e.detail)}</p>${e.source?`<small>IP ${h(e.source)} → ${h(e.target)}</small>`:''}${e.sourceMAC?`<small>MAC ${h(e.sourceMAC)} → ${h(e.targetMAC)}</small>`:''}</li>`).join('')}</ol>`):''}${text('これは機器設定を連動させる安全な仮想環境です。実際のDNS・TCP・TLS接続は行いません。TLSは名前の一致の条件確認のみで、実証明書チェーンや暗号処理を含みません。')}`;
 }
}));
})();
