import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {browserModules,styles} from '../scripts/modules.mjs';
const script=fileURLToPath(new URL('../scripts/server.mjs',import.meta.url));
const get=(port,path='/',method='GET')=>new Promise((resolve,reject)=>{
 const req=http.request({hostname:'127.0.0.1',port,path,method},res=>{let body='';res.setEncoding('utf8');res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));});
 req.on('error',reject);req.setTimeout(5000,()=>req.destroy(Error('HTTP timeout')));req.end();
});
test('読み取り専用ローカルHTTPサーバー',async t=>{
 const child=spawn(process.execPath,[script],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});const exited=once(child,'exit');
 try{
  const port=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('server startup timeout')),5000);child.stdout.on('data',chunk=>{text+=chunk;const m=text.match(/http:\/\/127\.0\.0\.1:(\d+)/);if(m){clearTimeout(timer);resolve(Number(m[1]));}});child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('exit',code=>{clearTimeout(timer);reject(Error('server exited '+code));});});
  await t.test('軽量HTMLが同じ公開元の分離JSとCSSを読み込む',async()=>{
   const r=await get(port);assert.equal(r.status,200);assert.match(r.headers['content-type'],/text\/html/);assert.match(r.body,/Visual CS Lab/);assert.match(r.body,/connect-src 'none'/);
   assert.match(r.body,/script-src 'self'/);assert.equal([...r.body.matchAll(/<script defer src=/g)].length,browserModules.length);assert.equal([...r.body.matchAll(/rel="stylesheet"/g)].length,styles.length);
   assert.doesNotMatch(r.body,/<style\b|<script>/);assert.equal(r.headers['x-content-type-options'],'nosniff');
  });
  await t.test('全公開アセットのMIMEとHEADが正しい',async()=>{
   for(const name of browserModules){const r=await get(port,`/src/${name}.js`);assert.equal(r.status,200,name);assert.match(r.headers['content-type'],/javascript/);}
   for(const name of styles){const r=await get(port,`/src/${name}.css`);assert.equal(r.status,200,name);assert.match(r.headers['content-type'],/text\/css/);}
   const icon=await get(port,'/assets/favicon.svg');assert.equal(icon.status,200);assert.match(icon.headers['content-type'],/image\/svg\+xml/);
   const head=await get(port,'/','HEAD');assert.equal(head.status,200);assert.equal(head.body,'');assert.ok(Number(head.headers['content-length'])>1000);assert.ok(Number(head.headers['content-length'])<16000);
  });
  await t.test('欠落ファイルはHTMLで偽装せず404にする',async()=>{
   for(const resource of ['/src/missing.js','/src/missing.css','/missing-file.txt','/%ZZ'])assert.equal((await get(port,resource)).status,404);
   assert.equal((await get(port)).status,200);
  });
  await t.test('配信ルートの外へ移動できない',async()=>{assert.equal((await get(port,'/..%2F..%2Fetc%2Fpasswd')).status,403);});
  await t.test('書き込みメソッドを拒否する',async()=>{for(const m of ['POST','PUT','DELETE'])assert.equal((await get(port,'/',m)).status,405);});
 }finally{child.kill();await exited;}
});
test('PORTの不正な指定は起動せずエラーにする',async()=>{const child=spawn(process.execPath,[script],{env:{...process.env,PORT:'invalid'},stdio:'ignore'});const [code]=await once(child,'exit');assert.equal(code,1);});
