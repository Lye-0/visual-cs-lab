import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {modelModules} from '../scripts/modules.mjs';
for(const name of modelModules) await import('../src/'+name+'.js');
const L=CSL,K=L.curriculum,X=L.experiences;
const run=(id,p={})=>L.run(L.labs.find(l=>l.id===id),p);
const activity=(id,chapter)=>X.find(id).chapters.find(c=>c.id===chapter).activities[0];
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('cancellation input changes x and exposes the lost difference without decimal display rounding',async()=>{
 const a=await run('gap-009',{mode:'cancellation',magnitude:2}),b=await run('gap-009',{mode:'cancellation',magnitude:10});
 assert.notEqual(a.metrics['主な計算値'],b.metrics['主な計算値']);
 assert.equal(Number(b.frames[0].visual.rows[0][1]),0);assert.ok(Number(b.frames[0].visual.rows[1][1])>0);
 assert.deepEqual(activity('gap-009','cancellation').keys,['magnitude']);
});
test('interpolation honors the middle point and has no iteration claim',async()=>{
 const r=await run('gap-009',{mode:'interpolation',pointHeight:3});
 assert.deepEqual(r.frames[1].visual.rows,[[0,0,1],[1,1,3],[2,2,1]]);close(r.metrics['主な計算値'],2.5);
 assert.ok(!('反復指定'in r.metrics));assert.deepEqual(activity('gap-009','interpolation').keys,['pointHeight']);
});
test('regression and factor chapters do not offer an unused standardize switch; PCA retains it',()=>{
 assert.ok(!activity('gap-017','regression').keys.includes('standardize'));assert.ok(!activity('gap-017','factor').keys.includes('standardize'));assert.ok(activity('gap-017','pca').keys.includes('standardize'));
});
test('displayed SVD factors reconstruct the same matrix, including rank-deficient input',async()=>{
 for(const data of ['1,2;2,1;3,4','1,2;2,4;3,6']){
 const r=await run('gap-017',{mode:'svd',data}),a=r.frames[0].visual.matrix,vt=r.frames[1].visual.matrix,sigma=r.frames[2].visual.matrix,u=r.frames[3].visual.matrix;
 const rebuilt=K.multiply(K.multiply(u,sigma),vt);for(let i=0;i<a.length;i++)for(let j=0;j<a[0].length;j++)close(rebuilt[i][j],a[i][j]);
 }
});
test('chain-rule factors are evaluated at the same point and multiply to the derivative',async()=>{
 for(const x of [-1,0,.5,1.5]){const r=await run('gap-004',{fn:'composite',x}),v=r.frames[1].visual.rows[0];close(v[0],2*x);close(v[1],Math.cos(x*x));close(v[2],2*x*Math.cos(x*x));}
});
test('substitution and parts retain derivation and evaluate changed and reversed endpoints',async()=>{
 for(const fn of ['substitution','parts'])for(const [a,end]of [[0,2],[-1,2],[2,-1]]){
 const r=await run('gap-005',{fn,a,end,n:40,method:'simpson'}),F=fn==='substitution'?x=>Math.sin(x*x):x=>(x-1)*Math.exp(x);
 close(r.metrics['厳密値'],F(end)-F(a));assert.match(JSON.stringify(r.frames.slice(0,2)),fn==='substitution'?/du=2x dx/:/∫u dv = uv/);
 }
});
test('eigenvector model plots use spatial axis labels',async()=>{const r=await run('gap-003');for(const f of r.frames.filter(f=>f.visual.kind==='plot')){assert.equal(f.visual.xLabel,'x座標');assert.equal(f.visual.yLabel,'y座標');}});
test('Viterbi branch rows independently agree with register XOR and accumulated Hamming distance',async()=>{
 const r=await run('gap-032',{mode:'convolutional',message:'1011',errors:1});let rows=0,discarded=0;
 for(const f of r.frames.filter(f=>f.visual.headers?.includes('枝距離')))for(const [st,u,dest,expected,received,previous,d,total,choice]of f.visual.rows){
 const m1=st>>1,m2=st&1;assert.equal(expected,String(u^m1^m2)+(u^m2));assert.equal(dest,2*u+m1);assert.equal(d,[...expected].reduce((n,b,i)=>n+(b!==received[i]),0));assert.equal(total,previous+d);rows++;if(choice==='棄却')discarded++;
 }
 assert.ok(rows>10&&discarded>0);assert.equal(r.metrics['復号した情報'],'1011');
});
test('binary reads preserve bytes without pretending to decode text',async()=>{
 const p={text:'日本語ABC',chunk:2},binary=await run('gap-042',{...p,mode:'binary-io'}),text=await run('gap-042',{...p,mode:'text-io'});
 assert.equal(binary.metrics['読み取ったバイト'],[...new TextEncoder().encode(p.text)].join(', '));assert.equal(binary.metrics['文字への復号'],'行わない');assert.equal(text.metrics['ストリーム復元'],p.text);assert.notEqual(text.metrics['単独復号の連結'],p.text);
});
test('nullable input selects the guarded branch and rejects values outside this numerical example',async()=>{
 assert.equal((await run('gap-039',{mode:'nullable',value:'null'})).metrics['出力'],'値がないため計算しない');
 assert.equal((await run('gap-039',{mode:'nullable',value:'5'})).metrics['出力'],'6');await assert.rejects(()=>run('gap-039',{mode:'nullable',value:'"5"'}));
});
test('immutable array length changes while copy and alias still have separate semantics',async()=>{
 const small=await run('gap-040',{mode:'immutable',n:1,start:3}),large=await run('gap-040',{mode:'immutable',n:5,start:3});
 assert.notEqual(small.metrics['出力'],large.metrics['出力']);assert.match(large.metrics['出力'],/99/);assert.match(large.metrics['出力'],/42/);
});
test('static analysis editor patch is the exact program inspected, including editable unreachable code',async()=>{
 for(const chapter of ['resolve','unreached']){const a=activity('gap-053',chapter),r=await run('gap-053',a.patch);assert.equal(a.patch.sample,'none');assert.equal(r.frames[0].visual.code.join('\n'),a.patch.source);}
 const a=activity('gap-053','unreached'),bad=await run('gap-053',a.patch),fixed=await run('gap-053',{...a.patch,source:a.patch.source.replace('missing','x')});assert.notDeepEqual(bad.metrics,fixed.metrics);
});
test('relocation values and explanations distinguish absolute addresses from PC-relative differences',async()=>{
 const a=await run('gap-056',{base:512,relocation:'absolute'}),b=await run('gap-056',{base:512,relocation:'relative'});
 assert.equal(a.frames[2].visual.rows[0][4],524);assert.equal(b.frames[2].visual.rows[0][4],8);assert.match(a.frames[2].explain,/512/);assert.match(b.frames[2].explain,/PC相対/);
});
test('mark-sweep does not explain its result with forwarding pointers',async()=>{const r=await run('gap-058',{mode:'mark',dropRoot:true});assert.equal(r.metrics['回収数'],4);assert.match(r.frames.at(-1).explain,/移動しない/);assert.ok(r.frames.at(-1).visual.rows.every(row=>row[3]==='移動なし'));});
test('proof modes report only their own proposition and evidence',async()=>{
 const r=await run('gap-019',{mode:'contrapositive'});assert.equal(r.metrics['証明した命題'],'n²が奇数ならnは奇数');assert.match(JSON.stringify(r.frames),/2\(2k²\)/);assert.ok(!('候補の値'in r.metrics));assert.ok(!('候補の値'in(await run('gap-019',{mode:'contradiction'})).metrics));
});
test('backtracking keeps conflicts and undo steps while preserving all solutions and one-based coordinates',async()=>{
 const r=await run('gap-050',{mode:'backtracking',queens:4});assert.equal(r.metrics['解の数'],2);assert.equal(r.metrics['制約違反で捨てた候補'],44);assert.ok(r.frames.some(f=>f.title.includes('棄却')));assert.ok(r.frames.some(f=>f.title.includes('取り消す')));assert.ok(!r.frames.some(f=>/行0|列0/.test(f.title)));assert.deepEqual(r.frames.at(-1).visual.rows.map(row=>row[1]),['2, 4, 1, 3','3, 1, 4, 2']);
});
test('matching records the alternating path and replacement, and finishes with unique endpoints',async()=>{
 const r=await run('gap-049',{method:'matching',edges:'A X;A Y;B X;C Y;C Z'});assert.equal(r.metrics['マッチング数'],3);assert.match(JSON.stringify(r.frames),/B → X → A → Y/);assert.match(JSON.stringify(r.frames),/A−Xを外し/);assert.equal(r.metrics['対応'],'B−X, A−Y, C−Z');
});
test('KMP retains overlapping matches and makes the full-match fallback observable',async()=>{
 const r=await run('gap-051',{mode:'kmp',text:'ABABABAC',pattern:'ABA'});assert.equal(r.metrics['一致位置'],'0, 2, 4');assert.ok(r.frames.some(f=>f.title.includes('一致長3から1')));
});
test('array capacity fits inserted values, while dynamic array still accounts for copying',async()=>{
 for(const structure of ['array','dynamic']){const r=await run('gap-043',{structure});assert.ok(r.metrics['容量']>=r.metrics['値'].split(',').length);assert.equal(r.metrics['再確保コピー'],structure==='dynamic'?4:0);}
});
test('collision chapter retains both keys and names lookup cost instead of calling it a position',async()=>{
 const p=activity('gap-046','collision').patch;
 for(const strategy of ['linear','chaining']){const r=await run('gap-046',{...p,strategy});assert.equal(r.metrics['登録数'],5);assert.ok(!('検索した位置'in r.metrics));assert.equal(r.metrics[strategy==='linear'?'調べたスロット数':'比較したキー数'],strategy==='linear'?4:2);assert.ok(!r.frames.some(f=>f.title.endsWith('を削除する')));}
});
test('corrected linear-code equations recompute parity from displayed bits and retain the old syndrome separately',async()=>{
 const local={h:x=>String(x),visualize:()=>'',app:{}};
 runInNewContext(await readFile(new URL('../src/notes-visuals.js',import.meta.url),'utf8'),{CSL:local});
 const H=[[1,1,1,0,1,0,0],[0,1,1,1,0,1,0],[1,1,0,1,0,0,1]],v={type:'lesson-linear',phase:'correct',corrected:[1,0,1,1,0,0,0],syndrome:[1,1,1],H,G:[[1,0,0,0,1,1,1]]};
 const html=local.visualize(v);assert.equal((html.match(/<strong>= 0<\/strong>/g)||[]).length,3);assert.match(html,/訂正前のシンドローム 111/);assert.match(html,/訂正後のビット/);
});
test('eigen widget fits both vector endpoints with the same scale at every allowed coordinate corner',async()=>{
 const widgets=new Map(),events=new Map(),nodes=new Map(),node=key=>{if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:''});return nodes.get(key);};
 const e={format:x=>String(x),html:{button:()=>'',table:()=>'',formula:()=>''},models:{linear:()=>({})},registerWidget:(key,fn)=>widgets.set(key,fn),scope:()=>({id:'e',on:(target,event,fn)=>events.set(target===node('form')?'form:'+event:event,fn)}),liveForm:()=>{}};
 const local={h:x=>String(x),experiences:e,curriculum:{dot:(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0)}};
 runInNewContext(await readFile(new URL('../src/experiences-geometry.js',import.meta.url),'utf8'),{CSL:local});
 const root={innerHTML:'',querySelector:node};widgets.get('vectors')(root,{variant:'eigen'},{completed:new Set()});
 for(const x of [-4,0,4])for(const y of [-4,0,4]){
  events.get('form:submit')({preventDefault(){},target:{reportValidity:()=>true,elements:{w0:{value:x},w1:{value:y}}}});
  const html=node('[data-ex-plane]').innerHTML,points=[...html.matchAll(/class="ex-vector" d="M300 220L([\d.e+-]+) ([\d.e+-]+)"/g)].map(m=>[+m[1],+m[2]]);assert.equal(points.length,2);for(const [px,py]of points){assert.ok(px>=120&&px<=480);assert.ok(py>=40&&py<=400);}
  const scale=e.models.vectorScale([[x,y],[3*x+y,x+3*y]]);close(points[0][0],300+scale*x);close(points[1][0],300+scale*(3*x+y));
 }
});
test('matrix coordinate editor calls its vector input x, matching the diagram',async()=>{
 const widgets=new Map(),nodes=new Map(),node=k=>{if(!nodes.has(k))nodes.set(k,{innerHTML:''});return nodes.get(k);};const e={format:String,html:{button:()=>'',table:()=>'',formula:()=>''},models:{linear:()=>({})},registerWidget:(k,f)=>widgets.set(k,f),scope:()=>({id:'m',on(){}}),liveForm(){}};
 runInNewContext(await readFile(new URL('../src/experiences-geometry.js',import.meta.url),'utf8'),{CSL:{h:String,experiences:e}});widgets.get('vectors')({innerHTML:'',querySelector:node},{variant:'matrix'},{completed:new Set()});assert.match(node('[data-ex-coordinates]').innerHTML,/入力 x/);assert.doesNotMatch(node('[data-ex-coordinates]').innerHTML,/目標 w/);
});
test('endian input changes only its documented leading byte before byte-order reversal',async()=>{
 const a=await run('gap-034',{mode:'endian',value:42}),b=await run('gap-034',{mode:'endian',value:43});assert.equal(a.metrics['32bitの値'],'0x2a0f1234');assert.equal(b.metrics['32bitの値'],'0x2b0f1234');assert.equal(b.metrics['little endian'],'52,18,15,43');
});
test('guard demonstration reports its checks and fallback without inventing fewer VM operations',async()=>{
 const r=await run('gap-057',{strategy:'jit',changeType:true,repeat:6});assert.equal(r.metrics['ガード回数'],6);assert.equal(r.metrics['ガード失敗'],3);assert.match(activity('gap-057','strategies').examples[2].reason,/演算を減らす最適化は行いません/);
});

