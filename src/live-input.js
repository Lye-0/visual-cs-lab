/* Input changes recompute conditions; explicit simulation actions remain actions. */
(() => {
'use strict';
if(typeof document==='undefined')return;
const X=CSL.experiences;
X.liveActions={
 'matrix-product':['load'],'gradient-direction':['point','angle','step'],
 'jacobian-local':['point','h'],'double-integral-region':['coefficients'],
 'trapezoid-select':['configure'],'knapsack-cells':['capacity','item:*'],
 'index-correspondence':['query'],'join-provenance':['edit'],'bplus-routing':['query'],
 'segmentation-desk':['dictionary','query'],'classification-evidence':['edit'],'retrieval-evidence':['k'],
 'prep-desk':['edit','fit'],'classifier-desk':['point'],'holdout-desk':['fit'],'gradient-desk':['edit'],
 'git-stage-desk':['file','edit'],'evidence-copy':['edit'],'test-author-desk':['code'],'study-order':['parameters'],
 'sensor-calibration':['hardware','temperature'],'control-state-pair':['target'],
 'surface-light':['light','exponent'],'bezier-construction':['move','t'],
 'filter-contributions':['input'],'image-neighborhood':['edit','threshold'],
 'signal-decision':['move'],'tcp-window-desk':['rwnd','cwnd'],
 'pcap-inspector':['load'],'network-config-desk':['device','rules','record'],
 'bridge-lan':['configure'],'ip-fragments':['configure'],
 'jwt-check-desk':['edit','context'],'policy-request':['set']
};
X.liveInput=(root,scope,{accept,apply,invalidate=()=>{},error=e=>scope.error(e)})=>{
 let timer=null,revision=0,running=false,waiting=null,composing=false;
 const snapshot=()=>{let el=document.activeElement;const step=el?.matches('.csl-number-step')?[...el.parentElement.querySelectorAll('button')].indexOf(el):-1;if(step>=0)el=el.parentElement.querySelector('input');if(el?.matches('.csl-select'))el=el.previousElementSibling;if(!el||!root.contains(el))return null;const selector=el.id?'#'+CSS.escape(el.id):el.name?'[name="'+CSS.escape(el.name)+'"]':null;return selector?{selector,step,original:document.activeElement,start:el.selectionStart,end:el.selectionEnd,top:el.scrollTop}:null;};
 async function flush(){
  clearTimeout(timer);timer=null;if(!scope.alive()||composing||running||!waiting)return;
  const task=waiting;waiting=null;running=true;const focus=snapshot(),details=[...root.querySelectorAll('details')].map(d=>d.open);
  try{await apply(task);if(scope.alive())root.querySelectorAll('details').forEach((d,i)=>{if(details[i]!==undefined)d.open=details[i];});if(scope.alive()&&focus){const el=root.querySelector(focus.selector),active=document.activeElement;if(el&&(active===focus.original||active===document.body||active===el||active?.matches('.csl-select')&&active.previousElementSibling===el)){const button=focus.step>=0?el.parentElement.querySelectorAll('button')[focus.step]:null;(button&&!button.disabled?button:el).focus({preventScroll:true});if(focus.start!==null&&typeof focus.start==='number')try{el.setSelectionRange(focus.start,focus.end);}catch{}el.scrollTop=focus.top;}}
  }catch(e){if(scope.alive()&&task.revision===revision)error(e);}
  finally{running=false;if(waiting&&scope.alive())timer=setTimeout(flush,0);}
 }
 function changed(event){
  const el=event.target;if(!el.matches('input,select,textarea'))return;
  const target=accept(el);if(!target)return;
  revision++;clearTimeout(timer);waiting={el,target,revision};invalidate();
  if(composing||event.isComposing)return;
  timer=setTimeout(flush,el.tagName==='TEXTAREA'?450:el.type==='checkbox'||el.type==='range'||el.tagName==='SELECT'?0:200);
 }
 scope.on(root,'input',changed);scope.on(root,'change',changed);
 scope.on(root,'submit',()=>{clearTimeout(timer);waiting=null;});
 scope.on(root,'click',e=>{if(e.target.closest('[data-ex-reset],[data-sec-action=reset],[data-sec-action=undo],[data-net-action=reset],[data-net-action=undo],[data-ex-origin]')){revision++;waiting=null;clearTimeout(timer);}},{capture:true});
 scope.on(root,'compositionstart',()=>{composing=true;clearTimeout(timer);});
 scope.on(root,'compositionend',e=>{composing=false;changed(e);});
 scope.cleanup(()=>{revision++;waiting=null;clearTimeout(timer);});
 return {cancel(){revision++;waiting=null;clearTimeout(timer);},flush,get pending(){return !!waiting||running;},async settle(){while(scope.alive()&&(running||waiting)){if(running||composing)await new Promise(resolve=>setTimeout(resolve,16));else await flush();}}};
};
X.liveForm=(root,scope,selector='form')=>X.liveInput(root,scope,{
 accept:el=>el.closest(selector),
 apply:({el})=>{const form=el.isConnected?el.closest(selector):root.querySelector(selector);if(!form)return;if(!form.checkValidity())throw Error('入力を確認してください。表示は直前の有効な条件です。値が有効になると自動で反映します。');form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}
});
X.liveWorkspace=(root,scope,{attribute,fieldAttribute,action,state,apply,error,busy=()=>false})=>{
 const kind=root.closest('[data-ex-kind]')?.dataset.exKind,codes=X.liveActions[kind]||[];
 let cancellation=0;
 const matches=code=>codes.some(rule=>rule.endsWith('*')?code.startsWith(rule.slice(0,-1)):code===rule);
 const live=X.liveInput(root,scope,{
  accept:el=>codes.length&&el.hasAttribute(fieldAttribute)?codes:null,
  apply:async({el})=>{
   while(busy()&&scope.alive())await new Promise(resolve=>setTimeout(resolve,16));if(!scope.alive())return;
   const key=el.getAttribute(fieldAttribute);
   const activeCodes=[...new Set([...root.querySelectorAll('['+attribute+']')].map(b=>b.getAttribute(attribute)).filter(matches))];
   for(const code of activeCodes){
    const button=[...root.querySelectorAll('['+attribute+']')].find(b=>b.getAttribute(attribute)===code);if(!button||button.disabled)continue;
    const used=new Set(),fields={get:name=>{used.add(name);const node=root.querySelector('['+fieldAttribute+'="'+CSS.escape(name)+'"]');if(!node)throw Error('入力欄が見つかりません。');if(!node.checkValidity()||node.type==='number'&&node.value==='')throw Error('入力を確認してください。表示は直前の有効な条件です。値が有効になると自動で反映します。');return node.type==='checkbox'?node.checked:node.type==='number'?Number(node.value):node.value;}};
    let next;try{next=action(code,fields,state());}catch(e){if(used.has(key))throw e;continue;}
    if(used.has(key)&&next){await apply(next);if(kind==='test-author-desk')await apply({kind:'run'});}
   }
  },error
 });
 scope.on(root,'click',e=>{
  const button=e.target.closest('['+attribute+']');if(!button)return;const code=button.getAttribute(attribute);
  if(code==='reset'||code==='undo'){cancellation++;live.cancel();return;}
  if(!live.pending)return;
  // Commit the pending condition before selecting another object or taking a
  // deliberate simulation step. A manual apply button need not apply it twice.
  e.preventDefault();e.stopImmediatePropagation();
  const ticket=cancellation;void live.settle().then(()=>{if(!scope.alive()||ticket!==cancellation||matches(code))return;[...root.querySelectorAll('['+attribute+']')].find(b=>b.getAttribute(attribute)===code)?.click();});
 },{capture:true});
 return live;
};
})();
