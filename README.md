# Visual CS Lab

**小さな例を読み、図で確かめ、条件を変えて理解する。**

情報科学を視覚的・体験的に学ぶ、シックなダークテーマの教材サイトです。既存159単元を残し、GAP-001〜155の155モデルを追加した **全314単元・20分野** を収録しています。数学、統計、プログラミング、回路、OS、データベース、AI、自然言語処理、CG、HCIなどを扱い、セキュリティ・ネットワークを重点化しています。

## 公開形式：HTML・JavaScript・CSSを分離

```text
index.html                 # 軽量な入口。JS/CSSを埋め込まない
.nojekyll                  # GitHub PagesのJekyll処理を無効にする
assets/favicon.svg
src/
  core.js                  # 共通の計算・教材登録
  curriculum-*.js          # 追加教材・描画・検索
  reader.js                # 解説画面
  boot.js                  # 初期化と共通操作
  style.css                # 基本配色とレイアウト
  reader*.css              # 解説画面の配色・操作領域
  curriculum*.css          # 追加教材の表示
scripts/
  modules.mjs              # JS/CSSの読み込み順の唯一の定義
  site-entry.mjs           # 入口HTMLのテンプレート
  build.mjs                # 入口の再生成／一致検査
  server.mjs               # 開発用HTTPサーバー
```

公開時も `src/` のファイルをそのまま使用します。ソースと配布物に同じJS/CSSを二重に置かず、外部CDN・実行時ライブラリ・ログイン・APIキーも不要です。JSはclassic scriptの`defer`で順序を保ち、全ファイルの評価後に起動します。ハッシュ形式のURLを維持しているため、各単元の直リンクを再読み込みしても特別なサーバー設定は不要です。

**旧版と違い、`index.html`だけを取り出しても動作しません。** `index.html`、`src/`、`assets/`を同じ相対配置で公開してください。公開にNode.jsやnpmの実行は必要ありません。

## GitHub Pages：ブランチから公開する

リポジトリの **Settings → Pages → Build and deployment** で指定します。

| 設定 | 値 |
|---|---|
| Source | **Deploy from a branch** |
| Branch | **main** |
| Folder | **/(root)** |

Save後は、mainへpushした静的ファイルが公開対象です。通常のURLは `https://lye-0.github.io/visual-cs-lab/` です。設定変更や公開完了はPages画面で確認してください。

`dist/`や`gh-pages`ブランチ、独自のデプロイ用ワークフローは不要です。リポジトリにあるActionsはテスト用で、ソースの修復・commit・push・Pagesデプロイはしません。GitHub管理のPages処理がActions一覧に出ることはあります。**ブランチ公開は、独立したテスト用Actionsの成功待ちにはなりません。** 公開前にローカルの`npm run check`またはPRのChecksを確認してください。

公式手順：[GitHub Pagesの公開元設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## ローカルで開く

Node.js 20以上（検証の中心は22）で、リポジトリのフォルダから実行します。`npm install`は不要です。

```powershell
git switch main
git pull --ff-only
npm start
```

`http://127.0.0.1:4173` を開きます。作業中の未コミット変更は破棄せず保存してください。`npm start`は静的ファイルを配信するだけです。暗号APIやフォームなども含め、HTTPSまたはlocalhostでの利用を推奨します。`file://`の制限を避けるため、HTMLのダブルクリックを標準の確認手順にはしません。

既存のJS/CSSを編集するだけならビルド不要です。ファイルを追加・削除・並べ替えたときは `scripts/modules.mjs` を変更して `npm run build` を実行し、更新された入口とともにコミットします。巨大な単一HTMLには戻りません。

## 検索と使い方

単元名・用語・科目名、または `GAP-037` のような番号で検索できます。`#/lab/gap-037` から直接開けます。

具体的な疑問、意味、小さな例、図と式の対応、条件変更、確認問題を使って理解します。解説を順番に修了しないと操作できない制限は設けません。再生・停止・段階移動・巻き戻し・初期化は手順のある教材で使い、直接操作の教材には不要な再生を出しません。

## ブラウザ互換性の警告

`backdrop-filter`、`user-select`にWebKit向けの宣言を追加し、`appearance`と`print-color-adjust`も含めて **接頭辞つき → 標準プロパティ** の順にしています。ぼかし非対応時は濃い背景で文字を読めるようにします。これだけで古いSafari全体への対応を保証するものではありません。

`theme-color`は対応ブラウザの外枠の色を指定する任意のメタデータです。非対応でも教材の表示・計算は壊れないため残します。`scrollbar-color`／`scrollbar-width`も見た目の追加指定として残し、非対応環境ではブラウザ標準のスクロールバーを使います。基本の`color-scheme: dark`と通常のoverflowを維持し、スクロールバー自体は非表示にしません。

Edge Toolsの互換性データや対象ブラウザ設定によって、これら任意機能の警告は残る場合があります。診断を一括無効化する設定は追加していません。対応判断の根拠は[静的配信と互換性](docs/STATIC_SITE.md)を参照してください。

## 開発・検証

| コマンド | 内容 |
|---|---|
| `npm start` | チェックイン済みの静的サイトを配信（ビルド不要） |
| `npm run build` | JS/CSSの参照を持つ入口HTMLだけ再生成 |
| `node scripts/build.mjs --check` | 入口とmanifestの一致を読み取り専用で検査 |
| `npm test` | 既存・追加教材、再生、入力、静的配信、CSS宣言の回帰試験 |
| `npm run inventory` | 単元一覧を再生成 |
| `npm run check` | 入口の一致・Node.js試験・単元一覧を確認 |
| `node scripts/curriculum-probe.mjs` | 155追加モデルの境界・比較・独立した既知例 |

ブラウザ試験のときだけPlaywrightを導入します。

```powershell
npm install --no-save --package-lock=false --ignore-scripts playwright@1.63.0
npx playwright install chromium firefox webkit
node tests/static-site-browser.mjs
node tests/reader-browser.mjs
node tests/curriculum-browser.mjs
node tests/pr-review-browser.mjs
node tests/reader-regressions.mjs
node tests/reader-svg-theme.mjs
```

`static-site-browser.mjs`は`BROWSER=chromium|firefox|webkit`を指定できます（省略時はchromium）。GitHubプロジェクトと同じ`/visual-cs-lab/`配下とルートの両方で外部アセットの読み込み、CSP、主要な操作を調べます。WebKitはSafari実機と同じ検証ではありません。

`tests/browser_in_memory.py`と`tests/browser_behaviors.py`は単一HTML時代の履歴用テストです。分離版では使用せず、上の実HTTP試験を使ってください。過去のレポートは記載された`sourceCommit`に対する結果で、現在の合否は対象コミットのChecks／ActionsのArtifactsで確認します。

## 範囲と安全性

方式・入力サイズ・省略を各単元と[対応表](docs/CURRICULUM.md)に明記しています。全314単元という数は大学の未確認の公式シラバスや各分野の全仕様まで再現したという意味ではありません。CHECK-01〜03の範囲も推測で対応済みとは扱いません。

学習履歴、進捗、完了状態、ノート、お気に入り、前回入力は保存しません。入力・比較・再生位置・回答は現在の単元内だけで使います。実際のOS設定、通信、開発リポジトリは変更しません。教材コードは専用の制限付き言語で解析し、入力をJavaScriptの`eval`や`Function`で実行しません。公開テスト鍵や小さな暗号パラメーターは実用禁止です。本物のパスワードなどを入力しないでください。

提供された授業ノートPDFや個人情報は公開ソースに追加していません。

## 資料

[全単元一覧](docs/EXPERIMENTS.md) ／ [単元データ](docs/experiments.json) ／ [GAP対応表](docs/CURRICULUM.md) ／ [静的配信と互換性](docs/STATIC_SITE.md) ／ [検証記録の読み方](docs/verification/README.md)
