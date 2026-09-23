/* Direct state for c12-deadlock and c12-quorum.
 * Pure teaching state only: no real locks, machines, network or persistence. */
(() => {
'use strict';
const X=CSL.experiences,D=X.concurrencyReview={};
const clone=X.clone;
const integer=(v,min,max,label='値')=>{if(!Number.isInteger(v)||v<min||v>max)throw Error(label+'は'+min+'〜'+max+'の整数です。');return v;};
const choice=(v,values)=>{if(!values.includes(v))throw Error('選択を確認してください。');return v;};
const begin=s=>{if(s.log.length>=120)throw Error('この小例は120操作までです。最初から試してください。');return clone(s);};
const note=(s,text)=>{s.log.push(text);return s;};

D.deadlockStart=(mode='opposite')=>{
 choice(mode,['opposite','same']);
 const order=mode==='opposite'?{P1:['A','B'],P2:['B','A']}:{P1:['A','B'],P2:['A','B']};
 return {mode,order,holders:{A:null,B:null},actors:{P1:{pc:0,waiting:null,status:'ready'},P2:{pc:0,waiting:null,status:'ready'}},events:[],selected:-1,log:[]};
};
D.deadlockView=s=>{
 const holds={P1:[],P2:[]};for(const [resource,owner]of Object.entries(s.holders))if(owner)holds[owner].push(resource);
 const waits=[];for(const id of ['P1','P2']){const w=s.actors[id].waiting;if(w&&s.holders[w]&&s.holders[w]!==id)waits.push({from:id,to:s.holders[w],resource:w});}
 const deadlock=waits.length===2&&waits[0].from===waits[1].to&&waits[1].from===waits[0].to;
 const selected=s.selected>=0?s.events[s.selected]:null;
 return {holds,waits,deadlock,selected,complete:Object.values(s.actors).every(a=>['done','aborted'].includes(a.status)),
  conditions:{mutualExclusion:true,holdAndWait:Object.keys(holds).some(id=>holds[id].length&&s.actors[id].waiting),noPreemption:true,circularWait:deadlock}};
};
D.deadlock=(input,a)=>{
 if(a.kind==='mode')return D.deadlockStart(a.value);
 const s=begin(input),id=choice(a.actor,['P1','P2']),actor=s.actors[id];
 if(a.kind==='event'){s.selected=integer(a.index,0,s.events.length-1,'記録');return s;}
 if(a.kind==='abort'){
  if(['done','aborted'].includes(actor.status))throw Error(id+'は既に終了しています。');
  const released=[];for(const r of ['A','B'])if(s.holders[r]===id){s.holders[r]=null;released.push(r);}
  actor.waiting=null;actor.status='aborted';
  const event={actor,kind:'abort',resource:null,text:id+'を中断し、保持していた'+(released.join('・')||'資源なし')+'を解放しました。これは回復操作で、デッドロックを事前に防ぐ規則ではありません。',snapshot:null};
  event.snapshot={holders:clone(s.holders),actors:clone(s.actors)};s.events.push(event);s.selected=s.events.length-1;return note(s,event.text);
 }
 if(a.kind!=='step')throw Error('進める処理を選んでください。');
 if(['done','aborted'].includes(actor.status))throw Error(id+'は既に終了しています。');
 let kind,resource=null,text;
 if(actor.pc<2){
  resource=s.order[id][actor.pc];
  const owner=s.holders[resource];
  if(owner===null||owner===id){s.holders[resource]=id;actor.pc++;actor.waiting=null;actor.status='holding';kind='acquire';text=id+'が資源'+resource+'を取得しました。';}
  else{actor.waiting=resource;actor.status='waiting';kind='wait';text=id+'は資源'+resource+'を要求しましたが、'+owner+'が保持中なので待ちます。';}
 }else{
  const released=[];for(const r of ['A','B'])if(s.holders[r]===id){s.holders[r]=null;released.push(r);}
  actor.pc=3;actor.waiting=null;actor.status='done';kind='release';text=id+'が処理を終え、'+released.join('・')+'を解放しました。待っている処理は自動取得せず、次の操作で再び要求します。';
 }
 const event={actor:id,kind,resource,text,snapshot:{holders:clone(s.holders),actors:clone(s.actors)}};s.events.push(event);s.selected=s.events.length-1;return note(s,text);
};

D.quorumStart=(preset='majority')=>{
 choice(preset,['majority','disjoint']);
 return preset==='majority'
  ?{preset,n:5,q:3,setA:[true,true,true,false,false],setB:[false,false,true,true,true],failed:[false,false,false,false,false],active:'A',log:[]}
  :{preset,n:5,q:2,setA:[true,true,false,false,false],setB:[false,false,true,true,false],failed:[false,false,false,false,false],active:'A',log:[]};
};
D.quorumView=s=>{
 const ids=Array.from({length:s.n},(_,i)=>i),members=set=>ids.filter(i=>set[i]),a=members(s.setA),b=members(s.setB),intersection=a.filter(i=>s.setB[i]);
 const live=ids.filter(i=>!s.failed[i]),ack=set=>members(set).filter(i=>!s.failed[i]);
 const minIntersection=Math.max(0,2*s.q-s.n);
 return {a,b,intersection,live,ackA:ack(s.setA),ackB:ack(s.setB),validA:a.length===s.q,validB:b.length===s.q,
  guaranteed:minIntersection>0,minIntersection,available:live.length>=s.q,majority:Math.floor(s.n/2)+1};
};
D.quorum=(input,a)=>{
 if(a.kind==='preset')return D.quorumStart(a.value);
 const s=begin(input);
 if(a.kind==='active'){s.active=choice(a.value,['A','B']);return s;}
 if(a.kind==='member'){
  const index=integer(a.index,0,s.n-1,'ノード'),key=s.active==='A'?'setA':'setB';s[key][index]=!s[key][index];
  return note(s,'集合'+s.active+'のノード'+(index+1)+'を'+(s[key][index]?'含めました。':'外しました。')+'集合の大きさがqと一致するかを確認してください。');
 }
 if(a.kind==='failure'){
  const index=integer(a.index,0,s.n-1,'ノード');s.failed[index]=!s.failed[index];
  return note(s,'ノード'+(index+1)+'を'+(s.failed[index]?'停止':'復帰')+'にしました。集合の交差条件は変えず、応答可能な台数だけが変わります。');
 }
 if(a.kind==='q'){
  s.q=integer(a.value,1,s.n,'必要数q');s.preset='custom';
  return note(s,'必要数qを'+s.q+'に変更しました。選択済みの二つの集合はそのままなので、q個の集合になっているかを別に確認します。');
 }
 throw Error('未定義のクォーラム操作です。');
};
})();