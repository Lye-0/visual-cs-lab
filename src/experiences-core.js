/* Authored learning experiences. Shared primitives are not a compulsory page
 * template: each unit chooses its own chapters, prose, objects and activities.
 * This registry is also imported by Node tests. It never accesses storage. */
(() => {
'use strict';
const L=CSL;
const X=L.experiences={version:1,lessons:new Map(),widgets:new Map(),models:{}};
const clone=x=>JSON.parse(JSON.stringify(x));
X.clone=clone;
X.chapter=(id,title,question,paragraphs,activities=[],after=[])=>({id,title,question,paragraphs:Array.isArray(paragraphs)?paragraphs:[paragraphs],activities,after:Array.isArray(after)?after:[after]});
X.activity=(kind,title,keys=[],patch={},options={})=>({kind,title,keys,patch,...options});
X.example=(label,patch,reason)=>({label,patch,reason});
X.define=(id,lead,chapters,options={})=>{
 const lab=L.labs.find(l=>l.id===id);
 if(!lab||X.lessons.has(id))throw Error('Unknown or repeated experience: '+id);
 if(!lead||!chapters.length)throw Error('A lesson needs its own purpose: '+id);
 const ids=new Set();
 for(const c of chapters){
  if(!/^[a-z0-9-]+$/.test(c.id)||ids.has(c.id)||!c.title||!c.question||!c.paragraphs.length)throw Error('Invalid chapter: '+id);
  ids.add(c.id);
  for(const a of c.activities){
   if(!a.kind||!a.title||!Array.isArray(a.keys))throw Error('Invalid activity: '+id);
   const target=L.labs.find(l=>l.id===(a.model||id));
   if(!target)throw Error('Unknown activity model: '+id);
   for(const key of a.keys)if(!target.controls.some(c=>c.key===(typeof key==='string'?key:key.key)))throw Error('Unknown field '+id+': '+JSON.stringify(key));
   for(const key of Object.keys(a.patch||{}))if(!(key in target.defaults))throw Error('Unknown preset '+id+': '+key);
   for(const p of a.examples||[])for(const key of Object.keys(p.patch))if(!(key in target.defaults))throw Error('Unknown example '+id+': '+key);
  }
 }
 const def={id,lead,chapters,...options};X.lessons.set(id,def);return def;
};
X.registerWidget=(name,mount)=>{if(X.widgets.has(name))throw Error('Repeated widget '+name);X.widgets.set(name,mount);};
X.find=id=>X.lessons.get(id);
X.modelParams=(id,patch={})=>{const l=L.labs.find(l=>l.id===id);return {...clone(l.defaults),...clone(patch)};};
X.format=(x,d=5)=>typeof x==='number'?(Number.isFinite(x)?String(Number(x.toFixed(d))):String(x)):String(x??'—');
X.modes=()=>[...new Set([...X.lessons.values()].flatMap(l=>l.chapters.flatMap(c=>c.activities.map(a=>a.kind))))];
X.inventory=()=>({units:X.lessons.size,chapters:[...X.lessons.values()].reduce((n,l)=>n+l.chapters.length,0),activities:[...X.lessons.values()].reduce((n,l)=>n+l.chapters.reduce((m,c)=>m+c.activities.length,0),0),kinds:X.modes(),ids:[...X.lessons.keys()]});
X.models.linear=(u,v,w)=>{
 const det=u[0]*v[1]-u[1]*v[0],epsilon=1e-9;
 const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
 const rank=Math.abs(det)>epsilon?2:Math.hypot(...u)>epsilon||Math.hypot(...v)>epsilon?1:0;
 const basis=Math.hypot(...u)>epsilon?u:v;
 const reachable=rank===2||rank===1&&Math.abs(cross(basis,w))<epsilon||rank===0&&Math.hypot(...w)<epsilon;
 const coefficients=rank===2?[(w[0]*v[1]-w[1]*v[0])/det,(u[0]*w[1]-u[1]*w[0])/det]:null;
 const dot=u[0]*v[0]+u[1]*v[1],uu=u[0]*u[0]+u[1]*u[1];
 const projection=uu>epsilon?u.map(x=>x*dot/uu):[0,0];
 return {det,rank,reachable,coefficients,projection,perpendicular:v.map((x,i)=>x-projection[i])};
};
X.models.rowOperation=(input,operation)=>{
 const a=input.map(r=>r.slice()),{kind,row,other=0,factor=1}=operation;
 if(!a.length||a.some(r=>r.length!==a[0].length||r.some(x=>!Number.isFinite(x))))throw Error('行列の形を確認してください。');
 if(!Number.isInteger(row)||row<0||row>=a.length||!Number.isInteger(other)||other<0||other>=a.length)throw Error('操作する行を選んでください。');
 if(!Number.isFinite(factor)||Math.abs(factor)>100)throw Error('倍率は−100〜100の有限な数にしてください。');
 if(kind==='swap')[a[row],a[other]]=[a[other],a[row]];
 else if(kind==='scale'){if(Math.abs(factor)<1e-12)throw Error('0倍すると元の式の情報を失います。0以外を指定してください。');a[row]=a[row].map(x=>x*factor);}
 else if(kind==='add'){if(row===other)throw Error('足す元には別の行を選んでください。');a[row]=a[row].map((x,j)=>x+factor*a[other][j]);}
 else throw Error('行の交換・定数倍・別の行の倍を足す、から選んでください。');
 if(a.some(r=>r.some(x=>!Number.isFinite(x)||Math.abs(x)>1e9)))throw Error('この小例で扱う数値の範囲を超えました。');
 return a.map(r=>r.map(x=>Math.abs(x)<1e-10?0:x));
};
X.models.odeStep=(y,k,h)=>{
 const f=v=>-k*v,k1=f(y),k2=f(y+h*k1/2),k3=f(y+h*k2/2),k4=f(y+h*k3);
 return {slope:k1,euler:y+h*k1,rk4:y+h*(k1+2*k2+2*k3+k4)/6,stages:[k1,k2,k3,k4]};
};
X.models.container=(state,action,value,kind='stack')=>{
 const s=clone(state),limit=16;
 if(action==='put'){if(s.items.length>=limit)throw Error('表示する要素は16個までです。取り出してから追加してください。');s.items.push(value);s.history.push({action:'追加',value,after:s.items.slice()});}
 else if(action==='take'){if(!s.items.length){s.history.push({action:'空なので取り出せない',value:null,after:[]});return s;}const v=kind==='queue'?s.items.shift():s.items.pop();s.output.push(v);s.history.push({action:'取り出し',value:v,after:s.items.slice()});}
 else throw Error('未定義の操作です。');
 return s;
};
X.models.race=(state,actor)=>{
 const s=clone(state),p=s.actors[actor];if(!p||p.pc>=3)return s;
 if(s.lock&&s.owner&&s.owner!==actor){s.history.push(actor+' はロックを待っています。値はまだ読んでいません。');return s;}
 if(p.pc===0){if(s.lock)s.owner=actor;p.local=s.shared;s.history.push(actor+' が共有値 '+s.shared+' を自分の作業用へ読みました。');}
 if(p.pc===1){p.local+=p.delta;s.history.push(actor+' の作業用は '+p.local+'。共有値はまだ '+s.shared+' です。');}
 if(p.pc===2){const old=s.shared;s.shared=p.local;s.history.push(actor+' が '+old+' を '+s.shared+' で置き換えました。'+(s.lock?'ロックを解放します。':''));if(s.lock)s.owner=null;}
 p.pc++;return s;
};
X.models.switchSend=(state,from,to)=>{
 const s=clone(state),ports={A:1,B:2,C:3};if(!ports[from]||!ports[to]||from===to)throw Error('別の送信元と宛先を選んでください。');
 s.table[from]=ports[from];const targets=s.table[to]?[s.table[to]]:[1,2,3].filter(p=>p!==ports[from]);
 s.history.push({from,to,learned:from,targets,known:!!s.table[to],table:{...s.table}});return s;
};
})();
