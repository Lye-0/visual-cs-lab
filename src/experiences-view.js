/* Runtime for individually authored chapters. No obligatory four phases, player,
 * quiz, sidebar of parameters or persisted learning state. */
(() => {
'use strict';
const L=CSL,X=L.experiences,A=L.app,h=L.h;
if(typeof document==='undefined')return;
X.html={
 p:text=>'<p>'+h(text)+'</p>',
 button:(text,attrs='')=>`<button type="button" class="ex-button" ${attrs}>${h(text)}</button>`,
 table:(heads,rows)=>L.table({headers:heads,rows},'値と対象の対応'),
 value:X.format,
 formula:text=>`<div class="ex-equation" role="math">${h(text)}</div>`
};
let sequence=0;
const mountScope=(root,current)=>{
 const abort=new AbortController(),cleanups=[];
 const s={root,current,id:'ex-'+(++sequence),alive:()=>!abort.signal.aborted&&root.isConnected&&A.current===current,
  on:(el,type,fn,options={})=>el.addEventListener(type,fn,{...options,signal:abort.signal}),
  cleanup:fn=>cleanups.push(fn),
  dispose:()=>{abort.abort();for(const fn of cleanups)fn();},
  error:error=>{const status=root.querySelector('[data-ex-status]');if(status){status.textContent=error?.message||String(error);status.classList.add('ex-error');}}
 };
 current.scopes.push(s);return s;
};
X.scope=mountScope;
X.draw=(root,frame,focus=null)=>{
 if(!frame)return;
 root.innerHTML=`<div class="reader-diagram ex-model-diagram">${L.visualize(frame.visual,{focus})}</div><div class="ex-frame-copy"><h4>${h(frame.title)}</h4><p>${h(frame.explain)}</p>${frame.table?L.table(frame.table):''}</div>`;
};
X.fields=(lab,keys,p,uid)=>keys.map(spec=>{
 const key=typeof spec==='string'?spec:spec.key,ctrl=lab.controls.find(c=>c.key===key);
 if(!ctrl)throw Error('入力が存在しません: '+lab.id+'/'+key);
 const label=typeof spec==='string'?ctrl.label:spec.label||ctrl.label;
 const id=uid+'-'+key,v=p[key];let input;
 if(ctrl.type==='toggle')input=`<input id="${id}" name="${key}" type="checkbox" ${v?'checked':''}>`;
 else if(ctrl.type==='select')input=`<select id="${id}" name="${key}">${ctrl.options.map(o=>`<option value="${h(o.value)}"${String(o.value)===String(v)?' selected':''}>${h(typeof spec==='object'&&spec.labels?.[o.value]||o.label)}</option>`).join('')}</select>`;
 else if(ctrl.type==='range')input=`<input id="${id}" name="${key}" type="number" value="${h(v)}" min="${ctrl.min}" max="${ctrl.max}" step="${ctrl.step}" required>`;
 else if(ctrl.type==='code')input=`<textarea id="${id}" name="${key}" rows="${typeof spec==='object'&&spec.rows||7}" spellcheck="false" maxlength="8000">${h(v)}</textarea>`;
 else input=`<input id="${id}" name="${key}" type="text" value="${h(v)}" maxlength="1200" autocomplete="off" spellcheck="false">`;
 const help=typeof spec==='object'&&spec.help||ctrl.help||'';
 return `<div class="ex-field${ctrl.type==='code'?' ex-code-field':''}${ctrl.type==='toggle'?' ex-toggle':''}"><label for="${id}">${h(label)}${ctrl.unit?' <small>'+h(ctrl.unit)+'</small>':''}</label>${input}${help?'<p>'+h(help)+'</p>':''}</div>`;
}).join('');
X.readFields=(form,lab,base)=>{
 const p=X.clone(base);
 for(const el of form.querySelectorAll('[name]')){
  const c=lab.controls.find(c=>c.key===el.name);if(!c)continue;
  if(c.type==='range'){if(el.value===''||!el.checkValidity())throw Error(c.label+'：'+c.min+'〜'+c.max+'を'+c.step+'ずつ指定してください。');p[c.key]=Number(el.value);}
  else if(c.type==='toggle')p[c.key]=el.checked;
  else if(c.type==='select'){const o=c.options.find(o=>String(o.value)===el.value);if(!o)throw Error('候補から選んでください。');p[c.key]=o.value;}
  else p[c.key]=el.value;
 }
 return p;
};
X.modelActivity=(root,activity,current)=>{
 const scope=mountScope(root,current),lab=A.lab(activity.model||current.lab.id);
 let params=X.modelParams(lab.id,activity.patch),token=0,result=null,index=0,limit=6;
 const kind=activity.kind;
 root.innerHTML=`${activity.hint?'<p class="ex-operation-hint">'+h(activity.hint)+'</p>':''}<form class="ex-inputs" data-ex-form>${X.fields(lab,activity.keys,params,scope.id)}<div class="ex-actions"><button type="submit" class="ex-button ex-primary">${h(activity.submit||({editor:'このコードを実行する',ledger:'式と途中計算を展開する',timeline:'この通信・処理を調べる',inspect:'変更を反映する'}[kind]||'この例を計算する'))}</button>${X.html.button('この例を初期状態へ戻す','data-ex-reset')}</div></form>${activity.examples?.length?`<div class="ex-example-choices" aria-label="比較する具体例">${activity.examples.map((p,i)=>X.html.button(p.label,`data-ex-example="${i}"`)).join('')}</div><p class="ex-example-reason"></p>`:''}<p data-ex-status role="status" aria-live="polite"></p><div data-ex-result></div>`;
 const form=root.querySelector('form'),output=root.querySelector('[data-ex-result]'),status=root.querySelector('[data-ex-status]');
 const setFields=()=>{const old=form.querySelector('.ex-actions');form.innerHTML=X.fields(lab,activity.keys,params,scope.id);form.append(old);};
 const paint=()=>{
  if(!scope.alive()||!result)return;
  const frames=result.frames;
  if(kind==='ledger'){
   output.innerHTML=`<div class="ex-ledger">${frames.slice(0,limit).map((f,i)=>`<section class="ex-ledger-line" data-ex-record="${i}"><span class="ex-line-number">${i+1}</span><div><h4>${h(f.title)}</h4><p>${h(f.explain)}</p>${f.table?L.table(f.table):''}<details><summary>この式・判断に対応する図を見る</summary><div class="reader-diagram ex-model-diagram">${L.visualize(f.visual,{})}</div></details></div></section>`).join('')}</div>${limit<frames.length?X.html.button('途中を消さず、続きの計算を表示（残り'+(frames.length-limit)+'件）','data-ex-more'):''}<p class="ex-conclusion">${h(result.conclusion)}</p>`;
  }else if(kind==='timeline'||kind==='editor'){
   index=Math.min(index,frames.length-1);
   output.innerHTML=`<div class="ex-trace-layout"><ol class="ex-event-list" aria-label="実行した順と理由">${frames.map((f,i)=>`<li><button type="button" data-ex-event="${i}"${i===index?' aria-current="step"':''}><span>${i+1}</span>${h(f.title)}</button></li>`).join('')}</ol><div class="ex-selected-state"><div data-ex-frame></div><div class="ex-actions">${X.html.button('直前の状態と理由','data-ex-previous'+(index===0?' disabled':''))}${X.html.button(activity.advance||'次の処理を実行して確かめる','data-ex-next'+(index===frames.length-1?' disabled':''))}</div><p class="ex-caption">過去の出来事を選ぶと、その時点の状態へ戻れます。自動再生で読む時間を制限しません。</p></div></div>`;
   X.draw(output.querySelector('[data-ex-frame]'),frames[index]);
  }else{
   const chosen=typeof activity.frame==='number'?Math.min(activity.frame,frames.length-1):activity.frame==='first'?0:frames.length-1;
   output.innerHTML='<div data-ex-frame></div>'+(activity.showDerivation?`<details class="ex-derivation"><summary>この値になるまでの式・判断を読む</summary>${frames.map(f=>'<h4>'+h(f.title)+'</h4><p>'+h(f.explain)+'</p>').join('')}</details>`:'');
   X.draw(output.querySelector('[data-ex-frame]'),frames[chosen]);
  }
  scope.on(output,'click',()=>{}, {once:true});
 };
 async function run(){
  const own=++token;result=null;output.replaceChildren();status.textContent='この入力から計算しています…';status.className='';root.setAttribute('aria-busy','true');
  try{const r=await L.run(lab,params);if(!scope.alive()||token!==own)return;result=r;index=kind==='editor'?r.frames.length-1:0;limit=6;paint();status.textContent='入力に対応する状態です。';current.completed.add(scope.id);}
  catch(e){if(scope.alive()&&token===own){status.textContent=e.message;status.className='ex-error';}}
  finally{if(scope.alive()&&token===own)root.setAttribute('aria-busy','false');}
 }
 scope.on(form,'submit',e=>{e.preventDefault();try{params=X.readFields(form,lab,params);run();}catch(error){token++;result=null;output.replaceChildren();scope.error(error);}});
 scope.on(form,'input',()=>{token++;result=null;output.innerHTML='<p class="ex-caption">入力を編集中です。上の実行ボタンで確定してください。古い条件の結果は表示しません。</p>';status.textContent='編集した入力はまだ計算していません。';root.setAttribute('aria-busy','false');});
 scope.on(root,'click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-ex-reset')){params=X.modelParams(lab.id,activity.patch);setFields();run();}
  if(b.hasAttribute('data-ex-example')){const example=activity.examples[Number(b.dataset.exExample)];params={...X.modelParams(lab.id,activity.patch),...example.patch};setFields();root.querySelector('.ex-example-reason').textContent=example.reason;run();}
  if(!result)return;
  if(b.hasAttribute('data-ex-more')){limit+=6;paint();}
  if(b.hasAttribute('data-ex-event')){index=Number(b.dataset.exEvent);paint();output.querySelector(`[data-ex-event="${index}"]`)?.focus({preventScroll:true});}
  if(b.hasAttribute('data-ex-next')){index=Math.min(index+1,result.frames.length-1);paint();output.querySelector('[data-ex-next]')?.focus({preventScroll:true});}
  if(b.hasAttribute('data-ex-previous')){index=Math.max(0,index-1);paint();output.querySelector('[data-ex-previous]')?.focus({preventScroll:true});}
 });
 // Existing diagram selection remains meaningful without the old global player.
 scope.on(root,'click',e=>{
  const node=e.target.closest('[data-r-focus]');if(!node||!result)return;
  const frame=result.frames[Math.min(index,result.frames.length-1)],target=output.querySelector('[data-ex-frame]');
  if(target){X.draw(target,frame,node.getAttribute('data-r-focus'));target.querySelector(`[data-r-focus="${CSS.escape(node.getAttribute('data-r-focus'))}"]`)?.focus({preventScroll:true});}
 });
 scope.on(root,'keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('svg [data-r-focus]')){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
 scope.cleanup(()=>token++);run();
};
for(const name of ['inspect','ledger','timeline','editor'])X.registerWidget(name,X.modelActivity);
X.registerWidget('compare',(root,a,c)=>{
 const scope=mountScope(root,c),lab=A.lab(a.model||c.lab.id);
 root.innerHTML=`<p class="ex-operation-hint">${h(a.hint||'同じ出発点で、一つの違いを比べます。どちらかの図を覚えたまま切り替える必要はありません。')}</p><div class="ex-side-by-side">${a.examples.map((p,i)=>`<section><h4>${h(p.label)}</h4><p>${h(p.reason)}</p><div data-ex-comparison="${i}" aria-busy="true"></div></section>`).join('')}</div>`;
 a.examples.forEach(async(p,i)=>{const box=root.querySelector(`[data-ex-comparison="${i}"]`);try{const result=await L.run(lab,X.modelParams(lab.id,{...a.patch,...p.patch}));if(!scope.alive())return;X.draw(box,result.frames.at(-1));box.insertAdjacentHTML('beforeend',`<details><summary>この結果に至った判断を読む</summary>${result.frames.map(f=>'<h5>'+h(f.title)+'</h5><p>'+h(f.explain)+'</p>').join('')}</details>`);c.completed.add(scope.id+'-'+i);}catch(e){if(scope.alive())box.textContent=e.message;}finally{if(scope.alive())box.setAttribute('aria-busy','false');}});
});
X.registerWidget('cases',(root,a,c)=>{
 const scope=mountScope(root,c);let selected=0;
 const paint=()=>{const item=a.cases[selected];root.innerHTML=`<div class="ex-case-choices">${a.cases.map((v,i)=>`<button type="button" class="ex-button" data-ex-case="${i}" aria-pressed="${i===selected}">${h(v.title)}</button>`).join('')}</div><div class="ex-case-scene"><h4>${h(item.title)}</h4><p>${h(item.scene)}</p></div><div class="ex-case-reason"><h4>${h(item.heading||'ここで区別すること')}</h4><p>${h(item.reason)}</p>${item.contrast?'<p class="ex-counterexample">'+h(item.contrast)+'</p>':''}</div>`;c.completed.add(scope.id);};
 scope.on(root,'click',e=>{const b=e.target.closest('[data-ex-case]');if(b){selected=Number(b.dataset.exCase);paint();root.querySelector(`[data-ex-case="${selected}"]`)?.focus({preventScroll:true});}});paint();
});
const previousLab=A.views.lab,oldStop=A.stop;
A.views.lab=(parts,params)=>{
 const id=parts[0],def=X.find(id);
 if(!def||['classic','experiment'].includes(params?.get('view'))){previousLab(parts,params);return;}
 const lab=A.lab(id),chapter=def.chapters.find(ch=>ch.id===params?.get('chapter'))||def.chapters[0],path=L.taxonomy.path(lab);
 const current=A.current={experience:true,lab,chapter:chapter.id,scopes:[],completed:new Set(),playing:false};
 current.player={dispose(){for(const s of current.scopes)s.dispose();current.scopes=[];},pause(){}};
 A.setTitle(lab.unit);A.setNav('domain-'+path[0].id,lab.unit);
 const sources=lab.sources.map(id=>L.sources[id]).filter(Boolean);
 document.getElementById('main').innerHTML=`<article class="experience" data-ex-lesson="${h(id)}"><header class="ex-title"><nav class="library-breadcrumb" aria-label="単元の分類"><a href="#/catalog">単元一覧</a><span>/</span><a href="#/catalog?domain=${path[0].id}&category=${path[1].id}">${h(path[1].name)}</a></nav><h1>${h(lab.unit)}</h1><p class="ex-lead">${h(def.lead)}</p></header>${def.chapters.length>1?`<nav class="ex-chapters" aria-label="この単元の中で学ぶこと">${def.chapters.map(ch=>`<a href="#/lab/${id}?chapter=${ch.id}"${chapter.id===ch.id?' aria-current="page"':''}><strong>${h(ch.title)}</strong><span>${h(ch.question)}</span></a>`).join('')}</nav>`:''}<section class="ex-chapter" data-ex-chapter="${chapter.id}"><header><h2>${h(chapter.title)}</h2><p class="ex-question">${h(chapter.question)}</p></header>${chapter.paragraphs.map(X.html.p).join('')}${chapter.formula?X.html.formula(chapter.formula):''}<div class="ex-activities">${chapter.activities.map((a,i)=>`<section class="ex-activity ex-kind-${h(a.kind)}" data-ex-activity="${i}" data-ex-kind="${h(a.kind)}"><h3>${h(a.title)}</h3><div class="ex-activity-body"></div></section>`).join('')}</div>${chapter.after.map(p=>'<aside class="ex-why">'+X.html.p(p)+'</aside>').join('')}</section><details class="ex-model-scope"><summary>この小例の範囲・用語・参考資料</summary><h3>実験の範囲</h3><p>${h(lab.scope)}</p><p>${h(lab.limits)}</p>${def.scope?'<p>'+h(def.scope)+'</p>':''}<dl>${(lab.reading?.terms||[]).map(t=>'<dt>'+h(t.term)+'</dt><dd>'+h(t.definition)+'</dd>').join('')}</dl><ul>${sources.map(s=>'<li><a href="'+h(s.url)+'" target="_blank" rel="noopener noreferrer">'+h(s.name)+'</a></li>').join('')}</ul></details><div class="ex-secondary"><a href="#/lab/${id}?view=classic">従来の詳細実験で条件を広く試す →</a><a href="#/catalog?domain=${path[0].id}&category=${path[1].id}">同じテーマの別の単元へ →</a></div><p class="ex-caption">入力や操作はこのページを開いている間だけのものです。学習履歴として保存しません。</p></article>${A.footer()}`;
 for(const [i,a]of chapter.activities.entries()){
  const host=document.querySelector(`[data-ex-activity="${i}"] .ex-activity-body`),mount=X.widgets.get(a.kind);
  if(!mount)throw Error('表示部品がありません: '+a.kind+' / '+id);
  mount(host,a,current);
 }
};
A.stop=(...args)=>{if(A.current?.experience){for(const s of A.current.scopes)s.pause?.();return;}return oldStop(...args);};
})();
