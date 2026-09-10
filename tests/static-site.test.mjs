import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {browserModules,styles} from '../scripts/modules.mjs';
import {renderIndex,publishedAssets,contentSecurityPolicy} from '../scripts/site-entry.mjs';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
const html=await read('index.html');
test('published entry is small and contains no embedded application script or stylesheet',()=>{
 assert.equal(html,renderIndex());assert.ok(Buffer.byteLength(html)<16000);
 assert.doesNotMatch(html,/<style\b/i);
 const tags=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
 assert.equal(tags.length,browserModules.length);
 assert.deepEqual(tags.map(m=>m[1].match(/src="([^"]+)"/)[1]),browserModules.map(n=>`./src/${n}.js`));
 for(const [,attrs,body]of tags){assert.match(attrs,/\bdefer\b/);assert.doesNotMatch(attrs,/\basync\b|\btype=/);assert.equal(body.trim(),'');}
 assert.deepEqual([...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m=>m[1]),styles.map(n=>`./src/${n}.css`));
});
test('relative assets stay inside both a domain root and a GitHub project subpath',async()=>{
 for(const base of ['https://example.test/','https://example.test/visual-cs-lab/'])for(const file of publishedAssets){
  const u=new URL('./'+file,base);assert.ok(u.href.startsWith(base));
  assert.ok((await stat(new URL(file,root))).isFile(),file);
 }
 assert.equal(new Set(publishedAssets).size,publishedAssets.length);
 assert.equal(await read('.nojekyll'),'');
 assert.doesNotMatch(html,/(?:src|href)="\/(?!\/)/);
});
test('CSP permits only same-origin scripts, without enabling inline scripts or eval',()=>{
 const directives=Object.fromEntries(contentSecurityPolicy.split(';').map(v=>v.trim().split(/\s+/)).map(([key,...value])=>[key,value]));
 assert.deepEqual(directives['script-src'],["'self'"]);
 assert.deepEqual(directives['script-src-attr'],["'none'"]);
 assert.deepEqual(directives['connect-src'],["'none'"]);
 assert.deepEqual(directives['form-action'],["'none'"]);
 assert.doesNotMatch(contentSecurityPolicy,/unsafe-eval|https?:/);
 // Inline presentation styles in the isolated lessons are still required.
 assert.ok(directives['style-src'].includes("'unsafe-inline'"));
});
test('entry generation is deterministic and --check cannot rewrite it',async()=>{
 const before=await read('index.html');execFileSync(process.execPath,['scripts/build.mjs','--check']);assert.equal(await read('index.html'),before);
});
test('prefixed CSS declarations precede the standard declarations in every source rule',async()=>{
 let checked=0;
 for(const name of styles){
  const css=(await read(`src/${name}.css`)).replace(/\/\*[\s\S]*?\*\//g,'');
  for(const match of css.matchAll(/\{([^{}]*)\}/g)){
   const declarations=match[1].split(';').map(text=>{const at=text.indexOf(':');return at<0?null:[text.slice(0,at).trim(),text.slice(at+1).trim()];}).filter(Boolean);
   for(const property of ['appearance','print-color-adjust','backdrop-filter','user-select']){
    const plain=declarations.map((d,i)=>d[0]===property?i:-1).filter(i=>i>=0);
    const prefixed=declarations.map((d,i)=>d[0]==='-webkit-'+property?i:-1).filter(i=>i>=0);
    if(!plain.length)continue;
    assert.ok(prefixed.length,`${name}: missing -webkit-${property}`);
    assert.ok(Math.max(...prefixed)<Math.max(...plain),`${name}: standard ${property} must be last`);
    assert.equal(declarations[Math.max(...prefixed)][1],declarations[Math.max(...plain)][1],`${name}: matching fallback value`);checked++;
   }
  }
 }
 assert.ok(checked>=6,'The test must encounter the real compatibility declarations');
});
test('blur has an opaque fallback and scrollbar styling remains nonessential',async()=>{
 const css=(await Promise.all(styles.map(n=>read(`src/${n}.css`)))).join('\n');
 assert.match(css,/@supports not \(\(-webkit-backdrop-filter:/);
 assert.match(css,/color-scheme:\s*dark/);
 assert.doesNotMatch(css,/scrollbar-width:\s*none/);
 // No compatibility warnings are hidden by disabling the diagnostics globally.
 assert.doesNotMatch(css,/hint-disable.*compat-api/);
});
