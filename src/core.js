/* Visual CS Lab — deterministic teaching models. No network requests. */
(() => {
'use strict';
const L = globalThis.CSL = { version:'2.0.0', engines:{}, labs:[], sources:{}, areas:[] };
const clone = x => JSON.parse(JSON.stringify(x));
const clamp = (n,a,b) => Math.max(a,Math.min(b,Number(n)));
const num = (n,d=0) => Number.isFinite(Number(n)) ? Number(n) : d;
const round = (n,p=2) => Math.round(n*10**p)/10**p;
function rng(seed=42) { let s=Number(seed)>>>0; return () => { s=(Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296; }; }
function frame(title,explain,visual={},stats={},table=null) { return {title,explain,visual,stats,table}; }
function result(frames,metrics={},conclusion='') { return {frames,metrics,conclusion:conclusion || frames.at(-1)?.explain || ''}; }
function steps(rows,labels=['入力','判定','出力']) { return rows.map((r,i)=>frame(r[0],r[1],{type:'flow',nodes:labels,active:Math.min(i,labels.length-1),detail:r[2]||''},r[3]||{})); }
function parseNumbers(s,limit=32) { const a=String(s).trim().split(/[\s,、]+/).filter(Boolean).map(Number); if(!a.length || a.length>limit || a.some(n=>!Number.isFinite(n)||Math.abs(n)>1e6)) throw new Error(`数値を1〜${limit}個、カンマで区切って入力してください（絶対値100万以下）。`); return a; }
function ipInt(ip) { const a=String(ip).trim().split('.'); if(a.length!==4||a.some(v=>!/^\d{1,3}$/.test(v)||+v>255)) throw new Error('IPv4アドレスは 192.168.1.10 のように、0〜255の数を4つ入力してください。'); return a.reduce((n,x)=>(n*256+Number(x))>>>0,0); }
const intIp = n => [24,16,8,0].map(s=>(n>>>s)&255).join('.');
const maskOf = p => p===0?0:(0xffffffff<<(32-p))>>>0;
const bits = (n,width=8) => (n>>>0).toString(2).padStart(width,'0').slice(-width);
function gcd(a,b){while(b){[a,b]=[b,a%b];}return a;}
function modPow(b,e,m){ let x=1n; b=BigInt(b);e=BigInt(e);m=BigInt(m);while(e>0n){if(e&1n)x=x*b%m;b=b*b%m;e>>=1n;}return Number(x); }
function invMod(a,m){ for(let i=1;i<m;i++)if((a*i)%m===1)return i; throw Error('この組み合わせには逆元がありません。'); }
function shortest(nodes,edges,start,end){const dist=Object.fromEntries(nodes.map(n=>[n,Infinity])),prev={},done=new Set(),tr=[];dist[start]=0;while(done.size<nodes.length){let u=nodes.filter(n=>!done.has(n)).sort((a,b)=>dist[a]-dist[b])[0];if(u===undefined||dist[u]===Infinity)break;done.add(u);for(const e of edges){if(e.off)continue;let v=e.a===u?e.b:e.b===u?e.a:null;if(v&&!done.has(v)&&dist[u]+e.cost<dist[v]){dist[v]=dist[u]+e.cost;prev[v]=u;}}tr.push({u,dist:{...dist},done:[...done]});}const path=[];if(Number.isFinite(dist[end])){let u=end;while(u!==undefined){path.unshift(u);u=prev[u];}}return {path,dist,trace:tr};}
const ctrl={
 range:(key,label,value,min,max,step=1,unit='',help='')=>({key,label,type:'range',value,min,max,step,unit,help}),
 select:(key,label,value,options,help='')=>({key,label,type:'select',value,options:options.map(x=>Array.isArray(x)?{value:x[0],label:x[1]}:{value:x,label:x}),help}),
 toggle:(key,label,value=false,help='')=>({key,label,type:'toggle',value,help}),
 text:(key,label,value,help='')=>({key,label,type:'text',value,help}),
 code:(key,label,value,help='')=>({key,label,type:'code',value,help})
};
function register(name,fn){L.engines[name]=fn;}
function add(def){const lab={level:1,minutes:8,track:'core',scope:'教材用の簡略モデル',limits:'表示対象に絞った教材です。実機のすべての挙動や性能を保証するものではありません。',prereq:[],sources:[],controls:[],...def};lab.defaults=Object.fromEntries(lab.controls.map(c=>[c.key,c.value]));lab.defaults={...lab.defaults,...def.defaults};L.labs.push(lab);return lab;}
function validateParams(lab,p){const out={...lab.defaults};for(const c of lab.controls){let v=p[c.key]??lab.defaults[c.key];if(c.type==='range'){v=clamp(num(v,c.value),c.min,c.max);v=clamp(Number((c.min+Math.round((v-c.min)/c.step)*c.step).toFixed(10)),c.min,c.max);}if(c.type==='toggle')v=v===true||v==='true';if(c.type==='select')v=c.options.find(o=>String(o.value)===String(v))?.value??c.value;if(['text','code'].includes(c.type))v=String(v).slice(0,c.type==='code'?8000:1200);out[c.key]=v;}return out;}
async function run(lab,p){const fn=L.engines[lab.engine];if(!fn)throw Error(`未登録の実験モデル: ${lab.engine}`);let r=await fn(validateParams(lab,p),lab);if(!r?.frames?.length)throw Error('実験に表示できる状態がありません。');return r;}
Object.assign(L,{clone,clamp,num,round,rng,frame,result,steps,parseNumbers,ipInt,intIp,maskOf,bits,gcd,modPow,invMod,shortest,ctrl,register,add,validateParams,run});
})();
