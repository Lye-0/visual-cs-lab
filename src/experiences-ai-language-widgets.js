/* Corresponding words, counts, arcs and weights remain visible together. */
(() => {
'use strict';
const L=CSL,X=L.experiences,A=X.aiDesk,h=L.h,f=X.format;
if(typeof document==='undefined')return;
const {b,p,box,table,rawTable:raw}=A.ui;
X.registerWidget('segmentation-desk',(root,a,c)=>A.mount(root,c,{
 start:A.segmentStart,reduce:A.segment,
 instruction:'文字の間のボタンで区切りを入れます。「通信」を「通｜信」にすると、語の費用だけでなく品詞のつながりの費用も変わることを確かめてください。',
 action:(code,fields)=>{const [kind,value]=code.split(':');return kind==='cut'?{kind,index:Number(value)}:kind==='dictionary'?{kind,value:fields.get('dictionary')}:{kind};},
 render:(s,{field})=>{
  const v=A.segmentView(s);
  return box('どこまでを一語とするか',`<div class="ex-ai-sentence">${v.chars.map((ch,i)=>'<span class="ai-character">'+h(ch)+'</span>'+(i<v.chars.length-1?b(s.cuts.includes(i+1)?'｜':'・','cut:'+(i+1),`class="ai-cut" aria-label="文字${i+1}と${i+2}の間の区切り" aria-pressed="${s.cuts.includes(i+1)}"`):'')).join('')}</div>`)+`<div class="ex-ai-two">${box('自分の分割：'+v.words.join('｜'),v.manual?table(['語','品詞','語の費用','前からの遷移費用','累積'],v.manual.path.map(r=>[r.word,r.pos,r.cost,r.transition,r.cumulative]))+p('合計 '+v.manual.cost+'。同じ区切りでも品詞が複数ある場合は、最小費用の組を表示します。'):p('この区切りには辞書にない複数文字の語があります。未知語の候補は1文字だけ、費用8です。'))}${box('全ての候補から計算した最小の道',table(['語','品詞','語の費用','前からの遷移費用'],v.best.tokens.map(r=>[r.word,r.pos,r.cost,r.transition]))+p(v.best.words.join('｜')+'：合計 '+v.best.cost)+p(v.equal?'自分の分割も最小費用です。同点の別の分割があり得ます。':'語を局所的に選ぶだけでなく、文全体のつながりを含めて比較します。'))}</div><div class="ex-actions">${b('品詞の費用：'+(s.context?'あり':'なし'),'context',`aria-pressed="${s.context}"`)}</div><form class="ex-ai-form">${field('dictionary','小さな辞書：語 品詞 非負の費用',s.dictionary,{type:'textarea',maxLength:2000})}${b('辞書を変更する','dictionary')}</form>`+p('この費用は説明用の手作りです。最小費用の分割が、常に正しい日本語の分割とは限りません。辞書から「通信」の行を除いたときも、置いた区切りは勝手に変更しません。');
 }
}));
const wordControls=(s,field)=>`<form class="ex-ai-form">${field('query','問い合わせる文',s.query)}${b('この文で調べる','query')}</form>`;
X.registerWidget('word-vector-desk',(root,a,c)=>A.mount(root,c,{
 start:A.wordsStart,reduce:A.words,
 instruction:'語を選ぶと、元の文書の出現数とidfが対応します。文書を選び、問い合わせのベクトルとの内積を、単語ごとの積として読んでください。',
 action:(code,fields)=>{const [kind,value]=code.split(':');return kind==='query'?{kind,value:fields.get('query')}:kind==='document'?{kind,index:Number(value)}:{kind,value};},
 render:(s,{field})=>{
  const v=A.wordsView(s),j=v.index,df=v.model.counts.filter(row=>row[j]>0).length;
  return wordControls(s,field)+box('同じ語彙のどの成分を見るか',`<div class="ex-actions">${v.model.vocabulary.map(word=>b(word,'word:'+word,`aria-pressed="${word===s.word}"`)).join('')}</div>`)+`<div class="ex-ai-two">${box('「'+s.word+'」を元の文書で数える',raw(['文書を選択','原文','出現数tf','tf×idf'],s.documents.map((doc,i)=>[b('文書'+(i+1),'document:'+i,`aria-pressed="${s.document===i}"`),h(doc),h(v.model.counts[i][j]),h(f(v.model.vectors[i][j]))]))+p('df='+df+'、N=4。idf = ln((4+1)/('+df+'+1))+1 = '+f(v.model.idf[j])))}${box('選んだ文書との方向の近さ',p('文書'+(s.document+1)+'：'+s.documents[s.document])+p('内積 = 単語ごとの積の和 = '+f(v.dot))+p('長さ：問い合わせ '+f(v.qnorm)+'、文書 '+f(v.dnorm))+p(v.cosine===null?'既知語のないゼロベクトルでは、cosineの方向比較を定義できません。値0の実装上の扱いとは分けて示します。':'cosine = '+f(v.dot)+' / ('+f(v.qnorm)+' × '+f(v.dnorm)+') = '+f(v.cosine)))}</div>`+box('どの語が内積へ寄与したか',table(['語','問い合わせTF-IDF','文書TF-IDF','積'],v.terms.map(t=>[t.word,f(t.query),f(t.document),f(t.product)])))+p(v.unknown.length?'問い合わせにだけある語：'+v.unknown.join(', ')+'。学習語彙へ追加せず、ベクトルの外に残します。':'問い合わせの語は、学習語彙の中にあります。')+p('この表現は基本的に語順を保存しません。「network protects data」と「data protects network」で同じ値になる限界も試してください。');
 }
}));
X.registerWidget('dependency-desk',(root,a,c)=>A.mount(root,c,{
 start:A.dependencyStart,reduce:A.dependency,
 instruction:'SHIFTを2回押し、Iとseeがstackに並んだらLEFTを選びます。headから従属する語へ矢印を付け、最後にROOTだけがstackに残るように操作してください。',
 action:(kind,fields)=>kind==='shift'?{kind}:{kind,label:fields.get('label')},
 render:(s,{field})=>{
  const positions=[55,200,345,490],diagram=`<svg class="ex-ai-dependencies" viewBox="0 0 550 245" role="img"><title>headからdependentへ向かう係り受け。下の表にも全ての関係を記します。</title>${s.arcs.map((edge,i)=>{const x=positions[edge.head],y=positions[edge.dependent],height=30+Math.abs(edge.head-edge.dependent)*24;return `<path class="ai-wire selected" d="M${x},185 C${x},${185-height*2} ${y},${185-height*2} ${y},177"/><path class="ai-arrow" d="M${y-5},168 L${y},177 L${y+5},168"/><text x="${(x+y)/2}" y="${180-height*1.6}" text-anchor="middle">${h(edge.label)}</text>`;}).join('')}${s.words.map((word,i)=>`<rect x="${positions[i]-33}" y="185" width="66" height="34" rx="5" class="ai-node"/><text x="${positions[i]}" y="207" text-anchor="middle">${h(word)}</text>`).join('')}</svg>`;
  return `<div class="ex-ai-two">${box('stack：右端が上',`<div class="ex-ai-tokens">${s.stack.map(id=>'<span>'+h(s.words[id])+'</span>').join('')}</div>`)}${box('buffer：左端から読む',`<div class="ex-ai-tokens">${s.buffer.map(id=>'<span>'+h(s.words[id])+'</span>').join('')||p('空になりました')}</div>`)}</div><form class="ex-ai-form">${field('label','付ける関係の名前','nsubj',{choices:[['nsubj','nsubj：主語'],['obj','obj：目的語'],['root','root：ROOTから'],['dep','dep：一般の関係']]})}</form><div class="ex-actions">${b('SHIFT：次の語をstackへ','shift')}${b('LEFT：右の語 → 左の語','left')}${b('RIGHT：左の語 → 右の語','right')}</div>`+box('今までに自分で作った辺',diagram+table(['head','dependent','関係'],s.arcs.map(e=>[s.words[e.head],s.words[e.dependent],e.label])))+p(!s.buffer.length&&s.stack.length===1?'構造の組立てが完了しました。これは遷移の前提と木の形を満たすという意味で、文法上の正解を自動判定したのではありません。':'LEFT/RIGHTでは辺を付けたdependentをstackから外します。ROOTを結ぶのは最後です。')+p('この教材は一つの根を持つarc-standardの小例です。HMMで品詞の系列を推定する課題とは、選ぶ対象も構造も異なります。');
 }
}));
X.registerWidget('attention-desk',(root,a,c)=>A.mount(root,c,{
 start:A.attentionStart,reduce:A.attention,
 instruction:'位置Bを選び、Valueだけを変えてください。重みは同じでも出力は変わります。次にKeyやQueryを変え、何を比較する値と何を混ぜる値なのかを分けて確かめます。',
 action:(code,fields)=>{const [kind,value]=code.split(':');if(kind==='select')return {kind,index:Number(value),fresh:true};if(kind==='mask')return {kind};return {kind,vector:[fields.get(kind+'0'),fields.get(kind+'1')]};},
 render:(s,{field})=>{
  const v=A.attentionView(s),row=s.selected,vectorFields=(key,label,values)=>`<form class="ex-ai-form">${values.map((value,i)=>field(key+i,label+' 成分'+(i+1),value,{min:-8,max:8,step:'any'})).join('')}${b(label+'を変更',key)}</form>`;
  return `<div class="ex-ai-split-labels"><span>Q：比較に使う問い合わせ</span><span>K：参照先と比較する値</span><span>V：出力へ混ぜる値</span></div>`+box('問い合わせQ：最初の位置から見る',vectorFields('query','Query',s.query))+`<div class="ex-actions">${b('位置Aを編集','select:0',`aria-pressed="${row===0}"`)}${b('位置Bを編集','select:1',`aria-pressed="${row===1}"`)}${b('未来Bのmask：'+(s.causal?'あり':'なし'),'mask',`aria-pressed="${s.causal}"`)}</div><div class="ex-ai-two">${box('選択中の位置'+['A','B'][row]+'のKey',vectorFields('key','Key',s.keys[row]))}${box('同じ位置のValue',vectorFields('value','Value',s.values[row]))}</div>`+box('内積 → 重み → 重み付き和',table(['参照位置','Q・K / √2','softmaxの重み','Value','重み×Value'],s.keys.map((key,i)=>[['A','B'][i],s.causal&&i===1?'mask（使わない）':f(v.scores[i]),f(v.weights[i]),s.values[i].map(x=>f(x)).join(', '),v.contributions[i].map(x=>f(x)).join(', ')]))+p('出力 = ['+v.contributions[0].map((x,j)=>f(x)+' + '+f(v.contributions[1][j])).join(', ')+'] = ['+v.output.map(x=>f(x)).join(', ')+']'))+p('scoreはQとKの内積を√2で割ります。使えるscoreだけでsoftmaxを取り、重みの合計を1にします。maskされた位置の重みは0で、Valueを出力へ加えません。')+p('ここはQ・K・Vを直接与える2位置・2成分の例です。重みから「人間が理由として注目した」とは断定しません。入力からの射影・複数head・位置情報は次の章で扱います。');
 }
}));
X.registerWidget('classification-evidence',(root,a,c)=>A.mount(root,c,{
 start:A.evaluationStart,reduce:A.evaluation,
 instruction:'混同行列の「正解food・予測net」を押します。数1の元になった文を確認し、文だけを直した場合と、正解labelを変えた場合の意味を比較してください。',
 action:(code,fields)=>{const [kind,x,y]=code.split(':');if(kind==='select')return {kind,index:Number(x),fresh:true};if(kind==='cell')return {kind,value:x==='all'?null:[x,y]};return {kind:'edit',text:fields.get('text'),label:fields.get('gold')};},
 render:(s,{field})=>{
  const v=A.evaluationView(s),row=s.test[s.selected],labels=['net','food'];
  return box('学習した4文：評価文を直しても変更しない',table(['label','学習文'],s.training.map(r=>[r.label,r.text])))+`<div class="ex-ai-two">${box('行が正解、列が予測',raw(['正解＼予測','net','food'],labels.map((gold,i)=>[h(gold),...labels.map((pred,j)=>b(String(v.matrix[i][j]),'cell:'+gold+':'+pred,`aria-label="正解${gold} 予測${pred} ${v.matrix[i][j]}件" aria-pressed="${s.cell?.[0]===gold&&s.cell?.[1]===pred}"`))]))+b('全ての例を見る','cell:all'))}${box('数えた分母まで見る',table(['class','一致TP','このclassと予測','実際にこのclass','precision','recall'],v.scores.map(r=>[r.label,r.tp,r.predicted,r.actual,r.precision===null?'分母0':f(r.precision),r.recall===null?'分母0':f(r.recall)])))}</div>`+box('セルを支える実際の例',raw(['編集する行','文','正解','予測'],v.filtered.map(r=>[b('評価文'+(r.id+1),'select:'+r.id,`aria-pressed="${s.selected===r.id}"`),h(r.text),h(r.gold),h(r.predicted)])))+box('評価文'+(s.selected+1)+'を変更',`<form class="ex-ai-form">${field('text','評価する文',row.text)}${field('gold','この課題での正解label',row.label,{choices:['net','food']})}${b('評価文だけを変更','edit')}</form>`)+p('予測は小さなMultinomial Naive Bayesで実計算しています。正解labelの変更は分類器の改善ではなく、何を正しいと数えるかの変更です。この4文の値を実サービスの性能とは扱いません。');
 }
}));
X.registerWidget('retrieval-evidence',(root,a,c)=>A.mount(root,c,{
 start:A.wordsStart,reduce:A.words,
 instruction:'返す件数kを変え、上位のどの文書が正解関連文書かを確認します。正解関連の指定だけを変えても、検索器が計算した順位は変わらないことを比べてください。',
 action:(code,fields)=>{const [kind,value]=code.split(':');return kind==='query'?{kind,value:fields.get('query')}:kind==='k'?{kind,value:fields.get('k')}:{kind:'relevance',index:Number(value)};},
 render:(s,{field})=>{
  const v=A.wordsView(s);
  return wordControls(s,field)+`<form class="ex-ai-form">${field('k','上位から返す件数k',s.k,{min:1,max:4})}${b('この件数で集計','k')}</form>`+box('正解関連という仮定を選ぶ',`<div class="ex-actions">${s.documents.map((doc,i)=>b('文書'+(i+1)+'：'+(s.relevant.includes(i)?'関連':'非関連'),'relevance:'+i,`aria-pressed="${s.relevant.includes(i)}"`)).join('')}</div>`)+box('順位と、その位置までのprecision',table(['順位','文書','原文','cosine','正解関連','上位kに含む','ここまでのprecision'],v.ranked.map(r=>[r.rank,r.id+1,s.documents[r.id],f(r.score),r.relevant?'関連':'非関連',r.rank<=s.k?'返す':'範囲外',f(r.precision)])))+box('異なる問いを、異なる分母で読む',p('P@'+s.k+' = 返した中の関連数 / '+s.k+' = '+f(v.precision))+p('R@'+s.k+' = 返した関連数 / 全関連数 = '+(v.recall===null?'正解関連が0なので未定義':f(v.recall)))+p('AP = 関連文書が現れた順位のprecisionの和 / 全関連数 = '+(v.ap===null?'正解関連が0なので未定義':f(v.ap))))+p('同点は文書番号で順序を固定します。未知語だけの場合は実装上の得点0で並ぶため、その順位を意味の近さの証拠にはしません。');
 }
}));
})();
