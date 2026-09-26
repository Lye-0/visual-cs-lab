# ソースを探す

既存のファイル名とURLを保ち、役割と依存関係で管理する。物理的な一括移動で既存のテスト・文書・直リンクを壊さない。

| 役割 | ファイル群 |
|---|---|
| 計算と入力の基本契約 | `core.js`、`network.js`、`foundations.js`、`security.js`、`git.js`、`missions.js` |
| 教材の登録・説明・分類 | `catalog.js`、`learning.js`、`pedagogy.js`、`lessons-*.js`、`taxonomy.js` |
| GAP教材の計算と定義 | `curriculum-kit.js`、`curriculum-tools.js`、`curriculum-runtime.js`、分野別`curriculum-*.js` |
| 単元ごとの章と表現 | `experiences-foundations.js`などの分野別定義、`experiences-*-lessons.js` |
| 直接操作の状態・計算 | `experiences-*-models.js`、`*-state.js`、`*-review.js` |
| 直接操作の描画 | `experiences-*-widgets.js`、geometry、objects、communication、math-workbooks |
| 共通ライフサイクル | `experiences-core.js`、`experiences-view.js`、`experiences-workspace.js` |
| 検索・画面・既存詳細実験 | `app.js`、`pages.js`、`curriculum-navigation.js`、`reader.js`、`workbench.js`、`boot.js` |
| 読み込み | `runtime-loader.js`、`generated/`（生成物） |

読み込み順は`scripts/modules.mjs`、初期配信と遅延依存関係は`scripts/delivery.mjs`で管理する。ファイルを追加しただけでは教材に接続されない。生成・表示・操作検証まで確認する。

教材の見せ方を変更する前に[教材設計指針](../docs/pedagogy/TEACHING_GUIDE.md)を読む。
