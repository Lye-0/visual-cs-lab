import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {modelModules,browserModules,styles} from '../scripts/modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
const L=globalThis.CSL,X=L.experiences,N=X.net,K=L.curriculum,clone=X.clone;
const id=n=>'gap-'+String(n).padStart(3,'0');
const apply=(fn,state,actions)=>actions.reduce(fn,state);
function unchanged(fn,s,a){const before=clone(s);assert.throws(()=>fn(s,a));assert.deepEqual(s,before);}

test('14単元と専用操作がコミット済みの読み込みへ接続される',()=>{
 for(const module of ['experiences-network-state','experiences-network-transport','experiences-network-services','experiences-network-lessons'])assert.ok(modelModules.includes(module),module);
 for(const module of ['experiences-network-widgets','experiences-network-flow-widgets','experiences-network-application-widgets','experiences-network-inspection-widgets'])assert.ok(browserModules.includes(module),module);
 assert.ok(styles.includes('experiences-network'));
 for(let n=95;n<=108;n++)assert.ok(X.find(id(n)),id(n));
 const expected={95:'bridge-lan',96:'dhcp-lease',97:'ip-fragments',98:'dns-cache-desk',99:'tcp-byte-desk',100:'tcp-window-desk',101:'linkstate-desk',102:'little-area',104:'signal-decision',105:'http-resource-desk',106:'pcap-inspector',107:'replay-window',108:'network-config-desk'};
 for(const [n,kind]of Object.entries(expected))assert.ok(X.find(id(Number(n))).chapters.some(ch=>ch.activities.some(a=>a.kind===kind)),kind);
 assert.ok(X.find(id(105)).chapters.some(ch=>ch.activities.some(a=>a.kind==='stream-hol')));
});
test('全ての個別章と比較条件が実際の計算へ対応する',async t=>{
 for(let n=95;n<=108;n++)for(const ch of X.find(id(n)).chapters){
  assert.ok(ch.paragraphs.join('').length>=30,id(n)+'/'+ch.id);
  for(const [i,a]of ch.activities.entries())if(['inspect','ledger','timeline','editor','compare'].includes(a.kind))await t.test(id(n)+'/'+ch.id+'/'+i,async()=>{
   const lab=L.labs.find(l=>l.id===(a.model||id(n)));
   for(const example of a.kind==='compare'?a.examples:[{patch:{}},...(a.examples||[])]){
    const params={...clone(lab.defaults),...a.patch,...example.patch};
    for(const c of lab.controls){
     if(c.type==='select')assert.ok(c.options.some(o=>o.value===params[c.key]),c.key+': '+params[c.key]);
     if(c.type==='range'){const v=params[c.key];assert.ok(v>=c.min&&v<=c.max,c.key);assert.ok(Math.abs((v-c.min)/c.step-Math.round((v-c.min)/c.step))<1e-8,c.key);}
    }
    const r=await L.run(lab,params);assert.ok(r.frames.length>0);
   }
  });
 }
});
test('MAC表は送信元をVID別に覚え、返信後のunicastが絞られる',()=>{
 let s=N.bridgeStart();s=N.bridge(s,{kind:'send',from:'A',to:'B'});const flooded=s.transfers.length;
 assert.deepEqual(s.arrivals,['B']);assert.ok(s.tables.S1.some(e=>e.host==='A'&&e.vlan===10&&e.port==='A'));assert.ok(!s.tables.S1.some(e=>e.host==='B'));
 s=N.bridge(s,{kind:'send',from:'B',to:'A'});s=N.bridge(s,{kind:'send',from:'A',to:'B'});
 assert.ok(s.transfers.length<flooded);assert.ok(s.transfers.every(e=>e.mode==='学習済みunicast'));
 s=N.bridge(s,{kind:'wait',seconds:60});assert.ok(Object.values(s.tables).every(rows=>rows.length===0));
 s=N.bridge(s,{kind:'send',from:'A',to:'C'});assert.deepEqual(s.arrivals,[]);
 assert.deepEqual(N.bridge(N.bridgeStart('S3',10),{kind:'send',from:'A',to:'C'}).arrivals,['C']);
});
test('どのrootでも有効な木は2リンクで、全同VLAN端末へ1回だけ届く',()=>{
 for(const root of ['S1','S2','S3'])for(const from of ['A','B','C'])for(const to of ['A','B','C'])if(from!==to){const s=N.bridgeStart(root,10);assert.equal(N.bridgeLinks(s).filter(e=>e.forward).length,2);assert.deepEqual(N.bridge(s,{kind:'send',from,to}).arrivals,[to]);}
});
const leased=()=>apply(N.lease,N.leaseStart(),['discover','offer','request','ack'].map(kind=>({kind})));
test('OFFERは使用許可ではなく、REQUESTに対応するACKで確定する',()=>{
 let s=N.leaseStart();unchanged(N.lease,s,{kind:'ack'});s=N.lease(s,{kind:'discover'});s=N.lease(s,{kind:'offer'});assert.equal(s.address,null);
 s=N.lease(s,{kind:'request'});s=N.lease(s,{kind:'wait',seconds:10});s=N.lease(s,{kind:'ack'});assert.equal(s.start,0);assert.equal(s.expires,80);assert.equal(s.time,10);
});
test('T1・T2を越えても応答がなければ元の期限で停止する',()=>{
 let s=leased();s=N.lease(s,{kind:'wait',seconds:40});assert.equal(s.state,'RENEWING');assert.equal(s.expires,80);
 s=N.lease(s,{kind:'wait',seconds:30});assert.equal(s.state,'REBINDING');assert.equal(s.requestAt,70);
 s=N.lease(s,{kind:'wait',seconds:10});assert.equal(s.state,'INIT');assert.equal(s.address,null);unchanged(N.lease,s,{kind:'ack'});
});
test('更新ACKは対応する更新REQUESTの時刻に結び付ける',()=>{
 let s=N.lease(leased(),{kind:'wait',seconds:40});s=N.lease(s,{kind:'wait',seconds:5});s=N.lease(s,{kind:'ack'});assert.equal(s.start,40);assert.equal(s.expires,120);assert.equal(s.t1,80);
});
test('IPv4のoffsetは8byte単位で、末尾より先に穴を確認する',()=>{
 let s=N.fragmentStart();assert.deepEqual(s.fragments.map(f=>[f.offset,f.length,f.more]),[[0,600,true],[75,600,true],[150,600,true],[225,200,false]]);
 assert.ok(s.fragments.every(f=>K.internetChecksum(f.header)===0));
 s=N.fragment(s,{kind:'deliver',index:3});assert.deepEqual(N.fragmentStatus(s).holes,[[0,1800]]);assert.equal(N.fragmentStatus(s).complete,false);
 for(const index of [2,0,1])s=N.fragment(s,{kind:'deliver',index});assert.equal(N.fragmentStatus(s).complete,true);
 s=N.fragment(s,{kind:'deliver',index:1});assert.equal(N.fragmentStatus(s).bytes,2000);
});
test('断片の境界値でも全データを過不足なく覆いIP長はMTU以下',()=>{
 for(const payload of [1,7,8,599,600,601,2400])for(const mtu of [68,80,620,1500]){const s=N.fragmentStart(payload,mtu);assert.equal(s.fragments.reduce((n,f)=>n+f.length,0),payload);assert.ok(s.fragments.every(f=>f.length+20<=mtu&&Number.isInteger(f.offset)&&(!f.more||f.length%8===0)));}
});
test('DNSではCNAMEとAの期限が独立し、参照だけで延びない',()=>{
 let s=N.dnsStart();s=N.dns(s,{kind:'query',name:'www.example.test',type:'A'});assert.equal(s.last.value,'192.0.2.10');assert.equal(s.contacts,2);
 s=N.dns(s,{kind:'set-a',name:'app.example.test',value:'192.0.2.20'});s=N.dns(s,{kind:'wait',seconds:39});s=N.dns(s,{kind:'query',name:'www.example.test',type:'A'});assert.equal(s.last.value,'192.0.2.10');assert.equal(s.contacts,2);
 s=N.dns(s,{kind:'wait',seconds:1});s=N.dns(s,{kind:'query',name:'www.example.test',type:'A'});assert.equal(s.last.value,'192.0.2.20');assert.deepEqual(s.last.trail.map(t=>t.origin),['cache','authority']);
 assert.equal(s.cache.find(r=>r.type==='CNAME').expires,60);
});
test('NXDOMAINは名前全体、NODATAはその種類の否定を保存する',()=>{
 let s=N.dnsStart();s=N.dns(s,{kind:'query',name:'new.example.test',type:'A'});assert.equal(s.last.status,'NXDOMAIN');
 s=N.dns(s,{kind:'set-a',name:'new.example.test',value:'192.0.2.30'});s=N.dns(s,{kind:'query',name:'new.example.test',type:'AAAA'});assert.equal(s.last.status,'NXDOMAIN');
 s=N.dns(s,{kind:'wait',seconds:30});s=N.dns(s,{kind:'query',name:'new.example.test',type:'AAAA'});assert.equal(s.last.status,'NODATA');s=N.dns(s,{kind:'query',name:'new.example.test',type:'A'});assert.equal(s.last.value,'192.0.2.30');
});
test('TCPは後続を受信しても穴の先へ累積ACKを進めない',()=>{
 let s=N.tcpStart();for(const index of [0,1,2,3])s=N.tcp(s,{kind:'send',index});
 const ids=s.data.map(p=>p.id);for(const i of [0,2,3])s=N.tcp(s,{kind:'deliver-data',id:ids[i]});
 let v=N.tcpView(s);assert.equal(v.next,1007);assert.equal(v.application,'abcdef');assert.deepEqual(v.ranges,[[1013,1025]]);assert.equal(s.una,1001);
 s=N.tcp(s,{kind:'deliver-ack',id:s.acks[0].id});assert.equal(s.una,1007);
 s=N.tcp(s,{kind:'deliver-data',id:ids[1]});assert.equal(N.tcpView(s).application,s.text);assert.equal(s.una,1007);
 const latest=s.acks.at(-1).id;s=N.tcp(s,{kind:'deliver-ack',id:latest});assert.equal(s.una,1025);
 s=N.tcp(s,{kind:'deliver-ack',id:s.acks[0].id});assert.equal(s.una,1025);
});
test('ACK喪失と同じSEQの再送は、受信済みbyteを二重にしない',()=>{
 let s=N.tcp(N.tcpStart(),{kind:'send',index:0});s=N.tcp(s,{kind:'deliver-data',id:s.data[0].id});s=N.tcp(s,{kind:'drop-ack',id:s.acks[0].id});
 s=N.tcp(s,{kind:'send',index:0});s=N.tcp(s,{kind:'deliver-data',id:s.data[0].id});assert.equal(s.received.filter(Boolean).length,6);assert.equal(s.acks[0].ack,1007);assert.equal(s.una,1001);
});
test('新しい送信余裕はmin(rwnd,cwnd)からflightを差し引く',()=>{
 let s=N.windowStart();assert.equal(N.windowAllowance(s),2);s=N.window(s,{kind:'send',count:2});assert.equal(N.windowAllowance(s),0);unchanged(N.window,s,{kind:'send',count:1});
 s=N.window(s,{kind:'rwnd',value:0});s=N.window(s,{kind:'cwnd',value:12});assert.equal(N.windowAllowance(s),0);s=N.window(s,{kind:'rwnd',value:8});assert.equal(N.windowAllowance(s),4);
});
test('物理切断だけではAの地図は更新されず、広告の配送で変わる',()=>{
 let s=N.routeStart();assert.equal(N.routeView(s,'A').distance,3);s=N.route(s,{kind:'link',up:false});assert.equal(N.routeView(s,'A').broken,true);assert.equal(s.db.A.C.seq,1);assert.equal(s.db.C.C.seq,2);
 const p=s.pending.find(p=>p.from==='C'&&p.to==='A');s=N.route(s,{kind:'deliver',id:p.id});assert.equal(s.db.A.C.seq,2);assert.equal(N.routeView(s,'A').distance,5);assert.equal(N.routeView(s,'A').broken,false);
});
test('遅れた古い広告は、復旧後の新しい版を巻き戻さない',()=>{
 let s=N.route(N.routeStart(),{kind:'link',up:false});const old=s.pending.find(p=>p.from==='C'&&p.to==='A');s=N.route(s,{kind:'link',up:true});const fresh=s.pending.find(p=>p.from==='C'&&p.to==='A'&&p.record.seq===3);
 s=N.route(s,{kind:'deliver',id:fresh.id});s=N.route(s,{kind:'deliver',id:old.id});assert.equal(s.db.A.C.seq,3);assert.equal(N.routeView(s,'A').distance,3);
});
test('Littleの面積は仕事別でも時間帯別でも10、観測長6',()=>{
 const v=N.queueView(N.queueStart());assert.deepEqual(v.jobs.map(j=>j.stay),[2,4,4]);assert.equal(v.area,10);assert.equal(v.T,6);assert.equal(v.intervals.reduce((n,x)=>n+(x.end-x.start)*x.count,0),10);assert.ok(Math.abs(v.L-v.lambda*v.W)<1e-12);
 let s=N.queue(N.queueStart(),{kind:'clear'});assert.equal(N.queueView(s).T,0);s=N.queue(s,{kind:'add',arrival:5,service:2});assert.equal(N.queueView(s).L,2/7);
});
test('信号点の平均energyは1、境界の同距離を正解へ隠さない',()=>{
 for(const mode of ['BPSK','QPSK','16QAM']){const p=N.constellation(mode);assert.ok(Math.abs(p.reduce((n,p)=>n+p.z[0]**2+p.z[1]**2,0)/p.length-1)<1e-12);}
 let s=N.signalStart();s=N.signal(s,{kind:'move',z:[0,0]});assert.equal(N.signalView(s).nearest.length,4);assert.equal(N.signalView(s).error,null);
 s=N.signal(s,{kind:'move',z:[-1,-1]});assert.equal(N.signalView(s).nearest[0].bits,'11');assert.equal(s.sent,'00');
});
test('同じ到着順でもTCP全体とQUIC stream内の順序待ちは異なる',()=>{
 let h2=N.streamStart('h2'),h3=N.streamStart('h3');for(const id of [1,3,4,5,6]){h2=N.stream(h2,{kind:'deliver',id});h3=N.stream(h3,{kind:'deliver',id});}
 assert.deepEqual(N.streamView(h2).filter(x=>x.delivered).map(x=>x.id),[1]);assert.deepEqual(N.streamView(h3).filter(x=>x.delivered).map(x=>x.id),[1,3,4,6]);
 h3=N.stream(h3,{kind:'deliver',id:2});assert.equal(N.streamView(h3).filter(x=>x.delivered).length,6);
});
test('再演検査は認証されない大きいSEQでwindowを動かさない',()=>{
 let s=N.replayStart();for(const sequence of [1,2,2,4,3])s=N.replay(s,{kind:'receive',sequence,authenticated:true});assert.deepEqual(s.decisions.map(d=>d.accepted),[true,true,false,true,true]);
 const seen=s.seen.slice();s=N.replay(s,{kind:'receive',sequence:99,authenticated:false});assert.equal(s.high,4);assert.deepEqual(s.seen,seen);
 s=N.replay(s,{kind:'receive',sequence:5,authenticated:true});s=N.replay(s,{kind:'receive',sequence:1,authenticated:true});assert.equal(s.decisions.at(-1).accepted,false);
});
test('HTTPのPOST・PUT・DELETEは資源の残り方から区別する',()=>{
 let s=N.httpStart();for(let i=0;i<2;i++)s=N.http(s,{kind:'request',method:'POST',path:'/items',text:'new'});assert.equal(Object.keys(s.resources).length,3);
 const request={kind:'request',method:'PUT',path:'/items/1',text:'changed'};s=N.http(s,request);const before=clone(s.resources);s=N.http(s,request);assert.deepEqual(s.resources,before);
 s=N.http(s,{kind:'request',method:'DELETE',path:'/items/1'});assert.equal(s.last.status,204);s=N.http(s,{kind:'request',method:'DELETE',path:'/items/1'});assert.equal(s.last.status,404);assert.equal(Object.keys(s.resources).length,2);
});
test('条件付きGETはETagを照合し、HEADも304も本文を送らない',()=>{
 let s=N.httpStart();s=N.http(s,{kind:'request',method:'GET',path:'/items/1'});const tag=s.last.headers.ETag;assert.deepEqual(s.last.body,{text:'hello'});
 s=N.http(s,{kind:'request',method:'GET',path:'/items/1',ifNoneMatch:tag});assert.equal(s.last.status,304);assert.equal(s.last.body,null);
 s=N.http(s,{kind:'request',method:'HEAD',path:'/items/1'});assert.equal(s.last.status,200);assert.equal(s.last.body,null);
});
test('captureのSEQ・ACKを実byteから読む。欄選択は記録を改変しない',()=>{
 let s=N.captureStart();const p=N.capturePackets(s)[0],seq=N.captureFields(p).find(f=>f.id==='seq'),ack=N.captureFields(p).find(f=>f.id==='ack');
 assert.deepEqual([seq.start,seq.end],[38,42]);assert.deepEqual([ack.start,ack.end],[42,46]);assert.equal(p.seq,1000);
 const original=s.bytes.slice();s=N.capture(s,{kind:'field',field:'seq'});assert.deepEqual(s.bytes,original);
 s=N.capture(s,{kind:'tamper'});assert.equal(N.capturePackets(s)[0].checksum,'不一致');
 unchanged(N.capture,s,{kind:'load',hex:'GG'});
});
test('機器設定の変更は古い結果を消し、DNS遮断を戻すと表示できる',()=>{
 let s=N.config(N.configStart(),{kind:'run'});assert.equal(s.result.success,true);
 s=N.config(s,{kind:'rules',dns:false,web:true,stateful:true});assert.equal(s.result,null);assert.equal(s.dirty,true);
 s=N.config(s,{kind:'run'});assert.equal(s.result.success,false);assert.ok(s.result.records.some(r=>r.stage==='Firewall'));
 s=N.config(s,{kind:'rules',dns:true,web:true,stateful:true});s=N.config(s,{kind:'run'});assert.equal(s.result.success,true);
});
test('誤操作は元の状態を部分的にも変更しない',()=>{
 for(const [fn,s,a]of [
  [N.bridge,N.bridgeStart(),{kind:'send',from:'A',to:'A'}],
  [N.fragment,N.fragmentStart(),{kind:'deliver',index:99}],
  [N.dns,N.dnsStart(),{kind:'set-a',name:'www.example.test',value:'192.0.2.10'}],
  [N.tcp,N.tcpStart(),{kind:'deliver-data',id:99}],
  [N.signal,N.signalStart(),{kind:'move',z:[Infinity,0]}],
  [N.http,N.httpStart(),{kind:'request',method:'GET',path:'https://outside.test'}],
  [N.config,N.configStart(),{kind:'device',index:0,ip:'invalid',prefix:24,lan:'LAN-A'}]
 ])unchanged(fn,s,a);
});
test('新しい実験は外部通信や永続保存や任意コード実行を追加しない',async()=>{
 const names=[...modelModules,...browserModules].filter(n=>n.startsWith('experiences-network-'));
 for(const name of new Set(names)){const src=await readFile(new URL('../src/'+name+'.js',import.meta.url),'utf8');assert.doesNotMatch(src,/\b(?:fetch|eval|WebSocket)\s*\(|localStorage|indexedDB|new\s+Function\s*\(/,name);}
});
