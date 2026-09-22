/* Purpose-built coding workspaces: segment a word, occupy a tree, merge roots.
 * Native buttons provide pointer, touch, Enter and Space interaction equally. */
(() => {
'use strict';
const X=CSL.experiences,M=X.coding,h=CSL.h,B=X.html.button,T=X.html.table;
if(typeof document==='undefined')return;
function screen(root,current,intro){
 root.classList.add('ex-coding-workspace');
 const scope=X.scope(root,current);
 root.innerHTML=`<p class="ex-operation-hint">${h(intro)}</p><div data-coding-screen></div><p data-ex-status role="status" aria-live="polite"></p>`;
 const body=root.querySelector('[data-coding-screen]'),status=root.querySelector('[data-ex-status]');
 return {scope,body,message(text,error=false){status.textContent=text;status.className=error?'ex-error':'';},paint(html,selector){body.innerHTML=html;if(selector)body.querySelector(selector)?.focus({preventScroll:true});current.completed.add(scope.id);}};
}
X.registerWidget('prefix-cut',(root,a,current)=>{
 const ui=screen(root,current,'0と1の間に区切りを置いてください。全ての断片が符号表にあると、元の記号列として読めます。');
 const presets=[
  {name:'二通りに読める例',codes:['0','01','10'],stream:'010'},
  {name:'待てば一意に読める例',codes:['0','01'],stream:'00101'},
  {name:'すぐに区切れる例',codes:['0','10','110','111'],stream:'010110'}
 ];
 let active=0,codes=presets[0].codes.slice(),stream=presets[0].stream,cuts=[],pinned=[],showAnswers=false;
 function paint(focus){
  const result=M.segment(codes,stream,cuts),properties=M.codeProperties(codes);
  const read=M.decodings(codes,stream);
  ui.paint(`<div class="ex-example-choices">${presets.map((p,i)=>B(p.name,`data-prefix-preset="${i}" aria-pressed="${active===i}"`)).join('')}</div><div class="ex-codebook">${codes.map((word,i)=>`<span><strong>${String.fromCharCode(65+i)}</strong><code>${word}</code></span>`).join('')}</div><h4>受信した列に、自分で区切りを置く</h4><div class="ex-prefix-stream" aria-label="受信したビット列と区切り位置">${[...stream].map((bit,i)=>`<span class="ex-prefix-bit">${bit}</span>${i<stream.length-1?B(cuts.includes(i+1)?'│':'┆',`data-prefix-cut="${i+1}" aria-pressed="${cuts.includes(i+1)}" aria-label="${i+1}ビット目の後の区切りを切り替える"`):''}`).join('')}</div><section class="ex-segment-readout" data-prefix-valid="${result.valid}"><h4>今の区切りで読むと</h4><div class="ex-segment-parts">${result.parts.map(p=>`<div class="${p.index<0?'ex-unassigned':'ex-assigned'}"><code>${p.bits}</code><span>${p.symbol?'記号 '+p.symbol:'符号表にない断片'}</span><small>位置 ${p.start+1}〜${p.end}</small></div>`).join('')}</div><p>${result.valid?'全ての断片が符号表にあります。読めた記号列：'+result.text:'この区切りでは読めません。符号表にない断片の境界を変えてください。'}</p></section><div class="ex-actions">${B('この読み方を並べて残す','data-prefix-pin'+(result.valid?'':' disabled'))}${B('区切りを外す','data-prefix-clear')}${B('別の切り方を調べる','data-prefix-answers')}</div><div data-prefix-pinned>${pinned.length?`<h4>同じ列に対する、選んだ読み方</h4>${T(['区切り','記号列'],pinned.map(p=>[p.notation,p.text]))}<p>${pinned.length>=2?'同じビット列から異なる記号列を得られました。これは一意復号できない具体的な反例です。':'別の有効な区切りも見つかるでしょうか。例を切り替えると、この比較は初期化します。'}</p>`:''}</div>${showAnswers?`<section class="ex-why" data-prefix-solutions><h4>この受信列の有効な区切り</h4>${T(['区切り','記号列'],read.readings.map(r=>[r.notation,r.text]))}<p>${read.truncated?'候補が多いため最初の12件だけを表示しています。':read.readings.length+'通りです。'} 一つの受信列で一通りだったことだけでは、符号集合全体の一意復号可能性の証明にはなりません。</p></section>`:''}<section class="ex-coding-explanation"><h4>二つの性質を分ける</h4><p><strong>${properties.prefixFree?'接頭辞が重ならない符号です。':'接頭辞が重なる符号です。'}</strong> ${properties.prefixFree?'符号表の語に到達した時点で、先を待たずに区切れます。':'短い語を読んだだけでは、長い語の途中である可能性が残ります。'}</p><p><strong>${properties.uniquelyDecodable?'この符号集合は一意に復号できます。':'この符号集合は一意に復号できません。'}</strong> ${properties.uniquelyDecodable?'瞬時に区切れるかどうかとは別の条件です。':'異なる記号列が同じビット列になり得ます。'}</p><details><summary>符号集合全体の判定の根拠</summary><p>異なる区切りで余る語尾を集め、符号語と照合していきます。新しい語尾がなくなるまで調べる有限のSardinas–Patterson法です。</p>${properties.prefixFree?'<p>最初に余る語尾がないので、接頭語符号として判定できます。</p>':T(['照合した語尾','次に得る語尾'],properties.steps.map(s=>[s.tail,s.next.map(w=>w||'空語 ε').join(', ')||'なし']))}<p>${properties.uniquelyDecodable?'空語へ達せず、新しい語尾もなくなりました。':'空語へ達し、二つの区切りが同じ終点へ合流する可能性が見つかりました。'}</p></details></section>`,focus);
 }
 ui.scope.on(root,'click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-prefix-cut')){const n=+b.dataset.prefixCut;cuts=cuts.includes(n)?cuts.filter(x=>x!==n):[...cuts,n];paint(`[data-prefix-cut="${n}"]`);ui.message('区切りを変更しました。断片と符号表の対応を見てください。');}
  if(b.hasAttribute('data-prefix-preset')){active=+b.dataset.prefixPreset;codes=presets[active].codes.slice();stream=presets[active].stream;cuts=[];pinned=[];showAnswers=false;paint(`[data-prefix-preset="${active}"]`);ui.message('新しい例へ切り替えました。比較対象は同じ受信列の中で探します。');}
  if(b.hasAttribute('data-prefix-clear')){cuts=[];paint('[data-prefix-clear]');ui.message('区切りだけを外しました。並べた読み方は残しています。');}
  if(b.hasAttribute('data-prefix-pin')){const r=M.segment(codes,stream,cuts);if(!r.valid)return;if(pinned.some(p=>p.notation===r.notation)){ui.message('その読み方は既に並んでいます。別の区切りを探してください。');return;}pinned.push(r);paint('[data-prefix-pin]');ui.message('選んだ読み方を比較欄に並べました。ページを離れると残りません。');}
  if(b.hasAttribute('data-prefix-answers')){showAnswers=!showAnswers;paint('[data-prefix-answers]');ui.message(showAnswers?'有効な区切りを展開しました。':'自分で試す表示に戻しました。');}
 });paint();
});
X.registerWidget('kraft-tree',(root,a,current)=>{
 const ui=screen(root,current,'木の道を一つ選ぶと、その場所で記号を読み終える符号語になります。その下の道を別の符号語には使えません。');
 const depth=4,goals=[{label:'長さ1・2・3・3を置く',lengths:[1,2,3,3]},{label:'長さ1を三つ置けるか',lengths:[1,1,1]},{label:'自由に置いて比べる',lengths:null}];
 let goal=0,placed=[],history=[];
 function paint(focus){
  const occupancy=M.slots(placed,depth),wanted=goals[goal].lengths;
  let lines='',buttons='';
  for(let d=1;d<=depth;d++)for(let k=0;k<2**d;k++){
   const word=k.toString(2).padStart(d,'0'),x=(k+.5)*900/2**d,parent=(Math.floor(k/2)+.5)*900/2**(d-1),info=M.leafState(placed,word,depth);
   lines+=`<path d="M${parent} ${32+(d-1)*70}L${x} ${32+d*70}"/>`;
   buttons+=`<button type="button" class="ex-tree-place ${info.state}" style="left:${x/9}%;top:${12+d*70}px;width:${Math.min(74,900/2**d-7)}px" data-kraft-leaf="${word}" data-leaf-state="${info.state}" aria-pressed="${info.state==='placed'}"${['below-leaf','above-leaf'].includes(info.state)?' aria-disabled="true"':''} aria-label="符号語${word}、長さ${d}、${info.state==='placed'?'配置済み。押すと取り外します':info.state==='free'?'配置できます':'既存の'+info.conflict+'と接頭辞が重なります'}">${word}</button>`;
  }
  const lengths=placed.map(p=>p.length).sort((a,b)=>a-b),fits=wanted&&JSON.stringify(lengths)===JSON.stringify(wanted.slice().sort((a,b)=>a-b));
  ui.paint(`<div class="ex-example-choices">${goals.map((g,i)=>B(g.label,`data-kraft-goal="${i}" aria-pressed="${i===goal}"`)).join('')}</div>${wanted?`<p>目標の符号長：<strong>${wanted.join(', ')}</strong>。必要な場所は ${wanted.map(n=>'1/'+2**n).join(' + ')} = ${wanted.reduce((s,n)=>s+2**-n,0)}。</p>`:'<p>選んだ符号語の長さと、その下で使う場所の割合を比べてください。</p>'}<div class="ex-tree-scroll" tabindex="0" role="group" aria-label="符号木。横幅が狭い場合は左右へスクロールできます"><div class="ex-kraft-tree"><svg viewBox="0 0 900 350" aria-hidden="true">${lines}</svg><span class="ex-tree-root">根</span>${buttons}</div></div><div class="ex-leaf-slots" aria-label="長さ4の16区画">${Array.from({length:16},(_,i)=>{const path=i.toString(2).padStart(4,'0'),owner=placed.find(p=>path.startsWith(p));return `<span class="${owner?'used':''}" title="${path}: ${owner?owner+'が使用':'空き'}">${owner||'·'}</span>`;}).join('')}</div><p class="ex-equation" data-kraft-total>使用 ${occupancy.used} / ${occupancy.total}　空き ${occupancy.remaining} / ${occupancy.total}　Kraftの和 ${occupancy.kraft}</p><section data-kraft-placed><h4>自分で置いた符号語</h4>${placed.length?T(['符号語','長さ','使う割合'],placed.map(p=>[p,p.length,'1/'+2**p.length])):'<p>まだ置いていません。木の0または1から始めてみましょう。</p>'}<p>${placed.map(p=>B(p+'を取り外す',`data-kraft-remove="${p}"`)).join('')}</p></section><div class="ex-actions">${B('直前の配置へ戻す','data-kraft-undo'+(history.length?'':' disabled'))}${B('全て取り外す','data-kraft-reset')}</div><p class="ex-kraft-goal-status" data-kraft-solved="${!!fits}">${fits?'目標の長さの符号を、接頭辞が重ならない形で置けました。':wanted&&wanted.reduce((s,n)=>s+2**-n,0)>1?'目標の必要量が1を超えています。どこを選んでも、三つ目までの場所を確保できません。実際に二つ置いて確かめてください。':'短い符号語ほど、その下で使う場所が大きくなります。'}</p><aside class="ex-why"><p>不等式が表すのは「その長さの組で、接頭辞が重ならない符号を作れるか」です。和が1以下でも、実際に選んだ語の接頭辞が重なっていれば、その配置のままでは使えません。例えば0と00の和は3/4ですが、0の下へ00は置けません。</p></aside>`,focus);
 }
 ui.scope.on(root,'click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-kraft-goal')){goal=+b.dataset.kraftGoal;placed=[];history=[];paint(`[data-kraft-goal="${goal}"]`);ui.message('新しい目標へ切り替えました。');return;}
  if(b.hasAttribute('data-kraft-leaf')){
   const path=b.dataset.kraftLeaf;
   try{const next=placed.includes(path)?placed.filter(p=>p!==path):M.placeLeaf(placed,path,depth);history.push(placed.slice());placed=next;paint(`[data-kraft-leaf="${path}"]`);ui.message(path+'の配置を変更しました。使用する区画と和が対応しています。');}catch(error){ui.message(error.message,true);}return;
  }
  if(b.hasAttribute('data-kraft-remove')){history.push(placed.slice());placed=placed.filter(p=>p!==b.dataset.kraftRemove);paint('[data-kraft-reset]');ui.message('この符号語が使っていた区画を空けました。');}
  if(b.hasAttribute('data-kraft-undo')&&history.length){placed=history.pop();paint(history.length?'[data-kraft-undo]':'[data-kraft-reset]');ui.message('直前の配置へ戻しました。');}
  if(b.hasAttribute('data-kraft-reset')){placed=[];history=[];paint('[data-kraft-reset]');ui.message('木全体を空けました。');}
 });paint();
});
X.registerWidget('huffman-build',(root,a,current)=>{
 const ui=screen(root,current,'頻度が小さい候補を二つ選び、結合してください。新しくできた部分木も、次の結合の候補になります。');
 let state=M.huffmanStart(),selected=[];
 const labels=node=>node.symbol||labels(node.left)+labels(node.right);
 const tree=node=>`<li><div class="ex-huffman-node"><strong>${h(node.symbol||'結合')}</strong><span>${node.weight}</span></div>${node.left?`<ul><li><small class="ex-branch-label">0</small><ul>${tree(node.left)}</ul></li><li><small class="ex-branch-label">1</small><ul>${tree(node.right)}</ul></li></ul>`:''}</li>`;
 function paint(focus){
  const table=M.codeTable(state),sum=state.weights.reduce((s,n)=>s+n,0);
  ui.paint(`<div class="ex-example-choices">${B('A4・B2・C1・D1から作る','data-huffman-preset="weighted"')}${B('四つとも同じ頻度で作る','data-huffman-preset="equal"')}</div><section><h4>${table?'一本の符号木ができました':'いま残っている候補'}</h4><div class="ex-huffman-candidates" data-huffman-roots>${state.roots.map(n=>B(labels(n)+' ／ 頻度 '+n.weight,`data-huffman-pick="${n.id}" data-weight="${n.weight}" aria-pressed="${selected.includes(n.id)}"${table?' disabled':''}`)).join('')}</div><div class="ex-actions">${B('選んだ二つを結合する','data-huffman-merge'+(selected.length===2?'':' disabled'))}${B('一つ前の結合へ戻す','data-huffman-undo'+(state.history.length?'':' disabled'))}</div><p data-huffman-selection>${selected.length?selected.map(id=>labels(state.roots.find(n=>n.id===id))).join(' と ')+' を選択しています。':'結合候補を自分で選びます。選んだ順に左0・右1の枝を付けます。'}</p></section><div class="ex-forest" tabindex="0" aria-label="自分で組み立てた部分木"><div>${state.roots.map(n=>`<ul class="ex-huffman-tree">${tree(n)}</ul>`).join('')}</div></div><section data-huffman-history><h4>何を結んだかを残す</h4>${state.history.length?`<ol>${state.history.map(s=>`<li>${h(labels(s.before.find(n=>n.id===s.left)))}（${s.leftWeight}）と ${h(labels(s.before.find(n=>n.id===s.right)))}（${s.rightWeight}）を結合 → 頻度 ${s.weight}。この部分の全記号の道が一段長くなります。</li>`).join('')}</ol>`:'<p>最初の二つを選ぶと、ここに理由付きの記録が増えます。</p>'}</section>${table?`<section data-huffman-codes><h4>根からの0と1を、符号として読む</h4>${T(['記号','頻度','符号語','長さ','平均への寄与'],table.rows.map(r=>[r.symbol,r.weight,r.code,r.length,(r.weight*r.length/sum).toFixed(3)]))}<p class="ex-equation" data-huffman-average>平均長 = (${table.rows.map(r=>r.weight+'×'+r.length).join(' + ')}) / ${sum} = ${table.average} bit / 記号</p><p>一回の結合で増える重み付き長さは、その部分木の頻度です。結合時の頻度の和 ${state.history.map(s=>s.weight).join(' + ')} = ${table.weighted} も同じ値になります。</p></section>`:'<p class="ex-caption">まだ森なので、根からの最終的な符号語は決まっていません。途中の枝を完成した符号と取り違えないでください。</p>'}<aside class="ex-why"><p>最初に結んだ記号は、後の結合で深い場所へ入ります。出にくい記号へ長い道を割り当てるため、小さい二つを結びます。同じ頻度の候補はどれを選んでもよく、0と1を反転しても平均長は変わりません。</p></aside>`,focus);
 }
 ui.scope.on(root,'click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-huffman-preset')){state=M.huffmanStart(b.dataset.huffmanPreset==='equal'?[2,2,2,2]:[4,2,1,1]);selected=[];paint(`[data-huffman-preset="${b.dataset.huffmanPreset}"]`);ui.message('新しい頻度から、自分で木を作ります。');return;}
  if(b.hasAttribute('data-huffman-pick')){const id=b.dataset.huffmanPick;if(selected.includes(id))selected=selected.filter(x=>x!==id);else if(selected.length<2)selected.push(id);else {ui.message('二つ選択済みです。片方の選択を外してから変更してください。');return;}paint(`[data-huffman-pick="${id}"]`);ui.message('候補を'+selected.length+'個選びました。');return;}
  if(b.hasAttribute('data-huffman-merge')){try{state=M.merge(state,selected);selected=[];paint('[data-huffman-undo]');ui.message('二つの候補を結びました。新しい頻度は二つの和です。');}catch(error){ui.message(error.message,true);}return;}
  if(b.hasAttribute('data-huffman-undo')){state=M.undo(state);selected=[];paint(state.history.length?'[data-huffman-undo]':'[data-huffman-preset="weighted"]');ui.message('最後の結合だけを戻しました。以前の部分木は残ります。');}
 });paint();
});
})();
