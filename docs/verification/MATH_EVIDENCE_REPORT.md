# 数学4単元の説明・対応図：検証記録

## 対象と結論

- 検証対象ソース：`8f1b78e49bfc6bf0d7c42bf57ccc3dee76d4137d`
- 作業ブランチ：`feat/lesson-specific-experiences`
- 個別見直しの対象：`c03-matrix`、`gap-002`、`gap-006`、`gap-008`
- 専用検証run：`35709800491`、2026-09-22。3ブラウザとも成功。
- 同じソースSHAの全10本のワークフローが成功したことを、GitHub Actionsの結果で確認。
- 本文書は検証済みソースに対する記録のみ。追加後にアプリ・テスト・設定を変更していない。文書のみのコミットはCIを再実行しない。

これは「全314単元の教え方と見た目が完成した」という判定ではありません。今回4単元の具体的な不足を修正し、自動検査を通した記録です。

## 今回の変更

| 単元 | 修正した体験と説明 |
|---|---|
| c03-matrix | 基底の行き先を動かす既存の入口を保持。新しいproduct章では結果の一成分を押すと、左の行・右の列・各積・和を対応表示する。AB/BAの順序と寸法を比較し、定義できない積は理由を説明する。 |
| GAP-002 | 倍率に1/3を直接入力し、有理数のまま左右の全列を変形する。各成分の出発値・倍率・参照元・結果を残す。最初と現在の二つの式を直線で並べ、変わらない共通の点を示す。0=0と0=1は全平面と空集合として区別する。解や逆行列を元の式に戻して検算する。 |
| GAP-006 | 同じ点P、勾配、単位方向、内積、接平面の予測、実際の高さを対応させる。点はクリック・キー・数値で選べる。x断面・y断面・選んだ方向の断面を共通の高さの尺度で並べる。方向だけを変えてもx/y断面の数学的内容は変わらない。零勾配を極小と断定しない。 |
| GAP-008 | 出発点で評価した傾きを到着点の傾きとして読めた表記を修正。出発時刻・出発値・傾き・h・到着値を一つの計算として示す。RK4自身の出発値と4段の仮評価・時刻・重みを残す。過去の一歩を選べる。大きな誤差も描画範囲内へ収めるよう軸の目盛りを変更する。 |

説明の設計と各単元の未完了項目は `docs/EXPERIENCE_MATH_EVIDENCE.md` および `docs/review/MATH_EVIDENCE_REVIEW.json` に記録しています。私的な授業ノートやページ画像は公開リポジトリに追加していません。

## 専用テストの結果

各jobの最終ログを読み、対象SHAと成功・失敗の集計を確認しました。ブラウザ別に69件の数学画面検査と18件の交点・断面検査を行い、合計87件です。

| 検証 | 成功 | 失敗 | 記録 |
|---|---:|---:|---|
| 数学の計算・状態・初期化順序 | 37 | 0 | `math-evidence.test.mjs` 25件 + `math-correspondence.test.mjs` 12件。同じ37件を各jobで実行。111種類の異なるテストとは数えない。 |
| Chromium 153.0.8010.12 | 87 | 0 | job `106687356437`、69+18件、実行時エラー0 |
| Firefox 155.0 | 87 | 0 | job `106687356555`、69+18件、実行時エラー0 |
| WebKit 26.6 | 87 | 0 | job `106687356364`、69+18件、実行時エラー0 |

3エンジンとも1440・390・320px幅で、実際の分離HTML/JS/CSSをHTTP配信して操作しました。フォームの有効範囲、ラベル、横はみ出し、選択と計算結果、誤入力の原子性、取消し、初期化、クリック後のキー操作、ページ移動、CSPを検査しています。スクリーンショットは作成されていますが、下記のとおり目視は未実施です。

計算の検査には次を含みます。

- 有理数の可逆な行基本変形、元の方程式・逆行列への代入検算。
- 独立に求めた行列積と、結果セルごとの積の和。
- 描いた各直線の端点が実際に方程式を満たすこと、行操作後も交点が両式を満たすこと。
- 同じPを通る3断面、内積と独立な中心差分の一致、二次曲面の一次近似の誤差。
- Eulerの出発傾きと到着値の区別、RK4の段階評価、h=1・k=3で大きくなるEuler誤差を隠さないこと。
- HTMLヘルパーより前にモデルファイルを評価した後でも、実際の描画時には利用できること。

## 開発中に検出・修正した問題

交点・断面の追加時に、断面関数の終端の不足を構文検査で検出し、修正しました。その後、モデルモジュールがブラウザのHTMLヘルパーより先に実行されるため、`const h=CSL.h` が未定義値を保持してしまい、ブラウザで `h is not a function` が発生しました。

最終ソースでは `h` を描画時に解決するよう変更し、同じ初期化順序を再現する2件の回帰検査を追加しました。以前の失敗したSHAを成功扱いにせず、上記の最終SHAで両ブラウザ検査スクリプトを再実行しています。テスト側の期待値や対象単元数を緩めた修正ではありません。

## 同じソースで成功した全体・既存教材の回帰検証

| ワークフロー | run ID | 結果 |
|---|---:|---|
| Verify learning models | 35709800622 | success |
| Lesson-specific experience review | 35709800619 | success |
| Direct learning workspaces | 35709800676 | success |
| OS and data learning workspaces | 35709800579 | success |
| Network learning workspaces | 35709800524 | success |
| Security learning workspaces | 35709800588 | success |
| AI and language learning workspaces | 35709800461 | success |
| Media and embedded learning workspaces | 35709800486 | success |
| Engineering and native DOM learning workspaces | 35709800484 | success |
| Mathematical explanation and correspondence review | 35709800491 | success |

対象SHAを指定したActions検索で全10本が成功と確認しています。全314単元を要求する既存検査を維持しています。

## 見直し台帳の実行結果

`node scripts/audit-learning-experiences.mjs` の結果：

| 項目 | 数 |
|---|---:|
| 実際に登録されている単元 | 314 |
| 実際の章 | 572 |
| 実際の活動 | 587 |
| 今回具体的に修正した単元 | 4 |
| この見直し回で個別確認が未完了の単元 | 310 |
| 計画への全面適合を承認した単元 | 0 |
| 今回目視完了と記録した単元 | 0 |

`learning-audit.json` と `learning-audit.md` はActionsの `review-output` に生成されています。各IDの実際の章・表現・定義ハッシュと、手動の確認記録を分けています。4単元も `planReview: partial`、`visualReview: pending` としており、残り310単元を未実装と数えたり、自動検査だけで全件確認済みに変えたりしません。

## 確認していないこと・次の作業

スクリーンショットの目視は、作業用実行環境が `TransportTimeoutError` で利用できず実施していません。画像を生成できたことを目視完了とは扱いません。スクリーンリーダー、Safari実機、スマートフォン実機、実際の学習者による理解の評価も、この検証には含みません。

4単元の説明量・図と式の位置・狭い画面の見やすさは、目視確認が残ります。GAP-006はさらにヤコビ行列の局所変形と重積分の領域操作の仕上げが残り、GAP-002は自由変数の説明との照合が必要です。残る310単元にも同様に、当初の個別計画・実装・操作結果を照合する工程が必要です。

学習履歴・ノートの保存は追加せず、操作の記録はその実験内の取消し用に限ります。この報告の時点で `main` へは反映していません。

## 再確認するコマンド

```sh
node scripts/build.mjs --check
node --test tests/math-evidence.test.mjs tests/math-correspondence.test.mjs
node scripts/audit-learning-experiences.mjs
BROWSER=chromium node tests/math-evidence-browser.mjs
BROWSER=chromium node tests/math-correspondence-browser.mjs
```

ブラウザの準備は `.github/workflows/experience-math-evidence.yml` を参照してください。上記のテストはソースを書き換えません。検証後に `git diff --exit-code HEAD -- src scripts tests index.html package.json .github docs` も成功しています。
