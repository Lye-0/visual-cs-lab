import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';import path from 'node:path';
for(const name of ['core','network','foundations','security','git','missions','catalog','extensions','learning','pedagogy'])await import(`../src/${name}.js`);
const L=globalThis.CSL,root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const metadata={version:L.version,total:L.labs.length,engineCount:Object.keys(L.engines).length,counts:Object.fromEntries(['core','network','security','missions'].map(t=>[t,L.labs.filter(l=>l.track===t).length])),areas:L.areas,topics:L.topics,courses:L.courses,routes:L.routes,sources:L.sources,labs:L.labs};
await mkdir(path.join(root,'docs'),{recursive:true});
await writeFile(path.join(root,'docs/experiments.json'),JSON.stringify(metadata,null,2)+'\n');
const escape=s=>String(s).replaceAll('|','\\|').replaceAll('\n',' / ');
let md=`# 実験一覧\n\n${L.labs.length}本。収録数はモデル定義から生成しています。各分類の代表実験であり、関連規格の全機能を再現するものではありません。\n\n`;
for(const a of L.areas){md+=`## ${a.id} ${a.name}\n\n${a.description}\n\n| ID | 単元名 | 学ぶこと | モデル |\n|---|---|---|---|\n`;
 for(const l of L.labs.filter(l=>l.area===a.id))md+=`| ${l.id} | ${escape(l.unit)} | ${escape(l.summary)} | ${escape(l.scope)} |\n`;
 md+='\n';}
md+='## 個別の省略・前提\n\n';for(const l of L.labs)md+=`### ${l.id} — ${l.unit}\n\n**学ぶこと：** ${l.summary}\n\n**試す操作：** ${l.exploration.label}\n\n**観察する点：** ${l.observe}\n\n**範囲と省略：** ${l.limits}\n\n`;
await writeFile(path.join(root,'docs/EXPERIMENTS.md'),md);
console.log(JSON.stringify({total:metadata.total,engines:metadata.engineCount,counts:metadata.counts},null,2));
