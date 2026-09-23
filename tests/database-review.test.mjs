import test from 'node:test';
import assert from 'node:assert/strict';
import {modelModules} from '../scripts/modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
const X=CSL.experiences,D=X.databaseReview,copy=structuredClone;
function finishIndex(s){let count=0;while(s.phase!=='done'){s=D.index(s,{kind:'next'});assert.ok(++count<20);}return s;}
const tx=(s,...actors)=>actors.reduce((s,actor)=>D.tx(s,{kind:'step',actor}),s);
test('index and scan find the same independently filtered rows for every age threshold',()=>{
 for(let age=0;age<=99;age++)for(const method of ['index','scan']){const s=finishIndex(D.indexStart(age,method));assert.deepEqual(D.indexView(s).result,D.people().filter(p=>p.age>=age));}
});
test('index does not display undiscovered rows or count seek probes as table reads',()=>{
 let s=D.indexStart();assert.deepEqual(D.indexView(s).result,[]);while(s.phase==='seek'){s=D.index(s,{kind:'next'});assert.equal(D.indexView(s).costs.tableRows,0);}
 assert.equal(s.cursor,3);assert.equal(s.probes.length,3);assert.deepEqual(s.found,[]);s=D.index(s,{kind:'next'});assert.equal(D.indexView(s).result[0].name,'Rin');assert.equal(D.indexView(s).costs.tableRows,1);
});
test('each index entry points to the original row, not the position in the sorted array',()=>{
 const s=D.indexStart(),v=D.indexView(s);assert.deepEqual(v.entries.map(e=>e.source),[4,0,2,5,1,3]);
 for(let i=0;i<6;i++){const n=D.index(s,{kind:'entry',index:i});assert.equal(n.selected,v.entries[i].source);assert.equal(D.indexView(n).indexPosition,i);assert.equal(v.people[n.selected].id,v.entries[i].id);}
});
test('search logs preserve the lower-bound invariant at every probe',()=>{
 for(const age of [0,19,21,24,99]){const s=finishIndex(D.indexStart(age)),entries=D.indexView(s).entries;
 for(const p of s.probes){const [lo,hi]=p.after;assert.ok(entries.slice(0,lo).every(e=>e.age<age));assert.ok(entries.slice(hi).every(e=>e.age>=age));assert.ok(p.position>=p.before[0]&&p.position<p.before[1]);}}
});
test('index reset changes query or method deliberately and invalid input is atomic',()=>{
 const s=finishIndex(D.indexStart()),old=copy(s);assert.throws(()=>D.index(s,{kind:'query',age:NaN}));assert.throws(()=>D.index(s,{kind:'source',index:6}));assert.deepEqual(s,old);
 const n=D.index(s,{kind:'method',value:'scan'});assert.equal(n.age,21);assert.deepEqual(n.found,[]);assert.equal(n.phase,'scan');assert.throws(()=>D.index(s,{kind:'next'}));
});
test('JOIN preserves one-to-many multiplicity and unmatched LEFT rows',()=>{
 const s=D.joinStart(),left=D.joinView(s),inner=D.joinView(D.join(s,{kind:'method',value:'INNER'}));
 assert.equal(left.rows.length,7);assert.equal(inner.rows.length,4);assert.deepEqual(left.rows.filter(r=>r.id===1).map(r=>r.title),['TCP','DNS']);assert.equal(left.rows.find(r=>r.id===2).origin,'unmatched-padding');
});
test('stored NULL, unmatched padding, literal NULL and an empty string are distinct',()=>{
 let s=D.joinStart('nulls'),v=D.joinView(s);assert.equal(v.rows.length,8);assert.equal(v.rows.find(r=>r.id===2).origin,'stored-null');assert.equal(v.rows.find(r=>r.id===4).title,'NULL');assert.equal(v.rows.find(r=>r.id===4).origin,'stored-value');assert.equal(v.rows.find(r=>r.id===6).origin,'unmatched-padding');
 s=D.join(s,{kind:'right',index:5});s=D.join(s,{kind:'edit',uid:'4',title:'',titleNull:false});v=D.joinView(s);assert.equal(v.rows.find(r=>r.id===4).title,'');assert.equal(v.rows.find(r=>r.id===4).origin,'stored-value');
});
test('NULL join keys never compare equal, including two stored NULL keys',()=>{
 const s=D.joinStart('nulls'),v=D.joinView(s);const missing=v.rows.filter(r=>r.id===null);assert.equal(missing.length,1);assert.equal(missing[0].ri,null);assert.equal(missing[0].origin,'unmatched-padding');
 assert.equal(D.joinView(D.join(s,{kind:'method',value:'INNER'})).rows.some(r=>r.id===null),false);
});
test('selecting an output restores the exact source pair',()=>{
 const s=D.joinStart(),rows=D.joinView(s).rows;rows.forEach((r,index)=>{const n=D.join(s,{kind:'output',index});assert.equal(n.leftIndex,r.li);if(r.ri!==null)assert.equal(n.rightIndex,r.ri);assert.equal(n.outputIndex,index);});
});
test('right-key editing recomputes correspondence but selecting left does not change tables',()=>{
 let s=D.joinStart();const old=copy(s);s=D.join(s,{kind:'left',index:0});assert.deepEqual(s.left,old.left);assert.deepEqual(s.right,old.right);
 s=D.join(s,{kind:'edit',uid:'2',title:'TCP',titleNull:false});assert.deepEqual(D.joinView(s).matches,[1]);assert.equal(D.joinView(s).rows.find(r=>r.id===2).title,'TCP');
});
test('JOIN invalid keys, indices and text are rejected without partial modification',()=>{
 const s=D.joinStart(),old=copy(s);for(const uid of ['1e1','-1','100','1.5','NULL'])assert.throws(()=>D.join(s,{kind:'edit',uid,title:'ok',titleNull:false}));
 assert.throws(()=>D.join(s,{kind:'edit',uid:'2',title:'x'.repeat(41),titleNull:false}));assert.throws(()=>D.join(s,{kind:'left',index:-1}));assert.deepEqual(s,old);
});
test('transaction initial and historical snapshots contain no future reads',()=>{
 const s=D.txStart(),next=tx(s,'A');assert.equal(s.actors.A.read,null);assert.equal(next.actors.A.read,100);assert.equal(next.actors.B.read,null);assert.equal(next.events[0].snapshot.actors.A.read,null);assert.equal(next.events[1].snapshot.actors.B.read,null);
});
test('calculation and UPDATE do not expose uncommitted values as committed balance',()=>{
 const s=tx(D.txStart(),'A','A','A');assert.equal(s.actors.A.local,120);assert.equal(s.actors.A.pending,120);assert.equal(s.committed,100);assert.equal(s.owner,'A');
 const b=tx(s,'B');assert.equal(b.actors.B.read,100);assert.equal(b.committed,100);const committed=tx(b,'A');assert.equal(committed.committed,120);assert.equal(committed.owner,null);assert.equal(committed.actors.A.pending,null);
});
test('a second UPDATE waits for the first writer commit but keeps its stale app value',()=>{
 let s=tx(D.txStart(),'A','B','A','B','A');assert.equal(s.owner,'A');const wait=tx(s,'B');assert.equal(wait.actors.B.pc,2);assert.equal(wait.actors.B.local,90);assert.equal(wait.committed,100);
 s=tx(wait,'A','B','B');assert.equal(s.committed,90);assert.equal(D.txView(s).bothDone,true);
});
test('SELECT FOR UPDATE waits before reading and sees the prior committed update',()=>{
 let s=tx(D.txStart('locked'),'A','B');assert.equal(s.actors.B.read,null);assert.equal(s.actors.B.pc,0);s=tx(s,'A','A','A','B');assert.equal(s.actors.B.read,120);s=tx(s,'B','B','B');assert.equal(s.committed,110);
});
test('all legal interleavings are enumerated without fabricating progress for blocked steps',()=>{
 for(const mode of ['plain','locked']){const outcomes=new Set();function walk(s){if(D.txView(s).bothDone){outcomes.add(s.committed);return;}for(const id of ['A','B']){if(s.actors[id].pc===4)continue;const next=tx(s,id);if(next.actors[id].pc>s.actors[id].pc)walk(next);}}walk(D.txStart(mode));assert.deepEqual([...outcomes].sort((a,b)=>a-b),mode==='locked'?[110]:[90,110,120]);}
});
test('reading a prior event does not rewind the actual transaction',()=>{
 const s=tx(D.txStart(),'A','A','A','A'),n=D.tx(s,{kind:'event',index:0});assert.equal(D.txView(n).selected.snapshot.committed,100);assert.equal(n.committed,120);assert.deepEqual(n.actors,s.actors);
});
test('invalid transaction operations are atomic and committed actors cannot execute twice',()=>{
 const s=tx(D.txStart(),'A','A','A','A'),old=copy(s);assert.throws(()=>D.tx(s,{kind:'step',actor:'A'}));assert.throws(()=>D.tx(s,{kind:'step',actor:'C'}));assert.throws(()=>D.tx(s,{kind:'event',index:99}));assert.deepEqual(s,old);
});
test('B+ split keeps data10 in the leaf while copying its boundary into the root',async()=>{
 const s=await D.bplus(D.bplusStart(),{kind:'example'}),v=D.bplusView(s);assert.equal(v.occurrences.length,2);assert.deepEqual(v.nodes.map(n=>[n.leaf,n.keys]),[[false,[10]],[true,[5,6]],[true,[10,20]]]);assert.equal(v.route[0].child,1);assert.equal(v.route.at(-1).found,true);
});
function leafKeys(n){return n.leaf?n.label.split('|').map(Number):(n.children||[]).flatMap(leafKeys);}
test('B+ nodes retain separator, capacity, sorted leaf and equal-depth invariants',async()=>{
 let s=D.bplusStart();for(const value of [10,20,5,6,12,30,7,17,3,25,15,1,2,4,8,9,11,13,14,16,18,19,21,22]){s=await D.bplus(s,{kind:'insert',value});const root=D.bplusView(s).root,depths=[];
 function verify(n,depth){const keys=n.label.split('|').map(Number);assert.ok(keys.length<=3);assert.deepEqual(keys,keys.slice().sort((a,b)=>a-b));if(n.leaf){depths.push(depth);return;}
 assert.equal(n.children.length,keys.length+1);keys.forEach((key,i)=>{assert.ok(Math.max(...leafKeys(n.children[i]))<key);assert.equal(Math.min(...leafKeys(n.children[i+1])),key);});n.children.forEach(child=>verify(child,depth+1));}
 verify(root,0);assert.equal(new Set(depths).size,1);assert.deepEqual(leafKeys(root),s.values.slice().sort((a,b)=>a-b));}
});
test('B+ histories do not mutate when adding a later key, duplicates do not grow the tree',async()=>{
 const a=await D.bplus(D.bplusStart(),{kind:'example'}),old=copy(a),b=await D.bplus(a,{kind:'insert',value:12});assert.deepEqual(a,old);assert.deepEqual(b.roots.slice(0,4),a.roots);
 const dup=await D.bplus(b,{kind:'insert',value:12});assert.equal(dup.values.length,b.values.length);assert.deepEqual(dup.roots,b.roots);
});
test('B+ absent-key routing and invalid edits remain explicit',async()=>{
 const s=await D.bplus(D.bplusStart(),{kind:'example'}),n=await D.bplus(s,{kind:'key',value:11});assert.equal(D.bplusView(n).route.at(-1).found,false);const old=copy(s);await assert.rejects(D.bplus(s,{kind:'insert',value:NaN}));assert.deepEqual(s,old);
});
test('legacy transaction frames no longer contain another actor future read value',async()=>{
 const lab=CSL.labs.find(l=>l.id==='c14-transaction');for(const serial of [false,true]){const r=await CSL.run(lab,{...lab.defaults,serial}),first=r.frames[0];const readB=first.visual.rows.find(row=>row.label==='Bの読取り');assert.equal(readB.values[0],'未読');assert.equal(r.metrics['最終残高'],serial?110:90);}
});
test('all four authored routes stay stable and original calculation views remain',()=>{
 assert.equal(X.lessons.size,314);for(const [id,kind]of Object.entries({'c14-index':'index-correspondence','c14-join':'join-provenance','c14-transaction':'transaction-order','c14-bplus':'bplus-routing'})){const d=X.find(id);assert.equal(d.chapters[0].id,'objects');assert.equal(d.chapters[0].activities[0].kind,kind);assert.equal(d.chapters.length,2);}
});
