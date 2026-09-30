/* Exact small polynomial examples. The written universal proofs are distinct
 * from trying finitely many integer coefficients in the workspaces. */
(() => {
'use strict';
const L=CSL,M=L.vectorSpaces={};
M.coefficients=values=>{
 if(!Array.isArray(values)||values.length!==4||values.some(v=>!Number.isSafeInteger(v)||Math.abs(v)>10000))throw Error('係数は4個の整数（絶対値10000以下）で指定してください。');
 return values.map(v=>v===0?0:v);
};
M.add=(f,g)=>{const left=M.coefficients(f),right=M.coefficients(g);return left.map((v,i)=>v+right[i]);};
M.scale=(f,c)=>{if(!Number.isSafeInteger(c)||Math.abs(c)>100)throw Error('倍率は−100〜100の整数です。');return M.coefficients(f).map(v=>v*c||0);};
M.derivative=f=>{const [a,b,c,d]=M.coefficients(f);return [b,2*c,3*d,0];};
M.residual=f=>{const [a,b,c,d]=M.coefficients(f);return [-a||0,0,c,2*d];};
M.evaluate=(f,x)=>{if(!Number.isSafeInteger(x)||Math.abs(x)>100)throw Error('評価する点は−100〜100の整数です。');return M.coefficients(f).reduce((n,v,i)=>n+v*x**i,0);};
M.isZero=f=>M.coefficients(f).every(v=>v===0);
M.member=(f,condition)=>condition==='derivative'?M.isZero(M.residual(f)):condition==='roots'?M.evaluate(f,1)===0&&M.evaluate(f,-1)===0:false;
M.polynomial=f=>{
 const terms=[];for(const [i,v]of M.coefficients(f).entries()){
  if(!v)continue;const variable=['','x','x²','x³'][i],magnitude=Math.abs(v),term=(i&&magnitude===1?'':magnitude)+variable;
  terms.push((terms.length?(v<0?' − ':' + '):(v<0?'−':''))+term);
 }return terms.join('')||'0';
};
const range=(key,label,value)=>L.ctrl.range(key,label,value,-6,6,1);
const controls=[range('a','定数項 a',0),range('b','x の係数 b',1),range('c','x² の係数 c',0),range('d','x³ の係数 d',0),range('scalar','定数倍の倍率 λ',2)];
const coeff=p=>[p.a,p.b,p.c,p.d];
for(const id of ['vector-space','subspace'])L.register(id,p=>{
 const f=coeff(p),rows=[['多項式 f',M.polynomial(f)],['係数 (a,b,c,d)',f.join(', ')],['λf',M.polynomial(M.scale(f,p.scalar))],['零多項式か',M.isZero(f)?'はい':'いいえ']];
 if(id==='subspace')rows.push(['xf′−f',M.polynomial(M.residual(f))],['xf′−f=0 の集合に入るか',M.member(f,'derivative')?'入る':'入らない']);
 return L.result([L.frame('多項式と係数を対応させる',id==='subspace'?'恒等式は残った多項式の全係数が0かで判定します。一点の値では判定しません。':'係数を足し、定数倍しても、3次以下の実数係数多項式に残ります。',{type:'curriculum-board',kind:'table',headers:['対象','今回の値'],rows})],{},'操作した例の計算と、任意の対象についての証明を区別します。');
});
if(L.onDemand)return;
const definitions=[
 {id:'c03-vector-space',engine:'vector-space',title:'ベクトル空間 ― 多項式もベクトル？',question:'矢印・多項式・関数を、同じ「ベクトル」として扱えるのはなぜ？',summary:'足し算・定数倍・零ベクトルを数ベクトルと多項式で対応させ、集合の記号とベクトル空間の定義を読み解きます。',minutes:18,prereq:[],terms:[['ベクトル空間','集合と、その上の加法・スカラー倍がベクトル空間の規則を満たす構造です。'],['零多項式','すべての係数が0の多項式。どの点でも値が0になります。'],['ℝ[x]₃','零多項式を含む、3次以下の実数係数多項式全体です。']]},
 {id:'c03-subspace',engine:'subspace',title:'部分空間 ― 集合の読み方から証明まで',question:'零・和・定数倍の計算は、それぞれ何を確かめている？',summary:'元の空間と所属条件を読み分け、3条件の目的、講義の2例題、xf′−f=0 の例題を理由付きの証明でつなぎます。',minutes:30,prereq:['c03-vector-space'],terms:[['部分空間','Vの部分集合が、Vと同じ加法・スカラー倍で同じ体上のベクトル空間になることです。'],['閉じている','集合内の対象に演算をしても、結果がその集合に残ることです。'],['恒等式','多項式としての等式。特定の点だけで成立する等式と区別します。']]}
];
for(const def of definitions){
 const sections=def.terms.map(([term,text])=>[term,text,'']);
 L.add({...def,unit:def.title,area:'C03',course:'数学・数学演習・線形代数',level:2,presentation:'direct',sources:['gap-mit-linear'],controls,
  keywords:['ベクトル空間','線形空間','部分空間','多項式','零多項式','零ベクトル','加法','スカラー倍','閉じている','集合の読み方','証明','xf′−f','R[x]_3'],
  scope:'実数上の数ベクトル・3次以下の多項式を中心に、連続関数と体Kの記法も説明します。操作の係数・倍率は−6〜6の整数。証明は任意の実数・対象を扱います。',
  limits:'操作した有限個の例を一般の証明とは扱いません。教材の図は対象の関係を示すもので、抽象空間そのものの形ではありません。基底・次元は関連教材への発展です。',
  guide:['対象を集めた集合と、その所属条件を読み分けます。','計算の前に、何を示すのかを確認します。','具体例の観察と任意の対象についての証明を区別します。'],lesson:def.summary,
  reading:{why:def.question,idea:def.summary,example:'f=x は零多項式ではありませんが、xf′−f=x−x=0 を満たします。',pitfall:'条件式の計算結果が0になることと、候補f自体が0であることは別です。',focus:['a','b','c','d'],nextLabel:'係数と式を対応させる',terms:def.terms.map(([term,definition])=>({term,definition})),notes:'',sections},
  exploration:{label:'定数項を1に変える',patch:{a:1}},observe:'係数・多項式・条件式を同じ候補について読み比べます。',
  challenge:{question:'xf′−f=0 を満たす f=x は零多項式ですか？',options:['零多項式である','零多項式ではないが、条件を満たす','部分空間は零多項式しか含まない'],answer:1,explanation:'xという多項式は0ではありません。微分して条件式へ代入するとx−x=0になります。'},
  coverage:{status:'implemented-model',targets:sections.map(([name,description,formula])=>({name,description,formula})),notes:'集合の記法、演算、3条件、一般の証明を独自の文章と図で説明します。'}});
 L.lessonDrafts[def.id]={why:def.question,idea:def.summary,example:'係数の組 (0,1,0,0) は多項式xを表します。',pitfall:'条件式が0でも、f自体が0とは限りません。'};
 for(const [term,definition]of def.terms)L.glossary.push({term,definition,lab:def.id});
 for(const course of L.courses)if(course.labs.includes('gap-001')&&!course.labs.includes(def.id))course.labs.push(def.id);
}
L.additionalLabIds=[...(L.additionalLabIds||[]),...definitions.map(d=>d.id)];
L.curriculum.coverage.units=L.labs.length;L.curriculum.coverage.additionalIds=L.additionalLabIds.slice();
})();
