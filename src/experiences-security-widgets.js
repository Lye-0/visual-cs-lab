/* Shared only: lifecycle, form identity, undo and asynchronous cancellation.
 * Each widget below authors its own object layout and learning interaction. */
(() => {
'use strict';
const L=CSL,X=L.experiences,S=X.securityDesk,h=L.h;
if(typeof document==='undefined')return;
S.ui={
 b:(label,action,attrs='')=>`<button type="button" class="ex-button" data-sec-action="${h(action)}" ${attrs}>${h(label)}</button>`,
 p:text=>'<p>'+h(text)+'</p>',box:(title,body)=>'<section class="ex-sec-box"><h4>'+h(title)+'</h4>'+body+'</section>',
 table:(heads,rows)=>X.html.table(heads,rows)
};
const {b,p,box,table}=S.ui;
S.mount=(root,current,config)=>{
 const scope=X.scope(root,current);let state=config.start(),history=[],generation=0,busy=false;
 root.classList.add('ex-sec-workspace');
 root.innerHTML=p(config.instruction)+`<div class="ex-actions">${b('実験を最初から','reset')}${b('一つ前の操作へ','undo')}</div><div data-sec-board></div><p data-sec-status role="status" aria-live="polite"></p><details class="ex-sec-history"><summary>操作と判断の記録</summary><ol data-sec-log></ol></details>`;
 const board=root.querySelector('[data-sec-board]'),status=root.querySelector('[data-sec-status]');
 const field=(key,label,value,options={})=>{
  const id=scope.id+'-sec-'+key,type=options.type||(typeof value==='number'?'number':'text');
  const attrs=`id="${id}" data-sec-field="${h(key)}"`;
  let input;
  if(options.choices)input=`<select ${attrs}>${options.choices.map(item=>{const [v,name]=Array.isArray(item)?item:[item,item];return `<option value="${h(v)}"${String(value)===String(v)?' selected':''}>${h(name)}</option>`;}).join('')}</select>`;
  else if(type==='textarea')input=`<textarea ${attrs} rows="5" maxlength="${options.maxLength||4096}" spellcheck="false">${h(value)}</textarea>`;
  else if(type==='checkbox')input=`<input ${attrs} type="checkbox"${value?' checked':''}>`;
  else input=`<input ${attrs} type="${type}" value="${h(value)}" ${type==='number'?`min="${options.min??0}" max="${options.max??1000}" step="${options.step??1}" required`:'maxlength="4096" autocomplete="off"'}>`;
  return `<label class="ex-sec-field" for="${id}"><span>${h(label)}</span>${input}</label>`;
 };
 const fields=()=>({get:key=>{const el=board.querySelector('[data-sec-field="'+key+'"]');if(!el)throw Error('入力がありません：'+key);if(!el.checkValidity()||el.type==='number'&&el.value==='')throw Error('「'+(el.labels?.[0]?.textContent||key)+'」の入力範囲を確認してください。');return el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;}});
 function paint(preserve=true){
  if(!scope.alive())return;
  const focus=document.activeElement,identity=focus&&root.contains(focus)?focus.getAttribute('data-sec-action'):null,fieldId=focus&&root.contains(focus)?focus.getAttribute('data-sec-field'):null;
  const retained=preserve?[...board.querySelectorAll('[data-sec-field]')].map(el=>({key:el.dataset.secField,value:el.value,checked:el.checked})):[];
  board.innerHTML=config.render(state,{field});
  for(const old of retained){const el=board.querySelector('[data-sec-field="'+old.key+'"]');if(el){el.value=old.value;if(el.type==='checkbox')el.checked=old.checked;}}
  root.dataset.secState=JSON.stringify(state);root.setAttribute('aria-busy','false');
  root.querySelector('[data-sec-action="undo"]').disabled=history.length===0;
  root.querySelector('[data-sec-log]').innerHTML=state.log.map(line=>'<li>'+h(line)+'</li>').join('');
  status.textContent=state.log.at(-1)||'対象を選んで試してください。';status.classList.remove('ex-error');
  const target=fieldId?[...root.querySelectorAll('[data-sec-field]')].find(el=>el.dataset.secField===fieldId):identity?[...root.querySelectorAll('[data-sec-action]')].find(el=>el.dataset.secAction===identity):null;
  if(target&&!target.disabled)target.focus({preventScroll:true});
  current.completed.add(scope.id);
 }
 function fail(error){status.textContent=error.message||String(error);status.classList.add('ex-error');root.setAttribute('aria-busy','false');}
 async function apply(action){
  if(!scope.alive()||busy)return;const token=++generation;busy=true;root.setAttribute('aria-busy','true');
  try{const before=S.clone(state),next=await config.reduce(state,action);if(token!==generation||!scope.alive())return;history.push(before);if(history.length>64)history.shift();state=next;paint(!action.fresh);}
  catch(error){if(token===generation&&scope.alive())fail(error);}
  finally{if(token===generation){busy=false;root.setAttribute('aria-busy','false');}}
 }
 scope.on(root,'click',event=>{
  const button=event.target.closest('[data-sec-action]');if(!button||!root.contains(button))return;event.preventDefault();const code=button.dataset.secAction;
  if(code==='reset'){generation++;busy=false;history=[];state=config.start();paint(false);return;}
  if(code==='undo'){if(busy||!history.length)return;state=history.pop();paint(false);return;}
  if(busy)return;
  try{const action=config.action(code,fields(),state);if(action)void apply(action);}catch(error){fail(error);}
 });
 scope.on(root,'submit',event=>{event.preventDefault();});
 scope.cleanup(()=>{generation++;busy=false;});paint(false);
 return {scope,state:()=>state,apply};
};

X.registerWidget('asset-paths',(root,a,c)=>S.mount(root,c,{
 start:S.threatStart,reduce:S.threat,instruction:'通常のAPIだけでなく、同じ文書へ届く以前の書出し口も見ます。図の確認箇所を切り替え、第三者を止めても自分の文書は読めるかを比べてください。',
 action:code=>({kind:'toggle',key:code}),
 render:s=>{
  const control=(key,label)=>b(label+'：'+(s.checks[key]?'確認する':'確認しない'),key,`aria-pressed="${s.checks[key]}"`);
  return `<div class="ex-sec-paths">${box('通常のAPI',p('利用者 → API → 文書本文')+control('login','本人')+control('owner','所有者'))}${box('以前の書出し口',p('利用者 → 旧サービス → 同じ文書本文')+control('legacy','本人と所有者'))}${box('申請の承認',p('利用者 → API → 承認結果')+control('approval','承認者と申請者の分離'))}</div>`+box('正常な利用も同じ設定で確かめる',table(['主体','行いたいこと','本来の要求','今回の結果','一致'],S.threatView(s).map(r=>[r.actor,r.intent,r.needed?'許可が必要':'拒否が必要',r.actual?'届く':'止まる',r.correct?'一致':'見直す'])))+p('この固定した経路内の分析です。図にない脆弱性を検査したわけではありません。入力の形式検査は、本人や所有者の認可の代用にはしません。');
 }
}));

X.registerWidget('aes-byte-map',(root,a,c)=>S.mount(root,c,{
 start:S.aesStart,reduce:S.aes,instruction:'処理名を選び、右の行列のbyteを押してください。左で使われた場所と、右へ出た値を対応させます。再生を追う必要はありません。',
 action:code=>{const [kind,value]=code.split(':');return {kind,value:Number(value)};},
 render:s=>{
  const v=S.aesView(s),hex=x=>x.toString(16).padStart(2,'0');
  const matrix=(values,output)=>`<div class="ex-sec-matrix" aria-label="${output?'変更後':'変更前'}の4行4列">${Array.from({length:16},(_,n)=>{const row=Math.floor(n/4),col=n%4,i=col*4+row;return output?b(hex(values[i]),'cell:'+i,`aria-label="変更後 row ${row} column ${col} ${hex(values[i])}" aria-pressed="${i===s.cell}"`):`<div class="${v.sources.includes(i)?'is-source':''}"><small>${row},${col}</small>${hex(values[i])}</div>`;}).join('')}</div>`;
  return `<div class="ex-sec-step-list">${v.trace.map((t,i)=>b(t.round+' '+t.operation,'step:'+i,`aria-pressed="${s.step===i}"`)).join('')}</div><div class="ex-sec-two">${box('変更前：使うbyteを強調',matrix(v.previous.state,false))}${box('変更後：一つ選ぶ',matrix(v.step.state,true))}</div>${box(v.step.round+' / '+v.step.operation,p(v.explanation)+table(['使った項','値'],v.terms))}<div class="ex-actions">${b('選んだ位置の入力1bitを反転','flip')}</div>${p('この入力と固定公開鍵による最終AES暗号文：'+v.cipher)}${p('列優先の16byteを4×4へ配置しています。MixColumnsは最終roundにはありません。これはAES-128の公開テスト計算であり、鍵やこの使い方を実データへ流用しないでください。')}`;
 }
}));

X.registerWidget('policy-request',(root,a,c)=>S.mount(root,c,{
 start:S.policyStart,reduce:S.policy,instruction:'まずakiが自分の文書を読む要求を試し、対象だけをharuへ変えてください。承認の事例ではharuに役割があっても、自分の申請の承認は拒否されます。',
 action:(_,f)=>({kind:'set',actor:f.get('actor'),object:f.get('object'),operation:f.get('operation'),hour:f.get('hour'),mode:f.get('mode')}),
 render:(s,{field})=>{const v=S.policyView(s);return `<div class="ex-sec-two">${box('具体的な要求を組み立てる',`<form>${field('mode','事例',s.mode,{choices:[['owner','自分の文書'],['approval','業務時間内の申請承認']]})}${field('actor','誰が',s.actor,{choices:['aki','haru','guest']})}${field('object','誰の文書・申請',s.object,{choices:['aki','haru']})}${field('operation','何をする',s.operation,{choices:[['read','読む'],['write','更新'],['approve','承認']]})}${field('hour','何時に',s.hour,{min:0,max:23})}${b('この要求を照合','set')}</form>`)}${box('どの条件を使ったか',`<p class="ex-sec-verdict" data-sec-verdict>${v.allowed?'許可':'拒否'}</p>`+p('この主体の役割：'+(v.roles.join(', ')||'なし'))+table(['この事例で必要な条件','今回'],v.checks.map(([name,ok])=>[name,ok?'満たす':'満たさない'])))}</div>${p('文書の所有者型ポリシーと、役割・時刻・職務分離を組み合わせたポリシーを比較する小例です。全てのDAC・RBAC・ABAC実装がこの規則を使うという意味ではありません。')}`;}
}));

X.registerWidget('memory-boundary',(root,a,c)=>S.mount(root,c,{
 start:S.memoryStart,reduce:S.memory,instruction:'4byteのbufferへ6byteを書いてください。境界検査を外した結果を、戻る際のcanary検査やデータ領域の実行権限と別々に確かめます。',
 action:(code,f)=>{const [kind,key]=code.split(':');return kind==='write'?{kind,count:f.get('count')}:{kind,key};},
 render:(s,{field})=>`<div class="ex-actions">${[['bounds','範囲・世代検査'],['canary','canary検査'],['nx','NX']].map(([key,label])=>b(label+' '+(s[key]?'あり':'なし'),'toggle:'+key,`aria-pressed="${s[key]}"`)).join('')}</div>${box('仮想byte列：実PCのメモリではありません',`<div class="ex-sec-memory">${s.memory.map((v,i)=>`<div class="${i<4?'buffer':i<6?'canary':'return'}"><small>${i<4?'buffer':i<6?'canary':'戻り情報'} / ${i}</small><strong>${v.toString(16).padStart(2,'0')}</strong></div>`).join('')}</div>`)}<form>${field('count','書き込むbyte数',6,{min:1,max:8})}${b('旧ハンドルで書く','write')}</form><div class="ex-actions">${b('戻る前にcanaryを確認','return')}${b('データ領域の実行権限を確認','execute')}${b('割当を解放','free')}${b('同じ番地へ新しく確保','allocate')}${b('旧ハンドルで読む','read')}</div>${box('今の参照と判断',p('旧ハンドル世代 '+s.handle+' / 現在の割当世代 '+s.generation+' / '+(s.alive?'割当中':'解放済み'))+`<p data-sec-verdict>${h(s.last||'まだ操作していません。')}</p>`)}${p('この模型は範囲違反の要求を事前に全体拒否します。canaryとNXは破損の後に違う条件を検査します。ASLRや実攻撃コードはここでは扱いません。')}`
}));

X.registerWidget('shamir-candidates',(root,a,c)=>S.mount(root,c,{
 start:S.shareStart,reduce:S.share,instruction:'まず共有片を一つ、次に二つ選び、秘密の候補が残ることを見ます。三つ目で、どの場所の値が一つに決まるでしょうか。',
 action:code=>({kind:'toggle',x:Number(code.split(':')[1])}),
 render:s=>{const v=S.shareView(s);return `<div class="ex-sec-shares">${S.sharePoints(s).map(pnt=>b('共有片 '+pnt.x+'：('+pnt.x+', '+pnt.y+')','toggle:'+pnt.x,`aria-pressed="${s.selected.includes(pnt.x)}"`)).join('')}</div><div class="ex-sec-two">${box('集めた点だけから残る秘密候補',`<div class="ex-sec-candidates">${v.counts.map((count,i)=>`<div class="${count?'possible':'ruled-out'}"><strong>${i}</strong><small>${count}通りの多項式</small></div>`).join('')}</div>`)}${box('候補が残る理由',p('法17で f(x)=秘密+a x+b x² を考えます。共有片はx=1〜5、秘密は配っていないx=0の値です。')+`<p class="ex-sec-verdict" data-sec-verdict>${v.candidates.length===1?'一意に決まる：'+v.candidates[0]:'秘密候補は'+v.candidates.length+'個'}</p>`+p('点に合う多項式は計'+v.polynomials+'通り。次数は2以下として、aやbが0の場合も除かず列挙しています。'))}</div><details><summary>各秘密候補に一致する多項式の一例</summary>${table(['秘密','a','b'],v.examples.map(e=>[e.secret,e.a,e.b]))}</details>${p('これは固定した公開係数の3-of-5教材です。受信側の候補計算は、まだ選んでいない点や生成時の秘密を使いません。実際の秘密分散では係数を適切な独立一様乱数で選ぶ必要があります。')}`;}
}));
})();
