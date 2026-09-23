/* Direct network-basics workspaces. Pure in-memory teaching state. */
(() => {
'use strict';
const L=CSL,X=L.experiences,N=X.networkBasics={},clone=X.clone;
const integer=(v,min,max,label='値')=>{if(!Number.isInteger(v)||v<min||v>max)throw Error(label+'は'+min+'〜'+max+'の整数です。');return v;};
const begin=s=>{if((s.log?.length||0)>=120)throw Error('この例は120操作までです。最初から試してください。');return clone(s);};
const note=(s,t)=>{s.log.push(t);return s;};
N.subnetStart=()=>({ip:'192.168.1.130',peer:'192.168.1.20',prefix:24,bit:23,log:[]});
N.subnetView=s=>{
 const a=L.ipInt(s.ip),b=L.ipInt(s.peer),mask=L.maskOf(s.prefix),na=(a&mask)>>>0,nb=(b&mask)>>>0;
 const ab=L.bits(a,32),bb=L.bits(b,32),mb=L.bits(mask,32);
 const rows=Array.from({length:32},(_,i)=>({i,a:+ab[i],b:+bb[i],mask:+mb[i],an:+ab[i]&+mb[i],bn:+bb[i]&+mb[i],part:i<s.prefix?'network':'host'}));
 return {a,b,mask,networkA:na,networkB:nb,same:na===nb,rows,selected:rows[s.bit],nextHop:na===nb?s.peer:'192.168.1.1'};
};
N.subnet=(input,a)=>{
 const s=begin(input);
 if(a.kind==='configure'){
  L.ipInt(a.ip);L.ipInt(a.peer);const prefix=integer(a.prefix,0,32,'プレフィックス長');
  Object.assign(s,{ip:a.ip.trim(),peer:a.peer.trim(),prefix,bit:Math.min(s.bit,31)});
  return note(s,'二つのアドレスへ同じ/'+prefix+'のマスクを適用し直しました。');
 }
 if(a.kind==='bit'){s.bit=integer(a.index,0,31,'ビット位置');return s;}
 throw Error('未定義のサブネット操作です。');
};

const arpData={
 local:{finalIp:'192.168.1.20',nextIp:'192.168.1.20',nextMac:'02:00:00:00:00:0B',label:'同じLANの端末B'},
 remote:{finalIp:'203.0.113.20',nextIp:'192.168.1.1',nextMac:'02:00:00:00:00:01',label:'デフォルトゲートウェイ'}
};
N.arpStart=()=>({remote:false,cache:{},phase:'idle',wire:null,log:[]});
N.arpView=s=>{const d=s.remote?arpData.remote:arpData.local;return {...d,cached:s.cache[d.nextIp]||null};};
N.arp=(input,a)=>{
 if(a.kind==='destination'){const remote=!!a.remote;return {...N.arpStart(),remote,log:['最終宛先を'+(remote?'別ネットワーク':'同じLAN')+'に変更しました。']};}
 const s=begin(input),v=N.arpView(s);
 if(a.kind==='preset-cache'){s.cache[v.nextIp]=v.nextMac;s.phase='resolved';return note(s,'次ホップIP→MACの対応を既知として保存しました。ARP Requestは不要です。');}
 if(a.kind==='clear'){s.cache={};s.phase='idle';s.wire=null;return note(s,'ARPキャッシュだけを空にしました。IPの宛先や経路判断は変えていません。');}
 if(a.kind==='request'){
  if(v.cached){s.phase='resolved';return note(s,'次ホップのMACはキャッシュにあるため、問い合わせを送る必要はありません。');}
  s.wire={kind:'request',target:v.nextIp};s.phase='request';return note(s,'同一リンクへARP Requestをbroadcastしました。尋ねるIPは最終宛先ではなく、今回フレームを渡す次ホップです。');
 }
 if(a.kind==='reply'){
  if(s.wire?.kind!=='request')throw Error('先にARP Requestを送ってください。');
  s.cache[v.nextIp]=v.nextMac;s.wire={kind:'reply',target:'192.168.1.10'};s.phase='resolved';return note(s,'ARP Replyで次ホップのIP→MACを学びました。');
 }
 if(a.kind==='send'){
  const mac=s.cache[v.nextIp];if(!mac)throw Error('次ホップのMACがまだ分かりません。ARPで解決してください。');
  s.wire={kind:'frame',ip:v.finalIp,mac};s.phase='sent';return note(s,'IPの最終宛先は'+v.finalIp+'のまま、Ethernetの宛先MACを'+mac+'にして送信しました。');
 }
 throw Error('未定義のARP操作です。');
};

N.dhcpStart=(clients=3,pool=2)=>({clients:integer(clients,1,6,'端末数'),pool:integer(pool,0,6,'プール数'),leases:Array(6).fill(null),client:0,phase:0,offer:null,log:[]});
N.dhcpView=s=>{
 const states=Array.from({length:s.clients},(_,i)=>({client:i+1,lease:s.leases[i],active:i===s.client}));
 const used=new Set(s.leases.filter(Boolean));
 const available=Array.from({length:s.pool},(_,i)=>'192.0.2.'+(100+i)).filter(ip=>!used.has(ip));
 return {states,available,current:s.client<s.clients?states[s.client]:null,message:['DISCOVER','OFFER','REQUEST','ACK'][s.phase]||'完了'};
};
N.dhcp=(input,a)=>{
 if(a.kind==='configure')return N.dhcpStart(a.clients,a.pool);
 const s=begin(input),v=N.dhcpView(s);
 if(a.kind==='next'){
  if(s.client>=s.clients)throw Error('全端末の試行が終わっています。');
  const id=s.client+1;
  if(s.phase===0){s.phase=1;return note(s,'端末'+id+'がDHCPDISCOVER。まだIPは設定されていません。');}
  if(s.phase===1){
   s.offer=v.available[0]||null;
   if(!s.offer){s.client++;s.phase=0;return note(s,'利用できるアドレスがないためDHCPOFFERはありません。端末'+id+'は未設定のままです。');}
   s.phase=2;return note(s,'サーバーが'+s.offer+'をDHCPOFFER。提案であり、まだリース確定ではありません。');
  }
  if(s.phase===2){s.phase=3;return note(s,'端末'+id+'が'+s.offer+'をDHCPREQUEST。要求しただけで、まだ利用確定ではありません。');}
  s.leases[s.client]=s.offer;s.offer=null;s.client++;s.phase=0;return note(s,'DHCPACKで端末'+id+'のリースを確定しました。');
 }
 throw Error('未定義のDHCP操作です。');
};

N.ipv6Start=()=>({ip:'2001:db8:12:34::abcd',prefix:64,group:0,bit:0,log:[]});
N.ipv6View=s=>{
 const parts=L.expandIPv6(s.ip),binary=parts.map(x=>parseInt(x,16).toString(2).padStart(16,'0')).join('');
 const rows=parts.map((part,i)=>({i,part,bits:binary.slice(i*16,i*16+16),prefixBits:Math.max(0,Math.min(16,s.prefix-i*16))}));
 const bit=s.group*16+s.bit;
 return {parts,binary,rows,selected:rows[s.group],absoluteBit:bit,isPrefix:bit<s.prefix,selectedValue:+binary[bit],omitted:8-(s.ip.replace(/^::|::$/g,'').split(':').filter(Boolean).length)};
};
N.ipv6=(input,a)=>{
 const s=begin(input);
 if(a.kind==='configure'){L.expandIPv6(a.ip);s.ip=a.ip.trim();s.prefix=integer(a.prefix,0,128,'プレフィックス長');return note(s,'省略表記を8ブロックへ展開し、/'+s.prefix+'の境界を同じ128bit上へ置きました。');}
 if(a.kind==='group'){s.group=integer(a.index,0,7,'ブロック');s.bit=Math.min(s.bit,15);return s;}
 if(a.kind==='bit'){s.bit=integer(a.index,0,15,'ブロック内ビット');return s;}
 throw Error('未定義のIPv6操作です。');
};
})();