# 教材の操作後の表示位置・説明の対応レビュー

記録日：2026-09-23。初期表示が正常でも、操作後に読んでいた位置が失われる問題を別に検証する。

## 結論

この回で確認した表示位置・フォーカス・説明ラベルの修正をmainへ反映し、修正後の全314単元の自動回帰検証まで完了した。最終の回帰runは集計を含む9ジョブ全て成功。全ページの目視評価や当初の個別計画の全件照合とは区別する。

## 対象と証拠

- 修正前：`14330e3f3eccff62e821f0ddffc42c6dbcb4db07`。検証用ファイルだけを追加した段階で、アプリは `aae0a5d` と同じ。
- 検証済みアプリcommit：`d5929bffe47b4d122d3f733db85ec480ffe15890`。
- mainへ反映して全体回帰を行ったcommit：`4df686a84f5f8aca53176ba2d84cfece1e6c2b8d`。
- 再現・修正後の対象検証run：`35812860445`、job：`107028011825`。
- 対象検証artifact：`workspace-view-review`、ID `10730472873`、保存期間7日。
- `baseline-summary.json` に修正前の失敗、`summary.json` に修正後の集計、`view-state/*.json` に各検査の結果を保存。
- 全体回帰run：`35813581339`（Staged main regression verification）。
- 最終集計job：`107032779213`。2026-09-23 03:28 UTCに集計成功。
- 最終集計artifact：`staged-summary`、ID `10730679555`、内容 `summary.json`、保存期間7日。

対象検証run `35812860445` 全体は最後のgit pushで失敗した。理由は、Actionsのトークンでは `.github/workflows/staged-main-verification.yml` を変更する `workflows` 権限がなかったためである。テストの失敗ではない。検証済み候補のコミットとtreeはGitHubに取得可能な状態で残ったため、同じ候補を親にした `4df686a` を、ユーザーが許可しているGitHub接続からmainへfast-forwardした。Actions側の権限設定を拡大したり、保護を無効にしたりしていない。

`d5929bf` と `4df686a` の差分は、回帰ワークフローの集計強化とこの記録ファイルのみ。対象検証済みのアプリを変更せずに全体回帰へ進めた。この成功結果を追記するcommitも、この文書だけの変更である。

## 再現して修正したこと

| 対象 | 修正前に確認した問題 | 修正 |
|---|---|---|
| 動的計画法 `c06-dp` | 品物の値を反映すると、開いていた設定欄が閉じる。セル選択や取消しでも読む場所を失う。 | 指定した設定欄・復元説明の開閉状態を再描画後も保持する。入力値の取消しと、説明欄の開閉は別に扱う。 |
| 動的計画法 `c06-dp` | スマホ幅で右端のセルを選ぶと、表が先頭の列へ戻る。 | 表内の横スクロール位置を保持する。全体の横はみ出しを作るのではなく、既存の表内スクロールを維持する。 |
| 積分 `c03-integral` | 和の項をキーボードで選ぶと、同じ操作を持つ上部の区間ボタンへフォーカスが移る。 | 同じ操作の最初のボタンではなく、実際に操作した側のボタンを復元する。 |
| ハミング符号 `c01-hamming` | 通信路の位置番号が読み上げ用ラベルにしかなく、画面上では数える必要がある。 | 各ビットのボタンに「位置1〜7」を見える文字として表示する。 |
| 積分 `c03-integral` | 逆向きの積分でも、最初の端点を「左側」と呼ぶ。 | 順方向・逆方向の両方に適合する「始点側の計算端点」へ変更する。 |

表示位置の保存は同じ画面内だけの一時状態である。学習履歴・ノート・localStorage等の永続保存は追加していない。別単元へ移動して戻った場合や「実験を最初から」では初期状態になる。

共通部品には `data-sec-view` を付けた要素だけを対象とする仕組みを加えた。この回で開閉・スクロール保持を明示的に有効にしたのは動的計画法の指定箇所であり、全教材の全詳細欄を変更したという意味ではない。

## 対象検証 — 成功

同じブラウザ検証を修正前と修正後に使用し、アプリのコードやCSSをテスト中に差し替えていない。

| 検証 | 成功 | 失敗 |
|---|---:|---:|
| 修正前・Chromium | 72 | 20 |
| 修正後・Chromium | 92 | 0 |
| 修正後・Firefox | 92 | 0 |
| 修正後・WebKit | 92 | 0 |
| 修正後・Node.js全テスト | 3854 | 0 |

修正前の20件は、上表の問題を画面幅や操作方法ごとに検出した数であり、別々の20種類の不具合ではない。修正前後ともブラウザ実行時エラーは0件。

新しい検証 `tests/workspace-view-state-browser.mjs` は、基礎8単元と数学4単元の全初期章、および今回の具体的な操作シナリオを1440・390・320px幅で確認する。対象IDは次の12単元。

`c01-bits`, `c01-hamming`, `c03-integral`, `c03-probability`, `c05-heap`, `c06-dp`, `c09-pipeline`, `c12-race`, `c03-matrix`, `gap-002`, `gap-006`, `gap-008`

さらに `foundation-review-browser.mjs`、`math-evidence-browser.mjs`、`math-correspondence-browser.mjs` を3ブラウザで実行し、9実行すべて終了コード0。検証後の追跡ファイル差分も0。

## 全体回帰 — 完了

共通部品も変更したため、同じmainのcommit `4df686a84f5f8aca53176ba2d84cfece1e6c2b8d` で全314単元・全章・既存の専用操作を再検証した。恒久的な `staged-main-verification.yml` に今回の操作検査を組み込み、集計では3ブラウザ分の結果が存在すること、同じ対象コミットを指すこと、失敗と実行時エラーが0であることも確認した。

### 計算・初期表示・今回追加した操作検査

| 検証 | 成功 | 失敗 |
|---|---:|---:|
| Node.js全テスト | 3854 | 0 |
| 全章初期表示・Chromium | 1722 | 0 |
| 全章初期表示・Firefox | 1722 | 0 |
| 全章初期表示・WebKit | 1722 | 0 |
| 表示位置・説明の対応・Chromium | 92 | 0 |
| 表示位置・説明の対応・Firefox | 92 | 0 |
| 表示位置・説明の対応・WebKit | 92 | 0 |

- 対象は314単元・574章。全章初期表示の1722件は574章 × 3画面幅（1440・390・320px）。3ブラウザ合計5166通りを確認した。
- 初期表示の検査は各ブラウザとも実行時エラー0件、検出した表示問題候補0件。SVG位置判定の自己検査も各5件成功。
- 今回の表示位置検査も各ブラウザとも実行時エラー0件。
- Nodeテストのskippedとcancelledはともに0件。
- 全章初期表示は全入力・全操作後の状態を総当たりした検査ではない。表示問題候補0も、画面を読んで評価したことの代わりにはしない。

### 分野別の専用操作と従来画面

Chromium・Firefox・WebKitで以下の16スクリプトをそれぞれ実行し、48実行すべて終了コード0。

1. `tests/ai-workspaces-browser.mjs`
2. `tests/coding-workspaces-browser.mjs`
3. `tests/engineering-workspaces-browser.mjs`
4. `tests/media-workspaces-browser.mjs`
5. `tests/network-workspaces-browser.mjs`
6. `tests/network-workspaces-edges-browser.mjs`
7. `tests/os-workspaces-browser.mjs`
8. `tests/security-workspaces-browser.mjs`
9. `tests/math-evidence-browser.mjs`
10. `tests/math-correspondence-browser.mjs`
11. `tests/foundation-review-browser.mjs`
12. `tests/workspace-view-state-browser.mjs`
13. `tests/authored-result-values-browser.mjs`
14. `tests/static-site-browser.mjs`
15. `tests/library-browser.mjs`
16. `tests/scrollbars-browser.mjs`

48はスクリプトの実行数であり、内部の個別検査件数ではない。上の92件の操作検査は、この実行一覧にも含まれる。

Chromiumでは従来の詳細画面を確認する `reader-browser.mjs`、`curriculum-browser.mjs`、`reader-regressions.mjs`、`reader-svg-theme.mjs`、`pr-review-browser.mjs` の5スクリプトも実行し、すべて終了コード0。全検証ジョブで、追跡ファイルが検査中に変更されていないことも確認した。

### 最終ジョブ結果と保存先

| ジョブ | ID | 結果 |
|---|---|---|
| models | 107030217097 | success |
| chapters (chromium) | 107030277680 | success |
| chapters (firefox) | 107030277682 | success |
| chapters (webkit) | 107030277678 | success |
| operations (chromium) | 107030277705 | success |
| operations (firefox) | 107030277806 | success |
| operations (webkit) | 107030277679 | success |
| retained | 107030277670 | success |
| summary | 107032779213 | success |

最終run `35813581339` の `staged-models`、`staged-chapters-*`、`staged-operations-*`、`staged-retained`、`staged-summary` に詳細を保存。現在のアプリのChromium画像と本文は `staged-chapters-chromium`（ID `10730793278`）に含まれる。artifactは7日保存のため、対象commit・実行番号・集計結果をこの文書にも残した。

GitHub Pagesのrun `35813580820` でも、同じ `4df686a` のbuild・deploy・report-build-statusが成功した。公開先での全状態の手動確認を行ったという意味ではない。

## 完了に含めないこと

全ページのスクリーンショットを開いて読む目視レビューと、当初の314単元の個別修正案の原文との全件照合は未完了。この環境ではcontainerとPythonの実行がClientErrorとなり、取得画像の展開・表示を実行できていない。今回のブラウザ操作検査の成功で、画像を読んだことにはしない。WebKitでの検証もSafari実機の検証とは区別する。

既存の `docs/review/MATH_EVIDENCE_REVIEW.json` に残したヤコビ行列の局所変形・重積分の領域操作等の個別課題も、今回の回帰検証では解除していない。今回の完了範囲は、本書に挙げた操作・説明上の不具合の修正と、それを含むアプリの自動回帰検証である。
