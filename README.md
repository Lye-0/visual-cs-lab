# Visual CS Lab

**小さな例を読み、図で確かめ、条件を変えて理解する。**

情報科学を視覚的・体験的に学ぶ、シックなダークテーマの教材サイトです。既存159単元とGAP-001〜155を合わせた**全314単元**を、**8大分類・61テーマ**から探せます。数学、統計、プログラミング、回路、OS、データベース、AI、自然言語処理、CG、HCIなどを扱い、セキュリティ・ネットワークを重点化しています。

ホーム、単元一覧、検索、分野マップで共通の分類を使います。科目一覧は必要な科目だけを開く形式です。履歴・ノートは保存しません。旧20分野の識別子と単元URLは互換性のため保持しています。

分類と画面の説明は [LIBRARY_TAXONOMY.md](docs/LIBRARY_TAXONOMY.md)、公開・互換性は [STATIC_SITE.md](docs/STATIC_SITE.md) を参照してください。各教材は方式や規模を限定した独自モデルで、大学の公式シラバスの全範囲を保証するものではありません。

## ローカルで開く

Node.js 20以上で `npm start` を実行し、`http://127.0.0.1:4173` を開きます。起動時のビルドやnpm installは不要です。

最初は検索・分類用の情報を読み込み、教材を選ぶと、その単元の本文・モデル・操作部品を読み込みます。全単元の本文や計算モデルを初期画面で読み込む構成ではありません。

## 編集と検証

```text
npm run build       # index.htmlと単元別配信データを生成
npm run inventory   # 単元一覧を変更した場合に更新
npm run check       # 生成物の一致・全Nodeテスト・一覧の一致
```

`src/generated/`は生成物です。教材定義・説明・モデル・依存関係を編集したらビルドしてください。既存JS/CSSの編集でも、生成データに影響する変更はビルドが必要です。検証の`--check`はファイルを変更しません。

ブラウザー検証を実行する場合は、Playwrightを開発環境へ準備し、対応ブラウザーをインストールします。CIが指定するバージョンはワークフローを参照してください。

```text
npm run test:loading     # 全314単元の初回読み込みと再試行
npm run test:static      # 公開パスと既存詳細画面
npm run test:workspaces  # 分野別操作・入力保持など
```

## プロジェクトを読む

- [ドキュメント案内](docs/README.md)
- [ノートから学ぶ教材設計](docs/pedagogy/TEACHING_GUIDE.md)
- [読み込みの設計](docs/technical/ON_DEMAND_LOADING.md)
- [ソースの案内](src/README.md) / [検証の案内](tests/README.md)

ノートの原本PDFはGitHubに含めません。ローカル資料はリポジトリ外、または無視対象の`private-notes/`に保管します。ローカルサーバーもPDF・私的資料・隠し開発ディレクトリの配信を拒否します。

## DEPLOYMENT

https://lye-0.github.io/visual-cs-lab/

