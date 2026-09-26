# 現在の構成

HTML・JavaScript・CSSを分離した静的サイトです。全314単元の検索情報だけを最初に読み、教材本文・計算モデル・操作部品は単元選択後に読み込みます。

- 教材の設計基準：[ノートから学ぶ教材設計](pedagogy/TEACHING_GUIDE.md)。
- 配信と依存関係：[必要な教材だけを読む](technical/ON_DEMAND_LOADING.md)。
- 公開：[GitHub Pagesと静的サイト](STATIC_SITE.md)。
- ソースの役割：[src/README.md](../src/README.md)。
- 検証：[tests/README.md](../tests/README.md)。

## 状態の責務

入力と操作からモデルが状態を計算し、その状態を図・数値・説明へ反映します。表示側で別の答えを作りません。単元の移動では実験の状態・タイマー・イベント処理を破棄します。ロード済みのコードと教材定義は同じタブで再利用しますが、学習履歴・進捗・入力値を永続保存しません。

## 正本と生成物

教材・モデルの正本はsrc直下の既存モジュールです。scripts/modules.mjsで完全な評価順を、scripts/delivery.mjsでブラウザーの配信単位を管理します。index.htmlとsrc/generated/はnpm run buildで生成し、直接編集しません。docs/EXPERIMENTS.mdとexperiments.jsonはnpm run inventoryで生成します。

## 既存の画面とURL

#/lab/<id>、?chapter=<id>、?view=classic・experimentを保持します。旧詳細画面も必要になった時点で読み込みます。分類と検索は全単元を対象にし、未ロードの教材も見つけられます。

## 履歴

旧単一HTML構成、当時の144単元、旧ブラウザー試験については[旧v2設計](history/ARCHITECTURE-v2.md)を参照してください。現在の構成や検証件数として扱いません。
