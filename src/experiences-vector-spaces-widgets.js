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
const zeroQuestion=()=>block('なぜ、突然 f=0 を入れるの？',p('最初の目的は0∈Wを確認することです。だから、Vの零多項式を候補として選び、Wの所属条件を満たすか調べます。条件式からf=0という答えを導いているわけではありません。')+eq('確かめたいこと：0∈W → 候補：f=0 → 所属条件に代入 → 成立すれば0∈W'));
const ownWords='つまり、(i)の最終目的としては、Wの中に、0が入っているかを確認することだった\n\n言い換えると、Wはxf\'(x)-f(x)=0 を満たすf(x)の集合全体だから、f(x)=0になれば、Wの中に0が入っていることになる\n\nだから、f=0としてxf\'(x)-f(x)=0に代入すると、なんと0=0となり、条件式を満たした\n\nよって、(i)は満たされた\n\nということですか？';
const vectorDiagram=()=>`<figure class="vs-vector-example"><svg viewBox="0 0 380 250" role="img" aria-label="u=(1,2)の先からv=(3,−1)を足すと、原点から(4,1)に届く"><title>同じベクトルの和を、式と矢印で読む</title><defs><marker id="vs-u-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#8ad7c3"/></marker><marker id="vs-v-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#e8bc81"/></marker><marker id="vs-sum-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#9abffc"/></marker></defs><path class="vs-axis" d="M45 25V210H345"/><path stroke="#8ad7c3" stroke-width="3" fill="none" marker-end="url(#vs-u-arrow)" d="M45 210L105 90"/><path stroke="#e8bc81" stroke-width="3" fill="none" marker-end="url(#vs-v-arrow)" d="M105 90L285 150"/><path stroke="#9abffc" stroke-width="3" fill="none" marker-end="url(#vs-sum-arrow)" d="M45 210L285 150"/><text x="28" y="228">0</text><text x="349" y="215">x</text><text x="34" y="20">y</text><text x="57" y="116">u=(1,2)</text><text x="163" y="86">v=(3,−1)</text><text x="186" y="182">u+v=(4,1)</text></svg><figcaption>uの先からvをつなぐと、原点からu+vに届きます。vを平行に移しても、成分(3,−1)は同じです。</figcaption></figure>`;

register('vector-space-reading',(root,a,current)=>{
 root.classList.add('vs-reading');
 root.innerHTML=block('1　まず、何を集めた集合か決める',p('ℝは実数全体、ℝ²は実数を2個並べた数ベクトル全体です。u∈Vは「uはVの要素」、W⊆Vは「Wの要素はすべてVの要素」を意味します。')+table(['記号','読み方','一つの例'],[['ℝ','実数全体','2、−3、1/2'],['ℝ²','実数2個の組全体','(1,2)'],['ℝ[x]₃','3次以下の実数係数多項式全体','1+2x、x³、0']]))+
 block('2　数ベクトルを足す・定数倍する',eq('(1,2)+(3,−1)=(4,1)')+p('同じ位置の成分どうしを足します。結果も実数2個の組なので、ℝ²に残ります。')+vectorDiagram()+eq('2(1,2)=(2,4)')+p('スカラーとは、定数倍に使う数のことです。この例では実数を使い、各成分に同じ数を掛けます。')+eq('(1,2)+(0,0)=(1,2)')+p('足しても相手を変えない(0,0)が、この空間の零ベクトルです。'))+
 block('3　多項式にも、同じ計算がある',p('多項式は矢印の形をしていませんが、加法とスカラー倍を定義できます。ここでは通常の多項式の足し算・実数倍を使います。')+eq('f=1+2x+x²、g=3−x+2x³')+eq('f+g=4+x+x²+2x³、2f=2+4x+2x²')+p('同じ次数の係数どうしを足し、定数倍ではすべての係数に同じ数を掛けます。3次以下の多項式を足したり定数倍したりしても、3次以下に残ります。'))+
 block('4　ℝ[x]₃を、係数の組として読む',eq('f=a+bx+cx²+dx³ ↔ (a,b,c,d)')+p('添字の3は「3次以下」です。必ずx³の項が必要なわけではありません。係数が0の項は書かなくても、4個の係数を持つ形で読めます。')+table(['多項式','係数 (a,b,c,d)'],[['1+2x','(1,2,0,0)'],['x³','(0,0,0,1)'],['0','(0,0,0,0)']])+`<div class="vs-demo" data-foundation-demo></div>`)+
 block('5　零多項式と「一点で0」を分ける',eq('零多項式：0+0x+0x²+0x³')+p('零多項式はすべての係数が0で、どの点でも値が0です。どんな多項式fに足しても、f+0=fとなります。')+eq('f=x：f(0)=0。でも f は零多項式ではない。')+p('xという多項式は、例えばx=1で値が1になります。「ある点で値が0」と「多項式自体が0」は別です。'))+
 block('6　連続関数も、ベクトル空間の例',p('C(a,b)は、開区間(a,b)上の実数値連続関数全体を表します。このCは関数の集合の記号で、複素数全体ℂとは区別します。関数の和と定数倍は、それぞれの点での値を使って定義します。')+eq('(f+g)(x)=f(x)+g(x)、(λf)(x)=λf(x)')+p('連続関数の和と定数倍は連続です。零ベクトルは、どのxでも0を返す零関数です。多項式や関数そのものを一つのベクトルとして扱います。'))+
 block('7　直感から、正式な定義へ',p('「足す・定数倍する結果が集合に残る」は大切な条件です。それに加えて、演算が次の規則を満たすことがベクトル空間の定義に含まれます。Kはスカラーに使う数の範囲で、ここまでの例ではK=ℝです。Vは空でない集合、u,v,w∈V、λ,μ∈Kとします。')+table(['規則の役割','成り立つ式'],[['足す順序・まとめ方','u+v=v+u ／ (u+v)+w=u+(v+w)'],['零ベクトル・逆元','u+0=u ／ 各uに対してu+(−u)=0'],['スカラー倍のまとめ方・単位','λ(μu)=(λμ)u ／ 1u=u'],['分配法則','λ(u+v)=λu+λv ／ (λ+μ)u=λu+μu']])+p('集合だけでなく、そこで使う加法・スカラー倍と、スカラーの範囲をセットで考えます。加法とスカラー倍ができるだけで、任意の集合をベクトル空間と呼ぶわけではありません。'))+
 block('8　講義の記号 K、Kⁿ、Kₙへ戻る',p('この講義のKはℝ（実数）・ℚ（有理数）・ℂ（複素数）のいずれかです。このように四則演算ができる数の範囲を「体」と呼びます。除算は0以外に対して行います。')+p('Kⁿはn個の成分を縦に並べた列ベクトル、講義のKₙは横に並べた行ベクトルの集合です。縦・横の違いがあっても、各成分を足し、同じスカラーを掛けます。K[x]ₙは、係数をKから選ぶn次以下の多項式全体です。')+note('ここまでの主な例は実数上です。同じ集合でもスカラーの範囲を変えると、別の構造として考える必要があります。'))+
 `<a class="vs-next-link" href="#/lab/c03-subspace">次の教材：部分空間 ― 集合の読み方から証明まで →</a>`;
 mountCoefficients(root.querySelector('[data-foundation-demo]'),current,'foundation');
});

const geometry={
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
 root.innerHTML=block('1　集合の式を、左右に分けて読む',`<div class="vs-set-expression"><span>W = {</span><span class="vs-ambient">f ∈ ℝ[x]<sub>3</sub><small>元の空間から選ぶ</small></span><span>｜</span><span class="vs-condition">xf′ − f = 0<small>Wに入るための条件</small></span><span>}</span></div>`+p('「3次以下の実数係数多項式のうち、xf′−f=0を満たすものを全部集めた集合」と読みます。縦棒｜は「次の条件を満たす」という区切りです。f′はfを微分した多項式です。この例題の具体的な計算は「チャットの例題」タブで読みます。')+`<div class="vs-containment"><strong>V=ℝ[x]<sub>3</sub>：候補全体</strong><div><strong>W：条件を満たす候補</strong><p>0、x、2x、−x、…</p></div><p>Vには、Wに入らない1やx²もある</p></div>`+p('f∈ℝ[x]₃と書かれているので、W⊆ℝ[x]₃は定義から分かります。この図は集合の包含関係を示しています。多項式空間の幾何学的な形を描いたものではありません。'))+
 block('2　部分集合から、部分空間へ',p('W⊆Vに加えて、Wも同じ加法・スカラー倍でベクトル空間になるとき、WはVの部分空間です。単に「中に含まれている」だけでは足りません。')+checklist()+p('和の条件はWのどの2要素にも、スカラー倍の条件はWのどの要素・どの実数にも成立する必要があります。いくつか成功例を試すだけでは証明になりません。'))+
 zeroQuestion()+
 block('3　なぜ3条件だけでよいの？',p('前提としてVはベクトル空間です。Wで使う演算もVのものなので、加法の交換法則・結合法則や分配法則などはそのまま引き継ぎます。残るのは、その演算をWだけで行ってもWに残るか、必要な零ベクトル・逆元があるかです。')+eq('零：0∈W ／ 和：u+v∈W ／ 逆元：(−1)u=−u∈W')+p('零の条件でWが空でないことも確かめます。スカラー倍の条件から逆元も入るため、改めてすべての規則を証明し直す必要がありません。'))+
 block('4　条件を満たす集合・満たさない集合',`<div class="ex-actions" aria-label="比較する集合">${Object.entries(geometry).map(([key,g],i)=>X.html.button(g.label,`data-geometry="${key}" aria-pressed="${i===0}"`)).join('')}</div><div data-geometry-result>${geometryMarkup('line')}</div>`+p('否定する場合は、一つの条件を破る反例が一つあれば十分です。成立を示す場合は、任意の対象について3条件を確認します。')+note('W={0}もW=Vも部分空間です。「部分」という言葉は、必ず元の空間より小さいという意味ではありません。'))+
 block('5　次の例題で使う、証明の読み方',`<ol class="vs-flow"><li>何を示す？</li><li>候補・仮定は？</li><li>所属条件は？</li><li>どの性質で計算する？</li><li>何が結論？</li></ol>`+p('零の確認では一つの決まった候補0を選びます。和・定数倍では任意の対象を使います。この役割の違いを、次のタブの証明でも保ちます。'));
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
  ],'λ𝐱はℝⁿに属し、所属条件も満たすので、λ𝐱∈Wです。')+note('(i)(ii)(iii)のすべてが成立したので、Wはℝⁿの部分空間です。講義のKⁿでも、Aの成分とλを同じ体Kから選べば、同じ証明が通ります。');
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
});

register('subspace-derivative',(root,a)=>{
 root.classList.add('vs-reading');
 root.innerHTML=block('問題を日本語にする',eq('V=ℝ[x]₃、W={f∈ℝ[x]₃ | xf′−f=0}')+p('「3次以下の実数係数多項式のうち、xf′−fが零多項式になるもの全体」です。f∈ℝ[x]₃の部分に、元の空間が書かれています。')+checklist())+
 zeroQuestion()+
 step('(i) 零多項式が入る','Wの中に零多項式が入っていること。','候補としてf₀=0を選びます。零多項式はVに属し、微分も0です。',[
  ['xf₀′−f₀=x·0−0=0','候補をWの所属条件に代入しました。すべてのxで成立します。']
 ],'所属条件を満たしたので、f₀∈W、つまり0∈Wです。')+
 block('理解を言葉にすると',`<blockquote class="vs-learner-quote">${ownWords.split('\n\n').map(p).join('')}</blockquote>`+p('はい、確認の目的と流れはこの理解です。「f(x)=0になれば」という部分は、「f=0を候補として選び、その候補が条件を満たせば」と捉えると正確です。'))+
 block('条件式が0でも、f自体が0とは限らない',eq('f=x → f′=1 → xf′−f=x·1−x=0')+p('f=xもWに入ります。しかしxは零多項式ではありません。ここで示したのは「0もWに入る」であり、「Wの要素はすべて0」ではありません。'))+
 step('(ii) 和で閉じている','Wの任意のf,gについて、f+g∈Wであること。','f,g∈Wを任意に取ります。所属条件からxf′−f=0、xg′−g=0が使えます。',[
  ['x(f+g)′−(f+g)','f+gが入るか調べたいので、所属条件のfの場所をf+gに置き換えます。まだ0とは決めません。'],
  ['=x(f′+g′)−f−g','和の微分 (f+g)′=f′+g′ を使い、括弧を外します。'],
  ['=xf′+xg′−f−g','xを分配します。'],
  ['=(xf′−f)+(xg′−g)','既に0と分かっている二つの式にまとめ直します。'],
  ['=0+0=0','f,g∈Wという仮定を、ここで使います。']
 ],'f+gは3次以下に残り、所属条件も満たすので、f+g∈Wです。')+
 step('(iii) スカラー倍で閉じている','任意のf∈Wとλ∈ℝについて、λf∈Wであること。','f∈Wからxf′−f=0が使えます。λはxに依存しない任意の実数です。',[
  ['x(λf)′−λf','今度の候補λfを、所属条件に代入します。'],
  ['=xλf′−λf','定数倍の微分 (λf)′=λf′ を使います。'],
  ['=λ(xf′−f)','λをくくり、仮定で0と分かっている式を作ります。'],
  ['=λ·0=0','f∈Wという仮定を使います。λ=0や負のλでも成立します。']
 ],'λfも3次以下に残り、所属条件を満たすので、λf∈Wです。')+
 note('前提W⊆Vと、(i)(ii)(iii)のすべてを確認しました。したがってWはℝ[x]₃の部分空間です。')+
 block('発展：このWには、どんな多項式が入る？',p('ここからは所属条件を解いて、Wの形そのものを求めます。上の部分空間の証明とは目的が違います。')+eq('f=a+bx+cx²+dx³')+eq('f′=b+2cx+3dx²')+eq('xf′−f=(bx+2cx²+3dx³)−(a+bx+cx²+dx³)')+eq('=−a+cx²+2dx³')+p('零多項式になるためには、すべての係数が0になる必要があります。一つのxを代入して0になるだけでは不十分です。')+eq('−a=0、c=0、2d=0 ⇒ a=c=d=0。bは自由。')+eq('W={bx | b∈ℝ}')+p('例えば0、x、2x、−5xが入ります。すべてxの実数倍なので、線形結合で作る集合の記法ではspan{x}と書きます。')+note('基底・次元まで進むと、{x}が基底で次元は1です。基底を先に知らなくても、上の3条件で部分空間を判定できます。'));
});

function mountCoefficients(root,current,mode){
 const scope=X.scope(root,current),lab=current.lab,keys=['a','b','c','d','scalar'];let params={...lab.defaults};
 const prefix=mode==='foundation'?'今の多項式を変える':'所属する候補・しない候補を比べる';
 root.innerHTML=`<h4>${prefix}</h4><p>係数は−6〜6の整数です。変更すると式が自動で更新されます。</p><form class="ex-inputs">${X.fields(lab,keys,params,scope.id)}</form><div class="ex-actions">${[['zero','零多項式'],['x','f=x'],['x2','f=x²'],['constant','f=1']].map(([key,label])=>X.html.button(label,`data-polynomial-example="${key}"`)).join('')}</div><p data-ex-status role="status"></p><div data-polynomial-output></div>${note(mode==='foundation'?'整数の小例で対応を観察しています。ベクトル空間としての説明では、すべての実数係数と実数倍を扱います。':'係数の組全体が条件を満たすかを計算します。有限個の候補を試す操作は、上の任意のf・gについての証明の代わりにはなりません。')}`;
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
