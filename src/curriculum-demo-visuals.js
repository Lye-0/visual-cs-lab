/* Local DOM interaction examples. No storage, outbound requests or global UI changes. */
(() => {
'use strict';
const L=CSL,h=L.h,previous=L.visualize;
let counter=0;
const number=(x,lo,hi,fallback)=>Number.isFinite(Number(x))?Math.max(lo,Math.min(hi,Number(x))):fallback;
const renderStates=typeof WeakMap==='function'?new WeakMap():null;
function markup(v,id){
 const caption='<p class="cv-demo-warning">この枠だけが実験対象です。外部へ送信せず、条件変更・画面移動で初期化します。</p>';
 if(v.kind==='feedback')return caption+`<h3>架空の項目を削除する</h3><ul data-cv-items><li>項目A</li><li>項目B</li><li>項目C</li></ul><button type="button" data-cv-action="delete">最後の項目を削除</button>${v.undo?'<button type="button" data-cv-action="undo" disabled>直前の削除を取り消す</button>':''}<div data-cv-confirm hidden><p>最後の項目を削除しますか？</p><button type="button" class="cv-danger-action" data-cv-action="confirm">削除する</button><button type="button" data-cv-action="cancel">やめる</button></div><p role="status" aria-live="polite" data-cv-output>項目は3つあります。</p>`;
 if(v.kind==='target')return caption+`<h3>交互に現れる対象を押す</h3><p>最初のクリックで始めます。時間には反応と移動が含まれ、能力評価ではありません。</p><div class="cv-target-area"><button type="button" data-cv-action="target" class="cv-target" aria-label="計測対象。押すと次の位置へ動きます" style="width:${number(v.size,20,90,36)}px;height:${number(v.size,20,90,36)}px;left:6px;top:60px">●</button></div><p role="status" aria-live="polite" data-cv-output>まだ計測していません。</p>`;
 if(v.kind==='accessibility'){
  const field=`<div class="cv-demo-field" style="order:1">${v.label?`<label for="${id}-input">学びたい単元</label>`:''}<input id="${id}-input" placeholder="入力してください" value="ネットワーク" type="text"></div>`;
  const action=v.native?'<button type="button" data-cv-action="access" style="order:2">確認する</button>':'<div class="cv-faux-button" data-cv-action="access" style="order:2">確認する</div>';
  return caption+`<h3>名前と操作方法を比べる</h3><div class="cv-demo-form${v.focus?'':' cv-hide-focus'}">${v.order?field+action:action+field}</div><p data-cv-output ${v.live?'role="status" aria-live="polite"':''}>まだ確認していません。</p><p class="cv-caption">${v.native?'Tabでボタンへ進み、Enterで操作できます。':'このdivにはrole・tabindex・キー処理を付けていません。見た目だけでは標準ボタンと同じ操作になりません。'}</p>`;
 }
 if(v.kind==='browser-layout'){
  const layout=['block','flex','grid'].includes(v.layout)?v.layout:'block',width=number(v.width,200,600,320),gap=number(v.gap,0,30,10),count=Math.round(number(v.items,2,6,4));
  return caption+`<h3>実際のCSSで配置する</h3><div class="cv-demo-scroll"><div data-cv-layout class="cv-layout-box" style="width:${width}px;display:${layout};gap:${gap}px;flex-wrap:wrap;grid-template-columns:repeat(2,minmax(0,1fr))">${Array.from({length:count},(_,i)=>`<div class="cv-layout-item" style="box-sizing:${v.borderBox?'border-box':'content-box'}">要素${i+1}</div>`).join('')}</div></div><div data-cv-output aria-live="polite">配置後の矩形を計測します。</div><p class="cv-caption">子要素はwidth:100px、padding:12px、border:2pxです。gapは通常のblock配置の余白にはなりません。</p>`;
 }
 if(v.kind==='browser-events')return caption+`<h3>イベントの伝わる順番</h3><div data-cv-outer class="cv-event-parent"><span>外側の要素</span><button type="button" data-cv-event-target>内側のボタンを押す</button></div><ol data-cv-output aria-live="polite"><li>まだイベントはありません。</li></ol>`;
 if(v.kind==='browser-form')return caption+`<h3>ブラウザのフォーム検証</h3><form data-cv-native-form><label for="${id}-input">単元名 ${v.required?'（必須）':'（任意）'}</label><input id="${id}-input" name="unit" type="text" ${v.required?'required':''} maxlength="60" value="${h(v.value||'')}"><button type="submit">検証して模擬送信</button></form><p data-cv-output role="status" aria-live="polite">まだ送信していません。</p>`;
 throw Error('未対応のDOM実験です: '+v.kind);
}
function afterRender(id,v){
 if(typeof document==='undefined'||typeof requestAnimationFrame==='undefined')return;
 requestAnimationFrame(()=>{
  const root=document.getElementById(id);if(!root)return;renderStates.set(root,{v,items:['項目A','項目B','項目C'],busy:false,last:null,requests:0,lastClick:null,lastCenter:null,times:[],positions:[]});
  if(v.kind==='browser-layout'){
   const box=root.querySelector('[data-cv-layout]'),base=box.getBoundingClientRect(),measurements=[...box.children].map((el,i)=>{const b=el.getBoundingClientRect(),round=x=>Number(x.toFixed(2));return [i+1,round(b.left-base.left),round(b.top-base.top),round(b.width),round(b.height)];});
   root.querySelector('[data-cv-output]').innerHTML=L.table({headers:['要素','x','y','幅px','高さpx'],rows:measurements},'ブラウザが実際に計算した矩形');
  }
  if(v.kind==='browser-events'){
   const outer=root.querySelector('[data-cv-outer]'),target=root.querySelector('[data-cv-event-target]'),output=root.querySelector('[data-cv-output]');let log=[];
   for(const [node,name,capture]of [[root,'root capture',true],[outer,'outer capture',true],[target,'target capture',true],[target,'target bubble',false],[outer,'outer bubble',false],[root,'root bubble',false]])node.addEventListener('click',event=>{if(event.target!==target)return;if(name==='root capture')log=[];log.push(name+' / eventPhase='+event.eventPhase);const stop=v.stopAt==='outer-capture'&&name==='outer capture'||v.stopAt==='target'&&name==='target bubble';if(stop){event.stopPropagation();log.push('ここでstopPropagation()');}output.innerHTML=log.map(row=>'<li>'+h(row)+'</li>').join('');},capture);
  }
  if(v.kind==='browser-form'){
   const form=root.querySelector('form'),output=root.querySelector('[data-cv-output]');form.addEventListener('invalid',event=>{output.textContent='ブラウザの制約検証で停止：'+event.target.validationMessage;},true);
   form.addEventListener('submit',event=>{event.preventDefault();output.textContent='検証を通過。模擬送信した単元名：'+form.elements.unit.value+'（外部送信はしていません）';});
  }
 });
}
L.visualize=(v,ctx={})=>{
 if(v?.type!=='curriculum-demo')return previous(v,ctx);
 const id='cv-demo-'+(++counter);afterRender(id,v);return `<section class="cv-demo" id="${id}" data-cv-kind="${h(v.kind)}" aria-label="単元内の操作実験">${markup(v,id)}</section>`;
};
if(typeof document!=='undefined'){
 document.addEventListener('submit',event=>{if(event.target.closest?.('.cv-demo'))event.preventDefault();},true);
 document.addEventListener('click',event=>{
  const control=event.target.closest?.('[data-cv-action]'),root=control?.closest('.cv-demo');if(!root)return;const state=renderStates.get(root);if(!state)return;const {v}=state,action=control.dataset.cvAction,output=root.querySelector('[data-cv-output]');
  const renderItems=()=>{root.querySelector('[data-cv-items]').innerHTML=state.items.map(x=>'<li>'+h(x)+'</li>').join('');const undo=root.querySelector('[data-cv-action="undo"]');if(undo)undo.disabled=state.last===null||state.busy;root.querySelector('[data-cv-action="delete"]').disabled=state.items.length===0||state.busy&&v.feedback;};
  const startDelete=()=>{state.requests++;if(state.busy){if(v.feedback)output.textContent='処理中です。追加の削除は実行していません。';return;}if(!state.items.length)return;state.busy=true;if(v.feedback)output.textContent='処理中…まだ完了していません。';renderItems();setTimeout(()=>{if(!root.isConnected)return;state.last=state.items.pop();state.busy=false;renderItems();output.textContent=state.last+'を削除しました。残り'+state.items.length+'件。';},number(v.delay,0,2000,0));};
  if(action==='delete'){if(v.confirmation){root.querySelector('[data-cv-confirm]').hidden=false;root.querySelector('[data-cv-action="confirm"]').focus();}else startDelete();}
  else if(action==='confirm'){root.querySelector('[data-cv-confirm]').hidden=true;startDelete();}
  else if(action==='cancel'){root.querySelector('[data-cv-confirm]').hidden=true;output.textContent='削除をやめました。';root.querySelector('[data-cv-action="delete"]').focus();}
  else if(action==='undo'){if(state.last!==null&&!state.busy){state.items.push(state.last);state.last=null;renderItems();output.textContent='直前の削除を取り消しました。';}}
  else if(action==='access'){output.textContent='確認した単元：'+root.querySelector('input').value+'（外部送信なし）';}
  else if(action==='target'){
   const now=performance.now(),box=control.getBoundingClientRect(),center={x:box.x+box.width/2,y:box.y+box.height/2},pointer=event.detail>0;
   if(state.lastClick!==null){const elapsed=now-state.lastClick,distance=state.lastCenter?Math.hypot(center.x-state.lastCenter.x,center.y-state.lastCenter.y):0;state.times.push(elapsed);output.textContent=(pointer?'ポインタ':'キーボード')+'で'+state.times.length+'回：今回 '+Math.round(elapsed)+'ms、実際の中心間距離 '+Math.round(distance)+'px。';}else output.textContent='開始しました。次の位置の対象を押してください。';
   state.lastClick=now;state.lastCenter=center;const area=control.parentElement,max=Math.max(6,area.clientWidth-box.width-6),right=Math.min(max,number(v.distance,60,240,180)+6),current=Number.parseFloat(control.style.left)||6;control.style.left=(current<=6?right:6)+'px';
  }
 });
}
})();
