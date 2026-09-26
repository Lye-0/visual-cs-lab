// Browser delivery is separate from the complete model order used by Node tests.
// Authoring sources remain the single source of truth; generated lesson payloads
// contain data, while model/widget files keep their original closures.
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {browserModules,modelModules,styles} from './modules.mjs';

export const shellModules=['core','generated/catalog','taxonomy','visuals','app','pages','curriculum-navigation','runtime-loader','boot'];
export const shellStyles=['style','reader-library','reader-responsive','library','scrollbars'];
export const lessonShell=['curriculum-kit','curriculum-tools','curriculum-runtime','player','workbench','reader','experiences-core','experiences-results','experiences-view','experiences-workspace','notes-visuals','curriculum-visuals','curriculum-rich-visuals','curriculum-demo-visuals'];

// Explicit dependency edges express shared state and widget hosts, never a
// compulsory teaching format. Expand these when a source gains a dependency.
export const dependencies={
 'extensions':['network','foundations','security','git','missions'],
 'missions':['network'],
 'notes-models':['foundations'],
 'lesson-enhancements':['network','notes-models'],
 'curriculum-tools':['curriculum-kit'],
 'curriculum-runtime':['curriculum-tools'],
 'experiences-coding-models':['experiences-core'],
 'experiences-os-state':['experiences-os-models'],
 'experiences-storage-models':['experiences-os-state'],
 'experiences-relations-models':['experiences-storage-models','curriculum-databases'],
 'experiences-network-state':['curriculum-runtime'],
 'experiences-network-transport':['experiences-network-state'],
 'experiences-network-services':['experiences-network-transport'],
 'experiences-security-models':['curriculum-security'],
 'experiences-security-auth':['experiences-security-models','curriculum-security-systems'],
 'experiences-ai-language-models':['experiences-ai-models'],
 'experiences-media-graphics':['experiences-media-signals'],
 'experiences-media-embedded':['experiences-media-graphics'],
 'experiences-math-correspondence':['experiences-math-evidence'],
 'experiences-ode-evidence':['experiences-math-evidence'],
 'experiences-git-review':['git'],
 'experiences-coding-widgets':['experiences-coding-models'],
 'experiences-os-widgets':['experiences-os-state'],
 'experiences-storage-widgets':['experiences-storage-models','experiences-os-widgets'],
 'experiences-relations-widgets':['experiences-relations-models','experiences-storage-widgets'],
 'experiences-network-widgets':['experiences-network-state','experiences-os-widgets'],
 'experiences-network-flow-widgets':['experiences-network-widgets','experiences-network-transport'],
 'experiences-network-application-widgets':['experiences-network-widgets','experiences-network-services'],
 'experiences-network-inspection-widgets':['experiences-network-application-widgets'],
 'experiences-security-widgets':['experiences-security-models','experiences-workspace'],
 'experiences-security-auth-widgets':['experiences-security-widgets','experiences-security-auth'],
 'experiences-ai-widgets':['experiences-ai-models','experiences-workspace'],
 'experiences-ai-decision-widgets':['experiences-ai-widgets'],
 'experiences-ai-language-widgets':['experiences-ai-widgets','experiences-ai-language-models'],
 'experiences-media-widgets':['experiences-media-signals','experiences-workspace'],
 'experiences-media-graphics-widgets':['experiences-media-widgets','experiences-media-graphics'],
 'experiences-media-embedded-widgets':['experiences-media-widgets','experiences-media-embedded'],
 'experiences-engineering-widgets':['experiences-engineering-models','experiences-workspace'],
 'experiences-engineering-dom':['curriculum-runtime','curriculum-demo-visuals'],
 'experiences-math-workbooks':['experiences-math-correspondence','experiences-ode-evidence','experiences-workspace'],
 'experiences-foundation-review-widgets':['experiences-foundation-review','experiences-workspace'],
 'experiences-multivariable-widgets':['experiences-multivariable-models','experiences-workspace'],
 'experiences-database-review-widgets':['experiences-database-review','experiences-workspace'],
 'experiences-git-review-widgets':['experiences-git-review','experiences-workspace'],
 'experiences-concurrency-review-widgets':['experiences-concurrency-review','experiences-workspace']
};
const root=new URL('../',import.meta.url);
const read=name=>readFile(new URL('src/'+name+'.js',root),'utf8');
const js=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
export async function generateDelivery(){
 const context=vm.createContext({console,TextEncoder,TextDecoder,URL,URLSearchParams,structuredClone,AbortController,crypto:webcrypto,setTimeout(){},clearTimeout(){},addEventListener(){},requestAnimationFrame(){},MutationObserver:class{observe(){}}});
 const engineOwners=new Map(),widgetOwners=new Map(),texts=new Map();
 context.document={addEventListener(){},getElementById(){return null;},readyState:'loading'};
 context.window={addEventListener(){},matchMedia(){return {matches:false};}};
 context.location={hash:''};
 let owner;
 for(const name of modelModules){
  owner=name;const text=await read(name);texts.set(name,text);
  const before=new Map(context.CSL?.experiences?.widgets||[]);
  vm.runInContext(text,context,{filename:name});
  for(const [kind,fn]of context.CSL.experiences?.widgets||[])if(before.get(kind)!==fn)widgetOwners.set(kind,name);
  if(name==='core'){
   const register=context.CSL.register;
   context.CSL.register=(id,fn)=>{const owners=engineOwners.get(id)||[];if(!owners.includes(owner))owners.push(owner);engineOwners.set(id,owners);register(id,fn);};
  }
 }
 const L=context.CSL;
 const fullLabs=JSON.parse(JSON.stringify(L.labs)),definitions=JSON.parse(JSON.stringify([...L.experiences.lessons]));
 const globals=Object.fromEntries(['version','areas','topics','courses','readingCourses','readingRelations','routes','sources','glossary','legacyLabIds'].map(k=>[k,JSON.parse(JSON.stringify(L[k]))]));
 globals.curriculum={baselineIds:L.curriculum.baselineIds};
 const fields=['id','title','unit','summary','question','keywords','track','area','course','topic','level','minutes','prereq','engine','variant','gapId','presentation'];
 globals.labs=fullLabs.map(l=>Object.fromEntries(fields.filter(k=>k in l).map(k=>[k,l[k]])));
 // During generation no actual document is mounted. Record widget ownership
 // by observing registrations, including registrations made in small loops.
 context.document={addEventListener(){},getElementById(){return null;},readyState:'loading'};
 context.window={addEventListener(){},matchMedia(){return {matches:false};}};
 context.location={hash:''};
 for(const name of browserModules.filter(n=>!modelModules.includes(n)&&n!=='boot')){
  const text=await read(name);texts.set(name,text);
  const before=new Map(L.experiences.widgets);
  vm.runInContext(text,context,{filename:name});
  for(const [kind,fn]of L.experiences.widgets)if(before.get(kind)!==fn)widgetOwners.set(kind,name);
 }
 const deps=structuredClone(dependencies);
 // Curriculum helper functions can be shared by more than one subject file.
 // References are conservative: a harmless extra prerequisite is preferable
 // to a model silently running with an absent helper.
 const helperOwners=new Map();
 for(const [name,text]of texts)if(name.startsWith('curriculum-')&&!name.includes('visual')&&name!=='curriculum-index'){
  for(const m of text.matchAll(/K\.([A-Za-z_$][\w$]*)\s*=(?!=)/g))helperOwners.set(m[1],name);
 }
 for(const name of modelModules.filter(n=>n.startsWith('curriculum-')&&!['curriculum-kit','curriculum-index'].includes(n))){
  const text=texts.get(name);const prerequisites=deps[name]||[];
  if(!['curriculum-tools','curriculum-runtime'].includes(name))prerequisites.push('curriculum-runtime');
  for(const [key,source]of helperOwners)if(source!==name&&new RegExp('\\bK\\.'+key+'\\b').test(text))prerequisites.push(source);
  deps[name]=[...new Set(prerequisites)];
 }
 const lessonMap=new Map(definitions),labMap=new Map(fullLabs.map(l=>[l.id,l]));
 const common=new Set(lessonShell),initial=new Set(shellModules);
 function expand(names){
  const done=new Set(),visiting=new Set(),result=[];
  function visit(name){
   if(done.has(name)||initial.has(name))return;
   if(visiting.has(name))throw Error('Cyclic delivery dependency: '+name);
   visiting.add(name);for(const dep of deps[name]||[])visit(dep);visiting.delete(name);done.add(name);result.push(name);
  }
  names.forEach(visit);return result;
 }
 const files=new Map(),manifest={version:1,common:lessonShell,styles:styles.filter(s=>!shellStyles.includes(s)),lessons:{}};
 for(const lab of fullLabs){
  const def=lessonMap.get(lab.id),refs=new Set([lab.id]);
  for(const ch of def.chapters)for(const a of ch.activities)if(a.model)refs.add(a.model);
  const names=[];
  for(const id of refs){const owners=engineOwners.get(labMap.get(id)?.engine);if(!owners?.length)throw Error('Missing engine source: '+id);names.push(...owners);}
  for(const ch of def.chapters)for(const a of ch.activities){const source=widgetOwners.get(a.kind);if(!source)throw Error('Missing widget source: '+a.kind);names.push(source);}
  const modules=expand(names).filter(n=>!common.has(n));
  const payload={labs:[...refs].map(id=>labMap.get(id)),definition:def};
  const path='src/generated/lessons/'+lab.id+'.js';
  files.set(path,'/* Generated by npm run build. Edit the authored source modules. */\nCSL.delivery.install('+js(payload)+');\n');
  manifest.lessons[lab.id]={file:'generated/lessons/'+lab.id,modules};
 }
 files.set('src/generated/catalog.js','/* Generated discovery metadata; no lesson bodies or model execution. */\nObject.assign(CSL,'+js(globals)+');\nCSL.deliveryManifest='+js(manifest)+';\n');
 const sourceAssets=new Set([...shellModules,...lessonShell,...Object.values(manifest.lessons).flatMap(v=>v.modules)].filter(n=>!n.startsWith('generated/')));
 return {files,manifest,sourceAssets:[...sourceAssets],units:fullLabs.length,chapters:definitions.reduce((n,[,d])=>n+d.chapters.length,0)};
}
