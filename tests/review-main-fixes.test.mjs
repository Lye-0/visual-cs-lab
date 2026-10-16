import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureLabs} from './lesson-fixtures.mjs';
await import('../src/visuals.js');
await import('../src/curriculum-visuals.js');
const L=globalThis.CSL,X=L.experiences;
const run=(id,patch={})=>{const lab=fixtureLabs.find(l=>l.id===id);return L.run(lab,{...lab.defaults,...patch});};
test('移動平均の全出力を、実際に使った入力の和と点数から再計算できる',async()=>{
 for(const radius of [1,3]){const r=await run('c18-filter',{radius});assert.equal(r.frames.length,12);for(const [i,f]of r.frames.entries()){const rows=f.table.rows;assert.equal(rows.length,Math.min(11,i+radius)-Math.max(0,i-radius)+1);const mean=rows.reduce((s,r)=>s+r[1],0)/rows.length;assert.equal(f.stats['出力値'],mean);assert.equal(f.visual.series[1].points[i].y,mean);}}
});
test('数学的に同じ量子化中点には一貫した丸めを適用する',()=>{
 const v=X.mediaDesk.samplingView(X.mediaDesk.samplingStart());assert.equal(v.samples[2].code,4);assert.equal(v.samples[6].code,4);assert.equal(v.samples[2].saved,v.samples[6].saved);assert.notEqual(v.samples[2].saved,0);
});
test('投影図の頂点と数値表は同じ変換結果を示す',async()=>{
 for(const distance of [3,8]){const r=await run('c18-projection',{angle:0,pitch:0,distance}),f=r.frames[0];assert.equal(f.table.rows.length,8);for(const [i,p]of f.visual.points.entries()){assert.equal(p.x,3*p.viewX/p.depth);assert.equal(p.y,3*p.viewY/p.depth);assert.equal(f.table.rows[i][0],i);}assert.equal(f.visual.points[0].depth,distance-1);}
});
test('主図の指定は実在する状態を選び、木・機械・波形を結果表と比較できる',async()=>{
 for(const [key,choices]of Object.entries(X.primaryViews)){const [id,chapter]=key.split('/'),ch=X.find(id).chapters.find(c=>c.id===chapter);assert.ok(ch,key);for(const a of ch.activities.filter(a=>['inspect','compare'].includes(a.kind))){for(const p of a.examples||[{patch:{}}]){const r=await run(id,{...a.patch,...p.patch});const indices=X.frameIndices(a,r.frames);assert.equal(indices.length,choices.length,key);assert.ok(indices.every(i=>r.frames[i]?.visual),key);if(id==='gap-044')assert.equal(r.frames[indices[0]].visual.type,'tree');if(id==='gap-024')assert.equal(r.frames[indices[0]].visual.kind,'graph');if(id==='gap-060')assert.equal(indices[0],0);}}}
});
test('空の表示セルには操作ボタンを作らず、値のあるセルの選択は保つ',()=>{
 const html=L.visualize({type:'curriculum-board',kind:'table',headers:['値','関係'],rows:[['A',''],['B','C']]});assert.equal((html.match(/<button/g)||[]).length,3);assert.match(html,/cv-empty-cell/);
});
test('ハミング符号の全段階は入力と同じ1始まりの位置を表示する',async()=>{
 const r=await run('c01-hamming',{flip:7});for(const f of r.frames){assert.equal(f.visual.indexBase,1);const html=L.visualize(f.visual);assert.match(html,/bit-index">7</);assert.doesNotMatch(html,/bit-index">0</);}
});
test('埋込み名の不整合は埋込み文書の結果にだけ属する',async()=>{
 for(const model of ['kv','graph','document']){const r=await run('gap-094',{model});assert.equal('古い埋込み名の数' in r.metrics,model==='document');}
});
test('派生単元の理解確認はその単元の概念を問う',()=>{
 for(const id of ['c16-reset','c16-branches','c16-rebase','c16-remote','c16-undo'])assert.doesNotMatch(fixtureLabs.find(l=>l.id===id).challenge.question,/git add/);
 assert.match(fixtureLabs.find(l=>l.id==='c18-filter').challenge.question,/移動平均/);
 assert.match(fixtureLabs.find(l=>l.id==='c18-fourier').challenge.question,/DFT/);
});

test('水平の矢印は対象ノードの左端より外で終わる',()=>{
 const html=L.visualize({type:'curriculum-board',kind:'graph',directed:true,nodes:[{id:'1'},{id:'2'},{id:'3'},{id:'4'}],edges:[{from:'1',to:'2'}]});
 assert.match(html,/M151 75L499 75/);assert.match(html,/x="502" y="44"/);
});
test('同じ行の中間ノードをまたぐ辺は迂回し、自己ループもノード外で終わる',()=>{
 const html=L.visualize({type:'curriculum-board',kind:'graph',directed:true,nodes:['A','B','C','D','E'].map(id=>({id})),edges:[{from:'A',to:'C',label:2},{from:'A',to:'A',label:'loop'}]});
 assert.match(html,/M151 75Q245 175 339 75/);assert.match(html,/M60 41C15 0 155 0 110 41/);
});

test('ダイオードI–Vの横軸は電源でなく素子電圧で、Shockley式に一致する',async()=>{
 const r=await run('gap-061',{device:'diode',input:2.5,resistance:1000});const v=r.frames.at(-1).visual;
 assert.equal(v.xLabel,'ダイオード両端V');
 for(const pt of v.series[0].points){const expected=1e-9*Math.expm1(pt.x/.026);assert.ok(Math.abs(pt.y-expected)<1e-8);}
});
