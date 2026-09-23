/* Purpose-specific workspaces: compare local images, then edit a 2D domain.
 * Shared lifecycle is not a fixed pedagogy. There is no automatic playback. */
(() => {
'use strict';
if(typeof document==='undefined')return;
const L=CSL,X=L.experiences,M=X.multivariable,S=X.securityDesk,h=L.h;
const {b,p,box,table}=S.ui,formula=X.html.formula,F=(v)=>X.format(v,5);
const pair=v=>'('+v.map(x=>F(x)).join(', ')+')';
const cornerNames=['P','P+(h,0)','P+(h,h)','P+(0,h)'];
function plane({title,extent,series,points,axis}){
 const center=174,scale=132/extent,to=v=>[center+v[0]*scale,center-v[1]*scale];
 const ticks=[-extent,0,extent];
 return `<svg viewBox="0 0 348 344" class="ex-mv-plane" role="img" aria-label="${h(title)}"><title>${h(title)}</title><path class="ex-mv-axis" d="M36 174H312M174 36V312"/>${ticks.map(t=>`<text x="${center+t*scale}" y="334" text-anchor="middle">${h(F(t))}</text>${t?`<text x="8" y="${center-t*scale+4}">${h(F(t))}</text>`:''}`).join('')}<text x="280" y="162">${h(axis[0])}</text><text x="184" y="27">${h(axis[1])}</text>${series.map(s=>`<polyline class="${s.className}" points="${s.values.map(v=>to(v).join(',')).join(' ')}"/>`).join('')}${points.map(pt=>{const [x,y]=to(pt.value);return pt.square?`<rect x="${x-4}" y="${y-4}" width="8" height="8" class="${pt.className}"/>`:`<circle cx="${x}" cy="${y}" r="5" class="${pt.className}"/>`;}).join('')}</svg>`;
}
X.registerWidget('jacobian-local',(root,a,c)=>S.mount(root,c,{
 start:M.localStart,reduce:M.local,
 instruction:'頂点「P+(h,h)」を選び、正確な変位とJ(P)による予測を比べます。次にPは動かさず、hを半分にしてください。図の目盛りはそのままで、予測との差がどう変わるかを調べます。',
 action:(code,f,s)=>{
  const [kind,v]=code.split(':');
  if(kind==='point')return {kind,x:f.get('x'),y:f.get('y'),fresh:true};
  if(kind==='preset')return {kind:'point',x:v==='zero'?0:1,y:v==='zero'?0:.5,fresh:true};
  if(kind==='h')return {kind,value:f.get('h'),fresh:true};
  if(kind==='half')return {kind:'h',value:s.h/2,fresh:true};
  return {kind,index:Number(v)};
 },
 render:(s,{field})=>{
  const v=M.localView(s),z=v.selected,row=Math.floor(s.entry/2),col=s.entry%2;
  const derivatives=[['∂u/∂x','2x','x方向の変化が出力uに効く割合'],['∂u/∂y','−2y','y方向の変化が出力uに効く割合'],['∂v/∂x','2y','x方向の変化が出力vに効く割合'],['∂v/∂y','2x','y方向の変化が出力vに効く割合']];
  const entry=derivatives[s.entry];
  const input=plane({title:'入力の変位δ。Pを原点として表示する小さな正方形',extent:1,axis:['δx','δy'],series:[{values:[...v.vertices.map(p=>p.delta),[0,0]],className:'ex-mv-input-line'}],points:[{value:z.delta,className:'ex-mv-true-dot',square:true}]});
  const output=plane({title:'T(P)を原点とする出力変位。実線が正確な変形、破線が線形近似',extent:v.outputExtent,axis:['Δu','Δv'],series:[{values:[...v.vertices.map(p=>p.predicted),[0,0]],className:'ex-mv-linear-line'},{values:v.boundary.map(p=>p.actual),className:'ex-mv-true-line'},{values:[z.predicted,z.actual],className:'ex-mv-error-line'}],points:[{value:z.predicted,className:'ex-mv-linear-dot'},{value:z.actual,className:'ex-mv-true-dot',square:true}]});
  return box('この章で写すもの：点から点への変換',formula('T(x,y) = (u,v) = (x²−y², 2xy)')+p('高さが一つ決まる関数fではなく、出力がuとvの二つある変換です。Pの近くの小さな正方形がどう写るかを調べます。'))+
   `<div class="ex-mv-inputs">${field('x','Pのx',s.point[0],{min:-1.5,max:1.5,step:'any'})}${field('y','Pのy',s.point[1],{min:-1.5,max:1.5,step:'any'})}${b('点Pを変更','point')}${field('h','正方形の一辺 h',s.h,{min:.05,max:.8,step:'any'})}${b('hだけを変更','h')}${b('hを半分にする','half',s.h/2<.05?'disabled':'')}</div><div class="ex-actions">${b('通常の点P=(1, 0.5)','preset:normal')}${b('零点P=(0, 0)','preset:zero')}</div>`+
   formula('P = '+pair(s.point)+'　T(P) = '+pair(v.base))+
   `<div class="ex-mv-two">${box('入力：Pからどれだけ動くか',input+p('図の原点はPです。横δx・縦δyは元の座標ではなく、Pからの変位です。'))}${box('出力：T(P)からどれだけ動くか',output+p('実線・■：正確な変形　破線・○：J(P)の予測。細い線は選んだ頂点の差です。Pを変えると表示範囲が変わりますが、hだけなら変わりません。'))}</div>`+
   `<div class="ex-actions" role="group" aria-label="調べる頂点">${cornerNames.map((name,i)=>b(name,'corner:'+i,`aria-pressed="${i===s.corner}"`)).join('')}</div>`+
   box('行は出力、列は入力：各成分を押して読む',`<div class="ex-mv-matrix"><span></span><span>入力 δx</span><span>入力 δy</span>${v.J.map((r,i)=>`<span>出力 ${i?'Δv':'Δu'}</span>${r.map((value,j)=>b(F(value),'entry:'+(2*i+j),`aria-label="${derivatives[2*i+j][0]} = ${F(value)}" aria-pressed="${s.entry===2*i+j}"`)).join('')}`).join('')}</div>`+formula(entry[0]+' = '+entry[1]+' = '+F(v.J[row][col]))+p(entry[2]+'です。xだけ動かすと第1列、yだけ動かすと第2列を使い、両方動かすと二つの寄与を足します。'))+
   box('選んだ頂点の計算：実際と予測を同時に読む',formula('δ = '+pair(z.delta)+'　P+δ = '+pair(z.at))+table(['出力','δxからの寄与','δyからの寄与','J(P)δ'],v.J.map((r,i)=>[i?'Δv':'Δu',F(r[0])+' × '+F(z.delta[0])+' = '+F(v.terms[i][0]),F(r[1])+' × '+F(z.delta[1])+' = '+F(v.terms[i][1]),F(z.predicted[i])]))+formula('正確な変位：T(P+δ)−T(P) = '+pair(z.actual))+formula('一次の予測：J(P)δ = '+pair(z.predicted))+formula('差（正確−予測） = '+pair(z.error)+'　差の長さ = '+F(v.absoluteError))+
    p(s.point.every(x=>x===0)?'P=(0,0)ではJ(P)は零行列です。ただし変換Tが一定という意味ではありません。実際の変位には二次の項が残ります。この点では誤差が小さくなっても、一次予測に対する相対誤差まで小さくなるとは言えません。':'この多項式では差が(δx²−δy², 2δxδy)です。同じ頂点でhを半分にすると、差の長さは1/4になります。小さな変位を扱う理由を数値でも確かめてください。'))+
   `<details class="ex-mv-detail" data-sec-view="jacobian-area"><summary>面積への対応も読む</summary>${formula('det J(P) = 4(x²+y²) = '+F(v.det))}${formula('線形近似での面積 = |det J(P)| × h² = '+F(v.linearArea))}${p('これは破線の平行四辺形の面積です。曲がった領域の正確な面積とは限りません。変換全体が一対一であると、この一点の行列だけから結論しません。')}</details>`;
 }
}));
X.registerWidget('double-integral-region',(root,a,c)=>{
 const ui=S.mount(root,c,{
  start:M.regionStart,reduce:M.region,
  instruction:'区画を一つ選び、中点の高さと面積ΔxΔyを読んでください。「選んだ区画を外す」で、その一項だけが和から除かれます。「領域を編集」に切り替えると、区画を押して領域の形を変えられます。',
  action:(code,f,s)=>{
   const [kind,v]=code.split(':');
   if(kind==='coefficients')return {kind,a:f.get('a'),b:f.get('b'),c:f.get('c'),fresh:true};
   if(kind==='mode')return {kind,edit:v==='edit'};
   if(kind==='cell')return {kind,index:Number(v)};
   if(kind==='preset')return {kind,value:v,fresh:true};
   return {kind,fresh:kind==='refine'};
  },
  render:(s,{field})=>{
   const v=M.regionView(s),z=v.selected;
   // Reverse rows on the screen so the positive y-axis points upwards.
   const ordered=Array.from({length:s.n},(_,r)=>v.cells.slice((s.n-1-r)*s.n,(s.n-r)*s.n)).flat();
   const grid=`<div class="ex-mv-domain" data-sec-view="domain-grid" tabindex="0" role="region" aria-label="領域Dの区画。細分化後は表の中を横スクロールできます"><div class="ex-mv-domain-top">y=1　　xは左から右へ増加 →</div><div class="ex-mv-grid" style="--n:${s.n}" role="group" aria-label="中点の高さと領域の所属">${ordered.map(cell=>b(s.n<=4?F(cell.height):'·','cell:'+cell.index,`data-mv-cell="${cell.index}" data-included="${cell.included}" aria-label="区画(${cell.i+1},${cell.j+1}) 中点(${F(cell.x)},${F(cell.y)}) 高さ${F(cell.height)} ${cell.included?'領域に含む':'領域の外'}" aria-pressed="${s.selected===cell.index}" tabindex="${s.selected===cell.index?0:-1}"`)).join('')}</div><div class="ex-mv-domain-bottom"><span>(0,0)</span><span>x=1、y=0</span></div></div>`;
   return box('領域Dと、その上の高さfを分けて考える',formula('f(x,y) = a x² + bxy + c y²')+formula('今回：a='+F(s.coefficients[0])+'、b='+F(s.coefficients[1])+'、c='+F(s.coefficients[2]))+p('薄く塗られた区画の集まりが領域Dです。区画を外しても、その場所の関数値が0に変わるわけではありません。そこを積分の和に含めなくなります。'))+
    `<div class="ex-actions">${b('正方形の領域','preset:square')}${b('L字の領域','preset:L')}${b('空の領域から作る','preset:empty')}</div><div class="ex-actions" role="group" aria-label="区画を押したときの動作">${b('区画を調べる','mode:inspect',`aria-pressed="${!s.edit}"`)}${b('領域を編集','mode:edit',`aria-pressed="${s.edit}"`)}</div>`+
    box(s.edit?'領域を編集：押した区画を含める／外す':'区画を調べる：所属を変えずに一項を読む',grid+p('yは下から上へ増加。塗りありは領域内、斜線は領域外、白い枠は選択中です。矢印キーで区画を移動し、Enterで現在のモードの操作を行えます。')+`<div class="ex-actions">${b(z.included?'選んだ区画を外す':'選んだ区画を含める','toggle')}${b('各区画を縦横2等分','refine',s.n>=16?'disabled':'')}</div>`)+
    box('選択した区画('+ (z.i+1)+', '+(z.j+1)+')：高さ × 面積',table(['対応する量','値'],[['xの区間',F(z.x0)+'〜'+F(z.x1)],['yの区間',F(z.y0)+'〜'+F(z.y1)],['中点 (xᵢ,yⱼ)',pair([z.x,z.y])],['高さ f(xᵢ,yⱼ)',F(z.height)],['Δx、Δy',F(v.dx)+'、'+F(v.dx)],['面積要素 ΔA=ΔxΔy',F(z.cellArea)]])+formula('この区画の近似量 = '+F(z.height)+' × '+F(z.cellArea)+' = '+F(z.raw))+p(z.included?'この区画は領域内なので、この値を和に含めます。':'この区画は領域外なので、この値を和に含めません。合計への寄与は0です。'))+
    box('領域全体へ足した結果',table(['量','値'],[['分割',s.n+'×'+s.n],['領域内の区画数',v.count+' / '+s.n*s.n],['領域Dの面積',F(v.area)],['中点で近似した積分',F(v.sum)],['同じ領域の解析的な積分',F(v.exact)],['近似 − 解析的な値',F(v.error)]])+p('細分化では領域の形と係数を保ち、各区画の幅と中点を変えます。領域を外して和が変わることと、同じ領域を細かく近似することは別です。')+p('負の高さは負の寄与として足します。この値を常に正の体積と呼ぶことはできません。解析値は、この多項式を選択された長方形ごとに積分して求めています。'))+
    `<details class="ex-mv-detail" data-sec-view="domain-coefficients"><summary>領域を保って、高さの関数を変える</summary><div class="ex-mv-inputs">${['a','b','c'].map((name,i)=>field(name,name+'の値',s.coefficients[i],{min:-3,max:3,step:'any'})).join('')}${b('係数だけを変更','coefficients')}</div></details><details class="ex-mv-detail" data-sec-view="domain-strips"><summary>各帯の寄与と解析値の求め方</summary>${table(['y方向の区間','含めた区画の和'],v.strips.map(strip=>[F(strip.j/s.n)+'〜'+F((strip.j+1)/s.n),F(strip.sum)]))}${p('一つの長方形 [x₀,x₁]×[y₀,y₁] の解析値は、次の三項の和です。除外区画は足しません。')}${formula('a (x₁³−x₀³)(y₁−y₀)/3')}${formula('＋ b (x₁²−x₀²)(y₁²−y₀²)/4')}${formula('＋ c (y₁³−y₀³)(x₁−x₀)/3')}</details>`;
  }
 });
 ui.scope.on(root,'keydown',event=>{
  if(!event.target.matches('[data-mv-cell]')||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
  event.preventDefault();event.stopPropagation();const s=ui.state(),i=s.selected%s.n,j=Math.floor(s.selected/s.n);
  const dx=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0,dy=event.key==='ArrowUp'?1:event.key==='ArrowDown'?-1:0;
  const x=Math.max(0,Math.min(s.n-1,i+dx)),y=Math.max(0,Math.min(s.n-1,j+dy)),index=y*s.n+x;
  // Keyboard navigation never paints: Enter/click is the explicit edit action.
  void ui.apply({kind:'focus-cell',index}).then(()=>root.querySelector('[data-mv-cell="'+index+'"]')?.focus({preventScroll:true}));
 });
});
})();
