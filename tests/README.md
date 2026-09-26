# 検証を選ぶ

| 目的 | 実行 |
|---|---|
| 生成物の一致・計算・状態・登録・ローカルサーバー | `npm run check` |
| 全314単元の初回読み込み・画面移動中の完了・失敗後再試行 | `npm run test:loading` |
| 分離配信・公開パス・代表教材と既存詳細画面 | `npm run test:static` |
| 全章・1440/390/320px | `node tests/full-learning-audit.mjs` |
| 途中式・図表の選択・再計算・章の対象 | `node tests/teaching-evidence-browser.mjs` |
| Git専用操作 | `node tests/git-review-workspaces-browser.mjs` |
| DB専用操作 | `node tests/database-review-workspaces-browser.mjs` |
| その他の分野 | `*workspaces*browser.mjs`、`math-*.mjs`など対象を選ぶ |

ブラウザー検査にはPlaywrightと対応ブラウザーを準備する。`BROWSER=chromium`（既定）・`firefox`・`webkit`で切り替える。成果物はGit無視対象の`review-output/`へ出る。

全集合の列挙は`lesson-fixtures.mjs`で行う。ブラウザー内の`CSL.experiences`はロードした単元の集合なので、初期画面で314件あることを要求しない。各ルートの実際の読み込みと描画を検証する。

`on-demand-browser.mjs`は自分でローカルサーバーを起動する。既存サーバーを使う場合のみ`BASE_URL`を指定する。`ONLY`は調査時の単元IDのカンマ区切り指定で、全体検証では設定しない。

自動検証の成功と、図・式・理由の分かりやすさの目視承認を分ける。過去のレポートは記載コミットの証跡であり、現在の完成を証明するものではない。
