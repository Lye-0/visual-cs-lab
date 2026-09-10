# スクロールバーの外観

`src/scrollbars.css`を最後に読み込み、サイドバーの実際のスクロール領域（`.sidebar > nav`）、テーマ一覧、図、コード入力欄、表、検索画面を共通の配色にします。教材の計算や分類、スクロール処理のJavaScriptは変更していません。

マウスなど精密なポインターでは、背景になじむ透明なトラックと青みのあるグレーのつまみを使用します。Chromium / WebKitでは全幅10px・透明な縁2pxずつ・見えるつまみ6pxの丸い形にし、上下の矢印ボタンを除去します。つまみのホバーは控えめなミント、ドラッグ中はサイトのアクセント色です。非ホバー時もつまみを透明にしていません。

Firefoxなどでは標準の`scrollbar-width: thin`と`scrollbar-color`で細さと配色を揃えます。角丸・矢印・厳密なピクセル幅はブラウザの描画に従います。精密なポインターがないタッチ端末と強制配色では、OSの標準表示を優先します。`prefers-contrast: more`ではつまみを明るくします。スクロールバーをDOMやJavaScriptで再実装せず、ホイール・タッチ・ドラッグ・キーボードは従来のブラウザ機能を使います。

標準の`scrollbar-color`が`auto`以外の場合、Chromiumや最近のWebKitでは`::-webkit-scrollbar-*`の外観が優先されません。対応エンジンでは標準プロパティを`auto`へ戻してから疑似要素を指定し、古いコンポーネントの配色指定や継承にも対処しています。

## 検証

`tests/scrollbars.test.mjs`は読み込み順、スクロールを隠さないこと、主なダーク背景とのコントラストを確認します。`tests/scrollbars-browser.mjs`は実HTTP文書の計算済みスタイル、サイドバーのホイール・キーボード、横方向のスクロール、強制配色とモバイル幅を検査します。実行結果とスクリーンショットはStatic site compatibilityのArtifactsに保存します。WebKit自動試験はSafari実機試験とは区別します。

FirefoxのPlaywright用headlessモードには、スクロールバーを隠す`scrollbar-width: none !important`のエージェントスタイルが入ります。この外観テストだけはFirefoxをheadedモードで起動し、LinuxのCIでは`xvfb-run -a`の仮想画面で実行します。サイトのCSSを強制上書きしたり、`none`を成功扱いにすることはしません。Chromiumでも自動化用の`--hide-scrollbars`を除外します。通常の教材試験のheadless設定は変えません。

ローカル実行はPlaywright導入後に`BROWSER=firefox xvfb-run -a node tests/scrollbars-browser.mjs`（Linux）。WindowsのPowerShellでは`$env:BROWSER='firefox'; node tests/scrollbars-browser.mjs`で実際のFirefoxウィンドウを使います。

参考:
- https://developer.chrome.com/docs/css-ui/scrollbar-styling
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scrollbar-color
- https://github.com/microsoft/playwright/blob/main/browser_patches/firefox/juggler/components/Juggler.js
- https://github.com/microsoft/playwright/blob/main/browser_patches/firefox/juggler/content/hidden-scrollbars.css
