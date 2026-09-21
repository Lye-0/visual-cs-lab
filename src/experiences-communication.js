/* Communication activities distinguish what each participant actually knows.
 * All hosts and diagnostic output are fictional and contained in this page. */
(() => {
'use strict';
const L=CSL,X=L.experiences,h=L.h,B=X.html.button,T=X.html.table;
X.registerWidget('switch',(root,a,c)=>{
 const s=X.scope(root,c);let state={table:{},history:[]};
 root.innerHTML=`<p>3台は同じLANです。最初、スイッチは端末の場所を知りません。フレームを受け取るたびに、送信元の場所を覚えます。</p><form class="ex-inputs"><label>送信元<select name="from"><option>A</option><option>B</option><option>C</option></select></label><label>宛先<select name="to"><option>B</option><option>A</option><option>C</option></select></label><button type="submit" class="ex-button ex-primary">このフレームを送る</button></form><div class="ex-network-topology"><span>端末A<br>port 1</span><strong>スイッチ</strong><span>端末B<br>port 2</span><span>端末C<br>port 3</span></div><div data-switch-table></div><p data-ex-status role="status"></p>${B('学習表を空にする','data-switch-reset')}<div data-switch-log></div>`;
 function paint(){root.querySelector('[data-switch-table]').innerHTML='<h4>いま覚えている送信元</h4>'+T(['MACに対応する端末','学んだポート'],Object.entries(state.table));const last=state.history.at(-1);root.querySelector('[data-ex-status]').textContent=last?`送信元${last.from}をport ${state.table[last.from]}として学習。${last.known?'宛先'+last.to+'の場所を知っているので、そのポートだけへ転送。':'宛先'+last.to+'はまだ表にないので、入ってきた所以外のポートへ広げます。'}`:'まだ受信していません。A→Bの後、B→Aを試してください。';root.querySelector('[data-switch-log]').innerHTML=T(['送信','学んだ相手','転送先ポート','そのときの判断'],state.history.map(r=>[r.from+' → '+r.to,r.learned,r.targets.join(', '),r.known?'表で宛先が分かった':'宛先不明なので広げる']));c.completed.add(s.id);}
 s.on(root.querySelector('form'),'submit',e=>{e.preventDefault();try{state=X.models.switchSend(state,e.target.elements.from.value,e.target.elements.to.value);paint();}catch(e){s.error(e);}});s.on(root,'click',e=>{if(e.target.closest('[data-switch-reset]')){state={table:{},history:[]};paint();}});paint();
});
X.registerWidget('tcp',(root,a,c)=>{
 const s=X.scope(root,c);let state;const count=6,window=3;
 function reset(){state={next:1,ack:1,unacked:[],received:[],wire:[],log:[],serial:0};paint();}
 function addWire(kind,value){state.wire.push({id:++state.serial,kind,value});}
 function log(text){state.log.push(text);}
 function paint(){
  const contiguous=(()=>{let n=1;while(state.received.includes(n))n++;return n;})();
  root.innerHTML=`<p>小例では1区画を1つのデータとして数えます。実際のTCPの番号はbyte単位です。送信側はACKを受け取るまで、相手に届いたか確信できません。</p><div class="ex-side-by-side"><section><h4>送信側が知っていること</h4><p>次に送る番号：${state.next>count?'全部送信済み':state.next}</p><p>ACKで確認できた範囲：${state.ack===1?'まだない':'1〜'+(state.ack-1)}</p><div class="ex-packet-cells">${Array.from({length:count},(_,i)=>{const n=i+1;return `<span class="${n<state.ack?'confirmed':state.unacked.includes(n)?'waiting':''}">${n}<small>${n<state.ack?'確認済み':state.unacked.includes(n)?'未確認':n<state.next?'送信済み':'未送信'}</small></span>`;}).join('')}</div>${B('次のデータを送信',`data-tcp-send${state.next>count||state.unacked.length>=window?' disabled':''}`)}${B('RTOの期限まで待って再送',`data-tcp-timeout${!state.unacked.length?' disabled':''}`)}<p>同時に未確認にできる数：${window}。空きは${window-state.unacked.length}です。</p></section><section><h4>受信側だけが知っていること</h4><div class="ex-packet-cells">${Array.from({length:count},(_,i)=>`<span class="${state.received.includes(i+1)?'confirmed':''}">${i+1}<small>${state.received.includes(i+1)?'届いた':'まだない'}</small></span>`).join('')}</div><p>次に必要な番号：${contiguous}。これより前は連続して揃っています。</p><p>届いた範囲をACKで伝える必要があります。画面の右側が見えるのは学習者だけで、送信側が自動的に知るわけではありません。</p></section></div><section class="ex-wire"><h4>回線の途中にあるもの</h4>${state.wire.map(p=>`<div class="ex-inflight"><strong>${p.kind==='DATA'?'DATA '+p.value:'ACK '+p.value}</strong><span>${p.kind==='DATA'?'受信側へ':'送信側へ'}</span>${B('届ける',`data-tcp-deliver="${p.id}"`)}${B('この配送だけ失わせる',`data-tcp-drop="${p.id}"`)}</div>`).join('')||'<p>いま配送中のものはありません。</p>'}</section><p data-ex-status role="status">${h(state.log.at(-1)||'データを送り、途中で届けるか落とすかを選んでください。')}</p><ol class="ex-persistent-log">${state.log.map(l=>'<li>'+h(l)+'</li>').join('')}</ol>${B('同じ開始状態へ戻す','data-tcp-reset')}`;c.completed.add(s.id);
 }
 s.on(root,'click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-tcp-reset')){reset();return;}
  if(b.hasAttribute('data-tcp-send')){if(state.next<=count&&state.unacked.length<window){const n=state.next++;state.unacked.push(n);addWire('DATA',n);log('DATA '+n+' を回線へ出しました。送信側では未確認です。');}}
  if(b.hasAttribute('data-tcp-timeout')){if(state.unacked.length){const n=Math.min(...state.unacked);addWire('DATA',n);log('確認が来ないままRTOになり、DATA '+n+' を再送しました。届かなかったのがデータかACKかは、送信側には分かりません。');}}
  if(b.hasAttribute('data-tcp-deliver')||b.hasAttribute('data-tcp-drop')){
   const id=Number(b.dataset.tcpDeliver||b.dataset.tcpDrop),i=state.wire.findIndex(p=>p.id===id);if(i<0)return;const p=state.wire.splice(i,1)[0];
   if(b.hasAttribute('data-tcp-drop'))log(p.kind+' '+p.value+' が失われました。両者へ「損失」と通知されるわけではありません。');
   else if(p.kind==='DATA'){const duplicate=state.received.includes(p.value);if(!duplicate)state.received.push(p.value);let next=1;while(state.received.includes(next))next++;addWire('ACK',next);log('受信側へDATA '+p.value+' が届きました。'+(duplicate?'重複なので二重には渡しません。':'')+'次に必要な位置をACK '+next+'で知らせます。');}
   else{const advanced=p.value>state.ack;state.ack=Math.max(state.ack,p.value);state.unacked=state.unacked.filter(n=>n>=state.ack);log('送信側へACK '+p.value+' が届きました。'+(advanced?'これより前を確認済みにできます。':'以前と同じか古い確認なので、新しく確定した範囲はありません。'));}
  }
  paint();
 });reset();
});
const diagnosisCases=[
 {title:'名前でWebを開けない',cause:'DNS設定',evidence:[['アドレスを確認','端末は192.0.2.10/24、gatewayは192.0.2.1。予定した設定と一致しています。'],['gatewayへ到達を確認','gatewayから応答が返ります。少なくともこのリンクの到達性はあります。'],['名前を問い合わせ','設定されたDNSサーバー203.0.113.99へ問い合わせますが、応答しません。運用表のDNSは192.0.2.53です。'],['IPでサービスを確認','予定したサーバーIPの443番とは接続できます。名前解決の前提を除くと到達できます。']],reason:'設定されたDNSの宛先が、運用表と一致しません。IPで接続できるという観測も、名前解決の側を調べる根拠です。'},
 {title:'LAN内は使えるが、別のLANへ出られない',cause:'経路設定',evidence:[['アドレスを確認','端末は192.0.2.10/24ですが、default gatewayが未設定です。'],['同じLANへ送る','同一LANの192.0.2.20から応答があります。'],['経路表を確認','192.0.2.0/24への直結経路だけがあり、別ネットワークへの経路はありません。'],['エラーを確認','別LANの198.51.100.80へは、次の送信先を選べず送信前に失敗します。']],reason:'同じLANの成功だけでは外部への経路を確認できません。送信元の経路表に、宛先へ向かう経路がありません。'},
 {title:'接続はできるが、ブラウザが警告する',cause:'証明書',evidence:[['DNSを確認','web.example.testは予定した198.51.100.80を返します。'],['TCP接続を確認','443番への接続は確立します。'],['証明書を確認','署名と期間は正しいものの、証明書の対象名はold.example.testです。'],['要求した名前を確認','利用者が開こうとしているのはweb.example.testです。証明書の名前と一致しません。']],reason:'回線の接続成功と、相手を目的の名前として確認できることは別です。名前の不一致を無視して接続するのではなく、正しい証明書・接続先を確認します。'},
 {title:'一部の端末からだけ接続できない',cause:'アクセス規則',evidence:[['同じ宛先へ比較','内部端末から443番へは成功し、外部端末からは応答がありません。'],['名前を確認','両方の端末で同じ予定IPを得ています。'],['境界の記録を読む','外部ゾーンから443番への通信が、先頭のdeny規則に一致した記録があります。'],['規則の順番を読む','後ろにallow tcp 443がありますが、その前のdeny external anyが先に一致しています。']],reason:'規則は今回、最初の一致で決まります。後ろに許可を追加するだけでは、先の拒否を通り抜けられません。'},
 {title:'利用者が増えると応答が遅くなる',cause:'処理能力',evidence:[['エラーを比較','接続自体は確立し、空いている時間には正常に返ります。'],['到着数と処理数','毎秒8件届く一方、サーバーは毎秒5件しか処理できていません。'],['待ちの記録','負荷の続く間、待ち件数が増え続け、容量を超えた後に破棄が出ています。'],['名前と証明書を確認','予定したIPと名前が一致し、証明書の検証にも成功しています。']],reason:'この例の観測では、継続して到着が処理能力を上回っています。DNSや証明書を直しても、この待ちの増加は解消しません。'}
];
X.registerWidget('diagnose',(root,a,c)=>{
 const s=X.scope(root,c);let caseIndex=0,opened=new Set(),guess='',feedback='';
 function paint(){const item=diagnosisCases[caseIndex];root.innerHTML=`<div class="ex-incident"><h4>調査依頼：${h(item.title)}</h4><p>原因はまだ表示しません。どの観測から何を判断できるか考えてください。ここで扱う出力は、この事例のために作った架空の記録です。</p></div><div class="ex-probe-grid">${item.evidence.map(([label,text],i)=>`<section>${B(label,`data-probe="${i}"`)}${opened.has(i)?'<p>'+h(text)+'</p>':'<p class="ex-caption">まだ調べていません</p>'}</section>`).join('')}</div><form class="ex-diagnosis-form"><label>今の仮説<select name="guess"><option value="">原因の候補を選ぶ</option>${['DNS設定','経路設定','証明書','アクセス規則','処理能力'].map(g=>`<option${g===guess?' selected':''}>${g}</option>`).join('')}</select></label><label>判断の根拠にする観測<select name="evidence"><option value="">読んだ観測を選ぶ</option>${[...opened].map(i=>`<option value="${i}">${h(item.evidence[i][0])}</option>`).join('')}</select></label><button type="submit" class="ex-button">仮説と証拠を照合する</button></form><p data-ex-status role="status">${h(feedback)}</p><div class="ex-actions">${B('別の症状を調べる','data-probe-new')}${B('同じ事例を最初から','data-probe-reset')}</div>`;c.completed.add(s.id);}
 s.on(root,'click',e=>{const p=e.target.closest('[data-probe]');if(p){opened.add(+p.dataset.probe);paint();}if(e.target.closest('[data-probe-new]')){caseIndex=(caseIndex+1)%diagnosisCases.length;opened=new Set();guess='';feedback='';paint();}if(e.target.closest('[data-probe-reset]')){opened=new Set();guess='';feedback='';paint();}});
 s.on(root,'submit',e=>{e.preventDefault();guess=e.target.elements.guess.value;const evidence=e.target.elements.evidence.value;if(!guess||evidence===''){feedback='原因だけでなく、読んだ観測から根拠も選んでください。';}else if(guess!==diagnosisCases[caseIndex].cause){feedback='この仮説だけでは、観測の組合せを説明しきれません。他の情報を確認して比較してください。';}else{feedback=diagnosisCases[caseIndex].reason+' 選んだ観測が結論を直接支えるか、他の観測と組み合わせる必要があるかも説明してみてください。';}paint();});paint();
});
X.registerWidget('derivation',(root,a,c)=>{
 const s=X.scope(root,c);root.innerHTML=`${a.premise?'<p class="ex-premise">'+h(a.premise)+'</p>':''}<div class="ex-proof">${a.lines.map(([expression,reason],i)=>`<section class="ex-proof-line"><span>${i+1}</span><div>${X.html.formula(expression)}<p>${h(reason)}</p></div></section>`).join('')}</div>${a.counterexample?'<p class="ex-counterexample">'+h(a.counterexample)+'</p>':''}`;c.completed.add(s.id);
});
})();
