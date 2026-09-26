# ドキュメント案内

目的に合わせて必要な文書を読む。過去の検証記録を、現在のコミットの合否として扱わない。

## 教材を設計・改善する

- [ノートから学ぶ教材設計](pedagogy/TEACHING_GUIDE.md)：単元ごとに表現を選ぶ理由、図・式・文章・操作の対応、レビューの基準。
- [単元と再現範囲](CURRICULUM.md)：GAP-001〜155の範囲と省略。
- [全単元一覧](EXPERIMENTS.md)：生成された314単元の一覧。元データを修正し、`npm run inventory`で更新する。
- [モデルの範囲](MODEL_SCOPE.md)：実計算と教材用モデルの違い。
- `EXPERIENCE_*.md`：分野ごとに実装した操作・制約・残課題。作成時点の記録として読む。

## 開発・公開する

- [現在の設計](ARCHITECTURE.md)：ソース、生成物、読み込みの役割。
- [必要な教材だけを読み込む仕組み](technical/ON_DEMAND_LOADING.md)：依存関係、生成、失敗・画面移動時の処理。
- [入力条件の自動反映](technical/LIVE_INPUT.md)：入力中の更新、取消し、実験内操作との区別、SQLプレビュー。
- [共通の数値入力](technical/NUMBER_INPUT.md)：増減ボタン・刻み幅・上下限・直接入力。
- [共通プルダウン](technical/CUSTOM_SELECT.md)：独自UIとフォームの値、キーボード、動的な教材の同期。
- [静的サイトの公開](STATIC_SITE.md)：GitHub Pagesと互換性。
- [分類](LIBRARY_TAXONOMY.md)、[スクロールバー](SCROLLBARS.md)。
- [ソースの案内](../src/README.md)、[検証の案内](../tests/README.md)。

## 検証・履歴を読む

- [ノートの設計指針による教材レビュー](verification/TEACHING_REVIEW.md)：全314単元の確認範囲、図・式・説明の修正、操作検証。

- [検証記録の読み方](verification/README.md)：記録に書かれたコミット・範囲を確認する。
- [読み込み変更の検証](verification/ON_DEMAND_REVIEW.md)：今回の実行結果と測定条件。
- `verification/*REVIEW.md`、`*REPORT.md`：特定の改修グループの記録。
- `review/MATH_EVIDENCE_REVIEW.json`：数学4単元の具体的な対応・残課題。全314単元の承認台帳ではない。
- [旧v2設計](history/ARCHITECTURE-v2.md)、`REVISION-v3.md`、`CHANGELOG.md`、`PR2_REVIEW.md`：過去の設計・変更経緯。

私的な原本PDFはこの公開ドキュメント群に置かない。元の保管場所で管理し、将来ローカルに持ち込む場合は無視対象の`private-notes/`を使う。`.gitignore`は既に追跡されたファイルを非公開にする機能ではないため、追加前に`git check-ignore`と`git ls-files`を確認する。
