/* Small, deterministic state machines for learner-driven OS/data experiments.
 * These are teaching models, never calls to the host OS or a real service.
 * Each operation returns a new state; UI undo is an experiment reset, not an
 * assertion that a distributed side effect can be undone in the real world. */
(() => {
'use strict';
const X=CSL.experiences,M=X.os={};
const copy=X.clone;
const integer=(n,min,max,label)=>{if(!Number.isInteger(n)||n<min||n>max)throw Error(label+'は'+min+'〜'+max+'の整数です。');return n;};
const begin=s=>{if(s.log.length>=64)throw Error('この例は64操作までです。最初へ戻して試してください。');return copy(s);};
const record=(s,text)=>{s.log.push(text);return s;};

M.processStart=()=>({tasks:{P:{pid:1,mem:'M1',pc:0,status:'ready',lastRead:null}},memory:{M1:{x:5}},current:'P',mode:null,serial:1,log:[]});
M.process=(input,action)=>{
 const s=begin(input),kind=action.kind,actor=action.actor||s.current,t=s.tasks[actor];
 if(!t||t.status==='ended')throw Error('終了していない実行主体を選んでください。');
 if(kind==='spawn'){
  if(s.tasks.C)throw Error('この小例で作る子は一つです。最初から別方式を試してください。');
  if(!['fork','thread'].includes(action.mode))throw Error('forkかthreadを選んでください。');
  s.mode=action.mode;t.pc++;
  const shared=action.mode==='thread',mem=shared?t.mem:'M'+(++s.serial);
  if(!shared)s.memory[mem]=copy(s.memory[t.mem]);
  s.tasks.C={pid:shared?t.pid:2,mem,pc:0,status:'ready',lastRead:null};
  return record(s,shared?'thread：子Cは親Pと同じ'+mem+'を参照します。実行位置は別です。':'fork：子Cへ別のアドレス空間'+mem+'を用意します。値は'+s.memory[mem].x+'から始まります。物理コピーの方法はここでは扱いません。');
 }
 if(kind==='switch'){s.current=actor;return record(s,actor+'へCPUの実行を切り替えました。もう一方のPCと値は保持します。');}
 if(actor!==s.current)throw Error('先にこの主体へCPUを切り替えてください。');
 if(kind==='write'){integer(action.value,-99,99,'書き込む値');s.memory[t.mem].x=action.value;t.pc++;return record(s,actor+'が'+t.mem+'のxへ'+action.value+'を書きました。同じメモリを参照する主体から見える値も変わります。');}
 if(kind==='read'){t.lastRead=s.memory[t.mem].x;t.pc++;return record(s,actor+'が'+t.mem+'から'+t.lastRead+'を読みました。これは今読んだ値の控えです。');}
 if(kind==='exec'){
  for(const [name,other]of Object.entries(s.tasks))if(name!==actor&&other.pid===t.pid)other.status='ended';
  const mem='M'+(++s.serial);s.memory[mem]={x:0};t.mem=mem;t.pc=0;t.lastRead=null;
  return record(s,actor+'のPID '+t.pid+'を維持し、実行イメージを'+mem+'へ置き換えました。同じプロセスの他スレッドは終了します。');
 }
 if(kind==='exit'){t.status='ended';s.current=Object.keys(s.tasks).find(n=>s.tasks[n].status==='ready')||null;return record(s,actor+'が終了しました。残る主体があれば、そちらへ実行を移します。');}
 throw Error('未定義のプロセス操作です。');
};

M.pipeStart=()=>({buffer:[],fds:{P1:{4:'W'},P2:{3:'R'}},pending:null,received:[],log:[]});
M.pipeWriters=s=>Object.values(s.fds.P1).filter(x=>x==='W').length;
M.pipe=(input,a)=>{
 const s=begin(input),kind=a.kind;
 const deliver=n=>{const text=s.buffer.splice(0,n).join('');s.received.push(text);return text;};
 if(kind==='read'){
  if(s.pending)throw Error('P2は前のreadで待機中です。書くか、全ての書き手を閉じてください。');
  if(s.fds.P2[3]!=='R')throw Error('読み口fd 3は閉じています。');
  const n=integer(a.count,1,4,'要求byte数');
  if(s.buffer.length)return record(s,'P2 read('+n+') → '+deliver(n)+'。要求数に満たなくても、今あるbyteを返す例です。');
  if(!M.pipeWriters(s)){s.received.push('EOF');return record(s,'空で、書ける入口も0個なのでEOFです。データの文字ではありません。');}
  s.pending={count:n};return record(s,'P2 read('+n+')は待機。空ですが、将来書ける入口がまだあります。');
 }
 if(kind==='write'){
  if(!M.pipeWriters(s))throw Error('書き口は全て閉じています。');
  if(s.fds.P2[3]!=='R')throw Error('読み手がいません。この小例はEPIPEを表示します。SIGPIPEの配信は再現しません。');
  if(typeof a.text!=='string'||!/^[a-z]{1,4}$/.test(a.text))throw Error('小文字a〜zを1〜4文字入れてください。1文字を1byteとして扱います。');
  if(s.buffer.length+a.text.length>4)throw Error('容量4byteを超えます。書込み待ちの操作はこの小例では追加せず、先に読み取ってください。');
  s.buffer.push(...a.text);record(s,'P1が'+a.text+'を書きました。writeの区切りはreadの区切りにはなりません。');
  if(s.pending){const n=s.pending.count;s.pending=null;record(s,'待機していたP2のreadが再開 → '+deliver(n));}return s;
 }
 if(kind==='dup'){
  if(s.fds.P1[4]!=='W')throw Error('複製元のfd 4は閉じています。');
  if(s.fds.P1[5])throw Error('fd 5は既にあります。');
  s.fds.P1[5]='W';return record(s,'fd 4と同じ書き口を指すfd 5を作りました。データ用の別パイプではありません。');
 }
 if(kind==='close'){
  const actor=a.actor||'P1',fd=a.fd;if(!s.fds[actor]?.[fd])throw Error('その入口は既に閉じています。');
  delete s.fds[actor][fd];record(s,actor+'がfd '+fd+'を閉じました。残る書き手は'+M.pipeWriters(s)+'個です。');
  if(actor==='P2')s.pending=null;
  if(s.pending&&!s.buffer.length&&!M.pipeWriters(s)){s.pending=null;s.received.push('EOF');record(s,'最後の書き手が閉じたので、待機readがEOFで戻りました。');}return s;
 }
 throw Error('未定義のパイプ操作です。');
};

M.rpcStart=(deduplicate=true)=>({deduplicate,requests:[],responses:[],cache:{},orders:[],serial:0,client:'まだ注文していません',lastKey:null,log:[]});
M.rpc=(input,a)=>{
 const s=begin(input);
 if(a.kind==='send'){
  const key=a.key||'order-1',quantity=integer(a.quantity??1,1,5,'数量');
  if(!/^order-[1-9]$/.test(key))throw Error('この例の要求IDはorder-1〜order-9です。');
  s.requests.push({id:++s.serial,key,quantity});s.lastKey=key;s.client='応答待ち：'+key;
  return record(s,'利用者が数量'+quantity+'を要求ID '+key+'で送信。まだサーバーへ配送していません。');
 }
 if(a.kind==='deliver-request'){
  if(!s.requests.length)throw Error('配送待ちの要求がありません。');
  const request=s.requests.shift(),prior=s.cache[request.key];let result;
  if(s.deduplicate&&prior){
   result=prior.quantity===request.quantity?copy(prior.result):{status:409,reason:'同じ要求IDなのに数量が違います。新しい意図には別のIDが必要です。'};
   record(s,result.status===200?'同じIDと数量の処理結果を再利用。注文は増やしません。':'同じIDの異なる要求を拒否。注文は増やしません。');
  }else{
   const order={id:'O'+(s.orders.length+1),quantity:request.quantity};s.orders.push(order);result={status:200,order:order.id,quantity:order.quantity};
   if(s.deduplicate)s.cache[request.key]={quantity:request.quantity,result:copy(result)};
   record(s,'サーバーで注文'+order.id+'を確定。重複防止の記録と注文確定は一つの原子的操作と仮定します。');
  }
  s.responses.push({request:request.id,key:request.key,result});return s;
 }
 if(a.kind==='drop-request'){if(!s.requests.length)throw Error('落とす要求がありません。');s.requests.shift();return record(s,'要求が届く前に失われました。サーバーはこの要求を処理していません。');}
 if(a.kind==='drop-response'){if(!s.responses.length)throw Error('落とす応答がありません。');s.responses.shift();return record(s,'サーバーからの応答だけが失われました。確定した注文は残ります。');}
 if(a.kind==='deliver-response'){
  if(!s.responses.length)throw Error('配送待ちの応答がありません。');const r=s.responses.shift();
  s.client=r.result.status===200?'確認済み：'+r.result.order+'（数量'+r.result.quantity+'）':'拒否：'+r.result.reason;
  return record(s,'利用者が応答を受け取りました。ここで初めてこの結果を確認できます。');
 }
 if(a.kind==='timeout'){if(!s.lastKey)throw Error('先に要求を送信してください。');s.client='結果不明：'+s.lastKey+'。未処理とも処理済みとも断定できません。';return record(s,'利用者の待機期限が切れました。サーバーの状態は変えていません。');}
 throw Error('未定義の通信操作です。');
};

M.mvccStart=(isolation='rc')=>{
 if(!['rc','rr'].includes(isolation))throw Error('rcかrrを選んでください。');
 return {isolation,version:0,versions:[{version:0,value:100}],tx:{A:{status:'idle',snapshot:null,pending:null,reads:[]},B:{status:'idle',snapshot:null,pending:null,reads:[]}},log:[]};
};
M.mvcc=(input,a)=>{
 const s=begin(input),id=a.actor,t=s.tx[id];if(!t)throw Error('AかBを選んでください。');
 if(a.kind==='begin'){if(t.status==='active')throw Error(id+'は既に開始しています。');t.status='active';t.snapshot=null;t.pending=null;t.reads=[];return record(s,id+'がBEGIN。固定スナップショットも、ここでは最初のデータ操作で取得します。');}
 if(t.status!=='active')throw Error('先に'+id+'のBEGINを行ってください。');
 if(a.kind==='read'||a.kind==='write'){
  if(t.snapshot===null)t.snapshot=s.version;
  const boundary=s.isolation==='rr'?t.snapshot:s.version;
  const visible=s.versions.filter(v=>v.version<=boundary).at(-1);
  if(a.kind==='read'){
   const value=t.pending===null?visible.value:t.pending;t.reads.push({value,boundary,own:t.pending!==null});
   return record(s,id+'のSELECT → '+value+'。'+(t.pending!==null?'自分の未確定の変更を読みます。':('参照境界はv'+boundary+'です。')));
  }
  t.pending=integer(a.value,0,999,'値');return record(s,id+'が自分の作業領域へ'+t.pending+'を書きました。まだ他方には見えません。');
 }
 if(a.kind==='commit'){
  if(t.pending!==null){
   if(s.isolation==='rr'&&t.snapshot<s.version){t.status='aborted';t.pending=null;return record(s,id+'を中止：開始後に同じ行の新しい版が確定しました。この例は全体の再試行を必要とする競合として扱います。');}
   s.version++;s.versions.push({version:s.version,value:t.pending});
  }
  t.status='committed';t.pending=null;return record(s,id+'がCOMMIT。確定版はv'+s.version+'です。');
 }
 if(a.kind==='rollback'){t.pending=null;t.status='aborted';return record(s,id+'がROLLBACK。自分の未確定の変更だけを捨てました。');}
 throw Error('未定義のトランザクション操作です。');
};
})();
