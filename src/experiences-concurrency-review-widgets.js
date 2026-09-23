/* Deadlock and quorum use different representations on purpose. */
(() => {
'use strict';
if(typeof document==='undefined')return;
const L=CSL,X=L.experiences,D=X.concurrencyReview,S=X.securityDesk,h=L.h;
const {b,p,box,table}=S.ui,formula=X.html.formula;
const nodes=ids=>ids.length?ids.map(i=>'N'+(i+1)).join('、'):'なし';

X.registerWidget('deadlock-ownership',(root,a,c)=>S.mount(root,c,{
 start:D.deadlockStart,reduce:D.deadlock,
 instruction:'「逆順」でP1にA、P2にBを取らせ、次にそれぞれもう一つを要求してください。保持している資源と待っている相手を同時に読みます。その後「同じ順序」で同じ操作を試します。',
 action:code=>{const [kind,value]=code.split(':');return kind==='mode'?{kind,value,fresh:true}:kind==='event'?{kind,index:Number(value)}:{kind,actor:value};},
 render:s=>{
  const v=D.deadlockView(s);
  const actor=id=>{const a=s.actors[id],next=a.pc<2?s.order[id][a.pc]:a.pc===2?'処理を終えて解放':'終了';return box(id,table(['状態','値'],[['保持',v.holds[id].join('・')||'なし'],['待ち',a.waiting?'資源'+a.waiting:'なし'],['次に行うこと',next],['状態',a.status]])+b(id+'を一段階進める','step:'+id,['done','aborted'].includes(a.status)?'disabled':'')+b(id+'を中断して保持資源を解放','abort:'+id,['done','aborted'].includes(a.status)?'disabled':''));};
  const wait=v.waits.length?table(['待つ処理','欲しい資源','現在の保持者'],v.waits.map(e=>[e.from,e.resource,e.to])):p('現在、他の処理を待つ辺はありません。');
  const condition=table(['条件','この時点'],[['相互排他','この小例では各資源を同時に1処理だけが保持'],['保持したまま待つ',v.conditions.holdAndWait?'あり':'なし'],['強制的に奪わない',v.conditions.noPreemption?'通常操作では資源を奪わない':'—'],['循環待ち',v.conditions.circularWait?'P1 → P2 → P1':'なし']]);
  return '<div class="ex-actions">'+b('P1:A→B / P2:B→A','mode:opposite',`aria-pressed="${s.mode==='opposite'}"`)+b('両方A→B','mode:same',`aria-pressed="${s.mode==='same'}"`)+'</div>'+
   '<div class="ex-con-two">'+actor('P1')+actor('P2')+'</div>'+
   box(v.deadlock?'循環待ちが成立：この二処理は通常操作では先へ進めない':'現在の待ち関係',wait+condition+
    p(v.deadlock?'P1はP2の資源を、P2はP1の資源を待っています。「中断」はこの輪を壊す回復操作で、順序統一は輪を作らないための予防です。':'待ちが一方向だけなら、保持者が処理を終えて解放することで進めます。'))+
   (s.events.length?box('操作記録：選んでも現在状態は巻き戻らない','<div class="ex-actions">'+s.events.map((e,i)=>b(String(i+1)+' '+e.actor+' '+e.kind,'event:'+i,`aria-pressed="${s.selected===i}"`)).join('')+'</div>'+p(v.selected?v.selected.text:'記録を選んでください。')):'')+
   p('単一インスタンスの資源A・Bと二処理だけの教材です。実OSのスケジューラ、タイムアウト、優先度、複数インスタンス資源は再現しません。');
 }
}));

X.registerWidget('quorum-sets',(root,a,c)=>S.mount(root,c,{
 start:D.quorumStart,reduce:D.quorum,
 instruction:'まず5台・q=3の二つの集合A/Bを比べ、重なるノードを確認してください。次にq=2の「交差しない例」へ切り替えます。停止ノードは集合の定義ではなく、今応答できる台数を変えます。',
 action:code=>{const [kind,value]=code.split(':');return kind==='preset'||kind==='active'?{kind,value,fresh:kind==='preset'}:kind==='q'?{kind,value:Number(value)}:{kind,index:Number(value)};},
 render:s=>{
  const v=D.quorumView(s);
  const nodeCards=Array.from({length:s.n},(_,i)=>{
    const inA=s.setA[i],inB=s.setB[i],failed=s.failed[i],classes=['ex-con-node',inA?'in-a':'',inB?'in-b':'',inA&&inB?'in-both':'',failed?'is-failed':''].filter(Boolean).join(' ');
    return `<div class="${classes}"><strong>N${i+1}</strong><span>${failed?'停止中':'応答可能'}</span><small>A:${inA?'含む':'—'} / B:${inB?'含む':'—'}</small><div>${b((s.active==='A'?'A':'B')+'の所属を切替','member:'+i)}${b(failed?'復帰':'停止','failure:'+i)}</div></div>`;
  }).join('');
  const theoretical=v.guaranteed?'任意のq個集合どうしは少なくとも'+v.minIntersection+'台で重なります。':'q='+s.q+'では、互いに重ならないq個集合を作れる可能性があります。';
  const validity=(name,valid,count)=>name+'：'+count+'台 '+(valid?'（q個の集合）':'（q='+s.q+'と一致しないためクォーラムとして比較しない）');
  return '<div class="ex-actions">'+b('5台・q=3の過半数例','preset:majority')+b('q=2の交差しない例','preset:disjoint')+'</div>'+
   box('必要数qを決める','<div class="ex-actions">'+[1,2,3,4,5].map(q=>b('q='+q,'q:'+q,`aria-pressed="${s.q===q}"`)).join('')+'</div>'+formula('任意の2集合の最小交差数 = max(0, 2q − N) = '+v.minIntersection)+p(theoretical)+p('5台の過半数は3台です。qという数だけで合意形成全体が完成するわけではありません。'))+
   '<div class="ex-actions">'+b('集合Aを編集','active:A',`aria-pressed="${s.active==='A'}"`)+b('集合Bを編集','active:B',`aria-pressed="${s.active==='B'}"`)+'</div><div class="ex-con-nodes">'+nodeCards+'</div>'+
   box('選んだ二集合を読む',table(['項目','値'],[['集合A',nodes(v.a)],['集合B',nodes(v.b)],['実際の交差',nodes(v.intersection)],['Aの状態',validity('A',v.validA,v.a.length)],['Bの状態',validity('B',v.validB,v.b.length)]])+p(v.validA&&v.validB?(v.intersection.length?'この二つのq個集合は実際に '+nodes(v.intersection)+' で重なっています。':'この二つのq個集合は重なっていません。'):'まず両方をq個の集合にしてから、交差の例として読みます。'))+
   box('停止中でも必要数を集められるか',table(['量','値'],[['全ノード',s.n],['応答可能',v.live.length],['必要数q',s.q],['どこかにq台の応答集合を作れるか',v.available?'作れる':'作れない'],['集合Aの現在の応答',v.ackA.length],['集合Bの現在の応答',v.ackB.length]])+p('停止は集合の数学的な交差を消す操作ではありません。可用性は「今、生きているノードから必要数を集められるか」です。版番号、leader、任期、ログ一致などはこの画面では扱いません。'))+
   p('この画面は5台の集合論と応答可能数に限定した教材です。Raft/Paxosなどの合意プロトコルの安全性を、この台数判定だけで保証しません。');
 }
}));
})();