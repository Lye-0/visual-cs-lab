// Old-reader assertions opt into the actual public detail-view URL.
// This changes test navigation only, never application routing or the DOM.
import assert from 'node:assert/strict';
export function classicUrl(value){
 const url=new URL(value);
 if(!/^#\/lab\/[^/?]+/.test(url.hash))return url.href;
 const index=url.hash.indexOf('?'),route=index<0?url.hash:url.hash.slice(0,index),params=new URLSearchParams(index<0?'':url.hash.slice(index+1));
 if(!params.has('view'))params.set('view','classic');
 url.hash=route+'?'+params.toString();return url.href;
}
export async function readyAuthored(page,id){
 await page.waitForFunction(id=>{const c=globalThis.CSL?.app?.current;if(!c?.experience||c.lab.id!==id)return false;const chapter=CSL.experiences.find(id)?.chapters.find(ch=>ch.id===c.chapter);return chapter&&c.completed.size>=chapter.activities.length&&!document.querySelector('.experience [aria-busy="true"]');},id,{timeout:15000});
 assert.deepEqual(await page.evaluate(()=>CSL.app.current.errors),[]);
 assert.equal(await page.locator('.experience h1').count(),1);
 assert.equal(await page.locator('#reader-scrubber,[data-r-phase]').count(),0);
}
