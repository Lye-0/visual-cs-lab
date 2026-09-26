/* Site-wide select UI. Native controls retain values, validation and form events;
 * only the custom combobox and listbox are exposed to people using the page. */
(() => {
'use strict';
if(typeof document==='undefined'||!document.querySelectorAll)return;
const controls=new WeakMap(),sources=new WeakMap(),invalidated=new WeakSet();let sequence=0,opened=null,pending=false;
const signature=select=>JSON.stringify([...select.options].map(o=>[o.value,o.label,o.selected,o.disabled,o.hidden,o.parentElement.disabled,o.parentElement.hidden]));
const set=(el,key,value)=>{if(value===null){if(el.hasAttribute(key))el.removeAttribute(key);}else if(el.getAttribute(key)!==String(value))el.setAttribute(key,String(value));};
const disabled=select=>select.matches(':disabled');
function sync(select,button){
 const text=[...select.selectedOptions].map(o=>o.label).join('、')||'選択してください';
 if(button.firstElementChild.textContent!==text)button.firstElementChild.textContent=text;
 const off=disabled(select);if(button.disabled!==off)button.disabled=off;
 set(button,'aria-describedby',select.getAttribute('aria-describedby'));
 set(button,'aria-invalid',select.getAttribute('aria-invalid')||(invalidated.has(select)&&!select.validity.valid?'true':null));
 set(button,'aria-required',select.required?'true':select.getAttribute('aria-required'));
 const explicit=select.getAttribute('aria-labelledby');
 if(explicit){set(button,'aria-labelledby',explicit);set(button,'aria-label',null);}
 else{
  const label=select.getAttribute('aria-label')||[...select.labels].map(l=>{const copy=l.cloneNode(true);copy.querySelectorAll('select,button,input,textarea').forEach(n=>n.remove());return copy.textContent.trim();}).filter(Boolean).join(' ')||select.title||select.name||'選択';
  set(button,'aria-label',label);
 }
 if(opened?.select===select&&(button.disabled||!select.isConnected||select.hidden))close();
}
function close(){
 if(!opened)return;
 const {button,popup}=opened;opened=null;
 set(button,'aria-expanded','false');set(button,'aria-activedescendant',null);set(button,'aria-controls',null);
 popup.remove();
}
function place(){
 if(!opened)return;
 const {button,popup}=opened,r=button.getBoundingClientRect(),vv=window.visualViewport;
 const left=vv?.offsetLeft||0,top=vv?.offsetTop||0,w=vv?.width||innerWidth,h=vv?.height||innerHeight;
 if(r.bottom<top||r.top>top+h||r.right<left||r.left>left+w){close();return;}
 const below=top+h-r.bottom-12,above=r.top-top-12,up=below<Math.min(popup.scrollHeight,260)&&above>below;
 popup.style.width=Math.min(Math.max(r.width,180),w-16)+'px';
 popup.style.maxHeight=Math.max(48,Math.min(320,up?above:below))+'px';
 popup.style.left=Math.max(left+8,Math.min(r.left,left+w-popup.getBoundingClientRect().width-8))+'px';
 popup.style.top=(up?Math.max(top+8,r.top-popup.getBoundingClientRect().height-6):r.bottom+6)+'px';
}
function highlight(index){
 if(!opened)return;const a=opened;
 a.index=index;
 for(const item of a.items)item.node.classList.toggle('is-active',item.index===index);
 const node=a.items.find(x=>x.index===index)?.node;
 set(a.button,'aria-activedescendant',node?.id||null);
 if(node){const start=node.offsetTop,end=start+node.offsetHeight;if(start<a.popup.scrollTop)a.popup.scrollTop=start;else if(end>a.popup.scrollTop+a.popup.clientHeight)a.popup.scrollTop=end-a.popup.clientHeight;}
}
function commit(index){
 if(!opened)return;const {select,button,items}=opened;
 if(!items.some(x=>x.index===index&&!x.disabled))return;
 const changed=select.selectedIndex!==index,id=select.id,hash=location.hash;
 close();select.selectedIndex=index;sync(select,button);button.focus({preventScroll:true});
 if(changed){select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));}
 // Some workspaces replace their fields after a change. Follow the same field,
 // never a different route, and do not strand keyboard focus on the document.
 queueMicrotask(()=>{refresh();if(location.hash===hash&&!button.isConnected&&id){const replacement=document.getElementById(id);controls.get(replacement)?.focus({preventScroll:true});}});
}
function open(select,button){
 close();sync(select,button);if(button.disabled||select.hidden)return;button.focus({preventScroll:true});
 const popup=document.createElement('div');popup.className='csl-select-menu';popup.id='csl-options-'+(++sequence);popup.setAttribute('role','listbox');popup.setAttribute('aria-label',button.getAttribute('aria-label')||'選択肢');
 popup.setAttribute('popover','manual');
 const items=[];let group=null;
 [...select.options].forEach((option,index)=>{
  if(option.hidden||option.parentElement.hidden)return;
  const parent=option.parentElement,groupName=parent.tagName==='OPTGROUP'?parent.label:null;
  if(groupName&&group!==parent){const heading=document.createElement('div');heading.className='csl-select-group';heading.textContent=groupName;popup.append(heading);group=parent;}
  const node=document.createElement('div'),off=option.disabled||parent.tagName==='OPTGROUP'&&parent.disabled;
  node.className='csl-select-option';node.id=popup.id+'-'+index;node.setAttribute('role','option');node.setAttribute('aria-selected',String(option.selected));node.setAttribute('aria-disabled',String(off));
  const label=document.createElement('span');label.textContent=option.label||'選択してください';const mark=document.createElement('span');mark.className='csl-select-check';mark.textContent=option.selected?'✓':'';mark.setAttribute('aria-hidden','true');node.append(label,mark);
  node.addEventListener('pointermove',()=>{if(!off)highlight(index);});
  node.addEventListener('pointerdown',e=>e.preventDefault());
  node.addEventListener('click',e=>{e.stopPropagation();if(!off)commit(index);});
  popup.append(node);items.push({node,index,disabled:off});
 });
 opened={select,button,popup,items,index:select.selectedIndex,buffer:'',typed:0,signature:signature(select)};
 document.body.append(popup);popup.showPopover?.();
 set(button,'aria-controls',popup.id);set(button,'aria-expanded','true');place();
 highlight(items.some(x=>x.index===select.selectedIndex&&!x.disabled)?select.selectedIndex:items.find(x=>!x.disabled)?.index??-1);
}
function keydown(e,select,button){
 if(e.ctrlKey||e.metaKey||e.isComposing)return;
 if(e.key==='Tab'){if(opened?.button===button)close();return;}
 if(e.key==='Escape'){if(opened?.button===button){e.preventDefault();e.stopPropagation();close();}return;}
 const move=['ArrowDown','ArrowUp','Home','End'].includes(e.key),accept=['Enter',' '].includes(e.key),letter=e.key.length===1&&!e.altKey;
 if(!move&&!accept&&!letter)return;
 e.preventDefault();e.stopPropagation();
 const wasOpen=opened?.button===button;if(!wasOpen)open(select,button);if(!opened)return;
 if(accept){if(wasOpen)commit(opened.index);return;}
 const choices=opened.items.filter(x=>!x.disabled);if(!choices.length)return;
 if(move){let i=choices.findIndex(x=>x.index===opened.index);if(e.key==='Home')i=0;else if(e.key==='End')i=choices.length-1;else if(wasOpen)i=Math.max(0,Math.min(choices.length-1,i+(e.key==='ArrowDown'?1:-1)));highlight(choices[Math.max(0,i)].index);return;}
 const now=Date.now();opened.buffer=now-opened.typed>700?e.key:opened.buffer+e.key;opened.typed=now;
 const repeated=[...opened.buffer].every(c=>c===e.key),query=(repeated?e.key:opened.buffer).toLocaleLowerCase();
 const at=choices.findIndex(x=>x.index===opened.index),order=repeated?[...choices.slice(at+1),...choices.slice(0,at+1)]:choices;
 const match=order.find(x=>select.options[x.index].label.toLocaleLowerCase().startsWith(query));if(match)highlight(match.index);
}
function enhance(select){
 let button=controls.get(select);
 if(button?.isConnected){sync(select,button);return;}
 button=document.createElement('button');button.type='button';button.className='csl-select';button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
 const value=document.createElement('span');value.className='csl-select-value';const arrow=document.createElement('span');arrow.className='csl-select-arrow';arrow.setAttribute('aria-hidden','true');button.append(value,arrow);
 select.classList.add('csl-select-native');select.tabIndex=-1;set(select,'aria-hidden','true');select.after(button);controls.set(select,button);sources.set(button,select);sync(select,button);
 button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(opened?.button===button)close();else open(select,button);});
 button.addEventListener('keydown',e=>keydown(e,select,button));button.addEventListener('focus',()=>sync(select,button));
 select.addEventListener('focus',()=>button.focus({preventScroll:true}));select.addEventListener('click',e=>{e.preventDefault();button.focus();open(select,button);});
 select.addEventListener('invalid',e=>{e.preventDefault();invalidated.add(select);button.focus();open(select,button);});
}
function refresh(){
 pending=false;
 if(opened&&(!opened.select.isConnected||opened.signature!==signature(opened.select)))close();
 document.querySelectorAll('.csl-select').forEach(button=>{if(!sources.get(button)?.isConnected)button.remove();});
 document.querySelectorAll('select').forEach(enhance);
}
const schedule=()=>{if(!pending){pending=true;queueMicrotask(refresh);}};
function start(){
 refresh();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','selected','label','value','hidden','aria-label','aria-labelledby','aria-describedby','required']});
 document.addEventListener('input',schedule);document.addEventListener('change',schedule);document.addEventListener('reset',()=>setTimeout(refresh,0));
 document.addEventListener('pointerdown',e=>{if(opened&&!opened.button.contains(e.target)&&!opened.popup.contains(e.target))close();},true);
 document.addEventListener('focusin',e=>{if(opened&&e.target!==opened.button&&!opened.popup.contains(e.target))close();});
 window.addEventListener('hashchange',close);window.addEventListener('resize',place);window.addEventListener('scroll',e=>{if(opened&&!opened.popup.contains(e.target))place();},true);
 window.visualViewport?.addEventListener('resize',place);window.visualViewport?.addEventListener('scroll',place);
}
CSL.selectUI={refresh,close};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
