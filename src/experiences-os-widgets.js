/* Individually arranged workspaces. Shared code only manages lifecycle,
 * reversible experiment state, accessible feedback and safe rendering. */
(() => {
'use strict';
const X=CSL.experiences,M=X.os,h=CSL.h,B=X.html.button,T=X.html.table;
if(typeof document==='undefined')return;
const button=(id,text,disabled=false,extra='')=>B(text,`data-os-id="${id}"${disabled?' disabled':''} ${extra}`);
const field=(id,label,value,min=0,max=99)=>`<label for="${id}">${h(label)}<input id="${id}" name="value" type="number" value="${value}" min="${min}" max="${max}" step="1" required></label>`;
// Input drafts belong to this mounted experiment, not to persistent storage.
// A state transition must not silently replace a quantity or selected ID.
X.captureWorkspaceFields=host=>[...host.querySelectorAll('input[id],select[id],textarea[id]')].map(el=>({id:el.id,tag:el.tagName,type:el.type,value:el.value,checked:el.checked}));
X.restoreWorkspaceFields=(host,drafts)=>{
 for(const draft of drafts){
  const el=host.querySelector('#'+CSS.escape(draft.id));
  if(!el||el.tagName!==draft.tag||el.type!==draft.type)continue;
  if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===draft.value))continue;
  if(el.type==='checkbox'||el.type==='radio')el.checked=draft.checked;
  else if(el.type!=='file')el.value=draft.value;
 }
};
function workspace(root,current,initial,reducer){
 const scope=X.scope(root,current);let state=initial(),history=[],render=()=>{};
 root.classList.add('ex-os-workspace');
 root.innerHTML='<div data-os-board></div><div class="ex-actions">'+button('undo','この実験の直前の状態へ戻す',true)+button('reset','この実験を最初から')+'</div><p class="ex-caption">戻す操作は学習用の巻き戻しです。実サービスの確定済み更新を取り消す機能ではありません。操作履歴はページを離れると消えます。</p><p data-ex-status role="status" aria-live="polite"></p><details class="ex-os-history"><summary>何を操作し、何が変わったか</summary><ol data-os-log></ol></details>';
 const board=root.querySelector('[data-os-board]'),status=root.querySelector('[data-ex-status]');
 function paint(focus,keepDrafts=true){
  const drafts=keepDrafts?X.captureWorkspaceFields(board):[];
  render(state,board);X.restoreWorkspaceFields(board,drafts);root.dataset.osState=JSON.stringify(state);
  root.querySelector('[data-os-log]').innerHTML=state.log.map(text=>'<li>'+h(text)+'</li>').join('');
  root.querySelector('[data-os-id="undo"]').disabled=!history.length;
  if(focus){const el=root.querySelector(`[data-os-id="${CSS.escape(focus)}"]`);if(el&&!el.disabled)el.focus({preventScroll:true});else{board.tabIndex=-1;board.focus({preventScroll:true});}}
  current.completed.add(scope.id);
 }
 const api={scope,board,id:scope.id,get:()=>state,message(text,error=false){status.textContent=text;status.className=error?'ex-os-notice':'';},
  act(action,focus){try{const after=reducer(state,action);history.push(state);state=after;paint(focus);api.message(state.log.at(-1)||'状態を更新しました。');return true;}catch(e){api.message(e.message,true);return false;}},
  restart(make=initial,focus='reset'){state=make();history=[];paint(focus,false);api.message('新しい初期状態です。以前の操作と混ぜずに比較してください。');},
  view(fn){render=fn;paint();},refresh:paint};
 scope.on(root,'click',e=>{const b=e.target.closest('[data-os-id]');if(!b)return;if(b.dataset.osId==='undo'&&history.length){state=history.pop();paint(history.length?'undo':'reset');api.message('直前の実験状態へ戻しました。');}if(b.dataset.osId==='reset')api.restart();});
 return api;
}

X.registerWidget('process-space',(root,a,current)=>{
 const ui=workspace(root,current,M.processStart,M.process);
 ui.view((s,board)=>{
  const active=s.current?s.tasks[s.current]:null;
  board.innerHTML=`<p>① forkかthreadで子を作る → ② 子へCPUを切り替える → ③ 子で9を書く → ④ 親へ戻り、読む。値の持ち主を確認してください。</p><div class="ex-actions">${button('fork','fork：別プロセスの子を作る',!!s.tasks.C)}${button('thread','thread：同じプロセスに作る',!!s.tasks.C)}</div><div class="ex-os-process-layout"><section><h4>実行主体ごとの状態</h4>${Object.entries(s.tasks).map(([id,t])=>`<article class="ex-os-task ${s.current===id?'is-active':''}" data-process="${id}"><h5>${id==='P'?'親 P':'子 C'} <span>${t.status==='ended'?'終了':s.current===id?'CPUを使用中':'実行可能'}</span></h5><p>PID ${t.pid} ／ PC ${t.pc}</p><p class="ex-os-reference">参照する空間 → <strong>${h(t.mem)}</strong></p><p>最後に読んだ控え：<output data-process-read="${id}">${t.lastRead===null?'まだ読んでいません':t.lastRead}</output></p>${button('switch-'+id,id+'へCPUを切り替える',t.status==='ended'||s.current===id)}</article>`).join('')}</section><section><h4>メモリの実体</h4>${Object.entries(s.memory).map(([id,m])=>{const owners=Object.entries(s.tasks).filter(([,t])=>t.mem===id&&t.status!=='ended').map(([n])=>n);return `<article class="ex-os-memory" data-memory="${id}"><h5>${h(id)}</h5><p>x = <output data-memory-value="${id}">${m.x}</output></p><p>${owners.length?'参照する主体：'+owners.join('・'):'現在の主体からは参照されていません。過去の実体として表示。'}</p></article>`;}).join('')}</section></div><section class="ex-os-current"><h4>${active?h(s.current)+'が今する操作':'全て終了しています'}</h4><form data-process-write>${field(ui.id+'-process-value','xへ書く値',9,-99,99)}<button type="submit" class="ex-button" data-os-id="write"${active?'':' disabled'}>今の主体から書く</button></form><div class="ex-actions">${button('read','今の主体から読む',!active)}${button('exec','今のプロセスをexecで置き換える',!active)}${button('exit','今の主体を終了させる',!active)}</div></section><aside class="ex-why"><p>設計図であるプログラム、資源を持つプロセス、実行位置を持つスレッドを区別します。このPCは操作位置の教材用カウンタで、実際の命令番地ではありません。forkの物理実装やスケジューラ全体を再現した図ではありません。</p></aside>`;
 });
 ui.scope.on(root,'click',e=>{const id=e.target.closest('[data-os-id]')?.dataset.osId;if(id==='fork'||id==='thread')ui.act({kind:'spawn',mode:id},id);if(id?.startsWith('switch-'))ui.act({kind:'switch',actor:id.slice(7)},id);if(['read','exec','exit'].includes(id))ui.act({kind:id},id);});
 ui.scope.on(root,'submit',e=>{if(!e.target.matches('[data-process-write]'))return;e.preventDefault();if(e.target.reportValidity())ui.act({kind:'write',value:Number(e.target.elements.value.value)},'write');});
});

X.registerWidget('pipe-fds',(root,a,current)=>{
 const ui=workspace(root,current,M.pipeStart,M.pipe);
 ui.view((s,board)=>{
  board.innerHTML=`<p>まず空のパイプを読んで待機させてください。次に書くとreadが再開します。書き口を複製した後は、一つ閉じただけではEOFになりません。</p><div class="ex-os-three"><section class="ex-os-box"><h4>書き手 P1</h4><form data-pipe-write><label for="${ui.id}-bytes">送るbyte（英小文字1〜4文字）<input id="${ui.id}-bytes" name="text" value="abcd" pattern="[a-z]{1,4}" maxlength="4" required></label><button type="submit" class="ex-button" data-os-id="pipe-write"${M.pipeWriters(s)?'':' disabled'}>writeする</button></form><div class="ex-actions">${button('dup','fd 4をfd 5へ複製',!s.fds.P1[4]||!!s.fds.P1[5])}${[4,5].map(fd=>button('close-'+fd,'fd '+fd+'を閉じる',!s.fds.P1[fd])).join('')}</div></section><section class="ex-os-box"><h4>共有する一つのパイプ</h4><div class="ex-os-buffer" aria-label="容量4byte">${Array.from({length:4},(_,i)=>`<span class="${i<s.buffer.length?'filled':''}">${h(s.buffer[i]||'空')}</span>`).join('')}</div><p>開いた書き口：<output data-pipe-writers>${M.pipeWriters(s)}</output>個</p><p>fdはデータのコピーではなく、この同じ管への入口です。</p>${T(['主体','fd','向き'],Object.entries(s.fds).flatMap(([p,entries])=>Object.entries(entries).map(([fd,kind])=>[p,fd,kind==='R'?'読む':'書く'])))}</section><section class="ex-os-box"><h4>読み手 P2</h4><form data-pipe-read>${field(ui.id+'-read-count','最大何byte読むか',2,1,4)}<button type="submit" class="ex-button" data-os-id="pipe-read"${s.pending||!s.fds.P2[3]?' disabled':''}>readする</button></form><p data-pipe-wait>${s.pending?s.pending.count+'byteまでのreadが待機しています。':'待機中のreadはありません。'}</p><h5>受け取った結果</h5><ol data-pipe-received>${s.received.map(v=>'<li>'+h(v)+'</li>').join('')}</ol></section></div><aside class="ex-why"><p>空で書き手が残っていれば、今後の入力を待てます。空で書き手が一つもなければEOFです。writeのまとまりとreadのまとまりは別です。この実験は小文字1文字を1byteとして扱い、満杯のwrite待機やSIGPIPE配信は再現しません。</p></aside>`;
 });
 ui.scope.on(root,'submit',e=>{if(!e.target.matches('[data-pipe-read],[data-pipe-write]'))return;e.preventDefault();if(!e.target.reportValidity())return;if(e.target.matches('[data-pipe-read]'))ui.act({kind:'read',count:Number(e.target.elements.value.value)},'pipe-read');else ui.act({kind:'write',text:e.target.elements.text.value},'pipe-write');});
 ui.scope.on(root,'click',e=>{const id=e.target.closest('[data-os-id]')?.dataset.osId;if(id==='dup')ui.act({kind:'dup'},id);if(id?.startsWith('close-'))ui.act({kind:'close',fd:Number(id.slice(6))},id);});
});

X.registerWidget('condition-wait',(root,a,current)=>{
 const ui=workspace(root,current,()=>M.conditionStart(),M.condition);
 ui.view((s,board)=>{
  board.innerHTML=`<p>① C1がget → ② Pが7をputしてC1を通知 → ③ C2が先にget → ④ C1が再開。通知された後でも、データが残っているでしょうか。</p><div class="ex-actions">${button('guard-while','whileで再確認する例',false,`aria-pressed="${s.guard==='while'&&s.release}"`)}${button('guard-if','ifで再確認しない反例',false,`aria-pressed="${s.guard==='if'}"`)}${button('guard-hold','mutexを解放せず待つ反例',false,`aria-pressed="${!s.release}"`)}</div><p class="ex-caption">方式を変えると、混ぜずに比較できるよう最初から始めます。</p><section class="ex-os-shared"><h4>共有状態</h4><p>mutex保持者：<output data-condition-owner>${h(s.owner||'なし')}</output></p><div class="ex-os-buffer"><span class="${s.buffer.length?'filled':''}" data-condition-buffer>${s.buffer.length?s.buffer[0]:'空'}</span></div><p>不正な取出し：<output data-condition-invalid>${s.invalid}</output>回</p></section><div class="ex-os-three"><section class="ex-os-box"><h4>生産者 P</h4><form data-condition-put>${field(ui.id+'-put','入れる値',7)}<button type="submit" class="ex-button" data-os-id="put">mutexを取り、putして通知</button></form><p>通知してもC1にデータを予約するわけではありません。</p></section>${Object.entries(s.consumers).map(([id,c])=>`<section class="ex-os-box"><h4>消費者 ${id}</h4><p data-condition-state="${id}">${({ready:'次のgetを開始できる',waiting:'条件待ちで眠っている',notified:'起床したが、まだgetを完了していない'})[c.status]}</p><div class="ex-actions">${button('get-'+id,'新しくgetを呼ぶ',c.status!=='ready')}${button('resume-'+id,'起床したgetを再開',c.status!=='notified')}${button('wake-'+id,'データを増やさず起こす',c.status!=='waiting')}</div><p>受け取った値：<output data-condition-received="${id}">${c.received.join(', ')||'なし'}</output></p></section>`).join('')}</div><aside class="ex-why"><p>この小例は、mutexの獲得→条件の確認→waitでの解放を一つのget操作で行います。resumeは通知された後でだけ可能です。実際の細かな命令間割込みではなく、順序を学習者が選ぶモデルです。</p></aside>`;
 });
 ui.scope.on(root,'click',e=>{const id=e.target.closest('[data-os-id]')?.dataset.osId;if(id==='guard-while')ui.restart(()=>M.conditionStart('while',true),id);if(id==='guard-if')ui.restart(()=>M.conditionStart('if',true),id);if(id==='guard-hold')ui.restart(()=>M.conditionStart('while',false),id);if(/^(get|resume|wake)-C[12]$/.test(id||'')){const [kind,actor]=id.split('-');ui.act({kind,actor},id);}});
 ui.scope.on(root,'submit',e=>{if(!e.target.matches('[data-condition-put]'))return;e.preventDefault();if(e.target.reportValidity())ui.act({kind:'put',value:Number(e.target.elements.value.value)},'put');});
});

X.registerWidget('causal-clocks',(root,a,current)=>{
 const ui=workspace(root,current,M.clockStart,M.clock);let first=1,second=2;
 function comparison(s){if(s.events.length<2)return '<p>異なる機器で二つ以上のイベントを作ってから、比較する二つを選びます。</p>';if(!s.events.some(e=>e.id===first))first=1;if(!s.events.some(e=>e.id===second))second=2;const r=M.causality(s,first,second),one=s.events.find(e=>e.id===first),two=s.events.find(e=>e.id===second);const names={before:'1から2へ因果関係があります',after:'2から1へ因果関係があります',concurrent:'この記録上では並行です',same:'同じイベントです'};
  return `<form data-clock-compare>${[['first','比較1',first],['second','比較2',second]].map(([key,label,value])=>`<label for="${ui.id}-${key}">${label}<select id="${ui.id}-${key}" name="${key}">${s.events.map(e=>`<option value="${e.id}"${e.id===value?' selected':''}>e${e.id} ${e.actor} ${e.kind}</option>`).join('')}</select></label>`).join('')}<button type="submit" class="ex-button" data-os-id="compare">この二つを比較</button></form><section class="ex-why" data-clock-relation="${r.relation}"><h4>${names[r.relation]}</h4><p>Lamport：${one.scalar} ${h(r.scalar)} ${two.scalar}</p><p>ベクトル：(${one.vector.join(',')}) と (${two.vector.join(',')})</p><p>判定には同じ機器内の順序と送信→受信の道を使います。Lamportの大小だけを原因の証拠にはしません。${r.relation==='concurrent'&&r.scalar!=='='?'今回は数字の大小があるのに、因果関係の道はありません。':''}</p></section>`;
 }
 ui.view((s,board)=>{
  board.innerHTML=`<p>Aだけでlocalを2回、Cでlocalを1回作って比べてください。次にA→Bを送信し、Bで受信します。送信だけではBの時計は進みません。</p><div class="ex-os-three">${Object.entries(s.nodes).map(([name,n])=>`<section class="ex-os-box"><h4>機器 ${name}</h4><p>L=${n.scalar} ／ V=(${n.vector.join(',')})</p>${button('local-'+name,'この機器だけのlocalイベント')}<div class="ex-actions">${['A','B','C'].filter(x=>x!==name).map(to=>button('send-'+name+'-'+to,to+'へ送信')).join('')}</div><ol class="ex-clock-events">${s.events.filter(e=>e.actor===name).map(e=>`<li data-clock-event="${e.id}"><strong>e${e.id} ${e.kind}${e.message?' '+h(e.message):''}</strong><span>L=${e.scalar} ／ (${e.vector.join(',')})</span><small>直接の前提：${e.parents.map(p=>'e'+p).join(', ')||'なし'}</small></li>`).join('')}</ol></section>`).join('')}</div><section><h4>送信時点のコピーを持つメッセージ</h4>${s.messages.length?s.messages.map(m=>`<div class="ex-clock-message"><strong>${h(m.id)}：${m.from} e${m.event} → ${m.to}</strong><span>L=${m.scalar}、V=(${m.vector.join(',')})</span>${button('recv-'+m.id,m.received?'受信済み':m.to+'で今受信する',m.received)}</div>`).join(''):'<p>まだ送信していません。</p>'}</section><section class="ex-os-compare">${comparison(s)}</section><p class="ex-caption">e1、e2…は教材の操作番号です。この番号や画面上の左右が、異なる機器間の因果関係を意味するわけではありません。</p>`;
 });
 ui.scope.on(root,'click',e=>{const id=e.target.closest('[data-os-id]')?.dataset.osId;if(id?.startsWith('local-'))ui.act({kind:'local',actor:id.slice(6)},id);if(id?.startsWith('send-')){const [,actor,to]=id.split('-');ui.act({kind:'send',actor,to},id);}if(id?.startsWith('recv-')){const m=ui.get().messages.find(x=>x.id===id.slice(5));if(m)ui.act({kind:'receive',actor:m.to,id:m.id},id);}});
 X.liveForm(root,ui.scope,'[data-clock-compare]');ui.scope.on(root,'submit',e=>{if(!e.target.matches('[data-clock-compare]'))return;e.preventDefault();first=Number(e.target.elements.first.value);second=Number(e.target.elements.second.value);ui.refresh('compare');ui.message('選んだ二つの因果の道と時計を比較しました。');});
});

X.registerWidget('rpc-delivery',(root,a,current)=>{
 const ui=workspace(root,current,()=>M.rpcStart(true),M.rpc);
 ui.view((s,board)=>{
  board.innerHTML=`<p>① 要求を送る → ② サーバーへ届ける → ③ 応答だけ落とす → ④ timeout → ⑤ 同じIDでもう一度送る。利用者が知っていることと、実際の注文を比べます。</p><div class="ex-actions">${button('dedup-on','同じIDを重複排除する例',false,`aria-pressed="${s.deduplicate}"`)}${button('dedup-off','重複排除しない反例',false,`aria-pressed="${!s.deduplicate}"`)}</div><div class="ex-os-three"><section class="ex-os-box"><h4>利用者が知る状態</h4><p class="ex-os-client" data-rpc-client>${h(s.client)}</p><form data-rpc-send><label for="${ui.id}-key">同じ意図には同じ要求ID<select id="${ui.id}-key" name="key"><option value="order-1">order-1</option><option value="order-2">order-2（別の要求）</option></select></label>${field(ui.id+'-quantity','注文の数量',1,1,5)}<button type="submit" class="ex-button" data-os-id="rpc-send">要求を送る</button></form>${button('timeout','応答の待機期限を迎える',!s.lastKey)}</section><section class="ex-os-box"><h4>まだ届いていない通信</h4><h5>要求 ${s.requests.length}件</h5>${s.requests.length?T(['ID','数量'],s.requests.map(r=>[r.key,r.quantity])):'<p>要求の配送待ちなし</p>'}<div class="ex-actions">${button('deliver-request','先頭の要求をサーバーへ届ける',!s.requests.length)}${button('drop-request','先頭の要求を落とす',!s.requests.length)}</div><h5>応答 ${s.responses.length}件</h5>${s.responses.length?T(['要求ID','応答'],s.responses.map(r=>[r.key,r.result.status===200?r.result.order:r.result.status])):'<p>応答の配送待ちなし</p>'}<div class="ex-actions">${button('deliver-response','先頭の応答を利用者へ届ける',!s.responses.length)}${button('drop-response','先頭の応答だけを落とす',!s.responses.length)}</div></section><section class="ex-os-box"><h4>サーバーに実際に残る注文</h4><p>確定した注文：<output data-rpc-orders>${s.orders.length}</output>件</p>${s.orders.length?T(['注文ID','数量'],s.orders.map(o=>[o.id,o.quantity])):'<p>まだ注文はありません。</p>'}<h5>重複を識別する記録</h5>${Object.keys(s.cache).length?T(['要求ID','数量','前の結果'],Object.entries(s.cache).map(([key,v])=>[key,v.quantity,v.result.order])):'<p>記録なし</p>'}</section></div><aside class="ex-why"><p>同じ要求IDでも数量が違えば、以前の結果を黙って返してはいけません。ここでは409で拒否します。重複記録と注文は原子的に確定し、記録を失わない仮定です。任意の分散システムで一度だけ実行できることを保証するモデルではありません。</p></aside>`;
 });
 ui.scope.on(root,'click',e=>{const id=e.target.closest('[data-os-id]')?.dataset.osId;if(id==='dedup-on'||id==='dedup-off')ui.restart(()=>M.rpcStart(id==='dedup-on'),id);if(['timeout','deliver-request','drop-request','deliver-response','drop-response'].includes(id))ui.act({kind:id},id);});
 ui.scope.on(root,'submit',e=>{if(!e.target.matches('[data-rpc-send]'))return;e.preventDefault();if(e.target.reportValidity())ui.act({kind:'send',key:e.target.elements.key.value,quantity:Number(e.target.elements.value.value)},'rpc-send');});
});

X.registerWidget('mvcc-versions',(root,a,current)=>{
 const ui=workspace(root,current,()=>M.mvccStart('rc'),M.mvcc);
 ui.view((s,board)=>{
  board.innerHTML=`<p>① AでBEGIN・SELECT → ② BでBEGIN・200へUPDATE・COMMIT → ③ Aでもう一度SELECT。最初と次のSELECTが、どの版を読んだかを比べます。</p><div class="ex-actions">${button('isolation-rc','各SELECTで新しい確定版を読む',false,`aria-pressed="${s.isolation==='rc'}"`)}${button('isolation-rr','最初のデータ操作の版を保つ',false,`aria-pressed="${s.isolation==='rr'}"`)}</div><section><h4>確定した版の履歴</h4><div class="ex-os-versions">${s.versions.map(v=>`<div data-mvcc-version="${v.version}"><strong>v${v.version}</strong><span>x=${v.value}</span><small>${v.version===s.version?'最新の確定版':'残してある以前の版'}</small></div>`).join('')}</div></section><div class="ex-os-two">${Object.entries(s.tx).map(([id,t])=>`<section class="ex-os-box" data-mvcc-actor="${id}"><h4>トランザクション ${id}</h4><p>${({idle:'未開始',active:'実行中',committed:'確定済み',aborted:'中止済み'})[t.status]}</p><p>固定する参照境界：${s.isolation==='rr'?(t.snapshot===null?'最初のデータ操作で取得':'v'+t.snapshot):'SELECTごとに決める'}</p><div class="ex-actions">${button('begin-'+id,'BEGIN',t.status==='active')}${button('read-'+id,'SELECTする',t.status!=='active')}</div><form data-mvcc-write="${id}">${field(ui.id+'-'+id+'-draft','このTXだけの作業値',200,0,999)}<button type="submit" class="ex-button" data-os-id="write-${id}"${t.status==='active'?'':' disabled'}>UPDATEする</button></form><p>未確定の作業値：<output data-mvcc-pending="${id}">${t.pending===null?'なし':t.pending}</output></p><div class="ex-actions">${button('commit-'+id,'COMMITする',t.status!=='active')}${button('rollback-'+id,'ROLLBACKする',t.status!=='active')}</div><h5>このTXが実際に読んだ値</h5><ol data-mvcc-reads="${id}">${t.reads.map(r=>`<li><strong>${r.value}</strong> <span>${r.own?'自分の作業値':'v'+r.boundary+'までの確定版'}</span></li>`).join('')}</ol></section>`).join('')}</div><aside class="ex-why"><p>この小例の固定スナップショットは、BEGINではなく最初のデータ操作で取得します。自分の書込みは自分から見え、他方にはcommitまで見えません。更新競合はcommit時に検査する単一行の簡略モデルで、DBのロック待ちやSQL標準の全分離規則を再現したものではありません。</p></aside>`;
 });
 ui.scope.on(root,'click',e=>{const id=e.target.closest('[data-os-id]')?.dataset.osId;if(id==='isolation-rc'||id==='isolation-rr')ui.restart(()=>M.mvccStart(id.slice(10)),id);if(/^(begin|read|commit|rollback)-[AB]$/.test(id||'')){const [kind,actor]=id.split('-');ui.act({kind,actor},id);}});
 ui.scope.on(root,'submit',e=>{if(!e.target.matches('[data-mvcc-write]'))return;e.preventDefault();if(e.target.reportValidity())ui.act({kind:'write',actor:e.target.dataset.mvccWrite,value:Number(e.target.elements.value.value)},'write-'+e.target.dataset.mvccWrite);});
});
})();
