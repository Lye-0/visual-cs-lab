/* Reading-first lessons: all proof lines remain visible. Controls update only
 * the concrete example, never the universal written proof. */
(() => {
'use strict';
const L=CSL,X=L.experiences,M=L.vectorSpaces,h=L.h;
if(typeof document==='undefined')return;
const register=(name,mount)=>X.registerWidget(name,(root,a,current)=>{mount(root,a,current);current.completed.add(Number(root.closest('[data-ex-activity]').dataset.exActivity));});
const p=X.html.p,eq=X.html.formula;
const block=(title,body,extra='')=>`<section class="vs-section ${extra}"><h4>${h(title)}</h4>${body}</section>`;
const note=text=>`<aside class="vs-note">${p(text)}</aside>`;
const table=(heads,rows)=>X.html.table(heads,rows);
const checklist=()=>`<ol class="vs-checklist"><li><strong>(i) 零</strong><span>0∈W</span></li><li><strong>(ii) 和</strong><span>u,v∈W ⇒ u+v∈W</span></li><li><strong>(iii) スカラー倍</strong><span>u∈W, λ∈ℝ ⇒ λu∈W</span></li></ol>`;
const step=(title,goal,given,lines,conclusion)=>`<section class="vs-proof-step"><h4>${h(title)}</h4><dl><dt>確かめたいこと</dt><dd>${p(goal)}</dd><dt>選ぶ対象・使えること</dt><dd>${p(given)}</dd><dt>理由付きの計算</dt><dd>${lines.map(([formula,reason])=>`<div class="vs-proof-line">${eq(formula)}${p(reason)}</div>`).join('')}</dd><dt>結論</dt><dd class="vs-membership">${p(conclusion)}</dd></dl></section>`;
const zeroQuestion=()=>block('なぜ、突然 f=0 を入れるの？',p('最初の目的は0∈Wを確認することです。だから、Vの零多項式を候補として選び、Wの所属条件を満たすか調べます。条件式からf=0という答えを導いているわけではありません。')+p('Wに入るための「入場条件」がxf′−f=0です。零多項式もこの条件を満たすか、試しているわけです。')+eq('確かめたいこと：0∈W → 候補：f=0 → 所属条件に代入 → 成立すれば0∈W'));
const ownWords='つまり、(i)の最終目的としては、Wの中に、0が入っているかを確認することだった\n\n言い換えると、Wはxf\'(x)-f(x)=0 を満たすf(x)の集合全体だから、f(x)=0になれば、Wの中に0が入っていることになる\n\nだから、f=0としてxf\'(x)-f(x)=0に代入すると、なんと0=0となり、条件式を満たした\n\nよって、(i)は満たされた';
const vectorDiagram=()=>`<figure class="vs-vector-example"><svg viewBox="0 0 380 300" role="img" aria-label="u=(1,2)の先からv=(3,4)を足すと、原点から(4,6)に届く"><title>数ベクトルの足し算</title><defs><marker id="vs-u-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#8ad7c3"/></marker><marker id="vs-v-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#e8bc81"/></marker><marker id="vs-sum-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#9abffc"/></marker></defs><path class="vs-axis" d="M55 25V265H345"/><path stroke="#9abffc" stroke-width="3" fill="none" marker-end="url(#vs-sum-arrow)" d="M55 265L195 55"/><path stroke="#8ad7c3" stroke-width="3" fill="none" marker-end="url(#vs-u-arrow)" d="M55 265L90 195"/><path stroke="#e8bc81" stroke-width="3" fill="none" marker-end="url(#vs-v-arrow)" d="M90 195L195 55"/><text x="37" y="284">0</text><text x="349" y="270">x</text><text x="44" y="20">y</text><text x="13" y="188">u=(1,2)</text><text x="152" y="158">v=(3,4)</text><text x="203" y="55">u+v=(4,6)</text></svg><figcaption>uの先からvをつなぐと、原点からu+vに届きます。式でも図でも、同じ2つのベクトルを足しています。</figcaption></figure>`;

register('vector-space-reading',(root,a,current)=>{
 root.classList.add('vs-reading');
 const axioms=p('ベクトル空間は、空でない集合Vと、その上の加法・スカラー倍が、次の規則を満たすものです。Kはスカラーに使う数の範囲で、本文の例ではK=ℝです。u,v,w∈V、λ,μ∈Kとします。')+
  table(['規則の役割','成り立つ式'],[['集合内で計算できる','u+v∈V ／ λu∈V'],['足す順序・まとめ方','u+v=v+u ／ (u+v)+w=u+(v+w)'],['零ベクトル・逆元','u+0=u ／ 各uに対してu+(−u)=0'],['スカラー倍のまとめ方・単位','λ(μu)=(λμ)u ／ 1u=u'],['分配法則','λ(u+v)=λu+λv ／ (λ+μ)u=λu+μu']]);
 root.innerHTML=`<div class="vs-main-reading">`+
  block('1　ベクトルは、矢印だけではない',p('高校までだと、(1,2)のようなものをベクトルと呼んでいました。でも大学の線形代数では、ベクトルはもっと広い意味で使います。')+eq('(1,2,3) も、f(x)=x²+2x+1 も、ベクトルとして扱える。')+p('多項式や関数にも、足し算と定数倍ができます。その計算がベクトル空間の規則を満たすとき、多項式や関数そのものを一つのベクトルとして扱えます。'))+
  block('2　ベクトル空間とは、どんな世界？',p('まずは「足し算と定数倍をしても、その世界から飛び出さない集合」と考えてみてください。')+eq('ℝ²={(x,y) | x,y∈ℝ}')+p('ℝ²は、実数を2個並べた組すべてです。図で考えると平面全体にあたります。')+eq('(1,2)+(3,4)=(4,6)')+p('2つ足しても、結果はやっぱりℝ²の中です。')+vectorDiagram()+eq('3(1,2)=(3,6)')+p('定数倍しても、やっぱりℝ²の中にいます。この定数倍に使う数を「スカラー」と呼びます。')+p('数ベクトルや通常の多項式では、加法・定数倍の規則も成立します。正確な定義は、下の補足で確認できます。'))+
  block('3　ℝ[x]₃って何？',p('ℝ[x]₃は、係数が実数で、3次以下の多項式すべてという意味です。')+eq('a+bx+cx²+dx³（a,b,c,dは実数）')+table(['この世界に入る多項式','どう読めるか'],[['1+x','a=1、b=1、c=d=0'],['2x³−5x+7','a=7、b=−5、c=0、d=2'],['0','すべての係数が0']])+p('1+xも、2x³−5x+7も、0も、この集合に入ります。添字の3は「3次以下」で、必ず3次の項が必要なわけではありません。')+eq('0=0x³+0x²+0x+0')+p('この0を「零多項式」と呼びます。どんな多項式に足しても、その多項式を変えません。')+eq('f+0=f')+note('零多項式は、どのxでも値が0です。f=xはx=0で値が0になりますが、多項式そのものは零多項式ではありません。'))+
 `</div><div class="vs-supplements"><details class="vs-supplement" data-vs-axioms><summary>補足：ベクトル空間の正式な定義</summary><div class="vs-supplement-body">${axioms}</div></details>`+
 `<details class="vs-supplement" data-vs-polynomial-demo><summary>補足：係数を変えて、和・定数倍を確かめる</summary><div class="vs-supplement-body"><p>f=a+bx+cx²+dx³を、係数の組(a,b,c,d)で読むと、同じ次数どうしを足す計算が見えます。</p><div class="vs-demo" data-foundation-demo></div></div></details>`+
 `<details class="vs-supplement"><summary>補足：Kの記法と、関数の例</summary><div class="vs-supplement-body">${p('Kはスカラーに使う体を表します。ℝ（実数）・ℚ（有理数）・ℂ（複素数）が例です。Kⁿはn成分の数ベクトル全体、K[x]ₙはn次以下のK係数多項式全体です。行ベクトル全体をKₙと書く流儀もあります。')}${p('C(a,b)は、開区間(a,b)上の実数値連続関数全体です。このCは関数の集合の記号で、複素数全体ℂとは区別します。')}${eq('(f+g)(x)=f(x)+g(x)、(λf)(x)=λf(x)')}${p('連続関数の和と定数倍は連続です。零ベクトルは、どのxでも0を返す零関数です。')}</div></details></div>`+
 `<a class="vs-next-link" href="#/lab/c03-subspace">次の教材：部分空間 ― 集合の読み方から証明まで →</a>`;
 mountCoefficients(root.querySelector('[data-foundation-demo]'),current,'foundation');
});

const geometry={
 xaxis:{label:'x軸',formula:'W={(s,0) | s∈ℝ}',checks:['入る：(0,0)はx軸の上','残る：(s,0)+(t,0)=(s+t,0)','残る：λ(s,0)=(λs,0)'],path:'M20 150H300',points:[[-1,0,'u'],[2,0,'v'],[1,0,'u+v']],result:'足しても、定数倍しても、結果はx軸の上です。任意のs,t,λで成り立つので、x軸はℝ²の部分空間です。'},
 line:{label:'原点を通る直線',formula:'W={(s,2s) | s∈ℝ}',checks:['入る：s=0','残る：(s,2s)+(t,2t)=(s+t,2(s+t))','残る：λ(s,2s)=(λs,2λs)'],path:'M90 290L230 10',points:[[1,2,'u'],[-.5,-1,'v'],[.5,1,'u+v']],result:'3条件がすべて成立します。任意のs,t,λについて式で示したので、この直線はℝ²の部分空間です。'},
 offset:{label:'原点を通らない直線',formula:'W={(s,2s+1) | s∈ℝ}',checks:['入らない：(0,0)はy=2x+1を満たさない','残らない：(0,1)+(0,1)=(0,2)','残らない：2(0,1)=(0,2)'],path:'M70 290L210 10',points:[[0,1,'u'],[0,2,'2u']],result:'零ベクトルが入らない時点で部分空間ではありません。全部の条件の失敗を示す必要はありません。'},
 axes:{label:'2本の座標軸の合併',formula:'W={(x,y) | x=0 または y=0}',checks:['入る：(0,0)は両方の軸にある','残らない：(1,0)+(0,1)=(1,1)','残る：一つの軸の点を定数倍しても同じ軸'],path:'M20 150H300M160 10V290',points:[[1,0,'u'],[0,1,'v'],[1,1,'u+v']],result:'零ベクトルを含み、スカラー倍で閉じていても、和で閉じていません。原点があるだけでは部分空間になりません。'},
 segment:{label:'原点を含む線分',formula:'W={(s,0) | −1≤s≤1}',checks:['入る：s=0','残らない：(1,0)+(1,0)=(2,0)','残らない：2(1,0)=(2,0)'],path:'M120 150H200',points:[[1,0,'u'],[2,0,'2u']],result:'一部の倍率では線分の外へ出ます。スカラー倍の条件は、正・負・0を含むすべての実数について必要です。'}
};
function geometryMarkup(key){
 const g=geometry[key],x=v=>160+40*v,y=v=>150-40*v;
 const diagram=`<svg class="vs-plane" viewBox="0 0 320 310" role="img" aria-label="${h(g.label)}と、説明に使う点"><title>${h(g.label)}</title><path class="vs-axis" d="M20 150H300M160 10V290"/><path class="vs-set" d="${g.path}"/><circle class="vs-origin" cx="160" cy="150" r="4"/><text x="144" y="172">0</text><text x="303" y="143">x</text><text x="170" y="17">y</text>${g.points.map(([a,b,label],i)=>`<circle class="vs-point vs-point-${i}" cx="${x(a)}" cy="${y(b)}" r="5"/><text x="${x(a)+8}" y="${y(b)-9}">${h(label)} (${a},${b})</text>`).join('')}</svg>`;
 return eq(g.formula)+`<div class="vs-two"><div>${diagram}${p('青緑の線がW。点は説明に使う具体例です。')}</div><div>${table(['条件','確認する理由'],g.checks.map((text,i)=>[['(i) 零','(ii) 和','(iii) スカラー倍'][i],text]))}${note(g.result)}</div></div>`;
}
register('subspace-concept',(root,a,current)=>{
 const scope=X.scope(root,current);root.classList.add('vs-reading');
 root.innerHTML=block('1　部分空間って何？',p('大きな世界としてV=ℝ²、つまり平面全体があったとします。その中からx軸だけを取り出してみます。')+eq('V=ℝ²、W={(s,0) | s∈ℝ}')+`<div class="vs-plane-intro"><svg class="vs-plane" viewBox="0 0 320 250" role="img" aria-label="平面全体V=ℝ²の中に、x軸Wがある"><title>平面全体と、その中のx軸</title><rect x="20" y="15" width="280" height="210" fill="#1b2b3e"/><path class="vs-axis" d="M160 15V225"/><path class="vs-set" d="M20 120H300"/><circle class="vs-origin" cx="160" cy="120" r="4"/><text x="31" y="39">V=ℝ²：平面全体</text><text x="195" y="105">W：x軸だけ</text><text x="143" y="142">0</text></svg></div>`+p('このWだけを取り出しても、足し算と定数倍ができ、零ベクトルも入っています。このWを、Vの「部分空間」と呼びます。')+note('大きなベクトル空間の中にある、それ自体もベクトル空間になる集合です。'))+
 block('2　部分空間かどうかは、3条件で判定する',p('Vがベクトル空間で、W⊆Vのとき、次の3つを確認します。WにもVと同じ足し算・定数倍を使います。')+checklist()+table(['式を日本語にすると','確かめること'],[['(i) 0が入っている','零ベクトルもWのメンバーになっている？'],['(ii) 中のもの同士を足しても中にいる','u,vがWの中なら、u+vもWの中？'],['(iii) 中のものを定数倍しても中にいる','uがWの中なら、cuもWの中？']]))+
 block('3　なぜ、この3つを調べるの？',p('部分空間とは、その集合だけ取り出しても、ベクトル空間として成立しているという意味でした。だから、Wの中に零ベクトルがあり、足したり定数倍したりしてもWに残ることを確かめます。')+p('和はどの2要素についても、定数倍は正・負・0を含むどの実数についても成り立つ必要があります。')+eq('u,v∈W → u+vは？ ／ u∈W → cuは？')+p('試した数例で成功しただけでは、どの対象にも通るとは限りません。次の例題では、任意のf,gと任意の定数を使って確かめます。'))+
 `<details class="vs-supplement"><summary>補足：3条件で十分な理由</summary><div class="vs-supplement-body">${p('Vは既にベクトル空間で、Wでも同じ演算を使います。交換法則・結合法則・分配法則などはVから引き継げます。零の条件でWが空でないことを確かめ、スカラー倍の条件から逆元(−1)u=−uもWに入ると分かります。')}</div></details>`+
 `<details class="vs-supplement"><summary>補足：いくつかの集合を比べる</summary><div class="vs-supplement-body"><div class="ex-actions" aria-label="比較する集合">${Object.entries(geometry).map(([key,g],i)=>X.html.button(g.label,`data-geometry="${key}" aria-pressed="${i===0}"`)).join('')}</div><div data-geometry-result>${geometryMarkup('xaxis')}</div>${p('部分空間ではないと示すには、条件を一つ破る反例が一つあれば十分です。')}${note('W={0}もW=Vも部分空間です。「部分」という言葉は、必ず元の空間より小さいという意味ではありません。')}</div></details>`;
 scope.on(root,'click',e=>{const button=e.target.closest('[data-geometry]');if(!button)return;for(const b of root.querySelectorAll('[data-geometry]'))b.setAttribute('aria-pressed',String(b===button));root.querySelector('[data-geometry-result]').innerHTML=geometryMarkup(button.dataset.geometry);});
});

register('subspace-proof',(root,a)=>{
 root.classList.add('vs-reading');
 if(a.proof==='matrix'){
  root.innerHTML=block('問題と、その所属条件',p('Aを固定したm×nの実数行列とします。未知の数ベクトルは太字のxで表し、多項式の変数xと区別します。')+eq('V=ℝⁿ、W={𝐱∈ℝⁿ | A𝐱=𝟎} ⊆ ℝⁿ')+p('Wに入る条件は、Aを掛けた結果が零ベクトルになることです。入力𝐱はn成分、出力A𝐱はm成分です。')+checklist())+
  step('(i) 零ベクトルが入る','ℝⁿの零ベクトル𝟎がWの要素であること。','候補として𝐱=𝟎を選びます。Aは固定した行列です。',[['A𝟎=𝟎','行列の各行と零ベクトルの積は、すべて0になります。左の零ベクトルはn成分、右はm成分です。']],'所属条件A𝐱=𝟎を満たしたので、𝟎∈Wです。')+
  step('(ii) 和で閉じている','Wの任意の𝐱,𝐲について、𝐱+𝐲∈Wであること。','𝐱,𝐲∈Wを任意に取ります。所属条件からA𝐱=𝟎、A𝐲=𝟎が使えます。',[
   ['A(𝐱+𝐲)=A𝐱+A𝐲','行列の積の分配法則を使います。'],['=𝟎+𝟎=𝟎','𝐱と𝐲がWに入るという仮定を使います。']
  ],'𝐱+𝐲もℝⁿに属し、Aを掛けると𝟎なので、𝐱+𝐲∈Wです。')+
  step('(iii) スカラー倍で閉じている','任意の𝐱∈Wとλ∈ℝについて、λ𝐱∈Wであること。','𝐱∈WなのでA𝐱=𝟎です。λは正・負・0を含む任意の実数です。',[
   ['A(λ𝐱)=λ(A𝐱)','行列の積とスカラー倍の性質を使います。'],['=λ𝟎=𝟎','A𝐱=𝟎という仮定を使います。']
  ],'λ𝐱はℝⁿに属し、所属条件も満たすので、λ𝐱∈Wです。')+note('(i)(ii)(iii)のすべてが成立したので、Wはℝⁿの部分空間です。Kⁿでも、Aの成分とλを同じ体Kから選べば、同じ証明が通ります。');
 }else{
  root.innerHTML=block('問題と、その所属条件',eq('V=ℝ[x]₃、W={f∈ℝ[x]₃ | f(1)=0、f(−1)=0}')+p('1と−1の2点で値が0になる多項式を集めます。どの点でも値が0である、という条件ではありません。例えばf=x²−1はこの集合に入る零でない多項式です。')+checklist())+
  step('(i) 零多項式が入る','零多項式0がWに入ること。','f₀=0+0x+0x²+0x³を候補に選びます。',[
   ['f₀(1)=0、f₀(−1)=0','零多項式はどの点でも0なので、二つの所属条件を両方満たします。']
  ],'f₀∈ℝ[x]₃で二つの条件も満たすので、0∈Wです。')+
  step('(ii) 和で閉じている','任意のf,g∈Wについて、f+g∈Wであること。','f(1)=g(1)=0、f(−1)=g(−1)=0が、所属条件から使えます。',[
   ['(f+g)(1)=f(1)+g(1)=0+0=0','関数の和は、同じ点での値を足したものです。まず1で確かめます。'],['(f+g)(−1)=f(−1)+g(−1)=0+0=0','もう一つの点−1も必要です。1で成立しただけでは十分ではありません。']
  ],'f+gも3次以下で、二つの条件を両方満たすので、f+g∈Wです。')+
  step('(iii) スカラー倍で閉じている','任意のf∈Wとλ∈ℝについて、λf∈Wであること。','f(1)=0、f(−1)=0が使えます。λは任意の実数です。',[
   ['(λf)(1)=λf(1)=λ·0=0','定数倍した関数の値は、元の値を同じλ倍したものです。'],['(λf)(−1)=λf(−1)=λ·0=0','もう一つの点でも、同じ理由で0になります。']
  ],'λfも3次以下で、二つの条件を満たすので、λf∈Wです。')+note('3条件がすべて成立したので、Wはℝ[x]₃の部分空間です。多項式の形を全部求めなくても、この証明で判定できます。');
 }
 if(a.collapsed)root.innerHTML='<details class="vs-supplement" data-vs-other-proof><summary>証明を読む</summary><div class="vs-supplement-body">'+root.innerHTML+'</div></details>';
});

register('subspace-derivative',(root,a)=>{
 root.classList.add('vs-reading');
 root.innerHTML=block('まず、問題を日本語にする',eq('W={f∈ℝ[x]₃ | xf′−f=0}')+p('「3次以下の実数係数多項式のうち、xf′−f=0を満たすものだけ集めた集合」です。大きな世界がℝ[x]₃で、その中からある条件を満たす多項式だけ抜き出したものがWです。')+p('問題は、このWは、それ単体でベクトル空間になっていますか？ ということです。'))+
 block('大きなベクトル空間は、どこに書かれている？',`<div class="vs-set-expression"><span>W = {</span><span class="vs-ambient">f ∈ ℝ[x]<sub>3</sub><small>元の空間から選ぶ</small></span><span>｜</span><span class="vs-condition">xf′ − f = 0<small>Wに入るための条件</small></span><span>}</span></div>`+p('f∈ℝ[x]₃の部分に書かれています。Wに入っているfは、すべてℝ[x]₃の中から選ばれているので、W⊆ℝ[x]₃です。')+`<div class="vs-containment"><strong>V=ℝ[x]<sub>3</sub>：3次以下の実数係数多項式全体</strong><div><strong>W：xf′−f=0を満たす多項式</strong></div></div>`+p('この包含関係は定義から分かります。そのうえで、零・和・スカラー倍の3条件を確認します。'))+
 zeroQuestion()+
 `<section class="vs-proof-step"><h4>(i) 0が入っていることを確認する</h4>${p('零多項式f=0を候補に選びます。まずf′=0なので、')}${eq('xf′−f=x·0−0=0')}${p('ちゃんとWの条件を満たします。だから0∈Wです。')}</section>`+
 block('確認の目的を、言葉で整理する',`<blockquote class="vs-learner-quote">${ownWords.split('\n\n').map(p).join('')}</blockquote>`+p('この理解で合っています。「f(x)=0になれば」という部分は、「f=0を選び、その候補がWの条件を満たすか確認する」と捉えると正確です。'))+
 `<section class="vs-proof-step"><h4>(ii) 条件を満たす2つを足しても、条件を満たす？</h4>${p('f,g∈Wとします。この記号は、fとgはどちらもWのメンバーという意味です。だから、次の二つが使えます。')}<div class="vs-two">${block('fが満たす条件',eq('xf′−f=0'))}${block('gが満たす条件',eq('xg′−g=0'))}</div>${p('ここで、f+gもWに入るか調べたい。Wに入るためには、x(f+g)′−(f+g)が0になる必要があります。')}${eq('x(f+g)′−(f+g)')}${p('和の微分(f+g)′=f′+g′を使って計算します。')}${eq('=x(f′+g′)−f−g')}${eq('=xf′+xg′−f−g')}${p('順番を変えて、既に0と分かっている式をまとめます。')}${eq('=(xf′−f)+(xg′−g)')}<div class="vs-zero-pair" role="math"><span><strong>xf′−f</strong><small>f∈Wなので0</small></span><b>＋</b><span><strong>xg′−g</strong><small>g∈Wなので0</small></span></div>${eq('=0+0=0')}${p('fもgも条件を満たしていて、足したf+gも条件を満たしました。f+gも3次以下に残るので、f+g∈Wです。')}</section>`+
 `<section class="vs-proof-step"><h4>(iii) 定数倍しても、条件を満たす？</h4>${p('今度はf∈Wと、c∈ℝを取ります。cはxに依存しない、ただの実数です。例えば2、−3、1/2などです。')}${p('cfがWに入るか調べます。条件式に入れると、')}${eq('x(cf)′−cf')}${p('定数倍の微分(cf)′=cf′を使います。')}${eq('=xcf′−cf')}${p('cをくくると、')}${eq('=c(xf′−f)')}${p('でもf∈Wなので、xf′−f=0でした。したがって、')}${eq('=c·0=0')}${p('cfも条件を満たしました。cfも3次以下に残るので、cf∈Wです。正・負・0を含む任意の実数cで同じ理由が通ります。')}</section>`+
 block('3条件が、全部成立した',checklist()+p('零多項式が入り、和でも定数倍でもWに残ります。したがって、Wはℝ[x]₃の部分空間です。'))+
 block('実は、このWの正体も求められる',p('一般のfを、係数を使って書きます。')+eq('f=a+bx+cx²+dx³')+eq('f′=b+2cx+3dx²')+eq('xf′=bx+2cx²+3dx³')+p('条件式へ代入して整理すると、')+eq('xf′−f=(bx+2cx²+3dx³)−(a+bx+cx²+dx³)')+eq('=−a+cx²+2dx³')+p('これがすべてのxで0になるには、各係数が0です。')+eq('a=0、c=0、d=0。bだけ自由。')+eq('W={bx | b∈ℝ}')+p('例えば、0、x、2x、−5x、(1/2)xなどが入っています。'))+
 block('これを見ると、3条件が直感的になる',eq('2x+3x=5x')+p('足しても、やっぱりxの実数倍なのでWの中です。')+eq('4(2x)=8x')+p('定数倍しても、Wの中です。もちろん0=0xも入っています。')+note('この具体例の観察と、上で任意のf,g,cについて示した証明を対応させて読んでください。'))+
 `<details class="vs-supplement"><summary>補足：基底・次元へのつながり</summary><div class="vs-supplement-body">${p('Wはxの実数倍全体なので、W=span{x}とも書きます。{x}はWの基底で、次元は1です。基底・次元については関連教材で詳しく扱います。')}</div></details>`;
});

function mountCoefficients(root,current,mode){
 const scope=X.scope(root,current),lab=current.lab,keys=['a','b','c','d','scalar'];let params={...lab.defaults};
 const prefix=mode==='foundation'?'今の多項式を変える':'所属する候補・しない候補を比べる';
 const formMarkup=`<form class="ex-inputs">${X.fields(lab,keys,params,scope.id)}</form>`;
 root.innerHTML=`<h4>${prefix}</h4><div class="ex-actions">${[['zero','零多項式'],['x','f=x'],['x2','f=x²']].map(([key,label])=>X.html.button(label,`data-polynomial-example="${key}" aria-label="候補を${label}にする"`)).join('')}</div><p data-ex-status role="status"></p><div data-polynomial-output></div>${mode==='foundation'?formMarkup:`<details class="vs-supplement" data-vs-coefficient-editor><summary>補足：係数を変えて、ほかの候補も試す</summary><div class="vs-supplement-body"><p>係数は−6〜6の整数です。変更すると式が自動で更新されます。</p>${formMarkup}</div></details>`}${note(mode==='foundation'?'整数の小例で対応を観察しています。ベクトル空間としての説明では、すべての実数係数と実数倍を扱います。':'操作した候補の計算は、任意のf・gについての証明と対応させて読んでください。')}`;
 const form=root.querySelector('form'),status=root.querySelector('[data-ex-status]'),output=root.querySelector('[data-polynomial-output]');
 function render(){
  const f=[params.a,params.b,params.c,params.d],scaled=M.scale(f,params.scalar),coefficients=f.map((v,i)=>[v,['1','x','x²','x³'][i]]);
  let body=`<div class="vs-coefficients">${coefficients.map(([v,label],i)=>`<div><small>${['a','b','c','d'][i]}：${label}の係数</small><strong>${v}</strong></div>`).join('')}</div>`+eq('f='+M.polynomial(f)+' ↔ ('+f.join(', ')+')')+eq('λf='+params.scalar+'('+M.polynomial(f)+')='+M.polynomial(scaled));
  if(mode==='foundation'){
   const g=[3,-1,0,2],sum=M.add(f,g);body+=eq('g=3−x+2x³ ↔ (3,−1,0,2)')+eq('f+g='+M.polynomial(sum)+' ↔ ('+sum.join(', ')+')')+p('4個の係数を同じ位置どうしで足します。gは固定し、入力ではfと倍率λだけを変えています。');
  }else{
   body+=eq('f′='+M.polynomial(M.derivative(f)))+eq('xf′−f='+M.polynomial(M.residual(f)))+table(['確認すること','今回の候補についての結果'],[['xf′−fは零多項式か',M.member(f,'derivative')?'はい → f∈W':'いいえ → f∉W'],['f自体が零多項式か',M.isZero(f)?'はい':'いいえ'],['x=0だけで条件式を評価すると',M.evaluate(M.residual(f),0)]]);
   body+=p('最後の行が0でも、所属するとは限りません。f=x²を選ぶと、条件式はx²です。x=0では0になりますが、零多項式ではありません。');
  }
  output.innerHTML=body;
 }
 const apply=()=>{try{params=X.readFields(form,lab,params);render();status.textContent='';output.removeAttribute('aria-busy');}catch(error){status.textContent=error.message;status.classList.add('ex-error');output.setAttribute('aria-busy','true');return;}status.classList.remove('ex-error');};
 const live=X.liveInput(form,scope,{accept:el=>el.closest('form'),apply,invalidate:()=>{status.textContent='更新中。式は直前の有効な入力を示しています。';output.setAttribute('aria-busy','true');}});
 scope.on(form,'submit',e=>{e.preventDefault();live.cancel();apply();});
 scope.on(root,'click',e=>{const button=e.target.closest('[data-polynomial-example]');if(!button)return;live.cancel();const cases={zero:[0,0,0,0],x:[0,1,0,0],x2:[0,0,1,0],constant:[1,0,0,0]},values=cases[button.dataset.polynomialExample];['a','b','c','d'].forEach((key,i)=>form.elements[key].value=values[i]);apply();});
 render();
}
register('polynomial-membership',(root,a,current)=>mountCoefficients(root,current,'membership'));
})();
