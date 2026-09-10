# Visual CS Lab

**小さな例を読み、図で確かめ、条件を変えて理解する。**

情報科学を視覚的・体験的に学ぶ、シックなダークテーマの教材サイトです。既存159単元とGAP-001〜155を合わせた**全314単元**を、**8大分類・61テーマ**から探せます。数学、統計、プログラミング、回路、OS、データベース、AI、自然言語処理、CG、HCIなどを扱い、セキュリティ・ネットワークを重点化しています。

ホーム、単元一覧、検索、分野マップで共通の分類を使います。科目一覧は必要な科目だけを開く形式です。履歴・ノートは保存しません。旧20分野の識別子と単元URLは互換性のため保持しています。

分類と画面の説明は [LIBRARY_TAXONOMY.md](docs/LIBRARY_TAXONOMY.md)、公開・互換性は [STATIC_SITE.md](docs/STATIC_SITE.md) を参照してください。各教材は方式や規模を限定した独自モデルで、大学の公式シラバスの全範囲を保証するものではありません。

## ローカルで開く

Node.js 20以上で `npm start` を実行し、`http://127.0.0.1:4173` を開きます。起動時のビルドは不要です。既存のJS・CSSはそのまま編集でき、読み込むファイルを追加・削除したときだけ `scripts/modules.mjs` と `npm run build` で入口HTMLを更新します。

## DEPLOYMENT

https://lye-0.github.io/visual-cs-lab/

GitHub Pagesの公開元は **Deploy from a branch → main → /(root)** です。HTML・JS・CSSを分離した静的サイトとして配信し、独自のデプロイ用Actionsは使用しません。Actionsは分類・モデル・ブラウザ操作の検証用です。
