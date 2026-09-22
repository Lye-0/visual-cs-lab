/* Learner-controlled, bounded network models. No sockets or host settings.
 * Independent state transitions keep failed operations atomic and undo local
 * to an experiment. Protocol timing constants here are teaching parameters. */
(() => {
'use strict';
const L=CSL,X=L.experiences,K=L.curriculum,N=X.net={};
const clone=X.clone;
N.int=(n,min,max,label='値')=>{if(!Number.isInteger(n)||n<min||n>max)throw Error(label+'は'+min+'〜'+max+'の整数です。');return n;};
N.begin=s=>{if(s.log.length>=100)throw Error('この小例は100操作までです。最初から試してください。');return clone(s);};
N.note=(s,text)=>{s.log.push(text);return s;};
const known=(value,values,label)=>{if(!values.includes(value))throw Error(label+'を選び直してください。');return value;};
N.choice=known;

N.bridgeStart=(root='S1',vlan=20)=>{
 known(root,['S1','S2','S3'],'root');known(vlan,[10,20],'CのVLAN');
 return {root,vlan,time:0,tables:{S1:[],S2:[],S3:[]},transfers:[],arrivals:[],log:[]};
};
N.bridgeLinks=s=>[['S1','S2'],['S1','S3'],['S2','S3']].map(([a,b])=>({a,b,forward:a===s.root||b===s.root}));
N.bridge=(input,a)=>{
 const s=N.begin(input);
 if(a.kind==='wait'){
  s.time+=N.int(a.seconds,1,120,'進める秒数');
  for(const sw of Object.keys(s.tables))s.tables[sw]=s.tables[sw].filter(e=>e.expires>s.time);
  s.transfers=[];s.arrivals=[];return N.note(s,'時刻 '+s.time+'秒。期限に達した学習項目を外しました。期限はこの例では60秒です。');
 }
 if(a.kind!=='send')throw Error('送信か時間経過を選んでください。');
 known(a.from,['A','B','C'],'送信元');known(a.to,['A','B','C'],'宛先');
 if(a.from===a.to)throw Error('送信元と宛先は別の端末にしてください。');
 const hosts={A:{sw:'S1',vlan:10},B:{sw:'S2',vlan:10},C:{sw:'S3',vlan:s.vlan}};
 const source=hosts[a.from],links=N.bridgeLinks(s),queue=[{sw:source.sw,port:a.from}],visited=new Set();
 s.transfers=[];s.arrivals=[];
 while(queue.length){
  const e=queue.shift();if(visited.has(e.sw))throw Error('転送木の不変条件が崩れました。');visited.add(e.sw);
  const table=s.tables[e.sw];
  const prior=table.find(x=>x.host===a.from&&x.vlan===source.vlan);
  if(prior){prior.port=e.port;prior.expires=s.time+60;}else table.push({host:a.from,vlan:source.vlan,port:e.port,expires:s.time+60});
  const target=table.find(x=>x.host===a.to&&x.vlan===source.vlan&&x.expires>s.time);
  const ports=[...links.filter(x=>x.forward&&(x.a===e.sw||x.b===e.sw)).map(x=>x.a===e.sw?x.b:x.a),...Object.keys(hosts).filter(h=>hosts[h].sw===e.sw&&hosts[h].vlan===source.vlan)];
  for(const port of target?[target.port]:ports){
   if(port===e.port||!ports.includes(port))continue;
   s.transfers.push({from:e.sw,to:port,vlan:source.vlan,mode:target?'学習済みunicast':'宛先不明のflood',tag:port.startsWith('S')?'trunk / VID '+source.vlan:'access / タグを外す'});
   if(port.startsWith('S'))queue.push({sw:port,port:e.sw});else if(port===a.to)s.arrivals.push(port);
  }
 }
 return N.note(s,a.from+' → '+a.to+'：送信元の場所を学習。宛先への到着 '+s.arrivals.length+'回。別VLANへ中継するルーターはありません。');
};

N.leaseStart=()=>({time:0,state:'INIT',address:null,requestAt:null,start:null,t1:null,t2:null,expires:null,log:[]});
N.lease=(input,a)=>{
 const s=N.begin(input);
 if(a.kind==='discover'){
  if(s.state!=='INIT')throw Error('新規取得はINITから始めてください。');
  s.state='SELECTING';return N.note(s,'DISCOVERを送りました。まだアドレスを使用できません。');
 }
 if(a.kind==='offer'){
  if(s.state!=='SELECTING')throw Error('DISCOVERに対するOFFERを待つ段階ではありません。');
  s.state='OFFERED';return N.note(s,'OFFERの候補192.0.2.10を受信。候補を受け取っただけで、使用許可ではありません。');
 }
 if(a.kind==='request'){
  if(s.state!=='OFFERED')throw Error('最初のREQUESTはOFFERを選んでから送ります。');
  s.state='REQUESTING';s.requestAt=s.time;return N.note(s,'選んだ候補についてREQUESTを送信。ACKを待ちます。');
 }
 if(a.kind==='ack'){
  if(!['REQUESTING','RENEWING','REBINDING'].includes(s.state)||s.requestAt===null)throw Error('対応するREQUESTがありません。期限切れの古いACKも受理しません。');
  if(s.time>=s.requestAt+80)throw Error('このREQUESTに対する80秒の貸出し期間は既に終了しています。');
  // RFC 2131: lease expiration is computed from the request transmission time,
  // not extended merely by delaying the ACK in transit.
  s.start=s.requestAt;s.t1=s.start+40;s.t2=s.start+70;s.expires=s.start+80;s.address='192.0.2.10';s.state='BOUND';s.requestAt=null;
  N.note(s,'ACKで使用を確認。REQUEST送信時刻 '+s.start+'秒から80秒、期限は '+s.expires+'秒です。');
  if(s.time>=s.t2){s.state='REBINDING';s.requestAt=s.time;N.note(s,'既にT2を過ぎているため、どのサーバーにも届く更新REQUESTを送りました。');}
  else if(s.time>=s.t1){s.state='RENEWING';s.requestAt=s.time;N.note(s,'既にT1を過ぎているため、元サーバーへ更新REQUESTを送りました。');}
  return s;
 }
 if(a.kind==='wait'){
  const end=s.time+N.int(a.seconds,1,120,'進める秒数');
  if(s.address){
   if(s.time<s.t1&&end>=s.t1){s.state='RENEWING';s.requestAt=s.t1;N.note(s,'T1 '+s.t1+'秒：元サーバーへunicast更新。返事がなくても元の期限内は使用できます。');}
   if(s.time<s.t2&&end>=s.t2){s.state='REBINDING';s.requestAt=s.t2;N.note(s,'T2 '+s.t2+'秒：broadcastで更新。元の貸出し期限は変わりません。');}
   if(end>=s.expires){s.state='INIT';s.address=null;s.requestAt=null;N.note(s,'期限 '+s.expires+'秒：アドレスの使用を停止。ACKがなければ更新は成立していません。');}
  }
  s.time=end;return N.note(s,'現在 '+end+'秒。待つ操作はサーバーからのACKを自動配送しません。');
 }
 throw Error('未定義のDHCP操作です。');
};

N.fragmentStart=(payload=2000,mtu=620)=>{
 N.int(payload,1,2400,'データ長');N.int(mtu,68,1500,'MTU');
 const unit=Math.floor((mtu-20)/8)*8,fragments=[];
 for(let start=0;start<payload;start+=unit){const length=Math.min(unit,payload-start);fragments.push({index:fragments.length,start,length,offset:start/8,more:start+length<payload,header:K.ipv4Bytes({payload:length,id:66,offset:start/8,more:start+length<payload,ttl:63})});}
 return {payload,mtu,fragments,received:[],selected:0,log:[]};
};
N.fragmentStatus=s=>{
 const ranges=s.received.map(i=>s.fragments[i]).sort((a,b)=>a.start-b.start),holes=[];let end=0;
 for(const f of ranges){if(f.start>end)holes.push([end,f.start]);end=Math.max(end,f.start+f.length);}
 if(end<s.payload)holes.push([end,s.payload]);
 return {holes,bytes:ranges.reduce((n,f)=>n+f.length,0),last:ranges.some(f=>!f.more),complete:holes.length===0&&ranges.some(f=>!f.more)};
};
N.fragment=(input,a)=>{
 const s=N.begin(input),i=N.int(a.index,0,s.fragments.length-1,'断片番号');s.selected=i;
 if(a.kind==='inspect')return s;
 if(a.kind!=='deliver')throw Error('断片を届けるか選んでください。');
 if(s.received.includes(i))return N.note(s,'同じ断片を再受信。既に埋まった範囲を二度数えません。');
 s.received.push(i);const f=s.fragments[i],r=N.fragmentStatus(s);
 return N.note(s,'断片 '+(i+1)+'：offset '+f.offset+' × 8 = '+f.start+'byteから '+f.length+'byte。'+(r.complete?'全範囲がそろい再構成できます。':!f.more?'末尾は届きましたが、途中の穴が残っています。':'まだ届いていない範囲があります。'));
};

const dnsName=value=>{
 const n=String(value).toLowerCase().replace(/\.$/,'');
 if(!/^(www|app|new)\.example\.test$/.test(n))throw Error('この実験ではwww・app・new.example.testを選んでください。');return n;
};
N.dnsStart=()=>({time:0,records:[{name:'www.example.test',type:'CNAME',value:'app.example.test',ttl:60},{name:'app.example.test',type:'A',value:'192.0.2.10',ttl:40},{name:'app.example.test',type:'AAAA',value:'2001:db8::10',ttl:70}],cache:[],last:null,contacts:0,log:[]});
N.dns=(input,a)=>{
 const s=N.begin(input);
 if(a.kind==='wait'){
  s.time+=N.int(a.seconds,1,120,'進める秒数');s.cache=s.cache.filter(x=>x.expires>s.time);
  return N.note(s,s.time+'秒になりました。期限0のキャッシュを次の回答に使いません。');
 }
 if(a.kind==='set-a'||a.kind==='remove-a'){
  const name=dnsName(a.name);if(name.startsWith('www.'))throw Error('wwwは別名専用です。appまたはnewのAレコードを編集してください。');
  if(a.kind==='set-a'&&!/^192\.0\.2\.(10|20|30)$/.test(a.value))throw Error('この例のAレコードは192.0.2.10・20・30から選んでください。');
  s.records=s.records.filter(x=>!(x.name===name&&x.type==='A'));
  if(a.kind==='set-a')s.records.push({name,type:'A',value:a.value,ttl:40});
  return N.note(s,'権威側の '+name+' のAを'+(a.kind==='set-a'?a.value+'へ変更':'削除')+'。resolverの保存済み情報は書き換えていません。');
 }
 if(a.kind!=='query')throw Error('未定義のDNS操作です。');
 const query=dnsName(a.name),type=known(a.type,['A','AAAA'],'種別'),trail=[];let name=query,answer=null;
 s.cache=s.cache.filter(x=>x.expires>s.time);
 const save=(e,ttl)=>{s.cache=s.cache.filter(x=>!(x.name===e.name&&x.type===e.type&&x.status===e.status));s.cache.push({...e,expires:s.time+ttl});};
 for(let depth=0;depth<3;depth++){
  const negative=s.cache.find(x=>x.name===name&&(x.status==='NXDOMAIN'||x.status==='NODATA'&&x.type===type));
  if(negative){trail.push({name,type,status:negative.status,origin:'cache',remaining:negative.expires-s.time});answer={status:negative.status,value:null};break;}
  const cached=s.cache.find(x=>x.name===name&&x.status==='POSITIVE'&&(x.type===type||x.type==='CNAME'));
  if(cached){trail.push({name,type:cached.type,status:'NOERROR',value:cached.value,origin:'cache',remaining:cached.expires-s.time});if(cached.type==='CNAME'){name=cached.value;continue;}answer={status:'NOERROR',value:cached.value};break;}
  s.contacts++;
  const records=s.records.filter(x=>x.name===name),record=records.find(x=>x.type===type)||records.find(x=>x.type==='CNAME');
  if(record){save({...record,status:'POSITIVE'},record.ttl);trail.push({...record,status:'NOERROR',origin:'authority',remaining:record.ttl});if(record.type==='CNAME'){name=record.value;continue;}answer={status:'NOERROR',value:record.value};break;}
  const status=records.length?'NODATA':'NXDOMAIN';save({name,type:status==='NXDOMAIN'?'*':type,status},30);trail.push({name,type,status,origin:'authority',remaining:30});answer={status,value:null};break;
 }
 if(!answer)throw Error('教材の別名追跡上限を超えました。');
 s.last={query,type,...answer,trail};return N.note(s,query+' '+type+' → '+(answer.value||answer.status)+'。キャッシュを読んだだけでは期限を延長しません。');
};
})();
