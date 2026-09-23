# main上の段階的検証

記録日：2026-09-23。自動回帰検証と、画面の目視・教え方のレビューを区別する。

## 結論

未反映だった基礎8単元の修正をmainへ反映し、その修正を含む全314単元の自動回帰検証まで完了した。今回の最終実行で失敗した検証ジョブは0件。

- アプリの修正commit：`593747166633c0508e0462598be77447c1c2e577`
- 全体回帰を実施したcommit：`4946406705b7b638c41f0a426d1ecf5dbf2bd054`
- 全体回帰run：`35808443736`（Staged main regression verification）
- 集計job：`107016530977`
- 集計artifact：`staged-summary`、ID `10729156293`、内容 `summary.json`
- 集計は2026-09-23 02:08 UTCに成功。個別ジョブの結果と終了コードを取り込んで判定した。

4946406は、5937471に対して検証ワークフロー・記録の追加と、役目を終えた復元専用ファイルの削除だけを行ったcommitで、アプリの挙動は変更していない。この検証記録を更新するcommitも文書だけの変更である。

## 区切り1：未反映修正と対象テスト — 完了

- 対象アプリcommit：`593747166633c0508e0462598be77447c1c2e577`
- Actions run：`35807882391`（Complete staged foundation review）
- job：`107012639404`
- このcommitをActions実行環境のローカルで作成して検証した後、同じcommitをmainへfast-forwardした。
- 検証後の `git diff --exit-code HEAD -- src scripts tests index.html package.json .github docs` も成功。

| 検証 | 成功 | 失敗 |
|---|---:|---:|
| npm run checkの全Nodeテスト | 3854 | 0 |
| 基礎教材の独立モデル検査（上の全テストにも含む） | 24 | 0 |
| 基礎教材の操作検査・Chromium | 63 | 0 |
| 基礎教材の操作検査・Firefox | 63 | 0 |
| 基礎教材の操作検査・WebKit | 63 | 0 |
| 計算結果の表示時点・Chromium | 21 | 0 |
| 計算結果の表示時点・Firefox | 21 | 0 |
| 計算結果の表示時点・WebKit | 21 | 0 |

操作検査の幅は1440・390・320px。各ブラウザの実行時エラーは0件。これは全314単元の全操作を網羅した数ではない。

### 実際にmainへ入った変更

| ID | 変更 |
|---|---|
| c01-bits | 全0のときの和を `0 = 0` と表示。全0・全1操作後のフォーカスを保持。 |
| c01-hamming | 送信・通信路・受信を別操作にし、届いたbitのみで検査。元の条件固定の計算記録はcalculation章へ保持。 |
| c03-integral | 台形または和の項を選び、幅・両端の高さと式を対応。元の詳しい計算記録はcalculation章へ保持。 |
| c03-probability | 固定比較のseed42は保ち、自由実験では試行列の番号を直接変更できるようにした。 |
| c05-heap | ボタンが一比較ではなく一つの挿入結果を進めることを明記。 |
| c06-dp | DP表のセルを選び、入れる／入れない候補と参照元を表示。 |
| c09-pipeline | 一サイクルではなく一命令を加えた記録であることを明記。 |
| c12-race | 問いを100+10+20に統一。ロックの有無で説明を切替。再描画後もキーボード操作を継続できるようにした。 |

最初の実行 `35807546295` は、ヒープの画面見出し「追加」に対してテストが「挿入」を要求したため失敗した。アプリをテストの語へ変えるのではなく、実際の見出しと選択中の記録番号の両方を確認する検査へ修正した。失敗した候補commitはmainへ反映していない。

## 区切り2：全単元の自動回帰検証 — 完了

全て同じcommit `4946406705b7b638c41f0a426d1ecf5dbf2bd054` を検査した。全体を一つの長い処理にせず、計算、全章表示、専用操作、従来画面、集計に分けて実行した。

### 全章表示と計算

| 検証 | 成功 | 失敗 | 補足 |
|---|---:|---:|---|
| Node.jsテスト | 3854 | 0 | skipped 0 / cancelled 0 |
| 全章表示・Chromium 153.0.8010.12 | 1722 | 0 | 574章 × 3画面幅 |
| 全章表示・Firefox 155.0 | 1722 | 0 | 574章 × 3画面幅 |
| 全章表示・WebKit 26.6 | 1722 | 0 | 574章 × 3画面幅 |

- 対象単元：314。章数：574。今回2つの計算記録の章を残したため、以前の572章から増加。
- 画面幅：1440・390・320px。
- 合計5166通りの章・画面幅・ブラウザの組合せを訪問。
- 各ブラウザとも実行時エラー0件、検査が検出した表示問題候補0件。
- SVG位置判定の自己検査も各ブラウザ5件成功。
- これは各章の初期描画・登録・入力欄・ラベル・本文のはみ出し等の自動検査であり、全ての操作後の状態を総当たりした結果ではない。

### 専用操作と公開パス

以下の15スクリプトをChromium・Firefox・WebKitでそれぞれ実行し、45実行全て終了コード0。45はテストスクリプトの実行数であり、内部の個別検査件数ではない。

| スクリプト | 対象 |
|---|---|
| tests/ai-workspaces-browser.mjs | AI・自然言語処理 |
| tests/coding-workspaces-browser.mjs | 符号・集合等の直接操作 |
| tests/engineering-workspaces-browser.mjs | 開発・HCI・研究・Web |
| tests/media-workspaces-browser.mjs | メディア・組み込み |
| tests/network-workspaces-browser.mjs | ネットワーク |
| tests/network-workspaces-edges-browser.mjs | ネットワークの追加境界・操作 |
| tests/os-workspaces-browser.mjs | OS・分散処理・データベース |
| tests/security-workspaces-browser.mjs | セキュリティ |
| tests/math-evidence-browser.mjs | 行列・行操作・勾配・数値解法 |
| tests/math-correspondence-browser.mjs | 数学の図と式の対応 |
| tests/foundation-review-browser.mjs | 今回修正した基礎教材 |
| tests/authored-result-values-browser.mjs | 計算結果と表示の時点 |
| tests/static-site-browser.mjs | 分離した静的サイト・ルートと公開サブパス |
| tests/library-browser.mjs | 分類・検索・ナビゲーション |
| tests/scrollbars-browser.mjs | スクロールバー |

Firefoxのスクロールバー検査は `xvfb-run` を使用した。全てのジョブで、検査後に追跡ソースの差分がないことも確認した。

### 従来の詳細画面

Chromiumで以下の5スクリプトも実行し、全て終了コード0。

- tests/reader-browser.mjs
- tests/curriculum-browser.mjs
- tests/reader-regressions.mjs
- tests/reader-svg-theme.mjs
- tests/pr-review-browser.mjs

### 最終ジョブ結果

| ジョブ | ID | 結果 |
|---|---|---|
| models | 107014349239 | success |
| chapters (chromium) | 107014411310 | success |
| chapters (firefox) | 107014411361 | success |
| chapters (webkit) | 107014411305 | success |
| operations (chromium) | 107014411327 | success |
| operations (firefox) | 107014411298 | success |
| operations (webkit) | 107014411375 | success |
| retained | 107014411246 | success |
| summary | 107016530977 | success |

証跡はrun `35808443736` の `staged-models`、`staged-chapters-*`、`staged-operations-*`、`staged-retained`、`staged-summary` artifactsに保存。Chromiumの全章画像・本文・検査データは `staged-chapters-chromium`（ID `10728748472`）に含まれる。artifactの保存期間は7日なので、恒久的な要約としてこの文書へ対象commitと集計を残す。

## 未完了：目視と当初の個別計画との照合

- 全章の画像は撮影済みだが、この作業回ではcontainerのClientErrorにより画像を展開・表示できず、全画面の目視は未完了。
- 314単元の当初の個別修正計画の原文全てとの逐条照合は未完了。既存レビューで残した操作・説明の課題も、この自動試験の成功によって解除しない。
- Safari・スマートフォン実機での検証を行ったわけではない。WebKitの試験結果をSafari実機の確認済みと呼ばない。
- 次の段階では、保存した画像を分野別の小グループで読み、図・文章・操作のつながりと、読者が次に行うことの明確さを確認する。自動検査の合格を目視・教育上の承認へ自動変換しない。

復元専用の一時スクリプトとワークフローは役目を終えたため削除済み。通常の `staged-main-verification.yml` は読み取り専用で、アプリのソースを書き換えない。
