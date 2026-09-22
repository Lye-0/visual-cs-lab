# セキュリティ個別教材の検証記録

検証したソース：`b1415511d8681b5b4178e504192b45dcfa468318`。
ブランチ：`feat/lesson-specific-experiences`。
この記録は特定のコミットの結果であり、将来の先頭コミットを無条件に成功扱いするものではありません。全314単元の改修完了やmainへの反映を意味しません。

## 今回の13単元・40章

[Security learning workspaces / run 35677635186](https://github.com/Lye-0/visual-cs-lab/actions/runs/35677635186) は3ブラウザとも成功しました。ジョブがcheckoutしたSHA、モデル結果、ブラウザ結果、検査後のsource diffを読み、対象の一致を確認しました。

| 検査 | 成功 | 失敗 | 対象 |
|---|---:|---:|---|
| `security-workspaces.test.mjs` | 50 | 0 | 13単元の登録・全比較例の実計算・独立期待値・誤操作・不変条件 |
| Chromium 153.0.8010.12 | 156 | 0 | 40章×3画面幅＋各幅12の操作検査 |
| Firefox 155.0 | 156 | 0 | 同じ範囲 |
| WebKit 26.6 | 156 | 0 | 同じ範囲 |

ジョブIDは順に Chromium `106587392482`、Firefox `106587392640`、WebKit `106587392737`。画面幅は1440・390・320px、高さ960pxです。モバイル幅とtouch対応のブラウザコンテキストであり、スマートフォン実機の全操作を確認したものではありません。

40章の初期描画だけでなく、専用操作の結果、操作取消し、異常入力の拒否、入力値の保持、キーボードのフォーカス、非同期処理中のリセットと画面移動を検証します。HTTPでコミット済みの分離ファイルを配信し、実行時のソース修復・生成・コミットを行いません。labelの参照、無効な数値の初期値、ページ全体の横はみ出し、404、CSP違反も検査します。

### 計算と状態の検証例

- AES-128はNISTの公開ベクトル2組を照合。41状態×16byteの入力元、ShiftRowsの対応、MixColumnsの項、鍵XORを確認します。
- 秘密分散は法17の全係数を列挙。0片・1片・2片で各秘密に残る多項式数289・17・1を照合し、任意の3片で復元できることも確認します。
- JWTはデコードと検証を別操作として実HMACを計算。本文改変、別audience、expと一致する時刻、許可していない算法を検査します。
- refresh応答だけの喪失、token再使用、family失効、正規の交換を別に検査します。
- 仮想メモリでは、事前拒否でbyteが変わらないこと、canary破損の検出、NXがデータを修復しないこと、番地再利用後の旧ハンドルを検査します。
- コピーのSHA-256、空白一文字の変更、取得hashの固定、不一致コピーの受渡し拒否、連鎖の参照を確認します。

非同期取消しのテストは、本物のHMACの完了を明示的なゲートで遅らせてから解放します。署名結果を成功へ差し替えたり、短い固定sleepだけに依存したりしません。画面側の処理は実際のreduce関数を通ります。

## 以前の検証との回帰確認

同じ `b1415511...` で以下が成功しています。

| ワークフロー | run ID | 結果 |
|---|---|---|
| Network learning workspaces | [35677635117](https://github.com/Lye-0/visual-cs-lab/actions/runs/35677635117) | 3ブラウザとも成功。以前残った信号点のクリック後の矢印キー検査も含む |
| OS and data learning workspaces | [35677635189](https://github.com/Lye-0/visual-cs-lab/actions/runs/35677635189) | 成功 |
| Direct learning workspaces | [35677635146](https://github.com/Lye-0/visual-cs-lab/actions/runs/35677635146) | 成功 |

信号点の本体修正は `615f3b9783f23d98c79d14cb7a1e9cc05c843806` です。試験を外して成功扱いにしたのではなく、クリック後も更新されたSVGへフォーカスが残るようにしました。

## 全体の完了検査はまだ失敗

[Lesson-specific experience review / run 35677635321](https://github.com/Lye-0/visual-cs-lab/actions/runs/35677635321)、job `106587420937` の結果です。

| 全体検査 | 成功 | 失敗 | 失敗の内訳 |
|---|---:|---:|---|
| `npm run check` | 3,631 | 1 | 全314単元の明示定義を要求する検査で280≠314 |
| 新教材の全体ブラウザ検査 | 980 | 70 | GAP-122〜155の34単元×PC/モバイル＝68件、総数照合2件 |

ブラウザの実行時例外一覧は空でした。上の70件は未登録の確認であり、登録済みの70種類の独立した不具合を意味しません。一方、自動検査が成功したことだけで、全ページが最初の個別計画に完全一致したとは判断しません。

実際の登録数は **280単元・479章・494活動**。範囲は既存159単元とGAP-001〜121です。未登録は **GAP-122〜155の34単元**。全314を要求するassertionは変更していません。mainへマージする前に、残る実装と全体検査の成功、個別計画との照合が必要です。

## まだ確認できていないこと

生成したスクリーンショットの目視レビュー、学習者による分かりやすさの評価、全支援技術の読み上げ、Safari実機・スマートフォン実機での確認は未実施です。PNGをCI artifactとして取得できる状態にしたことを、目視済みとは表現しません。

各単元の限定された再現範囲と、まだ汎用の計算・比較表示を使っている箇所は [EXPERIENCE_SECURITY.md](../EXPERIENCE_SECURITY.md) に記載しています。実装コードの登録数、動作試験、教え方の完成判定は別に管理します。

## 再実行

```powershell
node scripts/build.mjs --check
node --test tests/security-workspaces.test.mjs
npm install --no-save --package-lock=false --ignore-scripts playwright@1.63.0
npx playwright install chromium firefox webkit
$env:BROWSER = "chromium"
node tests/security-workspaces-browser.mjs
$env:BROWSER = "firefox"
node tests/security-workspaces-browser.mjs
$env:BROWSER = "webkit"
node tests/security-workspaces-browser.mjs
```

CIのLinux環境ではbrowser installに `--with-deps` を付けます。サイトの起動・公開にPlaywrightは不要です。ブラウザ検査の結果は `review-output/security-<engine>.json`、各画面のPNGは `review-output/security-screenshots/` です。
