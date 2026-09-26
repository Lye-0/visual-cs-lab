/* Shared only: lifecycle, form identity, undo and asynchronous cancellation.
 * Each widget below authors its own object layout and learning interaction. */
(() => {
'use strict';
const L=CSL,X=L.experiences,S=(X.securityDesk ||= {clone:X.clone}),h=L.h;
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
 function paint(preserve=true,preserveView=true){
  if(!scope.alive())return;
  const focus=document.activeElement,identity=focus&&root.contains(focus)?focus.getAttribute('data-sec-action'):null,fieldId=focus&&root.contains(focus)?focus.getAttribute('data-sec-field'):null;
  // Multiple controls may select the same object (for example, an area and
  // its term in a sum). Keep the originating control, not the first match.
  const sameAction=identity===null?[]:[...root.querySelectorAll('[data-sec-action]')].filter(el=>el.dataset.secAction===identity);
  const focusOccurrence=sameAction.indexOf(focus);
  // Opt-in, local view state only. It never enters the learning model, history
  // storage, or another visit. Fresh numeric values need not close the view.
  const views=preserveView?[...board.querySelectorAll('[data-sec-view]')].map(el=>({key:el.dataset.secView,tag:el.tagName,open:el.tagName==='DETAILS'?el.open:null,left:el.scrollLeft,top:el.scrollTop})):[];
  const retained=preserve?[...board.querySelectorAll('[data-sec-field]')].map(el=>({key:el.dataset.secField,value:el.value,checked:el.checked})):[];
  board.innerHTML=config.render(state,{field});
  const restoredViews=views.map(old=>({old,el:[...board.querySelectorAll('[data-sec-view]')].find(el=>el.dataset.secView===old.key&&el.tagName===old.tag)})).filter(pair=>pair.el);
  // Open disclosures before restoring descendants' scroll offsets.
  for(const {old,el} of restoredViews)if(old.open!==null)el.open=old.open;
  for(const {old,el} of restoredViews){el.scrollLeft=old.left;el.scrollTop=old.top;}
  for(const old of retained){const el=board.querySelector('[data-sec-field="'+old.key+'"]');if(el){el.value=old.value;if(el.type==='checkbox')el.checked=old.checked;}}
  root.dataset.secState=JSON.stringify(state);root.setAttribute('aria-busy','false');
  root.querySelector('[data-sec-action="undo"]').disabled=history.length===0;
  root.querySelector('[data-sec-log]').innerHTML=state.log.map(line=>'<li>'+h(line)+'</li>').join('');
  status.textContent=state.log.at(-1)||'対象を選んで試してください。';status.classList.remove('ex-error');
  const target=fieldId?[...root.querySelectorAll('[data-sec-field]')].find(el=>el.dataset.secField===fieldId):identity?[...root.querySelectorAll('[data-sec-action]')].filter(el=>el.dataset.secAction===identity)[Math.max(0,focusOccurrence)]:null;
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
  if(code==='reset'){generation++;busy=false;history=[];state=config.start();paint(false,false);return;}
  if(code==='undo'){if(busy||!history.length)return;state=history.pop();paint(false);return;}
  if(busy)return;
  try{const action=config.action(code,fields(),state);if(action)void apply(action);}catch(error){fail(error);}
 });
 scope.on(root,'submit',event=>{event.preventDefault();});
 scope.cleanup(()=>{generation++;busy=false;});paint(false);
 return {scope,state:()=>state,apply};
};

})();
