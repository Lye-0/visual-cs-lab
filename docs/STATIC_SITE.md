# 分離した静的サイトとブラウザ互換性

## 公開されるファイル

`index.html`は入口のマークアップとCSS／JavaScriptへの相対参照だけを持ちます。`src/*.js`と`src/*.css`をそのまま編集・テスト・公開するため、同じコードを巨大なHTMLや別の配布フォルダへ二重に保持しません。faviconは`assets/favicon.svg`です。

JSの依存順・CSSのカスケード順は`scripts/modules.mjs`に保ち、`scripts/site-entry.mjs`から小さな入口を生成します。classic scriptへ`defer`を指定し、bootは全てのdeferスクリプトの評価が終わるDOMContentLoadedを待ちます。非同期ダウンロードの完了順を実行順として使いません。

URLはすべて`./src/...`などの相対パスです。`https://example.test/`と`https://example.test/visual-cs-lab/`の両方で動作します。単元URLは`#/lab/...`を維持し、PagesにSPAのrewriteや404ページを要求しません。

分離だけで教材の総転送量が減ったり、遅延読み込みになったりするわけではありません。今回は現在の全教材を順序どおり読み込み、変更範囲を公開形式と互換性に限定しています。

## セキュリティポリシー

JavaScriptは`script-src 'self'`で同じ公開元からのみ読み込みます。inline scriptとinlineイベントハンドラー、`eval`を許可しません。動的な図の色・位置・実DOMの教材にはstyle属性が必要なため、CSSのみ`'self' 'unsafe-inline'`を許可します。外部通信は`connect-src 'none'`、フォームの送信先への遷移は`form-action 'none'`のままです。利用者が入力したプログラムは従来どおり教材の専用パーサと実行器で扱います。

## GitHub Pages

**Settings → Pages → Source: Deploy from a branch → main → /(root)** を選びます。`.nojekyll`をrootへ置き、Jekyllによる変換を必要としない静的ファイルとして公開します。公開時にnpmの実行は不要です。

リポジトリにある独自Actionsは検証用です。Pagesデプロイ用Actionsは追加していません。テストの失敗はブランチ公開自体を自動で止めないため、公開前にChecksを確認してください。Pagesの設定は管理画面の設定であり、`.nojekyll`だけでは公開元を変更しません。

## 提示された互換性診断への対応

| 診断 | 対応と理由 |
|---|---|
| backdrop-filter | WebKit用の接頭辞を先に宣言。非対応環境では濃い背景へ切り替え、ぼかしなしでも読めるようにする。Safari 18では非接頭辞版が導入済みなので、Safari全版が未対応という診断は現在の対応状況とは区別する。 |
| user-select | 必要な箇所に`-webkit-user-select`を先に記載。 |
| appearance / print-color-adjustの順序 | 接頭辞つきを先、標準版を後に統一する。 |
| meta theme-color | 対応ブラウザの外枠を着色する補助情報。非対応では無視されるため、教材の修正理由にはせず残す。 |
| scrollbar-color / scrollbar-width | 表示の追加指定として残す。非対応ならネイティブのスクロールバーへ自然に戻り、スクロール機能を維持する。未対応とする古い互換性データと、現在の対応は区別する。 |

今回のprefix追加は古いSafariで一部の表示を改善するもので、サイト全体がSafari 9などで動作するという保証ではありません。現行のJavaScript、SVG、Web Cryptoなどの要件は別です。Edge Toolsの診断を一括で無効にする設定は設けていません。

## 検証

`tests/static-site.test.mjs`では外部参照・順序・全アセットの存在・相対パス・CSP・CSS宣言順・入口の再生成一致を検査します。

`tests/static-site-browser.mjs`では実HTTP文書をルートと`/visual-cs-lab/`から開き、56本のJSと9本のCSSを読み込むこと、全314教材の登録、主要単元の直接アクセス・初期化・比較・巻戻し、ネットワークSVGの配色、DOMと取り消し操作、ぼかしとスクロールのフォールバックを検査します。最後のdeferスクリプトを意図的に遅らせる試験も含みます。

静的互換性ActionsではChromium・Firefox・WebKitを使用します。全314単元の網羅的な既存試験はChromiumで継続します。各エンジンの主要画面の試験と、各エンジンで全教材の全操作を保証することは別です。WebKitはSafari実機の試験ではありません。実行したSHAと結果は該当ActionsのArtifactsに残します。

## 参照した公式資料

- [GitHub Pagesの公開元](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub Pagesと.nojekyll](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Safari 18のBackdrop Filter](https://webkit.org/blog/15865/webkit-features-in-safari-18-0/)
- [MDN: user-select](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/user-select)
- [MDN: scrollbar-color](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scrollbar-color)
- [MDN: scrollbar-width](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scrollbar-width)
- [webhint: Prefixed CSS first](https://webhint.io/docs/user-guide/hints/hint-css-prefix-order/)

過去の単一HTML版のレポートは、その中に記載されたコミット時点の履歴資料です。現在の分離版の成果として古い件数を流用しません。
