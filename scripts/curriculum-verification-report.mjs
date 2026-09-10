import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {modelModules} from './modules.mjs';
for(const name of modelModules)await import(new URL('../src/'+name+'.js',import.meta.url));
const L=globalThis.CSL,K=L.curriculum,sourceCommit=process.env.SOURCE_COMMIT||process.env.GITHUB_SHA||'local';
const readJSON=async path=>JSON.parse(await readFile(path,'utf8'));
const nodeLog=await readFile('review-output/curriculum-node.txt','utf8');
const total=name=>{const match=nodeLog.match(new RegExp('^# '+name+' (\\d+)\\r?$','m'));assert.ok(match,'Missing TAP count: '+name);return Number(match[1]);};
const node={tests:total('tests'),passed:total('pass'),failed:total('fail'),skipped:total('skipped'),cancelled:total('cancelled')};
assert.ok(node.tests>0);assert.equal(node.tests,node.passed);assert.equal(node.failed+node.skipped+node.cancelled,0);
const probe=await readJSON('review-output/curriculum-probe.json'),browser=await readJSON('review-output/curriculum-browser.json'),regressions=await readJSON('review-output/reader-regressions.json');
for(const report of [probe,browser,regressions]){
 assert.equal(report.sourceCommit,sourceCommit,'Report belongs to a different source revision');
 assert.equal(report.failed,0);assert.equal((report.errors||[]).length,0);assert.ok(report.passed>0);
 assert.equal(report.cases.length,report.passed);assert.ok(report.cases.every(c=>c.passed));
}
assert.equal(probe.registered,155);assert.deepEqual(probe.missing,[]);
assert.equal(browser.units,314);assert.equal(browser.viewports.length,2);
for(const viewport of ['desktop','mobile'])for(const lab of L.labs)assert.ok(browser.cases.some(c=>c.passed&&c.name===`${viewport}: ${lab.id} 初期例・移動・比較・説明`),'Missing actual page check: '+viewport+' '+lab.id);
assert.equal(K.baselineIds.length,159);assert.equal(K.entries.length,155);assert.equal(L.labs.length,314);
const generatedFiles={};for(const file of ['index.html','docs/EXPERIMENTS.md','docs/experiments.json'])generatedFiles[file]=createHash('sha256').update(await readFile(file)).digest('hex');
const report={sourceCommit,generatedAt:new Date().toISOString(),runURL:process.env.GITHUB_RUN_ID?`https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`:null,baselineUnits:159,addedModels:155,units:314,areas:L.areas.length,node,probe:{registered:probe.registered,passed:probe.passed,failed:probe.failed,missing:probe.missing},browser:{browser:browser.browser,viewports:browser.viewports,passed:browser.passed,failed:browser.failed},regressions:{passed:regressions.passed,failed:regressions.failed},generatedFiles,coverage:K.coverage,limitations:['Chromiumの自動試験です。モバイルは画面幅・タッチのエミュレーションで、実機やSafari・Firefoxの確認ではありません。','全GAP番号に実行可能な範囲限定モデルがあることと、関連する全専門事項を完全に再現することは同じではありません。','数値の独立した既知例、操作、表示の構造や配色を検査します。学習者による理解度評価は行っていません。','スクリーンショットは実際の画面のレビュー資料です。撮影したことを人による目視確認の完了として扱いません。','CHECK-01〜03の他コース固有科目・内容未確定の講義・一般教養等を、推測でカバー済みとはしていません。','提供された授業ノートPDF自体や学習履歴・ノートの保存機能は追加しません。']};
const clean=value=>String(value??'').replace(/\|/g,'\\|').replace(/\r?\n/g,' ');
const mapping=['# カリキュラムの追加範囲と再現モデル','','既存159単元を残し、GAP-001〜155へ対応する155個の範囲限定モデルを追加しています。科目名との対応は推定であり、公式シラバスや全規格の再現範囲の保証ではありません。',''];
for(const group of K.groups){mapping.push('## '+group.id+' '+group.name,'','関連科目：'+group.course,'','| GAP | 単元 | 再現する範囲 |','|---|---|---|');for(const entry of K.entries.filter(e=>e.group===group.id).sort((a,b)=>a.number-b.number)){const lab=L.labs.find(l=>l.id===entry.id);mapping.push(`| ${entry.tag} | [${clean(entry.title)}](../index.html#/lab/${entry.id}) | ${clean(lab.scope)} |`);}mapping.push('');}
mapping.push('## 説明と操作の確認','','各単元には目的・意味・小さな具体例・観察点・混同しやすい点、変更用の条件、個別の細目説明を用意しています。結果は入力条件に基づく実行モデルから得ます。','','## 保存と安全性','','操作や比較の状態は単元内のみです。実際のOS設定、ネットワーク、外部API、ユーザーの開発リポジトリは変更しません。セキュリティやHTTPの実験対象は架空のデータ・サービスです。','');
const md=['# カリキュラム拡張の検証記録','','この記録は全て終了した検証結果から生成したものです。','','- 検証したソース：`'+sourceCommit+'`','- 実行：'+(report.runURL||'ローカル'),'- 既存159単元＋追加155モデル＝314単元／20分野','','| 検証 | 成功 | 失敗 |','|---|---:|---:|',`| Node.js（子テストを含む） | ${node.passed} | 0 |`,`| 追加モデルの境界・比較・既知例 | ${probe.passed} | 0 |`,`| 全単元・新しい画像とDOMの実ブラウザ | ${browser.passed} | 0 |`,`| 従来の入力・再生の回帰試験 | ${regressions.passed} | 0 |`,'','SVGテーマの既存専用テストもワークフローの必須ステップとして実行しています。上の件数へ重複加算はしていません。','','## ブラウザで確認したこと','','実際のHTTP文書を1440px／390px幅で開き、全314単元の初期例、最終段階への移動、巻戻し、入力欄からの条件変更、初期化を確認します。代表画面は320px幅でも確認します。画像の画素選択、実際の削除と取消し、DOMの配置矩形、イベントのcapture・target・bubble、フォームのネイティブ検証は個別に操作します。','','## 範囲と限界','',...report.limitations.map(x=>'- '+x),'','## 生成物','','検証したソースから生成するHTMLと一覧のSHA-256を`curriculum.json`へ保存しています。mainへのマージ、公開デプロイ、配布ZIPの作成は行いません。',''].join('\n');
await mkdir('review-output',{recursive:true});
await writeFile('review-output/curriculum-verification.json',JSON.stringify(report,null,2)+'\n');
await writeFile('review-output/CURRICULUM_REPORT.md',md);
await writeFile('review-output/CURRICULUM.md',mapping.join('\n'));
console.log(JSON.stringify({sourceCommit,units:report.units,addedModels:155,node:node.passed,modelChecks:probe.passed,browserChecks:browser.passed,regressions:regressions.passed,runURL:report.runURL},null,2));
