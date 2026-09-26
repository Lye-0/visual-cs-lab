// Enumerate expected content from authoring sources, not from the browser's
// loaded subset. Browser tests must exercise lazy routes without preloading.
import {modelModules} from '../scripts/modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
const L=globalThis.CSL;
export const fixtureLabs=JSON.parse(JSON.stringify(L.labs));
export const fixtureInventory=L.experiences.inventory();
export const fixtureUnits=fixtureLabs.map(l=>{const d=L.experiences.find(l.id);return {id:l.id,title:l.unit,lead:d.lead,chapters:JSON.parse(JSON.stringify(d.chapters)),scope:l.scope||l.limits||null};});
export const fixtureDefinitions=ids=>ids.map(id=>{const u=fixtureUnits.find(u=>u.id===id);return {id,chapters:u.chapters.map(c=>({id:c.id,kinds:c.activities.map(a=>a.kind),count:c.activities.length}))};});
