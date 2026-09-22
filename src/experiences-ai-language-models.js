/* NLP workspaces use small explicit dictionaries, numbers and labels.
 * They do not claim a generated segmentation/attention score is human truth. */
(() => {
'use strict';
const L=CSL,X=L.experiences,K=L.curriculum,A=X.aiDesk;
const {integer:int,number:num,choice,begin,note}=A;
A.segmentStart=()=>({sentence:'私は通信を学ぶ',dictionary:L.labs.find(l=>l.id==='gap-128').defaults.dictionary,cuts:[1,2,4,5],context:true,log:[]});
A.segmentView=s=>{
 const chars=Array.from(s.sentence),ends=[0,...s.cuts.slice().sort((a,b)=>a-b),chars.length],words=ends.slice(1).map((end,i)=>chars.slice(ends[i],end).join(''));
 const dictionary=s.dictionary.split('\n').filter(x=>x.trim()).map(line=>{const [word,pos,cost]=line.trim().split(/\s+/);return {word,pos,cost:Number(cost)};});
 const transition=(a,b)=>!s.context?0:a==='NOUN'&&b==='NOUN'?3:a==='PRT'&&b==='PRT'?4:a==='VERB'&&b==='VERB'?3:0;
 let states=[{pos:'START',cost:0,path:[]}];
 for(const word of words){
  const entries=dictionary.filter(e=>e.word===word).concat(Array.from(word).length===1?[{word,pos:'UNK',cost:8}]:[]),next=new Map();
  for(const previous of states)for(const e of entries){const tc=transition(previous.pos,e.pos),cost=previous.cost+e.cost+tc,old=next.get(e.pos);if(!old||cost<old.cost)next.set(e.pos,{pos:e.pos,cost,path:[...previous.path,{...e,transition:tc,cumulative:cost}]});}
  states=[...next.values()];
 }
 const manual=states.sort((a,b)=>a.cost-b.cost)[0]||null,best=K.segmentJapanese(s.sentence,s.dictionary,8,s.context);
 return {chars,words,manual,best:{words:best.tokens.map(t=>t.word),cost:best.cost,tokens:best.tokens},equal:manual!==null&&Math.abs(manual.cost-best.cost)<1e-9};
};
A.segment=(input,a)=>{
 const s=begin(input);
 if(a.kind==='cut'){const i=int(a.index,1,Array.from(s.sentence).length-1,'境界');s.cuts=s.cuts.includes(i)?s.cuts.filter(v=>v!==i):[...s.cuts,i].sort((a,b)=>a-b);return note(s,'区切りを変更しました。候補にない複数文字の語は、この辞書では一語として読めません。');}
 if(a.kind==='context'){s.context=!s.context;return note(s,'品詞のつながりの費用を'+(s.context?'加えます。':'外します。')+'語の費用とは別の項です。');}
 if(a.kind==='dictionary'){
  if(typeof a.value!=='string'||a.value.length>2000)throw Error('辞書は2000文字以下です。');K.segmentJapanese(s.sentence,a.value,8,s.context);s.dictionary=a.value;return note(s,'辞書を変更。手で置いた区切りは残し、同じ分割がまだ候補になるか調べます。');
 }
 throw Error('未定義の分割操作です。');
};
A.wordsStart=()=>({documents:['network security protects data','network routing sends packets','secure software protects data','food and music are enjoyable'],query:'network protects data',word:'network',document:0,k:2,relevant:[0,1],log:[]});
A.wordsView=s=>{
 const model=K.documentVectors(s.documents),query=model.query(s.query),index=model.vocabulary.indexOf(s.word),scores=model.vectors.map((v,i)=>({id:i,score:K.cosine(query,v)})).sort((a,b)=>b.score-a.score||a.id-b.id),unknown=K.tokenizeWords(s.query).filter(w=>!model.vocabulary.includes(w));
 const terms=model.vocabulary.map((word,j)=>({word,query:query[j],document:model.vectors[s.document][j],product:query[j]*model.vectors[s.document][j]}));
 const qnorm=Math.hypot(...query),dnorm=Math.hypot(...model.vectors[s.document]),dot=terms.reduce((n,t)=>n+t.product,0);
 let hit=0,ap=0;const ranked=scores.map((row,i)=>{const relevant=s.relevant.includes(row.id);if(relevant){hit++;ap+=hit/(i+1);}return {...row,rank:i+1,relevant,precision:hit/(i+1)};});
 const top=ranked.slice(0,s.k),hits=top.filter(x=>x.relevant).length;
 return {model,query,index,terms,qnorm,dnorm,dot,cosine:qnorm&&dnorm?dot/(qnorm*dnorm):null,unknown,ranked,precision:hits/s.k,recall:s.relevant.length?hits/s.relevant.length:null,ap:s.relevant.length?ap/s.relevant.length:null};
};
A.words=(input,a)=>{
 const s=begin(input);
 if(a.kind==='word')s.word=choice(a.value,K.documentVectors(s.documents).vocabulary,'語');
 else if(a.kind==='document')s.document=int(a.index,0,s.documents.length-1,'文書');
 else if(a.kind==='query'){if(typeof a.value!=='string'||a.value.length>160)throw Error('検索文は160文字以内です。');s.query=a.value;}
 else if(a.kind==='k')s.k=int(a.value,1,s.documents.length,'件数k');
 else if(a.kind==='relevance'){const i=int(a.index,0,s.documents.length-1);s.relevant=s.relevant.includes(i)?s.relevant.filter(x=>x!==i):[...s.relevant,i].sort();}
 else throw Error('未定義の文書操作です。');
 return note(s,a.kind==='relevance'?'正解関連文書の仮定を変更しました。検索器の得点は変更していません。':'同じ文書集合から作った語彙とidfで照合しています。未知の語を勝手に学習語彙へ足しません。');
};
A.dependencyStart=()=>({words:['ROOT','I','see','birds'],stack:[0],buffer:[1,2,3],arcs:[],log:[]});
A.dependency=(input,a)=>{
 const s=begin(input);choice(a.kind,['shift','left','right']);
 if(a.kind==='shift'){if(!s.buffer.length)throw Error('bufferは空です。');s.stack.push(s.buffer.shift());return note(s,'bufferの先頭をstackへ移動。まだ係り先を付けていません。');}
 if(s.stack.length<2)throw Error('stackの二つの語が必要です。');
 const top=s.stack.at(-1),second=s.stack.at(-2),head=a.kind==='left'?top:second,dependent=a.kind==='left'?second:top;
 if(dependent===0)throw Error('ROOTを他の語の従属先にしません。');
 if(head===0&&(s.buffer.length||s.stack.length!==2))throw Error('ROOTへ結ぶのは、他の語を結び終えた最後だけです。');
 if(s.arcs.some(e=>e.dependent===dependent))throw Error('この語は既に係り先を持ちます。');
 const label=choice(a.label,['nsubj','obj','root','dep'],'ラベル');if((head===0)!==(label==='root'))throw Error('rootラベルはROOTからの辺にだけ使います。');
 s.arcs.push({head,dependent,label});s.stack.splice(a.kind==='left'?-2:-1,1);
 return note(s,s.words[head]+' → '+s.words[dependent]+' を '+label+' で接続。従属する語をstackから外しました。');
};
A.attentionStart=()=>({query:[1,0],keys:[[1,0],[0,1]],values:[[2,0],[0,4]],selected:0,causal:false,log:[]});
A.attentionView=s=>{
 const scores=s.keys.map(k=>(s.query[0]*k[0]+s.query[1]*k[1])/Math.sqrt(2)),max=s.causal?scores[0]:Math.max(...scores),exp=scores.map((v,i)=>s.causal&&i>0?0:Math.exp(v-max)),den=exp[0]+exp[1],weights=exp.map(x=>x/den),contributions=s.values.map((v,i)=>v.map(x=>x*weights[i])),output=[0,1].map(j=>contributions[0][j]+contributions[1][j]);
 return {scores,weights,contributions,output};
};
A.attention=(input,a)=>{
 const s=begin(input);
 if(a.kind==='select'){s.selected=int(a.index,0,1);return s;}
 if(a.kind==='mask'){s.causal=!s.causal;return note(s,'最初の位置からの問い合わせとして、後ろの位置Bを'+(s.causal?'参照しない':'参照できる')+'条件にしました。');}
 if(['query','key','value'].includes(a.kind)){
  if(!Array.isArray(a.vector)||a.vector.length!==2)throw Error('2成分を指定してください。');const vector=a.vector.map(v=>num(v,-8,8));
  if(a.kind==='query')s.query=vector;else s[a.kind==='key'?'keys':'values'][s.selected]=vector;
  return note(s,a.kind==='value'?'Valueだけを変更。QとKが同じなので重みは変わらず、混ぜた結果が変わります。':'QまたはKを変更。内積、softmaxの重み、Valueの混合を対応させます。');
 }
 throw Error('未定義のAttention操作です。');
};
A.evaluationStart=()=>({training:[{label:'net',text:'network routes packets'},{label:'net',text:'secure network protects data'},{label:'food',text:'fresh fruit tastes good'},{label:'food',text:'food and fruit are enjoyable'}],test:[{label:'net',text:'network packets'},{label:'food',text:'fresh fruit'},{label:'net',text:'secure data'},{label:'food',text:'network data'}],selected:3,cell:null,log:[]});
A.evaluationView=s=>{
 const model=K.naiveBayes(s.training),rows=s.test.map((row,i)=>({...row,id:i,...model.predict(row.text)}));
 // Keep ground truth separate: model.predict also returns a property 'label'.
 const evaluated=rows.map((row,i)=>({...row,gold:s.test[i].label,predicted:row.label})),labels=['net','food'],matrix=labels.map(gold=>labels.map(pred=>evaluated.filter(r=>r.gold===gold&&r.predicted===pred).length));
 const scores=labels.map((label,j)=>{const tp=matrix[j][j],predicted=matrix.reduce((n,r)=>n+r[j],0),actual=matrix[j].reduce((n,v)=>n+v,0);return {label,tp,predicted,actual,precision:predicted?tp/predicted:null,recall:actual?tp/actual:null};});
 return {rows:evaluated,matrix,scores,filtered:s.cell?evaluated.filter(r=>r.gold===s.cell[0]&&r.predicted===s.cell[1]):evaluated};
};
A.evaluation=(input,a)=>{
 const s=begin(input);
 if(a.kind==='select'){s.selected=int(a.index,0,s.test.length-1);return s;}
 if(a.kind==='cell'){if(a.value===null)s.cell=null;else{if(!Array.isArray(a.value)||a.value.length!==2)throw Error('正解と予測を指定してください。');s.cell=a.value.map(v=>choice(v,['net','food']));}return s;}
 if(a.kind==='edit'){if(typeof a.text!=='string'||!a.text.trim()||a.text.length>160)throw Error('評価文は1〜160文字です。');s.test[s.selected]={text:a.text,label:choice(a.label,['net','food'])};return note(s,'評価用の文と正解labelを変更しました。学習文は変更せず、同じ分類器で再評価します。');}
 throw Error('未定義の評価操作です。');
};
})();
