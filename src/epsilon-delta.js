/* Decimal inputs are compared as exact rationals; plotting is only an illustration. */
(() => {
'use strict';
const L=CSL,M=L.epsilonDelta={};
const gcd=(a,b)=>{a=a<0n?-a:a;while(b){[a,b]=[b,a%b];}return a||1n;};
const q=(n,d=1n)=>{if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return {n:n/g,d:d/g};};
const R=value=>{if(!Number.isFinite(Number(value)))throw Error('有限な数値を入力してください。');const [mantissa,power='0']=String(value).toLowerCase().split('e'),negative=mantissa.startsWith('-'),parts=mantissa.replace(/^[-+]/,'').split('.'),digits=parts.join(''),scale=(parts[1]?.length||0)-Number(power);if(Math.abs(scale)>24)throw Error('この教材の小数桁数を超えています。');return scale>=0?q(BigInt(digits)*(negative?-1n:1n),10n**BigInt(scale)):q(BigInt(digits)*(negative?-1n:1n)*10n**BigInt(-scale));};
const add=(a,b)=>q(a.n*b.d+b.n*a.d,a.d*b.d),sub=(a,b)=>add(a,q(-b.n,b.d)),mul=(a,b)=>q(a.n*b.n,a.d*b.d),div=(a,b)=>q(a.n*b.d,a.d*b.n),abs=a=>q(a.n<0n?-a.n:a.n,a.d),cmp=(a,b)=>a.n*b.d<b.n*a.d?-1:a.n*b.d>b.n*a.d?1:0;
const num=a=>Number(a.n)/Number(a.d),exact=a=>a.d===1n?String(a.n):a.n+'/'+a.d,one=R(1),zero=R(0),two=R(2);
M.specs={linear:{a:1,L:3,formula:'f(x)=2x+1',xs:[-1,3],ys:[-2,8]},square:{a:1,L:1,formula:'f(x)=x²',xs:[-1,3],ys:[-1,10]},hole:{a:1,L:2,formula:'f(x)=(x²−1)/(x−1)（x≠1）',xs:[-1,3],ys:[-1,7]},jump:{a:0,L:.5,formula:'f(x)=0（x<0）、1（x≥0）',xs:[-2,2],ys:[-3,4]}};
M.value=(mode,x,pointValue=null)=>mode==='linear'?2*x+1:mode==='square'?x*x:mode==='hole'?(x===1?pointValue:x+1):x<0?0:1;
M.analyze=p=>{
 const spec=M.specs[p.mode];if(!spec)throw Error('関数を選んでください。');
 for(const [key,min,max]of [['epsilon',.01,2],['delta',.0001,2],['x',-2,3]])if(!Number.isFinite(p[key])||p[key]<min||p[key]>max)throw Error(key+'は'+min+'〜'+max+'の範囲です。');
 const E=R(p.epsilon),D=R(p.delta),a=R(spec.a),limit=R(p.mode==='jump'?p.limit:spec.L);
 if(p.mode==='jump'&&(!Number.isFinite(p.limit)||p.limit<-.5||p.limit>1.5))throw Error('Lは−0.5〜1.5です。');
 const pointValue=p.pointValue==='undefined'||p.pointValue==null?null:Number(p.pointValue);
 if(pointValue!==null&&![2,5].includes(pointValue))throw Error('点の値を選び直してください。');
 const at=x=>p.mode==='linear'?add(mul(two,x),one):p.mode==='square'?mul(x,x):p.mode==='hole'?(cmp(x,a)===0?(pointValue===null?null:R(pointValue)):add(x,one)):cmp(x,zero)<0?zero:one;
 const point=x=>{const y=at(x),distance=abs(sub(x,a)),error=y===null?null:abs(sub(y,limit)),eligible=cmp(distance,zero)>0&&cmp(distance,D)<0;return {x:num(x),y:y===null?null:num(y),distance:num(distance),error:error===null?null:num(error),eligible,meets:eligible&&error!==null&&cmp(error,E)<0,exactX:exact(x),exactDistance:exact(distance),exactError:error===null?'未定義':exact(error)};};
 let bound=p.mode==='linear'?mul(two,D):p.mode==='square'?add(mul(two,D),mul(D,D)):D;
 if(p.mode==='jump'){const left=abs(limit),right=abs(sub(one,limit));bound=cmp(left,right)>=0?left:right;}
 const attained=p.mode==='jump',holds=cmp(bound,E)<0||!attained&&cmp(bound,E)===0;
 let witness=null;
 if(!holds){
  if(p.mode==='jump')witness=point(add(a,mul(div(D,two),cmp(abs(limit),E)>=0?R(-1):one)));
  else for(let k=1n;k<=128n;k++){
   const den=2n**k,h=mul(D,q(den-1n,den)),candidate=point(add(a,h));
   if(candidate.eligible&&!candidate.meets){witness=candidate;break;}
  }
  if(!witness)throw Error('反例の計算を確認できませんでした。');
 }
 const proposed=p.mode==='linear'?div(E,two):p.mode==='square'?(cmp(div(E,R(3)),one)<0?div(E,R(3)):one):p.mode==='hole'?E:null;
 const safe=proposed?Number(proposed.n*10000n/proposed.d)/10000:null;
 return {mode:p.mode,a:spec.a,L:num(limit),formula:spec.formula,epsilon:p.epsilon,delta:p.delta,bound:num(bound),exactBound:exact(bound),attained,holds,witness,point:p.witness&&witness?witness:point(R(p.x)),safe,pointValue,continuous:p.mode==='hole'?pointValue===2:p.mode!=='jump'};
};
L.register('epsilon-delta',p=>{const v=M.analyze(p),visual={type:'curriculum-board',kind:'table',headers:['対象','値・判定'],rows:[['関数',v.formula],['ε / δ',v.epsilon+' / '+v.delta],['誤差の上限',v.exactBound],['このε・δでの全範囲',v.holds?'条件を満たす':'反例がある'],['反例のx',v.witness?.exactX||'なし']]};return L.result([L.frame('一点の観察と範囲全体を分ける',v.holds?'このεとδでの判定です。極限の証明には、任意のεに応じてδを選べる理由が必要です。':'範囲内に条件を破る点があります。描画した点の多数決では判定しません。',visual)],{'範囲全体':v.holds?'成立':'不成立','誤差の上限':v.bound,'反例':v.witness?.exactX||'なし'});});
if(L.onDemand)return;
const title='ε–δで理解する極限と連続性',why='近づいて見えるグラフから一歩進み、指定された誤差を範囲全体で保証することを考えます。',idea='先に出力の許容誤差εを指定し、その後で入力の距離δを選びます。同じδの範囲内の全てのxに条件を要求します。',example='f(x)=2x+1、a=1、L=3で、ε=0.5に対してδを変えます。一点が条件を満たしても、範囲全体を保証したとは限りません。',observe='εだけを小さくしてδを保つと何が変わるかを確認します。二次関数ではδの選び方を、不等式の各行へ戻って読みます。',pitfall='有限個の点の観察は証明ではありません。0<|x−a|<δは中心と端点を含まず、極限値とf(a)も別のものです。';
const sections=[['ε（イプシロン）','出力と候補の極限値の間に許す正の誤差。','|f(x)−L|<ε'],['δ（デルタ）','入力をaへ近づける正の距離。εに応じて選び、各xの前に固定します。','0<|x−a|<δ'],['極限の定義','任意の正のεについて、全ての対象xで要求を満たす正のδが存在します。','∀ε>0 ∃δ>0 ∀x∈D'],['連続性','その点で定義され、極限値が関数値と一致することです。','lim f(x)=f(a)']];
L.sources['epsilon-openstax']={name:'OpenStax Calculus Volume 1 §2.5 — The Precise Definition of a Limit',url:'https://openstax.org/books/calculus-volume-1/pages/2-5-the-precise-definition-of-a-limit',detail:'極限の定義の参照。日本語の説明・図・操作・判定モデルは本サイトの独自教材です。'};
const range=(key,label,value,min,max,step)=>({key,label,type:'range',value,min,max,step});
L.add({id:'c03-epsilon-delta',engine:'epsilon-delta',title,unit:title,summary:idea,question:'どれだけ近づければ、指定された誤差をすべての点で守れる？',area:'C03',course:'数学・数学演習・解析学',level:2,minutes:25,presentation:'direct',keywords:['ε–δ','ε-δ','epsilon delta','イプシロンデルタ','極限','連続性','全称','存在','反例'],sources:['epsilon-openstax'],scope:'一次関数・x²・可除不連続・段差の四つの固定例。入力小数の有理数比較で範囲を判定し、反例を構成します。',limits:'操作範囲はε=0.01〜2、δ=0.0001〜2。任意の関数を自動証明するものではありません。グラフの描画と一般の証明は区別します。',controls:[{key:'mode',label:'関数',type:'select',value:'linear',options:Object.entries(M.specs).map(([value,s])=>({value,label:s.formula}))},range('epsilon','許す誤差 ε',.5,.01,2,.01),range('delta','近づける距離 δ',.4,.0001,2,.0001),range('x','調べる点 x',1.2,-2,3,.001),range('limit','段差で試す候補 L',.5,-.5,1.5,.01),{key:'pointValue',label:'穴の位置での関数値',type:'select',value:'undefined',options:[{value:'undefined',label:'未定義'},{value:'2',label:'2にする（連続）'},{value:'5',label:'5にする（不連続）'}]}],guide:[example,observe,pitfall],lesson:idea,reading:{why,idea,example,pitfall,focus:['epsilon','delta'],nextLabel:'条件を確かめる',terms:sections.map(([term,definition])=>({term,definition})),notes:'',sections},exploration:{label:'δを小さくして範囲全体を収める',patch:{delta:.2}},observe,challenge:{question:'δを選ぶ順番として正しいのは？',options:['εを受け取り、全ての対象xに使うδを選ぶ','各xを見てから、そのx専用のδを選ぶ','一点だけ調べてδを決めれば証明になる'],answer:0,explanation:'δはεに応じて選びます。そのδで範囲内の全てのxを扱うことが必要です。'},coverage:{status:'implemented-model',targets:sections.map(([name,description,formula])=>({name,description,formula})),notes:'独自の追加教材。既存GAP番号は変更しません。'}});
L.lessonDrafts['c03-epsilon-delta']={why,idea,example,pitfall};
L.additionalLabIds=['c03-epsilon-delta'];L.curriculum.coverage.units=L.labs.length;L.curriculum.coverage.additionalIds=L.additionalLabIds.slice();
for(const [term,definition]of sections)L.glossary.push({term,definition,lab:'c03-epsilon-delta'});
for(const course of L.courses)if(course.labs.includes('gap-004'))course.labs.push('c03-epsilon-delta');
})();
