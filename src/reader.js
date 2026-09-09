/* Lesson-first UI. The old workbench remains an explicit advanced view.
 * No storage. One disposable player and one async generation per open unit.
 */
(() => {
'use strict';
const L=CSL,A=L.app,{h,icon,clone}=L;
const $=id=>document.getElementById(id);
const legacy={lab:A.views.lab,play:A.play,seek:A.seek,step:A.step,stop:A.stop,run:A.runCurrent};
const isCurrent=c=>A.current===c&&c.reader;
const ready=c=>isCurrent(c)&&c.result&&!c.pending&&!c.dirty&&!c.error;
const phases=['背景と意味','例を一緒に追う','条件を変える','理解を確かめる'];
const rbutton=(action,label,cls='',attrs='')=>`<button type="button" class="btn ${cls}" data-r-action="${action}" ${attrs}>${label}</button>`;
const valueText=(control,value)=>control.type==='toggle'?(value?'オン':'オフ'):control.type==='select'?(control.options.find(o=>String(o.value)===String(value))?.label??value):value;
function conditionSummary(lab,params){return lab.controls.map(ctrl=>`${ctrl.label}：${valueText(ctrl,params[ctrl.key])}${ctrl.unit||''}`).join(' ／ ');}
function controlHTML(ctrl,p){
 const id='reader-input-'+ctrl.key,value=p[ctrl.key],help='reader-help-'+ctrl.key;
 let input='';
 if(ctrl.type==='toggle')input=`<label class="reader-toggle" for="${id}"><input id="${id}" type="checkbox" data-r-param="${h(ctrl.key)}"${value?' checked':''} aria-describedby="${help}"><span>${h(ctrl.label)}</span></label>`;
 else{
  const label=`<label for="${id}">${h(ctrl.label)}${ctrl.unit?` <small>${h(ctrl.unit)}</small>`:''}</label>`;
  if(ctrl.type==='range')input=label+`<div class="reader-range-pair"><input id="${id}" type="range" min="${ctrl.min}" max="${ctrl.max}" step="${ctrl.step}" value="${h(value)}" data-r-param="${h(ctrl.key)}" aria-describedby="${help}"><input type="number" id="${id}-number" min="${ctrl.min}" max="${ctrl.max}" step="${ctrl.step}" value="${h(value)}" data-r-number="${h(ctrl.key)}" aria-label="${h(ctrl.label)}を数値で入力" aria-describedby="${help}"></div>`;
  else if(ctrl.type==='select')input=label+`<select id="${id}" data-r-param="${h(ctrl.key)}" aria-describedby="${help}">${ctrl.options.map(o=>`<option value="${h(o.value)}"${String(o.value)===String(value)?' selected':''}>${h(o.label)}</option>`).join('')}</select>`;
  else if(ctrl.type==='code')input=label+`<textarea id="${id}" data-r-param="${h(ctrl.key)}" rows="8" spellcheck="false" aria-describedby="${help}">${h(value)}</textarea>`;
  else input=label+`<input id="${id}" type="text" value="${h(value)}" data-r-param="${h(ctrl.key)}" autocomplete="off" spellcheck="false" aria-describedby="${help}">`;
 }
 const hint=ctrl.help||(ctrl.type==='range'?`${ctrl.min}〜${ctrl.max}、${ctrl.step}ずつ変更できます。`:ctrl.type==='code'?'編集後、「入力を反映」を押すと、最初の状態から計算します。':ctrl.type==='toggle'?'この条件だけを切り替えて確かめられます。':'変更すると、この単元の条件として計算し直します。');
 return `<div class="reader-field" data-r-field="${h(ctrl.key)}">${input}<p class="reader-field-help" id="${help}">${h(hint)}</p></div>`;
}
function renderControls(c){
 const primary=c.lab.controls.filter(x=>c.lab.reading.focus.includes(x.key)),other=c.lab.controls.filter(x=>!c.lab.reading.focus.includes(x.key));
 $('reader-controls').innerHTML=`<h3>この例の条件</h3><p class="reader-controls-caption">初めはここだけ。ほかの条件は下から開けます。</p>${primary.map(ctrl=>controlHTML(ctrl,c.params)).join('')}${other.length?`<details class="reader-more-controls"${c.phase===2?' open':''}><summary>ほかの条件も変える（${other.length}項目）</summary>${other.map(ctrl=>controlHTML(ctrl,c.params)).join('')}</details>`:''}<div class="button-row">${rbutton('apply','入力を反映','primary')}${rbutton('reset','初期例に戻す','ghost')}</div><p class="reader-live-status" id="reader-input-status" role="status" aria-live="polite"></p>`;
}
function renderGuidance(c){
 const d=c.lab.reading;
 document.querySelectorAll('[data-r-phase]').forEach(b=>{const active=Number(b.dataset.rPhase)===c.phase;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
 let body='';
 if(c.phase===0)body=`<p class="reader-overline">まず、この話が必要になる場面</p><h2>${h(c.lab.question)}</h2><p>${h(d.why)}</p><div class="reader-idea"><h3>つまり、こういう仕組みです</h3><p>${h(d.idea)}</p></div>${rbutton('advance','小さな例を一緒に見る →','primary')}`;
 if(c.phase===1)body=`<p class="reader-overline">途中を飛ばさずに追う</p><h2>初期例の、ここに注目</h2><p>${h(d.example)}</p><p class="reader-hint">説明は初期例についてです。下の条件を変更した後は、現在の条件と図の数値を優先して見てください。</p><div class="button-row">${rbutton('reset','この初期例を表示する')}${rbutton('next',h(d.nextLabel),'primary')}</div><div class="reader-idea"><h3>図のそばで理由を読む</h3><p>図の下にある「今の段階」には、その段階で起きた変化と理由を表示します。途中へ戻っても、図と説明は同じ段階にそろいます。</p></div>${rbutton('advance','分かったことを使って条件を変える →','ghost')}`;
 if(c.phase===2)body=`<p class="reader-overline">1つの違いから確かめる</p><h2>${h(c.lab.exploration.label)}</h2><p>${h(c.lab.observe)}</p><div class="reader-variant-values"><h3>この比較で変更する条件</h3>${Object.entries(c.lab.exploration.patch).map(([k,v])=>{const ctrl=c.lab.controls.find(x=>x.key===k);return ctrl?`<p><strong>${h(ctrl.label)}</strong><br>${h(valueText(ctrl,c.lab.defaults[k]))} → ${h(valueText(ctrl,v))}</p>`:'';}).join('')}</div>${rbutton('variant','初期例と、この条件を比べる','primary')}<p class="reader-hint">初期例を比較元にし、指定した条件へ切り替えます。勝手に再生は始まりません。</p><div class="button-row">${rbutton('baseline','今の条件を比較元にする','ghost')}${rbutton('advance','確かめた理由を整理する →','ghost')}</div>`;
 if(c.phase===3){const q=c.lab.challenge;body=`<p class="reader-overline">結果だけでなく、理由を言えるか</p><h2>ここを混同しない</h2><p>${h(d.pitfall)}</p><section class="reader-question"><h3>${h(q.question)}</h3><div class="reader-answers">${q.options.map((x,i)=>`<button type="button" class="reader-answer${c.answer===i?' chosen':''}" data-r-answer="${i}" aria-pressed="${c.answer===i}">${h(x)}</button>`).join('')}</div><div id="reader-answer-feedback" role="status">${c.answer!==null?`<strong>${c.answer===q.answer?'この考え方で合っています。':'図の判断に戻って確かめましょう。'}</strong><p>${h(q.explanation)}</p>`:''}</div><p class="reader-hint">回答は記録しません。自由に選び直せます。</p></section>`;}
 $('reader-guidance').innerHTML=body;
 $('reader-phase-name').textContent=phases[c.phase];
}
function setPhase(c,n){
 c.player.pause();c.phase=Math.max(0,Math.min(3,n));renderGuidance(c);
 if(c.phase===2){const more=document.querySelector('.reader-more-controls');if(more)more.open=true;}
}
function metricsHTML(metrics){return `<dl class="reader-metrics">${Object.entries(metrics||{}).map(([k,v])=>`<div><dt>${h(k)}</dt><dd>${h(L.fmt(v))}</dd></div>`).join('')}</dl>`;}
function resultParts(c){
 if(!ready(c))return;
 const holder=$('reader-result-details');
 holder.innerHTML=`<details><summary>最後まで計算した結果を見る</summary><p>この欄は最後の結果です。現在の再生位置の状態は、図の下の説明を見てください。</p>${metricsHTML(c.result.metrics)}<p>${h(c.result.conclusion)}</p></details><details><summary>各段階へ直接移動する</summary><div class="reader-step-list">${c.result.frames.map((fr,i)=>`<button type="button" data-r-frame="${i}"><span>${i+1}</span>${h(fr.title)}</button>`).join('')}</div></details>`;
}
function renderComparison(c){
 const el=$('reader-comparison');if(!el)return;
 if(!c.baseline){el.innerHTML='';return;}
 const b=c.baseline;
 if(!ready(c)){el.innerHTML='<p class="reader-hint">比較元はこの単元内だけで保持しています。現在の入力の計算が終わると比較できます。</p>';return;}
 const rows=c.lab.controls.filter(ctrl=>JSON.stringify(b.params[ctrl.key])!==JSON.stringify(c.params[ctrl.key])).map(ctrl=>[ctrl.label,valueText(ctrl,b.params[ctrl.key]),valueText(ctrl,c.params[ctrl.key])]);
 const keys=[...new Set([...Object.keys(b.result.metrics),...Object.keys(c.result.metrics)])];
 el.innerHTML=`<details ${c.compareOpen?'open':''} id="reader-compare-details"><summary>条件と最終結果を比較する</summary><p>再生の速さや位置ではなく、計算した条件と最後の結果を比べます。別の単元へ移ると比較は消えます。</p>${rows.length?L.studyTable(['変えた条件','比較元','現在'],rows,'変更点'): '<p>比較元と現在の入力は同じです。</p>'}${L.studyTable(['結果','比較元','現在'],keys.map(k=>[k,L.fmt(b.result.metrics[k]),L.fmt(c.result.metrics[k])]),'最後まで計算した結果')}<div class="button-row">${rbutton('restore','比較元の条件へ戻す')}${rbutton('clear-compare','比較を閉じる','ghost')}</div></details>`;
}
function paint(c){
 if(!isCurrent(c)||!$('reader-diagram'))return;
 const valid=ready(c),count=valid?c.result.frames.length:0,frame=valid?c.result.frames[c.index]:null;
 const status=c.error?`入力を確認してください：${c.error}`:c.pending?'計算しています。古い結果は表示しません。':c.dirty?'入力が未反映です。「入力を反映」で計算します。':'条件を反映しました。図と理由を一緒に確認できます。';
 const statusNode=$('reader-input-status');if(statusNode)statusNode.textContent=status;
 $('reader-diagram').setAttribute('aria-busy',String(c.pending));
 const canPlay=valid&&count>1;
 $('reader-play').disabled=!canPlay;
 $('reader-play').innerHTML=icon(c.playing?'pause':'play',17)+(c.playing?'一時停止':c.index===count-1&&count>1?'最初から再生':'再生');
 $('reader-scrubber').disabled=!canPlay;
 $('reader-scrubber').max=String(Math.max(0,count-1));$('reader-scrubber').value=String(c.index);
 $('reader-scrubber').setAttribute('aria-valuetext',frame?`${c.index+1}/${count}：${frame.title}`:'計算結果なし');
 $('reader-position').textContent=frame?`${c.index+1} / ${count}　${frame.title}`:'入力を確認しています';
 document.querySelectorAll('[data-r-action="first"],[data-r-action="back"]').forEach(el=>el.disabled=!valid||c.index===0);
 document.querySelectorAll('[data-r-action="next"],[data-r-action="last"]').forEach(el=>el.disabled=!valid||c.index>=count-1);
 document.querySelectorAll('[data-r-action="baseline"]').forEach(el=>el.disabled=!valid);
 $('reader-sequence-tools').hidden=!canPlay;
 $('reader-direct-message').hidden=!valid||count>1;
 $('reader-next-label').textContent=c.lab.reading.nextLabel;
 if(!valid){
  $('reader-diagram').innerHTML=`<div class="reader-result-placeholder ${c.error?'reader-error':''}"><h3>${c.error?'入力の意味を確認しましょう':c.pending?'条件から計算しています':'入力を反映すると図が変わります'}</h3><p>${h(c.error||'計算途中に前の条件の図を残さないようにしています。')}</p></div>`;
  $('reader-event').innerHTML='';$('reader-table').innerHTML='';$('reader-companion').innerHTML='';$('reader-result-details').innerHTML='';renderComparison(c);return;
 }
 // Old workbench event attributes are namespaced so its delegated handlers cannot
 // accidentally interpret a click in the reading view using a different state.
 let diagram=L.visualize(frame.visual,{focus:c.noteFocus});
 diagram=diagram.replace(/data-node=/g,'data-r-node=').replace(/data-bit=/g,'data-r-bit=').replace(/data-edge=/g,'data-r-edge=');
 $('reader-diagram').innerHTML=diagram;
 $('reader-event').innerHTML=`<p class="reader-overline">今の段階 / ${c.index+1}</p><h3>${h(frame.title)}</h3><p>${h(frame.explain)}</p>${Object.keys(frame.stats||{}).length?metricsHTML(frame.stats):''}`;
 $('reader-table').innerHTML=frame.table?`<details ${c.tableOpen?'open':''} id="reader-frame-table"><summary>この段階の数値を表で確かめる</summary>${L.table(frame.table)}</details>`:'';
 $('reader-companion').innerHTML=L.lessonCompanion(c);
 if(c.renderedResult!==c.result){resultParts(c);c.renderedResult=c.result;renderComparison(c);}
 const caption=$('reader-condition-summary');if(caption)caption.textContent=conditionSummary(c.lab,c.params);
}
function invalidate(c,message=''){
 clearTimeout(A.paramTimer);c.token++;c.player.pause();c.pending=false;c.dirty=true;c.error=message;c.result=null;c.renderedResult=null;paint(c);
}
async function compute(c,params=c.params){
 if(!isCurrent(c))return;
 clearTimeout(A.paramTimer);const own=++c.token;c.player.pause();c.pending=true;c.dirty=false;c.error=null;c.result=null;c.renderedResult=null;paint(c);
 try{
  const validated=L.validateParams(c.lab,params),result=await L.run(c.lab,validated);
  if(!isCurrent(c)||own!==c.token)return;
  c.params=validated;c.result=result;c.pending=false;c.dirty=false;c.index=0;c.player.configure(result.frames.length,0);paint(c);renderComparison(c);
 }catch(error){if(!isCurrent(c)||own!==c.token)return;c.pending=false;c.error=error.message||String(error);c.result=null;c.player.configure(0);paint(c);}
}
function change(c,key,raw,{fromNumber=false,isCode=false}={}){
 const ctrl=c.lab.controls.find(x=>x.key===key);if(!ctrl)return;
 invalidate(c);
 if(ctrl.type==='range'){
  const number=Number(raw),ratio=(number-ctrl.min)/ctrl.step;
  if(raw===''||!Number.isFinite(number)||number<ctrl.min||number>ctrl.max||Math.abs(ratio-Math.round(ratio))>1e-6){c.error=`「${ctrl.label}」は${ctrl.min}〜${ctrl.max}を${ctrl.step}ずつ指定してください。`;c.invalidKey=key;paint(c);return;}
  c.params[key]=number;
  const range=$('reader-input-'+key),numeric=$('reader-input-'+key+'-number');if(range)range.value=String(number);if(numeric)numeric.value=String(number);
 }else if(ctrl.type==='toggle')c.params[key]=Boolean(raw);
 else if(ctrl.type==='select')c.params[key]=ctrl.options.find(o=>String(o.value)===String(raw))?.value??ctrl.value;
 else c.params[key]=String(raw).slice(0,ctrl.type==='code'?8000:1200);
 c.invalidKey=null;c.noteFocus=null;c.error=null;
 if(isCode){paint(c);return;}
 A.paramTimer=setTimeout(()=>compute(c),ctrl.type==='text'?320:50);
}
async function variant(c){
 if(!isCurrent(c))return;clearTimeout(A.paramTimer);const own=++c.token;c.player.pause();c.pending=true;c.error=null;c.dirty=false;c.result=null;c.renderedResult=null;paint(c);
 try{
  const before=await L.run(c.lab,c.lab.defaults);
  if(!isCurrent(c)||own!==c.token)return;
  const params=L.validateParams(c.lab,{...c.lab.defaults,...c.lab.exploration.patch}),after=await L.run(c.lab,params);
  if(!isCurrent(c)||own!==c.token)return;
  c.baseline={params:clone(c.lab.defaults),result:before};c.params=params;c.result=after;c.pending=false;c.invalidKey=null;c.noteFocus=null;c.compareOpen=true;c.index=0;renderControls(c);c.player.configure(after.frames.length,0);paint(c);renderComparison(c);
 }catch(error){if(!isCurrent(c)||own!==c.token)return;c.pending=false;c.result=null;c.error=error.message||String(error);c.player.configure(0);paint(c);}
}
function reset(c){c.params=clone(c.lab.defaults);c.noteFocus=null;c.invalidKey=null;c.answer=null;renderControls(c);compute(c);}
function sourceHTML(lab){return (lab.sources||[]).map(id=>{const s=L.sources[id];if(!s)return '';return `<li>${s.url&&/^https:\/\//.test(s.url)?`<a href="${h(s.url)}" target="_blank" rel="noopener noreferrer">${h(s.name)} ↗</a>`:`<strong>${h(s.name)}</strong>`}${s.detail?`<p>${h(s.detail)}</p>`:''}</li>`;}).join('');}
A.views.lab=(parts,params)=>{
 if(params?.get('view')==='experiment'){legacy.lab(parts,params);const head=document.querySelector('.lab-heading');if(head)head.insertAdjacentHTML('beforebegin',`<div class="reader-advanced-banner"><a class="btn" href="#/lab/${h(parts[0])}">← 図と説明を一緒に読む画面へ</a><p>自由実験の詳細画面です。画面を切り替えると一時的な入力と比較は初期化されます。</p></div>`);return;}
 const lab=A.lab(parts[0]);if(!lab)return A.views.notfound();
 const n=Number(params?.get('section')||0),phase=Number.isInteger(n)&&n>=0&&n<=3?n:0;
 const c=A.current={reader:true,lab,params:clone(lab.defaults),phase,result:null,index:0,playing:false,speed:1,pending:false,dirty:false,error:null,token:0,noteFocus:null,baseline:null,compareOpen:false,tableOpen:false,answer:null,invalidKey:null,renderedResult:null};
 c.player=L.createPlayer({onChange:s=>{if(!isCurrent(c))return;c.index=s.index;c.playing=s.playing;c.speed=s.speed;paint(c);}});
 A.setTitle(lab.unit);A.setNav(lab.track==='core'?'catalog':lab.track,lab.unit);
 const related=[...new Set([...(L.readingRelations[lab.id]||[]),...(lab.prereq||[])])].filter(id=>id!==lab.id&&A.lab(id));
 $('main').innerHTML=`<article class="reader" id="lesson-reader"><header class="reader-title"><div class="reader-title-top">${A.pill(lab.track)}<span>${h(lab.course)}</span></div><h1>${h(lab.unit)}</h1><p>${h(lab.summary)}</p><div class="reader-title-links"><a href="#/catalog">← 別の単元を探す</a><a href="#/lab/${h(lab.id)}?view=experiment">自由実験・詳細画面を開く ↗</a></div></header><nav class="reader-phases" aria-label="説明の区切り。どこからでも選べます">${phases.map((name,i)=>`<button type="button" data-r-phase="${i}" class="${phase===i?'active':''}"><span>${i+1}</span>${name}</button>`).join('')}</nav><div class="reader-layout"><div class="reader-explanation"><section id="reader-guidance" class="reader-guidance" aria-label="この単元の説明"></section><section id="reader-controls" class="reader-controls" aria-label="実験の入力"></section><details class="reader-terms"><summary>この単元で使う言葉</summary>${lab.reading.terms.length?`<dl>${lab.reading.terms.map(t=>`<dt>${h(t.term)}</dt><dd>${h(t.definition)}</dd>`).join('')}</dl>`:`<p>${h(lab.reading.idea)}</p><p>入力欄の下にも、条件の意味を表示しています。</p>`}</details></div><div class="reader-demonstration"><figure class="reader-figure"><figcaption><div><span class="reader-overline" id="reader-phase-name"></span><h2>説明を、図で確かめる</h2></div><span class="reader-live-dot">この単元だけの実験</span></figcaption><div id="reader-diagram" class="reader-diagram" aria-label="現在の条件に対応する図"></div><div id="reader-player" class="reader-player"><p id="reader-direct-message" hidden>この実験は入力するとその場で変わります。再生は不要です。</p><div id="reader-sequence-tools"><div class="reader-play-buttons">${rbutton('first','最初','ghost')}${rbutton('back','1つ戻る','ghost')}<button type="button" class="btn primary" data-r-action="play" id="reader-play">${icon('play',17)}再生</button><button type="button" class="btn" data-r-action="next"><span id="reader-next-label"></span> →</button>${rbutton('last','最後','ghost')}</div><div class="reader-seek-row"><label for="reader-scrubber" class="sr-only">図の段階を選ぶ</label><input id="reader-scrubber" type="range" min="0" max="0" value="0" step="1" disabled><label class="reader-speed-label" for="reader-speed">再生速度<select id="reader-speed"><option value="0.5">0.5倍</option><option value="1" selected>1倍</option><option value="2">2倍</option><option value="4">4倍</option></select></label></div></div><p id="reader-position" class="reader-position"></p></div><section id="reader-event" class="reader-event" aria-live="off" aria-label="現在の段階とその理由"></section><div id="reader-table" class="reader-frame-table"></div><div class="reader-current-conditions"><details><summary>この図に使った入力を確認する</summary><p id="reader-condition-summary"></p></details></div></figure><div id="reader-companion"></div><div id="reader-result-details" class="reader-result-details"></div><section id="reader-comparison" class="reader-comparison" aria-label="一時的な比較"></section></div></div><section class="reader-next-units"><h2>つながる単元</h2><p>前提を確かめたいときも、続きを知りたいときも。順番による制限はありません。</p><div class="reader-related-links">${related.map(id=>`<a href="#/lab/${id}">${h(A.lab(id).unit)} →</a>`).join('')||'<a href="#/catalog">全ての単元を探す →</a>'}</div></section><details class="reader-scope"><summary>この教材の前提・省略・参考資料</summary><h3>${h(lab.scope)}</h3><p>${h(lab.limits)}</p>${lab.reading.notes?`<p class="reader-source-note">説明の組み立ての参考：${h(lab.reading.notes)}（表紙を含むPDFのページ番号）。数値例・プログラム・画面はサイト独自の教材です。提供ノートそのものは公開していません。</p>`:''}<ul>${sourceHTML(lab)}</ul></details><p class="reader-privacy">入力・再生位置・比較・回答は、この単元を開いている間だけのものです。別の単元への移動や再読み込みで初期化し、学習履歴やノートとして保存しません。</p></article>${A.footer()}`;
 renderGuidance(c);renderControls(c);compute(c);
};
A.play=(...args)=>{const c=A.current;if(!c?.reader)return legacy.play(...args);if(ready(c))c.player.play();};
A.seek=(n,...args)=>{const c=A.current;if(!c?.reader)return legacy.seek(n,...args);if(ready(c))c.player.seek(n);};
A.step=(n,...args)=>{const c=A.current;if(!c?.reader)return legacy.step(n,...args);if(ready(c))c.player.step(n);};
A.stop=(...args)=>{const c=A.current;if(!c?.reader)return legacy.stop(...args);c.player.pause();};
A.runCurrent=(...args)=>{const c=A.current;if(!c?.reader)return legacy.run(...args);if(!c.invalidKey)return compute(c);};
// A single handler serves mouse, touch and keyboard-activated native buttons.
document.addEventListener('click',e=>{
 const c=A.current;if(!c?.reader)return;
 const phase=e.target.closest('[data-r-phase]');
 if(phase){e.preventDefault();e.stopImmediatePropagation();setPhase(c,Number(phase.dataset.rPhase));return;}
 const answer=e.target.closest('[data-r-answer]');if(answer){e.preventDefault();e.stopImmediatePropagation();c.answer=Number(answer.dataset.rAnswer);renderGuidance(c);const next=document.querySelector(`[data-r-answer="${c.answer}"]`);next?.focus({preventScroll:true});return;}
 const jump=e.target.closest('[data-r-frame]');if(jump){e.preventDefault();e.stopImmediatePropagation();A.seek(Number(jump.dataset.rFrame));return;}
 const focus=e.target.closest('[data-r-focus]');if(focus){e.preventDefault();e.stopImmediatePropagation();c.noteFocus=focus.dataset.rFocus;paint(c);document.querySelector(`[data-r-focus="${CSS.escape(c.noteFocus)}"]`)?.focus({preventScroll:true});return;}
 const bit=e.target.closest('[data-r-bit]');if(bit){e.preventDefault();e.stopImmediatePropagation();if(c.lab.id==='c01-bits'&&ready(c)){const i=Number(bit.dataset.rBit);if(Number.isInteger(i)&&i>=0&&i<c.params.width){const val=(((Math.floor(c.params.value)%2**c.params.width)+2**c.params.width)%2**c.params.width)^(2**(c.params.width-1-i));c.params.value=val;renderControls(c);compute(c);}}return;}
 const node=e.target.closest('[data-r-node],[data-r-edge]');if(node){e.preventDefault();e.stopImmediatePropagation();const n=node.dataset.rNode||node.dataset.rEdge;const note=document.createElement('p');note.className='reader-node-feedback';note.textContent=`選んだ対象：${n}。構成そのものの追加・接続・移動は、上の「自由実験・詳細画面」で行えます。`;$('reader-diagram').querySelector('.reader-node-feedback')?.remove();$('reader-diagram').append(note);return;}
 const b=e.target.closest('[data-r-action]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();
 switch(b.dataset.rAction){
  case 'advance':setPhase(c,c.phase+1);break;
  case 'play':A.play();break;
  case 'first':A.seek(0);break;
  case 'back':A.step(-1);break;
  case 'next':A.step(1);break;
  case 'last':if(ready(c))A.seek(c.result.frames.length-1);break;
  case 'apply':if(!c.invalidKey)compute(c);else paint(c);break;
  case 'reset':reset(c);break;
  case 'variant':variant(c);break;
  case 'baseline':if(ready(c)){c.baseline={params:clone(c.params),result:c.result};c.compareOpen=true;renderComparison(c);}break;
  case 'restore':if(c.baseline){c.params=clone(c.baseline.params);c.invalidKey=null;renderControls(c);compute(c);}break;
  case 'clear-compare':c.baseline=null;renderComparison(c);break;
 }
},true);
function fieldEvent(e){
 const c=A.current;if(!c?.reader)return;const el=e.target;
 if(el.id==='reader-scrubber'){if(e.type==='input')A.seek(Number(el.value));return;}
 if(el.id==='reader-speed'){if(e.type==='change')c.player.setSpeed(Number(el.value));return;}
 if(el.dataset.rNumber!==undefined){if(e.type==='input')change(c,el.dataset.rNumber,el.value,{fromNumber:true});return;}
 const key=el.dataset.rParam;if(key===undefined)return;const ctrl=c.lab.controls.find(x=>x.key===key);if(!ctrl)return;
 if((ctrl.type==='toggle'||ctrl.type==='select')&&e.type!=='change')return;
 if(ctrl.type!=='toggle'&&ctrl.type!=='select'&&e.type!=='input')return;
 change(c,key,ctrl.type==='toggle'?el.checked:el.value,{isCode:ctrl.type==='code'});
}
document.addEventListener('input',fieldEvent,true);document.addEventListener('change',fieldEvent,true);
document.addEventListener('pointerdown',e=>{if(e.target.id==='reader-scrubber'&&A.current?.reader)A.current.player.pause();},true);
document.addEventListener('toggle',e=>{const c=A.current;if(!c?.reader)return;if(e.target.id==='reader-compare-details')c.compareOpen=e.target.open;if(e.target.id==='reader-frame-table')c.tableOpen=e.target.open;},true);
document.addEventListener('keydown',e=>{if(A.current?.reader&&e.key==='Enter'&&e.target.matches('[data-r-number],[data-r-param]:not(textarea)')){e.preventDefault();A.runCurrent();}},true);
// Cards and course entry points are about the subject, not completion or activity.
A.labCard=lab=>`<a class="lab-card reader-unit-card" href="#/lab/${lab.id}"><div class="lab-card-top">${A.pill(lab.track)}<span>${h(lab.course.split('／')[0])}</span></div><h3>${h(lab.unit)}</h3><p>${h(lab.summary)}</p><div class="reader-card-question">${h(lab.question)}</div><div class="lab-card-bottom"><span>解説と図を開く</span>${icon('arrow',17)}</div></a>`;
const courseCard=course=>`<a class="reader-course-card" href="#/course/${course.id}"><span class="reader-overline">授業の並びから探す</span><h2>${h(course.name)}</h2><p>${h(course.description)}</p><span>単元を選ぶ →</span></a>`;
A.views.home=()=>{
 A.setTitle('学びたい単元を探す');A.setNav('home','学びたい単元を探す');
 $('main').innerHTML=`<section class="reader-library"><header class="reader-library-head"><p class="reader-overline">VISUAL CS LAB / INTERACTIVE EXPLANATIONS</p><h1>学びたい単元を、すぐに。</h1><p>小さな例を読み、図で確かめ、条件を変えて理解する。</p><form id="home-search-form" class="home-search" role="search"><label class="sr-only" for="home-query">単元名・用語・科目名</label>${icon('search',21)}<input id="home-query" name="q" type="search" placeholder="エントロピー、シンドローム、仮想メモリ、TCP…" autocomplete="off"><button class="btn primary" type="submit">探す</button></form><div class="quick-terms">${['自己情報量','論理回路','仮想メモリ','IP','TCP','認証'].map(q=>`<button type="button" data-action="home-query" data-query="${q}">${q}</button>`).join('')}</div></header><section id="home-results" aria-label="単元の検索結果" hidden></section><div id="home-browse"><div class="reader-course-grid">${L.readingCourses.map(courseCard).join('')}</div><section class="reader-specialist"><div><h2>ネットワーク</h2><p>宛先の意味から、通信・性能・障害診断まで。</p><div>${['n01-forwarding','n04-subnet','n09-dns','n11-tcp'].map(id=>`<a href="#/lab/${id}">${h(A.lab(id).unit)} →</a>`).join('')}</div><a class="btn" href="#/catalog?track=network">ネットワークをすべて見る</a></div><div><h2>セキュリティ</h2><p>暗号・認証・権限を分け、防御と調査へつなぐ。</p><div>${['s01-threat','s06-tls','s08-access','s10-cors'].map(id=>`<a href="#/lab/${id}">${h(A.lab(id).unit)} →</a>`).join('')}</div><a class="btn" href="#/catalog?track=security">セキュリティをすべて見る</a></div></section><section><div class="section-title"><div><h2>小さな例から始める</h2><p>単元名だけでなく、答えたい疑問から選べます。</p></div></div><div class="lab-grid">${['c01-entropy','c08-adder','c10-address-spaces','c09-cpu','c11-scheduler','c16-git'].map(id=>A.labCard(A.lab(id))).join('')}</div></section><section class="reader-all-areas"><h2>情報科学の20分野</h2><p>もとの144単元は残しています。授業ノートに沿う基礎も加え、どの単元にも直接進めます。</p><div class="reader-area-links">${L.areas.map(area=>`<a href="#/catalog?area=${area.id}">${h(area.name)}<span>${L.labs.filter(l=>l.area===area.id).length}</span></a>`).join('')}</div><div class="button-row"><a class="btn primary" href="#/catalog">全${L.labs.length}単元から探す</a><a class="btn" href="#/curriculum">科目名で探す</a><a class="btn" href="#/routes">おすすめの順番</a></div></section></div></section>${A.footer()}`;
};
A.views.course=parts=>{
 const course=L.readingCourses.find(x=>x.id===parts[0]);if(!course)return A.views.notfound();A.setTitle(course.name);A.setNav('curriculum',course.name);
 $('main').innerHTML=`<section class="reader-course-page"><header class="reader-title"><p class="reader-overline">授業の流れから探す</p><h1>${h(course.name)}</h1><p>${h(course.description)}</p><p class="reader-hint">ノートの説明の順序を参考にした案内です。全ページの完全な再現や、授業の履修条件を置き換えるものではありません。</p><a class="btn" href="#/">← 単元を探す</a></header>${course.groups.map(([title,ids],i)=>`<section class="reader-course-group"><h2><span>${String(i+1).padStart(2,'0')}</span>${h(title)}</h2><div class="lab-grid">${ids.map(id=>A.labCard(A.lab(id))).join('')}</div></section>`).join('')}</section>${A.footer()}`;
};
})();
