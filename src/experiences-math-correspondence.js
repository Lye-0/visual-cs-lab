/* Correspondences for the already authored mathematical workbooks.
 * Geometry is derived from the equation, not an illustration of the expected
 * answer. Zero rows describe a plane/empty set, never a spurious line. */
(() => {
'use strict';
const X=CSL.experiences,E=X.mathEvidence,R=E.rational;
const value=R.value;
E.equationLine=(row,bound=4)=>{
 const [a,b,c]=row.map(value);
 if(a===0&&b===0)return {kind:c===0?'plane':'empty',coefficients:[a,b,c],points:[]};
 const points=[],add=(x,y)=>{
  if(Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x)<=bound+1e-8&&Math.abs(y)<=bound+1e-8&&!points.some(p=>Math.hypot(p[0]-x,p[1]-y)<1e-8))points.push([Math.max(-bound,Math.min(bound,x)),Math.max(-bound,Math.min(bound,y))]);
 };
 if(b!==0)for(const x of [-bound,bound])add(x,(c-a*x)/b);
 if(a!==0)for(const y of [-bound,bound])add((c-b*y)/a,y);
 return {kind:'line',coefficients:[a,b,c],points:points.slice(0,2)};
};
E.rowGeometry=s=>{
 if(s.inverse)return null;
 const initial=s.initial.map(row=>row.slice(0,3)),current=s.entries.at(-1).matrix.map(row=>row.slice(0,3));
 // The initial examples contain small integers; the invariant intersection
 // is computed independently of elimination and has no accumulated rounding.
 const [[a,b,c],[d,e,f]]=initial.map(row=>row.map(value)),det=a*e-b*d;
 const solution=det!==0?[(c*e-b*f)/det,(a*f-c*d)/det]:null;
 const classification=solution?'one':a*f===c*d&&b*f===c*e?'many':'none';
 return {initial:initial.map(row=>E.equationLine(row)),current:current.map(row=>E.equationLine(row)),solution,classification,selected:s.selected};
};
E.directionSections=s=>{
 const v=E.gradientView(s);
 return [{id:'x',label:'yを固定して、xだけ動かす',direction:[1,0]},
         {id:'y',label:'xを固定して、yだけ動かす',direction:[0,1]},
         {id:'u',label:'選んだ単位方向uへ動かす',direction:v.u}].map(section=>{
  const slope=v.gradient.reduce((n,g,i)=>n+g*section.direction[i],0);
  const at=t=>({t,height:E.surface(s.shape,s.point[0]+t*section.direction[0],s.point[1]+t*section.direction[1]),tangent:v.value+t*slope});
  return {...section,slope,origin:v.value,selected:at(s.step),samples:Array.from({length:61},(_,i)=>at((i-30)/40))};
 });
};
if(typeof document==='undefined')return;
// Model modules load before the browser's HTML helpers. Resolve the escaping
// function at render time, rather than capturing undefined during evaluation.
const h=text=>CSL.h(text),F=X.format;
E.renderRowGeometry=g=>{
 if(!g)return '';
 const position=([x,y])=>[170+x*33,160-y*33];
 const plane=(lines,label)=>{
  const axes=Array.from({length:9},(_,i)=>i-4).map(n=>{const x=170+n*33,y=160-n*33;return `<path class="ex-me-grid" d="M${x} 28V292M38 ${y}H302"/>${n?`<text x="${x-3}" y="177">${n}</text>`:''}`;}).join('');
  const graphics=lines.map((line,i)=>line.kind==='line'&&line.points.length===2?`<path data-row-line="${i}" class="ex-me-row-line row-${i}${g.selected===i?' selected':''}" d="M${position(line.points[0]).join(' ')}L${position(line.points[1]).join(' ')}"/>`:'').join('');
  const point=g.solution&&g.solution.every(x=>Math.abs(x)<=4)?`<circle data-row-intersection class="ex-me-intersection" cx="${position(g.solution)[0]}" cy="${position(g.solution)[1]}" r="6"/><text x="${position(g.solution)[0]+9}" y="${position(g.solution)[1]-10}">(${g.solution.map(x=>F(x)).join(', ')})</text>`:'';
  const exceptional=lines.map((line,i)=>line.kind==='plane'?`<p data-row-line-kind="plane">式${i+1}は0=0。平面上の全ての点がこの式を満たすため、一本の直線は描きません。</p>`:line.kind==='empty'?`<p data-row-line-kind="empty">式${i+1}は0=${h(F(line.coefficients[2]))}。これを満たす点はないため、直線は描きません。</p>`:line.points.length<2?`<p>式${i+1}の直線は、この表示範囲の外にあります。</p>`:'').join('');
  return `<section class="ex-sec-box"><h4>${label}</h4><svg class="ex-me-equation-plot" viewBox="0 0 340 325" role="img" aria-label="${label}。x,yそれぞれ−4から4。式1は実線、式2は破線"><title>${label}：連立方程式を同時に満たす点</title><rect x="38" y="28" width="264" height="264" class="ex-me-plot-bg"/>${axes}<path class="ex-me-axis" d="M38 160H302M170 28V292"/>${graphics}${point}<text x="309" y="159">x</text><text x="176" y="20">y</text></svg>${exceptional}</section>`;
 };
 return `<section class="ex-me-geometric-equations"><h4>式を変えても、両方を満たす点は変わりません</h4><div class="ex-actions"><button type="button" class="ex-button" data-row-select="0" aria-pressed="${g.selected===0}">式1を強調（実線）</button><button type="button" class="ex-button" data-row-select="1" aria-pressed="${g.selected===1}">式2を強調（破線）</button></div><div class="ex-me-two">${plane(g.initial,'出発点の二つの式')}${plane(g.current,'現在の二つの式')}</div><p>${g.classification==='one'?'白い点は二つの式を同時に満たす('+g.solution.map(x=>F(x)).join(', ')+')です。行操作で一本の直線の向きが変わっても、共通するこの点は残ります。':g.classification==='many'?'最初の二つの直線は重なっています。一方が0=0になっても、残った直線上の全ての点が解です。0=0の行を消すことは、残った条件まで消すことではありません。':'最初の二つの直線は平行で、共通する点がありません。0=1のような式は「見えない直線」ではなく、どの点も満たさない矛盾です。'}</p><p>図は分数を座標に読み替えた表示です。行基本変形の計算と解の照合は、上の有理数計算で行います。</p></section>`;
};
E.renderDirectionSections=s=>{
 const sections=E.directionSections(s);
 const values=sections.flatMap(section=>section.samples.flatMap(p=>[p.height,p.tangent])),min=Math.min(...values),max=Math.max(...values),padding=Math.max(1,(max-min)*.1),low=min-padding,high=max+padding;
 const x=t=>170+t*160,y=z=>270-(z-low)/(high-low)*230;
 return `<section class="ex-me-sections"><h4>同じ点Pを通る三つの断面</h4><p>横軸tは、Pから各方向に進む符号付きの距離です。縦軸は高さf。三つの図で同じ高さの目盛りを使います。実線は曲面を切った曲線、破線はPでの接線です。</p><div class="ex-me-section-grid">${sections.map(section=>{
  const curve=section.samples.map(p=>[x(p.t),y(p.height)].join(',')).join(' '),line=section.samples.map(p=>[x(p.t),y(p.tangent)].join(',')).join(' ');
  const ticks=[low,(low+high)/2,high].map(z=>`<text x="2" y="${y(z)+4}">${F(z,1)}</text><path class="ex-me-grid" d="M50 ${y(z)}H290"/>`).join('');
  return `<section class="ex-sec-box" data-gradient-section="${section.id}"><h5>${section.label}</h5><svg class="ex-me-section-plot" viewBox="0 0 340 315" role="img" aria-label="${h(section.label)}の断面と接線。Pでの傾き${F(section.slope)}"><title>${h(section.label)}：原点t=0が同じPです</title>${ticks}<path class="ex-me-axis" d="M50 270H290M170 25V275"/><polyline class="ex-me-section-curve" points="${curve}"/><polyline class="ex-me-section-tangent" points="${line}"/><circle class="ex-me-intersection" cx="170" cy="${y(section.origin)}" r="5"/><circle class="ex-me-point" cx="${x(section.selected.t)}" cy="${y(section.selected.height)}" r="4"/><circle class="ex-me-next" cx="${x(section.selected.t)}" cy="${y(section.selected.tangent)}" r="4"/><text x="174" y="${y(section.origin)-8}">P</text><text x="163" y="296">0</text><text x="50" y="296">−0.75</text><text x="267" y="296">0.75</text><text x="301" y="269">t</text></svg><p>Pでの傾き：<strong data-section-slope>${F(section.slope)}</strong></p><p>距離h=${F(s.step)}の曲面の値：${F(section.selected.height)}<br>同じ距離の接線の予測：${F(section.selected.tangent)}</p></section>`;
 }).join('')}</div><p>x断面の傾きが∂f/∂x、y断面の傾きが∂f/∂yです。u方向では、その二つをuの成分で組み合わせます。方向を変えても、切断の中心は同じPです。</p></section>`;
};
})();
