/* Database correspondence workspaces. Plain bounded state, no real database,
 * network or persistent study history. Invalid edits are atomic.
 * The six people and four courses are the existing c14 examples. */
(() => {
'use strict';
const L=CSL,X=L.experiences,D=X.databaseReview={};
const copy=X.clone;
const integer=(v,min,max,label='値')=>{if(!Number.isInteger(v)||v<min||v>max)throw Error(label+'は'+min+'〜'+max+'の整数です。');return v;};
const choice=(v,values)=>{if(!values.includes(v))throw Error('対象を選び直してください。');return v;};
const begin=s=>{if(s.log.length>=120)throw Error('この小例は120操作までです。最初から試してください。');return copy(s);};
const note=(s,text)=>{s.log.push(text);return s;};
D.people=()=>[{id:1,name:'Aoi',age:19},{id:2,name:'Ren',age:22},{id:3,name:'Yui',age:20},{id:4,name:'Sora',age:24},{id:5,name:'Haru',age:18},{id:6,name:'Rin',age:21}];

D.indexStart=(age=21,method='index')=>({age:integer(age,0,99,'年齢条件'),method:choice(method,['index','scan']),lo:0,hi:6,cursor:0,phase:method==='index'?'seek':'scan',probes:[],reads:[],found:[],selected:0,log:[]});
D.indexView=s=>{
 const people=D.people(),entries=people.map((p,i)=>({age:p.age,id:p.id,source:i})).sort((a,b)=>a.age-b.age||a.id-b.id);
 return {people,entries,next:s.phase==='seek'?Math.floor((s.lo+s.hi)/2):s.phase==='scan'?s.cursor:null,
  result:s.found.slice().sort((a,b)=>a-b).map(i=>people[i]),source:people[s.selected],indexPosition:entries.findIndex(e=>e.source===s.selected),
  costs:{seekComparisons:s.probes.length,indexEntries:s.method==='index'?s.reads.length:0,tableRows:s.method==='scan'?s.reads.length:s.found.length}};
};
D.index=(input,a)=>{
 if(a.kind==='query')return D.indexStart(a.age,input.method);
 if(a.kind==='method')return D.indexStart(input.age,a.value);
 const s=begin(input),v=D.indexView(s);
 if(a.kind==='source'){s.selected=integer(a.index,0,5,'元の行');return s;}
 if(a.kind==='entry'){s.selected=v.entries[integer(a.index,0,5,'索引項目')].source;return s;}
 if(a.kind!=='next'||s.phase==='done')throw Error('次に読む場所はありません。条件を変えるか最初から試してください。');
 if(s.phase==='seek'){
  const i=v.next,e=v.entries[i],before=[s.lo,s.hi],keepLeft=e.age>=s.age;
  if(keepLeft)s.hi=i;else s.lo=i+1;
  s.probes.push({position:i,age:e.age,before,after:[s.lo,s.hi],keepLeft});s.selected=e.source;
  if(s.lo===s.hi){s.cursor=s.lo;s.phase=s.cursor<6?'scan':'done';}
  return note(s,'索引の位置'+(i+1)+'（age='+e.age+'）を比較。開始位置の候補区間は ['+s.lo+', '+s.hi+') です。まだ元表の行を取得していません。');
 }
 const position=s.cursor,source=s.method==='index'?v.entries[position].source:position,p=v.people[source],matches=p.age>=s.age;
 s.reads.push({position,source,age:p.age,matches});if(matches)s.found.push(source);s.selected=source;s.cursor++;
 if(s.cursor===6)s.phase='done';
 return note(s,(s.method==='index'?'条件に合う索引項目から元表の行へ移動：':'元表の次の行を条件と照合：')+p.name+'、age='+p.age+'。'+(matches?'結果へ追加しました。':'今回は結果へ含めません。'));
};

D.joinStart=(preset='original',method='LEFT')=>{
 choice(preset,['original','nulls']);choice(method,['INNER','LEFT']);
 const left=D.people(),right=[{uid:1,title:'TCP'},{uid:1,title:'DNS'},{uid:3,title:'TLS'},{uid:5,title:'ACL'}];
 if(preset==='nulls'){left.push({id:null,name:'NULLキーの比較行',age:null});right.push({uid:2,title:null},{uid:4,title:'NULL'},{uid:null,title:'NULLキーの右行'});}
 return {left,right,preset,method,leftIndex:1,rightIndex:0,outputIndex:null,log:[]};
};
D.joinView=s=>{
 const rows=[];
 s.left.forEach((person,li)=>{
  const matches=s.right.map((r,ri)=>({r,ri})).filter(({r})=>person.id!==null&&r.uid!==null&&person.id===r.uid);
  if(matches.length)for(const {r,ri} of matches)rows.push({li,ri,id:person.id,name:person.name,title:r.title,origin:r.title===null?'stored-null':'stored-value'});
  else if(s.method==='LEFT')rows.push({li,ri:null,id:person.id,name:person.name,title:null,origin:'unmatched-padding'});
 });
 const matches=s.right.map((r,ri)=>({r,ri})).filter(({r})=>s.left[s.leftIndex].id!==null&&r.uid!==null&&r.uid===s.left[s.leftIndex].id);
 return {rows,matches:matches.map(x=>x.ri),outputs:rows.map((r,i)=>({r,i})).filter(x=>x.r.li===s.leftIndex),left:s.left[s.leftIndex]};
};
D.join=(input,a)=>{
 if(a.kind==='preset')return D.joinStart(a.value,input.method);
 const s=begin(input);
 if(a.kind==='left'){s.leftIndex=integer(a.index,0,s.left.length-1,'左行');s.outputIndex=null;return s;}
 if(a.kind==='right'){s.rightIndex=integer(a.index,0,s.right.length-1,'編集する右行');return s;}
 if(a.kind==='method'){s.method=choice(a.value,['INNER','LEFT']);s.outputIndex=null;return note(s,'表は変えず、結合方式だけを変更しました。');}
 if(a.kind==='output'){
  const rows=D.joinView(s).rows,index=integer(a.index,0,rows.length-1,'出力行');s.outputIndex=index;s.leftIndex=rows[index].li;
  if(rows[index].ri!==null)s.rightIndex=rows[index].ri;
  return note(s,'出力行から元の左行と右行へ戻りました。NULLで補った出力には、対応する右の元行がありません。');
 }
 if(a.kind==='edit'){
  if(typeof a.uid!=='string'||!/^\s*(?:\d{1,2})?\s*$/.test(a.uid))throw Error('結合キーは0〜99の整数か、NULLを表す空欄です。');
  const uid=a.uid.trim()===''?null:integer(Number(a.uid),0,99,'結合キー');
  if(typeof a.title!=='string'||a.title.length>40||typeof a.titleNull!=='boolean')throw Error('講座名は40文字以内です。NULLの指定も確認してください。');
  s.right[s.rightIndex]={uid,title:a.titleNull?null:a.title};s.outputIndex=null;
  return note(s,'選んだ右行だけを変更し、同じON条件で結果を計算し直しました。空欄の結合キーはSQLのNULLで、別のNULLとは等号で一致しません。');
 }
 throw Error('未定義のJOIN操作です。');
};

const txSnapshot=s=>({committed:s.committed,owner:s.owner,actors:copy(s.actors)});
D.txStart=(mode='plain')=>{
 choice(mode,['plain','locked']);const actor=delta=>({pc:0,delta,read:null,local:null,pending:null});
 const s={mode,committed:100,owner:null,actors:{A:actor(20),B:actor(-10)},events:[],selectedEvent:0,log:[]};
 s.events.push({name:'開始',explain:'確定残高は100。AもBもまだSELECTしていません。',snapshot:txSnapshot(s)});return s;
};
D.tx=(input,a)=>{
 if(a.kind==='mode')return D.txStart(a.value);
 const s=begin(input);
 if(a.kind==='event'){s.selectedEvent=integer(a.index,0,s.events.length-1,'記録');return s;}
 if(a.kind!=='step')throw Error('実行する処理を選んでください。');
 const id=choice(a.actor,['A','B']),actor=s.actors[id];if(actor.pc>=4)throw Error(id+'は既にCOMMIT済みです。');
 let name,explain;
 const requiresLock=actor.pc===2||actor.pc===0&&s.mode==='locked';
 if(requiresLock&&s.owner!==null&&s.owner!==id){
  name=id+'は行ロックを待つ';explain=(actor.pc===0?'SELECT FOR UPDATEの前':'UPDATEの前')+'で待機。読取値・書込値・確定残高は変わりません。';
 }else{
  if(actor.pc===0){if(s.mode==='locked')s.owner=id;actor.read=s.committed;name=id+'がSELECT';explain='確定済みの'+s.committed+'をアプリの読取値へ保存。相手の未確定書込みは読んでいません。';}
  if(actor.pc===1){actor.local=actor.read+actor.delta;name=id+'がアプリ側で計算';explain=actor.read+' + ('+actor.delta+') = '+actor.local+'。確定残高はまだ'+s.committed+'です。';}
  if(actor.pc===2){s.owner=id;actor.pending=actor.local;name=id+'がUPDATE（未確定）';explain='アプリで計算した値'+actor.pending+'を未確定の書込値として保持。行ロックはCOMMITまで解放しません。';}
  if(actor.pc===3){const old=s.committed;s.committed=actor.pending;actor.pending=null;s.owner=null;name=id+'がCOMMIT';explain='確定残高を'+old+'から'+s.committed+'へ更新し、行ロックを解放しました。';}
  actor.pc++;
 }
 s.events.push({name,explain,snapshot:txSnapshot(s)});s.selectedEvent=s.events.length-1;return note(s,explain);
};
D.txView=s=>({current:txSnapshot(s),selected:s.events[s.selectedEvent],bothDone:Object.values(s.actors).every(a=>a.pc===4),expected:110});

D.bplusStart=()=>({values:[],roots:[],selectedStep:-1,key:10,log:[]});
D.bplusView=s=>{
 const root=s.roots[s.selectedStep]??null,nodes=[];
 function walk(node,path,depth){const keys=node.label.trim()?node.label.split('|').map(v=>Number(v.trim())):[];nodes.push({path,depth,leaf:node.leaf===true,keys});(node.children||[]).forEach((child,i)=>walk(child,path+'-'+i,depth+1));}
 if(root)walk(root,'root',0);
 const route=[];let node=root,path='root';
 while(node){const keys=node.label.split('|').map(v=>Number(v.trim()));if(node.leaf){route.push({path,leaf:true,keys,found:keys.includes(s.key)});break;}
  let child=keys.findIndex(k=>s.key<k);if(child<0)child=keys.length;route.push({path,leaf:false,keys,child});path+='-'+child;node=node.children[child];
 }
 return {root,nodes,route,occurrences:nodes.filter(n=>n.keys.includes(s.key)),activeValues:s.values.slice(0,s.selectedStep+1)};
};
D.bplus=async(input,a)=>{
 const s=begin(input);
 if(a.kind==='key'){s.key=integer(a.value,-1000,1000,'調べるキー');return s;}
 if(a.kind==='step'){s.selectedStep=integer(a.index,0,s.roots.length-1,'挿入の記録');return s;}
 if(a.kind!=='insert'&&a.kind!=='example')throw Error('挿入するキーを指定してください。');
 if(a.kind==='example'){s.values=[10,20,5,6];s.key=10;}
 else{
  const key=integer(a.value,-1000,1000,'追加キー');s.key=key;
  if(s.values.includes(key))return note(s,'この教材は重複キーを一つにまとめます。既にある'+key+'は追加していません。');
  if(s.values.length>=24)throw Error('この小例は24個のキーまでです。');s.values.push(key);
 }
 const lab=L.labs.find(l=>l.id==='c14-bplus'),result=await L.run(lab,{...lab.defaults,values:s.values.join(',')});
 s.roots=result.frames.map(frame=>copy(frame.visual.root));
 if(s.roots.some(root=>!root||typeof root.label!=='string'))throw Error('B+木の挿入記録が不正です。');
 s.selectedStep=s.roots.length-1;
 return note(s,'一つの記録は一回の挿入が完了した木です。葉の分割では右の葉の最小値を親の案内にも使います。葉のデータを親へ移して削除したわけではありません。');
};
})();
