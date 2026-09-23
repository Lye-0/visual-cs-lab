/* Six purpose-specific Git workspaces. Reuses the existing teaching engine.
 * No shell, filesystem, network, credentials, or persistent storage access.
 * Comparisons always fork the same baseline; invalid actions are atomic. */
(() => {
'use strict';
const X=CSL.experiences,G=CSL.git,Q=X.gitReview={};
const clone=X.clone,own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const choice=(v,values)=>{if(!values.includes(v))throw Error('対象を選び直してください。');return v;};
const text=(s,n=400)=>{if(typeof s!=='string'||s.length>n)throw Error('内容は'+n+'文字以内です。');return s;};
const quote=s=>JSON.stringify(text(s));
Q.commands=(repo,lines)=>lines.reduce((s,line)=>G.execute(s,line).state,clone(repo));
const addCommit=(file,value,message)=>['edit '+file+' '+quote(value),'add '+file,'commit -m '+quote(message)];
Q.diff=(before,after)=>[...new Set([...Object.keys(before),...Object.keys(after)])].sort().filter(f=>before[f]!==after[f]).map(file=>({file,before:own(before,file)?before[file]:null,after:own(after,file)?after[file]:null}));
Q.seed=(lesson,scenario='default')=>{
 let r=G.initial();
 if(lesson==='stage')return r;
 if(lesson==='reset'){r=Q.commands(r,addCommit('notes.txt','committed','保存した版'));return Q.commands(r,['edit notes.txt "staged"','add notes.txt','edit notes.txt "working"']);}
 if(lesson==='merge'){
  choice(scenario,['default','ff','conflict']);r=Q.commands(r,['branch feature','switch feature']);
  r=Q.commands(r,addCommit(scenario==='conflict'?'notes.txt':'feature.txt','feature','featureの変更'));
  r=Q.commands(r,['switch main']);
  if(scenario!=='ff')r=Q.commands(r,addCommit(scenario==='conflict'?'notes.txt':'main.txt','main','mainの変更'));
  return r;
 }
 if(lesson==='rebase'){
  r=Q.commands(r,['branch feature','switch feature',...addCommit('feature.txt','one','feature 1'),...addCommit('feature.txt','two','feature 2'),'switch main',...addCommit('main.txt','base','mainの更新'),'switch feature']);return r;
 }
 if(lesson==='remote')return Q.commands(r,['fetch']);
 if(lesson==='undo')return Q.commands(r,addCommit('notes.txt','first','最初の変更'));
 throw Error('未定義のGit教材です。');
};
Q.start=(lesson='stage',scenario='default')=>{
 const repo=Q.seed(lesson,scenario);
 return {lesson,scenario,repo,baseline:clone(repo),before:null,file:'notes.txt',selected:G.oid(repo),target:'C0',comparison:null,resolution:null,mapping:[],log:[],commands:[]};
};
const ancestry=(r,refs)=>new Set(refs.filter(Boolean).flatMap(id=>[...G.ancestors(r,id)]));
Q.localIds=r=>[...ancestry(r,[...Object.values(r.refs),...Object.values(r.tracking),G.oid(r),...r.reflog.flatMap(e=>[e.old,e.new])])];
Q.view=s=>{
 const r=s.repo,id=G.oid(r),tree=r.objects[id].tree,local=Q.localIds(r);
 const ids=s.lesson==='remote'?local:Object.keys(r.objects);
 const selected=ids.includes(s.selected)?s.selected:id,c=r.objects[selected],parent=c.parents.length?r.objects[c.parents[0]].tree:{};
 const tracking=r.tracking['origin/main']??null,la=G.ancestors(r,r.refs.main),ta=tracking?G.ancestors(r,tracking):null;
 return {id,tree,files:[...new Set([...Object.keys(tree),...Object.keys(r.index),...Object.keys(r.work)])].sort(),staged:Q.diff(tree,r.index),unstaged:Q.diff(r.index,r.work),local,
  selected:c,delta:Q.diff(parent,c.tree),commits:ids.sort((a,b)=>Number(b.slice(1))-Number(a.slice(1))).map(id=>({...r.objects[id],active:G.ancestors(r,G.oid(r)).has(id),refs:Object.entries(r.refs).filter(([,v])=>v===id).map(([k])=>k)})),
  knownAhead:ta?[...la].filter(x=>!ta.has(x)).length:null,knownBehind:ta?[...ta].filter(x=>!la.has(x)).length:null,
  remoteTree:r.objects[r.remote.main].tree,trackingTree:tracking?r.objects[tracking].tree:null};
};
function run(s,lines){s.before=clone(s.repo);for(const line of lines){const result=G.execute(s.repo,line);s.repo=result.state;s.log.push(line+' → '+result.notice);s.commands.push(line);}s.selected=G.oid(s.repo);return s;}
Q.reduce=(input,a)=>{
 if(a.kind==='scenario')return Q.start(input.lesson,choice(a.value,['default','ff','conflict']));
 if(input.log.length>=90)throw Error('この例は90記録までです。教材を初期状態へ戻してください。');
 const s=clone(input),r=s.repo;
 if(a.kind==='select'){
  if(!Q.view(s).commits.some(c=>c.id===a.id))throw Error('ローカルで参照できるコミットを選んでください。');s.selected=a.id;return s;
 }
 if(a.kind==='file'){s.file=choice(a.value,['notes.txt','extra.txt']);return s;}
 if(s.lesson==='stage'){
  if(a.kind==='edit')return run(s,['edit '+s.file+' '+quote(a.value)]);
  if(a.kind==='add')return run(s,['add '+s.file]);
  if(a.kind==='commit')return run(s,['commit -m '+quote(a.message||'変更を保存')]);
 }
 if(s.lesson==='reset'){
  if(a.kind==='target'){s.target=choice(a.id,['C0','C1']);s.repo=clone(s.baseline);s.comparison=null;s.before=null;return s;}
  if(a.kind==='compare'){s.repo=clone(s.baseline);s.comparison=choice(a.value,['soft','mixed','hard']);return run(s,['reset --'+s.comparison+' '+s.target]);}
 }
 if(s.lesson==='merge'){
  if(a.kind==='merge'){if(s.comparison)throw Error('同じ例をやり直すには、上の出発点を選び直してください。');s.comparison='merge';return run(s,['merge feature']);}
  if(a.kind==='resolve'){
   if(!r.pending)throw Error('解決待ちの競合がありません。');s.resolution=text(a.value);
   // Only notes.txt conflicts in this bounded fixture; all decisions are explicit.
   return run(s,['edit notes.txt '+quote(a.value),'add notes.txt']);
  }
  if(a.kind==='finish'){if(!r.pending||s.resolution===null)throw Error('まず残す内容を指定してステージへ反映してください。');return run(s,['commit -m "競合を解決"']);}
 }
 if(s.lesson==='rebase'&&a.kind==='compare'){
  s.repo=clone(s.baseline);s.comparison=choice(a.value,['rebase','merge']);s.mapping=[];run(s,[s.comparison+' main']);
  if(s.comparison==='rebase'){
   const original=['C1','C2'],fresh=Object.keys(s.repo.objects).filter(id=>!own(s.baseline.objects,id));
   s.mapping=original.map((old,i)=>({old,new:fresh[i]}));
   if(fresh.length!==2)throw Error('この例の再適用コミット数が一致しません。');
  }
  return s;
 }
 if(s.lesson==='remote'){
  if(a.kind==='remote')return run(s,['remote-edit main remote.txt '+quote(a.value)]);
  if(a.kind==='local')return run(s,addCommit('local.txt',text(a.value),'自分の変更'));
  if(a.kind==='fetch')return run(s,['fetch']);
  if(a.kind==='merge')return run(s,['merge origin/main']);
  if(a.kind==='push')return run(s,['push']);
  if(a.kind==='pull')return run(s,['pull']);
 }
 if(s.lesson==='undo'&&a.kind==='compare'){
  s.repo=clone(s.baseline);s.comparison=choice(a.value,['revert','amend']);
  return s.comparison==='revert'?run(s,['revert HEAD']):run(s,['edit notes.txt '+quote(a.valueText),'add notes.txt','commit --amend -m '+quote(a.message||'内容を訂正')]);
 }
 throw Error('この教材にない操作です。');
};
})();
