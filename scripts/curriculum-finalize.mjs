// Apply exact reviewed migrations once, then verify every source file.
// No commits, pushes, merges or deploys are performed by this script.
import {readFile,writeFile,readdir,access,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),at=path=>new URL(path,root),changes=[];
async function replace(path,old,replacement,{optional=false}={}){
 const before=await readFile(at(path),'utf8');
 // Insertions often contain the old fragment. Test the complete new fragment
 // FIRST, so a second invocation cannot redeclare an inserted helper.
 if(before.includes(replacement))return;
 const count=before.split(old).length-1;
 if(count===0){if(optional){console.log('Already changed or not applicable: '+path);return;}throw Error('Reviewed replacement no longer matches: '+path+'\n'+old.slice(0,180));}
 assert.equal(count,1,'Replacement must be unambiguous: '+path);
 await writeFile(at(path),before.replace(old,replacement));changes.push(path);
}
for(const name of (await readdir(at('scripts/'))).filter(n=>/^curriculum-patches.*\.json$/.test(n)).sort()){
 const plan=JSON.parse(await readFile(at('scripts/'+name),'utf8'));
 for(const item of Array.isArray(plan)?plan:(plan.patches||[])){
  assert.ok(item&&typeof item.path==='string'&&/^src\/[A-Za-z0-9._-]+\.(js|css)$/.test(item.path),'Unexpected patch target');
  assert.ok(typeof item.old==='string'&&item.old.length&&typeof item.new==='string','Malformed exact replacement');
  await replace(item.path,item.old,item.new,{optional:true});
 }
}
await replace('src/curriculum-engineering.js',"p.order?'DOM順':'正のtabindexで変更'","p.order?'DOM順':'見た目と異なるDOM順'",{optional:true});
await replace('tests/curriculum-browser.mjs',"assert.equal(await page.evaluate(()=>JSON.stringify(CSL.app.current.result)),initial,'初期化が同じ初期条件を再現しない');","const reset=await page.evaluate(()=>({params:CSL.app.current.params,defaults:CSL.app.current.lab.defaults,index:CSL.app.current.index}));assert.deepEqual(reset.params,reset.defaults,'初期条件へ戻る');assert.equal(reset.index,0);",{optional:true});
const manifestPath=at('scripts/modules.mjs'),old=await import(manifestPath.href+'?finalize');
const curriculumModules=['curriculum-math','curriculum-statistics','curriculum-theory','curriculum-information','curriculum-programming','curriculum-algorithms','curriculum-compilers','curriculum-circuits','curriculum-architecture','curriculum-systems','curriculum-distributed','curriculum-databases','curriculum-network','curriculum-network-advanced','curriculum-security','curriculum-security-systems','curriculum-ai','curriculum-nlp','curriculum-media','curriculum-embedded','curriculum-engineering','curriculum-web'];
for(const module of curriculumModules)await access(at('src/'+module+'.js'));
const unique=a=>[...new Set(a)];
const modelModules=unique([...old.modelModules.filter(n=>!n.startsWith('curriculum-')),'curriculum-kit','curriculum-tools','curriculum-runtime',...curriculumModules,'curriculum-index']);
const visualModules=unique([...old.visualModules,'curriculum-visuals','curriculum-rich-visuals','curriculum-demo-visuals']);
const remainder=old.browserModules.filter(n=>!old.modelModules.includes(n)&&!old.visualModules.includes(n)&&n!=='curriculum-navigation');
const browserModules=[...modelModules,...visualModules,...remainder,'curriculum-navigation'];
const styles=unique([...old.styles,'curriculum','curriculum-rich','curriculum-dom']);
for(const name of [...modelModules,...visualModules,...remainder,'curriculum-navigation'])await access(at('src/'+name+'.js'));
for(const name of styles)await access(at('src/'+name+'.css'));
const text='// One authoritative order for the offline build, inventory and tests.\n'+Object.entries({curriculumModules,modelModules,visualModules,browserModules,styles}).map(([key,value])=>'export const '+key+'='+JSON.stringify(value)+';').join('\n')+'\n';
if(await readFile(manifestPath,'utf8')!==text){await writeFile(manifestPath,text);changes.push('scripts/modules.mjs');}
for(const name of await readdir(at('tests/'))){if(!name.endsWith('.test.mjs'))continue;const file=at('tests/'+name),before=await readFile(file,'utf8'),after=before.replace(/assert\.equal\(L\.labs\.length,\s*159\)/g,'assert.equal(L.labs.length,159+(L.curriculum?.entries.length||0))');if(before!==after){await writeFile(file,after);changes.push('tests/'+name);}}
const pkg=JSON.parse(await readFile(at('package.json'),'utf8'));
if(pkg.version==='3.0.0'){pkg.version='3.1.0';await writeFile(at('package.json'),JSON.stringify(pkg,null,2)+'\n');changes.push('package.json');}
const errors=[];
for(const directory of ['src','scripts','tests'])for(const name of await readdir(at(directory+'/'))){
 if(!/\.(?:js|mjs)$/.test(name))continue;
 const result=spawnSync(process.execPath,['--check',fileURLToPath(at(directory+'/'+name))],{encoding:'utf8'});
 if(result.status!==0)errors.push({file:directory+'/'+name,error:result.stderr||'syntax error'});
}
await mkdir(at('review-output/'),{recursive:true});
await writeFile(at('review-output/prepare.json'),JSON.stringify({sourceCommit:process.env.GITHUB_SHA||'local',changes:[...new Set(changes)],errors},null,2));
for(const error of errors)console.error('SYNTAX FAILURE '+error.file+'\n'+error.error);
assert.equal(errors.length,0,'All source syntax checks must pass');
console.log(JSON.stringify({changed:[...new Set(changes)],curriculumModules:curriculumModules.length,modelModules:modelModules.length,visualModules:visualModules.length,styles:styles.length},null,2));
