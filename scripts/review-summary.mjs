// Only generate a release report from completed, successful checks.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const readJSON=async path=>JSON.parse(await readFile(path,'utf8'));
const sourceCommit=process.env.GITHUB_SHA||'local';
const nodeLog=await readFile('review-output/node-tests.txt','utf8');
const total=name=>{const m=nodeLog.match(new RegExp('^# '+name+' (\\d+)\\r?$','m'));assert.ok(m,`Missing TAP total: ${name}`);return Number(m[1]);};
const node={tests:total('tests'),passed:total('pass'),failed:total('fail'),skipped:total('skipped'),cancelled:total('cancelled')};
assert.ok(node.tests>0);assert.equal(node.failed+node.skipped+node.cancelled,0);assert.equal(node.tests,node.passed);
const inventory=await readJSON('docs/experiments.json');
const reports=[];
for(const file of ['reader-browser.json','reader-regressions.json']){
 const r=await readJSON('review-output/'+file);
 assert.equal(r.sourceCommit,sourceCommit);assert.equal(r.failed,0);assert.equal(r.errors.length,0);assert.ok(r.passed>0);
 assert.equal(r.cases.filter(c=>!c.passed).length,0);assert.equal(r.cases.length,r.passed);
 reports.push({file,browser:r.browser,transport:r.transport,passed:r.passed,failed:r.failed,started:r.started,finished:r.finished});
}
const all=await readJSON('review-output/reader-browser.json');
assert.equal(all.units,inventory.total);assert.equal(inventory.legacyTotal,144);assert.equal(inventory.areas.length,20);
const generatedFiles={};
for(const file of ['index.html','docs/EXPERIMENTS.md','docs/experiments.json'])generatedFiles[file]=createHash('sha256').update(await readFile(file)).digest('hex');
const runURL=process.env.GITHUB_RUN_ID?`https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`:null;
const report={version:inventory.version,sourceCommit,runURL,generatedAt:new Date().toISOString(),units:inventory.total,originalUnits:inventory.legacyTotal,areas:inventory.areas.length,counts:inventory.counts,node,browser:reports,generatedFiles,limitations:['Chromiumのみ。モバイルは画面幅とタッチのエミュレーションで、実機ではありません。','自動テストは動作と特定の数値例の検証です。初心者による理解度や全教材の正しさを保証しません。','撮影した画面はレビュー資料です。スクリーンショットの目視確認を自動テストの合格に含めません。','提供PDFの全行の再照合、全規格の再現、Safari・Firefoxでの検証はこの試験に含みません。']};
const browserTotal=reports.reduce((sum,r)=>sum+r.passed,0);
const md=`# Visual CS Lab v${report.version} 検証記録\n\nこの記録は、実際に終了したテストログから生成しています。\n\n- 検証したソースコミット：\`${sourceCommit}\`\n- 実行：${runURL||'ローカル'}\n- 作成日時（UTC）：${report.generatedAt}\n- 収録：${report.units}単元、元の${report.originalUnits}単元・20分野を維持\n\n## 自動検証の結果\n\n| 検証 | 成功 | 失敗 |\n|---|---:|---:|\n| Node.jsのテスト（子テストを含む） | ${node.passed} | ${node.failed} |\n${reports.map(r=>`| ${r.file} | ${r.passed} | ${r.failed} |`).join('\n')}\n\nブラウザは ${reports[0].browser}、実際のHTTPサーバーを使用しました。合計${browserTotal}件は複数の確認をまとめたテストケース数であり、学習効果の点数ではありません。\n\n## 確認の範囲\n\n全単元を1440px・390px幅で開き、解説・図・条件変更・比較・回答・巻戻しを確認します。再生・停止・シーク・旧画面の破棄、5単元の実Web Crypto計算、保存APIを拒否した環境も試験します。追加の回帰試験では、複数の入力エラー、コードの未反映状態、行列を開いた状態、強調位置、初期化、古い非同期結果、マウス／タッチ操作、320px幅の代表画面を確認します。非同期競合の試験だけは、計算の遅延を意図的に注入しています。\n\n## 未検証・限界\n\n${report.limitations.map(s=>'- '+s).join('\n')}\n\n## 生成物の一致\n\nHTMLと一覧のSHA-256を \`v3.json\` に記録しています。生成物の反映は、このソースを親にした作業ブランチへの追加コミットだけです。mainへのマージやデプロイは行いません。\n`;
await mkdir('review-output',{recursive:true});
await writeFile('review-output/verification-v3.json',JSON.stringify(report,null,2)+'\n');
await writeFile('review-output/TEST_REPORT-v3.md',md);
console.log(JSON.stringify({sourceCommit,units:report.units,node:node.passed,browserCases:browserTotal,runURL},null,2));
