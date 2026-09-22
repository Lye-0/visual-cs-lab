/* ML-specific layouts. Only form identity, undo and lifecycle are shared with
 * the existing workspace host. No universal player is required by these pages. */
(() => {
'use strict';
const L=CSL,X=L.experiences,A=X.aiDesk,S=X.securityDesk,h=L.h,f=X.format;
if(typeof document==='undefined')return;
const {b,p,box,table}=S.ui;
A.ui={b,p,box,table,rawTable:(heads,rows)=>`<div class="ex-ai-table"><table><thead><tr>${heads.map(t=>'<th scope="col">'+h(t)+'</th>').join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map(t=>'<td>'+t+'</td>').join('')+'</tr>').join('')}</tbody></table>`};
A.mount=(root,current,config)=>{root.classList.add('ex-ai-workspace');return S.mount(root,current,config);};
const raw=A.ui.rawTable;
A.plot=(series,{interactive=false,area=[-2,2,-2,2],title='値を対応させた図'}={})=>{
 const [xmin,xmax,ymin,ymax]=area,px=x=>40+340*(x-xmin)/(xmax-xmin),py=y=>370-340*(y-ymin)/(ymax-ymin);
 return `<svg class="ex-ai-plot" viewBox="0 0 420 420" ${interactive?'data-ai-plane tabindex="0" role="group" aria-label="調べる点。クリックまたは矢印キーで移動"':'role="img"'}><title>${h(title)}</title><rect x="40" y="30" width="340" height="340" class="ai-plot-bg"/><path d="M40 370H380 M40 370V30" class="ai-axis"/><text x="390" y="377">x</text><text x="26" y="22">y</text>${[0,1,2,3,4].map(i=>{const x=xmin+(xmax-xmin)*i/4,y=ymin+(ymax-ymin)*i/4;return `<text class="ai-tick" x="${px(x)}" y="395">${h(f(x,2))}</text><text class="ai-tick" x="21" y="${py(y)+4}">${h(f(y,2))}</text>`;}).join('')}${series.map(s=>s.cells?s.points.map(pt=>`<rect x="${px(pt.x)-14.2}" y="${py(pt.y)-14.2}" width="28.5" height="28.5" class="ai-zone ai-class-${pt.label}"/>`).join(''):s.line?`<polyline class="${s.className}" points="${s.points.map(pt=>px(pt.x)+','+py(pt.y)).join(' ')}"/>`:s.points.map(pt=>`<${s.square?'rect':'circle'} ${s.square?`x="${px(pt.x)-5}" y="${py(pt.y)-5}" width="10" height="10"`:`cx="${px(pt.x)}" cy="${py(pt.y)}" r="${s.radius||5}"`} class="${s.className||('ai-point ai-class-'+pt.label)}"/>`).join('')).join('')}</svg>`;
};
X.registerWidget('prep-desk',(root,a,c)=>A.mount(root,c,{
 start:A.prepStart,reduce:A.prep,
 instruction:'欠損している行3を選び、「trainだけでfit」→「全行へ同じ変換」を押します。次にtestの行7のincomeを変更しても、補完値が変わらないことを確かめてください。',
 action:(code,fields)=>{
  const [kind,n]=code.split(':');if(kind==='select'||kind==='role')return {kind,index:Number(n),fresh:true};
  if(kind==='edit')return {kind,age:fields.get('age-null')?null:fields.get('age'),income:fields.get('income-null')?null:fields.get('income'),city:fields.get('city')};
  return kind==='fit'?{kind,impute:fields.get('impute'),scale:fields.get('scale')}:{kind};
 },
 render:(s,{field})=>{
  const row=s.rows[s.selected],result=s.output?.[s.selected];
  return box('元の表：学習に使う行と評価に残す行',raw(['行','用途を変更','age','income','city'],s.rows.map((r,i)=>[b('行'+(i+1),'select:'+i,`aria-pressed="${s.selected===i}"`),b(r.training?'train':'test','role:'+i),h(r.age===null?'欠損':r.age),h(r.income===null?'欠損':r.income),h(r.city)])))+`<div class="ex-ai-two">${box('行'+(s.selected+1)+'の値を編集',`<form class="ex-ai-form">${field('age','age',row.age??0,{min:-10000,max:10000,step:'any'})}${field('age-null','ageを欠損にする',row.age===null,{type:'checkbox'})}${field('income','income',row.income??0,{min:-10000,max:10000,step:'any'})}${field('income-null','incomeを欠損にする',row.income===null,{type:'checkbox'})}${field('city','city',row.city)}${b('この行へ反映','edit')}</form>`)}${box('値を学ぶ工程と適用する工程',`<form class="ex-ai-form">${field('impute','補完する値','mean',{choices:[['mean','平均'],['median','中央値']]})}${field('scale','尺度','standard',{choices:[['standard','標準化'],['minmax','min-max']]})}${b('trainだけでfit','fit')}${b('全行へ同じ変換','apply')}</form>`+p(s.stats?'fit集合は'+s.stats.count+'行。カテゴリ辞書：'+s.stats.categories.join(', '):'まだfitしていません。入力しただけで統計値を作り直しません。'))}</div>`+box('選んだ値と、変換式を対応させる',s.stats?table(['列','元の値','補完値','中心','尺度','適用後'],['age','income'].map(key=>{const st=s.stats.columns[key];return [key,row[key]===null?'欠損':row[key],f(st.fill),f(st.center),f(st.spread),result?f(result.numeric[key].value):'まだ適用していない'];}))+p('変換後 = (欠損なら補完した値 − 中心) ÷ 尺度。尺度0の列は割る値を1として0へ写します。'):p('fitすると、式に使う数値がここへ固定されます。'))+(s.output?box('同じ変換を適用した表',table(['行','用途','age','income','カテゴリ '+s.stats.categories.join(',')+', UNK'],s.output.map((r,i)=>[i+1,s.rows[i].training?'train':'test',f(r.numeric.age.value),f(r.numeric.income.value),r.city.join(', ')]))):'')+p('固定した架空データの前処理です。fitとtransformは別操作です。外れ値抑制の前提と漏れの反例は次の章で比べます。');
 }
}));
X.registerWidget('classifier-desk',(root,a,c)=>{
 const ui=A.mount(root,c,{
  start:A.classifyStart,reduce:A.classify,
  instruction:'まず同じXOR型の点でロジスティック回帰と木を比較します。図をクリックするか矢印キーで調べる点を動かし、その判定に使った値を右側で読みます。',
  action:(code,fields)=>{const [kind,value]=code.split(':');return kind==='point'?{kind,point:[fields.get('x'),fields.get('y')],fresh:true}:{kind,value};},
  render:(s,{field})=>{
   const v=A.classifyView(s),score=v.terms.reduce((n,t)=>n+t.product,0);
   const explanation=v.terms.length?table(['項','重み','入力（標準化後）','積'],v.terms.map((t,i)=>[i?'特徴'+i:'切片',f(t.w),f(t.x),f(t.product)]))+p('score = '+f(score)+(s.method==='logistic'?'、sigmoid(score) = '+f(v.probability):'。scoreが0以上なら1、それ未満なら0。この表示値は確率ではありません。')):table(['比較する特徴','点の値','境界','進む側'],v.path.map(t=>t.leaf!==undefined?['葉の1の割合',f(t.leaf),'この葉の学習点 '+t.count,'到着']:[t.feature===0?'x':'y',f(t.value),f(t.limit),t.left?'以下なので左':'超えるので右']));
   return `<div class="ex-actions">${[['logistic','ロジスティック回帰'],['tree','決定木'],['forest','5本のForest'],['svm','線形SVM']].map(([id,label])=>b(label,'method:'+id,`aria-pressed="${s.method===id}"`)).join('')}</div><div class="ex-actions">${[['linear','直線型'],['xor','XOR型'],['circle','円型']].map(([id,label])=>b(label,'dataset:'+id,`aria-pressed="${s.dataset===id}"`)).join('')}</div><div class="ex-ai-two">${box('●と□は学習点、十字の位置が問い合わせ',A.plot([{cells:true,points:v.grid},{points:v.data.filter(d=>!d.y).map(d=>({x:d.x[0],y:d.x[1]})),className:'ai-point ai-class-0'},{square:true,points:v.data.filter(d=>d.y).map(d=>({x:d.x[0],y:d.x[1]})),className:'ai-point ai-class-1'},{points:[{x:s.point[0],y:s.point[1]}],className:'ai-query',radius:9}],{interactive:true,title:'48点の学習例と分類境界。縁取りの大きな円が問い合わせ点です。'})+`<form class="ex-ai-form">${field('x','調べるx',s.point[0],{min:-2,max:2,step:'any'})}${field('y','調べるy',s.point[1],{min:-2,max:2,step:'any'})}${b('数値で点を動かす','point')}</form>`)}${box('今回の判定：'+Number(v.probability>=.5),p(s.method==='forest'?'Forest全体は5本の葉の割合の平均 '+f(v.probability)+'。以下は最初の木だけの経路で、これだけが全体の説明ではありません。':'学習点上の正解率 '+f(v.trainAccuracy)+'。未知データ上の性能ではありません。')+explanation)}</div>`+p('淡い背景は12×12地点の判定を塗った近似図です。境界の正確な位置は数値と判断規則で読みます。例を変えたときは各方式を同じ条件で学習し直します。');
  }
 });
 ui.scope.on(root,'click',e=>{
  const svg=e.target.closest('[data-ai-plane]');if(!svg||e.button!==0)return;
  const matrix=svg.getScreenCTM();if(!matrix)return;const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const q=pt.matrixTransform(matrix.inverse());if(q.x<40||q.x>380||q.y<30||q.y>370)return;
  e.preventDefault();void ui.apply({kind:'point',point:[(q.x-40)/85-2,(370-q.y)/85-2],fresh:true}).then(()=>root.querySelector('[data-ai-plane]')?.focus({preventScroll:true}));
 });
 ui.scope.on(root,'keydown',e=>{
  if(!e.target.matches('[data-ai-plane]')||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();e.stopImmediatePropagation();const pt=ui.state().point.slice(),axis=['ArrowLeft','ArrowRight'].includes(e.key)?0:1;pt[axis]=Math.max(-2,Math.min(2,pt[axis]+(['ArrowLeft','ArrowDown'].includes(e.key)?-.1:.1)));
  void ui.apply({kind:'point',point:pt,fresh:true}).then(()=>root.querySelector('[data-ai-plane]')?.focus({preventScroll:true}));
 });
});
X.registerWidget('holdout-desk',(root,a,c)=>{
 let seen=false;
 return A.mount(root,c,{
  start:A.validationStart,reduce:A.validation,
  instruction:'次数を変えて二つ以上学習し、trainとvalidationの誤差で候補を選びます。「この候補に確定」を押してから、まだ見ていないtestを開いてください。',
  action:(code,fields)=>{const [kind,i]=code.split(':');return kind==='fit'?{kind,degree:fields.get('degree'),lambda:fields.get('lambda')}:kind==='select'?{kind,index:Number(i)}:{kind};},
  render:(s,{field})=>{
   seen=seen||s.revealed;const d=A.validationData(),trial=s.selected===null?null:s.trials[s.selected],curve=trial?Array.from({length:81},(_,i)=>{const x=-1+i/40;return {x,y:A.polynomial(trial.coeff,x)};}):[];
   const visible=[...d.train,...d.validation,...(s.revealed?d.test:[]),...curve],max=Math.max(1.5,...visible.map(p=>Math.abs(p.y)))*1.1;
   return `<div class="ex-ai-split-labels"><span>train 10点：係数を学ぶ</span><span>validation 5点：候補を選ぶ</span><span>test 5点：確定後に評価</span></div><form class="ex-ai-form">${field('degree','多項式の次数',2,{min:1,max:5})}${field('lambda','正則化λ',.1,{min:0,max:5,step:'any'})}${b('この条件で学習','fit')}</form>`+box('候補を比較して選ぶ',raw(['候補','次数・λ','train MSE','validation MSE','test MSE'],s.trials.map((t,i)=>[b('候補'+(i+1),'select:'+i,`aria-pressed="${s.selected===i}"`),h(t.degree+' / '+f(t.lambda)),h(f(t.train)),h(f(t.validation)),t.test===null?'未開示':h(f(t.test))])))+`<div class="ex-actions">${b('この候補に確定','lock')}${b('testを開示','reveal')}</div>`+p(seen?'この固定testは一度見ています。再選択やリセットをしても、独立した最終評価用には戻りません。':'testは係数の計算にも候補選択にも使っていません。')+box('選んだ曲線と、その点の役割',A.plot([{points:d.train,className:'ai-train'},{points:d.validation,square:true,className:'ai-validation'},{points:s.revealed?d.test:[],className:'ai-test'},{line:true,points:curve,className:'ai-fit'}],{area:[-1,1,-max,max],title:'丸はtrain、四角はvalidation、開示したtestは縁取りの丸。実線は選んだ多項式。'})+p('MSEは各点の (予測−観測)² の平均です。曲線の形だけでなく、別の点に対する誤差を比べます。'));
  }
 });
});
X.registerWidget('gradient-desk',(root,a,c)=>A.mount(root,c,{
 start:A.neuronStart,reduce:A.neuron,
 instruction:'入力を選び「順伝播」を押します。次に一本の重みを選び「逆伝播」で損失までの積を読み、「一回更新」で旧値・勾配・新値を比べてください。',
 action:(code,fields)=>{
  const [kind,j,i]=code.split(':');if(kind==='select')return {kind,example:Number(j)};if(kind==='weight')return {kind,unit:Number(j),feature:Number(i),fresh:true};
  return kind==='edit'?{kind,value:fields.get('weight')}:kind==='update'?{kind,rate:fields.get('rate')}:{kind};
 },
 render:(s,{field})=>{
  const v=A.neuronView(s),computed=s.phase!=='input';
  const diagram=`<svg class="ex-ai-network" viewBox="0 0 560 270" role="img"><title>選んだ入力と重みを通る道。値は現在の順伝播に対応します。</title>${[0,1].flatMap(i=>[0,1,2].map(j=>`<line x1="60" y1="${80+i*100}" x2="270" y2="${45+j*85}" class="ai-wire ${i===s.feature&&j===s.unit?'selected':''}"/>`)).join('')}${[0,1,2].map(j=>`<line x1="270" y1="${45+j*85}" x2="500" y2="130" class="ai-wire ${j===s.unit?'selected':''}"/>`).join('')}${[0,1].map(i=>`<circle cx="60" cy="${80+i*100}" r="24" class="ai-node"/><text x="60" y="${85+i*100}" text-anchor="middle">${v.selected.x[i]}</text>`).join('')}${[0,1,2].map(j=>`<circle cx="270" cy="${45+j*85}" r="29" class="ai-node"/><text x="270" y="${49+j*85}" text-anchor="middle">${computed?h(f(v.forward.h[j],2)):'h'+j}</text>`).join('')}<circle cx="500" cy="130" r="32" class="ai-node"/><text x="500" y="134" text-anchor="middle">${computed?h(f(v.forward.y,3)):'出力'}</text></svg>`;
  return `<div class="ex-actions">${A.xorData().map((d,i)=>b('入力 '+d.x.join(',')+' → 正解'+d.y,'select:'+i,`aria-pressed="${s.example===i}"`)).join('')}</div>`+box('2入力 → tanh 3個 → sigmoid 1個',diagram)+`<div class="ex-actions">${[0,1,2].flatMap(j=>[0,1].map(i=>b('入力'+i+'→隠れ'+j,'weight:'+j+':'+i,`aria-pressed="${j===s.unit&&i===s.feature}"`))).join('')}</div><form class="ex-ai-form">${field('weight','選んだ重みW1['+s.unit+']['+s.feature+']',s.model.W1[s.unit][s.feature],{min:-5,max:5,step:'any'})}${b('重みを直接変更','edit')}${field('rate','更新の学習率',.5,{min:.01,max:1,step:'any'})}</form><div class="ex-actions">${b('順伝播を計算','forward')}${b('逆伝播を計算','backward')}${b('一回だけ重みを更新','update')}</div>`+(computed?box('選んだ入力の途中計算',table(['段階','値'],[['入力',v.selected.x.join(', ')],['重み付き和z',v.forward.z.map(x=>f(x)).join(', ')],['tanh(z)',v.forward.h.map(x=>f(x)).join(', ')],['出力score',f(v.forward.score)],['sigmoid',f(v.forward.y)],['正解',v.selected.y]])):p('重みを変えたら、現在の値で順伝播を計算し直します。'))+(s.phase==='backward'?box('選んだ重みへ届く連鎖律：4例の平均',table(['入力','出力−正解','次層の重み','tanhの微分','入力値','一例の積'],v.terms.map(t=>[t.x.join(','),f(t.delta),f(t.w),f(t.local),t.input,f(t.gradient)]))+p('batch勾配 = この4行の積の平均 = '+f(v.gradient.W1[s.unit][s.feature])+ '。損失はbatch二値交差エントロピーです。')):'')+(s.last?box('更新前後を残す',p('W1['+s.last.unit+']['+s.last.feature+']：'+f(s.last.before)+' − '+f(s.last.rate)+' × '+f(s.last.gradient)+' = '+f(s.last.after))+p('batch損失：'+f(s.last.lossBefore)+' → '+f(s.last.lossAfter)+ '。更新回数 '+s.iterations)):'')+p('XORの4例だけの小さな実学習です。自動再生せず、入力の値、微分の因子、一回の更新をそれぞれ読みます。');
 }
}));
})();
