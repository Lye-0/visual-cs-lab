/* Individually operated ML objects. Local toy data, no network or storage.
 * Transitions validate before committing; failed actions never mutate input. */
(() => {
'use strict';
const L=CSL,X=L.experiences,K=L.curriculum,A=X.aiDesk={};
const copy=A.copy=X.clone;
A.number=(v,min,max,label='値')=>{if(!Number.isFinite(v)||v<min||v>max)throw Error(label+'は'+min+'〜'+max+'の有限な数です。');return v;};
A.integer=(v,min,max,label='番号')=>{A.number(v,min,max,label);if(!Number.isInteger(v))throw Error(label+'は整数です。');return v;};
A.choice=(v,values,label='対象')=>{if(!values.includes(v))throw Error(label+'を選んでください。');return v;};
A.begin=s=>{if(s.log.length>=180)throw Error('この小例は180操作までです。最初から試してください。');return copy(s);};
A.note=(s,text)=>{s.log.push(text);return s;};
const {number:num,integer:int,choice,begin,note}=A;
const mean=values=>values.reduce((n,v)=>n+v,0)/values.length;
A.prepStart=()=>({rows:JSON.parse(L.labs.find(l=>l.id==='gap-122').defaults.data).map((r,i)=>({...r,training:i<6})),selected:2,stats:null,output:null,log:[]});
A.prepFit=(rows,impute='mean',scale='standard')=>{
 choice(impute,['mean','median']);choice(scale,['standard','minmax']);
 const fit=rows.filter(r=>r.training);if(fit.length<2)throw Error('trainを2行以上選んでください。');
 const stats={impute,scale,count:fit.length,categories:[...new Set(fit.map(r=>r.city))].sort(),columns:{}};
 for(const key of ['age','income']){
  const values=fit.map(r=>r[key]).filter(v=>v!==null).sort((a,b)=>a-b);if(!values.length)throw Error('trainに観測済みの'+key+'が必要です。');
  const n=values.length,fill=impute==='mean'?mean(values):n%2?values[(n-1)/2]:(values[n/2-1]+values[n/2])/2;
  const filled=fit.map(r=>r[key]??fill),center=scale==='standard'?mean(filled):Math.min(...filled),spread=scale==='standard'?Math.sqrt(mean(filled.map(v=>(v-center)**2))):Math.max(...filled)-center;
  stats.columns[key]={fill,center,spread:spread||1,constant:spread===0};
 }
 return stats;
};
A.prepTransform=(rows,stats)=>rows.map(r=>({numeric:Object.fromEntries(['age','income'].map(key=>{const c=stats.columns[key],filled=r[key]??c.fill;return [key,{raw:r[key],filled,value:(filled-c.center)/c.spread}];})),city:[...stats.categories.map(c=>Number(c===r.city)),Number(!stats.categories.includes(r.city))]}));
A.prep=(input,a)=>{
 const s=begin(input);
 if(a.kind==='select'){s.selected=int(a.index,0,s.rows.length-1);return s;}
 if(a.kind==='edit'){
  const row=s.rows[s.selected],nullable=(v,key)=>v===null?null:num(v,-10000,10000,key),age=nullable(a.age,'age'),income=nullable(a.income,'income');
  if(typeof a.city!=='string'||!a.city.trim()||a.city.length>24)throw Error('cityは1〜24文字です。');
  Object.assign(row,{age,income,city:a.city.trim()});s.output=null;if(row.training)s.stats=null;
  return note(s,row.training?'trainの値を変更。古い補完値・尺度を無効にしました。fitし直してください。':'testの値だけを変更。trainから決めた補完値・尺度は保持しています。');
 }
 if(a.kind==='role'){const i=int(a.index,0,s.rows.length-1);s.rows[i].training=!s.rows[i].training;s.stats=null;s.output=null;return note(s,'学習に使う集合を変更しました。以前のfitは無効です。');}
 if(a.kind==='fit'){s.stats=A.prepFit(s.rows,a.impute,a.scale);s.output=null;return note(s,'train '+s.stats.count+'行だけで補完値・尺度・辞書を確定。まだ各行へ適用していません。');}
 if(a.kind==='apply'){if(!s.stats)throw Error('先にtrainだけでfitしてください。');s.output=A.prepTransform(s.rows,s.stats);return note(s,'保存した一つの変換を全行へ適用。testでは平均も辞書も作り直しません。');}
 throw Error('未定義の前処理操作です。');
};

A.classifyStart=()=>({method:'logistic',dataset:'xor',point:[1,1],log:[]});
A.classifyView=s=>{
 const data=K.mlData(s.dataset,48,17),model=K.fitClassifier(data,s.method,{epochs:100,depth:3,seed:17}),probability=model.predict(s.point),path=[];
 if(model.tree){let node=model.tree;const x=model.scaler.apply(s.point);
  while(node.left){const f=node.feature,limit=model.scaler.center[f]+node.threshold*model.scaler.scale[f],left=x[f]<=node.threshold;path.push({feature:f,value:s.point[f],limit,left});node=left?node.left:node.right;}
  path.push({leaf:node.probability,count:node.count});
 }
 const transformed=model.scaler.apply(s.point),terms=model.weights?model.weights.map((w,i)=>({w,x:i?transformed[i-1]:1,product:w*(i?transformed[i-1]:1)})):[];
 return {data,probability,path,terms,weights:model.weights,grid:Array.from({length:144},(_,i)=>{const x=-2+(i%12+.5)/3,y=-2+(Math.floor(i/12)+.5)/3;return {x,y,label:Number(model.predict([x,y])>=.5)};}),trainAccuracy:mean(data.map(d=>Number(Number(model.predict(d.x)>=.5)===d.y)))};
};
A.classify=(input,a)=>{
 const s=begin(input);
 if(a.kind==='method')s.method=choice(a.value,['logistic','tree','forest','svm'],'分類器');
 else if(a.kind==='dataset')s.dataset=choice(a.value,['linear','xor','circle'],'点の配置');
 else if(a.kind==='point'){if(!Array.isArray(a.point)||a.point.length!==2)throw Error('xとyの2成分です。');s.point=a.point.map(v=>num(v,-2,2));}
 else throw Error('未定義の分類操作です。');
 return note(s,'同じ48学習点で'+s.method+'を計算。調べる点を動かしても学習点は追加していません。');
};
A.validationData=()=>{
 const r=L.rng(19),points=Array.from({length:20},(_,i)=>{const x=r()*2-1;return {id:i+1,x,y:Math.sin(Math.PI*x)+(r()-.5)*.6};});
 return {train:points.slice(0,10),validation:points.slice(10,15),test:points.slice(15)};
};
A.polynomial=(coeff,x)=>coeff.reduce((sum,c,i)=>sum+c*x**i,0);
A.mse=(coeff,rows)=>mean(rows.map(r=>(A.polynomial(coeff,r.x)-r.y)**2));
A.validationStart=()=>({trials:[],selected:null,locked:null,revealed:false,log:[]});
A.validation=(input,a)=>{
 const s=begin(input),data=A.validationData();
 if(a.kind==='fit'){
  if(s.trials.length>=12)throw Error('比較は12モデルまでです。既存の候補を選んでください。');
  const degree=int(a.degree,1,5,'次数'),lambda=num(a.lambda,0,5,'正則化λ'),fit=K.polynomialFit(data.train.map(r=>r.x),data.train.map(r=>r.y),degree,lambda);
  s.trials.push({degree,lambda,coeff:fit.coefficients,train:A.mse(fit.coefficients,data.train),validation:A.mse(fit.coefficients,data.validation),test:null});s.selected=s.trials.length-1;s.locked=null;
  return note(s,s.revealed?'testを既に見ています。この追加選択の最終評価には、新しい未使用データが必要です。':'trainで係数を求め、validationで比較しました。testはまだ使っていません。');
 }
 if(a.kind==='select'){s.selected=int(a.index,0,s.trials.length-1);s.locked=null;return note(s,'候補を選びました。選択を確定してからtestを開きます。');}
 if(a.kind==='lock'){if(s.selected===null)throw Error('先にモデルを学習・選択してください。');s.locked=s.selected;return note(s,'候補を確定しました。test開示後の再選択は独立した評価ではありません。');}
 if(a.kind==='reveal'){
  if(s.locked===null||s.locked!==s.selected)throw Error('先に選択を確定してください。');s.trials[s.locked].test=A.mse(s.trials[s.locked].coeff,data.test);s.revealed=true;
  return note(s,'testを開示しました。この固定した5点は今後の選択から独立ではありません。リセットしても人が見た事実は消えません。');
 }
 throw Error('未定義の評価操作です。');
};
A.xorData=()=>[{x:[0,0],y:0},{x:[0,1],y:1},{x:[1,0],y:1},{x:[1,1],y:0}];
A.neuronStart=()=>({model:K.mlp.initial(3,7),example:3,unit:0,feature:0,phase:'input',iterations:0,last:null,log:[]});
A.neuronView=s=>{
 const data=A.xorData(),selected=data[s.example],forward=K.mlp.forward(s.model,selected.x),batch=K.mlp.gradient(s.model,data),j=s.unit,i=s.feature;
 const terms=data.map(row=>{const f=K.mlp.forward(s.model,row.x);return {x:row.x,y:row.y,output:f.y,delta:f.y-row.y,w:s.model.W2[j],local:1-f.h[j]**2,input:row.x[i],gradient:(f.y-row.y)*s.model.W2[j]*(1-f.h[j]**2)*row.x[i]};});
 return {selected,forward,loss:batch.loss,gradient:batch.gradient,terms};
};
A.neuron=(input,a)=>{
 const s=begin(input);
 if(a.kind==='select'){s.example=int(a.example,0,3);return s;}
 if(a.kind==='weight'){s.unit=int(a.unit,0,2);s.feature=int(a.feature,0,1);return s;}
 if(a.kind==='edit'){s.model.W1[s.unit][s.feature]=num(a.value,-5,5,'重み');s.phase='input';s.last=null;return note(s,'重みを直接変更。以前の順伝播・勾配表示を無効にしました。');}
 if(a.kind==='forward'){s.phase='forward';return note(s,'現在の重みで順伝播。まだ重みを変更していません。');}
 if(a.kind==='backward'){if(s.phase!=='forward')throw Error('先に現在の重みで順伝播してください。');s.phase='backward';return note(s,'4入力の勾配を平均。選んだ一本へ届く積と、batch平均を区別します。');}
 if(a.kind==='update'){
  if(s.phase!=='backward')throw Error('順伝播と逆伝播を行ってから更新してください。');const rate=num(a.rate,.01,1,'学習率'),v=A.neuronView(s),g=v.gradient;
  s.last={before:s.model.W1[s.unit][s.feature],gradient:g.W1[s.unit][s.feature],rate,lossBefore:v.loss,unit:s.unit,feature:s.feature};
  s.model.W1=s.model.W1.map((r,j)=>r.map((w,i)=>w-rate*g.W1[j][i]));s.model.b1=s.model.b1.map((b,j)=>b-rate*g.b1[j]);s.model.W2=s.model.W2.map((w,j)=>w-rate*g.W2[j]);s.model.b2-=rate*g.b2;
  s.last.after=s.model.W1[s.unit][s.feature];s.last.lossAfter=K.mlp.gradient(s.model,A.xorData()).loss;s.phase='input';s.iterations++;
  return note(s,'一回だけ全重みを更新。旧値 − 学習率 × 勾配 = 新値。次は新しい順伝播から始めます。');
 }
 throw Error('未定義のニューラルネット操作です。');
};
A.searchStart=(heuristic='manhattan')=>({heuristic:choice(heuristic,['zero','manhattan','over']),costs:Array.from({length:25},(_,i)=>1+(i*7)%4),blocked:[7,12,17],g:[0,...Array(24).fill(null)],parent:Array(25).fill(null),open:[0],closed:[],expanded:[],done:false,log:[]});
A.neighbors=(s,id)=>[id%5?id-1:null,id%5<4?id+1:null,id>=5?id-5:null,id<20?id+5:null].filter(i=>i!==null&&!s.blocked.includes(i));
A.searchView=s=>{
 const estimate=i=>s.heuristic==='zero'?0:(8-i%5-Math.floor(i/5))*(s.heuristic==='over'?5:1);
 const frontier=s.open.map(i=>({id:i,g:s.g[i],h:estimate(i),f:s.g[i]+estimate(i)})).sort((a,b)=>a.f-b.f||a.id-b.id);
 const path=[];if(s.done&&s.g[24]!==null){let i=24;while(i!==null){path.unshift(i);i=s.parent[i];if(path.length>25)throw Error('経路に循環があります。');}}
 return {frontier,path};
};
A.search=(input,a)=>{
 if(a.kind==='mode')return A.searchStart(a.value);
 const s=begin(input);if(a.kind!=='expand')throw Error('展開する候補を選んでください。');
 if(s.done)throw Error('探索は終了しています。');const id=int(a.id,0,24),frontier=A.searchView(s).frontier;
 if(!frontier.length)throw Error('残る候補はありません。');if(id!==frontier[0].id)throw Error('f=g+hが最小の候補を選びます。同値なら番号が小さいものです。');
 s.open=s.open.filter(i=>i!==id);s.closed.push(id);s.expanded.push(id);
 if(id===24){s.done=true;return note(s,'goalを候補から取り出して終了。見つけただけの時点では終了していません。');}
 for(const next of A.neighbors(s,id)){const candidate=s.g[id]+s.costs[next];if(s.g[next]===null||candidate<s.g[next]){s.g[next]=candidate;s.parent[next]=id;if(!s.open.includes(next))s.open.push(next);s.closed=s.closed.filter(i=>i!==next);}}
 if(!s.open.length)s.done=true;return note(s,'格子'+id+'を展開。隣へ入る費用を加え、もっと安い経路だけを更新しました。');
};
A.qStart=()=>({Q:Array.from({length:16},()=>Array(4).fill(0)),position:0,pending:null,terminal:false,episode:1,last:null,log:[]});
A.qOutcome=(state,action)=>{
 int(state,0,15,'状態');const [dy,dx]=[[-1,0],[0,1],[1,0],[0,-1]][int(action,0,3)],y=Math.max(0,Math.min(3,Math.floor(state/4)+dy)),x=Math.max(0,Math.min(3,state%4+dx)),next=4*y+x;
 return {next,terminal:[5,10,15].includes(next),reward:next===15?1:[5,10].includes(next)?-1:-.03};
};
A.q=(input,a)=>{
 const s=begin(input);
 if(a.kind==='restart'){if(s.pending)throw Error('未反映の経験を先に更新してください。');s.position=0;s.terminal=false;s.episode++;return note(s,'位置だけを最初へ戻しました。学習したQの表は残します。');}
 if(a.kind==='move'){
  if(s.pending)throw Error('直前の経験をQへ反映してください。');if(s.terminal)throw Error('このepisodeは終了しています。次の試行を始めてください。');
  const chosen=int(a.action,0,3),actual=a.actual===undefined?chosen:int(a.actual,0,3),outcome=A.qOutcome(s.position,actual);
  s.pending={state:s.position,chosen,actual,...outcome};s.position=outcome.next;s.terminal=outcome.terminal;
  return note(s,'行動して報酬を受け取りました。Qはまだ変更していません。実際に進んだ方向と選んだ行動は別に記録します。');
 }
 if(a.kind==='update'){
  if(!s.pending)throw Error('先に行動して経験を作ってください。');const alpha=num(a.alpha,.01,1,'α'),gamma=num(a.gamma,0,1,'γ'),p=s.pending,old=s.Q[p.state][p.chosen],future=p.terminal?0:Math.max(...s.Q[p.next]),target=p.reward+gamma*future;
  s.Q[p.state][p.chosen]=old+alpha*(target-old);s.last={...p,old,future,target,alpha,gamma,value:s.Q[p.state][p.chosen]};s.pending=null;return note(s,'選んだ行動のQだけを更新。終端では次のQを加えません。');
 }
 throw Error('未定義のQ学習操作です。');
};
})();
