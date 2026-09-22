import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {modelModules,browserModules,styles} from '../scripts/modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
const L=CSL,X=L.experiences,A=X.aiDesk,K=L.curriculum,clone=X.clone;
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<e,`${a} ≠ ${b}`);
function atomic(fn,s,a,re){const before=clone(s);assert.throws(()=>fn(s,a),re);assert.deepEqual(s,before);}

test('11単元と専用操作が公開ファイルの読み込み順へ接続されている',()=>{
 for(const file of ['experiences-ai-models','experiences-ai-language-models','experiences-ai-lessons'])assert.ok(modelModules.includes(file),file);
 for(const file of ['experiences-ai-widgets','experiences-ai-decision-widgets','experiences-ai-language-widgets'])assert.ok(browserModules.includes(file),file);
 assert.ok(styles.includes('experiences-ai'));
 for(const [n,kind]of [[122,'prep-desk'],[123,'classifier-desk'],[124,'holdout-desk'],[125,'gradient-desk'],[126,'search-frontier'],[127,'q-step-desk'],[128,'segmentation-desk'],[129,'word-vector-desk'],[130,'dependency-desk'],[131,'attention-desk'],[132,'classification-evidence'],[132,'retrieval-evidence']])assert.ok(X.find('gap-'+n).chapters.some(c=>c.activities.some(a=>a.kind===kind)),n+'/'+kind);
});
test('章で使う実モデル・比較例の入力契約を確認する',async t=>{
 for(let n=122;n<=132;n++)for(const chapter of X.find('gap-'+n).chapters){
  assert.ok(chapter.paragraphs.join('').length>=30,n+'/'+chapter.id);
  for(const [i,a]of chapter.activities.entries())if(['inspect','ledger','timeline','editor','compare'].includes(a.kind))await t.test(n+'/'+chapter.id+'/'+i,async()=>{
   const lab=L.labs.find(l=>l.id===(a.model||'gap-'+n));
   for(const example of a.kind==='compare'?a.examples:[{patch:{}},...(a.examples||[])]){
    const params={...clone(lab.defaults),...a.patch,...example.patch};
    for(const c of lab.controls){if(c.type==='select')assert.ok(c.options.some(o=>o.value===params[c.key]),n+'/'+c.key);if(c.type==='range'){const v=params[c.key];assert.ok(Number.isFinite(v)&&v>=c.min&&v<=c.max,n+'/'+c.key);assert.ok(Math.abs((v-c.min)/c.step-Math.round((v-c.min)/c.step))<1e-7,n+'/'+c.key+' step');}}
    const r=await L.run(lab,params);assert.ok(r.frames.length&&r.frames.every(f=>f.title&&f.explain));
   }
  });
 }
});
test('前処理の補完値・尺度をtrainだけから求め、test編集で変えない',()=>{
 let s=A.prepStart();s=A.prep(s,{kind:'fit',impute:'mean',scale:'standard'});
 assert.equal(s.stats.count,6);assert.equal(s.stats.columns.age.fill,30);assert.equal(s.stats.columns.income.fill,22);assert.deepEqual(s.stats.categories,['A','B']);
 near(s.stats.columns.age.center,30);near(s.stats.columns.age.spread,Math.sqrt(250/6));
 s=A.prep(s,{kind:'apply'});assert.equal(s.output[2].numeric.age.value,0);assert.deepEqual(s.output[6].city,[0,0,1]);
 const stats=clone(s.stats);s=A.prep(s,{kind:'select',index:6});s=A.prep(s,{kind:'edit',age:45,income:2000,city:'D'});assert.deepEqual(s.stats,stats);assert.equal(s.output,null);
 s=A.prep(s,{kind:'apply'});assert.deepEqual(s.output[6].city,[0,0,1]);s=A.prep(s,{kind:'select',index:0});s=A.prep(s,{kind:'edit',age:100,income:10,city:'A'});assert.equal(s.stats,null);
 atomic(A.prep,s,{kind:'apply'},/fit/);atomic(A.prep,s,{kind:'edit',age:Infinity,income:2,city:'A'},/有限/);
});
test('中央値・定数列・trainの選び直しを独立に確認する',()=>{
 const rows=[{age:1,income:5,city:'A',training:true},{age:3,income:5,city:'B',training:true},{age:null,income:5,city:'C',training:false}];
 const st=A.prepFit(rows,'median','minmax');assert.equal(st.columns.age.fill,2);assert.equal(st.columns.income.constant,true);assert.equal(A.prepTransform(rows,st)[2].numeric.age.value,.5);
 const s=A.prep(A.prepStart(),{kind:'fit',impute:'median',scale:'standard'});assert.equal(A.prep(s,{kind:'role',index:6}).stats,null);
 assert.throws(()=>A.prepFit(rows.map(r=>({...r,age:null}))),/観測済み/);
});
test('分類の点を動かしても学習集合は変わらず、木の判断とscoreを読める',()=>{
 const s=A.classifyStart(),before=A.classifyView(s),moved=A.classifyView(A.classify(s,{kind:'point',point:[-1,1]}));assert.deepEqual(before.data,moved.data);
 const logistic=before.terms.reduce((n,t)=>n+t.product,0);near(before.probability,1/(1+Math.exp(-logistic)));
 for(const method of ['tree','forest','svm']){
  const v=A.classifyView(A.classify(s,{kind:'method',value:method}));assert.equal(v.grid.length,144);assert.ok(v.probability>=0&&v.probability<=1);
  for(const row of v.path.filter(r=>r.leaf===undefined))assert.equal(row.left,row.value<=row.limit);
  if(method==='tree')near(v.probability,v.path.at(-1).leaf);if(method==='svm')assert.ok([0,1].includes(v.probability));
 }
 atomic(A.classify,s,{kind:'point',point:[NaN,1]},/有限/);
});
test('testは選択確定前に開けず、後の候補追加で開示済みの事実が消えない',()=>{
 let s=A.validationStart();atomic(A.validation,s,{kind:'reveal'},/確定/);
 s=A.validation(s,{kind:'fit',degree:2,lambda:.1});assert.equal(s.trials[0].test,null);
 atomic(A.validation,s,{kind:'reveal'},/確定/);s=A.validation(s,{kind:'lock'});s=A.validation(s,{kind:'reveal'});
 const rows=A.validationData().test,coeff=s.trials[0].coeff,expected=rows.reduce((n,r)=>n+(coeff.reduce((m,v,i)=>m+v*Math.pow(r.x,i),0)-r.y)**2,0)/rows.length;near(s.trials[0].test,expected);
 s=A.validation(s,{kind:'fit',degree:3,lambda:.2});assert.equal(s.revealed,true);assert.equal(s.locked,null);assert.equal(s.trials[1].test,null);
});
test('一本の連鎖律・独立な有限差分・一回の更新を照合する',()=>{
 let s=A.neuronStart();atomic(A.neuron,s,{kind:'backward'},/順伝播/);atomic(A.neuron,s,{kind:'update',rate:.5},/逆伝播/);
 const v=A.neuronView(s),average=v.terms.reduce((n,t)=>n+t.gradient,0)/4;near(average,v.gradient.W1[0][0]);
 const loss=model=>A.xorData().reduce((n,row)=>{const p=K.mlp.forward(model,row.x).y;return n-row.y*Math.log(p)-(1-row.y)*Math.log(1-p);},0)/4;
 for(let j=0;j<3;j++)for(let i=0;i<2;i++){const plus=clone(s.model),minus=clone(s.model),eps=1e-5;plus.W1[j][i]+=eps;minus.W1[j][i]-=eps;near((loss(plus)-loss(minus))/(2*eps),v.gradient.W1[j][i],1e-7);}
 s=A.neuron(s,{kind:'forward'});s=A.neuron(s,{kind:'backward'});const old=clone(s.model);s=A.neuron(s,{kind:'update',rate:.3});near(s.model.W1[0][0],old.W1[0][0]-.3*average);assert.equal(s.phase,'input');assert.equal(s.iterations,1);
});
test('Aスターの手動候補選択を、別のBellman-Ford計算と照合する',()=>{
 const initial=A.searchStart(),dist=Array(25).fill(Infinity);dist[0]=0;
 for(let round=0;round<24;round++)for(let id=0;id<25;id++)if(!initial.blocked.includes(id))for(const next of A.neighbors(initial,id))dist[next]=Math.min(dist[next],dist[id]+initial.costs[next]);
 for(const mode of ['zero','manhattan']){let s=A.searchStart(mode),count=0;while(!s.done&&count++<100)s=A.search(s,{kind:'expand',id:A.searchView(s).frontier[0].id});assert.equal(s.done,true);assert.equal(s.g[24],dist[24]);const path=A.searchView(s).path;assert.equal(path[0],0);assert.equal(path.at(-1),24);assert.equal(path.slice(1).reduce((n,i)=>n+s.costs[i],0),dist[24]);}
 atomic(A.search,initial,{kind:'expand',id:1},/最小/);
});
test('Qは経験を受けただけでは変わらず、終端の次のQを使わない',()=>{
 let s=A.qStart();s=A.q(s,{kind:'move',action:1});assert.ok(s.Q.flat().every(v=>v===0));s=A.q(s,{kind:'update',alpha:.3,gamma:.9});near(s.Q[0][1],-.009);
 s.position=14;s.Q[15]=[9,9,9,9];s=A.q(s,{kind:'move',action:1});s=A.q(s,{kind:'update',alpha:.5,gamma:1});assert.equal(s.Q[14][1],.5);assert.equal(s.last.future,0);
 const q=clone(s.Q);s=A.q(s,{kind:'restart'});assert.deepEqual(s.Q,q);assert.equal(s.position,0);
});
test('環境の移動ずれでも選択した行動のQを更新し、未更新を飛ばさない',()=>{
 const start=A.qStart();let s=A.q(start,{kind:'move',action:1,actual:2});assert.equal(s.position,4);
 atomic(A.q,s,{kind:'move',action:0},/反映/);atomic(A.q,s,{kind:'restart'},/更新/);
 s=A.q(s,{kind:'update',alpha:1,gamma:0});assert.equal(s.Q[0][1],-.03);assert.equal(s.Q[0][2],0);assert.ok(start.Q.flat().every(v=>v===0));
});
test('自分で置いた単語境界と、全体の最小費用を区別する',()=>{
 let s=A.segmentStart(),v=A.segmentView(s);assert.deepEqual(v.words,['私','は','通信','を','学ぶ']);assert.equal(v.manual.cost,5);assert.equal(v.best.cost,5);
 s=A.segment(s,{kind:'cut',index:3});v=A.segmentView(s);assert.equal(v.manual.cost,13);assert.equal(v.best.cost,5);assert.equal(v.equal,false);
 const noContext=A.segmentView(A.segment(s,{kind:'context'}));assert.equal(noContext.manual.cost,10);
 s=A.segment(A.segmentStart(),{kind:'cut',index:5});assert.equal(A.segmentView(s).manual,null);
 atomic(A.segment,s,{kind:'dictionary',value:'x NOUN -3'},/非負/);
});
test('文書頻度と内積を個別に照合し、BoWが語順を捨てることを確認する',()=>{
 const s=A.wordsStart(),v=A.wordsView(s),j=v.model.vocabulary.indexOf('network');near(v.model.idf[j],Math.log(5/3)+1);assert.deepEqual(v.model.counts.map(r=>r[j]),[1,1,0,0]);
 const reversed=A.wordsView(A.words(s,{kind:'query',value:'data protects network'}));assert.deepEqual(reversed.query,v.query);
 const unknown=A.wordsView(A.words(s,{kind:'query',value:'zzzzunknown'}));assert.equal(unknown.cosine,null);assert.deepEqual(unknown.unknown,['zzzzunknown']);
 near(v.dot,v.terms.reduce((n,t)=>n+t.product,0));
});
test('正解関連の変更は検索順位を変えず、関連0のrecallを未定義にする',()=>{
 let s=A.wordsStart();const rank=A.wordsView(s).ranked.map(r=>[r.id,r.score]);s=A.words(s,{kind:'relevance',index:0});s=A.words(s,{kind:'relevance',index:1});
 const v=A.wordsView(s);assert.deepEqual(v.ranked.map(r=>[r.id,r.score]),rank);assert.equal(v.recall,null);assert.equal(v.ap,null);assert.equal(v.precision,0);
});
test('係り受けは本人が遷移を選び、一つのROOTと各語一つのheadを守る',()=>{
 let s=A.dependencyStart();atomic(A.dependency,s,{kind:'left',label:'nsubj'},/二つ/);
 s=A.dependency(s,{kind:'shift'});atomic(A.dependency,s,{kind:'left',label:'nsubj'},/ROOT/);atomic(A.dependency,s,{kind:'right',label:'root'},/最後/);
 s=A.dependency(s,{kind:'shift'});s=A.dependency(s,{kind:'left',label:'nsubj'});s=A.dependency(s,{kind:'shift'});s=A.dependency(s,{kind:'right',label:'obj'});s=A.dependency(s,{kind:'right',label:'root'});
 assert.deepEqual(s.arcs,[{head:2,dependent:1,label:'nsubj'},{head:2,dependent:3,label:'obj'},{head:0,dependent:2,label:'root'}]);assert.deepEqual(s.stack,[0]);assert.deepEqual(s.buffer,[]);
});
test('AttentionでQとKとVの役割を独立に確かめる',()=>{
 const initial=A.attentionStart(),v=A.attentionView(initial),weight=Math.exp(1/Math.sqrt(2))/(Math.exp(1/Math.sqrt(2))+1);near(v.weights[0],weight);
 let s=A.attention(initial,{kind:'query',vector:[0,0]});assert.deepEqual(A.attentionView(s).weights,[.5,.5]);assert.deepEqual(A.attentionView(s).output,[1,2]);
 const weights=A.attentionView(s).weights;s=A.attention(s,{kind:'value',vector:[8,8]});assert.deepEqual(A.attentionView(s).weights,weights);
 s=A.attention(s,{kind:'mask'});assert.deepEqual(A.attentionView(s).weights,[1,0]);assert.deepEqual(A.attentionView(s).output,[8,8]);
 atomic(A.attention,s,{kind:'query',vector:[Infinity,0]},/有限/);
});
test('混同行列の数に実例が対応し、test修正は学習文を変えない',()=>{
 const s=A.evaluationStart(),v=A.evaluationView(s);assert.deepEqual(v.matrix,[[2,0],[1,1]]);
 const cell=A.evaluationView(A.evaluation(s,{kind:'cell',value:['food','net']}));assert.equal(cell.filtered.length,1);assert.equal(cell.filtered[0].id,3);
 const changed=A.evaluation(s,{kind:'edit',text:'fresh fruit',label:'food'});assert.deepEqual(changed.training,s.training);assert.deepEqual(A.evaluationView(changed).matrix,[[2,0],[0,2]]);
 assert.equal(v.scores[1].precision,1);assert.equal(v.scores[1].recall,.5);
});
test('公開用の追加ファイルは外部通信・永続保存・任意コード実行を増やさない',async()=>{
 for(const file of ['models','language-models','widgets','decision-widgets','language-widgets','lessons']){
  const text=await readFile(new URL('../src/experiences-ai-'+file+'.js',import.meta.url),'utf8');assert.doesNotMatch(text,/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bfetch\s*\(|\bnew\s+Function\b|\beval\s*\(/,file);
 }
});
