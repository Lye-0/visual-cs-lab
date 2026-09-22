/* Engineering experiments operate on explicit local objects, not real projects.
 * Each rejected transition is atomic. Experiment undo is not learning history. */
(() => {
'use strict';
const L=CSL,X=L.experiences,K=L.curriculum,E=X.engineeringDesk={};
E.clone=X.clone;
E.number=(v,min,max,label='値')=>{if(!Number.isFinite(v)||v<min||v>max)throw Error(label+'は'+min+'〜'+max+'の有限な数です。');return v;};
E.int=(v,min,max,label='番号')=>{E.number(v,min,max,label);if(!Number.isInteger(v))throw Error(label+'は整数です。');return v;};
E.choice=(v,choices)=>{if(!choices.includes(v))throw Error('対象を選び直してください。');return v;};
E.text=(v,max=100)=>{if(typeof v!=='string'||v.length>max)throw Error(max+'文字以内の文字列にしてください。');return v;};
E.begin=s=>{if(s.log.length>=120)throw Error('この小例は120操作までです。実験を最初から試してください。');return E.clone(s);};
E.note=(s,text)=>{s.log.push(text);return s;};
const {int,number:num,choice,text,begin,note}=E,mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;

E.designStart=()=>({cache:false,invalidate:false,replicas:1,value:10,version:1,cached:null,last:null,component:'API',log:[]});
E.designView=s=>({cost:3+3*s.replicas+Number(s.cache),availability:.9999*.999*(1-(1-.99)**s.replicas),fresh:s.last? s.last.version===s.version:null});
E.design=(input,a)=>{
 const s=begin(input);
 if(a.kind==='select'){s.component=choice(a.value,['UI','API','Cache','DB']);return s;}
 if(a.kind==='cache'){s.cache=!s.cache;s.cached=null;return note(s,'キャッシュを'+(s.cache?'追加':'除去')+'しました。以前の応答は過去の記録として残します。');}
 if(a.kind==='invalidate'){s.invalidate=!s.invalidate;return note(s,'更新時のキャッシュ破棄を'+(s.invalidate?'有効':'無効')+'にしました。過去の応答を新しい値に書き換える操作ではありません。');}
 if(a.kind==='replicas'){s.replicas=int(a.value,1,3,'DB台数');return note(s,'DB台数だけを変更。可用性は独立障害と切替成功を仮定した計算です。');}
 if(a.kind==='edit'){s.value=int(a.value,0,99,'DBの値');s.version++;if(s.invalidate)s.cached=null;return note(s,'DBをv'+s.version+'へ更新。'+(s.invalidate?'保存済みキャッシュを破棄しました。':'キャッシュの以前の値はそのままです。'));}
 if(a.kind==='read'){
  const hit=s.cache&&s.cached!==null,r=hit?s.cached:{value:s.value,version:s.version};
  s.last={...r,hit:Boolean(hit),time:5+12+(hit?3:30),path:hit?['UI','API','Cache']:['UI','API','DB']};
  if(s.cache&&!hit)s.cached={value:s.value,version:s.version};
  return note(s,'画面へ値'+r.value+'（v'+r.version+'）を返しました。費用'+s.last.time+'msは架空の処理時間の和で、実測ではありません。');
 }
 throw Error('未定義の設計操作です。');
};
E.observerStart=()=>({subscribed:{A:true,B:true},inboxes:{A:[],B:[]},serial:0,log:[]});
E.observer=(input,a)=>{
 const s=begin(input);
 if(a.kind==='subscribe'){const id=choice(a.id,['A','B']);s.subscribed[id]=!s.subscribed[id];return note(s,id+'を'+(s.subscribed[id]?'登録しました。過去の通知は再送しません。':'解除しました。受信済みの記録は残します。'));}
 if(a.kind==='emit'){const event=text(a.value,40).trim();if(!event)throw Error('通知する内容を入れてください。');s.serial++;for(const id of ['A','B'])if(s.subscribed[id])s.inboxes[id].push({id:s.serial,event});return note(s,'発行者が通知'+s.serial+'を登録先へ送信。具体的な受信画面を呼出し元は知りません。');}
 throw Error('未定義の通知操作です。');
};
E.orderStart=()=>({state:'created',history:[],log:[]});
E.order=(input,a)=>{
 choice(a.kind,['approve','send','cancel']);
 const s=begin(input),rules={created:{approve:'approved',cancel:'cancelled'},approved:{send:'sent',cancel:'cancelled'},sent:{},cancelled:{}},next=rules[s.state][a.kind];
 if(!next)throw Error('状態 '+s.state+' では '+a.kind+' を許可していません。');
 s.history.push({before:s.state,action:a.kind,after:next});s.state=next;return note(s,'状態を'+next+'へ変更。状態図にない操作を勝手に実行しません。');
};

E.testStart=()=>({program:L.labs.find(l=>l.id==='gap-146').defaults.program,revision:0,cases:[{x:1,expected:1},{x:3,expected:3}],results:null,selected:0,step:0,log:[]});
E.executeCase=(program,x)=>K.runtime.execute(K.runtime.parse(program),{inputs:[x],maxSteps:120});
E.testView=s=>{
 if(!s.results)return {trace:null,frame:null};
 const trace=E.executeCase(s.program,s.cases[s.selected].x),frame=trace.frames[Math.min(s.step,trace.frames.length-1)];return {trace,frame};
};
E.testing=(input,a)=>{
 const s=begin(input);
 if(a.kind==='code'){const program=text(a.value,2400);K.runtime.parse(program);s.program=program;s.revision++;s.results=null;s.step=0;return note(s,'コードを版'+s.revision+'として適用。前の実行結果を無効にしました。テストの入力と期待値は保持します。');}
 if(a.kind==='add'){if(s.cases.length>=12)throw Error('この例は12ケースまでです。');s.cases.push({x:int(a.x,-50,50,'入力'),expected:int(a.expected,-50,50,'期待値')});s.results=null;s.step=0;return note(s,'自分の期待値を持つケースを追加。仕様と一致しているかも実行時に照合します。');}
 if(a.kind==='run'){
  s.results=s.cases.map(row=>{const r=E.executeCase(s.program,row.x),actual=r.output.length&&!r.error?Number(r.output.at(-1)):null,spec=Math.max(0,Math.min(10,row.x));return {x:row.x,expected:row.expected,spec,actual:Number.isFinite(actual)?actual:null,error:r.error||null,oracle:row.expected===spec,pass:!r.error&&actual===row.expected,correct:!r.error&&actual===spec};});
  s.step=0;return note(s,'現在の版で実行。自分の期待値に一致したかと、独立した仕様に一致したかを分けました。');
 }
 if(a.kind==='select'){s.selected=int(a.index,0,s.cases.length-1);s.step=0;return s;}
 if(a.kind==='step'){if(!s.results)throw Error('先にテストを実行してください。');const r=E.executeCase(s.program,s.cases[s.selected].x);s.step=Math.max(0,Math.min(r.frames.length-1,s.step+choice(a.delta,[-1,1])));return s;}
 throw Error('未定義のテスト操作です。');
};

E.mergeStart=(conflict=true)=>({base:['color = blue','size = 10','label = item'],left:['color = green','size = 10','label = item'],right:[conflict?'color = red':'color = blue','size = 20','label = item'],resolution:null,log:[]});
E.mergeView=s=>{const r=K.mergeLines(s.base,s.left,s.right);return {...r,result:s.resolution===null?r.merged:[s.resolution,'size = 20','label = item']};};
E.merge=(input,a)=>{
 if(a.kind==='example')return E.mergeStart(choice(a.value,['conflict','independent'])==='conflict');
 const s=begin(input);
 if(a.kind==='resolve'){if(!E.mergeView(s).conflicts.length)throw Error('この例には行の競合がありません。');s.resolution=a.side==='custom'?'color = '+text(a.value,24):a.side==='left'?s.left[0]:a.side==='right'?s.right[0]:null;if(s.resolution===null)throw Error('左右または手動入力を選んでください。');return note(s,'色の行を選びました。競合印をなくすことと、仕様に合う色を選ぶことは別です。右だけが変えたsize=20は保持します。');}
 throw Error('未定義の統合操作です。');
};
E.ciStart=()=>({revision:0,queue:[],results:[],reviewed:null,built:null,published:null,serial:0,log:[]});
E.ci=(input,a)=>{
 const s=begin(input);
 if(a.kind==='edit'){s.revision++;return note(s,'現在の版はr'+s.revision+'。前の検証や生成物には元の版番号を残します。');}
 if(a.kind==='start'){s.queue.push({id:++s.serial,revision:s.revision});return note(s,'テスト'+s.serial+'は開始時のr'+s.revision+'を検証します。完了前に編集しても対象は変わりません。');}
 if(a.kind==='complete'){const i=s.queue.findIndex(q=>q.id===a.id);if(i<0)throw Error('完了させる待機中テストがありません。');if(typeof a.pass!=='boolean')throw Error('成功か失敗を選んでください。');const job=s.queue.splice(i,1)[0];s.results.push({...job,pass:a.pass});return note(s,'テスト'+job.id+'はr'+job.revision+'の'+(a.pass?'成功':'失敗')+'。実GitHubへ操作したのではなく、この仮想ジョブの結果です。');}
 if(a.kind==='review'){s.reviewed=s.revision;return note(s,'r'+s.revision+'をレビューした記録です。');}
 if(a.kind==='build'){s.built=s.revision;return note(s,'r'+s.revision+'の仮想生成物を作りました。');}
 if(a.kind==='publish'){const test=[...s.results,...s.queue].filter(r=>r.revision===s.revision).sort((a,b)=>b.id-a.id)[0];if(!test?.pass||s.reviewed!==s.revision||s.built!==s.revision)throw Error('現在の版にそろった成功・レビュー・生成物が必要です。');s.published=s.revision;return note(s,'検証対象・レビュー・生成物が同じr'+s.revision+'なので配布しました。実サイトは更新しません。');}
 throw Error('未定義のCI操作です。');
};

E.studyStart=()=>({orders:Array(8).fill('AB'),effect:-3,practice:5,log:[]});
E.studyView=s=>{
 const base=[30,45,25,60,35,55,40,50],rows=base.map((ability,i)=>{const order=s.orders[i],a=ability-(order==='BA'?s.practice:0),b=ability+s.effect-(order==='AB'?s.practice:0);return {id:i+1,base:ability,order,a,b,diff:b-a};});
 return {rows,difference:mean(rows.map(r=>r.diff)),balanced:s.orders.filter(x=>x==='AB').length===4};
};
E.study=(input,a)=>{
 const s=begin(input);
 if(a.kind==='order'){const i=int(a.index,0,7);s.orders[i]=s.orders[i]==='AB'?'BA':'AB';return note(s,'参加者'+(i+1)+'の順序を変更。個人の基準時間と、Bの設定上の効果は変えていません。');}
 if(a.kind==='balance'){s.orders=s.orders.map((_,i)=>i%2?'BA':'AB');return note(s,'ABとBAを半数ずつにしました。この単純な加法モデルでは練習効果の寄与が相殺されます。');}
 if(a.kind==='parameters'){s.effect=num(a.effect,-10,10,'Bの設定差');s.practice=num(a.practice,0,10,'練習効果');return note(s,'架空データの生成条件を変えました。実際の参加者の観測ではありません。');}
 throw Error('未定義の割当操作です。');
};
E.policyStart=()=>({choice:'minimal',stakeholder:'user',log:[]});
E.policyView=s=>{
 const detailed=s.choice!=='minimal',external=s.choice==='external';
 return [{id:'user',name:'利用者',benefit:detailed?'以前の操作に合わせた案内を作れる可能性':'必要な機能を利用できる',risk:external?'第三者の利用目的や保存・再提供を把握しにくい':detailed?'行動の細かな記録が残る':'個別の案内を作れる情報は少ない'},
 {id:'operator',name:'運用担当',benefit:detailed?'障害の直前の操作を調べやすい':'障害件数の概況を知る',risk:detailed?'保管・アクセス制御・削除の責任が増える':'個々の障害の再現が難しい場合がある'},
 {id:'third',name:'連携先',benefit:external?'共有された行動記録を分析に使える':'個人の行動記録は受け取らない',risk:external?'合意した目的・管理範囲を超えて使う危険':'利用者ごとの連携案内には使えない'}];
};
E.policy=(input,a)=>{const s=begin(input);if(a.kind==='policy')s.choice=choice(a.value,['minimal','detailed','external']);else if(a.kind==='stakeholder')s.stakeholder=choice(a.value,['user','operator','third']);else throw Error('未定義の検討操作です。');return note(s,'架空の事例で想定した利点と不利益を並べます。自動的な倫理の合格判定や法律上の認定ではありません。');};
E.resampleStart=()=>({a:[12,11,14,13,12,15],b:[9,10,11,10,11,12],swaps:Array(6).fill(false),sample:[],log:[]});
E.resampleView=s=>{
 const difference=s.a.map((v,i)=>s.b[i]-v),permuted=difference.map((d,i)=>s.swaps[i]?-d:d),drawn=s.sample.map(i=>({source:i,difference:difference[i]})),observed=mean(difference);
 const exact=Array.from({length:64},(_,mask)=>mean(difference.map((d,i)=>mask&(1<<i)?-d:d)));
 return {difference,permuted,observed,permutedMean:mean(permuted),drawn,bootstrapMean:drawn.length?mean(drawn.map(r=>r.difference)):null,pvalue:exact.filter(v=>Math.abs(v)>=Math.abs(observed)-1e-12).length/64};
};
E.resample=(input,a)=>{const s=begin(input);if(a.kind==='swap'){const i=int(a.index,0,5);s.swaps[i]=!s.swaps[i];return note(s,'同じ人のA/Bだけを交換。別の人と組み替えたのではありません。');}if(a.kind==='draw'){if(s.sample.length>=6)throw Error('この再標本は6件です。新しい標本を始めてください。');s.sample.push(int(a.index,0,5));return note(s,'元の組を一つ選びました。同じ組を何度選んでもよい復元抽出の一例です。');}if(a.kind==='clear'){s.sample=[];return note(s,'作った再標本だけを空にしました。元データやラベル交換は変えません。');}throw Error('未定義の再標本操作です。');};

E.evidenceStart=()=>({claim:'mean',evidence:null,section:'results',log:[]});
E.evidenceCards=[{id:'E1',name:'今回の4組の観測',text:'A:12,10,14,9 / B:9,11,10,8。2人目ではBの方が遅い。'}, {id:'M1',name:'今回の測定方法',text:'全員がAの後にBを操作。順序は無作為に割り当てていない。'}, {id:'P1',name:'架空の関連研究',text:'別のUIで操作時間を扱う架空の紹介カード。今回の4組のデータは含まない。'}];
E.evidenceView=s=>{
 if(!s.evidence)return {verdict:'根拠にしたい資料を一つ選んでください。',detail:'資料の存在と、その内容が主張を支えることは別です。'};
 if(s.claim==='mean'&&s.evidence==='E1')return {verdict:'今回の平均については観測が根拠になる',detail:'平均差B−A=(−3+1−4−1)/4=−1.75。この4組についての記述に限定します。'};
 if(s.claim==='always'&&s.evidence==='E1')return {verdict:'その主張には観測内の反例がある',detail:'2人目はA=10、B=11。今回すべて速かった、という文さえ支持しません。'};
 if(s.claim==='causal')return {verdict:'この資料だけで原因を断定しない',detail:s.evidence==='M1'?'全員が同じ順序です。Bの効果と、慣れや順序の影響を区別する情報が不足しています。':'観測差や関連資料の存在だけでは、この差の原因がBだと確定しません。'};
 return {verdict:'この主張を支える根拠が足りない',detail:'IDが存在しても、今回の対象・観測・主張に対応する内容が必要です。'};
};
E.evidence=(input,a)=>{const s=begin(input);if(a.kind==='claim'){s.claim=choice(a.value,['mean','always','causal']);s.evidence=null;}else if(a.kind==='evidence')s.evidence=choice(a.value,E.evidenceCards.map(e=>e.id));else if(a.kind==='section')s.section=choice(a.value,['methods','results','discussion','limitations']);else throw Error('未定義の根拠操作です。');return note(s,'指定した有限の主張形式と、書かれた内容を照合しました。自由な文章や実論文を自動で査読する機能ではありません。');};

E.apiStart=()=>({rows:[{id:1,name:'利用者1の資料',owner:1},{id:2,name:'利用者2の資料',owner:2}],last:null,selected:0,log:[]});
E.api=(input,a)=>{
 const s=begin(input);
 if(a.kind==='stage'){if(!s.last)throw Error('先に要求を送ってください。');s.selected=int(a.index,0,s.last.trace.length-1);return s;}
 if(a.kind!=='request')throw Error('未定義の要求操作です。');
 const method=choice(a.method,['GET','POST','PATCH','DELETE','PUT']),path=text(a.path,120),body=text(a.body,2000),config={role:choice(a.role,['guest','user','admin']),actor:int(a.actor,1,3),contentType:choice(a.contentType,['application/json','text/plain']),failure:choice(a.failure,['none','before','after'])};
 if(method==='POST'&&s.rows.length>=20)throw Error('この小例では20行までです。');
 s.last=K.virtualRequest(s.rows,{method,path,body},config);s.last.request={method,path,body,...config};s.selected=Math.max(0,s.last.trace.length-1);
 return note(s,method+' '+path+' → '+s.last.status+'。前後の表と、実際に通った段階だけを残しました。外部への要求は送信していません。');
};
})();
