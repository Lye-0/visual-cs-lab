/* Local teaching services. All resource names and addresses are fictional.
 * No fetch, sockets, local storage, arbitrary evaluation or external requests. */
(() => {
'use strict';
const L=CSL,X=L.experiences,K=L.curriculum,N=X.net;
N.httpStart=()=>({resources:{'/items/1':{text:'hello',version:1}},next:2,revision:1,last:null,log:[]});
N.http=(input,a)=>{
 const s=N.begin(input);if(a.kind!=='request')throw Error('要求を送ってください。');
 const method=N.choice(a.method,['GET','HEAD','POST','PUT','DELETE'],'メソッド'),path=String(a.path),text=String(a.text??'');
 if(!/^\/items(?:\/[1-9]\d?)?$/.test(path))throw Error('この例のパスは/items、または/items/1〜99です。');
 if(text.length>120)throw Error('本文のtextは120文字までです。');
 const current=s.resources[path],tag=current?'"v'+current.version+'"':null;
 let status=200,body=null,headers={};
 if(method==='GET'||method==='HEAD'){
  if(!current)status=404;
  else{headers.ETag=tag;if(a.ifNoneMatch===tag||a.ifNoneMatch==='*')status=304;else if(method==='GET')body={text:current.text};}
 }else if(method==='POST'){
  if(path!=='/items')status=405;
  else if(Object.keys(s.resources).length>=10)throw Error('この小例は10資源までです。削除するか最初から試してください。');
  // Never return a Location that the bounded path reader cannot open.
  else if(s.next>99)throw Error('この小例の自動採番は99までです。既存の資源は読めます。新しい作成を試す場合は実験を最初からに戻してください。');
  else{const key='/items/'+s.next++;s.resources[key]={text,version:++s.revision};status=201;headers.Location=key;headers.ETag='"v'+s.revision+'"';body={text};}
 }else if(method==='PUT'){
  if(path==='/items')status=405;
  else{if(!current&&Object.keys(s.resources).length>=10)throw Error('資源の上限10個です。');
   status=current?200:201;
   // The representation and validator remain stable for identical replacement.
   s.resources[path]={text,version:current?.text===text?current.version:++s.revision};
   s.next=Math.max(s.next,Number(path.split('/').at(-1))+1);headers.ETag='"v'+s.resources[path].version+'"';body={text};}
 }else{status=current?204:404;delete s.resources[path];}
 s.last={method,path,status,headers,body};
 return N.note(s,method+' '+path+' → '+status+'。'+(status===304?'表現は未変更なので本文を送りません。':method==='DELETE'?'2回目が404でも、意図した削除後の状態は同じです。':'要求の意味と転送方式は別の問題です。'));
};
N.captureStart=()=>({bytes:K.makeCapture(),selected:0,field:'ethernet',log:[]});
N.capturePackets=s=>K.parseCapture(s.bytes);
N.captureFields=p=>{
 const b=p.bytes,fields=[{id:'ethernet',name:'Ethernet全体のヘッダー',start:0,end:Math.min(14,b.length),why:'次のリンクで渡す相手と、内側の種類を記録します。'}];
 if(b.length<34||b[12]!==8||b[13]!==0)return fields;
 const ihl=(b[14]&15)*4,transport=14+ihl;
 fields.push({id:'ip',name:'IPv4ヘッダー',start:14,end:transport,why:'内側の最終IP宛先、長さ、次のプロトコルを読みます。'},
 {id:'length',name:'IP全長',start:16,end:18,why:'IPヘッダーとIPデータを合わせた長さです。Ethernetヘッダーは含みません。'},
 {id:'ttl',name:'TTL',start:22,end:23,why:'中継回数を制限する値。秒数として減算するタイマーではありません。'},
 {id:'checksum',name:'IPv4 checksum',start:24,end:26,why:'対象はIPv4ヘッダーです。TCPデータ全体の検査ではありません。'},
 {id:'source',name:'送信元IP',start:26,end:30,why:'4byteをIPv4アドレスとして読みます。'},
 {id:'target',name:'宛先IP',start:30,end:34,why:'このIPパケットの宛先です。次ホップのMACとは役割が違います。'});
 if(p.protocol==='TCP'&&b.length>=transport+20)fields.push(
 {id:'ports',name:'TCPポート',start:transport,end:transport+4,why:'最初の2byteが送信元、次の2byteが宛先の受け口です。'},
 {id:'seq',name:'TCP SEQ',start:transport+4,end:transport+8,why:'この例のデータはbyte位置で数えます。captureの行番号とは違います。'},
 {id:'ack',name:'TCP ACK',start:transport+8,end:transport+12,why:'ACKフラグがある場合、次に必要なbyte位置を示します。'},
 {id:'flags',name:'TCPフラグ',start:transport+13,end:transport+14,why:'SYN、ACK、FINなどのbitを一つのbyteから読みます。'});
 return fields.filter(f=>f.end<=b.length);
};
N.capture=(input,a)=>{
 const s=N.begin(input);
 if(a.kind==='load'){
  const hex=String(a.hex||'').replace(/\s/g,'');if(!hex)return N.captureStart();
  if(hex.length>120000||!/^(?:[0-9a-fA-F]{2})+$/.test(hex))throw Error('PCAPを2桁byteの16進数で入力してください。最大60000byteです。');
  const bytes=hex.match(/../g).map(x=>parseInt(x,16)),packets=K.parseCapture(bytes);if(!packets.length)throw Error('packetがありません。');
  s.bytes=bytes;s.selected=0;s.field='ethernet';return N.note(s,'入力されたbyteを解析しました。外部へは送信していません。');
 }
 if(a.kind==='packet'){s.selected=N.int(a.index,0,N.capturePackets(s).length-1,'packet番号');s.field='ethernet';return s;}
 if(a.kind==='field'){const p=N.capturePackets(s)[s.selected];if(!N.captureFields(p).some(f=>f.id===a.field))throw Error('表示中のpacketに存在するフィールドを選んでください。');s.field=a.field;return s;}
 if(a.kind==='tamper'){if(s.bytes.length<63)throw Error('改変できる教材ヘッダーがありません。');s.bytes[62]^=1;return N.note(s,'最初のpacketのTTLを1bit反転しました。検査値を書き直さず、保存byteから再検査します。');}
 throw Error('未定義のcapture操作です。');
};
N.configStart=()=>({config:X.clone(K.integratedDefault),selected:'client',hostname:'web.example.test',result:null,dirty:true,log:[]});
N.config=(input,a)=>{
 const s=N.begin(input);
 if(a.kind==='select'){if(!s.config.devices.some(d=>d.id===a.id))throw Error('機器を選んでください。');s.selected=a.id;return s;}
 if(a.kind==='device'){
  const d=s.config.devices.find(d=>d.id===s.selected),index=N.int(a.index,0,d.interfaces.length-1,'interface番号');
  L.ipInt(a.ip);N.int(a.prefix,1,30,'prefix');if(!/^[A-Za-z0-9-]{1,16}$/.test(a.lan))throw Error('LAN名は英数字とハイフン16文字以内です。');
  if(a.gateway)L.ipInt(a.gateway);if(d.kind==='host'&&a.dns)L.ipInt(a.dns);
  d.interfaces[index]={...d.interfaces[index],ip:a.ip,prefix:a.prefix,lan:a.lan};
  if(d.kind!=='router')d.gateway=a.gateway||'';if(d.kind==='host')d.dns=a.dns||'';
  if(d.kind==='web'){if(!/^[a-z0-9.-]{1,80}$/.test(a.certificate))throw Error('確認する名前を英数字のホスト名で入れてください。');d.certificate=a.certificate;}
  s.result=null;s.dirty=true;return N.note(s,s.selected+'の設定を更新。前の試験結果を消しました。新しい設定でページを開いてください。');
 }
 if(a.kind==='record'){
  L.ipInt(a.value);s.config.devices.find(d=>d.kind==='dns').records['web.example.test']=a.value;s.result=null;s.dirty=true;return N.note(s,'DNSの回答を変更。試験結果は再実行するまで未確認です。');
 }
 if(a.kind==='rules'){
  if([a.dns,a.web,a.stateful].some(v=>typeof v!=='boolean'))throw Error('規則の許可を選んでください。');
  s.config.rules=[{action:a.dns?'allow':'deny',protocol:'UDP',port:53},{action:a.web?'allow':'deny',protocol:'TCP',port:443}];s.config.stateful=a.stateful;s.result=null;s.dirty=true;
  return N.note(s,'規則を変更。DNS・Web・既存通信の戻りは別々の条件です。');
 }
 if(a.kind==='run'){
  const r=K.integratedNetwork(s.config,s.hostname,8,'none');s.result={success:r.success,stopped:r.stopped,records:r.records};s.dirty=false;
  return N.note(s,r.success?'DNSと双方向転送、名前の確認を経て200 OKを受け取りました。':'停止：'+r.stopped+'。最初に止まった判断と、機器の設定を比べてください。');
 }
 throw Error('未定義の設定操作です。');
};
})();
