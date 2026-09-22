// Normalize ONLY generated DOM identifiers and their actual references.
// Duplicated or broken references remain test failures; labels and values stay.
// Serialized by Playwright, so this browser function is self-contained.
export function normalizedDiagram(root){
 const doc=root.ownerDocument,copy=root.cloneNode(true),ids=new Map(),globalIds=new Map();
 const originals=[root,...root.querySelectorAll('*')],clones=[copy,...copy.querySelectorAll('*')];
 const generated=id=>/^(?:cv-demo-\d+(?:-input)?|vcl-svg-\d+-(?:arrowhead|dotgrid)|vcl-cv-arrow-\d+)$/.test(id);
 for(const el of doc.querySelectorAll('[id]'))globalIds.set(el.id,(globalIds.get(el.id)||0)+1);
 for(const el of originals){
  if(!generated(el.id))continue;
  if(globalIds.get(el.id)!==1||ids.has(el.id))throw Error('Duplicate generated diagram ID: '+el.id);
  ids.set(el.id,'cv-snapshot-id-'+(ids.size+1));
 }
 function reference(token,source,attribute){
  if(!generated(token))return token;
  const target=doc.getElementById(token);
  if(!ids.has(token)||!target||!root.contains(target))throw Error('Broken generated ID reference: '+token);
  if(attribute==='for'&&source.closest('.cv-demo')!==target.closest('.cv-demo'))throw Error('Label points to a different demo');
  return ids.get(token);
 }
 const aria=['for','aria-labelledby','aria-describedby','aria-controls','aria-owns','aria-activedescendant'];
 for(let i=0;i<originals.length;i++){
  const source=originals[i],target=clones[i];if(ids.has(source.id))target.id=ids.get(source.id);
  for(const attr of aria)if(source.hasAttribute(attr))target.setAttribute(attr,source.getAttribute(attr).trim().split(/\s+/).filter(Boolean).map(t=>reference(t,source,attr)).join(' '));
  for(const attr of ['marker-start','marker-mid','marker-end','fill','stroke','clip-path','filter','mask']){
   if(!source.hasAttribute(attr))continue;
   const value=source.getAttribute(attr),match=/^url\(#([^()]+)\)$/.exec(value);
   if(match&&generated(match[1]))target.setAttribute(attr,'url(#'+reference(match[1],source,attr)+')');
  }
  for(const attr of ['href','xlink:href']){const value=source.getAttribute(attr);if(value?.startsWith('#')&&generated(value.slice(1)))target.setAttribute(attr,'#'+reference(value.slice(1),source,attr));}
  if(source.tagName==='INPUT'){target.setAttribute('value',source.value);target.toggleAttribute('checked',source.checked);}
  else if(source.tagName==='TEXTAREA')target.textContent=source.value;
  else if(source.tagName==='OPTION')target.toggleAttribute('selected',source.selected);
 }
 return copy.innerHTML;
}
export async function captureDiagram(page,selector='#reader-diagram'){
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 return page.locator(selector).evaluate(normalizedDiagram);
}
