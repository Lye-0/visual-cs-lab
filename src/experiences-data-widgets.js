/* Direct data experiences. Controls preserve focus and edits are explicit. */
(() => {
'use strict';
const L=CSL,X=L.experiences,h=L.h,F=X.format,B=X.html.button,T=X.html.table;
X.registerWidget('conditional',(root,a,c)=>{
 const s=X.scope(root,c);let counts=[3,1,1,3],condition=null;
 const entropy=ps=>ps.reduce((sum,p)=>sum-(p?p*Math.log2(p):0),0);
 function paint(focus){
  const total=counts.reduce((n,x)=>n+x,0),joint=counts.map(n=>n/total),rows=[joint[0]+joint[1],joint[2]+joint[3]],cols=[joint[0]+joint[2],joint[1]+joint[3]],m=condition===null?total:counts[condition*2]+counts[condition*2+1],ys=condition===null?cols:counts.slice(condition*2,condition*2+2).map(n=>m?n/m:0),H=entropy(joint),HX=entropy(rows),HY=entropy(cols);
  root.innerHTML=`<p>表の数は、同じ確率で選べる事例の個数です。行を選ぶと、そのXだった場合に絞ります。残る個数が、新しい分母です。</p><div class="table-wrap"><table class="ex-contingency"><caption>同時分布の元になる事例</caption><thead><tr><th></th><th>Y=0</th><th>Y=1</th><th>行の合計</th></tr></thead><tbody>${[0,1].map(i=>`<tr class="${condition===i?'selected':''}"><th>${B('X='+i,`data-cond="${i}" aria-pressed="${condition===i}"`)}</th>${[0,1].map(j=>`<td><strong>${counts[i*2+j]}</strong><div>${B('−',`data-cell="${i*2+j}" data-delta="-1" aria-label="X${i} Y${j}を1減らす"${counts[i*2+j]===0||total===1?' disabled':''}`)}${B('＋',`data-cell="${i*2+j}" data-delta="1" aria-label="X${i} Y${j}を1増やす"${counts[i*2+j]>=12?' disabled':''}`)}</div></td>`).join('')}<td>${counts[i*2]+counts[i*2+1]}</td></tr>`).join('')}</tbody><tfoot><tr><th>列の合計</th><td>${counts[0]+counts[2]}</td><td>${counts[1]+counts[3]}</td><td>${total}</td></tr></tfoot></table></div><div class="ex-actions">${B('Xをまだ知らない状態','data-cond="all"')}${B('独立な等確率の例','data-cond-independent')}${B('XとYが必ず一致する例','data-cond-identical')}</div><section class="ex-why"><h4>${condition===null?'Xを知らないときのY':'X='+condition+'を知った後のY'}</h4>${m?T(['Y','確率','分母'],[['Y=0',F(ys[0]),m],['Y=1',F(ys[1]),m]]):'<p>この条件の事例は0個なので、条件付き確率は定まりません。</p>'}<p>ここでの分母は${m}。${condition===null?'全ての事例からYを見るためです。':'X='+condition+'だった事例だけへ絞ったためです。'}</p></section>${T(['平均情報量','bit'],[['H(X)',F(HX)],['H(Y)',F(HY)],['H(X,Y)',F(H)],['H(Y|X)=H(X,Y)−H(X)',F(H-HX)],['I(X;Y)=H(X)+H(Y)−H(X,Y)',F(HX+HY-H)]])}<p data-ex-status role="status">一つの行での不確かさと、それを各Xの確率で平均したH(Y|X)は別です。</p>`;
  if(focus)root.querySelector(focus)?.focus({preventScroll:true});c.completed.add(s.id);
 }
 s.on(root,'click',e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;let focus;
  if(b.hasAttribute('data-cell')){const i=+b.dataset.cell,d=+b.dataset.delta;if(!Number.isInteger(i)||i<0||i>3||![-1,1].includes(d))return;const next=counts[i]+d;if(next<0||next>12||counts.reduce((s,n)=>s+n,0)+d<1)return;counts[i]=next;focus=`[data-cell="${i}"][data-delta="${d}"]`;}
  else if(b.hasAttribute('data-cond')){condition=b.dataset.cond==='all'?null:+b.dataset.cond;focus=`[data-cond="${b.dataset.cond}"]`;}
  else if(b.hasAttribute('data-cond-independent')){counts=[2,2,2,2];focus='[data-cond-independent]';}
  else if(b.hasAttribute('data-cond-identical')){counts=[4,0,0,4];focus='[data-cond-identical]';}
  else return;
  paint(focus);
  if(document.activeElement===document.body)root.querySelector('[data-cond="all"]').focus({preventScroll:true});
 });paint();
});
X.registerWidget('sets',(root,a,c)=>{
 const s=X.scope(root,c);let left=new Set([1,2,3,4]),right=new Set([3,4,5]),op='intersection';
 function paint(focus){
  const selected=Array.from({length:6},(_,i)=>i+1).filter(n=>op==='union'?left.has(n)||right.has(n):op==='intersection'?left.has(n)&&right.has(n):left.has(n)&&!right.has(n));
  root.innerHTML=`<p>この小例の要素は1〜6です。押されている札が、その集合に含まれています。</p><div class="ex-side-by-side">${[['A',left],['B',right]].map(([label,set])=>`<section><h4>集合${label}</h4><p>札を押して所属を切り替えます。</p><div class="ex-set-tokens">${Array.from({length:6},(_,i)=>`<button type="button" data-set="${label}" data-value="${i+1}" aria-label="要素${i+1}の集合${label}への所属を切り替える" aria-pressed="${set.has(i+1)}">${i+1}</button>`).join('')}</div></section>`).join('')}</div><div class="ex-actions">${[['union','A∪B：どちらかにいる'],['intersection','A∩B：両方にいる'],['difference','A−B：AにいてBにいない']].map(([value,label])=>B(label,`data-set-op="${value}" aria-pressed="${op===value}"`)).join('')}</div><div class="ex-set-answer"><strong>{ ${selected.join(', ')} }</strong><p>${op==='union'?'Aだけ・Bだけ・両方の札を残します。':op==='intersection'?'両方で選ばれている札だけを残します。':'出発点はAです。Bにもある札を除きます。'}</p></div>${B('AとBを交換して比べる','data-set-swap')}<p data-ex-status role="status">${selected.length?'残る要素は '+selected.join(', ')+' です。':'条件を満たす要素がないので空集合です。'} 差集合では左右を交換すると、同じ答えになるとは限りません。</p>`;
  if(focus)root.querySelector(focus)?.focus({preventScroll:true});c.completed.add(s.id);
 }
 s.on(root,'click',e=>{
  const b=e.target.closest('button');if(!b)return;let focus;
  if(b.hasAttribute('data-set')){const set=b.dataset.set==='A'?left:right,n=+b.dataset.value;if(!Number.isInteger(n)||n<1||n>6)return;set.has(n)?set.delete(n):set.add(n);focus=`[data-set="${b.dataset.set}"][data-value="${n}"]`;}
  else if(b.hasAttribute('data-set-op')){if(!['union','intersection','difference'].includes(b.dataset.setOp))return;op=b.dataset.setOp;focus=`[data-set-op="${op}"]`;}
  else if(b.hasAttribute('data-set-swap')){[left,right]=[right,left];focus='[data-set-swap]';}
  else return;
  paint(focus);
 });paint();
});
X.registerWidget('regression',(root,a,c)=>{
 const s=X.scope(root,c),points=[[-2,-2.7],[-1,0],[0,.6],[1,3.2],[2,4.7]];let slope=0,intercept=0,steps=0;
 root.innerHTML=`<p>まず直線を自分で合わせてください。点から線への縦の差が残差です。各残差を二乗して平均した量を、小さくしたいと考えます。</p><form class="ex-inputs"><label>傾き a<input name="slope" type="number" step="any" min="-3" max="3" value="0" required></label><label>切片 b<input name="intercept" type="number" step="any" min="-3" max="3" value="0" required></label><button type="submit" class="ex-button">この直線にする</button></form><div data-reg-plot></div><div data-reg-table></div><div class="ex-actions">${B('勾配で一歩だけ改善する','data-reg-step')}${B('最初の直線へ戻す','data-reg-reset')}</div><p data-ex-status role="status"></p>`;
 const form=root.querySelector('form'),project=(x,y)=>[240+x*75,270-y*35];
 function paint(){
  const residuals=points.map(([x,y])=>slope*x+intercept-y),mse=residuals.reduce((s,r)=>s+r*r,0)/points.length,ga=2*residuals.reduce((s,r,i)=>s+r*points[i][0],0)/points.length,gb=2*residuals.reduce((s,r)=>s+r,0)/points.length;
  root.querySelector('[data-reg-plot]').innerHTML=`<svg viewBox="0 0 500 380" class="ex-regression-plot" role="img" aria-label="点と予測直線、その間の残差"><path class="ex-axis" d="M20 270H480M240 15V365"/><path class="ex-exact" d="M${project(-3,slope*-3+intercept)}L${project(3,slope*3+intercept)}"/>${points.map(([x,y])=>`<path class="ex-residual" d="M${project(x,y)}L${project(x,slope*x+intercept)}"/><circle cx="${project(x,y)[0]}" cy="${project(x,y)[1]}" r="5" class="ex-point"/>`).join('')}</svg>`;
  root.querySelector('[data-reg-table]').innerHTML=X.html.formula(`ŷ = ${F(slope,3)}x + ${F(intercept,3)}　／ MSE=${F(mse,4)}`)+T(['入力x','観測y','予測ŷ','残差','二乗の寄与'],points.map(([x,y],i)=>[x,y,F(slope*x+intercept),F(residuals[i]),F(residuals[i]**2/points.length)]));
  root.querySelector('[data-ex-status]').textContent=`確定した直線の勾配は傾き方向${F(ga,3)}、切片方向${F(gb,3)}。一歩ではそれぞれの0.1倍を引きます。実行${steps}回。`;
  c.completed.add(s.id);return [ga,gb];
 }
 s.on(form,'input',()=>{root.querySelector('[data-reg-step]').disabled=true;root.querySelector('[data-ex-status]').textContent='数値を編集中です。「この直線にする」で確定してください。図はまだ変更前の直線です。';});
 s.on(form,'submit',e=>{e.preventDefault();if(!form.reportValidity())return;slope=+form.elements.slope.value;intercept=+form.elements.intercept.value;steps=0;root.querySelector('[data-reg-step]').disabled=false;paint();});
 s.on(root,'click',e=>{
  const advance=e.target.closest('[data-reg-step]'),reset=e.target.closest('[data-reg-reset]');
  // A submit click must not overwrite the learner's typed values before submit.
  if(!advance&&!reset)return;if(advance?.disabled)return;
  if(advance){const [ga,gb]=paint();slope-=.1*ga;intercept-=.1*gb;steps++;}
  if(reset){slope=0;intercept=0;steps=0;}
  form.elements.slope.value=String(slope);form.elements.intercept.value=String(intercept);root.querySelector('[data-reg-step]').disabled=false;paint();
 });paint();
});
})();
