"""Bounded authoring patch, separate from the permanent read-only tests.
Only the reviewed sources below may change. Does not commit or push itself.
"""
from pathlib import Path
import subprocess

expected={
 'src/experiences-security-widgets.js':'7bfa2536d91e5ed93c913546b78e0c3163f7fedc',
 'src/experiences-foundation-review-widgets.js':'bf405aea44497f4e5b0da9cb47460f654af7acd3',
 '.github/workflows/staged-main-verification.yml':'68e6e34269580c27659e1747c069c4331526ac7d',
}
for path,sha in expected.items():
 actual=subprocess.check_output(['git','hash-object',path],text=True).strip()
 if actual!=sha:raise RuntimeError('Reviewed input changed: '+path+' '+actual)

def replace(path,old,new):
 p=Path(path);text=p.read_text()
 if text.count(old)!=1:raise RuntimeError('Expected one exact match in '+path+': '+old)
 p.write_text(text.replace(old,new,1))

shared='src/experiences-security-widgets.js'
replace(shared,' function paint(preserve=true){',' function paint(preserve=true,preserveView=true){')
replace(shared,"  const retained=preserve?[...board.querySelectorAll('[data-sec-field]')].map(el=>({key:el.dataset.secField,value:el.value,checked:el.checked})):[];", """  // Multiple controls may select the same object (for example, an area and
  // its term in a sum). Keep the originating control, not the first match.
  const sameAction=identity===null?[]:[...root.querySelectorAll('[data-sec-action]')].filter(el=>el.dataset.secAction===identity);
  const focusOccurrence=sameAction.indexOf(focus);
  // Opt-in, local view state only. It never enters the learning model, history
  // storage, or another visit. Fresh numeric values need not close the view.
  const views=preserveView?[...board.querySelectorAll('[data-sec-view]')].map(el=>({key:el.dataset.secView,tag:el.tagName,open:el.tagName==='DETAILS'?el.open:null,left:el.scrollLeft,top:el.scrollTop})):[];
  const retained=preserve?[...board.querySelectorAll('[data-sec-field]')].map(el=>({key:el.dataset.secField,value:el.value,checked:el.checked})):[];""")
replace(shared,'  board.innerHTML=config.render(state,{field});',"""  board.innerHTML=config.render(state,{field});
  const restoredViews=views.map(old=>({old,el:[...board.querySelectorAll('[data-sec-view]')].find(el=>el.dataset.secView===old.key&&el.tagName===old.tag)})).filter(pair=>pair.el);
  // Open disclosures before restoring descendants' scroll offsets.
  for(const {old,el} of restoredViews)if(old.open!==null)el.open=old.open;
  for(const {old,el} of restoredViews){el.scrollLeft=old.left;el.scrollTop=old.top;}""")
replace(shared,"  const target=fieldId?[...root.querySelectorAll('[data-sec-field]')].find(el=>el.dataset.secField===fieldId):identity?[...root.querySelectorAll('[data-sec-action]')].find(el=>el.dataset.secAction===identity):null;", "  const target=fieldId?[...root.querySelectorAll('[data-sec-field]')].find(el=>el.dataset.secField===fieldId):identity?[...root.querySelectorAll('[data-sec-action]')].filter(el=>el.dataset.secAction===identity)[Math.max(0,focusOccurrence)]:null;")
replace(shared,"  if(code==='reset'){generation++;busy=false;history=[];state=config.start();paint(false);return;}","  if(code==='reset'){generation++;busy=false;history=[];state=config.start();paint(false,false);return;}")

widget='src/experiences-foundation-review-widgets.js'
replace(widget,'<div class="ex-fr-table-scroll" role="region"','<div class="ex-fr-table-scroll" data-sec-view="dp-table" role="region"')
replace(widget,'<details class="ex-fr-details"><summary>全品物','<details class="ex-fr-details" data-sec-view="dp-reconstruction"><summary>全品物')
replace(widget,'<details class="ex-fr-details"><summary>品物','<details class="ex-fr-details" data-sec-view="dp-items"><summary>品物')
replace(widget,"b(String(bit),'flip:'+i,`aria-label=\"通信路・位置${i+1}のbitを反転\"`)","`<button type=\"button\" class=\"ex-button\" data-sec-action=\"flip:${i}\" aria-label=\"通信路・位置${i+1}のbitを反転\"><small>位置${i+1}</small><strong>${bit}</strong></button>`")
replace(widget,'左側の計算端点 xᵢ','始点側の計算端点 xᵢ')

replace('.github/workflows/staged-main-verification.yml','tests/foundation-review-browser.mjs tests/authored-result-values-browser.mjs','tests/foundation-review-browser.mjs tests/workspace-view-state-browser.mjs tests/authored-result-values-browser.mjs')
Path('.github/workflows/repair-workspace-view-once.yml').unlink()
Path(__file__).unlink()
print('Prepared view-state, focus and two visible-label fixes; remote refs unchanged.')
