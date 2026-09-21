/* Shared accessibility/lifecycle primitives, not a compulsory lesson sequence.
 * Chapters are authored per learning goal. No global player or saved progress. */
(() => {
'use strict';
const L=CSL,X=L.experiences,A=L.app,h=L.h;
if(typeof document==='undefined')return;
X.html={p:t=>'<p>'+h(t)+'</p>',button:(t,attrs='')=>`<button type="button" class="ex-button" ${attrs}>${h(t)}</button>`,table:(headers,rows)=>L.table({headers,rows},'値と対象の対応'),value:X.format,formula:t=>`<div class="ex-equation" role="math">${h(t)}</div>`};
let sequence=0;
X.scope=(root,current)=>{
 const abort=new AbortController(),cleanups=[];
 const scope={root,current,id:'ex-'+(++sequence),alive:()=>!abort.signal.aborted&&root.isConnected&&A.current===current,
  on:(el,type,fn,options={})=>el.addEventListener(type,fn,{...options,signal:abort.signal}),
  cleanup:fn=>cleanups.push(fn),
  dispose:()=>{abort.abort();for(const fn of cleanups)fn();},
  error:error=>{let status=root.querySelector('[data-ex-status]');if(!status){status=document.createElement('p');status.dataset.exStatus='';status.setAttribute('role','status');root.append(status);}status.textContent=error?.message||String(error);status.classList.add('ex-error');root.setAttribute('aria-busy','false');}
 };
 current.scopes.push(scope);return scope;
};
X.draw=(root,frame,focus=null)=>{
 if(!frame)throw Error('この例の状態がありません。');
 root.innerHTML=`<div class="reader-diagram ex-model-diagram">${L.visualize(frame.visual,{focus})}</div><div class="ex-frame-copy"><h4>${h(frame.title)}</h4><p>${h(frame.explain)}</p>${frame.table?L.table(frame.table):''}</div>`;
};
X.fields=(lab,keys,p,uid)=>keys.map(spec=>{
 const key=typeof spec==='string'?spec:spec.key,ctrl=lab.controls.find(c=>c.key===key);if(!ctrl)throw Error('入力が存在しません: '+lab.id+'/'+key);
 const label=typeof spec==='string'?ctrl.label:spec.label||ctrl.label,id=uid+'-'+key,v=p[key];let input;
 if(ctrl.type==='toggle')input=`<input id="${id}" name="${key}" type="checkbox" ${v?'checked':''}>`;
 else if(ctrl.type==='select')input=`<select id="${id}" name="${key}">${ctrl.options.map(o=>`<option value="${h(o.value)}"${String(o.value)===String(v)?' selected':''}>${h(typeof spec==='object'&&spec.labels?.[o.value]||o.label)}</option>`).join('')}</select>`;
 else if(ctrl.type==='range')input=`<input id="${id}" name="${key}" type="number" value="${h(v)}" min="${ctrl.min}" max="${ctrl.max}" step="${ctrl.step}" required>`;
 else if(ctrl.type==='code')input=`<textarea id="${id}" name="${key}" rows="${typeof spec==='object'&&spec.rows||6}" spellcheck="false" maxlength="8000">${h(v)}</textarea>`;
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
function preserveDetails(output,render){
 const open=[...output.querySelectorAll('details')].map((el,i)=>el.open?i:-1).filter(i=>i>=0);render();
 const after=output.querySelectorAll('details');for(const i of open)if(after[i])after[i].open=true;
}
X.modelActivity=(root,activity,current)=>{
 const scope=X.scope(root,current),lab=A.lab(activity.model||current.lab.id),kind=activity.kind;
 let params=X.modelParams(lab.id,activity.patch),token=0,result=null,index=0,limit=6,selected=null;
 const fields=activity.keys.length>0;
 const controls=`<form class="ex-inputs" data-ex-form${fields?'':' hidden'}>${X.fields(lab,activity.keys,params,scope.id)}<div class="ex-actions"><button type="submit" class="ex-button ex-primary">${h(activity.submit||({editor:'このコードを実行する',ledger:'途中計算をこの入力で確かめる',timeline:'この処理を調べる',inspect:'変更を反映する'}[kind]))}</button>${X.html.button('例の初期値に戻す','data-ex-reset')}</div></form>`;
 const choices=activity.examples?.length?`<div class="ex-example-choices" aria-label="試す具体例">${activity.examples.map((p,i)=>X.html.button(p.label,`data-ex-example="${i}"`)).join('')}</div><p class="ex-example-reason"></p>`:'';
 // Inspection starts with the object, code starts with code, and a worked
 // derivation starts with its premises. Input panels do not dictate the page.
 const workspace='<div data-ex-result></div>';
 root.innerHTML=`${activity.hint?'<p class="ex-operation-hint">'+h(activity.hint)+'</p>':''}${choices}${kind==='inspect'?workspace+controls:controls+workspace}<p data-ex-status role="status" aria-live="polite"></p>`;
 const form=root.querySelector('form'),output=root.querySelector('[data-ex-result]'),status=root.querySelector('[data-ex-status]');
 const setFields=()=>{const buttons=form.querySelector('.ex-actions');form.innerHTML=X.fields(lab,activity.keys,params,scope.id);form.append(buttons);};
 const resolvedIndex=()=>['timeline','editor'].includes(kind)?index:typeof activity.frame==='number'?Math.max(0,Math.min(activity.frame,result.frames.length-1)):activity.frame==='first'?0:result.frames.length-1;
 function paint(){
  if(!scope.alive()||!result)return;const frames=result.frames;
  preserveDetails(output,()=>{
   if(kind==='ledger'){
    output.innerHTML=`<div class="ex-ledger">${frames.slice(0,limit).map((f,i)=>`<section class="ex-ledger-line" data-ex-record="${i}"><span class="ex-line-number">${i+1}</span><div><h4>${h(f.title)}</h4><p>${h(f.explain)}</p>${f.table?L.table(f.table):''}<details><summary>この式・判断に対応する図</summary><div class="reader-diagram ex-model-diagram">${L.visualize(f.visual,{})}</div></details></div></section>`).join('')}</div>${limit<frames.length?X.html.button('前の計算を残して続きへ（残り'+(frames.length-limit)+'件）','data-ex-more'):''}<p class="ex-conclusion">${h(result.conclusion)}</p>`;
   }else if(kind==='timeline'||kind==='editor'){
    index=Math.min(index,frames.length-1);
    output.innerHTML=`<div class="ex-trace-layout"><ol class="ex-event-list" aria-label="状態の記録">${frames.map((f,i)=>`<li><button type="button" data-ex-event="${i}"${i===index?' aria-current="step"':''}><span>${i+1}</span>${h(f.title)}</button></li>`).join('')}</ol><div class="ex-selected-state"><div data-ex-frame></div><div class="ex-actions">${X.html.button('一つ前の状態','data-ex-previous'+(index===0?' disabled':''))}${X.html.button(activity.advance||'次の処理を確かめる','data-ex-next'+(index===frames.length-1?' disabled':''))}</div></div>`;
    X.draw(output.querySelector('[data-ex-frame]'),frames[index],selected);
   }else{
    output.innerHTML='<div data-ex-frame></div>'+(activity.showDerivation?`<details class="ex-derivation"><summary>この値に至る式・判断</summary>${frames.map(f=>'<h4>'+h(f.title)+'</h4><p>'+h(f.explain)+'</p>').join('')}</details>`:'');
    X.draw(output.querySelector('[data-ex-frame]'),frames[resolvedIndex()],selected);
   }
  });
 }
 async function run(){
  const own=++token;result=null;selected=null;output.replaceChildren();status.textContent='この入力から計算しています…';status.className='';root.setAttribute('aria-busy','true');
  try{const r=await L.run(lab,params);if(!scope.alive()||token!==own)return;result=r;index=0;limit=6;paint();status.textContent='表示は、確定した入力に対応しています。';current.completed.add(scope.id);}
  catch(e){if(scope.alive()&&token===own){scope.error(e);current.errors.push({activity:activity.title,message:e.message});}}
  finally{if(scope.alive()&&token===own)root.setAttribute('aria-busy','false');}
 }
 scope.on(form,'submit',e=>{e.preventDefault();try{params=X.readFields(form,lab,params);run();}catch(error){token++;result=null;output.replaceChildren();scope.error(error);}});
 scope.on(form,'input',()=>{token++;result=null;output.innerHTML='<p class="ex-caption">入力を編集中です。実行ボタンで確定すると、新しい結果を表示します。</p>';status.className='';status.textContent='古い入力の結果は表示していません。';root.setAttribute('aria-busy','false');});
 scope.on(root,'click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-ex-reset')){params=X.modelParams(lab.id,activity.patch);setFields();const reason=root.querySelector('.ex-example-reason');if(reason)reason.textContent='';run();return;}
  if(b.hasAttribute('data-ex-example')){const example=activity.examples[Number(b.dataset.exExample)];params={...X.modelParams(lab.id,activity.patch),...example.patch};setFields();root.querySelector('.ex-example-reason').textContent=example.reason;run();return;}
  if(!result)return;
  const focus=()=>{const target=b.hasAttribute('data-ex-event')?`[data-ex-event="${index}"]`:b.hasAttribute('data-ex-more')?'[data-ex-more]':b.hasAttribute('data-ex-next')?'[data-ex-next]':'[data-ex-previous]';const node=output.querySelector(target);if(node&&!node.disabled)node.focus({preventScroll:true});else {output.tabIndex=-1;output.focus({preventScroll:true});}};
  if(b.hasAttribute('data-ex-more')){limit+=6;paint();focus();}
  if(b.hasAttribute('data-ex-event')){index=Number(b.dataset.exEvent);selected=null;paint();focus();}
  if(b.hasAttribute('data-ex-next')){index=Math.min(index+1,result.frames.length-1);selected=null;paint();focus();}
  if(b.hasAttribute('data-ex-previous')){index=Math.max(0,index-1);selected=null;paint();focus();}
 });
 scope.on(root,'click',e=>{
  const node=e.target.closest('[data-r-focus]');if(!node||!result)return;
  const target=output.querySelector('[data-ex-frame]');if(!target)return;
  selected=node.getAttribute('data-r-focus');X.draw(target,result.frames[resolvedIndex()],selected);
  target.querySelector(`[data-r-focus="${CSS.escape(selected)}"]`)?.focus({preventScroll:true});
 });
 scope.on(root,'keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('svg [data-r-focus]')){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
 scope.cleanup(()=>token++);run();
};
for(const name of ['inspect','ledger','timeline','editor'])X.registerWidget(name,X.modelActivity);
X.registerWidget('compare',(root,a,c)=>{
 const scope=X.scope(root,c),lab=A.lab(a.model||c.lab.id);
 root.innerHTML=`<p class="ex-operation-hint">${h(a.hint||'どちらの結果も残して、変えた条件と理由を比べます。')}</p><div class="ex-side-by-side">${a.examples.map((p,i)=>`<section><h4>${h(p.label)}</h4><p>${h(p.reason)}</p><div data-ex-comparison="${i}" aria-busy="true"></div></section>`).join('')}</div>`;
 a.examples.forEach(async(p,i)=>{const box=root.querySelector(`[data-ex-comparison="${i}"]`);try{const result=await L.run(lab,X.modelParams(lab.id,{...a.patch,...p.patch}));if(!scope.alive())return;X.draw(box,result.frames.at(-1));box.insertAdjacentHTML('beforeend',`<details><summary>この結果に至る判断</summary>${result.frames.map(f=>'<h5>'+h(f.title)+'</h5><p>'+h(f.explain)+'</p>').join('')}</details>`);c.completed.add(scope.id+'-'+i);}catch(e){if(scope.alive()){box.classList.add('ex-error');box.textContent=e.message;c.errors.push({activity:a.title,message:e.message});}}finally{if(scope.alive())box.setAttribute('aria-busy','false');}});
});
X.registerWidget('cases',(root,a,c)=>{
 const scope=X.scope(root,c);let selected=0;
 function paint(){const item=a.cases[selected];root.innerHTML=`<div class="ex-case-choices">${a.cases.map((v,i)=>`<button type="button" class="ex-button" data-ex-case="${i}" aria-pressed="${i===selected}">${h(v.title)}</button>`).join('')}</div><div class="ex-case-scene"><h4>${h(item.title)}</h4><p>${h(item.scene)}</p></div><div class="ex-case-reason"><h4>${h(item.heading||'ここで区別すること')}</h4><p>${h(item.reason)}</p>${item.contrast?'<p class="ex-counterexample">'+h(item.contrast)+'</p>':''}</div>`;c.completed.add(scope.id);}
 scope.on(root,'click',e=>{const b=e.target.closest('[data-ex-case]');if(b){selected=Number(b.dataset.exCase);paint();root.querySelector(`[data-ex-case="${selected}"]`)?.focus({preventScroll:true});}});paint();
});
const previousLab=A.views.lab;
A.views.lab=(parts,params)=>{
 const id=parts[0],def=X.find(id);
 if(!def||['classic','experiment'].includes(params?.get('view'))){previousLab(parts,params);return;}
 const lab=A.lab(id),chapter=def.chapters.find(ch=>ch.id===params?.get('chapter'))||def.chapters[0],path=L.taxonomy.path(lab);
 const current=A.current={experience:true,lab,chapter:chapter.id,scopes:[],completed:new Set(),errors:[],playing:false};
 current.player={dispose(){for(const s of current.scopes)s.dispose();current.scopes=[];},pause(){}};
 A.setTitle(lab.unit);A.setNav('domain-'+path[0].id,lab.unit);
 const sources=lab.sources.map(id=>L.sources[id]).filter(Boolean),chapterIndex=def.chapters.indexOf(chapter),chapterLink=ch=>'#/lab/'+id+'?chapter='+ch.id;
 document.getElementById('main').innerHTML=`<article class="experience" data-ex-lesson="${h(id)}"><header class="ex-title"><nav class="library-breadcrumb" aria-label="単元の分類"><a href="#/catalog">単元一覧</a><span>/</span><a href="#/catalog?domain=${path[0].id}&category=${path[1].id}">${h(path[1].name)}</a></nav><h1>${h(lab.unit)}</h1><p class="ex-lead">${h(def.lead)}</p></header>${def.chapters.length>1?`<nav class="ex-chapters" aria-label="この単元で学ぶこと">${def.chapters.map(ch=>`<a href="${chapterLink(ch)}"${chapter.id===ch.id?' aria-current="page"':''}><strong>${h(ch.title)}</strong><span>${h(ch.question)}</span></a>`).join('')}</nav>`:''}<section class="ex-chapter" data-ex-chapter="${chapter.id}"><header><h2>${h(chapter.title)}</h2><p class="ex-question">${h(chapter.question)}</p></header>${chapter.paragraphs.map(X.html.p).join('')}${chapter.formula?X.html.formula(chapter.formula):''}<div class="ex-activities">${chapter.activities.map((a,i)=>`<section class="ex-activity ex-kind-${h(a.kind)}" data-ex-activity="${i}" data-ex-kind="${h(a.kind)}"><h3>${h(a.title)}</h3><div class="ex-activity-body"></div></section>`).join('')}</div>${chapter.after.map(p=>'<aside class="ex-why">'+X.html.p(p)+'</aside>').join('')}</section>${def.chapters.length>1?`<nav class="ex-chapter-next" aria-label="章の移動">${chapterIndex?'<a href="'+chapterLink(def.chapters[chapterIndex-1])+'">← '+h(def.chapters[chapterIndex-1].title)+'</a>':'<span></span>'}${chapterIndex+1<def.chapters.length?'<a href="'+chapterLink(def.chapters[chapterIndex+1])+'">'+h(def.chapters[chapterIndex+1].title)+' →</a>':''}</nav>`:''}<details class="ex-model-scope"><summary>この小例の範囲・用語・参考資料</summary><h3>実験の範囲</h3><p>${h(lab.scope)}</p><p>${h(lab.limits)}</p>${def.scope?'<p>'+h(def.scope)+'</p>':''}<dl>${(lab.reading?.terms||[]).map(t=>'<dt>'+h(t.term)+'</dt><dd>'+h(t.definition)+'</dd>').join('')}</dl><ul>${sources.map(s=>'<li><a href="'+h(s.url)+'" target="_blank" rel="noopener noreferrer">'+h(s.name)+'</a></li>').join('')}</ul></details><div class="ex-secondary"><a href="#/lab/${id}?view=classic">詳細実験で、他の条件も試す →</a><a href="#/catalog?domain=${path[0].id}&category=${path[1].id}">同じテーマの単元へ →</a></div></article>${A.footer()}`;
 for(const [i,a]of chapter.activities.entries()){
  const host=document.querySelector(`[data-ex-activity="${i}"] .ex-activity-body`),mount=X.widgets.get(a.kind);
  try{if(!mount)throw Error('表示部品がありません: '+a.kind+' / '+id);mount(host,a,current);}catch(e){host.classList.add('ex-error');host.textContent=e.message;current.errors.push({activity:a.title,message:e.message});console.error(e);}
 }
};
// Legacy document-level handlers have no experiment state on an authored page.
// Keyboard navigation, search and native DOM lesson events remain unchanged.
for(const name of ['play','step','seek','nodeClick','builderHint']){
 const original=A[name];A[name]=(...args)=>A.current?.experience?undefined:original?.(...args);
}
const originalStop=A.stop;
A.stop=(...args)=>{if(A.current?.experience){for(const s of A.current.scopes)s.pause?.();return;}return originalStop(...args);};
})();
