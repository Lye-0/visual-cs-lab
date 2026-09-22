/* Condition-variable scheduling and causal clocks. Pure, bounded operations.
 * Event order in this teaching console is not a global physical clock. */
(() => {
'use strict';
const X=CSL.experiences,M=X.os;
const next=s=>{if(s.log.length>=64)throw Error('64操作までです。最初に戻してください。');return X.clone(s);};
const note=(s,text)=>{s.log.push(text);return s;};
M.conditionStart=(guard='while',release=true)=>{
 if(!['while','if'].includes(guard))throw Error('whileかifを選びます。');
 return {guard,release,buffer:[],owner:null,consumers:{C1:{status:'ready',received:[]},C2:{status:'ready',received:[]}},invalid:0,log:[]};
};
M.condition=(input,a)=>{
 const s=next(input);
 if(a.kind==='put'){
  if(s.owner)throw Error(s.owner+'がmutexを保持中なのでPは変更できません。');
  if(s.buffer.length)throw Error('容量1のバッファは満杯です。取り出してから追加してください。');
  if(!Number.isInteger(a.value)||a.value<0||a.value>99)throw Error('値は0〜99の整数です。');
  s.buffer.push(a.value);
  const id=Object.keys(s.consumers).find(n=>s.consumers[n].status==='waiting');
  if(id)s.consumers[id].status='notified';
  return note(s,'Pがmutexを獲得し、'+a.value+'を入れ、'+(id?id+'を通知しました':'待ち手がいないため通知先はありません')+'。Pはmutexを解放しました。まだ受信者は取り出していません。');
 }
 const c=s.consumers[a.actor];if(!c)throw Error('C1かC2を選んでください。');
 if(a.kind==='wake'){
  if(c.status!=='waiting')throw Error('条件待ちの主体だけを起こします。');
  c.status='notified';return note(s,a.actor+'への起床を注入しました。バッファは変えません。起床と条件の成立は別です。');
 }
 if(a.kind==='get'&&c.status!=='ready')throw Error('この主体には待機中のgetがあります。起こしてから再開してください。');
 if(a.kind==='resume'&&c.status!=='notified')throw Error('通知・起床後に再開します。待っているだけでは戻りません。');
 if(!['get','resume'].includes(a.kind))throw Error('get・resume・wakeを選んでください。');
 if(s.owner&&s.owner!==a.actor)throw Error(s.owner+'がmutexを保持中です。');
 s.owner=a.actor;
 const recheck=a.kind==='get'||s.guard==='while';
 if(recheck&&!s.buffer.length){
  c.status='waiting';if(s.release)s.owner=null;
  return note(s,a.actor+'はmutexを持って空を確認し、waitしました。'+(s.release?'解放と待機は一体の操作です。Pが書けるようになります。':'誤った例：mutexを保持したまま眠ったのでPも進めません。'));
 }
 c.status='ready';s.owner=null;
 if(!s.buffer.length){s.invalid++;return note(s,a.actor+'はifの後から進み、空のまま取り出そうとしました。起床時に条件が保たれる保証はありません。');}
 const value=s.buffer.shift();c.received.push(value);
 return note(s,a.actor+'が'+(a.kind==='resume'?'mutexを再獲得して':'mutexを獲得して')+value+'を取り出しました。取り出し後にmutexを解放します。');
};

M.clockStart=()=>({nodes:{A:{scalar:0,vector:[0,0,0],last:null},B:{scalar:0,vector:[0,0,0],last:null},C:{scalar:0,vector:[0,0,0],last:null}},events:[],messages:[],serial:0,log:[]});
M.clock=(input,a)=>{
 const s=next(input),names=['A','B','C'],n=s.nodes[a.actor];if(!n)throw Error('機器A・B・Cから選んでください。');
 if(!['local','send','receive'].includes(a.kind))throw Error('local・send・receiveを選びます。');
 if(a.kind==='send'&&(!s.nodes[a.to]||a.to===a.actor))throw Error('別の送信先を選んでください。');
 let message=null;
 if(a.kind==='receive'){
  message=s.messages.find(m=>m.id===a.id);if(!message||message.received||message.to!==a.actor)throw Error('この機器宛ての未受信メッセージを選んでください。');
  n.scalar=Math.max(n.scalar,message.scalar);n.vector=n.vector.map((v,i)=>Math.max(v,message.vector[i]));message.received=true;
 }
 n.scalar++;n.vector[names.indexOf(a.actor)]++;
 const id=s.events.length+1,parents=[n.last,message?.event].filter(x=>x!==null&&x!==undefined);
 const event={id,actor:a.actor,kind:a.kind,scalar:n.scalar,vector:n.vector.slice(),parents:[...new Set(parents)],message:message?.id||null};
 n.last=id;s.events.push(event);
 if(a.kind==='send'){const packet={id:'m'+(++s.serial),from:a.actor,to:a.to,event:id,scalar:n.scalar,vector:n.vector.slice(),received:false};s.messages.push(packet);event.message=packet.id;}
 return note(s,'e'+id+' '+a.actor+' '+a.kind+'：L='+n.scalar+'、V=('+n.vector.join(',')+')。'+(message?'受信した時計との成分ごとの最大を取り、自分の成分を増やしました。':'この機器の時計だけを進めました。'));
};
M.causality=(s,first,second)=>{
 const a=s.events.find(e=>e.id===first),b=s.events.find(e=>e.id===second);if(!a||!b)throw Error('存在する二つのイベントを選んでください。');
 const less=(u,v)=>u.every((x,i)=>x<=v[i])&&u.some((x,i)=>x<v[i]);
 const reaches=(source,target)=>{const visited=new Set(),todo=[target];while(todo.length){const id=todo.pop();if(id===source)return true;if(visited.has(id))continue;visited.add(id);todo.push(...s.events.find(e=>e.id===id).parents);}return false;};
 const relation=a.id===b.id?'same':reaches(a.id,b.id)?'before':reaches(b.id,a.id)?'after':'concurrent';
 const vector=a.id===b.id?'same':less(a.vector,b.vector)?'before':less(b.vector,a.vector)?'after':'concurrent';
 return {relation,vector,scalar:a.scalar<b.scalar?'<':a.scalar>b.scalar?'>':'='};
};
})();
