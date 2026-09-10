import test from 'node:test';
import assert from 'node:assert/strict';
import {L} from './helpers.mjs';
const K=L.curriculum;
const close=(actual,expected,tolerance=1e-8)=>assert.ok(typeof actual==='number'&&Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);

test('GAP-001〜155と既存159単元を、実際の登録と実行関数で確認する',()=>{
 assert.ok(K?.coverage,'科目の統合データがない');
 assert.equal(K.baselineIds.length,159);
 assert.equal(K.entries.length,155);
 assert.equal(L.labs.length,314);
 assert.equal(L.areas.length,20);
 const ids=new Set(L.labs.map(l=>l.id));assert.equal(ids.size,L.labs.length);
 for(const id of K.baselineIds)assert.ok(ids.has(id),'既存単元 '+id);
 for(let n=1;n<=155;n++){
  const id='gap-'+String(n).padStart(3,'0'),lab=L.labs.find(l=>l.id===id);
  assert.ok(lab,id);assert.equal(typeof L.engines[lab.engine],'function',id);
  assert.ok(lab.reading.sections.length>=1,id+' 説明細目');
  assert.ok(lab.controls.length>=1,id+' 操作');
  assert.ok(Object.keys(lab.exploration.patch).length,id+' 条件変更');
  assert.ok(lab.scope.length>15,id+' 再現範囲');
  assert.ok(lab.reading.why.length>12&&lab.reading.example.length>12,id+' 固有の導入');
 }
 assert.deepEqual(new Set(K.groups.flatMap(g=>g.labs)),new Set(K.expectedIds));
});

test('FFTの定義上の既知値と逆変換を照合する',()=>{
 assert.equal(typeof K.fft,'function');
 const impulse=K.fft([1,0,0,0,0,0,0,0]);for(const [real,imag]of impulse){close(real,1);close(imag,0);}
 const constant=K.fft([2,2,2,2,2,2,2,2]);close(constant[0][0],16);for(const [real,imag]of constant.slice(1)){close(real,0);close(imag,0);}
 const input=[.3,-.7,1.2,2.1,-3.2,.01,4.1,-.2],spectrum=K.fft(input),back=K.fft(spectrum,true);
 back.forEach(([real,imag],i)=>{close(real,input[i]);close(imag,0);});
 const energy=input.reduce((s,x)=>s+x*x,0),spectral=spectrum.reduce((s,[re,im])=>s+re*re+im*im,0)/input.length;close(energy,spectral);
});

test('直交DCTは全係数を保てば入力へ戻り、定数画像はDCのみになる',()=>{
 const input=Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>(x*13+y*7)%29-14));
 const transformed=K.dct2(input),back=K.dct2(transformed,true);
 for(let y=0;y<8;y++)for(let x=0;x<8;x++)close(back[y][x],input[y][x],1e-7);
 const constant=K.dct2(Array.from({length:8},()=>Array(8).fill(3)));close(constant[0][0],24);
 for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(x||y)close(constant[y][x],0);
});

test('FIRとIIRのインパルス応答を独立した期待列で確認する',()=>{
 assert.deepEqual(K.filterSignal([1,0,0,0],[.25,.5,.25],[1]),[.25,.5,.25,0]);
 assert.deepEqual(K.filterSignal([1,0,0,0],[1],[1,-.5]),[1,.5,.25,.125]);
 assert.throws(()=>K.filterSignal([1],[1],[0]),/a0/);
});

test('クリッピングの出力が6平面の内側にある',()=>{
 const input=[{clip:[-2,0,0,1],color:[255,0,0]},{clip:[.5,-.5,0,1],color:[0,255,0]},{clip:[.5,.5,0,1],color:[0,0,255]}];
 const clipped=K.clipPolygon(input);assert.ok(clipped.length>=3);
 for(const point of clipped)for(let i=0;i<3;i++)assert.ok(Math.abs(point.clip[i])<=point.clip[3]+1e-9);
 assert.ok(clipped.some(p=>Math.abs(p.clip[0]+1)<1e-9),'左平面との交点');
});

test('異なる深度の同じ三角形は深度検査時に描画順に依存しない',()=>{
 const make=(z,color)=>[[-.8,-.8],[.8,-.8],[0,.8]].map(([x,y])=>({clip:[x,y,z,1],color}));
 const near=make(-.5,[220,50,50]),far=make(.5,[50,220,50]);
 const a=K.rasterTriangles([near,far],16,true),b=K.rasterTriangles([far,near],16,true);
 assert.ok(a.covered>0&&a.rejected>0);assert.deepEqual(a.image,b.image);
 assert.notDeepEqual(K.rasterTriangles([near,far],16,false).image,K.rasterTriangles([far,near],16,false).image);
});

test('RMとEDFで締切の守り方が変わる具体例を確認する',()=>{
 const tasks=[{name:'A',cost:2,period:5,deadline:5},{name:'B',cost:4,period:7,deadline:7}];
 const rm=K.realTime(tasks,35,'RM'),edf=K.realTime(tasks,35,'EDF');
 assert.ok(rm.missed.includes('B@0'));assert.equal(edf.missed.length,0);
 assert.equal(rm.timeline.length,35);assert.equal(edf.timeline.length,35);
});

test('3-way mergeは別々の行の編集を保持し、同じ行の不一致を競合にする',()=>{
 const base=['a','b','c'];
 const disjoint=K.mergeLines(base,['A','b','c'],['a','B','c']);
 assert.deepEqual(disjoint.merged,['A','B','c']);assert.equal(disjoint.conflicts.length,0);
 const conflict=K.mergeLines(base,['L','b','c'],['R','b','c']);
 assert.equal(conflict.conflicts.length,1);assert.ok(conflict.merged.includes('<<<<<<< left'));
});

test('仮想HTTPサービスが認可・入力検証・ロールバックを実行する',()=>{
 const initial=()=>[{id:1,name:'a',owner:1},{id:2,name:'b',owner:2}],config={role:'user',actor:1,contentType:'application/json',failure:'none'};
 let state=initial();
 assert.equal(K.virtualRequest(state,{method:'GET',path:'/items/2'},config).status,403);
 assert.deepEqual(state,initial());
 assert.equal(K.virtualRequest(state,{method:'POST',path:'/items',body:'{"name":"c"}'},config).status,201);assert.equal(state.length,3);
 assert.equal(K.virtualRequest(state,{method:'POST',path:'/items',body:'{oops'},config).status,400);assert.equal(state.length,3);
 assert.equal(K.virtualRequest(state,{method:'POST',path:'/items',body:'{"name":""}'},config).status,422);
 state=initial();const failure=K.virtualRequest(state,{method:'PATCH',path:'/items/1',body:'{"name":"changed"}'},{...config,failure:'after'});
 assert.equal(failure.status,500);assert.deepEqual(state,initial());assert.equal(failure.body.error,'Internal server error');
 assert.equal(K.virtualRequest(state,{method:'GET',path:'/items'}, {...config,role:'guest'}).status,401);
 assert.equal(K.virtualRequest(state,{method:'PUT',path:'/items/1'},config).status,405);
});

test('対応する同一データの比較で平均差0・p値1になる',()=>{
 const x=[12,11,14,13,12,15],r=K.experiment(x,x,{paired:true,repeats:199,seed:42});
 close(r.difference,0);close(r.pvalue,1);close(r.lower,0);close(r.upper,0);
});

test('画像とDOMの教材も未登録表示にせず、安全に描画できる',()=>{
 const raster=L.visualize({type:'curriculum-raster',pixels:[[[0,0,0],[255,255,255]]],caption:'<script>not executable</script>'});
 assert.match(raster,/cv-pixels/);assert.match(raster,/&lt;script&gt;/);assert.doesNotMatch(raster,/<script>/);
 for(const kind of ['feedback','target','accessibility','browser-layout','browser-events','browser-form']){
  const markup=L.visualize({type:'curriculum-demo',kind,native:true,label:true,focus:true,live:true,order:true,items:4,width:320,gap:10,layout:'flex',borderBox:true});
  assert.match(markup,/cv-demo/);assert.doesNotMatch(markup,/<script>|\bonclick=/);
 }
});
