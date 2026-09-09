import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import http from 'node:http';
import {fileURLToPath} from 'node:url';

const script=fileURLToPath(new URL('../scripts/server.mjs',import.meta.url));
const get=(port,path='/',method='GET')=>new Promise((resolve,reject)=>{
 const req=http.request({hostname:'127.0.0.1',port,path,method},res=>{
  let body='';res.setEncoding('utf8');res.on('data',chunk=>body+=chunk);
  res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));
 });
 req.on('error',reject);req.setTimeout(5000,()=>req.destroy(Error('HTTP timeout')));req.end();
});
test('読み取り専用ローカルHTTPサーバー',async t=>{
 const child=spawn(process.execPath,[script],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
 const exited=once(child,'exit');
 try{
  const port=await new Promise((resolve,reject)=>{
   let text='';const timer=setTimeout(()=>reject(Error('server startup timeout')),5000);
   child.stdout.on('data',chunk=>{text+=chunk;const m=text.match(/http:\/\/127\.0\.0\.1:(\d+)/);if(m){clearTimeout(timer);resolve(Number(m[1]));}});
   child.on('error',err=>{clearTimeout(timer);reject(err);});
   child.on('exit',code=>{clearTimeout(timer);reject(Error(`server exited ${code}`));});
  });
  await t.test('HTMLを配信し、外部スクリプトを必要としない',async()=>{
   const r=await get(port);
   assert.equal(r.status,200);assert.match(r.headers['content-type'],/text\/html/);
   assert.match(r.body,/Visual CS Lab/);assert.match(r.body,/connect-src 'none'/);
   assert.ok(!/<script[^>]+src=/i.test(r.body));
   assert.equal(r.headers['x-content-type-options'],'nosniff');
  });
  await t.test('ソースのMIMEタイプとHEADに対応する',async()=>{
   const r=await get(port,'/src/core.js');assert.equal(r.status,200);assert.match(r.headers['content-type'],/javascript/);
   const head=await get(port,'/','HEAD');assert.equal(head.status,200);assert.equal(head.body,'');
   assert.ok(Number(head.headers['content-length'])>100000);
  });
  await t.test('存在しないファイルと不正URLで終了しない',async()=>{
   assert.equal((await get(port,'/missing-file.txt')).status,404);
   assert.equal((await get(port,'/%ZZ')).status,404);
   assert.equal((await get(port)).status,200);
  });
  await t.test('配信ルートの外へ移動できない',async()=>{
   assert.equal((await get(port,'/..%2F..%2Fetc%2Fpasswd')).status,403);
  });
  await t.test('書き込みメソッドを拒否する',async()=>{
   for(const m of ['POST','PUT','DELETE'])assert.equal((await get(port,'/',m)).status,405);
  });
 }finally{
  child.kill();await exited;
 }
});
test('PORTの不正な指定は起動せずエラーにする',async()=>{
 const p=spawn(process.execPath,[script],{env:{...process.env,PORT:'invalid'},stdio:'ignore'});
 const [code]=await once(p,'exit');assert.equal(code,1);
});
