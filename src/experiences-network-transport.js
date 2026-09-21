/* Bounded protocol workspaces, not production protocol implementations. */
(() => {
'use strict';
const L=CSL,X=L.experiences,N=X.net,copy=X.clone;
const {int,begin,note,choice}=N;
N.tcpStart=()=>({text:'abcdefghijklmnopqrstuvwx',base:1001,mss:6,sent:[0,0,0,0],received:Array(24).fill(false),data:[],acks:[],serial:0,una:1001,log:[]});
N.tcpView=s=>{
 let n=0;while(n<s.received.length&&s.received[n])n++;
 const ranges=[];for(let i=n;i<s.received.length;){if(!s.received[i]){i++;continue;}const first=i;while(i<s.received.length&&s.received[i])i++;ranges.push([s.base+first,s.base+i]);}
 return {next:s.base+n,application:s.text.slice(0,n),ranges,confirmed:s.una-s.base};
};
N.tcp=(input,a)=>{
 const s=begin(input);
 if(a.kind==='send'){
  const index=int(a.index,0,3,'segment');s.sent[index]++;s.data.push({id:++s.serial,index});
  return note(s,'SEQ '+(s.base+index*s.mss)+'から6byteを'+(s.sent[index]>1?'再送':'送信')+'。同じbyteの再送でもSEQを新しい番号にしません。');
 }
 if(a.kind==='deliver-data'||a.kind==='drop-data'){
  const at=s.data.findIndex(x=>x.id===a.id);if(at<0)throw Error('配送待ちのデータを選んでください。');const packet=s.data.splice(at,1)[0];
  if(a.kind==='drop-data')return note(s,'途中でデータを失いました。受信側のbyte列は変わりません。');
  for(let j=0;j<s.mss;j++)s.received[packet.index*s.mss+j]=true;
  const v=N.tcpView(s);s.acks.push({id:++s.serial,ack:v.next,ranges:copy(v.ranges)});
  return note(s,'データを受信。累積ACK '+v.next+'を生成しましたが、まだ送信側へ届いていません。');
 }
 if(a.kind==='deliver-ack'||a.kind==='drop-ack'){
  const at=s.acks.findIndex(x=>x.id===a.id);if(at<0)throw Error('配送待ちのACKを選んでください。');const ack=s.acks.splice(at,1)[0];
  if(a.kind==='drop-ack')return note(s,'ACKだけを失いました。受信済みのbyteは消えません。');
  const before=s.una;s.una=Math.max(s.una,ack.ack);
  return note(s,'ACK '+ack.ack+'を送信側へ配送。未確認先頭は '+before+' → '+s.una+'。古いACKで後ろへ戻しません。');
 }
 throw Error('未定義のTCP操作です。');
};
N.windowStart=(rwnd=8,cwnd=4,flight=2)=>({rwnd:int(rwnd,0,12,'rwnd'),cwnd:int(cwnd,1,12,'cwnd'),flight:int(flight,0,12,'in flight'),log:[]});
N.windowAllowance=s=>Math.max(0,Math.min(s.rwnd,s.cwnd)-s.flight);
N.window=(input,a)=>{
 const s=begin(input);
 if(a.kind==='send'){const n=int(a.count,1,12,'送る単位数');if(n>N.windowAllowance(s))throw Error('両windowから未確認の量を引いた余裕が足りません。');s.flight+=n;return note(s,n+'単位を送信。未確認の量を両windowの制約から差し引きます。');}
 if(a.kind==='ack'){if(s.flight===0)throw Error('未確認のデータがありません。');s.flight--;return note(s,'1単位が新しいACKで確認されました。通知rwndとcwndは同じという条件の計算です。');}
 if(a.kind==='rwnd'){s.rwnd=int(a.value,0,12,'新しいrwnd');return note(s,'受信側から通知されたrwndだけを変えました。');}
 if(a.kind==='cwnd'){s.cwnd=int(a.value,1,12,'新しいcwnd');return note(s,'送信側のcwndだけを変えました。既に飛んでいる量は消しません。');}
 throw Error('未定義のwindow操作です。');
};
const routers=['A','B','C','D'];
const adjacent=(s,id)=>s.links.filter(e=>e.up&&(e.a===id||e.b===id)).map(e=>({id:e.a===id?e.b:e.a,cost:e.cost}));
N.routeStart=()=>{
 const links=[{a:'A',b:'B',cost:1,up:true},{a:'A',b:'C',cost:2,up:true},{a:'B',b:'C',cost:1,up:true},{a:'B',b:'D',cost:4,up:true},{a:'C',b:'D',cost:1,up:true}];
 const s={links,db:{},pending:[],serial:0,selected:'A',log:[]};
 const all=Object.fromEntries(routers.map(id=>[id,{origin:id,seq:1,neighbors:adjacent(s,id)}]));
 for(const id of routers)s.db[id]=copy(all);return s;
};
N.routeView=(s,id=s.selected)=>{
 choice(id,routers,'見るルーター');const db=s.db[id],edges=[];
 for(const a of routers)for(const e of db[a].neighbors)if(a<e.id&&db[e.id].neighbors.some(x=>x.id===a))edges.push({a,b:e.id,cost:e.cost});
 const result=L.shortest(routers,edges,id,'D'),path=result.path;
 return {edges,path,distance:result.dist.D,broken:path.some((node,i)=>i&&!s.links.some(e=>e.up&&[e.a,e.b].includes(node)&&[e.a,e.b].includes(path[i-1])))};
};
N.route=(input,a)=>{
 const s=begin(input);
 const enqueue=(from,record,except='')=>{for(const n of adjacent(s,from))if(n.id!==except)s.pending.push({id:++s.serial,from,to:n.id,record:copy(record)});};
 if(a.kind==='select'){s.selected=choice(a.router,routers,'見るルーター');return s;}
 if(a.kind==='link'){
  if(typeof a.up!=='boolean')throw Error('接続するか切断するかを指定してください。');const link=s.links.find(e=>e.a==='C'&&e.b==='D');
  if(link.up===a.up)throw Error('C-Dは既にその接続状態です。');link.up=a.up;
  for(const origin of ['C','D']){const record={origin,seq:s.db[origin][origin].seq+1,neighbors:adjacent(s,origin)};s.db[origin][origin]=record;enqueue(origin,record);}
  return note(s,'物理リンクC-Dを'+(a.up?'復旧':'切断')+'。直接知ったCとDだけが新しい広告を作りました。AとBの地図はまだ更新されていません。');
 }
 if(a.kind==='deliver'){
  const index=s.pending.findIndex(p=>p.id===a.id);if(index<0)throw Error('配送する広告を選んでください。');const p=s.pending.splice(index,1)[0];
  if(!adjacent(s,p.from).some(x=>x.id===p.to))return note(s,'配送中にリンクが切れていたため、広告を失いました。');
  const current=s.db[p.to][p.record.origin];
  if(current.seq>=p.record.seq)return note(s,p.to+'は '+p.record.origin+' の古い／重複広告v'+p.record.seq+'を採用しません。');
  s.db[p.to][p.record.origin]=copy(p.record);enqueue(p.to,p.record,p.from);
  return note(s,p.from+' → '+p.to+'：'+p.record.origin+'の広告v'+p.record.seq+'を採用して隣へ転送します。');
 }
 throw Error('未定義のリンク状態操作です。');
};
N.queueStart=()=>({jobs:[{arrival:0,service:2},{arrival:1,service:3},{arrival:2,service:1}],selected:0,log:[]});
N.queueView=s=>{
 let end=0;const jobs=s.jobs.map((job,i)=>{const start=Math.max(end,job.arrival);end=start+job.service;return {...job,index:i,start,end,stay:end-job.arrival};});
 const area=jobs.reduce((n,j)=>n+j.stay,0),times=[...new Set([0,...jobs.flatMap(j=>[j.arrival,j.end])])].sort((a,b)=>a-b);
 const intervals=times.slice(0,-1).map((start,i)=>({start,end:times[i+1],count:jobs.filter(j=>j.arrival<=start&&j.end>start).length}));
 return {jobs,T:end,area,W:jobs.length?area/jobs.length:0,lambda:end?jobs.length/end:0,L:end?area/end:0,intervals};
};
N.queue=(input,a)=>{
 const s=begin(input);
 if(a.kind==='select'){s.selected=int(a.index,0,s.jobs.length-1,'仕事');return s;}
 if(a.kind==='clear'){s.jobs=[];s.selected=0;return note(s,'仕事を空にしました。到着時刻と処理時間を自分で入れられます。');}
 if(a.kind!=='add')throw Error('仕事を追加または選択してください。');
 if(s.jobs.length>=8)throw Error('仕事は8個までです。');
 const arrival=int(a.arrival,0,20,'到着時刻'),service=int(a.service,1,8,'処理時間');
 if(s.jobs.length&&arrival<s.jobs.at(-1).arrival)throw Error('到着時刻は直前の仕事以降にしてください。同時到着は追加順です。');
 s.jobs.push({arrival,service});s.selected=s.jobs.length-1;return note(s,'仕事'+s.jobs.length+'を追加。最後の仕事が終わるまでを共通の観測区間にします。');
};
N.constellation=mode=>{
 choice(mode,['BPSK','QPSK','16QAM'],'変調');const k=mode==='BPSK'?1:mode==='QPSK'?2:4;
 return Array.from({length:2**k},(_,i)=>{const bits=i.toString(2).padStart(k,'0'),gray=[-3,-1,3,1];return {bits,z:k===1?[i?-1:1,0]:k===2?[bits[0]==='0'?Math.SQRT1_2:-Math.SQRT1_2,bits[1]==='0'?Math.SQRT1_2:-Math.SQRT1_2]:[gray[parseInt(bits.slice(0,2),2)]/Math.sqrt(10),gray[parseInt(bits.slice(2),2)]/Math.sqrt(10)]};});
};
N.signalStart=(mode='QPSK')=>{const points=N.constellation(mode);return {mode,sent:points[0].bits,received:points[0].z.slice(),log:[]};};
N.signalView=s=>{
 const distances=N.constellation(s.mode).map(p=>({...p,d2:p.z.reduce((n,x,i)=>n+(x-s.received[i])**2,0)}));
 const best=Math.min(...distances.map(p=>p.d2)),nearest=distances.filter(p=>Math.abs(p.d2-best)<1e-10);
 return {distances,nearest,error:nearest.length===1?nearest[0].bits!==s.sent:null};
};
N.signal=(input,a)=>{
 const s=begin(input);
 if(a.kind==='send'){const p=N.constellation(s.mode).find(x=>x.bits===a.bits);if(!p)throw Error('送信する信号点を選んでください。');s.sent=p.bits;s.received=p.z.slice();return note(s,p.bits+'を送信。外乱0の位置から調べます。');}
 if(a.kind==='move'){
  if(!Array.isArray(a.z)||a.z.length!==2||a.z.some(x=>!Number.isFinite(x)||Math.abs(x)>2))throw Error('IとQは−2〜2の有限な値です。');
  s.received=a.z.slice();return note(s,'受信点だけを移動。送信bitは'+s.sent+'のままです。これは外乱の手動指定で、BERの測定ではありません。');
 }
 throw Error('未定義の信号操作です。');
};
N.streamStart=(protocol='h2')=>({protocol:choice(protocol,['h2','h3'],'転送方式'),received:[],log:[]});
N.streamUnits=()=>Array.from({length:6},(_,i)=>({id:i+1,stream:['A','B','C'][i%3],offset:Math.floor(i/3)}));
N.streamView=s=>{
 const units=N.streamUnits(),delivered=[];
 if(s.protocol==='h2'){for(const u of units){if(!s.received.includes(u.id))break;delivered.push(u.id);}}
 else{const next={A:0,B:0,C:0};for(const u of units)if(s.received.includes(u.id)&&u.offset===next[u.stream]){delivered.push(u.id);next[u.stream]++;}}
 return units.map(u=>({...u,received:s.received.includes(u.id),delivered:delivered.includes(u.id)}));
};
N.stream=(input,a)=>{
 const s=begin(input);if(a.kind!=='deliver')throw Error('転送単位を選んで届けてください。');const id=int(a.id,1,6,'転送単位');
 if(!s.received.includes(id))s.received.push(id);
 return note(s,'転送単位'+id+'を受信。アプリへ渡せるもの：'+(N.streamView(s).filter(u=>u.delivered).map(u=>u.stream+u.offset).join(', ')||'まだなし')+'。');
};
N.replayStart=(width=4)=>({width:int(width,2,8,'window幅'),high:0,seen:[],decisions:[],log:[]});
N.replay=(input,a)=>{
 const s=begin(input),sequence=int(a.sequence,1,99,'SEQ');if(a.kind!=='receive'||typeof a.authenticated!=='boolean')throw Error('認証結果とSEQを指定してください。');
 let reason,accepted=false;
 if(!a.authenticated)reason='認証失敗：windowを変更しない';
 else if(sequence<=s.high-s.width)reason='windowより古い';
 else if(s.seen.includes(sequence))reason='受理済みの番号';
 else{accepted=true;s.high=Math.max(s.high,sequence);s.seen=s.seen.filter(x=>x>s.high-s.width);s.seen.push(sequence);reason='未受信番号を受理';}
 s.decisions.push({sequence,authenticated:a.authenticated,accepted,reason,high:s.high});return note(s,'SEQ '+sequence+'：'+reason+'。');
};
})();
