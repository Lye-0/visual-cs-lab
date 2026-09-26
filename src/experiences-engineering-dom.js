/* Native DOM is the lesson: configure just this isolated specimen, not the site.
 * The existing renderer installs real browser listeners and measures real boxes.
 * No copied screenshots, synthetic event logs, eval or persistent records. */
(() => {
'use strict';
if(typeof document==='undefined')return;
const L=CSL,X=L.experiences,K=L.curriculum,h=L.h;
const specimens={
 'feedback-specimen':{kind:'feedback',keys:['delay','feedback','confirmation','undo'],instruction:'まず最後の項目を削除し、取り消してください。設定は下にあります。同じ削除に待ち時間や確認を加えると、操作した後に何が伝わるでしょうか。'},
 'target-specimen':{kind:'target',keys:['size','distance'],instruction:'現れる対象を交互に押してください。大きさと離れ方を別々に変え、押しやすさを比べます。記録した時間はこの場限りで、能力の採点ではありません。'},
 'accessibility-specimen':{kind:'accessibility',keys:['native','label','focus','live','order'],instruction:'入力欄からTabでボタンへ進み、Enterを押してください。次に下の設定で標準ボタンやラベルを外し、見た目が似ていても失う情報を比べます。'},
 'layout-specimen':{kind:'browser-layout',keys:['layout','width','gap','items','borderBox'],instruction:'要素を押すと、その要素の実際の寸法とCSSを読みます。下で配置方法を変え、paddingとborderがwidthの内側に含まれるかを確認してください。'},
 'event-specimen':{kind:'browser-events',keys:['stopAt'],instruction:'内側のボタンを一度押してください。ブラウザが実際に呼び出した順番を表示します。下で停止位置を選び、まだ呼ばれる処理と呼ばれない処理を比べます。'},
 'form-specimen':{kind:'browser-form',keys:['required','value'],instruction:'空欄のまま送信を試し、その後に単元名を入れてください。入力の制約検証と、submitで値を受け取る処理は別々の段階です。'}
};
for(const [name,definition]of Object.entries(specimens))X.registerWidget(name,(root,activity,current)=>{
 const scope=X.scope(root,current),lab=L.labs.find(l=>l.id===(activity.model||current.lab.id));
 const defaults={...X.clone(lab.defaults),...activity.patch};let parameters={...defaults},generation=0,selected=0;
 root.classList.add('ex-engineering','eg-native');
 const p=t=>'<p>'+h(t)+'</p>';
 function controls(){return definition.keys.map(key=>{
  const control=lab.controls.find(c=>c.key===key);if(!control)throw Error('Unknown native specimen control '+key);
  const id=scope.id+'-native-'+key,v=parameters[key],attrs=`id="${id}" data-native-field="${key}"`;
  let input;
  if(control.type==='select')input=`<select ${attrs}>${control.options.map(o=>`<option value="${h(o.value)}"${String(v)===String(o.value)?' selected':''}>${h(o.label??o.value)}</option>`).join('')}</select>`;
  else if(typeof v==='boolean')input=`<input ${attrs} type="checkbox"${v?' checked':''}>`;
  else if(typeof v==='number')input=`<input ${attrs} type="number" required value="${v}" min="${control.min??0}" max="${control.max??2000}" step="${control.step??1}">`;
  else input=`<input ${attrs} type="text" value="${h(v)}" maxlength="60" autocomplete="off">`;
  return `<label class="eg-native-field" for="${id}"><span>${h(control.label)}</span>${input}</label>`;
 }).join('');}
 function inspect(){
  if(!scope.alive())return;const host=root.querySelector('[data-native-inspect]'),demo=root.querySelector('.cv-demo');if(!host||!demo)return;
  if(definition.kind==='accessibility'){
   const elements=[...demo.querySelectorAll('input,[data-cv-action="access"]')],focus=document.activeElement;
   host.innerHTML='<h4>実際の要素と、伝えている情報</h4>'+X.html.table(['要素','タグ','名前の情報','Tabの対象','現在のフォーカス'],elements.map(el=>[el.tagName==='INPUT'?'入力欄':'確認する操作',el.tagName,el.tagName==='INPUT'?([...el.labels].map(l=>l.textContent).join(' / ')||'関連付いたlabelなし'):el.textContent,el.tabIndex>=0?'はい':'いいえ',el===focus?'ここ':'—']))+p('通知領域のaria-live：'+(demo.querySelector('[data-cv-output]').getAttribute('aria-live')||'なし'))+p('表はDOMの観察です。スクリーンリーダー全製品の読み上げを再現したものではありません。DOM順と見た目の順も確認してください。');
  }else if(definition.kind==='browser-layout'){
   const items=[...demo.querySelectorAll('.cv-layout-item')];selected=Math.min(selected,items.length-1);const el=items[selected];if(!el)return;
   const r=el.getBoundingClientRect(),style=getComputedStyle(el);
   host.innerHTML='<h4>選択した要素'+(selected+1)+'の実寸</h4>'+X.html.table(['項目','値'],[['CSS box-sizing',style.boxSizing],['CSS width',style.width],['左padding',style.paddingLeft],['左border',style.borderLeftWidth],['実際の外幅',X.format(r.width,2)+'px'],['実際の外高',X.format(r.height,2)+'px']])+p('getBoundingClientRectでブラウザの結果を読んでいます。表示領域が狭い場合は実験の枠内だけを横にスクロールできます。');
  }else host.innerHTML='';
 }
 function paint(){
  const token=++generation;current.completed.delete(scope.id);root.dataset.nativeReady='false';root.setAttribute('aria-busy','true');
  root.innerHTML=p(definition.instruction)+`<div class="eg-specimen-host">${L.visualize(K.demo(definition.kind,parameters))}</div><section data-native-inspect></section><details class="eg-native-config"><summary>この実験だけの条件を変えて比較する</summary>${p('適用すると、この枠の操作状態は初期化されます。別の単元やサイト全体の設定は変えません。')}<form data-native-config><div class="eg-form">${controls()}</div><button class="ex-button" type="submit" data-native-action="apply">この条件で作り直す</button><button class="ex-button" type="button" data-native-action="reset">最初の条件へ戻す</button></form></details><p data-native-status role="status" aria-live="polite"></p>`;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!scope.alive()||token!==generation)return;
   if(definition.kind==='browser-layout')for(const [i,el]of [...root.querySelectorAll('.cv-layout-item')].entries()){el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label','要素'+(i+1)+'の寸法を調べる');el.dataset.nativeItem=i;}
   inspect();root.dataset.nativeReady='true';root.setAttribute('aria-busy','false');current.completed.add(scope.id);
  }));
 }
 function apply(){
  const next={...parameters};
  for(const key of definition.keys){const el=root.querySelector('[data-native-field="'+key+'"]'),control=lab.controls.find(c=>c.key===key);
   if(!el.checkValidity())throw Error('「'+control.label+'」の入力範囲を確認してください。');
   if(el.type==='checkbox')next[key]=el.checked;
   else if(control.type==='select'){const option=control.options.find(o=>String(o.value)===el.value);if(!option)throw Error('選択肢を選んでください。');next[key]=option.value;}
   else next[key]=typeof parameters[key]==='number'?Number(el.value):el.value;
  }
  parameters=next;selected=0;paint();
 }
 X.liveForm(root,scope,'[data-native-config]');
 scope.on(root,'submit',event=>{if(!event.target.matches('[data-native-config]'))return;event.preventDefault();try{apply();}catch(error){root.querySelector('[data-native-status]').textContent=error.message;}});
 scope.on(root,'click',event=>{
  const reset=event.target.closest('[data-native-action="reset"]');if(reset){parameters={...defaults};selected=0;paint();return;}
  const item=event.target.closest('[data-native-item]');if(item){selected=Number(item.dataset.nativeItem);inspect();}
 });
 scope.on(root,'keydown',event=>{if(!event.target.matches('[data-native-item]')||!['Enter',' '].includes(event.key))return;event.preventDefault();selected=Number(event.target.dataset.nativeItem);inspect();});
 scope.on(root,'focusin',inspect);
 scope.cleanup(()=>{generation++;});paint();
});
})();
