(() => {
'use strict';const L=CSL,X=L.experiences,h=L.h,M=L.epsilonDelta;
X.registerWidget('epsilon-delta',(root,activity,current)=>{
 const scope=X.scope(root,current),mode=activity.mode,spec=M.specs[mode],lab=current.lab;
 let p={mode,epsilon:mode==='jump'?.25:.5,delta:.4,x:mode==='jump'?.2:1.2,limit:.5,pointValue:'undefined'},v;
 const keys=['epsilon','delta','x',...(mode==='jump'?['limit']:[]),...(mode==='hole'?['pointValue']:[])];
 root.classList.add('ed-workspace');
 root.innerHTML=`<p class="ed-formula">${h(spec.formula)} · a=${spec.a}${mode==='jump'?'（Lは変更できます）':' · L='+spec.L}</p><form class="ex-inputs">${X.fields(lab,keys,p,scope.id)}</form><div class="ex-actions">${mode==='jump'?X.html.button('εを0.25にする','data-action="challenge"'):X.html.button('使えるδの一例','data-action="safe"')}${X.html.button('εだけを約半分','data-action="epsilon"')}${X.html.button('δだけを約半分','data-action="delta"')}${X.html.button('反例の点を見る','data-action="witness"')}</div><p data-ex-status role="status"></p><div class="ed-legend"><span>青緑：|f(x)−L| &lt; ε</span><span>金色：0 &lt; |x−a| &lt; δ</span></div><svg class="ed-plot" tabindex="0" role="img" aria-label="極限の帯と関数。クリックまたは左右キーで調べる点を移動できます"></svg><div class="ed-cards"><section><h4>選んだ一点</h4><div data-point></div></section><section><h4>今回のε・δで、範囲全体は？</h4><div data-range aria-live="polite"></div></section></div><div class="ed-proof" data-proof></div><p class="ed-note">「約半分」は入力の刻み幅で切り下げます。図の点は描画用の近似です。範囲全体の判定は、各関数の不等式を使い、入力小数を有理数として比較しています。有限個の点が帯に入るだけでは、極限の証明にはなりません。</p>`;
 const form=root.querySelector('form'),svg=root.querySelector('svg'),status=root.querySelector('[data-ex-status]');
 const fmt=n=>n===null?'未定義':Number(n.toPrecision(6)).toString();
 form.querySelector('[name=x]').step='any';form.querySelector('[name=x]').min=spec.xs[0];form.querySelector('[name=x]').max=spec.xs[1];
 function draw(){
  const w=Math.max(240,svg.clientWidth),height=340,left=38,right=w-16,top=22,bottom=306;
  svg.setAttribute('viewBox',`0 0 ${w} ${height}`);
  const sx=x=>left+(x-spec.xs[0])/(spec.xs[1]-spec.xs[0])*(right-left),sy=y=>bottom-(y-spec.ys[0])/(spec.ys[1]-spec.ys[0])*(bottom-top);
  const line=(x1,y1,x2,y2,cls)=>`<line x1="${sx(x1)}" y1="${sy(y1)}" x2="${sx(x2)}" y2="${sy(y2)}" class="${cls}"/>`;
  let s=`<defs><clipPath id="${scope.id}-clip"><rect x="${left}" y="${top}" width="${right-left}" height="${bottom-top}"/></clipPath></defs><g clip-path="url(#${scope.id}-clip)"><rect class="ed-output-band" x="${left}" y="${sy(v.L+p.epsilon)}" width="${right-left}" height="${sy(v.L-p.epsilon)-sy(v.L+p.epsilon)}"/><rect class="ed-input-band" x="${sx(v.a-p.delta)}" y="${top}" width="${sx(v.a+p.delta)-sx(v.a-p.delta)}" height="${bottom-top}"/>`;
  for(let x=Math.ceil(spec.xs[0]);x<=spec.xs[1];x++)s+=line(x,spec.ys[0],x,spec.ys[1],'ed-grid');
  for(let y=Math.ceil(spec.ys[0]);y<=spec.ys[1];y++)s+=line(spec.xs[0],y,spec.xs[1],y,'ed-grid');
  for(const y of [v.L-p.epsilon,v.L+p.epsilon])s+=line(spec.xs[0],y,spec.xs[1],y,'ed-epsilon-edge');
  for(const x of [v.a-p.delta,v.a+p.delta])s+=line(x,spec.ys[0],x,spec.ys[1],'ed-delta-edge');
  s+=line(v.a,spec.ys[0],v.a,spec.ys[1],'ed-center');
  const segments=mode==='jump'?[[spec.xs[0],0],[0,spec.xs[1]]]:[spec.xs];
  for(const [lo,hi]of segments){let path='';for(let i=0;i<=180;i++){const x=lo+(hi-lo)*i/180,y=mode==='jump'?(hi===0?0:1):mode==='hole'?x+1:M.value(mode,x);path+=(i?'L':'M')+sx(x)+','+sy(y);}s+=`<path d="${path}" class="ed-curve"/>`;}
  const dot=(x,y,open=false,cls='')=>`<circle cx="${sx(x)}" cy="${sy(y)}" r="5" class="ed-dot ${open?'ed-open':''} ${cls}"/>`;
  if(mode==='hole'){s+=dot(1,2,v.pointValue!==2);if(v.pointValue===5)s+=dot(1,5);}
  if(mode==='jump')s+=dot(0,0,true)+dot(0,1);
  if(v.point.y!==null)s+=dot(v.point.x,v.point.y,false,'ed-probe');
  s+='</g>';
  for(let x=Math.ceil(spec.xs[0]);x<=spec.xs[1];x++)s+=`<text x="${sx(x)}" y="326" text-anchor="middle">${x}</text>`;
  for(let y=Math.ceil(spec.ys[0]);y<=spec.ys[1];y+=2)s+=`<text x="30" y="${sy(y)+4}" text-anchor="end">${y}</text>`;
  s+=`<text x="${right}" y="16" text-anchor="end">f(x)</text><text x="${right}" y="337">x</text>`;svg.innerHTML=s;
 }
 function paint(){
  v=M.analyze(p);const t=v.point;
  root.querySelector('.ed-legend').innerHTML=`<span>青緑：${fmt(v.L-p.epsilon)} &lt; f(x) &lt; ${fmt(v.L+p.epsilon)}（L±ε）</span><span>金色：${fmt(v.a-p.delta)} &lt; x &lt; ${fmt(v.a+p.delta)}、x≠${v.a}（a±δ）</span>`;
  root.querySelector('[data-point]').innerHTML=`<p>x ≈ ${fmt(t.x)} → f(x) ≈ ${fmt(t.y)}</p><p>|x−a| = ${h(t.exactDistance)}<br>|f(x)−L| = ${h(t.exactError)}</p><strong>${!t.eligible?'対象の範囲外（中心と端点も除きます）':t.meets?'この一点は条件を満たす':'この一点が反例です'}</strong>${p.witness?'<p>反例の正確なx = '+h(t.exactX)+'</p>':''}`;
  root.querySelector('[data-range]').innerHTML=`<strong class="${v.holds?'ed-pass':'ed-fail'}">${v.holds?'すべての対象xで成立':'条件を破る点があります'}</strong><p>誤差の${v.attained?'最大値':'上限'} = ${h(v.exactBound)} ${v.holds?(v.attained?'＜':'≤'):(v.attained?'≥':'＞')} ε = ${p.epsilon}</p><p>${v.attained?'この値は実際に取るので、εと等しい場合も不成立です。':'上限は開いた区間の端に対応し、区間内では取らないため、εと等しくても成立します。'}</p>`;
  const general='<p class="ed-formula">∀ε&gt;0 ∃δ&gt;0 ∀x∈D：0&lt;|x−a|&lt;δ ⇒ |f(x)−L|&lt;ε</p><p>どんな正のεを指定されても、それに応じた正のδを選び、その範囲のすべてのxで誤差を守れることが極限の定義です。</p>';
  let proof=mode==='square'?'<h4>δ = min(1, ε/3) を選べばよい理由</h4><p>① δ≤1 と |x−1|&lt;δ から 0&lt;x&lt;2、よって |x+1|&lt;3。</p><p>② |x²−1| = |x−1||x+1| &lt; 3δ ≤ ε。</p><p>任意のε&gt;0で、このδは正です。これは十分な選び方の一つです。より大きいδが成立する場合もあります。</p>':mode==='hole'?`<h4>近くの値と、中心の値は別</h4><p>x≠1なら |f(x)−2|=|x−1|。任意のε&gt;0にδ=εを選べます。f(1)は条件の対象外なので、極限値は2のままです。</p><p>今のf(1)：${v.pointValue===null?'未定義':v.pointValue}。${v.continuous?'極限値2と一致するので連続です。':'この点では連続ではありません。'}</p>`:mode==='jump'?'<h4>どんなδでも困るεを、一つ固定する</h4><p>ε₀=0.25とします。どんなLでも、|L|と|1−L|の少なくとも一方は0.5以上です。</p><p>任意のδ&gt;0に対して、x=−δ/2とx=δ/2はどちらも対象の範囲内です。その出力は0と1なので、少なくとも一方がε₀の条件を破ります。したがって、どのLも極限値にはできません。</p><p>大きいεで今回の判定が成立しても、「任意のε」の条件を満たすことにはなりません。</p>':'<h4>εを受け取る → δを決める → 全ての対象xを調べる</h4><p>|f(x)−3| = |2x−2| = 2|x−1|。任意のε&gt;0に対してδ=ε/2と選べば、2|x−1|&lt;2δ=εです。</p><p>δはεに応じて選びます。個々のxを見てから選び直すものではありません。</p>';
  root.querySelector('[data-proof]').innerHTML=proof+general+(mode==='jump'?'':'<p>「使えるδの一例」は、上の式の値を0.0001刻みで切り下げて使います。小さく選んでも保証は保たれます。</p>');
  root.querySelector('[data-action="witness"]').disabled=!v.witness;
  root.querySelector('[data-action="epsilon"]').disabled=p.epsilon<.02;root.querySelector('[data-action="delta"]').disabled=p.delta<.0002;
  status.textContent='現在の入力を反映しています。';draw();current.completed.add(scope.id);
 }
 const sync=()=>{for(const el of form.querySelectorAll('[name]'))el.value=p[el.name];};
 const live=X.liveInput(form,scope,{accept:el=>!!el.name,apply:()=>{p={...X.readFields(form,lab,p),witness:false};paint();},error:e=>{status.textContent=e.message+' 表示は直前の結果です。';}});
 scope.on(form,'submit',e=>e.preventDefault());
 scope.on(root,'click',async e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;await live.settle();if(!scope.alive())return;p.witness=false;if(action==='safe')p.delta=v.safe;if(action==='challenge')p.epsilon=.25;if(action==='epsilon')p.epsilon=Math.max(.01,Math.floor(p.epsilon*50)/100);if(action==='delta')p.delta=Math.max(.0001,Math.floor(p.delta*5000)/10000);if(action==='witness'){p.witness=true;p.x=v.witness.x;}sync();paint();});
 const setX=x=>{p.x=Math.round(Math.max(spec.xs[0],Math.min(spec.xs[1],x))*1000)/1000;p.witness=false;sync();paint();};
 scope.on(svg,'click',e=>{const box=svg.getBoundingClientRect();setX(spec.xs[0]+(e.clientX-box.left-38)/(box.width-54)*(spec.xs[1]-spec.xs[0]));});
 scope.on(svg,'keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setX(p.x+(e.key==='ArrowLeft'?-.01:.01));}});
 const observer=new ResizeObserver(()=>draw());observer.observe(svg);scope.cleanup(()=>observer.disconnect());paint();
});
})();
