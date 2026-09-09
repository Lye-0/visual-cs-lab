import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {L} from './helpers.mjs';
const appSource=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
function load(storage,denied=false){
 const context={CSL:{...L},matchMedia:()=>({matches:false}),setTimeout,clearTimeout};
 if(denied)Object.defineProperty(context,'localStorage',{get(){throw Error('SecurityError');}});else context.localStorage=storage;
 vm.runInNewContext(appSource,context);return context.CSL.app;
}
test('旧版の自分のキーだけを削除し、読み出し・保存・全消去を行わない',()=>{
 const values=new Map([['visual-cs-lab:v1','{"notes":["old"]}'],['another-app','keep']]),calls=[];
 const app=load({getItem:k=>{calls.push(['read',k]);return values.get(k);},setItem:(k,v)=>{calls.push(['write',k]);values.set(k,v);},removeItem:k=>{calls.push(['remove',k]);values.delete(k);},clear:()=>{calls.push(['clear']);values.clear();}});
 assert.deepEqual(calls,[['remove','visual-cs-lab:v1']]);assert.equal(values.has('visual-cs-lab:v1'),false);assert.equal(values.get('another-app'),'keep');assert.equal(app.current,null);assert.equal(app.store,undefined);assert.equal(app.persist,undefined);assert.equal(app.cleanStorage,undefined);
});
test('ストレージへのアクセス自体を拒否する環境でも起動する',()=>{assert.equal(load(null,true).current,null);});
test('ストレージAPIが存在しなくても起動する',()=>{assert.equal(load(undefined).current,null);});
test('毎回新しい一時状態から開始する',()=>{
 const a=load(undefined);a.current={answer:1,baseline:{}};a.settings.reduceMotion=true;
 const b=load(undefined);assert.equal(b.current,null);assert.equal(b.settings.reduceMotion,false);assert.notEqual(a,b);
});
test('ランタイムには新規の永続化・保存UIがない',async()=>{
 const files=['app','pages','workbench','boot'];const text=(await Promise.all(files.map(f=>readFile(new URL(`../src/${f}.js`,import.meta.url),'utf8')))).join('\n');
 assert.doesNotMatch(text,/localStorage\.(setItem|getItem|clear)|sessionStorage|indexedDB|document\.cookie|A\.persist|A\.store|data-action="(?:note|favorite|mark-understood|export-data|import-data)"/);
 assert.doesNotMatch(text,/A\.views\.notebook\s*=/);
});
test('検索は単元名・説明・用語に対応し全角英数とかなを正規化する',()=>{
 const a=load(undefined);assert.ok(a.searchLabs('ＴＣＰ').some(l=>l.id==='n11-tcp'));assert.ok(a.searchLabs('ネットワーク').length>0);
 assert.deepEqual(a.searchLabs('ネットワーク').map(l=>l.id),a.searchLabs('ねっとわーく').map(l=>l.id));assert.ok(a.searchLabs('TCP 再送').some(l=>l.id==='n11-tcp'));assert.equal(a.searchLabs('zzz_NO_SUCH_UNIT_93757').length,0);assert.equal(a.searchLabs(' ').length,144);
});
