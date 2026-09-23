# データベース4単元：対応付け教材と段階的検証

記録日：2026-09-23。

## 結論

データベースの4単元について、結果を見るだけだった部分を「元の行・索引項目・結合元・トランザクションの状態・B+木の案内キー」へ戻って読める教材へ変更した。検証済み候補からアプリ本体と恒久テストだけを抽出し、一時workflowや候補作成スクリプトをmainへ持ち込まずに反映した。

- mainへ反映したアプリcommit：`52c6bde668dea7e50c150a3d35a8ed4417c6143b`
- 全体回帰run：`35828522805`（Staged main regression verification）
- 最終集計artifact：`staged-summary`、ID `10736039000`
- GitHub Pagesの同commitのbuild/deployも成功

## 対象

| ID | 単元 | 主な変更 |
|---|---|---|
| c14-index | データベースの索引 | age順の索引項目と元表の行を選択可能にし、開始位置を探す比較・索引項目の読取り・元表行の取得を別々に数える。 |
| c14-join | INNER JOIN・LEFT JOIN | 左行、対応する右行、出力行を相互にたどれる。1対多、相手なし、保存済みNULL、LEFT JOINが補うNULL、文字列"NULL"、空文字列を区別する。 |
| c14-transaction | トランザクションと更新消失 | SELECT、アプリ側計算、未確定UPDATE、COMMITを別状態で表示。通常SELECTとSELECT FOR UPDATEの比較を直接操作する。 |
| c14-bplus | B+木 | 親の案内キーと葉のデータキーを別役割として表示し、選んだキーがどの子へ案内するかを追う。既存挿入エンジンを利用する。 |

元の固定条件による詳しい計算表示は各単元の `calculation` 章に残した。既存内容を削除して置き換えたのではない。

## 候補上での個別検証

最終候補 `7f5471576087e4445014cc5f819bb8092b148251` では、全Node.jsテスト3898件が成功し、データベース専用ブラウザ検査は Chromium / Firefox / WebKit で各63件成功、失敗0、実行時エラー0。

途中の最初の候補では、age>=99のlower-bound探索が2回で終了するケースに対しテストが3回目を実行していたため失敗した。アプリをテストへ合わせず、独立して数え直した比較回数にテストを修正した。

実画面の狭幅確認では、表内の操作名が縦方向へ崩れること、トランザクションの重要値が横表の右側へ隠れることを確認した。最終候補では表内ボタンを一行で読み、表の横スクロール案内を追加し、トランザクションの現在値を縦のlabel/value表示へ変更した。

## main上の全体回帰

`52c6bde` と同一のmainに対して、集計を含む全ジョブが成功した。

### Nodeと全章

- Node.js：3898 tests / 3898 pass / 0 fail / 0 skipped / 0 cancelled
- 単元：314
- 章：580
- 全章初期表示：各ブラウザ1740件 = 580章 × 3幅（1440 / 390 / 320px）
- Chromium / Firefox / WebKit の全てで失敗0
- 各ブラウザのgeometry/display candidate 0
- 3ブラウザ合計5220通りの章・幅を訪問

### 専用操作

`tests/database-review-workspaces-browser.mjs` はmain上の operations job で Chromium / Firefox / WebKit の全て終了コード0。

同じoperations jobでは、AI、符号、工学、メディア、多変数、ネットワーク、OS、セキュリティ、数学、基礎教材、公開パス、分類・検索、スクロールバー等も同時に実行し、全て終了コード0。

workspace view-state検査も3ブラウザで各98件成功、失敗0、runtime error 0。

### 従来画面

Chromiumの retained job で reader、curriculum、reader-regressions、reader-svg-theme、pr-review の既存5スクリプトも全て成功した。

## 完了に含めないこと

この文書はデータベース4単元のグループを閉じる記録である。全314単元について人がスクリーンショットを読み、教材としての分かりやすさを承認したという意味ではない。

また、当初の314単元の個別修正案の原文との全件逐条照合も、この自動回帰だけでは完了にしない。次のグループでも「実画面確認 → 修正 → 3ブラウザ検証 → main反映 → 全体回帰」を同じ単位で繰り返す。
