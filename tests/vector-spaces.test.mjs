import test from 'node:test';
import assert from 'node:assert/strict';
import {L,run} from './helpers.mjs';
const M=L.vectorSpaces;
test('polynomial arithmetic agrees with independently worked examples',()=>{
 const f=[1,2,1,0],g=[3,-1,0,2];
 assert.deepEqual(M.add(f,g),[4,1,1,2]);
 assert.deepEqual(M.scale(f,-2),[-2,-4,-2,0]);
 assert.deepEqual(M.derivative([7,-3,4,-2]),[-3,8,-6,0]);
 assert.deepEqual(M.residual([7,-3,4,-2]),[-7,0,4,-4]);
 assert.equal(M.evaluate([7,-3,4,-2],2),1);
 assert.deepEqual(f,[1,2,1,0]);assert.deepEqual(g,[3,-1,0,2]);
 assert.equal(M.polynomial([0,-1,0,2]),'−x + 2x³');
 assert.equal(M.polynomial([0,0,0,0]),'0');
});
test('zero polynomial, zero at a point, and zero residual are different',()=>{
 assert.equal(M.isZero([0,1,0,0]),false);
 assert.equal(M.member([0,1,0,0],'derivative'),true);
 assert.equal(M.evaluate([0,0,1,0],0),0);
 assert.equal(M.member([0,0,1,0],'derivative'),false);
 assert.equal(M.member([1,0,0,0],'derivative'),false);
 assert.equal(M.member([0,0,0,0],'derivative'),true);
});
test('both point conditions are checked, including nonzero members',()=>{
 assert.equal(M.member([-1,0,1,0],'roots'),true);
 assert.equal(M.isZero([-1,0,1,0]),false);
 assert.equal(M.member([-1,1,0,0],'roots'),false);
 assert.equal(M.member([1,1,0,0],'roots'),false);
 assert.equal(M.member([0,-1,0,1],'roots'),true);
});
test('representative members retain membership under addition and negative or zero scaling',()=>{
 for(const [condition,f,g]of [['derivative',[0,2,0,0],[0,-5,0,0]],['roots',[-1,0,1,0],[0,-1,0,1]]]){
  assert.equal(M.member(M.add(f,g),condition),true);
  for(const scalar of [-6,-1,0,3,6])assert.equal(M.member(M.scale(f,scalar),condition),true);
 }
});
test('invalid coefficient shapes and noninteger input cannot silently become a zero candidate',()=>{
 for(const values of [[],[0,0,0],[0,0,0,NaN],[0,0,0,Infinity],[0,1.2,0,0]])assert.throws(()=>M.coefficients(values));
 assert.throws(()=>M.scale([0,1,0,0],NaN));
});
test('two searchable linear algebra lessons retain the reading order and two topic destinations',async()=>{
 const first=L.experiences.find('c03-vector-space'),second=L.experiences.find('c03-subspace');
 assert.equal(first.chapters.length,1);
 assert.deepEqual(second.chapters.map(c=>c.id),['criteria','derivative']);
 assert.equal(second.navigation,'tabs');
 assert.deepEqual(second.chapters[1].activities.filter(a=>a.proof).map(a=>a.proof),['matrix','roots']);
 assert.ok(second.chapters[1].activities.filter(a=>a.proof).every(a=>a.collapsed));
 assert.equal(second.chapterAliases.lecture,'derivative');
 assert.deepEqual(second.chapters.map(c=>c.title),['部分空間の考え方','多項式の例題']);
 for(const id of ['c03-vector-space','c03-subspace']){
  assert.equal(L.labs.find(l=>l.id===id).taxonomy.category,'math-linear');
  assert.ok(L.taxonomy.search('部分空間').some(l=>l.id===id));
  assert.ok((await run(id)).frames.length);
 }
});
