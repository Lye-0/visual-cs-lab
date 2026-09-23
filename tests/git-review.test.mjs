import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {modelModules} from '../scripts/modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
const X=CSL.experiences,Q=X.gitReview,G=CSL.git,copy=structuredClone;
const act=(s,kind,data={})=>Q.reduce(s,{kind,...data});
const tree=s=>s.repo.objects[G.oid(s.repo)].tree;
test('edit, add, later edit and commit preserve three different snapshots',()=>{
 let s=Q.start();s=act(s,'edit',{value:'one'});s=act(s,'add');s=act(s,'edit',{value:'two'});s=act(s,'commit',{message:'save'});
 assert.equal(tree(s)['notes.txt'],'one');assert.equal(s.repo.index['notes.txt'],'one');assert.equal(s.repo.work['notes.txt'],'two');assert.deepEqual(Q.view(s).staged,[]);assert.equal(Q.view(s).unstaged.length,1);
});
test('file-scoped staging does not include an unrelated worktree edit',()=>{
 let s=act(Q.start(),'edit',{value:'one'});s=act(s,'add');s=act(s,'file',{value:'extra.txt'});s=act(s,'edit',{value:'unselected'});s=act(s,'commit');assert.equal(tree(s)['extra.txt'],undefined);assert.equal(s.repo.work['extra.txt'],'unselected');
});
test('empty content, newlines and HTML remain data rather than commands',()=>{
 for(const value of ['', 'two\nlines', '<img onerror="attack()">', '"\nreset --hard C0']){
  let s=act(Q.start(),'edit',{value});s=act(s,'add');s=act(s,'commit');assert.equal(tree(s)['notes.txt'],value);assert.equal(Object.keys(s.repo.objects).length,2);
 }
});
for(const mode of ['soft','mixed','hard'])for(const target of ['C0','C1'])test(`reset ${mode} ${target}: all regions and old objects`,()=>{
 let s=act(Q.start('reset'),'target',{id:target});const old=copy(s);s=act(s,'compare',{value:mode});const wanted=target==='C0'?'start':'committed';assert.equal(G.oid(s.repo),target);assert.equal(tree(s)['notes.txt'],wanted);assert.equal(s.repo.index['notes.txt'],mode==='soft'?'staged':wanted);assert.equal(s.repo.work['notes.txt'],mode==='hard'?wanted:'working');assert.equal(s.repo.objects.C1.tree['notes.txt'],'committed');assert.deepEqual(s.baseline,old.baseline);
});
test('reset comparison does not reuse a previously destroyed worktree',()=>{
 let s=act(Q.start('reset'),'compare',{value:'hard'});s=act(s,'compare',{value:'soft'});assert.equal(s.repo.work['notes.txt'],'working');assert.equal(s.repo.index['notes.txt'],'staged');
});
test('fast-forward changes the main ref, not commit objects',()=>{
 const s=Q.start('merge','ff'),next=act(s,'merge');assert.deepEqual(next.repo.objects,s.repo.objects);assert.equal(next.repo.refs.main,s.repo.refs.feature);assert.deepEqual(next.repo.objects[next.repo.refs.main].parents,['C0']);
});
test('diverged nonconflicting merge preserves both parents and both files',()=>{
 const s=Q.start('merge'),next=act(s,'merge');assert.deepEqual(next.repo.objects[G.oid(next.repo)].parents,[s.repo.refs.main,s.repo.refs.feature]);assert.equal(tree(next)['feature.txt'],'feature');assert.equal(tree(next)['main.txt'],'main');
});
test('conflicting merge cannot finish until learner explicitly stages a resolution',()=>{
 let s=act(Q.start('merge','conflict'),'merge');const old=copy(s);assert.ok(s.repo.pending);assert.equal(Object.keys(s.repo.objects).length,3);assert.throws(()=>act(s,'finish'));assert.deepEqual(s,old);s=act(s,'resolve',{value:'decided'});assert.equal(s.repo.work['notes.txt'],'decided');assert.equal(s.repo.index['notes.txt'],'decided');assert.equal(G.oid(s.repo),'C2');s=act(s,'finish');assert.deepEqual(s.repo.objects.C3.parents,['C2','C1']);assert.equal(tree(s)['notes.txt'],'decided');assert.equal(s.repo.pending,null);
});
test('rebase preserves each patch but creates new IDs and new parent chain',()=>{
 const start=Q.start('rebase'),s=act(start,'compare',{value:'rebase'});assert.deepEqual(s.mapping,[{old:'C1',new:'C4'},{old:'C2',new:'C5'}]);assert.equal(s.repo.refs.feature,'C5');assert.equal(s.repo.refs.main,'C3');assert.deepEqual(s.repo.objects.C4.parents,['C3']);assert.deepEqual(s.repo.objects.C5.parents,['C4']);
 for(const {old,new:id} of s.mapping){const a=s.repo.objects[old],b=s.repo.objects[id];assert.deepEqual(Q.diff(s.repo.objects[a.parents[0]].tree,a.tree),Q.diff(s.repo.objects[b.parents[0]].tree,b.tree));assert.ok(s.repo.objects[old]);}
 assert.deepEqual(start.repo,start.baseline);
});
test('merge and rebase compare the same baseline, ending with equal files but distinct history',()=>{
 const start=Q.start('rebase'),merged=act(start,'compare',{value:'merge'}),rebased=act(merged,'compare',{value:'rebase'});assert.deepEqual(tree(merged),tree(rebased));assert.equal(merged.repo.objects.C4.parents.length,2);assert.equal(rebased.repo.objects.C5.parents.length,1);assert.equal(Object.keys(rebased.repo.objects).length,6);
});
test('remote edit remains invisible to local history until fetch',()=>{
 const s=act(Q.start('remote'),'remote',{value:'from remote'});assert.equal(s.repo.remote.main,'C1');assert.equal(s.repo.tracking['origin/main'],'C0');assert.equal(s.repo.refs.main,'C0');assert.deepEqual(Q.localIds(s.repo),['C0']);assert.equal(Q.view(s).knownBehind,0);assert.equal(Q.view(s).commits.length,1);assert.throws(()=>act(s,'select',{id:'C1'}));
});
test('fetch updates known commits and tracking only; merge updates worktree',()=>{
 const s=act(Q.start('remote'),'remote',{value:'from remote'}),f=act(s,'fetch');assert.equal(f.repo.tracking['origin/main'],'C1');assert.equal(f.repo.refs.main,'C0');assert.deepEqual(f.repo.work,s.repo.work);assert.equal(Q.view(f).knownBehind,1);assert.ok(Q.localIds(f.repo).includes('C1'));const merged=act(f,'merge');assert.equal(merged.repo.refs.main,'C1');assert.equal(merged.repo.work['remote.txt'],'from remote');
});
test('non-fast-forward push is rejected atomically; fetch and merge then push succeeds',()=>{
 let s=act(Q.start('remote'),'remote',{value:'R'});s=act(s,'local',{value:'L'});const old=copy(s);assert.throws(()=>act(s,'push'),/non-fast-forward/);assert.deepEqual(s,old);s=act(s,'fetch');assert.equal(Q.view(s).knownAhead,1);assert.equal(Q.view(s).knownBehind,1);s=act(s,'merge');s=act(s,'push');assert.equal(s.repo.remote.main,s.repo.refs.main);assert.deepEqual(Q.view(s).remoteTree,tree(s));
});
test('pull has the documented fixed fetch-plus-merge semantics in this toy',()=>{
 const s=act(Q.start('remote'),'remote',{value:'R'}),pull=act(s,'pull'),separate=act(act(s,'fetch'),'merge');assert.deepEqual(pull.repo,separate.repo);
});
test('revert adds a child whereas amend replaces the current reference with a sibling',()=>{
 const base=Q.start('undo'),reverted=act(base,'compare',{value:'revert'}),amended=act(reverted,'compare',{value:'amend',valueText:'fixed',message:'correct'});assert.deepEqual(reverted.repo.objects.C2.parents,['C1']);assert.deepEqual(amended.repo.objects.C2.parents,['C0']);assert.equal(tree(reverted)['notes.txt'],'start');assert.equal(tree(amended)['notes.txt'],'fixed');assert.equal(amended.repo.objects.C1.tree['notes.txt'],'first');
});
test('selection never rewinds HEAD, worktree or index',()=>{
 const s=act(Q.start('stage'),'edit',{value:'one'}),c=act(act(s,'add'),'commit'),selected=act(c,'select',{id:'C0'});assert.deepEqual(selected.repo,c.repo);assert.equal(Q.view(selected).selected.id,'C0');assert.equal(Q.view(selected).id,'C1');
});
test('invalid values, nonexistent objects and unsupported file names leave state unchanged',()=>{
 const s=Q.start(),old=copy(s);for(const a of [{kind:'file',value:'__proto__'},{kind:'file',value:'../../secret'},{kind:'select',id:'constructor'},{kind:'edit',value:'x'.repeat(401)},{kind:'edit',value:null},{kind:'unsupported'}])assert.throws(()=>Q.reduce(s,a));assert.deepEqual(s,old);
});
test('all six original routes survive, plus retained command chapters',()=>{
 assert.equal(X.lessons.size,314);for(const [id,kind]of Object.entries({'c16-git':'stage','c16-reset':'reset','c16-branches':'merge','c16-rebase':'rebase','c16-remote':'remote','c16-undo':'undo'})){const d=X.find(id);assert.deepEqual(d.chapters.map(c=>c.id),['objects','commands']);assert.equal(d.chapters[0].activities[0].kind,'git-'+kind+'-desk');assert.equal(d.chapters[1].activities[0].kind,'editor');}
});
// Independent actual-Git oracle. Only a newly created temporary directory is used.
function actual(fn){const dir=mkdtempSync(join(tmpdir(),'vcs-git-oracle-'));
 const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1'}}).trimEnd();
 const edit=(name,value)=>writeFileSync(join(dir,name),value);
 try{git('init','-b','main');git('config','user.name','Test');git('config','user.email','test@example.invalid');edit('notes.txt','start');git('add','.');git('commit','-m','root');fn({git,edit,read:n=>readFileSync(join(dir,n),'utf8')});}finally{rmSync(dir,{recursive:true,force:true});}}
for(const mode of ['soft','mixed','hard'])test('real Git oracle: reset '+mode,()=>actual(({git,edit,read})=>{
 edit('notes.txt','committed');git('add','notes.txt');git('commit','-m','second');edit('notes.txt','staged');git('add','notes.txt');edit('notes.txt','working');git('reset','--'+mode,'HEAD~1');const s=act(Q.start('reset'),'compare',{value:mode});assert.equal(git('show','HEAD:notes.txt'),tree(s)['notes.txt']);assert.equal(git('show',':notes.txt'),s.repo.index['notes.txt']);assert.equal(read('notes.txt'),s.repo.work['notes.txt']);
}));
test('real Git oracle: staging captures a snapshot before a later edit',()=>actual(({git,edit,read})=>{
 edit('notes.txt','one');git('add','notes.txt');edit('notes.txt','two');git('commit','-m','save');assert.equal(git('show','HEAD:notes.txt'),'one');assert.equal(git('show',':notes.txt'),'one');assert.equal(read('notes.txt'),'two');
}));
test('real Git oracle: rebase retains changes but makes a new parent chain',()=>actual(({git,edit})=>{
 git('switch','-c','feature');edit('feature.txt','one');git('add','.');git('commit','-m','one');const old1=git('rev-parse','HEAD');edit('feature.txt','two');git('add','.');git('commit','-m','two');const old2=git('rev-parse','HEAD');git('switch','main');edit('main.txt','base');git('add','.');git('commit','-m','main');const base=git('rev-parse','HEAD');git('switch','feature');git('rebase','main');assert.notEqual(git('rev-parse','HEAD'),old2);assert.notEqual(git('rev-parse','HEAD~1'),old1);assert.equal(git('rev-parse','HEAD~2'),base);assert.equal(git('show','HEAD:feature.txt'),'two');assert.equal(git('show','HEAD:main.txt'),'base');
}));
test('real Git oracle: revert child versus amend sibling',()=>actual(({git,edit})=>{
 const root=git('rev-parse','HEAD');edit('notes.txt','first');git('add','.');git('commit','-m','first');const first=git('rev-parse','HEAD');git('revert','--no-edit','HEAD');assert.equal(git('rev-parse','HEAD^'),first);assert.equal(git('show','HEAD:notes.txt'),'start');git('reset','--hard',first);edit('notes.txt','fixed');git('add','.');git('commit','--amend','-m','fixed');assert.equal(git('rev-parse','HEAD^'),root);assert.notEqual(git('rev-parse','HEAD'),first);assert.equal(git('show','HEAD:notes.txt'),'fixed');
}));
