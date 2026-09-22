/* A result cell, an equation row and a direction have different workspaces. */
(() => {
'use strict';
if(typeof document==='undefined')return;
const L=CSL,X=L.experiences,E=X.mathEvidence,S=X.securityDesk,h=L.h,F=X.format,R=E.rational;
const {b,p,box,table}=S.ui;
const formula=X.html.formula;
X.registerWidget('matrix-product',(root,a,c)=>S.mount(root,c,{
 start:E.productStart,reduce:E.product,
 instruction:'結果の行列の一つの成分を押してください。左の行と右の列が同時に強調され、その成分を作った積を一つずつ読めます。AとBの順序を交換して、形と値を比べましょう。',
 action:(code,f)=>{const [kind,x,y]=code.split(':');return kind==='load'?{kind,A:f.get('A'),B:f.get('B')}:kind==='order'?{kind,value:x}:{kind:'select',row:Number(x),col:Number(y)};},
 render:(s,{field})=>{
  const v=E.productView(s),name=s.order==='AB'?['A','B']:['B','A'];
  const grid=(values,which)=>`<div class="ex-me-matrix" style="--cols:${values[0].length}" role="group" aria-label="${h(which===2?s.order+'の結果':name[which])}">${values.flatMap((row,i)=>row.map((value,j)=>which===2?b(F(value),'select:'+i+':'+j,`aria-label="結果 第${i+1}行 第${j+1}列 ${F(value)}" aria-pressed="${i===s.row&&j===s.col}"`):`<div class="${v.valid&&(which===0?i===s.row:j===s.col)?'is-operand':''}" data-operand="${v.valid&&(which===0?i===s.row:j===s.col)}"><small>${i+1}, ${j+1}</small>${h(F(value))}</div>`)).join('')}</div>`;
  return `<div class="ex-actions">${b('ABの順に掛ける','order:AB',`aria-pressed="${s.order==='AB'}"`)}${b('BAの順に掛ける','order:BA',`aria-pressed="${s.order==='BA'}"`)}</div><div class="ex-me-product">${box(name[0]+'：'+v.left.length+'行 '+v.left[0].length+'列',grid(v.left,0))}<span class="ex-me-symbol" aria-hidden="true">×</span>${box(name[1]+'：'+v.right.length+'行 '+v.right[0].length+'列',grid(v.right,1))}<span class="ex-me-symbol" aria-hidden="true">=</span>${box(v.valid?s.order+'：'+v.result.length+'行 '+v.result[0].length+'列':'この順序では定義できない',v.valid?grid(v.result,2):p(v.reason))}</div>`+
  (v.valid?box('第'+(s.row+1)+'行 × 第'+(s.col+1)+'列 → 選んだ一成分',table(['対応する位置k',name[0]+'の行の値',name[1]+'の列の値','掛けた値'],v.terms.map(t=>[t.k+1,t.left,t.right,t.product]))+formula(v.terms.map(t=>'('+F(t.left)+') × ('+F(t.right)+')').join(' ＋ ')+' = '+F(v.value))+p('各積を足すと、結果の第'+(s.row+1)+'行・第'+(s.col+1)+'列になります。対応させる数がそろうよう、左の列数と右の行数が一致する必要があります。')):'')+
  `<details><summary>同じ操作を別の行列で試す</summary><div class="ex-me-two">${field('A','行列A：成分をカンマ、行をセミコロンで区切る',s.A.map(r=>r.join(',')).join(';'),{type:'text'})}${field('B','行列B：成分をカンマ、行をセミコロンで区切る',s.B.map(r=>r.join(',')).join(';'),{type:'text'})}</div>${b('この二つの行列を使う','load')}${p('例：1,2;3,4。各成分−20〜20、最大4×4です。片方の入力に不備があれば、両方とも変更しません。')}</details>${p('順序を変えて両方の積が定義できても、一般にABとBAは同じ行列ではありません。入力の座標を列の組合せとして読む見方は、前の章に残しています。')}`;
 }
}));

X.registerWidget('gradient-direction',(root,a,c)=>{
 const ui=S.mount(root,c,{
  start:E.gradientStart,reduce:E.gradient,
  instruction:'平面をクリックして点Pを選び、方向角を変えてください。「その点の勾配」と「自分が進む方向」は別の矢印です。同じ距離だけ進むときの変化率を内積で読みます。',
  action:(code,f)=>{const [kind,value]=code.split(':');return kind==='point'?{kind,x:f.get('x'),y:f.get('y'),fresh:true}:kind==='angle'||kind==='step'?{kind,value:f.get(kind),fresh:true}:kind==='shape'||kind==='direction'?{kind,value,fresh:true}:null;},
  render:(s,{field})=>{
   const v=E.gradientView(s),to=([x,y])=>[210+55*x,210-55*y],point=to(s.point),q=to(v.next),gradEnd=to(s.point.map((x,i)=>x+v.gradient[i]*.22)),dirEnd=to(s.point.map((x,i)=>x+v.u[i]));
   const line=(end,cls)=>`<path class="${cls}" d="M${point[0]} ${point[1]}L${end[0]} ${end[1]}"/>`;
   // Contour points are drawn from their equations, not a prerecorded scene.
   const levels=s.shape==='bowl'?[.5,1,2,4,6,8]:[-4,-2,-1,0,1,2,4];
   const contours=levels.map(level=>{
    if(s.shape==='bowl')return `<ellipse cx="210" cy="210" rx="${55*Math.sqrt(level)}" ry="${55*Math.sqrt(level/2)}" class="ex-me-contour"/>`;
    let paths='';for(const sign of [-1,1]){const pts=Array.from({length:121},(_,i)=>{const t=-3+i*.05;if(level>=0)return to([sign*Math.sqrt(t*t+level),t]);return to([t,sign*Math.sqrt(t*t-level)]);});paths+=`<polyline points="${pts.map(t=>t.join(',')).join(' ')}" class="ex-me-contour"/>`;}return paths;
   }).join('');
   const ticks=Array.from({length:5},(_,i)=>i-2).map(n=>`<text x="${210+55*n}" y="229">${n}</text><text x="190" y="${214-55*n}">${n}</text>`).join('');
   const plane=`<svg data-me-gradient tabindex="0" role="group" aria-label="点Pをクリックまたは矢印キーで選ぶ平面" class="ex-me-plane" viewBox="0 0 420 420"><title>点P・勾配・進む方向・移動先</title><defs><clipPath id="${root.id||c.chapter}-gradient-clip"><rect x="32" y="32" width="356" height="356"/></clipPath></defs><rect class="ex-me-plot-bg" x="32" y="32" width="356" height="356"/><g clip-path="url(#${root.id||c.chapter}-gradient-clip)">${contours}</g><path class="ex-me-axis" d="M32 210H388M210 32V388"/>${ticks}<text x="390" y="205">x</text><text x="217" y="24">y</text>${line(gradEnd,'ex-me-gradient')}${line(dirEnd,'ex-me-direction')}<circle cx="${gradEnd[0]}" cy="${gradEnd[1]}" r="4" class="ex-me-gradient-tip"/><circle cx="${dirEnd[0]}" cy="${dirEnd[1]}" r="4" class="ex-me-direction-tip"/><circle cx="${q[0]}" cy="${q[1]}" r="5" class="ex-me-next"/><circle cx="${point[0]}" cy="${point[1]}" r="6" class="ex-me-point"/><text x="${point[0]+8}" y="${point[1]-9}">P</text></svg>`;
   return `<div class="ex-actions">${b('放物面 f=x²+2y²','shape:bowl',`aria-pressed="${s.shape==='bowl'}"`)}${b('鞍形 f=x²−y²','shape:saddle',`aria-pressed="${s.shape==='saddle'}"`)}</div><div class="ex-me-two">${box('位置ごとの高さ：等高線で読む',plane+p('Pは選んだ位置。ミントの線は勾配（図では0.22倍）、橙の線は単位方向u、白抜き点は実際の移動先です。長さは数値欄で確認してください。'))}${box('同じPから、どちらへ進むか',field('x','点Pのx',s.point[0],{min:-2,max:2,step:'any'})+field('y','点Pのy',s.point[1],{min:-2,max:2,step:'any'})+b('点Pを反映','point')+field('angle','方向角（度）',s.angle,{min:-180,max:180,step:'any'})+b('方向だけを反映','angle')+`<div class="ex-actions">${b('勾配の向き','direction:up')}${b('反対向き','direction:down')}${b('勾配と直角','direction:level')}</div>`+field('step','移動する距離h',s.step,{min:.05,max:.5,step:'any'})+b('距離だけを反映','step'))}</div>`+
   E.renderDirectionSections(s)+box('偏微分 → 勾配 → 方向微分',formula('∇f(P) = ('+v.gradient.map(x=>F(x)).join(', ')+')　 u = ('+v.u.map(x=>F(x)).join(', ')+')')+table(['成分','偏微分','単位方向の成分','その積'],[['x',v.gradient[0],F(v.u[0]),F(v.parts[0])],['y',v.gradient[1],F(v.u[1]),F(v.parts[1])]])+formula('方向微分 = ∇f(P)・u = '+F(v.parts[0])+' + ('+F(v.parts[1])+') = '+F(v.slope))+p(v.norm<1e-12?'この点は勾配が零なので、どの方向も一次の変化率は0です。極小か鞍点かは、この事実だけでは決まりません。':Math.abs(v.slope)<1e-9?'勾配と直角なので一次の変化率は0です。ただし、直線を有限距離進むことは等高線に沿って曲がることとは違います。':'方向角を変えると、同じ勾配でも内積が変わります。単位方向を使うので「同じ距離あたり」で比べられます。'))+
   box('接平面による予測と、曲面の本当の高さ',formula('f(P+h u) ≈ f(P) + h(∇f(P)・u)')+formula(F(v.value)+' + '+F(s.step)+' × ('+F(v.slope)+') = '+F(v.linear))+table(['比較する値','高さ'],[['元のf(P)',F(v.value)],['接平面からの予測',F(v.linear)],['曲面に移動先を代入',F(v.actual)],['本当の高さ − 予測',F(v.error)]])+p('hを小さくして、差を比べてください。接平面は局所の一次近似で、有限の移動先に必ず一致する面ではありません。'));
  }
 });
 ui.scope.on(root,'click',event=>{
  const svg=event.target.closest('[data-me-gradient]');if(!svg||event.button!==0)return;const matrix=svg.getScreenCTM();if(!matrix)return;
  const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;const v=point.matrixTransform(matrix.inverse()),x=(v.x-210)/55,y=(210-v.y)/55;
  if(Math.abs(x)>2||Math.abs(y)>2)return;event.preventDefault();void ui.apply({kind:'point',x,y,fresh:true}).then(()=>root.querySelector('[data-me-gradient]')?.focus({preventScroll:true}));
 });
 ui.scope.on(root,'keydown',event=>{
  if(!event.target.matches('[data-me-gradient]')||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
  event.preventDefault();event.stopPropagation();const [x,y]=ui.state().point,dx=event.key==='ArrowLeft'?-.1:event.key==='ArrowRight'?.1:0,dy=event.key==='ArrowDown'?-.1:event.key==='ArrowUp'?.1:0;
  void ui.apply({kind:'point',x:Math.max(-2,Math.min(2,x+dx)),y:Math.max(-2,Math.min(2,y+dy)),fresh:true}).then(()=>root.querySelector('[data-me-gradient]')?.focus({preventScroll:true}));
 });
});

X.registerWidget('rowlab',(root,a,current)=>{
 const scope=X.scope(root,current);let state=E.rowStart('unique',!!a.inverse);
 const fmt=R.format,eq=row=>fmt(row[0])+'x '+(row[1][0]<0?'−':'＋')+' '+fmt([Math.abs(row[1][0]),row[1][1]])+'y = '+fmt(row[2]);
 root.innerHTML=p(a.inverse?'左のAと右のIを一つの行として操作します。左だけを変えるのではありません。':'まず行1へ行2を足し、yを消してください。どの成分を足したかと、元へ戻せる理由を残します。')+`<div class="ex-actions"><button class="ex-button" data-row-preset="unique">独立した二つの式</button><button class="ex-button" data-row-preset="dependent">同じ条件が重なる例</button>${a.inverse?'':'<button class="ex-button" data-row-preset="inconsistent">両立しない例</button>'}</div><form class="ex-row-controls"><label>対象の行<select name="row"><option value="0">行1</option><option value="1">行2</option></select></label><label>行う操作<select name="kind"><option value="add">別の行の倍を足す</option><option value="scale">この行を定数倍</option><option value="swap">別の行と交換</option></select></label><label>別の行<select name="other"><option value="1">行2</option><option value="0">行1</option></select></label><label>倍率：整数・小数・分数<input type="text" name="factor" value="1" maxlength="32" required spellcheck="false" autocomplete="off"></label><button type="submit" class="ex-button ex-primary">この行操作を行う</button></form>`+p('1/3と入力できます。内部も分数のまま計算し、0.33333へ丸めた値を次の操作へ使いません。')+`<div class="ex-actions"><button type="button" class="ex-button" data-row-undo>ひとつ前の行列へ戻す</button><button type="button" class="ex-button" data-row-reset>最初の式へ戻す</button></div><p data-ex-status role="status"></p><div data-row-geometry></div><div data-row-result></div><div data-row-history></div>`;
 const paint=()=>{
  const view=E.rowView(state);root.dataset.rowState=JSON.stringify(state);root.querySelector('[data-row-geometry]').innerHTML=E.renderRowGeometry(E.rowGeometry(state));
  root.querySelector('[data-row-history]').innerHTML=state.entries.map((entry,i)=>{
   const heads=state.inverse?['xの係数','yの係数','右側・列1','右側・列2']:['xの係数','yの係数','右辺'];
   const detail=entry.terms.length?`<details${i===state.entries.length-1?' open':''}><summary>選んだ行の各成分は、こう変えた</summary>${table(['列','操作前','倍率×使った値','結果'],entry.terms.map(t=>[heads[t.column],fmt(t.before),fmt(t.factor)+' × ('+fmt(t.source)+') = '+fmt(t.product),fmt(t.result)]))}</details>`:'';
   return `<section class="ex-row-step" data-row-step="${i}"><span>${i===0?'出発点':'操作 '+i}</span><p>${h(entry.reason)}</p>${state.inverse?'':entry.matrix.map((r,j)=>`<div class="ex-me-equation-row"><span>式${j+1}</span>${formula(eq(r))}</div>`).join('')}${table(heads,entry.matrix.map(r=>r.map(fmt)))}${detail}</section>`;
  }).join('');
  const status=root.querySelector('[data-ex-status]');status.className='';status.textContent=view.outcome;
  root.querySelector('[data-row-result]').innerHTML=view.verification?box('最初の式へ戻して照合する',state.inverse?table(['A × 求めた右側','列1','列2'],view.verification.map((r,i)=>['行'+(i+1),...r.map(fmt)])):table(['元の式','左辺へ代入した値','元の右辺'],view.verification.map((r,i)=>['式'+(i+1),fmt(r.left),fmt(r.right)]))):'';
  root.querySelector('[data-row-undo]').disabled=state.entries.length===1;
  for(const b of root.querySelectorAll('[data-row-preset]'))b.setAttribute('aria-pressed',String(b.dataset.rowPreset===state.preset));
  current.completed.add(scope.id);
 };
 scope.on(root.querySelector('form'),'submit',event=>{event.preventDefault();try{
  if(!event.target.reportValidity())return;const f=event.target.elements;
  state=E.row(state,{kind:'operate',row:Number(f.row.value),other:Number(f.other.value),operation:f.kind.value,factor:f.factor.value});paint();
 }catch(error){scope.error(error);}});
 scope.on(root,'click',event=>{
  const selected=event.target.closest('[data-row-select]');if(selected){state=E.row(state,{kind:'select',index:Number(selected.dataset.rowSelect)});paint();root.querySelector('[data-row-select="'+state.selected+'"]')?.focus({preventScroll:true});return;}
  const preset=event.target.closest('[data-row-preset]');if(preset){state=E.rowStart(preset.dataset.rowPreset,!!a.inverse);root.querySelector('form').reset();paint();}
  else if(event.target.closest('[data-row-undo]')){state=E.row(state,{kind:'undo'});paint();}
  else if(event.target.closest('[data-row-reset]')){state=E.rowStart(state.preset,!!a.inverse);root.querySelector('form').reset();paint();}
 });paint();
});
})();
