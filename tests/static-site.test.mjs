import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {browserModules,styles} from '../scripts/modules.mjs';
import {renderIndex,publishedAssets,contentSecurityPolicy,indexMatches} from '../scripts/site-entry.mjs';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
const html=await read('index.html');
test('published entry is small and contains no embedded application script or stylesheet',()=>{
 assert.ok(indexMatches(html,renderIndex()));assert.ok(Buffer.byteLength(html)<16000);
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
 assert.ok(directives['style-src'].includes("'unsafe-inline'"));
});
test('entry generation is deterministic and --check cannot rewrite it',async()=>{
 const before=await read('index.html');execFileSync(process.execPath,['scripts/build.mjs','--check']);assert.equal(await read('index.html'),before);
});
test('entry comparison accepts Windows line endings but not changed assets or text',()=>{
 const expected=renderIndex(),windows=expected.replace(/\n/g,'\r\n');
 assert.ok(indexMatches(windows,expected));assert.ok(indexMatches(expected,windows));
 assert.equal(indexMatches(windows.replace('./src/core.js','./src/missing.js'),expected),false);
 assert.equal(indexMatches(windows.replace('Visual CS Lab','Changed title'),expected),false);
 assert.equal(indexMatches(windows.replace('defer src','async src'),expected),false);
});
test('CLI checks a CRLF checkout without rewriting it and rejects stale markup',async()=>{
 const temp=await mkdtemp(path.join(tmpdir(),'visual-cs-entry-'));
 try{
  await mkdir(path.join(temp,'scripts'),{recursive:true});
  for(const name of ['build.mjs','site-entry.mjs','modules.mjs'])await writeFile(path.join(temp,'scripts',name),await read('scripts/'+name));
  // The entry builder reads assets for existence; their contents are not bundled.
  for(const asset of publishedAssets){const file=path.join(temp,asset);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,'');}
  const file=path.join(temp,'index.html'),windows=renderIndex().replace(/\n/g,'\r\n');
  await writeFile(file,windows);
  const invoke=()=>execFileSync(process.execPath,[path.join(temp,'scripts/build.mjs'),'--check'],{cwd:temp,stdio:'pipe'});
  invoke();assert.equal(await readFile(file,'utf8'),windows);
  const stale=windows.replace('./src/core.js','./src/missing.js');await writeFile(file,stale);
  assert.throws(invoke,/index.html is out of date/);assert.equal(await readFile(file,'utf8'),stale);
 }finally{await rm(temp,{recursive:true,force:true});}
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
 assert.doesNotMatch(css,/hint-disable.*compat-api/);
});
