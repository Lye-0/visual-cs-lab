import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';import path from 'node:path';
import {modelModules} from './modules.mjs';
for(const name of modelModules)await import(`../src/${name}.js`);
const L=globalThis.CSL,root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const metadata={version:L.version,total:L.labs.length,legacyTotal:L.legacyLabIds.length,engineCount:Object.keys(L.engines).length,counts:Object.fromEntries(['core','network','security','missions'].map(t=>[t,L.labs.filter(l=>l.track===t).length])),areas:L.areas,topics:L.topics,courses:L.courses,readingCourses:L.readingCourses,routes:L.routes,sources:L.sources,labs:L.labs};
await mkdir(path.join(root,'docs'),{recursive:true});
await writeFile(path.join(root,'docs/experiments.json'),JSON.stringify(metadata,null,2)+'\n');
const escape=s=>String(s).replaceAll('|','\\|').replaceAll('\n',' / ');
let md=`# 単元一覧\n\n${L.labs.length}本。従来の${L.legacyLabIds.length}本を保持し、授業ノートを参考にした説明と実験を追加しています。各規格の全機能を再現するものではありません。\n\n`;
for(const a of L.areas){md+=`## ${a.id} ${a.name}\n\n${a.description}\n\n| ID | 単元名 | 学ぶこと | モデル |\n|---|---|---|---|\n`;
 for(const l of L.labs.filter(l=>l.area===a.id))md+=`| ${l.id} | ${escape(l.unit)} | ${escape(l.summary)} | ${escape(l.scope)} |\n`;
 md+='\n';}
md+='## 個別の説明・前提\n\n';for(const l of L.labs)md+=`### ${l.id} — ${l.unit}\n\n**問い：** ${l.question}\n\n**必要になる場面：** ${l.reading.why}\n\n**意味：** ${l.reading.idea}\n\n**初期例の読み方：** ${l.reading.example}\n\n**混同しないこと：** ${l.reading.pitfall}\n\n**比較する操作：** ${l.exploration.label}\n\n**範囲と省略：** ${l.limits}\n\n${l.reading.notes?`**説明の参考：** ${l.reading.notes}\n\n`:''}`;
await writeFile(path.join(root,'docs/EXPERIMENTS.md'),md);
console.log(JSON.stringify({total:metadata.total,legacy:metadata.legacyTotal,engines:metadata.engineCount,counts:metadata.counts},null,2));
