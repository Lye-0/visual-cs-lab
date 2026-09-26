/* Load the selected lesson, preserving navigation and temporary-state boundaries. */
(() => {
'use strict';
const L=CSL,A=L.app,M=L.deliveryManifest;
const base=new URL('./',document.currentScript.src),loaded=new Map(),data=new Set();
const discovery={views:{...A.views},labCard:A.labCard};
let queue=Promise.resolve(),common=null;
L.onDemand=true;
L.delivery={
 install(payload){
  for(const full of payload.labs){const lab=A.lab(full.id);if(!lab)throw Error('未知の教材です。');Object.assign(lab,full);}
  L.experiences.lessons.set(payload.definition.id,payload.definition);data.add(payload.definition.id);
 },
 ensure(id){
  if(!Object.hasOwn(M.lessons,id))return Promise.reject(Error('教材が見つかりません。'));
  const task=queue.then(async()=>{
   if(!common)common=loadCommon().catch(error=>{common=null;throw error;});
   await common;
   const lesson=M.lessons[id];
   for(const name of lesson.modules)await asset(name,'js');
   if(!data.has(id))await asset(lesson.file,'js');
   if(!data.has(id))throw Error('教材のデータを確認できませんでした。ページを再読み込みしてください。');
  });
  queue=task.catch(()=>{});return task;
 },
 loaded:()=>[...loaded.keys()]
};
function asset(name,type){
 const key=name+'.'+type;
 if(loaded.has(key))return loaded.get(key);
 const promise=new Promise((resolve,reject)=>{
  const node=document.createElement(type==='js'?'script':'link');
  if(type==='js'){node.src=new URL(key,base).href;node.async=false;}
  else{node.rel='stylesheet';node.href=new URL(key,base).href;}
  node.onload=()=>resolve();
  node.onerror=()=>{node.remove();loaded.delete(key);reject(Error('教材を読み込めませんでした。接続を確認して、もう一度お試しください。'));};
  document.head.append(node);
 });
 loaded.set(key,promise);return promise;
}
async function loadCommon(){
 await Promise.all(M.styles.map(name=>asset(name,'css')));
 for(const name of M.common){await asset(name,'js');if(name==='reader')restoreDiscovery();}
 restoreDiscovery();
}
function restoreDiscovery(){
 for(const [name,view]of Object.entries(discovery.views))if(name!=='lab')A.views[name]=view;
 A.labCard=discovery.labCard;
}
const navigate=A.navigate;
A.navigate=()=>{
 const hash=location.hash,raw=hash.slice(1)||'/',[path]=raw.split('?'),parts=path.split('/').filter(Boolean);
 if(parts[0]!=='lab'||!Object.hasOwn(M.lessons,parts[1])){document.getElementById('main')?.removeAttribute('aria-busy');return navigate();}
 // Dispose the old lesson immediately. Completion of an older load must never
 // replace a newer route, restart its model, or steal its keyboard focus.
 A.current?.player?.dispose();clearTimeout(A.parameterTimer);clearTimeout(A.searchTimer);
 const token=++A.viewToken;A.current=null;A.page='lab';A.closeDrawer();A.closeModal();
 const main=document.getElementById('main'),lab=A.lab(parts[1]);
 A.setTitle(lab.unit);A.setNav('',lab.unit);
 main.innerHTML='<section class="loading-lesson" role="status" aria-live="polite"><h1>'+L.h(lab.unit)+'</h1><p>教材を読み込んでいます…</p></section>';
 main.setAttribute('aria-busy','true');window.scrollTo({top:0,behavior:'instant'});
 L.delivery.ensure(parts[1]).then(()=>{
  if(token!==A.viewToken||location.hash!==hash)return;
  main.removeAttribute('aria-busy');
  try{navigate();A.decorateLesson?.(parts.slice(1));}catch(error){showError(error);}
 }).catch(error=>{
  if(token!==A.viewToken||location.hash!==hash)return;
  showError(error);
 });
 function showError(error){
  main.removeAttribute('aria-busy');
  main.innerHTML='<section role="alert"><h1>教材を読み込めませんでした</h1><p>'+L.h(error.message)+'</p><button type="button" class="btn primary" data-load-retry>もう一度読み込む</button> <a href="#/catalog">単元一覧へ戻る</a></section>';
  main.querySelector('[data-load-retry]').addEventListener('click',A.navigate,{once:true});
 }
};
})();
