import test from 'node:test';
import assert from 'node:assert/strict';
import {L, run, last} from './helpers.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6, `${a} != ${b}`);

test('エントロピー: 具体例1.75、等確率2、確定した情報源0',async()=>{
 for(const [weights,expected]of [['4,2,1,1',1.75],['1,1,1,1',2],['1,0,0,0',0]]) {
  const r=await run('c01-entropy',{weights});near(r.metrics['エントロピー (bit/記号)'],expected);near(r.metrics['確率の合計'],1);
 }
 for(const weights of ['0,0,0,0','-1,2,3,4','one,2,3,4','1,2,3'])await assert.rejects(async()=>run('c01-entropy',{weights}));
});
test('自己情報量: 確率半分ごとに1bit、確率1なら0bit',async()=>{
 for(let bits=0;bits<=10;bits++) {
  const r=await run('c01-information',{bits});near(r.metrics['自己情報量 (bit)'],bits);near(r.metrics['確率'],2**(-bits));
 }
});
test('相互情報量: 独立、完全一致、定数と連鎖則',async()=>{
 for(const [weights,expected]of [['1,1,1,1',0],['1,0,0,1',1],['1,0,0,0',0]]) {
  const m=(await run('c01-joint',{weights})).metrics;near(m['I(X;Y)'],expected);near(m['H(X,Y)'],m['H(Y)']+m['H(X|Y)']);
 }
});
test('線形符号: G×H転置=0、Hの列は非零かつ相異なる',()=>{
 const {G,H}=L.teachingMath.linearCode;
 for(const g of G)for(const h of H)assert.equal(g.reduce((sum,x,i)=>sum^(x&h[i]),0),0);
 const columns=H[0].map((_,i)=>H.map(row=>row[i]).join(''));
 assert.equal(new Set(columns).size,7);assert.ok(!columns.includes('000'));
});
test('線形符号: 全16情報語×8誤り条件で受信語から訂正',async()=>{
 const {syndrome}=L.teachingMath.linearCode;
 for(let value=0;value<16;value++)for(let flip=0;flip<=7;flip++){
  const text=value.toString(2).padStart(4,'0'),r=await run('c01-linear-code',{text,flip}),m=r.metrics;
  assert.equal(m['復元情報'],text);
  assert.equal(m['訂正位置'],flip||'なし');
  assert.equal(m['シンドローム'],syndrome([...m['受信列']].map(Number)).join(''));
  assert.equal(syndrome([...m['送信列']].map(Number)).join(''),'000');
 }
});
test('ハミング距離: 対称性・同一語・全反転',async()=>{
 for(const a of ['0','1','1011010']){
  const b=[...a].map(x=>x==='0'?'1':'0').join('');
  const distance=async(x,y)=>(await run('c01-distance',{a:x,b:y})).metrics['ハミング距離'];
  assert.equal(await distance(a,a),0);assert.equal(await distance(a,b),a.length);assert.equal(await distance(a,b),await distance(b,a));
 }
 await assert.rejects(async()=>run('c01-distance',{a:'01',b:'1'}));
});
test('NFA: 8文字までの全入力を末尾01の独立判定と照合',async()=>{
 for(let size=0;size<=8;size++)for(let n=0;n<2**size;n++){
  const input=size?n.toString(2).padStart(size,'0'):'';
  assert.equal((await run('c02-nfa',{input})).metrics['受理'],input.endsWith('01')?'はい':'いいえ');
 }
});
test('NAND合成: NOT/AND/OR/XORの全入力',async()=>{
 for(const gate of ['NOT','AND','OR','XOR'])for(const a of [false,true])for(const b of [false,true]){
  const expected=gate==='NOT'?!a:gate==='AND'?a&&b:gate==='OR'?a||b:a!==b;
  assert.equal((await run('c08-nand',{gate,a,b})).metrics['出力'],Number(expected));
 }
});
test('レジスタ: load=0は保持、load=1は立上りで更新',async()=>{
 for(const initial of [false,true]){
  assert.equal((await run('c08-register',{initial,loads:'0000'})).metrics['最後のQ'],Number(initial));
  const r=await run('c08-register',{initial,inputs:'1010',loads:'1111'});
  assert.equal(r.metrics['最後のQ'],0);
  for(let i=0;i<4;i++){
   const before=r.frames[1+2*i].visual,after=r.frames[2+2*i].visual;
   assert.equal(before.clock,0);assert.equal(after.clock,1);assert.equal(after.q,Number('1010'[i]));
  }
 }
 await assert.rejects(async()=>run('c08-register',{inputs:'101',loads:'11'}));
});
test('仮想アドレス: 32アドレスで分離、ページ内オフセットを保存',async()=>{
 for(let address=0;address<32;address++){
  const a=(await run('c10-address-spaces',{address,process:'A'})).metrics;
  const b=(await run('c10-address-spaces',{address,process:'B'})).metrics;
  assert.notEqual(a['物理アドレス'],b['物理アドレス']);
  assert.equal(a['物理アドレス']%16,address%16);assert.equal(b['物理アドレス']%16,address%16);
 }
});
test('シャノン・ファノ: 出現確率と符号長の対応、符号は接頭辞を共有しない',async()=>{
 for(const weights of ['4,2,1,1','1,1,1,1','1,0,0,0','1,1,2,8']){
  const r=await run('c01-shannon-fano',{weights}),codes=last(r).visual.codes;
  for(let i=0;i<codes.length;i++)for(let j=0;j<codes.length;j++)if(i!==j)assert.ok(!codes[j].startsWith(codes[i]));
  assert.ok(r.metrics['平均符号長']+1e-6>=r.metrics['エントロピー']);
 }
});
