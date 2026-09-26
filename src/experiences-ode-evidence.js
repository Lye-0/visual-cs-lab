/* Decay workbook: departure slope and arrival value are never conflated. */
(() => {
'use strict';
const X=CSL.experiences,E=X.mathEvidence;
E.odeStart=(initial=2,k=1,step=.25)=>{
 for(const [value,min,max]of [[initial,-3,3],[k,0,3],[step,.05,1]])if(!Number.isFinite(value)||value<min||value>max)throw Error('初期値・係数・刻み幅の範囲を確認してください。');
 return {initial,k,step,rows:[{t:0,euler:initial,rk4:initial,exact:initial,departure:null}],selected:0};
};
E.ode=(input,action)=>{
 const s=X.clone(input);
 if(action.kind==='select'){if(!Number.isInteger(action.index)||action.index<0||action.index>=s.rows.length)throw Error('記録した一歩を選んでください。');s.selected=action.index;return s;}
 if(action.kind==='back'){if(s.rows.length>1)s.rows.pop();s.selected=s.rows.length-1;return s;}
 if(action.kind!=='step')throw Error('一歩進むか戻る操作を選んでください。');
 const old=s.rows.at(-1);if(old.t+s.step>4+1e-9)throw Error('この例は時刻4までです。');
 const eu=X.models.odeStep(old.euler,s.k,s.step),rk=X.models.odeStep(old.rk4,s.k,s.step),t=Number((old.t+s.step).toFixed(8));
 const k1=rk.stages[0],k2=rk.stages[1],k3=rk.stages[2],states=[old.rk4,old.rk4+s.step*k1/2,old.rk4+s.step*k2/2,old.rk4+s.step*k3];
 s.rows.push({t,euler:eu.euler,rk4:rk.rk4,exact:s.initial*Math.exp(-s.k*t),departure:{t:old.t,euler:old.euler,rk4:old.rk4,slope:eu.slope,delta:s.step*eu.slope,stages:rk.stages,states,stageTimes:[old.t,old.t+s.step/2,old.t+s.step/2,t],weights:[1,2,2,1]}});
 s.selected=s.rows.length-1;return s;
};
if(typeof document==='undefined')return;
X.registerWidget('ode',(root,a,current)=>{
 const scope=X.scope(root,current),h=CSL.h,F=(v,d=6)=>X.format(v,d),B=X.html.button,table=X.html.table,formula=X.html.formula;let state=E.odeStart();
 root.innerHTML='<p>微分方程式 y′=−ky は、その点での変化の割合を指定します。灰色の解の族から初期条件で一本を選び、数値計算の一歩と比べます。</p>'+`<form class="ex-inputs"><label>最初の値 y(0)<input name="initial" type="number" min="-3" max="3" step="0.5" value="2" required></label><label>減衰係数 k<input name="k" type="number" min="0" max="3" step="0.25" value="1" required></label><label>一歩の時間 h<input name="h" type="number" min="0.05" max="1" step="0.05" value="0.25" required></label><button type="submit" class="ex-button">この初期条件からやり直す</button></form><div data-ode-plot></div><p class="ex-legend">灰：別の初期条件 ／ ミント・実線：解析解 ／ 橙・破線：Euler ／ 青・点線：RK4</p><div class="ex-actions">${B('今の傾きから一歩だけ進める','data-ode-step')}${B('一歩戻す','data-ode-back')}</div><p data-ex-status role="status"></p><div data-ode-evidence></div><div data-ode-table></div><p class="ex-counterexample">この画面の例は減衰だけです。一般の微分方程式を自動的に解くものではありません。有限の記録が似ていても、任意の方程式・刻みで安定と保証したことにはなりません。</p>`;
 function paint(){
  const s=state,selected=s.rows[s.selected],all=[-3,3,...s.rows.flatMap(r=>[r.euler,r.rk4,r.exact])],extent=Math.max(3,...all.map(Math.abs))*1.12;
  const pos=(t,y)=>[46+107*t,178-y*145/extent],poly=rows=>rows.map(([t,y])=>pos(t,y).join(',')).join(' ');
  const family=[-3,-2,-1,0,1,2,3].map(initial=>`<polyline class="ex-family-line" points="${poly(Array.from({length:81},(_,i)=>[i/20,initial*Math.exp(-s.k*i/20)]))}"/>`).join('');
  const exact=poly(Array.from({length:81},(_,i)=>[i/20,s.initial*Math.exp(-s.k*i/20)]));
  const axes=Array.from({length:5},(_,i)=>`<text x="${46+107*i}" y="344">${i}</text><path class="ex-grid-line" d="M${46+107*i} 26V323"/>`).join('')+[-1,-.5,0,.5,1].map(scale=>{const y=scale*extent,py=pos(0,y)[1];return `<text x="4" y="${py+4}">${h(F(y,2))}</text><path class="ex-grid-line" d="M46 ${py}H474"/>`;}).join('');
  const dot=pos(selected.t,selected.euler);
  root.querySelector('[data-ode-plot]').innerHTML=`<svg viewBox="0 0 510 368" class="ex-ode-plot ex-me-ode" role="img" aria-label="解の族とEuler法とRK4の記録。縦軸は全ての計算値に合わせて拡大"><title>時刻tとy。大きな誤差も隠さず、全ての計算点を描きます</title>${axes}<path class="ex-axis" d="M46 26V323M46 178H474"/>${family}<polyline class="ex-exact" points="${exact}"/><polyline class="ex-euler" points="${poly(s.rows.map(r=>[r.t,r.euler]))}"/><polyline class="ex-rk" points="${poly(s.rows.map(r=>[r.t,r.rk4]))}"/>${s.rows.map(r=>{const [x,y]=pos(r.t,r.euler);return `<circle class="ex-euler-dot" cx="${x}" cy="${y}" r="3"/>`;}).join('')}<circle class="ex-me-selected" cx="${dot[0]}" cy="${dot[1]}" r="7"/><text x="480" y="344">t</text><text x="44" y="18">y</text></svg><p>縦軸の表示範囲：−${F(extent,2)}〜${F(extent,2)}。計算値が大きくなった場合は自動で広げます。軸の目盛りも一緒に読んでください。</p>`;
  const d=selected.departure;
  root.querySelector('[data-ode-evidence]').innerHTML=d?`<section class="ex-sec-box"><h4>時刻${F(d.t)}から${F(selected.t)}へ：この一歩に使った値</h4>${table(['対象','出発点の時刻','出発点の値','出発点での傾き'],[['Euler',F(d.t),F(d.euler),F(d.slope)]])}${formula('到着値 = 出発値 + 時間幅 × 出発点での傾き')}${formula(F(selected.euler)+' = '+F(d.euler)+' + '+F(s.step)+' × ('+F(d.slope)+')')}<p>傾き−k yを評価したのは時刻${F(d.t)}です。到着時刻${F(selected.t)}のEuler値から評価する次の傾きは${F(-s.k*selected.euler)}で、今回使った傾きとは区別します。</p></section><section class="ex-sec-box"><h4>同じ一歩のRK4：途中で四回、傾きを調べる</h4>${table(['評価','評価時刻','仮の値y','傾き−k y','重み'],d.stages.map((k,i)=>['k'+(i+1),F(d.stageTimes[i]),F(d.states[i]),F(k),d.weights[i]]))}${formula('RK4到着値 = '+F(d.rk4)+' + ('+F(s.step)+'/6) × ('+d.stages.map((k,i)=>d.weights[i]+'×('+F(k)+')').join(' + ')+') = '+F(selected.rk4))}<p>RK4はRK4自身の出発値を使います。途中の評価値は補助計算であり、別の時刻の確定した解を得たわけではありません。表示は丸めていますが、次の計算には表示前の数値を使います。</p></section>`:`<section class="ex-sec-box"><h4>出発点を決めました</h4>${formula('y(0) = '+F(s.initial)+'　傾き = −'+F(s.k)+' × ('+F(s.initial)+') = '+F(-s.k*s.initial))}<p>まだ一歩も計算していません。最初のボタンで、傾きに時間幅を掛けて次の値を作ります。</p></section>`;
  root.querySelector('[data-ode-table]').innerHTML=`<div class="ex-actions" aria-label="説明する一歩を選ぶ">${s.rows.map((r,i)=>B(i===0?'出発点':'t='+F(r.t),`data-ode-select="${i}" aria-pressed="${s.selected===i}"`)).join('')}</div>`+table(['記録した時刻t','Euler値','RK4値','解析解','Euler値 − 解析解'],s.rows.map(r=>[r.t,r.euler,r.rk4,r.exact,r.euler-r.exact].map(v=>F(v))));
  const status=root.querySelector('[data-ex-status]');status.className='';status.textContent=d?'選んだ一歩の出発点・計算・到着点を同時に表示しています。':'初期条件を選びました。一歩進めると近似計算が始まります。';
  root.querySelector('[data-ode-step]').disabled=s.rows.at(-1).t+s.step>4+1e-9;root.querySelector('[data-ode-back]').disabled=s.rows.length===1;root.dataset.odeState=JSON.stringify(s);current.completed.add(scope.id);
 }
 X.liveForm(root,scope);scope.on(root.querySelector('form'),'submit',event=>{event.preventDefault();try{if(!event.target.reportValidity())return;const f=event.target.elements;state=E.odeStart(Number(f.initial.value),Number(f.k.value),Number(f.h.value));paint();}catch(error){scope.error(error);}});
 scope.on(root,'click',event=>{try{const select=event.target.closest('[data-ode-select]');if(select){state=E.ode(state,{kind:'select',index:Number(select.dataset.odeSelect)});paint();root.querySelector('[data-ode-select="'+state.selected+'"]')?.focus({preventScroll:true});}else if(event.target.closest('[data-ode-step]')){state=E.ode(state,{kind:'step'});paint();}else if(event.target.closest('[data-ode-back]')){state=E.ode(state,{kind:'back'});paint();}}catch(error){scope.error(error);}});paint();
});
})();
