# Git 6単元：直接操作・実Git照合・全体回帰

記録日：2026-09-23。

## 結論

Git教材6単元を、コマンド列を順送りで眺めるだけの画面から、それぞれの概念に合った直接操作へ変更した。既存の仮想Gitモデルを再利用し、worktree / index / commit、reset、merge、rebase、remote、revert / amend の違いを、操作前後の内容と履歴から追える。

検証済み候補からアプリ本体と恒久テストだけを抽出し、一時workflow・候補生成スクリプトを除外してmainへ反映した。

- mainへ反映したアプリcommit：`8b782af42ddf7812e2b5cb973726c2b6b3041247`
- 候補で最終確認したアプリ：`be7c0aaf05f5c157cf6f1ce5f37bd051a5240ee1`
- mainの全体回帰run：`35845744411`
- 候補の最終Git専用検証run：`35839943299`
- GitHub Pagesでも `8b782af` のbuild/deploy成功

## 対象6単元

| ID | 主題 | 直接操作で確認すること |
|---|---|---|
| c16-git | worktree / index / HEAD | 編集、add、さらに編集、commitを別操作にし、3領域が同じとは限らないことを読む。 |
| c16-reset | soft / mixed / hard reset | 同じ出発点・同じtargetから3モードを比較し、HEAD / index / worktreeのどこまで変わるかを並べる。 |
| c16-branches | branch / merge / conflict | fast-forward、分岐後の非競合merge、競合を別シナリオにし、競合時は残す内容を明示してstageしてからmerge commitを作る。 |
| c16-rebase | mergeとrebase | 同じ分岐を同じmainへ合流させ、最終ファイルが同じでも、2-parent mergeと再適用された新commit列が異なることを比べる。 |
| c16-remote | remote / tracking / local | remote-edit、fetch、merge、push、pullを分け、remoteの実態、origin/main、local main、worktreeが自動で同期しないことを読む。 |
| c16-undo | revert / amend | revertは打消しcommitを追加し、amendは先頭commitを新IDで作り直すことを同じ出発点から比較する。 |

各単元では従来の自由なコマンド列による画面も `calculation` 章として残した。直接操作のために既存の計算記録を削除していない。

## モデル上の重要な区別

- worktree、index、HEAD commitのtreeを別々のsnapshotとして扱う。
- branchの作成だけではcommit objectを作らない。
- fast-forward mergeは参照を進め、新しいmerge commitを作らない。
- 分岐後のmergeは2親を持つcommitを作る。
- 競合は自動で「正解」を決めず、学習者が残す内容を決めてstageしてからcommitする。
- rebaseは元commitをそのまま移動せず、新しい親へpatchを順番に再適用した新commitを作る。古いobjectも教材状態には残る。
- fetchはremote-tracking refを更新し、local branchとworktreeを動かさない。
- pushはnon-fast-forwardなら拒否し、失敗時に状態を部分更新しない。
- revertは履歴位置を戻さず、逆patchの新commitを作る。
- amendは現在commitの親を保った新commitを作り、旧objectを消したことにはしない。

このモデルは教材用で、実OID・pack・認証・任意のrebase・行単位merge等を再現するものではない。

## 実画面レビューで修正した点

自動検証だけでなく、390px / 320pxを含む実際のスクリーンショットを読み、次の問題を候補段階で修正した。

1. commit graphのクリック領域が狭く、ラベル部分を押しても選択しにくい
   - commit一行全体に十分なhit areaを持たせた。
2. スマホ幅でref名やファイル内容、操作前後の値が追いにくい
   - 長い値を隠さず折り返し、before / afterを縦方向でも対応が崩れない表示へ変更した。
3. resetやamendの比較で、操作前後を同時に読みにくい
   - 同じ項目のbefore / afterを一組として読める表示へ変更した。
4. merge commitの2本の親が同じlaneへ重なり、どちらへつながるか判別しづらい
   - first-parent側と取り込んだ履歴側を別laneで描くよう修正した。
5. graphが狭幅に収まらない場合
   - ページ全体を横へ広げず、graphの枠内だけを横スクロール可能にし、案内文も表示する。

最終候補のスクリーンショットでは、初期状態、reset比較、amend、競合merge、remoteのfetch前、2-parent merge等を確認した。

## 候補段階の検証

最終候補 `be7c0aa` で実施。

| 検証 | 成功 | 失敗 |
|---|---:|---:|
| Node.js全テスト | 3927 | 0 |
| Git専用・Chromium | 69 | 0 |
| Git専用・Firefox | 69 | 0 |
| Git専用・WebKit | 69 | 0 |

Git専用ブラウザ検査では1440 / 390 / 320pxを使用。実行時エラーも0。

テストには、3 snapshot、file単位stage、soft/mixed/hard、fast-forward、2-parent merge、競合解決、rebaseの旧→新commit対応、remote/tracking/local、non-fast-forward push、revert、amend、特殊文字や空文字などを含む。

## main上の全体回帰

`8b782af` と同じcommitで、Staged main regression verification の最終集計まで成功した。

### Node・全章

- Node.js：3927 tests / 3927 pass / 0 fail / 0 skipped / 0 cancelled
- 単元：314
- 章：586
- 各ブラウザ：1758件 = 586章 × 3画面幅（1440 / 390 / 320px）
- Chromium / Firefox / WebKit 全て成功
- 3ブラウザ合計：5274通り
- 各ブラウザの表示・geometry候補：0

### 専用操作

`tests/git-review-workspaces-browser.mjs` はmain上の operations job で Chromium / Firefox / WebKit 全て終了コード0。

同じoperationsでは、AI、coding、database、engineering、media、多変数、network、OS、security、数学、基礎教材、公開パス、分類、スクロールバー等も実行され、全て終了コード0。

workspace view-stateも3ブラウザで各98件成功 / 失敗0 / runtime error 0。

### 従来画面・その他

- retained reader / curriculum / regression系も成功。
- Curriculum integration、Lesson review、Static site compatibility、OS and data learning workspaces、Library taxonomy and navigationも同commitで成功。
- GitHub Pagesのbuild/deployも成功。
- 検証ジョブはソースを変更しておらず、追跡ファイル差分0を確認している。

## 完了に含めないこと

この記録はGit6単元グループについて「実画面確認 → 修正 → 3ブラウザ専用検証 → main反映 → 全体回帰」を閉じたことを示す。

全314単元を人が1ページずつ目視承認したことや、当初の314単元分の個別修正計画の原文と全件逐条照合したことを意味しない。残る単元も小グループごとに同じ手順で確認する。
