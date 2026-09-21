/* Geometry and mathematical workbooks: objects, equations and reasons stay
 * together. Pointer operations always have keyboard/numeric alternatives. */
(() => {
'use strict';
const L=CSL,X=L.experiences,h=L.h,F=X.format,B=X.html.button;
const svg=(body,label)=>`<svg class="ex-plane" viewBox="0 0 600 440" role="group" aria-label="${h(label)}"><defs><marker id="ex-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="context-stroke"/></marker></defs>${body}</svg>`;
const P=([x,y])=>[300+48*x,220-48*y];
const pt=p=>P(p).join(',');
function axes(){let a='';for(let i=-5;i<=5;i++){const [x]=P([i,0]),[,y]=P([0,i]);a+=`<path class="ex-grid-line" d="M${x} 12V428M12 ${y}H588"/>`;if(i&&Math.abs(i)<5)a+=`<text class="ex-tick" x="${x+4}" y="236">${i}</text>`;}return a+'<path class="ex-axis" d="M12 220H588M300 12V428"/><text class="ex-tick" x="577" y="211">x</text><text class="ex-tick" x="310" y="21">y</text>';}
function arrow(p,cls,label,handle){const [x,y]=P(p);return `<g class="${cls}"><path class="ex-vector" d="M300 220L${x} ${y}"/><text class="ex-vector-label" x="${Math.max(14,Math.min(548,x+10))}" y="${Math.max(24,y-9)}">${h(label)}</text>${handle?`<circle cx="${x}" cy="${y}" r="9" tabindex="0" role="button" data-ex-handle="${handle}" aria-label="${h(label)}の先端。ドラッグまたは矢印キーで動かします"/>`:''}</g>`;}
function gridTransform(u,v){let text='';for(let n=-4;n<=4;n++){const f=(a,b)=>[a*u[0]+b*v[0],a*u[1]+b*v[1]];text+=`<path class="ex-transformed-line" d="M${pt(f(n,-4))}L${pt(f(n,4))}M${pt(f(-4,n))}L${pt(f(4,n))}"/>`;}return text;}
X.registerWidget('vectors',(root,a,current)=>{
 const s=X.scope(root,current),variant=a.variant||'basis';let u=[1,0],v=[1,1],w=[2,3],theta=45,history=[];
 if(variant==='matrix'){u=[1,0];v=[.5,1];w=[1,1];}
 if(variant==='eigen'){u=[3,1];v=[1,3];w=[1,0];}
 if(variant==='complex'){u=[1,0];v=[0,1];w=[2,1];}
 const original={u:u.slice(),v:v.slice(),w:w.slice(),theta};
 root.innerHTML=`<p class="ex-operation-hint">${h(a.hint||'図の先端を動かしてください。選択して矢印キーでも動かせます。数値から変えることもできます。')}</p><div class="ex-geometry-layout"><div data-ex-plane></div><div><div data-ex-explanation></div><form class="ex-coordinate-form"><h4>同じ対象を数値で動かす</h4><div data-ex-coordinates></div><button class="ex-button" type="submit">座標を反映</button></form>${B('元の図に戻す','data-ex-origin')}${variant==='basis'?B('2本を平行にする','data-ex-parallel'):''}${variant==='eigen'?B('変換後の矢印を次の入力にする','data-ex-transform'):''}</div></div><p data-ex-status role="status"></p>`;
 const plane=root.querySelector('[data-ex-plane]'),explain=root.querySelector('[data-ex-explanation]'),fields=root.querySelector('[data-ex-coordinates]');
 const vectors=()=>variant==='eigen'||variant==='complex'?[['w',w,'入力の矢印']]:[['u',u,'1本目 u'],['v',v,'2本目 v'],['w',w,'目標 w']];
 const paintFields=()=>fields.innerHTML=vectors().map(([id,p,label])=>`<fieldset><legend>${h(label)}</legend>${p.map((x,i)=>`<label>${i?'y':'x'}<input type="number" name="${id}${i}" value="${x}" min="-4" max="4" step="0.25" required></label>`).join('')}</fieldset>`).join('')+(variant==='complex'?`<label>掛ける回転角（度）<input name="theta" type="number" min="-180" max="180" step="15" value="${theta}"></label>`:'');
 function paint(focus){
  let body=axes(),copy='',calc=X.models.linear(u,v,w);
  if(variant==='basis'||variant==='matrix'){
   if(variant==='matrix')body+=gridTransform(u,v);
   body+=arrow(u,'ex-u','u','u')+arrow(v,'ex-v','v','v')+arrow(w,'ex-w',variant==='matrix'?'入力 x':'目標 w','w');
   if(variant==='basis'){
    if(calc.coefficients){const [p,q]=calc.coefficients,mid=u.map(x=>p*x);body+=`<path class="ex-construction" d="M300 220L${pt(mid)}L${pt(w)}"/>`;copy=`<h4>目標までを2本の成分に分ける</h4>${X.html.formula(`${F(p)} u ＋ ${F(q)} v ＝ w`)}<p>まずuの${F(p)}倍、次にvの${F(q)}倍進むと、目標(${w.join(', ')})へ着きます。係数はこの2本を基準にした座標です。</p>`;}
    else copy=`<h4>${calc.reachable?'目標には届きますが、係数は一意ではありません':'この2本では目標に届きません'}</h4><p>${calc.rank===0?'どちらも零ベクトルなので、原点から動けません。':'2本は同じ直線上にあります。係数をいくら変えても、使える方向は一つです。'}</p>`;
    copy+=`<p class="ex-equation">det[u v] = ${F(calc.det)}　／　使える次元 ${calc.rank}</p><p>行列の列は、それぞれの矢印の成分です。</p>${X.html.table(['','u','v'],[['x',u[0],v[0]],['y',u[1],v[1]]])}`;
    if(a.orthogonal){body+=arrow(calc.projection,'ex-muted-vector','uへの射影')+arrow(calc.perpendicular,'ex-perp','残る成分');copy+=`<h4>重なる方向を引く</h4><p>vからu方向の成分(${calc.projection.map(x=>F(x)).join(', ')})を引くと、(${calc.perpendicular.map(x=>F(x)).join(', ')})が残ります。uが零の場合は、射影先の方向を定められません。</p>`;}
   }else{const y=[w[0]*u[0]+w[1]*v[0],w[0]*u[1]+w[1]*v[1]];body+=arrow(y,'ex-output','出力 Ax');copy=`<h4>列は、基底の行き先</h4>${X.html.table(['','第1列 u','第2列 v'],[['x',u[0],v[0]],['y',u[1],v[1]]])}${X.html.formula(`Ax = ${F(w[0])}u + ${F(w[1])}v = (${y.map(x=>F(x)).join(', ')})`)}<p>入力の係数はそのまま使い、変換後の基底を組み合わせます。線をつぶす変換では異なる入力が同じ出力へ来るため、逆向きに一意に戻せません。</p>`;}
  }else if(variant==='eigen'){
   const y=[3*w[0]+w[1],w[0]+3*w[1]],length=Math.hypot(...w),det=w[0]*y[1]-w[1]*y[0],lambda=length?L.curriculum.dot(w,y)/(length*length):null;
   body+='<path class="ex-eigen-guide" d="M108 412L492 28M108 28L492 412"/>'+arrow(w,'ex-w','v ≠ 0','w')+arrow(y,'ex-output','Av');
   copy=`${X.html.table(['A','列1','列2'],[['行1',3,1],['行2',1,3]])}<h4>${length<1e-9?'零ベクトルは固有ベクトルにしません':Math.abs(det)<1e-8?'同じ直線上に残りました':'向きが変わりました'}</h4><p>${length<1e-9?'どんな行列でも零ベクトルは零になるため、特別な方向を表せません。':Math.abs(det)<1e-8?'Av = '+F(lambda)+'v。特別な方向では、変換は倍率だけで表せます。':'点線の方向 (1,1) または (1,−1) へ矢印を合わせてください。'}</p>${X.html.formula('Av = λv → (A−λI)v = 0')}<p>非零の解を持つにはA−λIがつぶれる必要があります。その条件がdet(A−λI)=0です。このAではλ=4,2です。</p>`;
  }else{
   const angle=theta*Math.PI/180,y=[w[0]*Math.cos(angle)-w[1]*Math.sin(angle),w[0]*Math.sin(angle)+w[1]*Math.cos(angle)];
   body+=`<circle class="ex-eigen-guide" cx="300" cy="220" r="${48*Math.hypot(...w)}"/>`+arrow(w,'ex-w','z','w')+arrow(y,'ex-output','z × eⁱφ');
   copy=`${X.html.formula(`z = ${F(w[0])} + ${F(w[1])}i`)}<p>横が実部、縦が虚部。長さは${F(Math.hypot(...w))}、角度は${F(Math.atan2(w[1],w[0])*180/Math.PI)}°です。</p>${X.html.formula(`eⁱφ = cos φ + i sin φ　(φ = ${theta}°)`)}<p>長さ1の複素数を掛けると、長さを保って回転します。零では偏角を一意に定められません。</p>`;
  }
  plane.innerHTML=svg(body,'矢印と座標の対応');explain.innerHTML=copy;
  if(focus)plane.querySelector(`[data-ex-handle="${focus}"]`)?.focus({preventScroll:true});
  current.completed.add(s.id);
 }
 function move(id,p,focus){p=p.map(x=>Math.max(-4,Math.min(4,Math.round(x*4)/4)));if(id==='u')u=p;if(id==='v')v=p;if(id==='w')w=p;paintFields();paint(focus?id:null);root.querySelector('[data-ex-status]').textContent=id+' = ('+p.join(', ')+')';}
 let drag=null;
 s.on(plane,'pointerdown',e=>{const handle=e.target.closest('[data-ex-handle]');if(!handle)return;drag=handle.dataset.exHandle;plane.setPointerCapture(e.pointerId);e.preventDefault();});
 s.on(plane,'pointermove',e=>{if(!drag)return;const el=plane.querySelector('svg'),p=new DOMPoint(e.clientX,e.clientY).matrixTransform(el.getScreenCTM().inverse());move(drag,[(p.x-300)/48,(220-p.y)/48],false);});
 s.on(plane,'pointerup',()=>drag=null);s.on(plane,'pointercancel',()=>drag=null);
 s.on(plane,'keydown',e=>{const el=e.target.closest('[data-ex-handle]');if(!el||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();const id=el.dataset.exHandle,p=(id==='u'?u:id==='v'?v:w).slice();p[e.key==='ArrowLeft'||e.key==='ArrowRight'?0:1]+=(e.key==='ArrowLeft'||e.key==='ArrowDown'?-.25:.25);move(id,p,true);});
 s.on(root.querySelector('form'),'submit',e=>{e.preventDefault();const form=e.target;if(!form.reportValidity())return;for(const [id]of vectors()){const p=[Number(form.elements[id+'0'].value),Number(form.elements[id+'1'].value)];if(id==='u')u=p;if(id==='v')v=p;if(id==='w')w=p;}if(form.elements.theta)theta=Number(form.elements.theta.value);paint();});
 s.on(root,'click',e=>{if(e.target.closest('[data-ex-origin]')){u=original.u.slice();v=original.v.slice();w=original.w.slice();theta=original.theta;paintFields();paint();}if(e.target.closest('[data-ex-parallel]')){v=u.map(x=>2*x);paintFields();paint();}if(e.target.closest('[data-ex-transform]')){const y=[3*w[0]+w[1],w[0]+3*w[1]],m=Math.max(1,Math.max(...y.map(Math.abs))/3);w=y.map(x=>Math.round(x/m*4)/4);paintFields();paint();root.querySelector('[data-ex-status]').textContent='画面に収まるよう長さを共通倍率で縮め、向きを追っています。';}});
 paintFields();paint();
});
X.registerWidget('rowlab',(root,a,current)=>{
 const s=X.scope(root,current),inverse=!!a.inverse,initial=inverse?[[2,1,1,0],[1,-1,0,1]]:[[2,1,5],[1,-1,1]];let history=[{matrix:X.clone(initial),reason:'初期の式。各列の位置は途中で変えません。'}];
 root.innerHTML=`<p class="ex-operation-hint">${inverse?'左のAをIへ変える同じ操作を右のIへ行うと、右にA⁻¹が残ります。':'二つの式を同時に満たす点を探します。どの行操作も、同じ解を保つ必要があります。'}</p><form class="ex-row-controls"><label>対象の行<select name="row"><option value="0">行1</option><option value="1">行2</option></select></label><label>行う操作<select name="kind"><option value="add">別の行の倍を足す</option><option value="scale">この行を定数倍</option><option value="swap">別の行と交換</option></select></label><label>別の行<select name="other"><option value="1">行2</option><option value="0">行1</option></select></label><label>倍率<input type="number" name="factor" value="1" min="-100" max="100" step="any" required></label><button type="submit" class="ex-button ex-primary">この行操作を行う</button></form><div class="ex-actions">${B('ひとつ前の行列へ戻す','data-row-undo')}${B('最初の式へ戻す','data-row-reset')}</div><p data-ex-status role="status"></p><div data-row-history></div>`;
 const paint=()=>{
  root.querySelector('[data-row-history]').innerHTML=history.map((entry,i)=>{
   const a=entry.matrix,heads=inverse?['xの係数','yの係数','右側・列1','右側・列2']:['xの係数','yの係数','右辺'];
   const eq=a.map(r=>`${F(r[0])}x ${r[1]<0?'−':'＋'} ${F(Math.abs(r[1]))}y = ${F(r[2])}`);
   return `<section class="ex-row-step" data-row-step="${i}"><span>${i===0?'出発点':'操作 '+i}</span><p>${h(entry.reason)}</p>${inverse?'':X.html.formula(eq.join('　／　'))}${X.html.table(heads,a.map(r=>r.map(v=>F(v))))}</section>`;
  }).join('');
  root.querySelector('[data-row-undo]').disabled=history.length===1;
  const last=history.at(-1).matrix,unit=last.every((r,i)=>r.slice(0,2).every((v,j)=>Math.abs(v-+(i===j))<1e-8));
  const status=root.querySelector('[data-ex-status]');status.className='';status.textContent=unit?(inverse?'左側が単位行列になりました。右側が逆行列です。':'x = '+F(last[0][2])+'、y = '+F(last[1][2])+'。元の式へ戻して代入しても両方を満たします。'):'行をどう変えたかと、変えてよい理由を下に残しています。';
  current.completed.add(s.id);
 };
 s.on(root.querySelector('form'),'submit',e=>{e.preventDefault();try{if(history.length>30)throw Error('この小例では30操作までです。戻すか初期化してください。');const f=e.target.elements,op={kind:f.kind.value,row:Number(f.row.value),other:Number(f.other.value),factor:Number(f.factor.value)};if(f.factor.value==='')throw Error('倍率を入力してください。');const matrix=X.models.rowOperation(history.at(-1).matrix,op),r=op.row+1,o=op.other+1;const reason=op.kind==='add'?`行${r} ← 行${r} + (${F(op.factor)}) × 行${o}。同じ解は二つの式を満たすため、この和も満たします。逆の倍率を足せば元に戻せます。`:op.kind==='scale'?`行${r}を${F(op.factor)}倍。0以外なので逆数を掛けて戻せます。`:`行${r}と行${o}を交換。条件の並び順だけを変えています。`;history.push({matrix,reason});paint();}catch(err){s.error(err);}});
 s.on(root,'click',e=>{if(e.target.closest('[data-row-undo]')){if(history.length>1)history.pop();paint();}if(e.target.closest('[data-row-reset]')){history=history.slice(0,1);paint();}});paint();
});
X.registerWidget('ode',(root,a,current)=>{
 const s=X.scope(root,current);let initial=2,k=1,hstep=.25,rows=[];
 root.innerHTML=`<p>この小例で未知なのは曲線y(t)です。方程式 y′=−ky は、各点での傾きを指定します。初期条件y(0)が、その中の1本を選びます。</p><form class="ex-inputs"><label>最初の値 y(0)<input name="initial" type="number" min="-3" max="3" step="0.5" value="2" required></label><label>減衰係数 k<input name="k" type="number" min="0" max="3" step="0.25" value="1" required></label><label>一歩の時間 h<input name="h" type="number" min="0.05" max="1" step="0.05" value="0.25" required></label><button type="submit" class="ex-button">この初期条件からやり直す</button></form><div data-ode-plot></div><div class="ex-actions">${B('今の傾きから一歩だけ進める','data-ode-step')}${B('一歩戻す','data-ode-back')}</div><p data-ex-status role="status"></p><div data-ode-table></div><p class="ex-counterexample">曲線全体を求める解析解と、刻みごとに値を近似する数値解は別の方法です。ここでは減衰の方程式だけを実計算し、任意の微分方程式の自動解法とはしません。</p>`;
 function reset(){rows=[{t:0,euler:initial,rk4:initial,exact:initial,slope:-k*initial,stages:[]}];paint();}
 function paint(){
  const transform=([t,y])=>[35+t*105,160-y*45];let curves='';
  for(const y0 of [-3,-2,-1,0,1,2,3])curves+=`<polyline class="ex-family-line" points="${Array.from({length:61},(_,i)=>transform([i/15,y0*Math.exp(-k*i/15)]).join(',')).join(' ')}"/>`;
  const selected=Array.from({length:61},(_,i)=>transform([i/15,initial*Math.exp(-k*i/15)]).join(',')).join(' '),euler=rows.map(r=>transform([r.t,r.euler]).join(',')).join(' '),rk=rows.map(r=>transform([r.t,r.rk4]).join(',')).join(' ');
  root.querySelector('[data-ode-plot]').innerHTML=`<svg viewBox="0 0 500 340" class="ex-ode-plot" role="img" aria-label="灰色は別の初期条件、ミントは解析解、橙はEuler法、青はRK4"><path class="ex-axis" d="M35 15V320M20 160H480"/>${curves}<polyline class="ex-exact" points="${selected}"/><polyline class="ex-euler" points="${euler}"/><polyline class="ex-rk" points="${rk}"/>${rows.map(r=>{const [x,y]=transform([r.t,r.euler]);return `<circle class="ex-euler-dot" cx="${x}" cy="${y}" r="4"/>`;}).join('')}<text class="ex-tick" x="466" y="180">t</text><text class="ex-tick" x="46" y="22">y</text></svg><p class="ex-legend">灰：別の初期値　／　ミント：y(0)e⁻ᵏᵗ　／　橙：Euler　／　青：RK4</p>`;
  root.querySelector('[data-ode-table]').innerHTML=X.html.table(['時刻t','その点の傾き','Euler','RK4','解析解','Eulerの誤差'],rows.map(r=>[r.t,r.slope,r.euler,r.rk4,r.exact,r.euler-r.exact].map(x=>F(x,6))));
  const last=rows.at(-1);root.querySelector('[data-ex-status]').textContent=rows.length===1?'初期条件を選びました。一歩進めると近似計算が始まります。':`直前のEulerの値に h×傾き を足しました。RK4は4つの傾き ${last.stages.map(x=>F(x,3)).join(', ')} を重み付きで使います。`;
  root.querySelector('[data-ode-step]').disabled=last.t+hstep>4.000001;root.querySelector('[data-ode-back]').disabled=rows.length===1;current.completed.add(s.id);
 }
 s.on(root.querySelector('form'),'submit',e=>{e.preventDefault();if(!e.target.reportValidity())return;initial=Number(e.target.elements.initial.value);k=Number(e.target.elements.k.value);hstep=Number(e.target.elements.h.value);reset();});
 s.on(root,'click',e=>{if(e.target.closest('[data-ode-step]')){const old=rows.at(-1);if(old.t+hstep>4.00001)return;const eu=X.models.odeStep(old.euler,k,hstep),rk=X.models.odeStep(old.rk4,k,hstep),t=Number((old.t+hstep).toFixed(8));rows.push({t,euler:eu.euler,rk4:rk.rk4,exact:initial*Math.exp(-k*t),slope:eu.slope,stages:rk.stages});paint();}if(e.target.closest('[data-ode-back]')){if(rows.length>1)rows.pop();paint();}});reset();
});
})();
