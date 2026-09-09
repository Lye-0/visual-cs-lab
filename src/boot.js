/* User events. No recording, imports, local sessions or learning-history hooks. */
(() => {
'use strict';
const L=CSL,A=L.app;
function action(name,el){
 const c=A.current;
 switch(name){
  case 'skip-main': {const main=document.getElementById('main');main?.focus({preventScroll:true});main?.scrollIntoView({block:'start'});return;}
  case 'search':return A.openSearch();
  case 'home-query':{const input=document.getElementById('home-query');if(input){input.value=el.dataset.query||'';A.homeSearch(input.value);input.focus();}return;}
  case 'glossary':return A.showGlossary();
  case 'term':return A.showGlossary(el.dataset.term,el.dataset.lab);
  case 'close-modal':return A.closeModal();
  case 'menu':{const side=document.getElementById('sidebar'),open=!side.classList.contains('open');side.classList.toggle('open',open);document.getElementById('drawer-shade').classList.toggle('open',open);el.setAttribute('aria-expanded',String(open));return;}
  case 'play':return A.play();
  case 'first':return A.seek(0);
  case 'back':return A.step(-1);
  case 'next':return A.step(1);
  case 'last':return A.seek((c?.result?.frames.length||1)-1);
  case 'apply':return A.runCurrent();
  case 'reset':if(c){c.params=L.clone(c.lab.defaults);c.answer=null;c.graded=false;c.selected=null;c.connectFrom=null;c.example='initial';A.syncControls();return A.runCurrent();}return;
  case 'baseline':return A.baseline();
  case 'restore-baseline':if(c?.baseline){c.params=L.clone(c.baseline.params);A.syncControls();return A.runCurrent();}return;
  case 'delete-baseline':if(c){c.baseline=null;A.renderDetails();A.toast('今回の比較をクリアしました。');}return;
  case 'example':return A.example(el.dataset.example);
  case 'show-compare':A.stop();A.setTab('compare');return A.focusDetails();
  case 'model-tab':A.stop();A.setTab('model');return A.focusDetails();
  case 'conditions-focus':document.querySelector('.controls-panel')?.scrollIntoView({behavior:A.settings.reduceMotion?'instant':'smooth',block:'start'});return;
  case 'guide-focus':A.setMode('guided');document.getElementById('starter-guide')?.scrollIntoView({behavior:A.settings.reduceMotion?'instant':'smooth'});return;
  case 'grade':return A.grade();
  case 'guided':return A.setMode('guided');
  case 'git-command':if(c){c.params.script=(c.params.script||'').trimEnd()+'\n'+el.dataset.command;A.syncControls();return A.runCurrent({position:'last'});}return;
  case 'add-node':return A.addNode(el.dataset.kind);
  case 'remove-node':return A.removeNode();
  case 'connect-nodes':if(c){if(!c.selected)return A.toast('接続元の機器を先に選んでください。');c.connectFrom=c.selected;A.builderHint();}return;
 }
}
const guard=fn=>{try{const promise=fn();if(promise?.catch)promise.catch(error=>A.toast(error.message,true));}catch(error){A.toast(error.message,true);}};
let suppressNodeClick=false;
document.addEventListener('click',e=>{
 const target=e.target;if(!target?.closest)return;
 if(target.closest('#drawer-shade')){A.closeDrawer();return;}
 if(target.matches('[data-backdrop]')){A.closeModal();return;}
 const mode=target.closest('[data-mode]');if(mode){A.setMode(mode.dataset.mode);return;}
 const tab=target.closest('[data-tab]');if(tab){A.setTab(tab.dataset.tab);return;}
 const filter=target.closest('[data-filter]');if(filter){A.filter(filter.dataset.filter,filter.dataset.value);return;}
 const answer=target.closest('[data-answer]');if(answer&&A.current){A.current.answer=+answer.dataset.answer;A.current.graded=false;A.renderDetails();return;}
 const frame=target.closest('[data-frame]');if(frame){A.seek(Number(frame.dataset.frame));return;}
 const bit=target.closest('[data-bit]');if(bit&&A.current?.lab.id==='c01-bits'){
  const c=A.current,power=c.params.width-1-Number(bit.dataset.bit);A.parameter('value',Number(c.params.value)^(2**power),{immediate:true});return;
 }
 const node=target.closest('[data-node]');if(node){if(suppressNodeClick){suppressNodeClick=false;return;}guard(()=>A.nodeClick(node.dataset.node));return;}
 const edge=target.closest('[data-edge]');if(edge&&A.current?.lab.engine==='builder'){
  guard(()=>{const v=L.parseTopology(A.current.params.topology),ed=v.edges[+edge.dataset.edge];if(ed){ed.off=!ed.off;A.setTopology(v);}});return;
 }
 const cmd=target.closest('[data-action]');if(cmd){if(cmd.tagName==='A')e.preventDefault();guard(()=>action(cmd.dataset.action,cmd));return;}
 const link=target.closest('[data-close-modal]');if(link){const hash=link.hash;A.closeModal();if(hash===location.hash)A.navigate();}
});
function numericInput(el,commit=false){
 if(!A.current)return;
 if(el.value.trim()===''||!Number.isFinite(Number(el.value))){
  const c=A.current;A.stop();clearTimeout(A.parameterTimer);c.token++;c.pending=false;c.dirty=true;c.error=null;A.markPending();A.renderDetails();
  A.inputStatus('数値を入力し、Enterまたは入力欄の外を押して確定してください。');
  if(commit){el.value=A.current.params[el.dataset.number];A.runCurrent();A.toast('数値を入力できなかったため、直前の値に戻しました。',true);}
  return;
 }
 A.parameter(el.dataset.number,Number(el.value),{immediate:commit});
 if(commit)el.value=A.current.params[el.dataset.number];
}
function fieldInput(el){
 const ctrl=A.current?.lab.controls.find(c=>c.key===el.dataset.param);if(!ctrl)return;
 let value=ctrl.type==='toggle'?el.checked:ctrl.type==='range'?Number(el.value):el.value;
 if(ctrl.type==='select')value=ctrl.options.find(x=>String(x.value)===el.value)?.value??ctrl.value;
 A.parameter(el.dataset.param,value,{immediate:['toggle','select','range'].includes(ctrl.type),code:ctrl.type==='code'});
}
document.addEventListener('input',e=>{
 const el=e.target;
 if(el.id==='global-search'){A.updateSearch(el.value);return;}
 if(el.id==='home-query'){A.homeSearch(el.value);return;}
 if(el.id==='catalog-query'){A.catalogSearch(el.value);return;}
 if(el.id==='scrubber'){A.seek(Number(el.value));return;}
 if(el.dataset.compareStep){A.selectCompareStep(el.dataset.compareStep,el.value);return;}
 if(el.dataset.number){numericInput(el);return;}
 if(el.dataset.param)fieldInput(el);
});
document.addEventListener('change',e=>{
 const el=e.target;
 if(el.id==='scrubber'){A.seek(Number(el.value));return;}
 if(el.dataset.compareStep){A.selectCompareStep(el.dataset.compareStep,el.value);return;}
 if(el.dataset.number){numericInput(el,true);return;}
 if(el.dataset.param){fieldInput(el);return;}
 if(el.dataset.filterSelect){A.filter(el.dataset.filterSelect,el.value);return;}
 if(el.id==='play-speed')A.current?.player?.setSpeed(Number(el.value));
 if(el.id==='reduce-motion'){A.settings.reduceMotion=el.checked;document.body.classList.toggle('reduce-motion',el.checked);}
});
document.addEventListener('submit',e=>{
 if(e.target.id==='catalog-search'){e.preventDefault();A.catalogSearch(new FormData(e.target).get('q')||'');}
 if(e.target.id==='home-search-form'){
  e.preventDefault();const q=String(new FormData(e.target).get('q')||'').trim();location.hash='/catalog'+(q?'?q='+encodeURIComponent(q):'');
 }
});
document.addEventListener('keydown',e=>{
 const modal=document.querySelector('.modal');
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();A.openSearch();return;}
 if(e.key==='Escape'){A.closeModal();A.closeDrawer();if(A.current){A.current.connectFrom=null;A.builderHint();}return;}
 if(modal){
  if(e.key==='Tab'){
   const focusables=[...modal.querySelectorAll('a[href],button:not(:disabled),input,select,textarea,[tabindex="0"]')].filter(x=>!x.hidden&&x.offsetParent!==null);
   if(!focusables.length){e.preventDefault();return;}const first=focusables[0],last=focusables.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
  if(e.key==='Enter'&&e.target.id==='global-search'){const link=modal.querySelector('a.search-result');if(link){e.preventDefault();link.click();}}return;
 }
 if(e.target.dataset.number&&e.key==='Enter'){e.preventDefault();numericInput(e.target,true);return;}
 if(e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
 if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-node],[data-edge]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));return;}
 if(!A.current||e.target.closest('button,a'))return;
 if(e.key===' '){e.preventDefault();A.play();}
 if(e.key==='ArrowLeft'){e.preventDefault();A.step(-1);}
 if(e.key==='ArrowRight'){e.preventDefault();A.step(1);}
});
// Pointer events change only the teaching canvas, never a real network.
let drag=null;
document.addEventListener('pointerdown',e=>{
 // Ignore only the synthetic click belonging to the previous drag, not a new gesture.
 suppressNodeClick=false;
 if(e.target.id==='scrubber'){A.stop();return;}
 const node=e.target.closest?.('[data-node]');if(!node||A.current?.lab.engine!=='builder'||e.button!==0)return;
 guard(()=>{
  const svg=node.ownerSVGElement,top=L.parseTopology(A.current.params.topology),nd=top.nodes.find(n=>n.id===node.dataset.node);if(!nd)return;
  drag={current:A.current,id:nd.id,svg,node,top,startX:e.clientX,startY:e.clientY,moved:false,pointer:e.pointerId};node.setPointerCapture?.(e.pointerId);
 });
});
document.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.pointer||drag.current!==A.current)return;
 const bounds=drag.svg.getBoundingClientRect(),dx=(e.clientX-drag.startX)*760/bounds.width,dy=(e.clientY-drag.startY)*400/bounds.height;
 if(Math.abs(dx)+Math.abs(dy)<5&&!drag.moved)return;
 if(!drag.moved){const n=drag.top.nodes.find(n=>n.id===drag.id);drag.originalX=n.x;drag.originalY=n.y;}
 drag.moved=true;e.preventDefault();
 const nd=drag.top.nodes.find(n=>n.id===drag.id);nd.x=L.clamp(drag.originalX+dx,55,690);nd.y=L.clamp(drag.originalY+dy,55,325);
 drag.node.setAttribute('transform',`translate(${nd.x},${nd.y})`);
 drag.svg.querySelectorAll('[data-edge]').forEach(g=>{
  const ed=drag.top.edges[+g.dataset.edge],a=drag.top.nodes.find(n=>n.id===ed.a),b=drag.top.nodes.find(n=>n.id===ed.b);
  g.querySelectorAll('line').forEach(l=>{l.setAttribute('x1',a.x);l.setAttribute('y1',a.y);l.setAttribute('x2',b.x);l.setAttribute('y2',b.y);});
 });
});
document.addEventListener('pointerup',e=>{
 if(!drag||e.pointerId!==drag.pointer)return;const d=drag;drag=null;
 if(d.current!==A.current)return;
 if(d.moved){suppressNodeClick=true;A.current.selected=d.id;guard(()=>A.setTopology(d.top));setTimeout(()=>suppressNodeClick=false,150);}
});
document.addEventListener('pointercancel',()=>{if(drag){drag=null;A.renderFrame();}});
window.addEventListener('hashchange',()=>{drag=null;A.navigate();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)A.stop();});
window.addEventListener('pagehide',()=>A.stop());
function start(){A.shell();A.navigate();A.ready=true;}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
