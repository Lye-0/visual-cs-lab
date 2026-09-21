import test from 'node:test';
import assert from 'node:assert/strict';
import {modelModules} from '../scripts/modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
await import('../src/experiences-coding-models.js');
const X=CSL.experiences,M=X.coding;

test('区切りそのものが解釈を決め、二つの反例を並べられる',()=>{
 const codes=['0','01','10'];
 assert.deepEqual(M.segment(codes,'010',[1]).parts.map(p=>p.bits),['0','10']);
 assert.equal(M.segment(codes,'010',[1]).text,'AC');
 assert.equal(M.segment(codes,'010',[2]).text,'BA');
 assert.equal(M.segment(codes,'010',[]).valid,false);
 assert.equal(M.segment(codes,'010',[1,2]).valid,false);
 assert.deepEqual(M.decodings(codes,'010').readings.map(r=>r.notation).sort(),['0 | 10','01 | 0']);
 assert.equal(M.decodings(['0','01'],'00101').readings.length,1);
});
test('接頭辞があることと一意復号できないことを区別する',()=>{
 const prefix=M.codeProperties(['0','10','110','111']);assert.equal(prefix.prefixFree,true);assert.equal(prefix.uniquelyDecodable,true);
 const delayed=M.codeProperties(['0','01']);assert.equal(delayed.prefixFree,false);assert.equal(delayed.uniquelyDecodable,true);
 const ambiguous=M.codeProperties(['0','01','10']);assert.equal(ambiguous.uniquelyDecodable,false);assert.ok(ambiguous.steps.some(s=>s.next.includes('')));
 assert.equal(M.codeProperties(['01','10']).uniquelyDecodable,true);
 assert.throws(()=>M.codeProperties(['0','0']),/同じ符号語/);
});
test('一意と判定した小符号では長さ5までの記号列に衝突がない',()=>{
 const universe=['0','1','00','01','10','11','001'];
 for(let a=0;a<universe.length;a++)for(let b=a+1;b<universe.length;b++)for(let c=b+1;c<universe.length;c++){
  const codes=[universe[a],universe[b],universe[c]];
  if(!M.codeProperties(codes).uniquelyDecodable)continue;
  const seen=new Map();
  function walk(bits,message,remaining){if(!remaining)return;for(let i=0;i<codes.length;i++){const next=bits+codes[i],text=message+i;assert.ok(!seen.has(next)||seen.get(next)===text,codes+' '+next);seen.set(next,text);walk(next,text,remaining-1);}}
  walk('','',5);
 }
});
test('入力上限と探索上限があり、打切りを一意性と混同しない',()=>{
 assert.throws(()=>M.segment(['0'],'0',[0]),/区切り/);
 assert.throws(()=>M.segment(['0'],'0',[1]),/区切り/);
 assert.throws(()=>M.segment(['0'],'0',[.5]),/区切り/);
 assert.throws(()=>M.segment(['0'],'2'),/0と1/);
 assert.throws(()=>M.words(['000000000']),/1〜8桁/);
 const many=M.decodings(['0','00','000'],'00000000000000000000',3);
 assert.equal(many.readings.length,3);assert.equal(many.truncated,true);
 assert.equal(M.codeProperties(['0','00','000']).uniquelyDecodable,false);
});
test('クラフトの占有は葉の下の領域であり、接頭辞衝突を拒否する',()=>{
 const first=M.placeLeaf([],'0');assert.deepEqual(first,['0']);
 assert.deepEqual(M.slots(first),{total:16,used:8,remaining:8,kraft:.5});
 assert.equal(M.leafState(first,'0011').state,'below-leaf');
 assert.throws(()=>M.placeLeaf(first,'00'),/下/);assert.deepEqual(first,['0']);
 assert.equal(M.leafState(['101'],'1').state,'above-leaf');
 assert.throws(()=>M.placeLeaf(['101'],'1'),/途中/);
 assert.throws(()=>M.placeLeaf(['0'],'0'),/既に/);
 let placed=[];for(const path of ['0','10','110','111'])placed=M.placeLeaf(placed,path);
 assert.deepEqual(M.slots(placed),{total:16,used:16,remaining:0,kraft:1});
 assert.throws(()=>M.placeLeaf(placed,'101'),/下/);
 assert.equal(M.slots([]).remaining,16);
});
test('同じ長さでも場所の選択は検査され、三つ目の長さ1は置けない',()=>{
 assert.throws(()=>M.slots(['0','00']),/下/);
 const full=M.placeLeaf(M.placeLeaf([],'0'),'1');assert.equal(M.slots(full).remaining,0);
 assert.throws(()=>M.placeLeaf(full,''),/道/);assert.throws(()=>M.placeLeaf(full,'10'),/下/);
 const leaves=Array.from({length:16},(_,i)=>i.toString(2).padStart(4,'0'));assert.equal(M.slots(leaves).kraft,1);
});
test('Huffmanの候補は学習者が選び、誤った結合では状態が変わらない',()=>{
 const state=M.huffmanStart(),before=JSON.stringify(state);
 assert.throws(()=>M.merge(state,['leaf-A','leaf-B']),/小さい二つ/);
 assert.throws(()=>M.merge(state,['leaf-C','leaf-C']),/異なる二つ/);
 assert.throws(()=>M.merge(state,['leaf-C','missing']),/候補/);
 assert.equal(JSON.stringify(state),before);assert.equal(M.codeTable(state),null);
 const next=M.merge(state,['leaf-C','leaf-D']);assert.equal(next.roots.length,3);assert.equal(next.history.length,1);assert.equal(next.roots.at(-1).weight,2);
 assert.equal(JSON.stringify(state),before);assert.deepEqual(M.undo(next),state);
});
test('4・2・1・1から自分で三回結合すると平均1.75bitの符号になる',()=>{
 let state=M.huffmanStart();
 state=M.merge(state,['leaf-C','leaf-D']);
 state=M.merge(state,['leaf-B','join-0']);
 state=M.merge(state,['leaf-A','join-1']);
 const table=M.codeTable(state);
 assert.deepEqual(table.rows.map(r=>[r.symbol,r.code]),[['A','0'],['B','10'],['C','110'],['D','111']]);
 assert.equal(table.average,1.75);assert.equal(table.weighted,14);
 assert.equal(state.history.reduce((sum,s)=>sum+s.weight,0),table.weighted);
 assert.throws(()=>M.merge(state,[]),/一本/);
 assert.equal(M.undo(state).roots.length,2);
});
test('同じ頻度の別候補も受け入れ、左右を変えても平均長を保つ',()=>{
 let state=M.huffmanStart([2,2,2,2]);state=M.merge(state,['leaf-D','leaf-B']);state=M.merge(state,['leaf-C','leaf-A']);state=M.merge(state,['join-1','join-0']);
 assert.equal(M.codeTable(state).average,2);assert.deepEqual(M.codeTable(state).rows.map(r=>r.length),[2,2,2,2]);
 assert.equal(M.codeProperties(M.codeTable(state).rows.map(r=>r.code)).prefixFree,true);
});
test('4記号の小さい全頻度を、全ての結合順を探索した独立解と比較する',()=>{
 // Exhaustive oracle includes non-Huffman merges; it does not use M.merge.
 const optimum=weights=>{
  if(weights.length===1)return 0;
  let best=Infinity;
  for(let i=0;i<weights.length;i++)for(let j=i+1;j<weights.length;j++){
   const combined=weights[i]+weights[j];best=Math.min(best,combined+optimum([...weights.filter((_,k)=>k!==i&&k!==j),combined]));
  }
  return best;
 };
 for(let a=1;a<=3;a++)for(let b=1;b<=3;b++)for(let c=1;c<=3;c++)for(let d=1;d<=3;d++){
  let state=M.huffmanStart([a,b,c,d]);while(state.roots.length>1)state=M.merge(state,state.roots.slice().sort((a,b)=>a.weight-b.weight).slice(0,2).map(n=>n.id));
  assert.equal(M.codeTable(state).weighted,optimum([a,b,c,d]));
 }
});
test('約束した三つの教材は汎用プレーヤーではなく専用操作に接続する',()=>{
 for(const [id,kind]of [['c01-prefix','prefix-cut'],['c01-kraft','kraft-tree'],['c01-huffman','huffman-build'],['c02-set','sets']]){
  const def=X.find(id);assert.ok(def,id);assert.ok(def.chapters.some(c=>c.activities.some(a=>a.kind===kind)),id+' '+kind);
 }
});
