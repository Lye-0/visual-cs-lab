// Normalize ONLY generated DOM identifiers, not arbitrary text or structure.
// Serialized by Playwright, so keep this browser function self-contained.
export function normalizedDiagram(root){
 const doc=root.ownerDocument,copy=root.cloneNode(true);
 const originals=[root,...root.querySelectorAll('*')],clones=[copy,...copy.querySelectorAll('*')];
 const ids=new Map(),globalIds=new Map();
 for(const el of doc.querySelectorAll('[id]'))globalIds.set(el.id,(globalIds.get(el.id)||0)+1);
 for(const el of originals){
  if(!/^cv-demo-\d+(?:-input)?$/.test(el.id))continue;
  if(globalIds.get(el.id)!==1||ids.has(el.id))throw Error('Duplicate generated diagram ID: '+el.id);
  ids.set(el.id,'cv-snapshot-id-'+(ids.size+1));
 }
 const references=['for','aria-labelledby','aria-describedby','aria-controls','aria-owns','aria-activedescendant'];
 for(let i=0;i<originals.length;i++){
  const source=originals[i],target=clones[i];
  if(ids.has(source.id))target.id=ids.get(source.id);
  for(const attr of references){
   if(!source.hasAttribute(attr))continue;
   const tokens=source.getAttribute(attr).trim().split(/\s+/).filter(Boolean);
   for(const token of tokens)if(/^cv-demo-\d+(?:-input)?$/.test(token)){
    const referenced=doc.getElementById(token);
    if(!ids.has(token)||!referenced||!root.contains(referenced))throw Error('Broken generated ID reference: '+token);
    if(attr==='for'&&source.closest('.cv-demo')!==referenced.closest('.cv-demo'))throw Error('Label points to a different demo');
   }
   target.setAttribute(attr,tokens.map(token=>ids.get(token)||token).join(' '));
  }
  // innerHTML does not capture current form-control property values.
  if(source.tagName==='INPUT'){
   target.setAttribute('value',source.value);
   target.toggleAttribute('checked',source.checked);
  }else if(source.tagName==='TEXTAREA')target.textContent=source.value;
  else if(source.tagName==='OPTION')target.toggleAttribute('selected',source.selected);
 }
 return copy.innerHTML;
}
export async function captureDiagram(page,selector='#reader-diagram'){
 // DOM measurement demos render their measured table on the next animation frame.
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 return page.locator(selector).evaluate(normalizedDiagram);
}
