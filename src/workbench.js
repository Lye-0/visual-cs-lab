/* A stateless workbench: compute -> inspect -> change one condition -> compare. */
(() => {
'use strict';
const L=CSL,A=L.app,{h,icon,clone,fmt}=L;
const tabs=[['understand','操作と考え方'],['data','現在の値・実行手順'],['compare','条件を比較'],['model','モデルと根拠']];
const stateReady=c=>!!c?.result&&!c.pending&&!c.dirty&&!c.error;
function formatParam(ctrl,v){
 if(ctrl.type==='toggle')return v?'オン':'オフ';
 if(ctrl.type==='select')return ctrl.options.find(o=>String(o.value)===String(v))?.label??v;
 return typeof v==='object'?JSON.stringify(v):String(v??'');
}
A.formatParam=formatParam;
const patchText=lab=>Object.entries(lab.exploration.patch).map(([key,v])=>{
 const ctrl=lab.controls.find(x=>x.key===key);if(!ctrl)return '';
 return `${ctrl.label}：${ctrl.type==='code'?'用意した別の例':formatParam(ctrl,v)}${ctrl.unit||''}`;
}).filter(Boolean).join(' / ');
function control(ctrl,params){
 const id='p-'+ctrl.key,v=params[ctrl.key],help=ctrl.help?`<div class="control-help" id="help-${id}">${h(ctrl.help)}</div>`:'',aria=ctrl.help?`aria-describedby="help-${id}"`:'';
 if(ctrl.type==='toggle')return `<div class="control"><label class="toggle-label" for="${id}"><span>${h(ctrl.label)}</span><input type="checkbox" data-param="${ctrl.key}" id="${id}"${v?' checked':''} ${aria}><span class="toggle-switch"></span></label>${help}</div>`;
 if(ctrl.type==='range'){
  let max=ctrl.max;if(A.current?.lab.id==='c01-bits'&&ctrl.key==='value')max=2**params.width-1;
  return `<div class="control"><div class="control-label"><label for="${id}">${h(ctrl.label)}</label></div><div class="range-number"><input type="number" inputmode="decimal" id="num-${id}" data-number="${ctrl.key}" aria-label="${h(ctrl.label)}の数値" min="${ctrl.min}" max="${max}" step="${ctrl.step}" value="${v}"><span>${h(ctrl.unit)}</span></div><input id="${id}" type="range" data-param="${ctrl.key}" min="${ctrl.min}" max="${max}" step="${ctrl.step}" value="${v}" ${aria}><div class="range-scale"><span>${ctrl.min}${h(ctrl.unit)}</span><span data-range-max="${ctrl.key}">${max}${h(ctrl.unit)}</span></div>${help}</div>`;
 }
 if(ctrl.type==='select')return `<div class="control"><label class="control-label" for="${id}">${h(ctrl.label)}</label><select id="${id}" data-param="${ctrl.key}" ${aria}>${ctrl.options.map(o=>`<option value="${h(o.value)}"${String(o.value)===String(v)?' selected':''}>${h(o.label)}</option>`).join('')}</select>${help}</div>`;
 if(ctrl.type==='code')return `<div class="control code-control"><label class="control-label" for="${id}">${h(ctrl.label)}</label><textarea id="${id}" data-param="${ctrl.key}" spellcheck="false" ${aria}>${h(v)}</textarea>${help}<div class="control-help">編集後「入力を反映」を押します。コードは教材モデルで処理します。</div></div>`;
 return `<div class="control text-control"><label class="control-label" for="${id}">${h(ctrl.label)}</label><input type="text" id="${id}" data-param="${ctrl.key}" value="${h(v)}" spellcheck="false" autocomplete="off" ${aria}>${help}</div>`;
}
function builderTools(){return `<div class="builder-tools"><span class="builder-tools-title">機器を追加</span>${[['pc','端末'],['switch','スイッチ'],['router','ルーター'],['server','サーバー']].map(([kind,label])=>A.button(label,'add-node','plus','sm ghost',`data-kind="${kind}"`)).join('')}${A.button('2台をつなぐ','connect-nodes','link','sm')}${A.button('選択を削除','remove-node','trash','sm ghost')}</div><div class="builder-hint" id="builder-hint">機器を選んで「2台をつなぐ」。線を押すと切断・接続。ドラッグで移動できます。</div>`;}
function gitTools(){return `<div class="git-actions"><span>コマンドを末尾に追加して実行</span>${[['edit notes.txt "next edit"','編集'],['add .','ステージ'],['commit -m "変更を保存"','コミット'],['branch feature','枝を作る'],['switch feature','枝を移る'],['reset --soft HEAD~1','soft reset']].map(([cmd,label])=>`<button type="button" class="btn sm ghost" data-action="git-command" data-command="${h(cmd)}">${h(label)}</button>`).join('')}</div>`;}
A.views.lab=parts=>{
 const lab=A.lab(parts[0]);if(!lab)return A.views.notfound();
 const params=L.validateParams(lab,lab.defaults);
 const c=A.current={lab,params,result:null,index:0,mode:'guided',tab:'understand',playing:false,speed:1,token:0,pending:false,dirty:false,error:null,answer:null,graded:false,selected:null,connectFrom:null,baseline:null,initialResult:null,compareIndices:null,example:'initial'};
 c.player=L.createPlayer({onChange:s=>{
  if(A.current!==c)return;
  const changed=c.index!==s.index;c.index=s.index;c.playing=s.playing;c.speed=s.speed;
  if(changed&&stateReady(c))A.renderFrame();else A.updatePlayer();
 }});
 A.setTitle(lab.unit);A.setNav(lab.track==='core'?'catalog':lab.track,lab.unit);
 document.getElementById('main').innerHTML=`<div class="lab-heading"><div><div class="eyebrow"><a href="#/catalog?area=${lab.area}">${h(A.area(lab.area)?.name)}</a><span>/</span>${A.pill(lab.track,lab.topic||A.trackName(lab.track))}<span>${lab.minutes}分の目安 · ${['','入門','基礎＋','発展'][lab.level]}</span></div><h1>${h(lab.unit)}</h1><p class="lab-summary">${h(lab.summary)}</p></div><div class="button-row">${A.link('#/catalog?area='+lab.area,'単元一覧へ','grid','ghost')}${A.button('操作ガイド','guide-focus','help','ghost')}</div></div><section class="starter-guide panel" id="starter-guide" aria-label="この実験の始め方"><div class="starter-question"><span>この実験の問い</span><h2>${h(lab.question)}</h2></div><div class="starter-steps"><div><span class="guide-number">01 / まず試す</span><p>${lab.presentation==='direct'?'初期条件の結果を見て、入力と出力の対応を確かめます。':'初期条件で動かして、手順と「今の状態」を一緒に見ます。'}</p>${A.button('A：初期条件を試す','example','play','sm','data-example="initial"')}</div><div><span class="guide-number">02 / 条件を変える</span><p>${h(lab.exploration.label)}</p>${A.button('B：この条件で試す','example','settings','sm','data-example="variant"')}<small class="patch-description">${h(patchText(lab))}</small></div><div><span class="guide-number">03 / ここを見る</span><p class="observe-point">${h(lab.observe)}</p>${A.button('AとBの結果を比べる','show-compare','compare','sm ghost')}</div></div></section><div class="mode-bar"><div class="tabs" aria-label="実験の使い方">${[['guided','案内と一緒に'],['free','自由に試す'],['challenge','理解を確かめる']].map(([key,title])=>`<button type="button" class="tab${key==='guided'?' active':''}" data-mode="${key}" aria-pressed="${key==='guided'}">${title}</button>`).join('')}</div><button type="button" class="model-caption" data-action="model-tab">${icon('info',14)}モデルの範囲・省略を見る</button></div><div class="workbench"><section class="panel controls-panel" aria-label="実験の入力条件"><div class="panel-heading"><h2>${icon('settings',16)} 入力・条件</h2></div><p class="controls-instruction">数値やスイッチを変えてみてください。文字入力は入力後に反映します。</p><div class="controls-body" id="controls">${lab.controls.map(ctrl=>control(ctrl,params)).join('')}</div>${lab.engine==='git'?gitTools():''}<div class="control-footer">${A.button('入力を反映','apply','check','primary')}${A.button('初期条件に戻す','reset','reset','ghost')}</div><p class="input-status" id="input-status" role="status"></p></section><section class="panel visual-panel" id="visual-panel" aria-label="実験の可視化"><div class="visual-toolbar"><h2>${h(lab.title)}</h2><span class="frame-count" id="frame-count">計算中</span>${A.button('条件を変える','conditions-focus','settings','sm mobile-conditions')}</div>${lab.engine==='builder'?builderTools():''}<div class="viz-stage"><div class="visualization" id="visualization" tabindex="0" aria-label="実験の図。大きな図はスクロールできます。"><div class="empty-state">モデルを計算しています…</div></div><div id="result-pending" class="result-pending" hidden>新しい条件を反映しています</div></div><div id="node-inspection"></div><div class="mobile-scroll-hint">図が収まらない場合は、図の中をスクロールできます。</div><div class="player" id="player"><p class="direct-hint" id="direct-hint" hidden>${icon('settings',16)}この実験は入力に応じてその場で結果が変わります。再生操作は不要です。</p><div class="player-sequence" id="player-sequence"><div class="player-controls"><button type="button" class="btn icon-only ghost" data-action="first" aria-label="最初の手順へ">${icon('reset',16)}</button><button type="button" class="btn icon-only" data-action="back" aria-label="1ステップ戻る">${icon('back',16)}</button><button type="button" class="btn play primary" data-action="play" id="play-button" aria-pressed="false">${icon('play',14)} 最初から再生</button><button type="button" class="btn icon-only" data-action="next" aria-label="1ステップ進む">${icon('next',16)}</button><button type="button" class="btn ghost" data-action="last" aria-label="最後の状態へ">結果へ ${icon('arrow',16)}</button><label class="speed-control"><span>表示速度</span><select id="play-speed" aria-label="再生速度"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label></div><div class="scrubber-row"><label class="sr-only" for="scrubber">実験のステップ位置</label><input class="scrubber" id="scrubber" type="range" min="0" max="1" step="1" value="0" aria-describedby="scrubber-help"><output id="step-position" for="scrubber">—</output></div><p class="scrubber-help" id="scrubber-help">バーを動かすと一時停止し、その手順へ移動します。</p></div></div><section class="current-step" id="current-step" aria-live="polite" aria-atomic="true"></section><div class="visual-note"><span>図の時間はモデル内の値です。表示速度とは別です。</span><span class="keyboard-help">← → 1手順 / Space 再生</span></div></section><aside class="panel inspector-panel" id="inspector" aria-label="結果と観察の手がかり"></aside></div><section class="below-workbench"><nav class="detail-tabs" aria-label="実験の詳細">${tabs.map(([id,title])=>`<button type="button" class="detail-tab${id==='understand'?' active':''}" data-tab="${id}" aria-pressed="${id==='understand'}">${title}</button>`).join('')}</nav><div class="detail-content" id="detail-content"></div></section>${A.footer()}`;
 A.syncControls();A.renderDetails();A.runCurrent();
};
A.paintRange=el=>{
 const lo=Number(el.min),hi=Number(el.max),v=Number(el.value);
 const ratio=hi>lo?Math.max(0,Math.min(100,(v-lo)/(hi-lo)*100)):0;
 el.style.setProperty('--range-fill',ratio+'%');
};
A.syncControls=()=>{
 const c=A.current;if(!c)return;
 for(const ctrl of c.lab.controls){
  const field=document.getElementById('p-'+ctrl.key);if(!field)continue;
  if(ctrl.type==='toggle')field.checked=c.params[ctrl.key];
  else if(field!==document.activeElement||field.type==='range')field.value=c.params[ctrl.key];
  const number=document.getElementById('num-p-'+ctrl.key);if(number&&number!==document.activeElement)number.value=c.params[ctrl.key];
 }
 if(c.lab.id==='c01-bits'){
  const max=2**c.params.width-1;document.getElementById('p-value').max=max;document.getElementById('num-p-value').max=max;document.querySelector('[data-range-max="value"]').textContent=max;
 }
 document.querySelectorAll('#controls input[type=range]').forEach(A.paintRange);
 const defaults=L.validateParams(c.lab,c.lab.defaults),variant=L.validateParams(c.lab,{...c.lab.defaults,...c.lab.exploration.patch});
 document.querySelectorAll('[data-action="example"]').forEach(el=>{const target=el.dataset.example==='variant'?variant:defaults;el.setAttribute('aria-pressed',String(JSON.stringify(c.params)===JSON.stringify(target)));});
};
A.inputStatus=message=>{const el=document.getElementById('input-status');if(el)el.textContent=message;};
A.markPending=()=>{
 const c=A.current;if(!c)return;
 const stale=c.dirty||c.pending;
 const overlay=document.getElementById('result-pending');if(overlay){overlay.hidden=!stale;overlay.textContent=c.pending?'計算しています…':'入力が変わりました。前の結果は比較に使用できません。';}
 document.getElementById('visual-panel')?.setAttribute('aria-busy',String(c.pending));
 document.getElementById('visualization')?.classList.toggle('outdated',stale);
 document.getElementById('inspector')?.classList.toggle('outdated',stale);
 A.updatePlayer();
};
A.runCurrent=async(options={})=>{
 // Legacy boolean callers in the topology tools mean "show the final state".
 if(typeof options==='boolean')options={position:options?'last':'start'};
 const c=A.current;if(!c)return false;
 A.stop();clearTimeout(A.parameterTimer);
 const token=++c.token;c.pending=true;c.error=null;
 let params=L.validateParams(c.lab,c.params);
 if(c.lab.id==='c01-bits')params.value=Math.min(params.value,2**params.width-1);
 params=clone(params);A.inputStatus('入力からモデルを計算しています…');A.markPending();
 try{
  const r=await L.run(c.lab,params);
  if(c!==A.current||token!==c.token)return false;
  c.params=params;c.result=r;c.compareIndices=null;c.computedParams=clone(params);c.pending=false;c.dirty=false;c.error=null;
  if(JSON.stringify(params)===JSON.stringify(L.validateParams(c.lab,c.lab.defaults)))c.initialResult=r;
  c.index=options.position==='last'?r.frames.length-1:0;
  c.player.configure(r.frames.length,c.index);
  A.syncControls();A.markPending();A.renderFrame();A.renderDetails();
  A.inputStatus(r.frames.length===1?'入力を反映しました。結果はその場で更新されます。':'入力を反映しました。「最初から再生」で流れを確認できます。');
  if(options.autoplay&&r.frames.length>1)c.player.play();
  return true;
 }catch(error){
  if(c!==A.current||token!==c.token)return false;
  c.error=error.message;c.result=null;c.pending=false;c.dirty=false;c.player.configure(0);A.markPending();
  const cryptoError=/Web Crypto|WebCrypto|暗号API/i.test(error.message);
  document.getElementById('visualization').innerHTML=`<div class="experiment-error" role="alert">${icon('info',28)}<h3>${cryptoError?'この表示環境では暗号APIが使えません':'入力を確認してください'}</h3><p>${h(error.message)}</p>${cryptoError?'<p>通常のブラウザで単体HTMLを開くか、付属のローカルサーバーから開いてください。計算を別の結果で置き換えることはしません。</p>':''}${A.button('初期条件に戻す','reset','reset','sm')}</div>`;
  document.getElementById('frame-count').textContent='計算できません';
  document.getElementById('current-step').innerHTML='<p>結果は表示していません。入力を修正して反映するか、モデルの説明を確認してください。</p>';
  document.getElementById('inspector').innerHTML=`<section class="inspector-section"><h3>何を学ぶ単元？</h3><p>${h(c.lab.summary)}</p><h3>観察するポイント</h3><p>${h(c.lab.observe)}</p></section>`;
  A.inputStatus(cryptoError?'通常のブラウザで実行してください。':'入力を修正して「入力を反映」を押してください。');A.renderDetails();A.updatePlayer();
  return false;
 }
};
A.updatePlayer=()=>{
 const c=A.current;if(!c)return;
 const ready=stateReady(c),len=c.result?.frames.length||0,direct=c.lab.presentation==='direct'||(ready&&len===1);
 const sequence=document.getElementById('player-sequence'),hint=document.getElementById('direct-hint');if(sequence)sequence.hidden=direct;if(hint)hint.hidden=!direct;
 const play=document.getElementById('play-button');if(play){
  play.disabled=c.pending||!!c.error||(!c.dirty&&!ready)||len===1;
  play.setAttribute('aria-pressed',String(c.playing));
  const label=c.playing?'一時停止':c.dirty?'条件を反映して再生':c.index===len-1&&len>1?'もう一度再生':c.index>0?'ここから再生':'最初から再生';
  play.innerHTML=icon(c.playing?'pause':'play',14)+' '+label;
 }
 for(const [action,edge]of [['first',c.index===0],['back',c.index===0],['next',c.index>=len-1],['last',c.index>=len-1]]){
  const el=document.querySelector(`[data-action="${action}"]`);if(el)el.disabled=!ready||len<2||edge;
 }
 const sc=document.getElementById('scrubber');if(sc){sc.disabled=!ready||len<2;sc.max=Math.max(1,len-1);sc.value=c.index;A.paintRange(sc);}
 const pos=document.getElementById('step-position');if(pos)pos.textContent=len?`${c.index+1} / ${len}`:'—';
 const speed=document.getElementById('play-speed');if(speed)speed.disabled=!ready||len<2;
 document.querySelectorAll('[data-action="baseline"]').forEach(el=>el.disabled=!ready);
 const first=document.getElementById('frame-count');if(first&&c.result&&!c.error&&!c.dirty&&!c.pending)first.textContent=len===1?'入力で更新':`${c.playing?'再生中':'手順'} ${c.index+1} / ${len}`;
};
A.renderFrame=()=>{
 const c=A.current;if(!stateReady(c))return;
 c.index=L.clamp(c.index,0,c.result.frames.length-1);
 const f=c.result.frames[c.index],el=document.getElementById('visualization');if(!el)return;
 el.innerHTML=L.visualize(f.visual,{selected:c.selected});
 const sc=document.getElementById('scrubber');sc.setAttribute('aria-valuetext',`${c.index+1} / ${c.result.frames.length}：${f.title}`);
 document.getElementById('current-step').innerHTML=`<div class="step-kicker">${c.result.frames.length===1?'現在の結果':c.index===c.result.frames.length-1?'最後の状態':'今の状態'}</div><h3>${h(f.title)}</h3><p>${h(f.explain)}</p>${Object.keys(f.stats||{}).length?`<div class="stat-pills">${Object.entries(f.stats).map(([k,v])=>`<span class="stat-pill">${h(k)} <b>${h(fmt(v))}</b></span>`).join('')}</div>`:''}`;
 const terms=L.glossary.filter(g=>g.lab===c.lab.id).slice(0,5);
 document.getElementById('inspector').innerHTML=`<section class="inspector-section"><div class="inspector-heading">ここに注目</div><p class="key-idea">${h(c.lab.observe)}</p></section><section class="inspector-section"><div class="inspector-heading">${c.result.frames.length===1?'この条件の結果':'この条件で最後まで進めた結果'}</div>${Object.entries(c.result.metrics||{}).slice(0,7).map(([k,v])=>`<div class="metric"><span>${h(k)}</span><strong>${h(fmt(v))}</strong></div>`).join('')}<p class="inspector-hint">${c.result.frames.length===1?'入力を変え、結果の違いを比べましょう。':'途中の状態は図の下で確認できます。ここは最終値の概要です。'}</p>${A.button('いまの条件をAに固定','baseline','compare','sm')}</section><section class="inspector-section"><div class="inspector-heading">用語</div>${terms.map(g=>`<button type="button" class="term-button" data-action="term" data-term="${h(g.term)}" data-lab="${h(g.lab)}">${h(g.term)} ${icon('help',13)}</button>`).join('')||A.button('用語集を開く','glossary','book','sm ghost')}</section>`;
 A.updatePlayer();if(c.tab==='data')A.renderDetails();if(c.lab.engine==='builder')A.builderHint();
};
A.stop=()=>A.current?.player?.pause();
A.play=()=>{
 const c=A.current;if(!c||c.pending||c.error)return;
 if(c.dirty)return A.runCurrent({autoplay:true});
 if(stateReady(c))c.player.play();
};
A.seek=index=>{const c=A.current;if(stateReady(c))c.player.seek(index);};
A.step=delta=>{const c=A.current;if(stateReady(c))c.player.step(delta);};
A.parameter=(key,value,{immediate=false,code=false}={})=>{
 const c=A.current;if(!c||!c.lab.controls.some(x=>x.key===key))return;
 if(c.params[key]===value){
  // Clearing a numeric field marks the old result stale. Pasting the same valid
  // value back must still re-enable the experiment rather than leaving it dirty.
  if(c.dirty&&!code){clearTimeout(A.parameterTimer);A.parameterTimer=setTimeout(()=>{if(A.current===c)A.runCurrent();},immediate?0:240);}
  return;
 }
 c.token++;c.pending=false;c.dirty=true;c.error=null;c.example='custom';c.params[key]=value;
 c.params=L.validateParams(c.lab,c.params);if(c.lab.id==='c01-bits')c.params.value=Math.min(c.params.value,2**c.params.width-1);
 A.stop();A.syncControls();clearTimeout(A.parameterTimer);A.markPending();A.renderDetails();
 A.inputStatus(code?'未反映の変更があります。「入力を反映」を押してください。':'条件を変更しました。入力を反映します…');
 if(code)return;
 A.parameterTimer=setTimeout(()=>{if(A.current===c)A.runCurrent();},immediate?0:240);
};
A.example=async kind=>{
 const c=A.current;if(!c)return;clearTimeout(A.parameterTimer);A.stop();
 const ticket=++c.token;c.pending=true;c.dirty=false;c.error=null;A.markPending();
 try{
  const base=c.initialResult||await L.run(c.lab,c.lab.defaults);
  if(A.current!==c||c.token!==ticket)return;
  c.initialResult=base;c.baseline={params:clone(c.lab.defaults),metrics:clone(base.metrics),frames:clone(base.frames),label:'初期条件 A'};
  c.params=L.validateParams(c.lab,kind==='variant'?{...c.lab.defaults,...c.lab.exploration.patch}:c.lab.defaults);
  c.pending=false;c.dirty=true;c.example=kind;c.answer=null;c.graded=false;A.syncControls();
  const applied=await A.runCurrent({autoplay:true});
  if(A.current!==c||!applied||c.example!==kind)return;
  document.querySelectorAll('[data-action="example"]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.example===kind)));
  A.toast(kind==='variant'?`B：${c.lab.exploration.label}。Aとの比較も確認できます。`:'初期条件Aで試しています。');
 }catch{
  if(A.current!==c||c.token!==ticket)return;
  c.params=L.validateParams(c.lab,kind==='variant'?{...c.lab.defaults,...c.lab.exploration.patch}:c.lab.defaults);c.pending=false;A.syncControls();await A.runCurrent();
 }
};
A.setTab=tab=>{
 if(!A.current||!tabs.some(x=>x[0]===tab))return;
 A.current.tab=tab;
 document.querySelectorAll('[data-tab]').forEach(el=>{el.classList.toggle('active',el.dataset.tab===tab);el.setAttribute('aria-pressed',String(el.dataset.tab===tab));});A.renderDetails();
};
A.focusDetails=()=>document.querySelector('.below-workbench')?.scrollIntoView({behavior:A.settings.reduceMotion?'instant':'smooth',block:'start'});
A.setMode=mode=>{
 const c=A.current;if(!c||!['guided','free','challenge'].includes(mode))return;
 c.mode=mode;document.querySelectorAll('[data-mode].tab').forEach(el=>{el.classList.toggle('active',el.dataset.mode===mode);el.setAttribute('aria-pressed',String(el.dataset.mode===mode));});
 document.getElementById('starter-guide').hidden=mode==='free';
 A.setTab(mode==='free'?'data':'understand');if(mode==='challenge')A.focusDetails();
};
A.compareFigure=(side)=>{
 const c=A.current,frames=side==='a'?c?.baseline?.frames:c?.result?.frames;if(!frames?.length)return '';
 const i=Math.max(0,Math.min(c.compareIndices?.[side]??frames.length-1,frames.length-1)),f=frames[i];
 // These are observations, not a second editable network/bit board.
 const prefix='compare-'+side+'-',drawing=L.visualize(f.visual).replace(/id="([^"]+)"/g,(_,id)=>`id="${prefix}${id}"`).replace(/url\(#([^)]+)\)/g,(_,id)=>`url(#${prefix}${id})`);
 return `<div class="compare-viewport" tabindex="0" aria-label="条件${side.toUpperCase()}の図。大きい図は内部をスクロールできます。"><div class="compare-drawing" inert aria-hidden="true">${drawing}</div></div><div class="compare-frame-description"><strong>${h(f.title)}</strong><p>${h(f.explain)}</p></div>`;
};
A.compareDiagrams=()=>{
 const c=A.current;if(!c?.baseline?.frames?.length||!c.result)return '';
 const panel=(side,label,frames)=>{const index=c.compareIndices?.[side]??frames.length-1;return `<section class="compare-model-panel"><h4>${label}</h4><label class="compare-step-select" for="compare-step-${side}">表示する手順<select id="compare-step-${side}" data-compare-step="${side}"${frames.length===1?' disabled':''}>${frames.map((f,i)=>`<option value="${i}"${i===index?' selected':''}>${i+1} / ${frames.length}：${h(f.title)}</option>`).join('')}</select></label><div id="compare-figure-${side}">${A.compareFigure(side)}</div></section>`;};
 return `<details class="compare-diagrams panel"><summary>図と手順を並べて見る</summary><p class="compare-diagrams-help">最終値が同じでも、途中の手順や配置は異なることがあります。A・Bそれぞれの手順を選んで確かめてください。同じ手順番号が、同じ時刻を意味するとは限りません。</p><div class="compare-model-grid">${panel('a','A / 基準の条件',c.baseline.frames)}${panel('b','B / 現在の条件',c.result.frames)}</div></details>`;
};
A.selectCompareStep=(side,index)=>{
 const c=A.current;if(!stateReady(c)||!['a','b'].includes(side)||!c.baseline?.frames)return;
 const frames=side==='a'?c.baseline.frames:c.result.frames,n=Number(index);if(!Number.isFinite(n))return;
 c.compareIndices??={a:c.baseline.frames.length-1,b:c.result.frames.length-1};c.compareIndices[side]=Math.max(0,Math.min(Math.trunc(n),frames.length-1));
 const el=document.getElementById('compare-figure-'+side);if(el)el.innerHTML=A.compareFigure(side);
};
A.renderDetails=()=>{
 const c=A.current;if(!c)return;const lab=c.lab,el=document.getElementById('detail-content');if(!el)return;
 let body='';const ready=stateReady(c);
 if(c.tab==='understand'){
  if(c.mode==='challenge'){
   const q=lab.challenge;
   body=`<div class="challenge-box panel"><div class="eyebrow">考えてから、実験でも確認</div><h3>${h(q.question)}</h3><p class="muted">回答はこの画面だけで使います。理解度や正誤を保存することはありません。</p><div class="challenge-options">${q.options.map((o,i)=>`<button type="button" class="challenge-option${c.answer===i?' selected':''}" data-answer="${i}" aria-pressed="${c.answer===i}"><span class="letter">${String.fromCharCode(65+i)}</span>${h(o)}</button>`).join('')}</div><div class="check-buttons">${A.button('答えを確かめる','grade','check','primary',c.answer===null?'disabled':'')}${A.button('実験に戻る','guided','flask','ghost')}</div>${c.graded?`<div class="challenge-result${c.answer===q.answer?'':' wrong'}" role="status"><strong>${c.answer===q.answer?'この問いの正解です。':'もう一度、観察してみましょう。'}</strong><p>${h(q.explanation)}</p><p>実験では：${h(lab.observe)}</p></div>`:''}</div>`;
  }else body=`<div class="learning-grid"><section class="panel instruction-list"><h3>この実験の進め方</h3>${lab.guide.map((s,i)=>`<div class="instruction"><span class="step-circle">${i+1}</span><p>${h(s)}</p></div>`).join('')}</section><section class="panel learning-card"><h3>何を理解する単元？</h3><p>${h(lab.summary)}</p><h3>考え方のポイント</h3><p>${h(lab.lesson)}</p>${ready?`<p>${h(c.result.conclusion)}</p>`:''}<button type="button" class="btn sm" data-mode="challenge">理解を確かめる ${icon('arrow',14)}</button>${lab.prereq.length?`<div class="prerequisites"><span>関連する基礎</span>${lab.prereq.map(id=>`<a href="#/lab/${id}">${h(A.lab(id)?.unit||id)} ${icon('arrow',12)}</a>`).join('')}</div>`:''}</section></div>`;
 }else if(c.tab==='data'){
  if(ready){const f=c.result.frames[c.index];body=`<div class="comparison-header"><div><h3>現在の値：${h(f.title)}</h3><p class="muted">図と同じ計算結果です。下の手順を選ぶと、その状態へ移動します。</p></div></div>${L.table(f.table||L.visualTable(f.visual))}<div class="section-title"><h3>今回の実行手順</h3></div><div class="timeline-events">${c.result.frames.map((f,i)=>`<button type="button" class="timeline-event${i===c.index?' active':''}" data-frame="${i}" aria-current="${i===c.index?'step':'false'}"><span>${String(i+1).padStart(2,'0')}</span><div><strong>${h(f.title)}</strong><p>${h(f.explain)}</p></div>${icon('chevron',14)}</button>`).join('')}</div>`;}
  else body='<div class="info-banner">入力を正常に反映すると、現在の値と実行手順が表示されます。未反映の条件に前の結果を混ぜないため、表示を止めています。</div>';
 }else if(c.tab==='compare'){
  const b=c.baseline;
  body=`<div class="comparison-header"><div><h3>条件Aと条件Bを比べる</h3><p class="muted">Aを固定してから、条件を変えてBと比べます。別の単元へ移ると比較内容は消えます。</p></div>${A.button(b?'現在の条件でAを置き換える':'いまの条件をAに固定','baseline','compare','primary',ready?'':'disabled')}</div>`;
  if(!ready)body+='<div class="info-banner">入力を反映してから比較してください。計算前の値は比較に使いません。</div>';
  else if(b){
   const keys=[...new Set([...Object.keys(b.metrics),...Object.keys(c.result.metrics)])];
   body+=`<div class="compare-labels"><span>A：${h(b.label||'固定した条件')}</span><span>B：現在の条件</span></div>${L.table({headers:['最終結果','A / 基準','B / 現在','差分 B−A'],rows:keys.map(k=>{const a=b.metrics[k],v=c.result.metrics[k];return[k,fmt(a),fmt(v),typeof a==='number'&&typeof v==='number'?fmt(L.round(v-a,5)):a===v?'同じ':'変化'];})})}${A.compareDiagrams()}<div class="comparison-observe"><strong>見るポイント</strong><p>${h(lab.observe)}</p></div><div class="section-title"><h3>変えた条件・変えなかった条件</h3></div>${L.table({headers:['入力条件','A','B'],rows:lab.controls.map(ctrl=>[ctrl.label,formatParam(ctrl,b.params[ctrl.key]),formatParam(ctrl,c.computedParams[ctrl.key])])})}<div class="button-row compare-actions">${A.button('Aの条件に戻す','restore-baseline','reset','sm')}${A.button('比較をクリア','delete-baseline','close','sm ghost')}</div>`;
  }else body+=`<div class="empty-state panel"><h3>まず比較する条件Aを決めましょう。</h3><p>上の「いまの条件をAに固定」を押してから、入力を1つ変更します。案内の「B」を押すと初期条件と自動で比較できます。</p>${A.button('用意されたAとBを試す','example','compare','sm','data-example="variant"')}</div>`;
 }else if(c.tab==='model')body=`<div class="model-grid"><article class="panel model-card"><div class="eyebrow">実装している範囲</div><h3>${h(lab.scope)}</h3><p>${h(lab.summary)}</p><p>実験ID：<code>${lab.id}</code><br>計算モデル：<code>${lab.engine}${lab.variant?' / '+h(lab.variant):''}</code></p></article><article class="panel model-card"><div class="eyebrow">省略と注意点</div><h3>この実験では扱わないこと</h3><p>${h(lab.limits)}</p><p>結果を実機の性能測定・安全性の認定・一般的な数学の証明として扱わないでください。</p></article><article class="panel model-card"><div class="eyebrow">授業とのつながり</div><h3>${h(lab.course||A.area(lab.area)?.name)}</h3><p>科目との対応は独自の提案です。学修要覧は、この実験の個別仕様を定義していません。</p><a href="#/curriculum" class="section-link">授業から探す ${icon('arrow',13)}</a></article><article class="panel model-card"><div class="eyebrow">参考資料</div><h3>根拠と参考資料</h3>${lab.sources.map(id=>{const s=L.sources[id];if(!s)return'';return s.url?`<a class="source-inline" href="${h(s.url)}" target="_blank" rel="noopener noreferrer">${h(s.name)} ${icon('external',12)}</a>`:`<p>${h(s.name)}<br><small>${h(s.detail||'')}</small></p>`;}).join('')}</article></div>`;
 el.innerHTML=body;A.updatePlayer();
};
A.baseline=()=>{
 const c=A.current;if(!stateReady(c))return A.toast('入力を正常に反映してから比較してください。',true);
 c.baseline={params:clone(c.computedParams),metrics:clone(c.result.metrics),frames:clone(c.result.frames),label:'固定した条件'};c.compareIndices=null;
 A.setTab('compare');A.toast('比較用の条件Aを、この単元を開いている間だけ固定しました。');
};
A.grade=()=>{const c=A.current;if(!c||c.answer===null)return;c.graded=true;A.renderDetails();};
A.builderHint=()=>{const c=A.current,el=document.getElementById('builder-hint');if(!c||!el)return;el.textContent=c.connectFrom?`接続元：${c.connectFrom}。次に接続先の機器を押してください。`:c.selected?`${c.selected} を選択中。「2台をつなぐ」で接続先を選べます。線を押すと切断／接続。`:'機器を選択して接続。線をクリックして切断／接続。ドラッグで機器を移動。';};
A.setTopology=v=>{const c=A.current;if(!c)return;c.params.topology=JSON.stringify(v,null,2);A.syncControls();A.runCurrent(true);};
A.nodeClick=id=>{const c=A.current;if(!c)return;if(c.lab.engine==='builder'){
 let v=L.parseTopology(c.params.topology);if(c.connectFrom&&c.connectFrom!==id){let edge=v.edges.find(e=>(e.a===id&&e.b===c.connectFrom)||(e.a===c.connectFrom&&e.b===id));if(edge)edge.off=false;else if(v.edges.length<30)v.edges.push({a:c.connectFrom,b:id,cost:1});else A.toast('リンクは30本までです。',true);c.connectFrom=null;c.selected=id;A.setTopology(v);}else{c.selected=id;A.renderFrame();}A.builderHint();
 }else{if(!stateReady(c))return;c.selected=id;const v=c.result.frames[c.index].visual,nd=v.nodes?.find(x=>x.id===id),edges=v.edges?.filter(e=>e.a===id||e.b===id)||[];document.getElementById('node-inspection').innerHTML=`<div class="node-inspection"><strong>${h(nd?.label||id)}</strong> <span>ID：${h(id)} / 接続先：${h(edges.filter(e=>!e.off).map(e=>e.a===id?e.b:e.a).join('、')||'なし')}</span></div>`;A.renderFrame();}};
A.addNode=kind=>{const c=A.current;if(!c||c.lab.engine!=='builder')return;let v=L.parseTopology(c.params.topology);if(v.nodes.length>=12)return A.toast('機器は12台までです。',true);let i=1;while(v.nodes.some(n=>n.id==='N'+i))i++;let id='N'+i;v.nodes.push({id,label:({pc:'端末',switch:'スイッチ',router:'ルーター',server:'サーバー'}[kind]||'機器')+' '+i,kind,x:130+(i%4)*145,y:100+Math.floor((i%8)/4)*180});c.selected=id;A.setTopology(v);};
A.removeNode=()=>{const c=A.current;if(!c||c.lab.engine!=='builder')return;let v=L.parseTopology(c.params.topology);if(!c.selected)return A.toast('削除する機器を選択してください。');if(v.nodes.length<=2)return A.toast('最低2台の機器を残してください。',true);if([c.params.source,c.params.target].includes(c.selected))return A.toast('送信元または宛先です。先に入力欄で別のIDを指定してください。',true);v.nodes=v.nodes.filter(n=>n.id!==c.selected);v.edges=v.edges.filter(e=>e.a!==c.selected&&e.b!==c.selected);c.selected=null;A.setTopology(v);};

})();
