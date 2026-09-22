# AI・自然言語処理の個別教材：GAP-122〜132

この文書は作業ブランチ `feat/lesson-specific-experiences` に追加した11単元の範囲を記録します。全314単元の仕上げ完了やmainへの公開反映を意味しません。コードの登録、動作試験、当初の個別計画との一致、目視レビューは別々に扱います。

## 単元ごとの学び方

| 単元 | 操作する対象と対応表示 | 実装範囲・残る制約 |
|---|---|---|
| GAP-122 前処理 | 元の8行、train/test、選んだ行の値、fitした補完値・中心・尺度、変換後を同時に対応表示。testだけの編集ではfit値を変えません。 | 専用画面は平均/中央値・標準化/min-max・カテゴリ辞書。IQRによる抑制と漏れの比較は既存の実計算を使う別章です。外れ値を測定ミスと自動判定しません。 |
| GAP-123 分類 | 同じ48点の境界図で問い合わせ点をクリック・矢印キー・数値入力で変更。線形scoreの各積、木の通過条件を読みます。 | Forestは5本の平均、表示する経路は最初の木だけだと明記。SVMの0/1を確率と扱いません。背景の境界図は12×12の格子で標本化した近似で、全方式の最適化・未知データ評価ではありません。 |
| GAP-124 モデル選択 | trainで学習し、validationで候補を比較し、候補を確定してからtestを開きます。候補と過去の誤差を残します。 | データは固定。testを見た後のリセットや選び直しを独立した最終評価としません。同じ画面で一度見た警告はリセット・取消しでも残し、ページを離れても一般の注意書きは維持します。5-fold検証は別章です。 |
| GAP-125 逆伝播 | 入力、重み付き和、tanh、出力、損失へつながる道を表示。一つの重みを選び、4例の微分の積と平均を読み、一回ずつ更新します。 | 固定2→3→1のtanh/sigmoid実学習。編集する重みの欄は選択箇所・更新回数を含む識別子で、更新済みの数値を古い入力で上書きしません。多数回の学習・学習前の有限差分検査は別章です。 |
| GAP-126 探索 | A*の候補表g/h/fを見て本人が次に展開するマスを選択。展開履歴・親の参照・最終経路を分けます。 | 5×5の固定した正費用格子。同点は番号順。過大見積りで必ず誤るとは説明しません。minimax・N-Queens・計画は既存モデルの異なる図と記録を使う別章で、自由なゲーム操作やQueen配置UIは未追加です。 |
| GAP-127 強化学習 | 行動と報酬の受領、Qの更新を別操作にする。旧Q、報酬、次の最大Q、目標、新Qを残します。 | 固定4×4の格子。方向がずれた場合も選択した行動のQを更新。手動の外乱を確率的なBER等と混同しません。終端では未来のQを加えず、次のepisodeではQを保持します。ε-greedyの連続学習は別章です。 |
| GAP-128 単語境界 | 文の文字間へ区切りを置き、本人の分割と全体の最小費用の道を比較。語の費用と品詞遷移の費用を別に表示します。 | 専用画面は「私は通信を学ぶ」の固定例で辞書編集可。未知語は1文字。手作り費用の最小値を日本語の正解としません。任意文のlatticeとViterbi表は既存計算の別章です。 |
| GAP-129 文書表現 | 語・文書を選び、原文の出現数、df/idf、ベクトル、語ごとの内積の寄与、normとcosineを対応させます。 | 固定4文書。未知語だけならゼロベクトルで方向が未定義と表示。bigramとPPMIは別章です。PPMIの射影を事前学習済みの意味表現と扱いません。 |
| GAP-130 構文 | 本人がSHIFT/LEFT/RIGHTを選び、stack・buffer・head→dependentの辺を組み立てます。 | 固定英語3語、単一ROOTのarc-standard小例。遷移の妥当性と自然な文法の正解は別。CKYとHMMの系列推定は別章で、現在も計算記録と既存描画を利用します。 |
| GAP-131 Attention | Q/K/Vを別々に編集。内積、scaled score、softmax、各Valueの寄与と出力を同時に残し、maskで参照対象を除きます。 | 専用画面は直接与えた2位置×2成分のQ/K/V。入力からの射影、複数head、位置情報、残差、FFNは未学習のtoy blockを使う別章。Attention重みを人間の理由や因果的な重要度と断定しません。 |
| GAP-132 評価 | 混同行列のセルを押して支持する文へ戻る。別章では順位を固定したままkや正解関連を変更しP@k/R@k/APの分母を読みます。 | 分類は小さなNaive Bayes。正解labelを変えることとモデル改善は別。生成文は元の二文とsentence BLEU/ROUGE-L/WERの計算記録で読み、語の対応を直接選択する追加アラインメント画面は未追加です。 |

## ファイルと共通化の境界

計算と状態は `src/experiences-ai-models.js`、`src/experiences-ai-language-models.js`。専用画面は `experiences-ai-widgets.js`、`experiences-ai-decision-widgets.js`、`experiences-ai-language-widgets.js`。文章と章構成は `experiences-ai-lessons.js`、配色・配置は `experiences-ai.css` です。

12種類の専用操作を定義します：`prep-desk`、`classifier-desk`、`holdout-desk`、`gradient-desk`、`search-frontier`、`q-step-desk`、`segmentation-desk`、`word-vector-desk`、`dependency-desk`、`attention-desk`、`classification-evidence`、`retrieval-evidence`。

ライフサイクル、labelと入力の対応、入力保持、誤操作の原子的拒否、取消し・リセットは既存のworkspaceホストを再利用します。そのため内部の属性名は `data-sec-*` ですが、暗号教材の画面やプレーヤーを流用しているわけではありません。計算内容と描画の構成は各専用操作が指定します。

## 守る条件

- 教材はブラウザ内の固定例・公開seed・小規模データで動きます。外部モデルAPIや利用者の学習履歴・ノート保存を追加しません。
- 操作履歴は現在の実験の取消し用だけです。ページの終了で破棄され、過去の学習ダッシュボードには使いません。
- 誤った操作は理由を示し、入力前の状態を変更しません。条件を変えた場合に古い計算結果を現在のものとして残さないようにします。
- ドラッグだけを要求しません。点の選択はクリック・矢印キー・数値入力、表や構造の選択は通常のボタンを使います。
- 全314単元の完了assertionは弱めません。GAP-133〜155と、登録済みページの計画照合・目視による仕上げは引き続き必要です。
- 元の授業ノートやそのページ画像を公開リポジトリへ追加しません。

## 計算・操作を検査する入口

`node --test tests/ai-workspaces.test.mjs` はモデルの期待値・反例・登録と全比較例を検査します。`tests/ai-workspaces-browser.mjs` はコミットされた分離ファイルをHTTP配信し、3画面幅で全章と直接操作を検査します。`.github/workflows/experience-ai-workspaces.yml` はChromium/Firefox/WebKitのread-onlyジョブです。

AIファイルの接続には一回限りの作業用ワークフローで入口を生成しました。これは自分自身を削除してからソースをコミットします。恒久的なテストが実行時にソースを修復したり、検査を通すための教材を生成したりする構成にはしません。

## 参照する一次資料

- scikit-learn公式ドキュメント「Common pitfalls and recommended practices」 https://scikit-learn.org/1.8/common_pitfalls.html ：前処理のfitとtransform、データ漏れ、学習と評価の分離。
- Dive into Deep Learning「Attention Scoring Functions」 https://d2l.ai/chapter_attention-mechanisms-and-transformers/attention-scoring-functions.html ：scaled dot product、softmax、重み付きValue。
- 既存の `curriculum-ai.js` / `curriculum-nlp.js` にある出典・計算範囲を引き続き保持します。固定例の数値結果を一般の性能評価と扱いません。
