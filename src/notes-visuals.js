/* Data-linked, accessible diagrams. All text is escaped; no external assets. */
(() => {
'use strict';
const L=CSL,{h}=L;
const f=x=>typeof x==='number'?Number(x.toPrecision(6)).toLocaleString('en-US'):String(x??'—');
const attr=x=>h(String(x));
const selected=(focus,id)=>focus===String(id)?' is-linked':'';
const button=(id,label,focus,extra='')=>`<button type="button" class="study-chip${selected(focus,id)}" data-r-focus="${attr(id)}" aria-pressed="${String(focus===String(id))}">${h(label)}${extra}</button>`;
const equation=x=>`<div class="study-equation" role="math" aria-label="${attr(x)}">${h(x)}</div>`;
const table=(headers,rows,caption='')=>`<div class="study-table-scroll" tabindex="0" role="region" aria-label="${attr(caption||'計算の表')}"><table class="study-table">${caption?`<caption>${h(caption)}</caption>`:''}<thead><tr>${headers.map(x=>`<th scope="col">${h(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((x,i)=>`<${i?'td':'th scope="row"'}>${h(x)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const svg=(content,label,w=800,height=300)=>`<svg class="study-svg" viewBox="0 0 ${w} ${height}" role="img" aria-label="${attr(label)}"><title>${h(label)}</title>${content}</svg>`;
const line=(x1,y1,x2,y2,cls='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="study-wire ${cls}"/>`;
const text=(x,y,value,cls='')=>`<text x="${x}" y="${y}" class="study-svg-text ${cls}" text-anchor="middle">${h(value)}</text>`;
const views={};
views['lesson-calculation']=(v,focus)=>`<div class="study-calculation">${equation(v.equation)}${v.terms?.length?`<div class="study-terms">${v.terms.map(t=>`<div class="study-term${selected(focus,t.id)}">${button(t.id,t.label,focus)}<strong>${h(f(t.value))}</strong><p>${h(t.meaning)}</p></div>`).join('')}</div>`:''}${v.detail?`<p class="study-caption">${h(v.detail)}</p>`:''}</div>`;
views['lesson-entropy']=(v,focus)=>{
 const probs=v.probabilities,names=v.names,active=focus?.startsWith('entropy-')?names.indexOf(focus.slice(8)):v.selected;
 const terms=probs.map((p,i)=>({p,i,info:p>0?-Math.log2(p):null,part:p>0?-p*Math.log2(p):0}));
 return `<div class="study-entropy"><p class="study-instruction">出来事を選ぶと、確率・情報量・式の同じ項を強調します。</p><div class="study-probabilities">${terms.map(t=>`<div class="study-probability${active===t.i?' is-linked':''}">${button('entropy-'+names[t.i],names[t.i],focus)}<div class="study-prob-track"><span style="width:${t.p*100}%"></span></div><strong>${h(f(t.p))}</strong></div>`).join('')}</div><div class="study-table-scroll" tabindex="0" role="region" aria-label="確率と情報量を対応させる表"><table class="study-table"><thead><tr><th>出来事</th><th>確率 p</th><th>情報量 −log₂p</th><th>平均への寄与 p×I</th></tr></thead><tbody>${terms.map(t=>`<tr class="${active===t.i?'is-linked':''}"><th scope="row">${button('entropy-'+names[t.i],names[t.i],focus)}</th><td>${h(f(t.p))}</td><td>${t.info===null?'発生しない（形式的に∞）':h(f(t.info))+' bit'}</td><td>${h(f(t.part))}</td></tr>`).join('')}</tbody></table></div><div class="study-equation"><math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="Hは各出来事の確率と自己情報量の積の和"><mi>H</mi><mo>=</mo>${terms.map((t,i)=>`${i?'<mo>+</mo>':''}<mrow class="${active===i?'math-linked':''}"><mn>${f(t.p)}</mn><mo>×</mo><mn>${t.info===null?'0':f(t.info)}</mn></mrow>`).join('')}<mo>=</mo><mn>${f(terms.reduce((s,t)=>s+t.part,0))}</mn></math></div><p class="study-caption">単位：bit/記号。確率0の行の寄与は極限として0です。上の式ではその項を0として表示しています。</p></div>`;
};
views['lesson-channel']=(v,focus)=>{
 const nodes=[{x:120,y:80,t:'送信 X=0'},{x:120,y:235,t:'送信 X=1'},{x:650,y:80,t:'受信 Y=0'},{x:650,y:235,t:'受信 Y=1'}];
 return `<div class="study-channel">${svg(line(205,80,555,80)+line(205,235,555,235)+line(205,100,555,215,'study-noise')+line(205,215,555,100,'study-noise')+text(390,61,`1−ε = ${f(1-v.e)}`)+text(390,268,`1−ε = ${f(1-v.e)}`)+text(385,145,`ε = ${f(v.e)}`)+nodes.map(n=>`<rect x="${n.x-90}" y="${n.y-25}" width="180" height="50" rx="8" class="study-box"/>${text(n.x,n.y+6,n.t)}`).join(''),'BSC：同じ記号の受信確率は1−ε、反転はε')}<div class="study-terms"><div>${button('q','情報源の確率',focus)}<p>P(X=0) = ${f(1-v.q)}<br>P(X=1) = ${f(v.q)}</p></div><div>${button('e','通信路の反転率',focus)}<p>0→1も1→0も ε = ${f(v.e)}</p></div></div><p class="study-caption">この線は条件付き確率です。入力Xの出やすさは、別に左側の確率で指定します。</p></div>`;
};
views['lesson-code-tree']=(v,focus)=>{
 const root={path:'',children:{},name:null},nodes=[root];
 v.codes.forEach((code,i)=>{let n=root;for(const bit of code){if(!n.children[bit]){n.children[bit]={path:n.path+bit,children:{},name:null};nodes.push(n.children[bit]);}n=n.children[bit];}n.name=(n.name?n.name+' / ':'')+(v.names?.[i]||String.fromCharCode(65+i));});
 let leaves=0;function layout(n){const children=Object.values(n.children);if(!children.length)n.x=leaves++;else{children.forEach(layout);n.x=children.reduce((s,c)=>s+c.x,0)/children.length;}}layout(root);
 const maxDepth=Math.max(...nodes.map(n=>n.path.length)),width=Math.max(600,leaves*115),height=Math.max(220,maxDepth*64+110),pos=n=>({x:50+n.x*(width-100)/Math.max(1,leaves-1),y:35+n.path.length*64});
 let drawing='';for(const n of nodes){const a=pos(n);for(const [bit,c]of Object.entries(n.children)){const b=pos(c);drawing+=line(a.x,a.y,b.x,b.y)+text((a.x+b.x)/2+12,(a.y+b.y)/2,bit);}}
 for(const n of nodes){const p=pos(n),active=focus==='code-'+n.path;drawing+=`<circle cx="${p.x}" cy="${p.y}" r="${n.name?17:7}" class="study-node ${n.name?'study-accept':''} ${active?'study-highlight':''}"/>`+(n.name?text(p.x,p.y+5,n.name):'');}
 return `<div class="study-tree">${svg(drawing,'符号木。枝の0と1を根から順に読むと符号語になります。',width,height)}<div class="study-code-legend">${v.codes.map((code,i)=>button('code-'+code,`${v.names?.[i]||String.fromCharCode(65+i)} = ${code}`,focus)).join('')}</div><p class="study-caption">記号が置かれた位置より先に、別の記号が続いていないかも確かめます。</p></div>`;
};
views['lesson-distance']=(v,focus)=>`<div class="study-bit-matrix"><p>同じ列を縦に比べます。違う列のXORだけが1です。</p>${['a','b','diff'].map((key,j)=>`<div class="study-bit-line"><strong>${['X','Y','X XOR Y'][j]}</strong><div>${v[key].map((b,i)=>`<button type="button" data-r-focus="distance-${i}" aria-label="左から${i+1}番目、${['X','Y','XOR'][j]}は${b}" class="study-bit ${v.diff[i]?'study-different':''}${selected(focus,'distance-'+i)}">${b}</button>`).join('')}</div></div>`).join('')}</div>`;
function matrixTable(m,label,selectedColumn=-1){return `<div class="study-matrix"><h4>${h(label)}</h4><table aria-label="${attr(label)}"><tbody>${m.map(row=>`<tr>${row.map((x,i)=>`<td class="${i===selectedColumn?'is-linked':''}">${h(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
views['lesson-linear']=(v,focus)=>{
 const check=focus?.startsWith('check-')?Number(focus.slice(6)):v.check,index=focus?.startsWith('bit-')?Number(focus.slice(4)):-1;
 const values=v.phase==='encode'?v.sent:v.phase==='correct'?v.corrected:v.received,labels=['x₁','x₂','x₃','x₄','c₁','c₂','c₃'];
 return `<div class="study-linear"><p class="study-instruction">ビットまたは検査名を選ぶと、検査に参加する列を対応させます。入力条件は左の設定で変更します。</p><div class="study-seven">${values.map((b,i)=>`<button type="button" data-r-focus="bit-${i}" class="study-symbol ${i>=4?'study-parity':''} ${i===index||(check>=0&&v.H[check]?.[i])?'is-linked':''}" aria-label="${labels[i]}、値${b}、位置${i+1}"><span>${labels[i]}</span><strong>${b}</strong><small>位置 ${i+1}</small></button>`).join('')}</div><div class="study-code-groups"><span>情報ビット4個</span><span>検査ビット3個</span></div><div class="study-checks">${v.H.map((row,i)=>{const known=v.phase==='correct'||(v.phase==='check'&&i<=v.check);const active=i===check||index>=0&&row[index];return `<div class="study-check${active?' is-linked':''}">${button('check-'+i,'検査 s'+(i+1),focus)}<span>${row.map((x,j)=>x?labels[j]:null).filter(Boolean).join(' ⊕ ')}</span><strong>${known?'= '+v.syndrome[i]:'= ?'}</strong></div>`;}).join('')}</div><p class="study-caption">${v.phase==='correct'?`シンドローム ${v.syndrome.join('')} をHの列と照合しました。`:'検査結果は、各検査の段階まで進むと表示されます。図を選ぶだけでは検査を実行したことにはしません。'}</p><details><summary>同じ検査を、生成行列Gと検査行列Hで見る</summary><p>Gは情報から符号を作ります。Hの行は検査式、列はその位置のビットが参加する検査です。演算はmod 2です。</p><div class="study-matrices">${matrixTable(v.G,'G = [I₄ | P]',index)}${matrixTable(v.H,'H = [Pᵀ | I₃]',index)}</div></details></div>`;
};
views['lesson-division']=(v,focus)=>{
 const length=v.before.length,row=(name,values,aligned=false)=>`<div class="study-division-row"><strong>${name}</strong><div>${Array.from({length},(_,i)=>{const bit=aligned?(i>=v.position&&i<v.position+v.divisor.length?v.divisor[i-v.position]:'·'):values[i];return `<span class="${v.position>=0&&i>=v.position&&i<v.position+v.divisor.length?'is-linked':''}">${h(bit)}</span>`;}).join('')}</div></div>`;
 return `<div class="study-division"><p class="study-overline">${h(v.phase)} / GF(2) の割り算</p>${row('処理前',v.before)}${v.position>=0?row(v.apply?'XORする':'今回は省略',v.divisor,true):''}${row('処理後',v.after)}<p class="study-caption">${v.position<0?'生成多項式1011 = x³+x+1。右端に3個の検査用ビットの場所を空けます。':`左から${v.position+1}番目から4桁を対応させます。${v.apply?'同じビットのXORは0、違うビットは1です。':'現在の先頭が0なので、この位置の計算を飛ばします。'}`}</p></div>`;
};
views['lesson-nfa']=(v,focus)=>{
 let drawing=line(100,150,340,150)+line(400,150,650,150)+text(240,130,'0')+text(520,130,'1')+`<path class="study-wire" d="M70 125 C0 20 170 20 115 125"/>`+text(85,62,'0,1');
 [100,370,680].forEach((x,i)=>{drawing+=`<circle cx="${x}" cy="150" r="36" class="study-node ${v.set.includes(i)?'study-highlight':''}"/>`+(i===2?`<circle cx="${x}" cy="150" r="29" class="study-wire"/>`:'')+text(x,155,'q'+i);});
 return `<div>${svg(drawing,'末尾01を受理するNFA。光った節点は同時にあり得る状態です。',800,220)}<div class="study-input-tape">${[...v.input].map((ch,i)=>`<span class="${v.index===i?'is-linked':''}">${ch}</span>`).join('')||'<span>ε（空文字）</span>'}</div>${equation(`集合状態 = {${v.set.map(x=>'q'+x).join(', ')}}`)}<p class="study-caption">受理状態は二重丸のq2です。入力が残っている間と、全て読み終わった後を区別します。</p></div>`;
};
views['lesson-register']=(v,focus)=>{
 const chosen=v.selected??(v.load?v.d:v.q);
 return `<div class="study-register"><div class="study-register-inputs"><div class="study-box-card ${v.load?'is-linked':''}"><span>新しい入力 D</span><strong>${v.d}</strong></div><div class="study-box-card ${!v.load?'is-linked':''}"><span>今の出力 Q を戻す</span><strong>${v.q}</strong></div></div><span class="study-arrow" aria-hidden="true">→</span><div class="study-box-card"><span>Mux / load = ${v.load}</span><strong>${chosen}</strong><small>${v.load?'新しいDを選択':'前のQを選択'}</small></div><span class="study-arrow" aria-hidden="true">→</span><div class="study-box-card ${v.clock?'is-linked':''}"><span>DFF</span><strong>Q = ${v.q}</strong><small>${v.clock?'立上りで取り込んだ':'まだ立上り前'}</small></div></div>${v.rows?.length?table(['クロック','入力D','load','前のQ','後のQ'],v.rows,'これまでの取込み'):''}`;
};
views['lesson-addresses']=(v,focus)=>{
 const chosen=v.process,frame=v.tables[chosen][v.page];
 return `<div class="study-addresses"><div class="study-address-apps">${['A','B'].map(a=>`<div class="study-address-app${a===chosen?' is-linked':''}"><h4>アプリ ${a}</h4><p>同じ仮想住所でも、使う表が違う</p>${v.tables[a].map((p,i)=>`<div class="study-address-page ${a===chosen&&i===v.page?'is-linked':''}"><span>仮想ページ ${i}<small>番地 ${i*16}〜${i*16+15}</small></span><span>→ フレーム ${p}</span></div>`).join('')}</div>`).join('')}</div><div class="study-address-physical"><h4>実際の物理メモリ</h4>${[0,1,2,3].map(i=>`<div class="study-address-page ${i===frame&&v.phase>0?'is-linked':''}"><span>フレーム ${i}</span><span>番地 ${i*16}〜${i*16+15}</span></div>`).join('')}</div></div>${equation(v.phase<2?`仮想ページ ${v.page} ＋ ページ内 ${v.offset}`:`物理番地 = ${frame} × 16 + ${v.offset} = ${v.physical}`)}<p class="study-caption">同じ仮想番地をBから見るには、「操作するアプリ」を変更してください。色だけでなく、表の番号をたどれます。</p>`;
};
views['lesson-hop']=(v,focus)=>{
 const targets=[['A',v.source],...(v.remote?[['ルーター','左LAN / 右LAN']]:[]),['B',v.destination]];
 const key=focus||'destination';
 return `<div class="study-hop"><div class="study-hop-path">${targets.map(([name,addr],i)=>`${i?'<span class="study-arrow" aria-hidden="true">→</span>':''}<div class="study-box-card ${(key==='destination'&&name==='B')||(key==='link'&&name===(v.phase===1&&v.remote?'ルーター':'B'))?'is-linked':''}"><strong>${h(name)}</strong><span>${h(addr)}</span></div>`).join('')}</div><p>${v.remote?'LAN①：A〜ルーター左側 ／ LAN②：ルーター右側〜B':'AとBは同じLANにいます。'}</p><div class="study-envelope"><div class="study-envelope-label">この区間のEthernetの情報 ${button('link','図の受渡し先を見る',key)}</div><div class="study-envelope-values"><span>送信元MAC <b>${h(v.from)}</b></span><span>宛先MAC <b>${h(v.to)}</b></span></div><div class="study-ip-envelope"><div>最終的な端末を示すIPの情報 ${button('destination','図の最終宛先を見る',key)}</div><p>送信元 ${h(v.source)} → 宛先 <strong>${h(v.destination)}</strong></p><div class="study-payload"><small>送りたい中身</small><p>${h(v.message)}</p></div></div></div><p class="study-caption">${v.phase===0?'まだリンクの包みは作っていません。次の段階でMACの受渡し先を選びます。':'NATなしのこの例では、IPの最終宛先Bは変わらず、区間ごとのMACが変わります。'}</p></div>`;
};
const base=L.visualize;
L.visualize=(v,options={})=>views[v?.type]?views[v.type](v,options.focus??L.app?.current?.noteFocus??null):base(v,options);
L.lessonCompanion=c=>{
 if(!c.result||c.pending||c.dirty||c.error)return '';
 const p=c.params,id=c.lab.id;
 if(id==='c08-adder'){
  const a=+p.a,b=+p.b,ci=+p.carry,s1=a^b,c1=a&b,sum=s1^ci,c2=s1&ci,co=c1|c2;
  return `<section class="study-companion"><h3>2つの半加算器として読む</h3><p>同じ入力を、部品の組み合わせと式で確かめます。</p><div class="study-terms"><div><h4>① AとBを足す</h4>${equation(`${a} ⊕ ${b} = ${s1}`)}<p>仮の和 ${s1}<br>この段のcarry ${c1}</p></div><div><h4>② Cinも足す</h4>${equation(`${s1} ⊕ ${ci} = ${sum}`)}<p>sum = ${sum}<br>この段のcarry ${c2}</p></div><div><h4>③ carryを合わせる</h4>${equation(`${c1} OR ${c2} = ${co}`)}<p>全体の結果：${co}${sum}₂ = ${a+b+ci}</p></div></div></section>`;
 }
 if(id==='c01-bits'){
  const width=p.width,mod=2**width,value=((Math.floor(p.value)%mod)+mod)%mod,bs=value.toString(2).padStart(width,'0'),signed=value>=mod/2?value-mod:value;
  const terms=[...bs].map((b,i)=>({b:Number(b),weight:2**(width-1-i)}));
  return `<section class="study-companion"><h3>1のある位置の重みを足す</h3><div class="study-weight-bits">${terms.map((t,i)=>`<button type="button" class="study-symbol ${t.b?'is-linked':''}" data-r-bit="${i}" aria-label="左から${i+1}番目を切り替える、現在${t.b}"><span>重み ${t.weight}</span><strong>${t.b}</strong></button>`).join('')}</div>${equation(terms.filter(t=>t.b).map(t=>t.weight).join(' + ')+' = '+value)}<p>符号なし：${value} ／ 2の補数：${signed}<br>2の補数では最上位の重みだけを −${mod/2} として読みます。</p></section>`;
 }
 if(id==='c01-hamming')return `<aside class="study-companion"><h3>ノートの並びで行列を追うには</h3><p>この単元では位置1・2・4を検査ビットにしています。ノートの「情報4ビット＋検査3ビット」の並びは、別の解説に分けました。</p><a class="btn" href="#/lab/c01-linear-code">生成行列・検査行列へ進む →</a></aside>`;
 if(id==='n01-packet')return `<aside class="study-companion"><h3>この包みは、図の誰を指している？</h3><p>ヘッダーを重ねる理由を確認したら、IPの最終宛先と、MACの区間ごとの相手を1区間ずつたどれます。</p><a class="btn" href="#/lab/n01-forwarding">IPとMACを対応させる →</a></aside>`;
 if(id==='c10-pages')return `<aside class="study-companion"><h3>ページの置換より前に、住所の意味から</h3><p>「なぜ変換するか」を確かめるには、2つのアプリが同じ番地を使う例を開けます。</p><a class="btn" href="#/lab/c10-address-spaces">アプリごとの仮想アドレスへ →</a></aside>`;
 return '';
};
L.studyTable=table;
})();
