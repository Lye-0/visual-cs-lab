/* Keep the native numeric value/validation contract, replace only its spinners. */
(() => {
'use strict';
if(typeof document==='undefined'||!document.querySelectorAll)return;
const entries=new WeakMap();let pending=false;
const attrNumber=(input,name)=>input.getAttribute(name)!==null&&input.getAttribute(name)!==''?Number(input.getAttribute(name)):NaN;
function label(input){return input.getAttribute('aria-label')||[...input.labels].map(el=>{const copy=el.cloneNode(true);copy.querySelectorAll('input,button,select,textarea').forEach(n=>n.remove());return copy.textContent.trim();}).filter(Boolean).join(' ')||input.name||'数値';}
function sync(input,entry){
 const value=input.valueAsNumber,min=attrNumber(input,'min'),max=attrNumber(input,'max'),locked=input.matches(':disabled')||input.readOnly;
 for(const [button,direction]of [[entry.down,-1],[entry.up,1]]){
  const off=locked||(Number.isFinite(value)&&(direction<0?Number.isFinite(min)&&value<=min:Number.isFinite(max)&&value>=max));
  if(button.disabled!==off)button.disabled=off;
  const name=label(input)+(direction<0?'を減らす':'を増やす');if(button.getAttribute('aria-label')!==name)button.setAttribute('aria-label',name);
  const step=input.step==='any'?'1':input.step||'1',title=step+'ずつ'+(direction<0?'減らす':'増やす');if(button.title!==title)button.title=title;
 }
 entry.root.hidden=input.hidden;
}
function step(input,direction,button,keyboard){
 if(input.matches(':disabled')||input.readOnly)return;
 const before=input.value,id=input.id,hash=location.hash,keepButton=keyboard&&document.activeElement===button;
 if(input.step==='any'){
  const value=Number.isFinite(input.valueAsNumber)?input.valueAsNumber:0,min=attrNumber(input,'min'),max=attrNumber(input,'max');
  input.value=String(Math.max(Number.isFinite(min)?min:-Infinity,Math.min(Number.isFinite(max)?max:Infinity,Number((value+direction).toPrecision(15)))));
 }else if(direction>0)input.stepUp();else input.stepDown();
 sync(input,entries.get(input));(keepButton&&!button.disabled?button:input).focus({preventScroll:true});
 if(input.value!==before){input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
 queueMicrotask(()=>{refresh();if(id&&!input.isConnected&&location.hash===hash)document.getElementById(id)?.focus({preventScroll:true});});
}
function enhance(input){
 let entry=entries.get(input);if(entry?.root.isConnected){sync(input,entry);return;}
 const root=document.createElement('span');root.className='csl-number';
 const button=(symbol,direction)=>{const b=document.createElement('button');b.type='button';b.className='csl-number-step';b.textContent=symbol;b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();step(input,direction,b,e.detail===0);});return b;};
 const down=button('−',-1),up=button('+',1);input.before(root);root.append(input,down,up);entries.set(input,{root,down,up});sync(input,entries.get(input));
}
function refresh(){
 pending=false;
 document.querySelectorAll('.csl-number').forEach(root=>{if(!root.querySelector('input[type=number]'))root.remove();});
 document.querySelectorAll('input[type=number]').forEach(enhance);
}
const schedule=()=>{if(!pending){pending=true;queueMicrotask(refresh);}};
function start(){
 refresh();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['min','max','step','value','disabled','readonly','type']});
 document.addEventListener('input',schedule);document.addEventListener('change',schedule);document.addEventListener('reset',()=>setTimeout(refresh,0));document.addEventListener('focusin',schedule);
}
CSL.numberUI={refresh};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
