import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Local, read-only static server. It never changes the host network settings.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=process.env.PORT===undefined?4173:Number(process.env.PORT);
if(!Number.isInteger(port)||port<0||port>65535){
 console.error('PORTには0〜65535の整数を指定してください。');
 process.exit(1);
}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Cache-Control','no-store');
 if(!['GET','HEAD'].includes(req.method)){
  res.writeHead(405,{'Allow':'GET, HEAD'});res.end('Method not allowed');return;
 }
 try{
  const url=new URL(req.url,'http://localhost');
  let name=decodeURIComponent(url.pathname);
  if(name==='/')name='/index.html';
  const file=path.resolve(root,'.'+name);
  if(file!==root&&!file.startsWith(root+path.sep)){
   res.writeHead(403);res.end('Forbidden');return;
  }
  if(!(await stat(file)).isFile())throw Error('not file');
  const data=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':data.length});
  res.end(req.method==='HEAD'?undefined:data);
 }catch{
  res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');
 }
});
server.listen(port,'127.0.0.1',()=>console.log(`Visual CS Lab → http://127.0.0.1:${server.address().port}\nPress Ctrl+C to stop.`));
server.on('error',err=>{console.error(err.message);process.exitCode=1;});
