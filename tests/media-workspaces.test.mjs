// Independent expectations for the media/embedded learner workspaces.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {modelModules} from '../scripts/modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
const L=globalThis.CSL,X=L.experiences,M=X.mediaDesk,K=L.curriculum;
const near=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);
const atomic=(fn,s,a)=>{const before=structuredClone(s);assert.throws(()=>fn(s,a));assert.deepEqual(s,before);};
const all=Array.from({length:11},(_,i)=>'gap-'+(133+i));
const direct=['fourier-components','filter-contributions','sample-value-axes','image-neighborhood','raster-evidence','surface-light','bezier-construction','dct-coefficients','gpio-pwm','sensor-calibration','control-state-pair','deadline-choice'];
test('11単元を明示的な33章と12種類の操作へ接続する',()=>{
 assert.ok(M);const defs=all.map(id=>X.find(id));assert.ok(defs.every(Boolean));
 assert.equal(defs.reduce((n,d)=>n+d.chapters.length,0),33);
 const kinds=defs.flatMap(d=>d.chapters.flatMap(c=>c.activities.map(a=>a.kind)));
 for(const name of direct)assert.equal(kinds.filter(k=>k===name).length,1,name);
 assert.ok(kinds.includes('compare'));assert.ok(kinds.includes('ledger'));
});
test('全ての従来計算を使う章・比較例が有効な入力で計算できる',async()=>{
 for(const id of all)for(const ch of X.find(id).chapters)for(const a of ch.activities){
  if(!['inspect','compare','ledger','timeline','editor'].includes(a.kind))continue;
  const lab=L.labs.find(l=>l.id===(a.model||id));
  for(const example of a.kind==='compare'?a.examples:[{patch:{}},...(a.examples||[])]){
   const p={...lab.defaults,...a.patch,...example.patch};
   for(const c of lab.controls.filter(c=>c.type==='select'))assert.ok(c.options.some(o=>o.value===p[c.key]),id+'/'+ch.id+'/'+c.key);
   const result=await L.run(lab,p);assert.ok(result.frames.length,id+'/'+ch.id);
  }
 }
});
test('媒体・制御ファイルは外部通信・永続保存・任意実行を追加しない',async()=>{
 for(const name of ['experiences-media-signals','experiences-media-graphics','experiences-media-embedded','experiences-media-widgets','experiences-media-graphics-widgets','experiences-media-embedded-widgets']){
  const source=await readFile(new URL('../src/'+name+'.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:fetch|eval|WebSocket)\s*\(|\b(?:localStorage|sessionStorage|indexedDB)\b|new\s+Function\s*\(/,name);
 }
});
test('DFTの係数を別の直接和と照合する',()=>{
 const s=M.fourierStart(),v=M.fourierView(s),n=s.input.length;
 for(let k=0;k<n;k++){let re=0,im=0;for(let j=0;j<n;j++){re+=s.input[j]*Math.cos(2*Math.PI*k*j/n);im-=s.input[j]*Math.sin(2*Math.PI*k*j/n);}near(v.coefficients[k][0],re);near(v.coefficients[k][1],im);}
 near(v.coefficients[0][0],8);near(v.coefficients[2][0],8);near(v.coefficients[3][1],-4);near(v.error,0);
});
test('周波数を外すと対応するcosだけが消える',()=>{
 const s=M.fourier(M.fourierStart(),{kind:'pair',k:2}),v=M.fourierView(s);
 for(let i=0;i<16;i++)near(s.input[i]-v.back[i],Math.cos(4*Math.PI*i/16));
 assert.deepEqual(v.selected[2],[0,0]);assert.deepEqual(v.selected[14],[0,0]);
});
test('位相を変えた出力と係数の大きさを区別する',()=>{
 const s=M.fourierStart(),a=M.fourierView(s),b=M.fourierView(M.fourier(s,{kind:'phase'}));
 a.selected.forEach((z,i)=>near(Math.hypot(...z),Math.hypot(...b.selected[i])));
 assert.ok(b.error>.4);for(let i=0;i<16;i++)near(b.back[i],.5+Math.cos(4*Math.PI*i/16)+.5*Math.cos(6*Math.PI*i/16));
});
test('選んだ標本の全寄与の和は実際の逆変換値に一致する',()=>{
 let s=M.fourierStart();for(let i=0;i<16;i++){s=M.fourier(s,{kind:'sample',index:i});const v=M.fourierView(s);near(v.terms.reduce((sum,t)=>sum+t.value,0),v.back[i]);}
});
test('全周波数を外すと0、誤った係数の選択は原子的に拒否',()=>{
 let s=M.fourierStart();for(let k=0;k<=8;k++)s=M.fourier(s,{kind:'pair',k});M.fourierView(s).back.forEach(x=>near(x,0));atomic(M.fourier,s,{kind:'pair',k:9});
});
test('FIRと帰還0.6のインパルス応答を独立値で照合',()=>{
 const s=M.filterStart();assert.deepEqual(M.filterView(s).output,[.25,.5,.25,0,0,0,0,0]);
 const y=M.filterView(M.filter(s,{kind:'feedback',value:.6})).output;
 [.25,.65,.64,.384,.2304,.13824,.082944,.0497664].forEach((x,i)=>near(y[i],x));
});
test('過去の値を参照する積と足し算が各出力に一致する',()=>{
 let s=M.filter(M.filterStart(),{kind:'feedback',value:.6});s=M.filter(s,{kind:'input',index:3,value:-1});
 for(let i=0;i<8;i++){const v=M.filterView(M.filter(s,{kind:'sample',index:i}));near(v.terms.reduce((n,t)=>n+t.product,0),v.output[i]);}
 atomic(M.filter,s,{kind:'input',index:8,value:1});atomic(M.filter,s,{kind:'input',index:0,value:NaN});
});
test('8標本では1Hzと7Hzのcosが同じ標本になる',()=>{
 const s=M.samplingStart(),v=M.samplingView(s);assert.equal(v.same,true);v.samples.forEach(x=>near(x.one,x.seven));
 assert.equal(M.samplingView(M.sampling(s,{kind:'rate',value:20})).same,false);
});
test('bit数を変えても時刻と丸め前の標本は変わらない',()=>{
 const s=M.samplingStart(),a=M.samplingView(s),b=M.samplingView(M.sampling(s,{kind:'bits',value:8}));
 assert.equal(b.levels,256);assert.deepEqual(a.samples.map(v=>[v.time,v.one,v.seven]),b.samples.map(v=>[v.time,v.one,v.seven]));
 for(const row of b.samples)assert.ok(Math.abs(row.saved-row.one)<=b.step/2+1e-10);
});
test('標本数を減らすと選択範囲を正しく縮める',()=>{
 let s=M.sampling(M.samplingStart(),{kind:'rate',value:20});s=M.sampling(s,{kind:'sample',index:19});s=M.sampling(s,{kind:'rate',value:8});assert.equal(s.sample,7);atomic(M.sampling,s,{kind:'bits',value:1});
});
test('二値化・膨張・収縮は同じ元画像から独立に処理する',()=>{
 const s=M.imageStart(),sum=a=>a.reduce((x,y)=>x+y,0);assert.equal(sum(M.imageView(s).output),16);
 const d=M.image(s,{kind:'operation',value:'dilate'}),e=M.image(d,{kind:'operation',value:'erode'});
 assert.equal(sum(M.imageView(d).output),36);assert.equal(sum(M.imageView(e).output),4);assert.deepEqual(e.pixels,s.pixels);
});
test('画像の境界は0で補い、度数の元の画素が一致する',()=>{
 const s=M.image(M.imageStart(),{kind:'cell',index:0}),v=M.imageView(s);assert.equal(v.neighbors.filter(n=>n.index===null).length,5);
 assert.equal(v.histogram.reduce((a,b)=>a+b,0),64);assert.equal(v.histogram[1],48);assert.equal(v.histogram[6],16);
 const selected=M.imageView(M.image(s,{kind:'bin',index:6}));assert.equal(selected.matching.length,16);assert.ok(selected.matching.every(i=>s.pixels[i]===200));
});
test('一画素の編集と異常値の拒否',()=>{
 const s=M.imageStart(),next=M.image(s,{kind:'edit',value:0});assert.equal(next.pixels.filter((v,i)=>v!==s.pixels[i]).length,1);atomic(M.image,s,{kind:'edit',value:256});atomic(M.image,s,{kind:'cell',index:-1});
});
test('深度検査ありなら描画順を変えても同じ画像',()=>{
 const s=M.rasterStart(),a=M.rasterView(s),b=M.rasterView(M.raster(s,{kind:'reverse'}));assert.deepEqual(a.image,b.image);assert.equal(a.winner,'手前');
});
test('深度検査なしでは後の面が選択画素を上書きする',()=>{
 const s=M.raster(M.rasterStart(),{kind:'depth'}),a=M.rasterView(s),b=M.rasterView(M.raster(s,{kind:'reverse'}));
 assert.equal(a.winner,'奥');assert.equal(b.winner,'手前');assert.notDeepEqual(a.image,b.image);
});
test('全画素の独立した被覆・深度の記録は描画色と一致',()=>{
 let s=M.rasterStart();for(const depth of [true,false])for(const reverse of [true,false]){
  s={...s,depth,reverse};for(let cell=0;cell<64;cell++){const v=M.rasterView({...s,cell}),rgb=v.image[Math.floor(cell/8)][cell%8],expected=v.winner==='手前'?[60,205,180]:v.winner==='奥'?[180,110,210]:[15,24,34];assert.deepEqual(rgb,expected);}
 }
});
test('nearで全部除かれた場合は背景で、元頂点の変更ではない',()=>{
 const s=M.rasterStart(),v=M.rasterView(M.raster(s,{kind:'near',value:4.5}));assert.equal(v.triangles,0);assert.equal(v.winner,'背景');assert.deepEqual(v.world,M.rasterView(s).world);
 atomic(M.raster,s,{kind:'vertex',index:6});
});
test('光だけの変更では表面の法線を変えない',()=>{
 const s=M.lightStart(),a=M.lightView(s),b=M.lightView(M.light(s,{kind:'light',vector:[1,0,1]}));
 near(Math.hypot(...a.selected.normal),1);assert.deepEqual(a.selected.normal,b.selected.normal);assert.notEqual(a.selected.dot,b.selected.dot);
 near(a.selected.dot,a.selected.normal.reduce((sum,v,i)=>sum+v*a.light[i],0));
});
test('光の倍率では向きが変わらず、0方向は拒否する',()=>{
 const s=M.lightStart(),a=M.lightView(s),b=M.lightView(M.light(s,{kind:'light',vector:[-1,1,2]}));assert.deepEqual(a.points,b.points);atomic(M.light,s,{kind:'light',vector:[0,0,0]});
 assert.equal(M.lightView(M.light(s,{kind:'cell',index:0})).selected.inside,false);
});
test('Bezierの全段を残し、始点・終点と中点が一致する',()=>{
 const s=M.bezierStart(),levels=M.bezierLevels(s.points,.5);assert.deepEqual(levels.map(x=>x.length),[4,3,2,1]);assert.deepEqual(levels.at(-1)[0],[2,1]);
 assert.deepEqual(M.bezierLevels(s.points,0).at(-1)[0],s.points[0]);assert.deepEqual(M.bezierLevels(s.points,1).at(-1)[0],s.points[3]);
});
test('Bezierの点を一つ動かした影響はBernstein係数と一致',()=>{
 const s=M.bezierStart(),next=M.bezier(s,{kind:'move',point:[2,3]}),a=M.bezierLevels(s.points,.5).at(-1)[0],b=M.bezierLevels(next.points,.5).at(-1)[0];near(b[0]-a[0],.375);near(b[1]-a[1],0);assert.deepEqual(next.points[2],s.points[2]);atomic(M.bezier,s,{kind:'move',point:[9,2]});
});
test('DCT全係数の逆変換は元の画素へ戻る',()=>{near(M.dctView(M.dctStart()).error,0,1e-10);});
test('DCだけ残すと全画素が元の平均になる',()=>{
 const s=M.dctStart(),v=M.dctView(M.dct(s,{kind:'dc'}));const mean=s.pixels.flat().reduce((a,b)=>a+b,0)/16;near(mean,130);v.back.flat().forEach(x=>near(x,mean));
});
test('DCTの基底の内積・各画素への寄与を直接和で照合',()=>{
 const s=M.dctStart(),all=Array.from({length:16},(_,i)=>M.dctView({...s,coefficient:i}));
 for(let i=0;i<16;i++)for(let j=0;j<16;j++)near(all[i].basis.reduce((sum,v,k)=>sum+v*all[j].basis[k],0),Number(i===j));
 for(let cell=0;cell<16;cell++)near(all.reduce((sum,v)=>sum+v.contribution[cell],128),s.pixels[Math.floor(cell/4)][cell%4]);
 atomic(M.dct,s,{kind:'select',index:16});
});
test('GPIOの入力bitは出力レジスタを書いても変わらない',()=>{
 const s=M.pinsStart();assert.equal(M.pinsView(s).pin,175);
 const out=M.pins(s,{kind:'bit',key:'output',bit:0});assert.equal(M.pinsView(out).pin,175);
 const dir=M.pins(out,{kind:'bit',key:'direction',bit:0});assert.equal(M.pinsView(dir).pin,174);
});
test('PWMは0を含む10状態、比較0と10とwrapを確認',()=>{
 const s=M.pinsStart();near(M.pinsView(s).duty,.3);assert.equal(M.pinsView(M.pins(s,{kind:'compare',value:0})).wave.reduce((a,b)=>a+b,0),0);
 assert.equal(M.pinsView(M.pins(s,{kind:'compare',value:10})).wave.reduce((a,b)=>a+b,0),10);
 let t=s;for(let i=0;i<10;i++)t=M.pins(t,{kind:'tick'});assert.equal(t.counter,0);atomic(M.pins,s,{kind:'bit',key:'output',bit:8});
});
test('校正は基準点の取得前には適用できない',()=>{const s=M.sensorStart();atomic(M.sensor,s,{kind:'calibrate'});near(M.sensorView(s).voltage,.8);assert.ok(M.sensorView(s).error>4);});
test('二点校正は既知の0℃と50℃を通り、測定器変更では無効',()=>{
 let s=M.sensorStart();for(const temperature of [0,50])s=M.sensor(s,{kind:'reference',temperature});s=M.sensor(s,{kind:'calibrate'});
 assert.ok(Math.abs(M.sensorView(s).error)<.5);
 for(const value of [0,50])near(M.sensorView(M.sensor(s,{kind:'temperature',value})).estimate,value);
 const edited=M.sensor(s,{kind:'hardware',bias:0,gain:1,bits:8});assert.deepEqual(edited.references,{});assert.equal(edited.calibrated,false);
});
test('制御の一歩では要求・飽和・積分の状態を区別する',()=>{
 const s=M.control(M.controlStart(),{kind:'advance',count:1});near(s.time,.05);near(s.plants[0].I,.05);near(s.plants[1].I,0);
 near(s.plants[0].last.u,.6);near(s.plants[1].last.u,.6);near(s.plants[0].x,s.plants[1].x);assert.equal(s.plants[1].last.blocked,true);
 for(const p of s.plants)near(p.last.P+p.last.I+p.last.D,p.last.raw);
});
test('目標や外乱を変えても制御器の記憶を勝手に消さない',()=>{
 const s=M.control(M.controlStart(),{kind:'advance',count:10}),changed=M.control(s,{kind:'target',value:-.5});assert.deepEqual(changed.plants,s.plants);assert.equal(changed.time,s.time);
 const kick=M.control(changed,{kind:'kick',delta:.5});near(kick.plants[0].v,s.plants[0].v+.5);near(kick.plants[0].I,s.plants[0].I);
 atomic(M.control,s,{kind:'advance',count:100});
});
test('制御の再現性と操作量の上限を保つ',()=>{
 const run=()=>{let s=M.controlStart();for(let i=0;i<10;i++)s=M.control(s,{kind:'advance',count:10});return s;};const s=run();assert.deepEqual(run(),s);
 assert.ok(s.history.every(r=>r.plants.every(p=>Math.abs(p.last.u)<=.6&&Number.isFinite(p.x))));
});
test('仕事の誤選択は時刻や残りを変更しない',()=>{const s=M.deadlineStart();atomic(M.deadline,s,{kind:'run',id:'B@0'});assert.equal(M.deadlineView(s).ready[0].id,'A@0');});
test('同じタスクでRMの締切違反とEDFの成功を区別',()=>{
 const run=method=>{let s=M.deadlineStart(method);for(let i=0;i<7;i++)s=M.deadline(s,{kind:'run',id:M.deadlineView(s).ready[0]?.id||'idle'});return s;};
 assert.ok(M.deadlineView(run('RM')).missed.some(j=>j.id==='B@0'));assert.equal(M.deadlineView(run('EDF')).missed.length,0);
});
test('手動選択の20tickを既存の別スケジューラと照合',()=>{
 const tasks=[{name:'A',cost:2,period:5,deadline:5},{name:'B',cost:4,period:7,deadline:7}];
 for(const method of ['RM','EDF']){let s=M.deadlineStart(method);for(let i=0;i<20;i++)s=M.deadline(s,{kind:'run',id:M.deadlineView(s).ready[0]?.id||'idle'});
  assert.deepEqual(s.timeline.map(id=>id.split('@')[0]),K.realTime(tasks,20,method).timeline);atomic(M.deadline,s,{kind:'run',id:'idle'});
 }
});
test('各操作は元の状態を変更せず別の結果を返す',()=>{
 const examples=[[M.fourierStart,M.fourier,{kind:'phase'}],[M.filterStart,M.filter,{kind:'feedback',value:.6}],[M.samplingStart,M.sampling,{kind:'bits',value:8}],[M.imageStart,M.image,{kind:'operation',value:'erode'}],[M.rasterStart,M.raster,{kind:'reverse'}],[M.lightStart,M.light,{kind:'texture'}],[M.bezierStart,M.bezier,{kind:'t',value:.2}],[M.dctStart,M.dct,{kind:'dc'}],[M.pinsStart,M.pins,{kind:'tick'}],[M.sensorStart,M.sensor,{kind:'reference',temperature:0}],[M.controlStart,M.control,{kind:'advance',count:1}],[M.deadlineStart,M.deadline,{kind:'run',id:'A@0'}]];
 for(const [start,reduce,a]of examples){const s=start(),before=structuredClone(s),next=reduce(s,a);assert.deepEqual(s,before);assert.notEqual(s,next);}
});
