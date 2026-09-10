# Visual CS Lab

**小さな例を読み、図で確かめ、条件を変えて理解する。**

情報科学を視覚的・体験的に学ぶ、シックなダークテーマの教材サイトです。式・図・途中の値・説明を対応させ、単元ごとの具体例と操作から仕組みを調べます。セキュリティ・ネットワークに加え、数学、統計、プログラミング、回路、OS、データベース、AI、自然言語処理、CG、HCIなどを扱います。

<!-- curriculum-expansion-summary -->
## カリキュラムの追加範囲

既存159単元を残し、GAP-001〜155に対応する155個の範囲限定モデルを統合しています（**全314単元・20分野**）。元の144単元も保持しています。単元一覧ではGAP番号、単元名、科目名から探せます。

- [対応範囲と各モデルの前提](docs/CURRICULUM.md)
- [検証記録と現在の合否の確認方法](docs/verification/README.md)

学習履歴・ノート・前回入力は保存しません。画面内だけの比較・再生・実験状態を使います。各分野の全仕様を再現する実機エミュレーターではありません。

<!-- /curriculum-expansion-summary -->

## 起動

ソースを編集する場合や暗号・フォームの実験を行う場合は、ローカルHTTPサーバーで開いてください。検証環境はNode.js 22です。サイトの起動に `npm install` は不要です。

```powershell
npm start
```

`prestart` が現在のソースから `index.html` を再生成します。ブラウザで `http://127.0.0.1:4173` を開きます。作業ブランチは `feat/curriculum-gap-expansion` です。取得時に既存の未コミット変更を破棄しないでください。

```powershell
git fetch origin
git switch feat/curriculum-gap-expansion
git pull --ff-only
npm start
```

ビルドされた `index.html` はCSS・JavaScriptを含む単体HTMLです。実行時の外部ライブラリ、外部フォント、APIキー、ログインは不要です。Web Cryptoを使用する単元は、ブラウザが対応するHTTPSまたはlocalhost環境が必要です。

## 学びたい内容へ進む

検索に単元名や用語を入力するか、分野・科目の一覧から開きます。カリキュラムの追加テーマは `GAP-037` のような番号でも検索できます。URLの `#/lab/gap-037` から直接開くこともできます。

各単元には「何のために学ぶか」「意味」「最初の具体例」「注目する場所」「混同しやすい点」を用意しています。最初の例を追ってから、入力や条件を変えて結果と理由を比較します。詳細な設定や個別の細目説明も開けます。理解済みの人が自由実験へ進むために、履修順の制限は設けません。

手順を追う単元では、再生・停止・段階移動・巻き戻し・初期化を使えます。直接操作の単元には意味のない再生を表示しません。画像の画素選択や、枠内で実際に動作するDOM配置・イベント伝播・フォーム検証など、対象に応じた操作もあります。

## 範囲・安全性・保存

**GAP番号に対応する教材があることと、その見出しに関連するすべての専門事項を無制限に再現することは別です。** 方式、入力の大きさ、再現する条件、省略を各単元と[対応表](docs/CURRICULUM.md)へ明記しています。大学の科目名との対応は学修要覧を参考にした推定であり、個々の公式シラバスの確認済み範囲を表しません。CHECK-01〜03の他コース固有科目、内容未確定の講義、一般教養等を、推測で対応済みにはしていません。

学習履歴・進捗・完了状態・ノート・お気に入り・前回入力は保存しません。入力、比較、再生位置、確認問題の状態は、その単元を開いている間だけ使います。

利用者のOS設定、実際のネットワークや開発リポジトリを変更しません。通信・セキュリティ・HTTPの実験対象は仮想の機器や架空のデータです。教材のコードは専用の制限付き言語として解析し、利用者の入力をJavaScriptの `eval` や `Function` で実行しません。公開テスト鍵や小さな暗号パラメーターは実用禁止です。パスワード等の本物の秘密情報を入力しないでください。

授業ノートPDFそのものはリポジトリへ収録しません。教材内には独自の説明・図・具体例を用意しています。

## 開発と検証

| コマンド | 内容 |
|---|---|
| `node scripts/curriculum-finalize.mjs` | 構文・manifest・教材登録の読み取り専用検査。ソースの修正はしない |
| `npm run build` | ソースから単体HTMLを生成 |
| `npm test` | 既存・追加教材、数値例、保存禁止、入力、再生、PRレビューの回帰テスト |
| `npm run inventory` | 単元一覧と機械可読データを再生成 |
| `npm run check` | ビルド・Node.jsテスト・単元一覧の生成 |
| `node scripts/curriculum-probe.mjs` | 追加モデルの全コントロール境界・比較条件・独立した既知例を検査 |

ブラウザテストの実行時だけPlaywrightが必要です。

```powershell
npm install --no-save --package-lock=false --ignore-scripts playwright@1.63.0
npx playwright install chromium
npm run build
node tests/reader-browser.mjs
node tests/curriculum-browser.mjs
node tests/pr-review-browser.mjs
node tests/reader-regressions.mjs
node tests/reader-svg-theme.mjs
```

`reader-browser.mjs` は解説・図・四段階・比較・巻き戻しを検査します。DOM教材の一時IDだけを構造的に正規化し、入力の現在値・ボタン状態・ラベルの参照・図の内容は比較を残します。`curriculum-browser.mjs` は入力変更・初期化に加え、画像・DOMの操作を検査します。どちらも実際のHTTP文書で全単元をPC幅・モバイル幅で開きます。

`pr-review-browser.mjs` はSVGノードのキーボード操作と、図の比較が値の変化・重複ID・壊れた参照を見逃さないことを検査します。`reader-regressions.mjs` は入力・再生の回帰試験、`reader-svg-theme.mjs` は黒い図形・文字へ戻る問題の専用試験です。

**現在の合否は、対象コミットのPR Checks／GitHub Actionsを確認してください。** `Curriculum integration and verification` はPRのhead SHAを、`Lesson review` はGitHubのマージ予定コミットを検証します。両方とも読み取り専用で、検証のためにソースを修復・commit・pushすることはありません。生の結果と対象SHAは各実行のArtifactsに残します。

チェックイン済みの[拡張時の検証記録](docs/verification/CURRICULUM_REPORT.md)と[機械可読の記録](docs/verification/curriculum.json)は、記載された `sourceCommit` に対する過去の結果です。現在の結果として流用しません。[記録の読み方](docs/verification/README.md)と[PR #2のレビュー判断](docs/PR2_REVIEW.md)も参照してください。件数を足し合わせて学習効果や独立した保証の数とは扱いません。

自動試験はChromiumで行い、スマートフォン実機・Safari・Firefoxや学習者による理解度評価とは区別します。撮影したスクリーンショットも、目視レビュー済みという意味ではありません。

## ソース構成と資料

`scripts/modules.mjs` が、モデル・描画・ブラウザ処理・CSSの読み込み順の基準です。計算モデルは表示処理と分離し、計算結果のフレームから図・数値・説明を表示します。`src/curriculum-*.js` に分野別の追加モデル、共通の計算補助、描画、検索への統合があります。

| 資料 | 内容 |
|---|---|
| [全単元一覧](docs/EXPERIMENTS.md) | 単元名、問い、例、操作、モデルの前提 |
| [単元データ](docs/experiments.json) | 生成された機械可読の一覧 |
| [GAP対応表](docs/CURRICULUM.md) | 追加範囲と各モデルが実際に再現すること |
| [検証記録の読み方](docs/verification/README.md) | 現在のChecks／Artifactsと過去の記録を区別する方法 |
| [PR #2レビュー対応](docs/PR2_REVIEW.md) | Copilot指摘ごとの妥当性・採否・修正内容 |

マージや公開デプロイは利用者が行います。作業ブランチ上のソースと生成物を更新し、そのコミットに対してCIを実行します。
