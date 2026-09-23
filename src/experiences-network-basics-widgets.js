/* Four different network-basics workspaces; switch learning already has a direct widget. */
(() => {
'use strict';
if(typeof document==='undefined')return;
const L=CSL,X=L.experiences,N=X.networkBasics,S=X.securityDesk,h=L.h;
const {b,p,box,table}=S.ui,formula=X.html.formula;
const F=v=>X.format(v);
const bitRow=(label,bits,mask,selected)=>'<div class="ex-nb-bitrow" role="row" aria-label="'+h(label)+'">'+
 bits.split('').map((bit,i)=>'<span data-part="'+(i<mask?'network':'host')+'" data-selected="'+(i===selected)+'"><small>'+(i+1)+'</small>'+bit+'</span>').join('')+'</div>';
X.registerWidget('subnet-bits',(root,a,c)=>S.mount(root,c,{
 start:N.subnetStart,reduce:N.subnet,
 instruction:'まず24番目のbitを選び、自分と相手へ同じマスクを掛けた結果を比べます。次に/25へ変え、境界の1bitが判断を変える例を試してください。',
 action:(code,f)=>code.startsWith('bit:')?{kind:'bit',index:Number(code.split(':')[1])}:{kind:'configure',ip:f.get('ip'),peer:f.get('peer'),prefix:f.get('prefix'),fresh:true},
 render:(s,{field})=>{
  const v=N.subnetView(s),r=v.selected;
  const rows=[['自分',L.bits(v.a,32)],['相手',L.bits(v.b,32)],['mask',L.bits(v.mask,32)],['自分 AND mask',L.bits(v.networkA,32)],['相手 AND mask',L.bits(v.networkB,32)]];
  return '<div class="ex-nb-fields">'+field('ip','自分のIPv4',s.ip,{type:'text'})+field('peer','相手のIPv4',s.peer,{type:'text'})+field('prefix','プレフィックス長',s.prefix,{min:0,max:32})+b('この境界で比較','configure')+'</div>'+
   box('32bitを同じ位置で縦に読む',rows.map(([label,bits])=>'<div class="ex-nb-bitline"><strong>'+h(label)+'</strong>'+bitRow(label,bits,s.prefix,s.bit)+'</div>').join('')+
    '<div class="ex-actions" aria-label="調べるビット">'+Array.from({length:32},(_,i)=>b(String(i+1),'bit:'+i,'aria-pressed="'+(i===s.bit)+'"')).join('')+'</div>'+
    p('青緑はネットワーク部、灰色はホスト部です。番号は左端を1としたbit位置です。'))+
   box('選んだbit '+(s.bit+1)+' をANDする',table(['値','このbit'],[['自分',r.a],['相手',r.b],['mask',r.mask],['自分 AND mask',r.an],['相手 AND mask',r.bn]])+
    p(r.part==='network'?'この位置はネットワーク部です。maskが1なので元のbitが残ります。':'この位置はホスト部です。maskが0なのでネットワーク値では0になります。'))+
   box(v.same?'同じサブネット':'別のサブネット',table(['比較','値'],[['自分のnetwork',L.intIp(v.networkA)+'/'+s.prefix],['相手のnetwork',L.intIp(v.networkB)+'/'+s.prefix],['同じか',v.same?'はい':'いいえ'],['次にリンク層で渡す相手のIP',v.nextHop]])+
    p(v.same?'最終宛先自身のMACを調べます。':'最終宛先のIPは変えず、まず同一リンク上のgatewayのMACを調べます。'));
 }
}));
X.registerWidget('arp-next-hop',(root,a,c)=>S.mount(root,c,{
 start:N.arpStart,reduce:N.arp,
 instruction:'最初は同じLANの相手です。ARP Request→Reply→フレーム送信を順に行います。その後「別ネットワーク」を選び、ARPで尋ねるIPが最終宛先ではなくgatewayになることを比べてください。',
 action:code=>{const [kind,v]=code.split(':');return kind==='destination'?{kind,remote:v==='remote',fresh:true}:{kind};},
 render:s=>{
  const v=N.arpView(s),rows=Object.entries(s.cache);
  const wire=s.wire?box('いま回線にあるもの',table(['種類','内容'],s.wire.kind==='request'?[['ARP Request','Who has '+s.wire.target+'?']]:s.wire.kind==='reply'?[['ARP Reply',v.nextIp+' is at '+v.nextMac]]:[['IP最終宛先',s.wire.ip],['Ethernet宛先MAC',s.wire.mac]])):'';
  return '<div class="ex-actions">'+b('同じLAN','destination:local','aria-pressed="'+(!s.remote)+'"')+b('別ネットワーク','destination:remote','aria-pressed="'+s.remote+'"')+'</div>'+
   box('最終宛先と、次にフレームを渡す相手',table(['役割','値'],[['IPの最終宛先',v.finalIp],['同じリンク上の次ホップ',v.nextIp],['次ホップの意味',v.label],['分かっているMAC',v.cached||'まだない']]))+
   box('ARPキャッシュ',rows.length?table(['IP','MAC'],rows):p('まだ空です。'))+
   '<div class="ex-actions">'+b('ARP Requestを送る','request')+b('ARP Replyを届ける','reply',s.wire?.kind==='request'?'':'disabled')+b('IPパケットをEthernetで送る','send',v.cached?'':'disabled')+b('対応を既知にする','preset-cache')+b('キャッシュだけ空にする','clear')+'</div>'+wire+
   p(s.remote?'別ネットワークでもIPの最終宛先は203.0.113.20です。Ethernetの宛先MACだけがgatewayになります。ARP broadcastを遠隔ネットワークまで飛ばして最終端末のMACを聞くわけではありません。':'同じLANなので、最終宛先自身が次ホップです。ARPでその端末のMACを調べます。');
 }
}));
X.registerWidget('dhcp-leases',(root,a,c)=>S.mount(root,c,{
 start:N.dhcpStart,reduce:N.dhcp,
 instruction:'端末1についてDISCOVER→OFFER→REQUEST→ACKを一つずつ進めてください。OFFERやREQUESTの時点ではまだIPを「利用中」にしません。プールを1個にして端末2まで進めると不足も確認できます。',
 action:(code,f)=>code==='configure'?{kind:'configure',clients:f.get('clients'),pool:f.get('pool'),fresh:true}:{kind:'next'},
 render:(s,{field})=>{
  const v=N.dhcpView(s);
  return '<div class="ex-nb-fields">'+field('clients','接続する端末数',s.clients,{min:1,max:6})+field('pool','貸し出せるアドレス数',s.pool,{min:0,max:6})+b('この条件で最初から','configure')+'</div>'+
   box('端末側：ACKされた値だけを設定済みにする',table(['端末','現在のIP','いま処理中'],v.states.map(x=>['端末'+x.client,x.lease||'未設定',x.active?'← この端末':''])))+
   box('サーバー側：候補と確定済みリース',table(['区分','値'],[['未使用の候補',v.available.join('、')||'なし'],['現在の提案',s.offer||'なし'],['確定済み',s.leases.filter(Boolean).join('、')||'なし']]))+
   box(s.client>=s.clients?'全端末の試行が終了':'次のメッセージ：'+v.message,p(s.client>=s.clients?'条件を変えるか最初から試してください。':'端末'+(s.client+1)+'について進めます。')+b('次のDHCPメッセージを届ける','next',s.client>=s.clients?'disabled':''))+
   '<details class="ex-nb-details" data-sec-view="dhcp-log"><summary>これまで何が確定したか</summary><ol>'+s.log.map(x=>'<li>'+h(x)+'</li>').join('')+'</ol></details>'+
   p('DORAの役割とプール不足だけに絞った小例です。リース更新、複数サーバーの選択、relay、Optionの詳細はここでは扱いません。');
 }
}));
X.registerWidget('ipv6-expand',(root,a,c)=>S.mount(root,c,{
 start:N.ipv6Start,reduce:N.ipv6,
 instruction:'省略されたアドレスを8ブロックへ展開し、まず「::」が何ブロック分か確認します。次に/64と/60を切り替えて、境界が16bitブロックの途中にも置けることを見てください。',
 action:(code,f)=>{const [kind,v]=code.split(':');return kind==='configure'?{kind,ip:f.get('ip'),prefix:f.get('prefix'),fresh:true}:kind==='group'?{kind,index:Number(v)}:{kind,index:Number(v)};},
 render:(s,{field})=>{
  const v=N.ipv6View(s),g=v.selected;
  return '<div class="ex-nb-fields">'+field('ip','IPv6アドレス',s.ip,{type:'text'})+field('prefix','プレフィックス長',s.prefix,{min:0,max:128})+b('展開して境界を置く','configure')+'</div>'+
   box('省略形 → 8個の16bitブロック',formula(s.ip+' → '+v.parts.join(':'))+p('「::」で補った全0ブロック数：'+v.omitted)+
    '<div class="ex-nb-ipv6-groups">'+v.rows.map(r=>b(r.part,'group:'+r.i,'aria-pressed="'+(s.group===r.i)+'" aria-label="ブロック'+(r.i+1)+' '+r.part+'を調べる"')).join('')+'</div>')+
   box('選んだブロック '+(s.group+1),p(g.part+' = '+parseInt(g.part,16)+'。16進1桁は4bitなので、このブロックは次の16bitです。')+
    '<div class="ex-nb-16">'+g.bits.split('').map((bit,i)=>b(bit,'bit:'+i,'aria-pressed="'+(s.bit===i)+'" data-part="'+(s.group*16+i<s.prefix?'prefix':'interface')+'"')).join('')+'</div>'+
    table(['選択位置','値'],[['全128bit中の位置',v.absoluteBit+1],['ブロック内',s.bit+1],['bit値',v.selectedValue],['役割',v.isPrefix?'プレフィックス側':'残り側']]))+
   box('/'+s.prefix+' の境界',p('先頭'+s.prefix+'bitがプレフィックス側、残り'+(128-s.prefix)+'bitが残り側です。')+
    table(['ブロック','プレフィックスに含まれるbit数'],v.rows.map(r=>[r.part,r.prefixBits])))+
   p('この章では表記とプレフィックス境界に集中します。Neighbor Solicitation / Advertisementは別の計算記録の章で確認します。IPv4埋め込み表記はこの教材では扱いません。');
 }
}));
})();