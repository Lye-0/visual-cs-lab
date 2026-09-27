/* Orbit only the actual cube projection. Other 2D teaching plots stay fixed. */
(() => {
'use strict';
if(typeof document==='undefined')return;
const L=CSL,X=L.experiences;
const limits={angle:[-180,180,1],pitch:[-75,75,1],distance:[3,10,.1]};
const quantize=(key,value)=>{const [min,max,step]=limits[key];return Number((min+Math.round((Math.max(min,Math.min(max,value))-min)/step)*step).toFixed(3));};
const relevant=svg=>svg?.matches?.('svg[data-orbit-projection]')&&L.app.current?.lab?.id==='c18-projection'&&!svg.closest('[inert]');
const host=svg=>svg.closest('.ex-activity-body')||svg.closest('#reader-diagram,#visualization');
const reader=root=>root?.id==='reader-diagram';
const experiment=root=>root?.id==='visualization';
const input=(root,key)=>reader(root)?document.getElementById('reader-input-'+key+'-number'):experiment(root)?document.getElementById('num-p-'+key):root.querySelector('form[data-ex-form] [name="'+key+'"]');
function read(root){const result={};for(const key of Object.keys(limits)){const el=input(root,key);if(!el)return null;result[key]=Number(el.value);}return result;}
function apply(root,values,focus){
 if(!root.isConnected||L.app.current?.lab?.id!=='c18-projection')return;
 if(reader(root)){
  for(const key of Object.keys(limits)){
   const el=input(root,key),next=String(quantize(key,values[key]));if(!el||el.value===next)continue;
   el.value=next;el.dispatchEvent(new Event('input',{bubbles:true}));
  }
  L.app.runCurrent();
 }else if(experiment(root)){
  for(const key of Object.keys(limits)){
   const value=quantize(key,values[key]);if(L.app.current.params[key]!==value)L.app.parameter(key,value);
  }
  L.app.runCurrent();
 }else{
  const form=root.querySelector('form[data-ex-form]');if(!form)return;
  for(const key of Object.keys(limits))input(root,key).value=String(quantize(key,values[key]));
  form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 }
 if(focus)setTimeout(()=>root.querySelector('svg[data-orbit-projection]')?.focus({preventScroll:true}),0);
}
let pending=null,frame=0,drag=null,wheelRoot=null,wheelRemainder=0,touchRoot=null,touchAnchor=null;
const touches=new Map();
function queue(root,changes,focus=false){
 const base=pending?.root===root?pending.values:read(root);if(!base)return;
 pending={root,values:{...base,...changes},focus:focus||pending?.root===root&&pending.focus};
 if(frame)return;
 frame=requestAnimationFrame(()=>{frame=0;const next=pending;pending=null;if(next)apply(next.root,next.values,next.focus);});
}
document.addEventListener('pointerdown',e=>{
 const svg=e.target.closest?.('svg[data-orbit-projection]');if(!relevant(svg))return;
 if(e.pointerType==='touch'){
  const root=host(svg);if(!root)return;
  if(touchRoot!==root){touches.clear();touchRoot=root;touchAnchor=null;}
  if(touches.size>=2)return;
  const values=pending?.root===root?pending.values:read(root);if(!values)return;
  e.preventDefault();touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  try{root.setPointerCapture(e.pointerId);}catch{}
  if(touches.size===1)touchAnchor={kind:'rotate',x:e.clientX,y:e.clientY,angle:values.angle,pitch:values.pitch};
  else{
   const [a,b]=[...touches.values()];touchAnchor={kind:'pinch',span:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),distance:values.distance};
  }
  return;
 }
 if(e.pointerType!=='mouse'||e.button!==1)return;
 const root=host(svg),values=read(root);if(!root||!values)return;
 e.preventDefault();drag={root,id:e.pointerId,x:e.clientX,y:e.clientY,angle:values.angle,pitch:values.pitch};
 root.setPointerCapture(e.pointerId);svg.focus({preventScroll:true});
},true);
document.addEventListener('pointermove',e=>{
 if(e.pointerType==='touch'&&touches.has(e.pointerId)){
  e.preventDefault();touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(touches.size===1&&touchAnchor?.kind==='rotate'){
   queue(touchRoot,{angle:touchAnchor.angle-(e.clientX-touchAnchor.x)*.6,pitch:touchAnchor.pitch-(e.clientY-touchAnchor.y)*.6});
  }else if(touches.size===2&&touchAnchor?.kind==='pinch'){
   const [a,b]=[...touches.values()],span=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
   queue(touchRoot,{distance:touchAnchor.distance*touchAnchor.span/span});
  }
  return;
 }
 if(!drag||e.pointerId!==drag.id)return;
 const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;
 drag.angle=Math.max(-180,Math.min(180,drag.angle-dx*.6));drag.pitch=Math.max(-75,Math.min(75,drag.pitch-dy*.6));
 queue(drag.root,{angle:drag.angle,pitch:drag.pitch});
},true);
function endDrag(e){
 if(touches.has(e.pointerId)){
  try{touchRoot.releasePointerCapture(e.pointerId);}catch{}
  touches.delete(e.pointerId);
  if(touches.size===1){const point=[...touches.values()][0],values=pending?.root===touchRoot?pending.values:read(touchRoot);touchAnchor=values?{kind:'rotate',x:point.x,y:point.y,angle:values.angle,pitch:values.pitch}:null;}
  else if(!touches.size){touchRoot=null;touchAnchor=null;}
  return;
 }
 if(!drag||e.pointerId!==drag.id)return;try{drag.root.releasePointerCapture(e.pointerId);}catch{}drag=null;
}
document.addEventListener('pointerup',endDrag,true);
document.addEventListener('pointercancel',endDrag,true);
document.addEventListener('mousedown',e=>{if(e.button===1&&relevant(e.target.closest?.('svg[data-orbit-projection]')))e.preventDefault();},true);
document.addEventListener('auxclick',e=>{if(e.button===1&&e.target.closest?.('svg[data-orbit-projection]'))e.preventDefault();},true);
document.addEventListener('click',e=>{
 if(!e.target.closest?.('[data-ex-reset],[data-r-action="reset"],[data-action="reset"]')||L.app.current?.lab?.id!=='c18-projection')return;
 if(frame)cancelAnimationFrame(frame);frame=0;pending=null;drag=null;touches.clear();touchRoot=null;touchAnchor=null;wheelRemainder=0;
},true);
document.addEventListener('wheel',e=>{
 const svg=e.target.closest?.('svg[data-orbit-projection]');if(!relevant(svg))return;
 e.preventDefault();const root=host(svg);if(root!==wheelRoot){wheelRoot=root;wheelRemainder=0;}
 wheelRemainder+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?240:1);
 const steps=Math.trunc(wheelRemainder/45);if(!steps)return;wheelRemainder-=steps*45;
 const values=pending?.root===root?pending.values:read(root);if(values)queue(root,{distance:values.distance+steps*.1});
},{passive:false,capture:true});
document.addEventListener('keydown',e=>{
 const svg=e.target;if(!relevant(svg)||e.altKey||e.ctrlKey||e.metaKey)return;
 const changes={ArrowLeft:['angle',5],ArrowRight:['angle',-5],ArrowUp:['pitch',5],ArrowDown:['pitch',-5],'+':['distance',-.2],'=':['distance',-.2],'-':['distance',.2]};
 const step=changes[e.key];if(!step)return;e.preventDefault();e.stopImmediatePropagation();
 const root=host(svg),values=pending?.root===root?pending.values:read(root);if(values)queue(root,{[step[0]]:values[step[0]]+step[1]},true);
},true);
X.registerWidget('projection-orbit',(root,activity,current)=>X.modelActivity(root,{...activity,kind:'inspect'},current));
})();
