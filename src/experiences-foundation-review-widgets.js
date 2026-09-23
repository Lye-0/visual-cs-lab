/* Three different objects: a message in transit, an area term, and a DP cell. */
(() => {
'use strict';
if(typeof document==='undefined')return;
const L=CSL,X=L.experiences,V=X.foundationReview,S=X.securityDesk,h=L.h,F=X.format;
const {b,p,box,table}=S.ui,formula=X.html.formula;
X.registerWidget('hamming-roles',(root,a,c)=>S.mount(root,c,{
 start:V.hammingStart,reduce:V.hamming,
 instruction:'情報4bitを符号化し、通信路の位置3を一つ反転してから届けてください。受信側で検査1を選び、どのbitを使ったかを確認します。最後に単一誤りの訂正規則を使います。',
 action:code=>{const [kind,value]=code.split(':');return kind==='message'||kind==='flip'?{kind,index:Number(value)}:kind==='check'?{kind,mask:Number(value)}:{kind};},
 render:s=>{
  const labels=['検査1','検査2','情報1','検査4','情報2','情報3','情報4'];
  const bits=(values,type)=>values?`<div class="ex-fr-bits" data-fr-word="${type}">${values.map((bit,i)=>type==='channel'?b(String(bit),'flip:'+i,`aria-label="通信路・位置${i+1}のbitを反転"`):`<div class="${type==='received'&&((i+1)&s.mask)?'ex-fr-source':''}" data-fr-position="${i+1}"><small>位置${i+1}</small><strong>${bit}</strong><small>${labels[i]}</small></div>`).join('')}</div>`:p('まだありません。');
  let receiver=bits(s.received,'received')+b('受信した7bitだけで検査する','inspect',s.received?'':'disabled');
  if(s.report){const q=s.report.checks.find(x=>x.mask===s.mask);receiver+=`<div class="ex-actions">${s.report.checks.map(q=>b('検査'+q.mask+'：'+(q.parity?'不一致':'一致'),'check:'+q.mask,`aria-pressed="${q.mask===s.mask}"`)).join('')}</div>`+table(['今回の検査が読む位置','受信した値'],q.positions.map((pos,i)=>[pos,q.values[i]]))+formula(q.values.join(' ⊕ ')+' = '+q.parity)+p('⊕はXORです。含まれる1が偶数個なら0、奇数個なら1になります。')+formula('シンドローム = '+s.report.checks.map(q=>q.mask+'×'+q.parity).join(' + ')+' = '+s.report.syndrome)+b('高々1bit誤りと仮定して訂正する','correct');}
  if(s.repaired)receiver+=box('規則を適用した結果',bits(s.repaired,'repaired')+p('情報bitの読取り：'+[s.repaired[2],s.repaired[4],s.repaired[5],s.repaired[6]].join(''))+p('受信側の判断だけでは、仮定を超える誤りから本当に元へ戻ったかは分かりません。'));
  let comparison='';if(s.repaired){const errors=s.received.reduce((n,bit,i)=>n+Number(bit!==s.sent[i]),0),equal=s.repaired.every((bit,i)=>bit===s.sent[i]);comparison=box('送信列も知る実験者の答え合わせ',table(['比較する対象','値'],[['受信前に違っていた位置の数',errors],['送信側の情報',s.message.join('')],['訂正候補の情報',[s.repaired[2],s.repaired[4],s.repaired[5],s.repaired[6]].join('')],['送信した7bitと一致するか',equal?'一致':'不一致']])+p(errors>=2?'今回は単一誤りの仮定を超えています。検査に合う別の符号語へ変わることもあるため、訂正候補を正解と決めないでください。':'0または1bit誤りの範囲で、元の符号語へ戻せることを照合しました。'));
  }
  return `<div class="ex-fr-two">${box('1　送信側：情報から検査bitを作る',`<div class="ex-fr-message">${s.message.map((bit,i)=>b('情報'+(i+1)+'：'+bit,'message:'+i,`aria-label="情報bit${i+1}を反転"`)).join('')}</div>`+b('この4bitを符号化する','encode')+bits(s.sent,'sent')+p('位置1・2・4が検査bitです。位置3・5・6・7には元の情報を入れます。'))}${box('2　通信路：届ける前にbitを変える',bits(s.channel,'channel')+p('左から位置1〜7。押すたびに一つ反転します。同じ位置をもう一度押すと元に戻ります。')+b('今の7bitを受信側へ届ける','deliver',s.channel?'':'disabled')+p('一度届けた列は、通信路を後から変更しても変わりません。もう一度届けると新しく受信します。'))}</div>${box('3　受信側：届いた7bitで判断する',receiver)}${comparison}${p('Hamming(7,4)・偶数パリティの小例です。訂正の保証は高々1bit誤りであり、拡張ハミング符号の2bit検出とは別です。画面の送信列は学習者向けの比較にのみ使い、受信側の計算へ渡していません。')}`;
 }
}));

X.registerWidget('trapezoid-select',(root,a,c)=>{
 const ui=S.mount(root,c,{
  start:V.integralStart,reduce:V.integral,
  instruction:'塗られた台形か、その下の区間ボタンを選んでください。選んだ一つの幅・両端の高さ・式の項が対応します。その項を全部足したものが近似積分です。',
  action:(code,f)=>code.startsWith('select:')?{kind:'select',index:Number(code.split(':')[1])}:{kind:'configure',start:f.get('start'),end:f.get('end'),n:f.get('n'),fresh:true},
  render:(s,{field})=>{
   const v=V.integralView(s),sel=v.selected,lo=Math.min(s.start,s.end)-.35,hi=Math.max(s.start,s.end)+.35,ymax=Math.max(lo*lo,hi*hi,1)*1.08;
   const x=v=>46+548*(v-lo)/(hi-lo),y=v=>252-214*v/ymax;
   const polys=v.cells.map(t=>`<polygon data-fr-area="${t.i}" class="ex-fr-area${t.i===s.selected?' is-active':''}" points="${x(t.x0)},${y(0)} ${x(t.x0)},${y(t.y0)} ${x(t.x1)},${y(t.y1)} ${x(t.x1)},${y(0)}"><title>区間${t.i+1}を選ぶ</title></polygon>`).join('');
   const curve=Array.from({length:81},(_,i)=>{const xx=lo+(hi-lo)*i/80;return x(xx)+','+y(xx*xx);}).join(' ');
   const uniqueTicks=s.start===s.end?[s.start]:[Math.min(s.start,s.end),Math.max(s.start,s.end)];
   const graph=`<svg class="ex-fr-area-plot" viewBox="0 0 640 300" role="img" aria-label="f(x)=x²の曲線と各区間の台形。下の区間ボタンでも選べます"><title>曲線と台形は、同じ端点から計算しています</title><path class="ex-fr-axis" d="M46 28V252H602"/>${polys}<polyline class="ex-fr-curve" points="${curve}"/>${uniqueTicks.map(t=>`<text x="${x(t)}" y="278" text-anchor="middle">${h(F(t))}</text>`).join('')}<text x="16" y="258">0</text><text x="20" y="24">y</text><text x="608" y="259">x</text><circle cx="${x(sel.x0)}" cy="${y(sel.y0)}" r="5"/><circle cx="${x(sel.x1)}" cy="${y(sel.y1)}" r="5"/></svg>`;
   return `<form class="ex-fr-form">${field('start','始点 a',s.start,{min:-3,max:3,step:'any'})}${field('end','終点 b',s.end,{min:-3,max:3,step:'any'})}${field('n','区間の分割数 n',s.n,{min:1,max:16})}${b('この区間と分割を使う','configure')}</form>`+box('f(x)=x²：曲線と一つの台形',graph+`<div class="ex-actions">${v.cells.map(t=>b('区間'+(t.i+1),'select:'+t.i,`aria-pressed="${t.i===s.selected}"`)).join('')}</div>`)+
   box('選んだ区間'+(s.selected+1)+'の一項を読む',table(['どの量か','今回の値'],[['左側の計算端点 xᵢ',F(sel.x0)],['次の計算端点 xᵢ₊₁',F(sel.x1)],['始めの高さ f(xᵢ)',F(sel.y0)],['次の高さ f(xᵢ₊₁)',F(sel.y1)],['符号付きの幅 Δx',F(sel.dx)]])+formula('この項 = Δx × {f(xᵢ)+f(xᵢ₊₁)}/2')+formula(F(sel.dx)+' × ('+F(sel.y0)+' + '+F(sel.y1)+') / 2 = '+F(sel.contribution)))+
   box('一項ずつを足して全体にする',`<div class="ex-fr-sum">${v.cells.map(t=>b((t.i?'＋ ':'')+F(t.contribution),'select:'+t.i,`aria-label="和の第${t.i+1}項を読む" aria-pressed="${t.i===s.selected}"`)).join('')}</div>`+formula('台形の和 = '+F(v.sum))+table(['比較','値'],[['解析的な積分 (b³−a³)/3',F(v.exact)],['台形の和 − 解析的な値',F(v.error)]]))+p(s.start>s.end?'今回は始点が終点より大きく、Δxは負です。図の正の幾何学的面積と、逆向きに積分した符号付きの値を区別してください。':s.start===s.end?'始点と終点が同じなので幅は0、全ての項と積分は0です。':'曲線の下の面積を、直線で結んだ台形の和で近似します。この二つを同じ値だと決めず、分割数を変えて差を比べてください。')+p('関数はx²に固定した小例です。表示桁を丸めることと、曲線を台形へ置き換える近似は別です。');
  }
 });
 ui.scope.on(root,'click',e=>{const area=e.target.closest('[data-fr-area]');if(!area)return;e.preventDefault();const index=Number(area.dataset.frArea);void ui.apply({kind:'select',index}).then(()=>root.querySelector('[data-sec-action="select:'+index+'"]')?.focus({preventScroll:true}));});
});

X.registerWidget('knapsack-cells',(root,a,c)=>S.mount(root,c,{
 start:V.knapsackStart,reduce:V.knapsack,
 instruction:'まず表の「Dまで・容量7」を選びます。「Dを入れない」と「Dを1個入れる」の二つが、どの小さな問題の答えを使うか比べてください。青緑の枠と橙の枠が参照元です。',
 action:(code,f)=>{const [kind,x,y]=code.split(':');return kind==='select'?{kind,row:Number(x),col:Number(y)}:kind==='capacity'?{kind,value:f.get('capacity'),fresh:true}:{kind:'item',index:Number(x),weight:f.get('weight-'+x),value:f.get('value-'+x)};},
 render:(s,{field})=>{
  const v=V.knapsackView(s),match=(ref,i,j)=>ref&&ref.row===i&&ref.col===j;
  const matrix=`<div class="ex-fr-table-scroll" role="region" aria-label="品物と容量の動的計画表。横にスクロールできます" tabindex="0"><table class="ex-fr-dp"><caption>行：使ってよい品物 ／ 列：容量の上限</caption><thead><tr><th scope="col">品物の範囲</th>${Array.from({length:s.capacity+1},(_,i)=>'<th scope="col">'+i+'</th>').join('')}</tr></thead><tbody>${v.dp.map((row,i)=>`<tr><th scope="row">${i?s.items[i-1].name+'まで':'品物なし'}</th>${row.map((value,j)=>`<td class="${match(v.skip,i,j)?'ex-fr-skip':''} ${match(v.take,i,j)?'ex-fr-take':''}">${b(String(value),'select:'+i+':'+j,`aria-label="${i?s.items[i-1].name+'まで':'品物なし'}・容量${j}の最大価値${value}" aria-pressed="${i===s.row&&j===s.col}"`)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  let explanation=p('使う品物がない行では、どの容量でも最大価値は0です。');
  if(v.item){const name=v.item.name;explanation=table(['今回の問い','値'],[['使ってよい品物',s.items.slice(0,s.row).map(x=>x.name).join('、')],['容量の上限',s.col],[name+'の重さ',v.item.weight],[name+'の価値',v.item.value]])+`<div class="ex-fr-two">${box(name+'を入れない',p('一つ上の行・同じ容量'+v.skip.col+'を読む。')+formula('dp['+v.skip.row+']['+v.skip.col+'] = '+v.skip.value))}${box(name+'を1個入れる',v.take?p('重さ'+v.item.weight+'を引いた残り容量'+v.take.col+'について、一つ上の行を読む。')+formula('dp['+v.take.row+']['+v.take.col+'] + '+v.item.value+' = '+v.take.previous+' + '+v.item.value+' = '+v.take.value):p('重さ'+v.item.weight+'が容量'+s.col+'を超えるため、この選択はできません。負の容量を表に探しません。'))}</div>`+formula(v.take?'dp['+s.row+']['+s.col+'] = max('+v.skip.value+', '+v.take.value+') = '+v.value:'dp['+s.row+']['+s.col+'] = '+v.skip.value)+p(v.tie?'二つの候補は同じ最大価値です。どちらも最適ですが、下の一例の復元では入れない側を選びます。':'両方の候補が参照するのは一つ上の行です。同じ行を参照すると同じ品物を再利用し得るため、0/1問題とは別になります。');}
  return box('品物はそれぞれ1個だけ使える',table(['品物','重さ','価値'],s.items.map(i=>[i.name,i.weight,i.value]))+`<form class="ex-fr-form">${field('capacity','バッグの容量',s.capacity,{min:0,max:12})}${b('容量を変えて計算する','capacity')}</form>`)+box('結果のセルから二つの参照元へ戻る',matrix+p('押されているセルが今回の答え。青緑枠は入れない場合、橙枠は入れる場合の参照元です。'))+box('選んだセルの計算',explanation)+`<details class="ex-fr-details"><summary>全品物・現在の容量で選ぶ一例を逆にたどる</summary>${table(['今回のセル','選ぶか','次に見る容量'],v.trace.map(t=>['dp['+t.row+']['+t.col+'] = '+t.value,t.item+(t.chosen?'を入れる':'を入れない'),t.nextCol]))}${p('選ぶ一例：'+(v.bag.join('、')||'なし')+'。最大価値：'+v.optimum+'。バッグを隙間なく満たすことではなく、容量以内の価値が目的です。')}</details><details class="ex-fr-details"><summary>品物の条件を変えてみる</summary>${s.items.map((i,index)=>box(i.name,field('weight-'+index,'重さ',i.weight,{min:1,max:8})+field('value-'+index,'価値',i.value,{min:0,max:12})+b(i.name+'の条件を反映','item:'+index))).join('')}</details>`;
 }
}));
})();
