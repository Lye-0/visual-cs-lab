/* Original interactive examples following the supplied lecture notes.
 * PDF pages are references, not public copies of the user's documents.
 * Every calculation is bounded, deterministic, and independent of playback.
 */
(() => {
'use strict';
const L=CSL, {frame:F,result:out,clone,register:R}=L;
const {range:N,select:S,toggle:B,text:T}=L.ctrl;
L.version='3.0.0';
L.legacyLabIds=L.labs.map(l=>l.id);
L.lessonDrafts={};
L.defineLessons=rows=>{for(const [id,why,idea,example,pitfall,notes='',focus=''] of rows){if(L.lessonDrafts[id])throw Error('解説が重複しています: '+id);L.lessonDrafts[id]={why,idea,example,pitfall,notes,focus};}};
L.sources.notesInfo={name:'提供された授業ノート「情報理論」',type:'提供資料',detail:'表紙を含むPDFのページ番号を各解説に記載。説明の順序、用語、図と式の結び付けを参考にしています。PDFそのものや講義スライドの複製は配布していません。入力例と可視化はこのサイト独自の教材です。'};
L.sources.notesIntro={name:'提供された授業ノート「計算機科学入門」',type:'提供資料',detail:'表紙を含むPDFのページ番号を各解説に記載。元のノートの全記載を再現するものではありません。数値・実装・範囲は教材側で明示し、ノートと異なる表記は区別します。'};
const number=n=>Number(n.toPrecision(7));
const entropy=p=>p.reduce((s,x)=>s+(x>0?-x*Math.log2(x):0),0);
function weights(s,count){const a=String(s).trim().split(/[\s,、]+/).filter(Boolean).map(Number);if(a.length!==count||a.some(x=>!Number.isFinite(x)||x<0)||a.reduce((s,x)=>s+x,0)<=0)throw Error(`0以上の重みを${count}個、カンマで入力してください。少なくとも1個は正にします。`);const sum=a.reduce((s,x)=>s+x,0);return a.map(x=>x/sum);}
function binary(s,min=1,max=32){s=String(s).trim();if(!new RegExp(`^[01]{${min},${max}}$`).test(s))throw Error(`0と1を${min===max?min:`${min}〜${max}`}桁で入力してください。`);return [...s].map(Number);}
const calc=(equation,terms=[],detail='')=>({type:'lesson-calculation',equation,terms,detail});
const term=(id,label,value,meaning)=>({id,label,value,meaning});
const unit=(id,area,title,question,summary,engine,controls,patch,notes,limits,opts={})=>{
 const l=L.add({id,area,title,unit:title,question,summary,intro:question,engine,variant:'',controls,track:'core',course:notes.startsWith('情報理論')?'情報理論':'計算機科学入門',scope:'授業ノートを参考にした独自の計算教材',limits,sources:[notes.startsWith('情報理論')?'notesInfo':'notesIntro','models'],guide:[summary,'例の計算を1段ずつ確かめ、対応する図や式の部分を選びます。','条件を変え、同じ規則で結果を説明してみましょう。'],lesson:summary,observe:opts.observe||summary,exploration:{label:opts.variantLabel||'別の条件で確かめる',patch},presentation:opts.direct?'direct':'sequence',challenge:{question:question,options:[summary,'入力を変えても途中の計算は確かめなくてよい'],answer:0,explanation:summary},...opts});
 l.notes=notes;return l;
};
L.teachingMath={entropy,weights,binary};
R('self-information',p=>{
 const probability=2**(-p.bits),information=-Math.log2(probability);
 const terms=[term('p','出来事の確率',probability,'起きる前の確率です。'),term('i','自己情報量',information+' bit','その出来事が起きたと知ったときの情報量です。')];
 return out([F('まず、出来事の起きにくさを見る',`起きる確率は1/${2**p.bits}です。「起きた」と聞いたときの驚きを、確率から数にします。`,calc(`p = 1 / ${2**p.bits}`,terms)),F('確率の逆数を取る','確率が半分になるごとに、逆数は2倍になります。',calc(`1 / p = ${2**p.bits}`,terms)),F('2を何回掛けた大きさかを読む','対数の底を2にすると単位はbitです。ここではI = log₂(1/p)を計算しています。',calc(`I = −log₂(${probability}) = ${information} bit`,terms))],{'確率':probability,'自己情報量 (bit)':information});
});
unit('c01-information','C01','自己情報量','めったにない出来事ほど、知ったときの情報量は大きい？','出来事の確率から、1回知ったときの情報量を求めます。','self-information',[N('bits','確率を1/2にする回数',3,0,10)],{bits:1},'情報理論 pp.3–4','底2・確率1/2ⁿに絞った導入例です。情報の有用性や個人的な価値を測るものではありません。',{variantLabel:'1/8と1/2を比べる'});
R('source-entropy',p=>{
 const probs=weights(p.weights,4),names=['A','B','C','D'];let sum=0;const frames=[];
 const picture=selected=>({type:'lesson-entropy',probabilities:probs,names,selected});
 frames.push(F('同じ4種類でも、出やすさが違う','重みを合計で割り、確率の合計を1にします。表の行を選ぶと、式の対応する項も強調されます。',picture(-1)));
 probs.forEach((q,i)=>{const info=q>0?-Math.log2(q):null,contribution=q>0?q*info:0;sum+=contribution;frames.push(F(`${names[i]}の情報量を、出やすさで重み付けする`,q>0?`確率 ${number(q)} × 情報量 ${number(info)} = ${number(contribution)} bit/記号。4行を足すと平均になります。`:'確率0の出来事は発生しません。平均への寄与を極限に従って0とし、自己情報量が0だとは扱いません。',picture(i),{'ここまでの和':number(sum)}));});
 frames.push(F('平均情報量 H を得る','自己情報量の単純平均ではありません。各出来事の確率を掛けてから足しています。',picture(-1),{'H (bit/記号)':number(sum)}));
 return out(frames,{'エントロピー (bit/記号)':number(sum),'4種類での最大値':2,'確率の合計':number(probs.reduce((s,x)=>s+x,0))});
});
unit('c01-entropy','C01','平均情報量・エントロピー','同じ4種類なら、いつでも同じ情報量になる？','自己情報量に出現確率を掛け、すべての出来事について足します。','source-entropy',[T('weights','A,B,C,Dの出やすさ','4,2,1,1','確率ではなく比でも入力できます。合計で割って確率にします。')],{weights:'1,1,1,1'},'情報理論 pp.3–4','4記号の独立な情報源の1記号当たりの量です。0 log₂0は0として計算します。',{variantLabel:'4種類を同じ確率にする',prereq:['c01-information']});
R('joint-information',p=>{
 const joint=weights(p.weights,4),px=[joint[0]+joint[1],joint[2]+joint[3]],py=[joint[0]+joint[2],joint[1]+joint[3]],hx=entropy(px),hy=entropy(py),hxy=entropy(joint),conditional=hxy-hy,mutual=hx+hy-hxy;
 const terms=[term('x','H(X)',number(hx),'Xだけを知る平均情報量'),term('y','H(Y)',number(hy),'Yだけを知る平均情報量'),term('xy','H(X,Y)',number(hxy),'2つを組として知る平均情報量'),term('cond','H(X|Y)',number(conditional),'Yを知っても残っているXの不確かさ'),term('mi','I(X;Y)',number(mutual),'Yを知ることで減るXの不確かさ')];
 return out([F('4つの組の確率を読む','行はX、列はYです。行和・列和から、それぞれ単独の確率を得ます。',{type:'grid',matrix:[[joint[0],joint[1]],[joint[2],joint[3]]]}, {},{headers:['X','Y','同時確率'],rows:joint.map((q,i)=>[Math.floor(i/2),i%2,number(q)])}),F('同時に知る量を計算','4つの組をそれぞれ1つの出来事として、エントロピーを計算します。',calc(`H(X,Y) = ${number(hxy)} bit`,terms)),F('Yを知った分を引く','H(X|Y) = H(X,Y) − H(Y)。図の重なりだけで証明したことにはせず、この式と同時確率を対応させます。',calc(`${number(hxy)} − ${number(hy)} = ${number(conditional)}`,terms)),F('相互情報量を求める','I(X;Y) = H(X) − H(X|Y)。YがXについてどれだけ教えてくれたかを読みます。',calc(`${number(hx)} − ${number(conditional)} = ${number(mutual)}`,terms))],{'H(X)':number(hx),'H(Y)':number(hy),'H(X,Y)':number(hxy),'H(X|Y)':number(conditional),'I(X;Y)':number(mutual)});
});
unit('c01-joint','C01','結合・条件付きエントロピーと相互情報量','片方を知ると、もう片方について何が分かる？','2変数の同時確率から、全体・残り・共有する情報量を順に求めます。','joint-information',[T('weights','(X,Y)=(0,0),(0,1),(1,0),(1,1)の重み','3,1,1,3')],{weights:'1,1,1,1'},'情報理論 pp.5–6','離散2値変数のみ。ベン図は証明として用いません。数値誤差は表示時に丸めます。',{variantLabel:'XとYが独立な分布にする',prereq:['c01-entropy']});
R('markov-source',p=>{
 const a=p.a/100,b=p.b/100,pi=[b/(a+b),a/(a+b)],local=[entropy([1-a,a]),entropy([b,1-b])],rate=pi[0]*local[0]+pi[1]*local[1];let v=[1,0];const frames=[F('どの状態から、どこへ進むか','行は現在、列は次の状態です。状態0から1へ行く確率がa、1から0へ行く確率がbです。',{type:'grid',matrix:[[1-a,a],[b,1-b]]})];
 for(let i=0;i<6;i++){v=[v[0]*(1-a)+v[1]*b,v[0]*a+v[1]*(1-b)];frames.push(F(`${i+1}回後の状態確率`,'状態の確率ベクトルに遷移確率行列を掛けます。これは1本のランダムな試行の軌跡ではなく、確率分布の更新です。',{type:'bars',values:v,labels:['状態0','状態1']}));}
 frames.push(F('定常確率で、各状態の情報量を重み付けする','π₀a = π₁b と π₀+π₁=1から定常確率を求めます。6回で必ず定常に達したと判断するのではなく、式で求めた値を使います。',calc(`H = ${number(pi[0])} × ${number(local[0])} + ${number(pi[1])} × ${number(local[1])} = ${number(rate)}`, [term('p0','π₀',number(pi[0]),'状態0にいる定常確率'),term('p1','π₁',number(pi[1]),'状態1にいる定常確率'),term('h0','H(状態0)',number(local[0]),'状態0から次へ進むときの情報量'),term('h1','H(状態1)',number(local[1]),'状態1から次へ進むときの情報量')])));
 return out(frames,{'定常確率0':number(pi[0]),'定常確率1':number(pi[1]),'エントロピー率':number(rate)});
});
unit('c01-markov','C01','マルコフ情報源・定常確率','前の状態を覚えている情報源では、何を平均する？','遷移の確率と、各状態にいる確率を区別してエントロピー率を求めます。','markov-source',[N('a','状態0→1の確率',30,5,95,5,'%'),N('b','状態1→0の確率',60,5,95,5,'%')],{a:50,b:50},'情報理論 pp.7–8','2状態・各遷移確率が0より大きい非周期的な例。一般のマルコフ連鎖や全てのエルゴード条件の判定ではありません。',{variantLabel:'次の状態が半々になる場合',prereq:['c01-entropy']});
R('binary-channel',p=>{
 const q=p.prior/100,e=p.error/100,y=q*(1-e)+(1-q)*e,hy=entropy([y,1-y]),noise=entropy([e,1-e]),mutual=hy-noise,capacity=1-noise;
 const terms=[term('q','P(X=1)',q,'情報源の確率。通信路の誤り率ではありません。'),term('e','ε',e,'0→1と1→0に共通の反転確率'),term('y','P(Y=1)',number(y),'送る確率と反転確率の両方で決まります。')];
 return out([F('入力の確率と、通信路を分ける','BSCでは0も1も同じ確率εで反転します。線に書かれた数は条件付き確率です。',{type:'lesson-channel',q,e}),F('受け取る1の確率を足し合わせる','1を送って反転しない場合と、0を送って反転する場合を足します。',calc(`P(Y=1) = ${q} × ${1-e} + ${1-q} × ${e} = ${number(y)}`,terms)),F('この情報源での伝送情報量を求める','I(X;Y) = H(Y) − h(ε)。この入力分布で伝わる量です。',calc(`I = ${number(hy)} − ${number(noise)} = ${number(mutual)} bit/記号`,terms)),F('入力分布を最適にした上限と区別する','通信路容量は入力の確率も選べるときの最大値です。このBSCでは入力が半々のときC=1−h(ε)です。',calc(`C = 1 − ${number(noise)} = ${number(capacity)} bit/記号`,terms))],{'伝送情報量 I':number(mutual),'通信路容量 C':number(capacity),'P(Y=1)':number(y)});
});
unit('c01-channel','C01','2元対称通信路・伝送情報量・通信路容量','通信路が同じでも、送る確率を変えると伝わる量は変わる？','情報源の分布と誤り率を分け、伝送情報量とその最大値を比較します。','binary-channel',[N('prior','1を送る確率',30,0,100,5,'%'),N('error','反転する確率 ε',10,0,50,5,'%')],{prior:50},'情報理論 pp.9–11','記憶のないBSC、1記号当たりの量。実回線のbpsや有限長符号の誤り率を保証しません。',{variantLabel:'0と1を半々に送る',prereq:['c01-joint']});
function parseCodes(s){const codes=String(s).trim().split(/[\s,、]+/).filter(Boolean);if(codes.length<2||codes.length>6||codes.some(x=>!/^[01]{1,8}$/.test(x))||new Set(codes).size!==codes.length)throw Error('重複のない符号語を2〜6個、各1〜8ビットで入力してください。');return codes;}
R('prefix-codes',p=>{
 const codes=parseCodes(p.codes),pairs=[];codes.forEach((a,i)=>codes.forEach((b,j)=>{if(i!==j&&b.startsWith(a))pairs.push([String.fromCharCode(65+i),a,String.fromCharCode(65+j),b]);}));
 const frames=[F('記号にビット列を割り当てる','符号語を途中で区切る目印は送らない条件を考えます。',{type:'cells',rows:codes.map((x,i)=>({label:String.fromCharCode(65+i),values:[x]}))}),F('他の符号語の先頭になっていないか調べる',pairs.length?'ある符号語が別の符号語の先頭です。この検査だけで「一意的復号不可能」とまでは言えません。':'どの符号語も別の符号語の先頭ではありません。記号を読み終えるたびに区切れる瞬時符号です。',{type:'lesson-code-tree',codes}, {},{headers:['記号','接頭辞','相手','符号語'],rows:pairs})];
 // A bounded witness search proves ambiguity when it finds TWO messages with one bit string.
 const seen=new Map();let witness=null;
 const visit=(bits,message,depth)=>{if(witness||depth===0)return;codes.forEach((code,i)=>{if(witness)return;const next=bits+code,word=message+String.fromCharCode(65+i);if(seen.has(next)&&seen.get(next)!==word){witness=[next,seen.get(next),word];return;}seen.set(next,word);visit(next,word,depth-1);});};visit('','',4);
 frames.push(F('一意的復号とは別に確認する',witness?`ビット列 ${witness[0]} は ${witness[1]} と ${witness[2]} の両方に復号できます。具体的な反例が見つかりました。`:pairs.length?'4記号までの探索では反例が見つかりません。この有限探索で、一意的復号可能だと証明したことにはしません。':'接頭辞条件を満たすので、一意的にも復号できます。',{type:'cells',rows:[{label:'瞬時復号',values:[pairs.length?'不可':'可能']},{label:'一意的復号',values:[witness?'反例あり':pairs.length?'この探索だけでは未判定':'可能']}]}));
 return out(frames,{'瞬時復号':pairs.length?'不可':'可能','接頭辞の組数':pairs.length,'一意的復号':witness?'反例あり':pairs.length?'未判定':'可能'});
});
unit('c01-prefix','C01','一意的復号・瞬時復号・符号木','区切りのないビット列を、いつ記号へ戻せる？','接頭辞の重なりと復号の曖昧さを、符号木と具体的な反例で区別します。','prefix-codes',[T('codes','A,B,C…の符号語','0,10,110,111')],{codes:'0,01,10'},'情報理論 pp.12–13','一意性の反例探索は長さ4記号までです。反例なしを一意的復号可能の証明としません。',{variantLabel:'接頭辞が重なる符号に変える'});
R('kraft',p=>{
 const lengths=String(p.lengths).split(/[\s,、]+/).filter(Boolean).map(Number);if(lengths.length<1||lengths.length>8||lengths.some(x=>!Number.isInteger(x)||x<1||x>8))throw Error('符号長を1〜8の整数で、1〜8個入力してください。');let sum=0;const frames=[];
 lengths.forEach((n,i)=>{sum+=2**(-n);frames.push(F(`長さ${n}の符号が使う枝の割合`,'二分木で深さnの葉は、全体の2⁻ⁿを使います。指定した長さが占める割合を足します。',calc(lengths.slice(0,i+1).map(x=>`2⁻${x}`).join(' + ')+` = ${number(sum)}`,lengths.map((n,j)=>term(String(j),`記号${j+1}の長さ`,n,`使う割合は1/${2**n}`)))));});
 frames.push(F(sum<=1?'指定の長さで瞬時符号を構成できる':'指定の長さでは瞬時符号を構成できない','2元符号ではΣ2⁻ˡ ≤ 1が、指定の長さを持つ瞬時符号の存在条件です。すでに与えられた符号語そのものが瞬時符号かは、別に接頭辞を調べます。',calc(`Σ2⁻ˡ = ${number(sum)} ${sum<=1?'≤':'>'} 1`)));
 return out(frames,{'Kraft和':number(sum),'瞬時符号の存在':sum<=1?'可能':'不可能'});
});
unit('c01-kraft','C01','クラフトの不等式','この符号長の組み合わせで、瞬時符号を作れる？','符号木が使う割合を足し、長さの組として実現可能かを調べます。','kraft',[T('lengths','各記号の符号長','1,2,3,3')],{lengths:'1,1,2'},'情報理論 p.14','2元の有限符号。符号語の選び方そのものを検査する機能とは区別します。',{variantLabel:'木に収まらない長さにする',prereq:['c01-prefix']});
R('shannon-fano',p=>{
 const probs=weights(p.weights,4),items=probs.map((q,i)=>({q,name:String.fromCharCode(65+i),code:''})).filter(x=>x.q>0).sort((a,b)=>b.q-a.q||a.name.localeCompare(b.name)),frames=[];
 function split(xs,prefix){if(xs.length===1){xs[0].code=prefix||'0';return;}const total=xs.reduce((s,x)=>s+x.q,0);let best=1,diff=Infinity,left=0;for(let i=1;i<xs.length;i++){left+=xs[i-1].q;const d=Math.abs(total-2*left);if(d<diff){diff=d;best=i;}}const a=xs.slice(0,best),b=xs.slice(best);frames.push(F(`${xs.map(x=>x.name).join('・')}を2つに分ける`,'確率の大きい順に並べ、両側の確率の和ができるだけ近い位置で分けます。同率なら先の境界を選ぶ規則です。',{type:'cells',rows:[{label:prefix+'0',values:a.map(x=>`${x.name}: ${number(x.q)}`)},{label:prefix+'1',values:b.map(x=>`${x.name}: ${number(x.q)}`)}]}));split(a,prefix+'0');split(b,prefix+'1');}
 split(items,'');const average=items.reduce((s,x)=>s+x.q*x.code.length,0);
 frames.push(F('通った枝を順に読む','Huffmanの「小さい2つをまとめる」操作と混同せず、こちらは全体を分けていく手順です。',{type:'lesson-code-tree',codes:items.map(x=>x.code),names:items.map(x=>x.name)}, {},{headers:['記号','確率','符号','長さ'],rows:items.map(x=>[x.name,number(x.q),x.code,x.code.length])}));return out(frames,{'平均符号長':number(average),'エントロピー':number(entropy(probs))});
});
unit('c01-shannon-fano','C01','シャノン・ファノの符号化','出やすさの和を半分に分けると、どんな符号木になる？','確率を大きい順に並べ、2つに分ける手順を繰り返します。','shannon-fano',[T('weights','A,B,C,Dの重み','4,2,1,1')],{weights:'3,3,2,2'},'情報理論 p.15','4記号まで。0の重みの記号は符号化対象外です。1種類だけのときは空符号を使わず0を割り当てます。',{variantLabel:'出現頻度の偏りを変える',prereq:['c01-entropy','c01-prefix']});
R('hamming-distance',p=>{
 const a=binary(p.a),b=binary(p.b);if(a.length!==b.length)throw Error('2つのビット列の長さをそろえてください。');const diff=a.map((x,i)=>x^b[i]),distance=diff.reduce((s,x)=>s+x,0);
 return out([F('同じ位置のビットを比べる','異なる位置だけに印を付けます。数値としての引き算ではありません。',{type:'lesson-distance',a,b,diff}),F('違っている位置の個数を数える','XORした結果の1を数えると、ハミング距離になります。',calc(`d(X,Y) = ${diff.join(' + ')} = ${distance}`))],{'ハミング距離':distance,'ビット数':a.length},'これは選んだ2語間の距離です。符号全体の最小距離や訂正可能数と同じだと考えないでください。');
});
unit('c01-distance','C01','ハミング距離','2つのビット列は、何か所違っている？','同じ位置どうしをXORし、1の個数を数えて距離を求めます。','hamming-distance',[T('a','ビット列X','1011010'),T('b','ビット列Y','1000010')],{b:'0011011'},'情報理論 pp.17–18','比較する2語の距離のみ。符号集合全体の最小距離の計算ではありません。',{variantLabel:'違う位置の数を変える'});
const H=[[1,1,1,0,1,0,0],[0,1,1,1,0,1,0],[1,1,0,1,0,0,1]];
const G=[[1,0,0,0,1,0,1],[0,1,0,0,1,1,1],[0,0,1,0,1,1,0],[0,0,0,1,0,1,1]];
const syndrome=r=>H.map(row=>row.reduce((s,x,i)=>s^(x&r[i]),0));
L.teachingMath.linearCode={G,H,syndrome};
R('linear-code',p=>{
 const info=binary(p.text,4,4),sent=G[0].map((_,j)=>info.reduce((s,x,i)=>s^(x&G[i][j]),0)),received=[...sent];if(p.flip)received[p.flip-1]^=1;
 const syn=syndrome(received),bad=H[0].map((_,j)=>H.map(row=>row[j]).join('')).indexOf(syn.join('')),corrected=[...received];if(bad>=0)corrected[bad]^=1;
 const picture=(phase,check=-1)=>({type:'lesson-linear',phase,info,sent,received,corrected,syndrome:syn,H,G,check});
 const frames=[F('情報ビットの後ろに検査ビットを置く','この単元はノートの情報4ビット＋検査3ビットの順です。別単元の「検査ビットを位置1,2,4に置く方式」と、そのまま位置番号を混ぜないでください。',picture('encode')),F('受信列だけで検査する','受信側の判定は、受け取った7ビットとHから計算します。反転位置の入力値を訂正位置として流用しません。',picture('receive'))];
 H.forEach((row,i)=>frames.push(F(`検査 s${i+1} を求める`,`${row.map((x,j)=>x?received[j]:null).filter(x=>x!==null).join(' ⊕ ')} = ${syn[i]}。行列の1のある列が検査対象です。`,picture('check',i))));
 frames.push(F('シンドロームとHの列を照合する',bad>=0?`検査結果 ${syn.join('')} と一致するのは第${bad+1}列です。1ビット誤りの条件では、その位置を反転します。`:'検査結果は000です。1ビット以下の誤りという今回の条件では変更しません。',picture('correct')));
 return out(frames,{'送信列':sent.join(''),'受信列':received.join(''),'シンドローム':syn.join(''),'訂正位置':bad<0?'なし':bad+1,'復元情報':corrected.slice(0,4).join('')});
});
unit('c01-linear-code','C01','生成行列・検査行列・シンドローム','検査の組み合わせから、なぜ誤りの位置が分かる？','情報ビット、検査式、行列の列、シンドロームを同じ図で対応させます。','linear-code',[T('text','情報4ビット','1011'),N('flip','反転する位置（0はなし）',2,0,7)],{flip:6},'情報理論 pp.20–23','ノートの情報ビット先頭の検査式を用いた(7,4)符号です。誤り0または1ビットのみ。2ビット以上の訂正を保証しません。',{variantLabel:'検査ビットの誤りに変える',prereq:['c01-distance','c01-hamming']});
R('subset-automaton',p=>{
 const input=String(p.input).trim();if(!/^[01]{0,20}$/.test(input))throw Error('0と1を20文字以内で入力してください。空文字も試せます。');
 const next=(set,ch)=>[...new Set(set.flatMap(q=>q===0?(ch==='0'?[0,1]:[0]):q===1&&ch==='1'?[2]:[]))].sort();
 let set=[0];const frames=[F('同時にあり得る状態を集合で持つ','この独自例は、末尾が01の文字列を受理します。q0からは0/1でq0へ戻り、0ではq1へも進めます。q1から1でq2です。',{type:'lesson-nfa',set,input,index:-1})];
 [...input].forEach((ch,i)=>{const before=[...set];set=next(set,ch);frames.push(F(`「${ch}」を読む：{${before.map(x=>'q'+x).join(',')}} → {${set.map(x=>'q'+x).join(',')}}`,'それぞれの可能な状態から移れる先を全部集めます。どれか1本を乱数で選ぶ操作ではありません。',{type:'lesson-nfa',set,input,index:i}));});
 frames.push(F('入力を最後まで読んでから受理を判定',set.includes(2)?'集合に受理状態q2が含まれます。受理する経路が少なくとも1つ存在します。':'集合にq2がありません。途中でq2に到達したことだけでは、残りの入力も含めて受理したことになりません。',{type:'lesson-nfa',set,input,index:input.length}));
 return out(frames,{'入力':input||'ε','集合状態':set.map(x=>'q'+x).join(', '),'受理':set.includes(2)?'はい':'いいえ'});
});
unit('c02-nfa','C02','NFAからDFAへ・集合状態','複数の経路を、1つの状態としてどう表す？','同時にあり得る状態を集合にまとめ、入力ごとに更新します。','subset-automaton',[T('input','入力する文字列','0101')],{input:'0100'},'計算機科学入門 pp.18–20','ノートとは別の3状態の固定例です。任意のNFAを変換するエディターではありません。ε遷移は含みません。',{variantLabel:'最後の1文字だけ変える',prereq:['c02-dfa']});
R('nand-construction',p=>{
 const a=+p.a,b=+p.b,nand=(x,y)=>1-(x&y),na=nand(a,a),nb=nand(b,b),ab=nand(a,b),value=p.gate==='NOT'?na:p.gate==='AND'?nand(ab,ab):p.gate==='OR'?nand(na,nb):nand(nand(a,ab),nand(b,ab));
 const equations={NOT:`A NAND A = ${na}`,AND:`(A NAND B) NAND (A NAND B) = ${value}`,OR:`(A NAND A) NAND (B NAND B) = ${value}`,XOR:`t = A NAND B = ${ab}; (A NAND t) NAND (B NAND t) = ${value}`};
 return out([F('NANDはANDの結果を反転する','0と1の入力を、NANDだけで組み合わせます。同じ線を両方の入力へ入れるとNOTになります。',{type:'gate',gate:'NAND',a,b,output:ab}),F(`${p.gate}の式をNANDだけで作る`,'式の括弧の内側から計算します。入力を切り替えて、目的の真理値表と一致するか確かめてください。',calc(equations[p.gate],[term('a','A',a,'元の入力'),term('b','B',b,p.gate==='NOT'?'NOTでは使いません':'元の入力'),term('t','A NAND B',ab,'中間の値'),term('y','出力',value,`${p.gate}の結果`)]))],{'出力':value,'目的のゲート':p.gate});
});
unit('c08-nand','C08','NANDだけで論理ゲートを作る','同じ種類の部品だけで、NOT・AND・OR・XORを作れる？','二重否定と中間の値を使い、NANDの式を内側から計算します。','nand-construction',[S('gate','作りたいゲート','OR',['NOT','AND','OR','XOR']),B('a','入力A',true),B('b','入力B',false)],{gate:'XOR',b:true},'計算機科学入門 p.8','論理値の計算のみ。伝搬遅延や物理回路のハザードは再現しません。',{variantLabel:'XORで両方の入力を1にする',prereq:['c08-gate']});
R('load-register',p=>{
 const inputs=binary(p.inputs,1,16),loads=binary(p.loads,inputs.length,inputs.length);let q=+p.initial;const frames=[F('クロックが来る前の値','出力Qは前の値を保持しています。入力Dが変わった瞬間に、必ずQも変わるわけではありません。',{type:'lesson-register',q,d:inputs[0],load:loads[0],clock:0,rows:[]})],rows=[];
 inputs.forEach((d,i)=>{const before=q,selected=loads[i]?d:q;frames.push(F(`クロック${i+1}の前：Muxで選ぶ`,loads[i]?'load=1なので、新しい入力を選びます。':'load=0なので、自分が保持しているQを選び直します。',{type:'lesson-register',q,d,load:loads[i],clock:0,selected,rows:clone(rows)}));q=selected;rows.push([i+1,d,loads[i],before,q]);frames.push(F(`立上り${i+1}：Qを更新する`,'DFFは選ばれた値を、このクロックの立上りで保持します。load=0でもクロック自体を消しているわけではありません。',{type:'lesson-register',q,d,load:loads[i],clock:1,selected,rows:clone(rows)}));});
 return out(frames,{'最後のQ':q,'クロック回数':inputs.length});
});
unit('c08-register','C08','DFF・Mux・レジスタ','新しい値を覚える時と、前の値を保つ時をどう選ぶ？','Muxが選ぶ値と、DFFが値を取り込むタイミングを分けて操作します。','load-register',[T('inputs','各クロックの入力D','1011'),T('loads','各クロックのload','1101'),B('initial','最初のQを1にする',false)],{loads:'0000'},'計算機科学入門 pp.14–16','1ビット、立上りトリガーの理想DFF。セットアップ時間・保持時間・メタステーブルは対象外です。',{variantLabel:'loadをすべて0にする',prereq:['c08-gate']});
R('process-addresses',p=>{
 const page=Math.floor(p.address/16),offset=p.address%16,tables={A:[1,3],B:[2,0]},frame=tables[p.process][page],physical=frame*16+offset;
 return out([F('アプリから見える住所を選ぶ','アプリAとBはどちらも0〜31の仮想アドレスを使えます。この例では別々のページ表を持ちます。',{type:'lesson-addresses',process:p.process,page,offset,physical,phase:0,tables}),F('ページ表で物理フレームを選ぶ',`${p.process}の仮想ページ${page}は物理フレーム${frame}へ対応します。同じ仮想ページ番号でも、別のアプリなら違う表を使います。`,{type:'lesson-addresses',process:p.process,page,offset,physical,phase:1,tables}),F('ページ内の位置はそのまま足す',`物理アドレス = ${frame} × 16 + ${offset} = ${physical}。この例では2つのアプリのフレームを共有していません。`,{type:'lesson-addresses',process:p.process,page,offset,physical,phase:2,tables})],{'プロセス':p.process,'仮想アドレス':p.address,'ページ内の位置':offset,'物理アドレス':physical});
});
unit('c10-address-spaces','C10','アプリごとの仮想アドレス空間','2つのアプリが同じ住所を使っても、なぜ混ざらない？','アプリごとのページ表から、実際に使う物理メモリの場所をたどります。','process-addresses',[S('process','操作するアプリ','A',['A','B']),N('address','アプリから見えるアドレス',5,0,31)],{process:'B'},'計算機科学入門 p.35','ノートを参考にした小さな独自配置。各アプリ2ページ・1ページ16B。共有メモリ・スワップ・権限・多段表はこの導入では省略します。',{variantLabel:'同じ住所をアプリBから見る',prereq:['c10-pointer']});
})();
