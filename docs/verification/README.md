# 検証記録の読み方

チェックイン済みのレポートは、必ず記載された `sourceCommit` に対する過去の検証です。現在のPRやブランチの合否と混同しないでください。

最新の合否は対象コミットの Actions / PR Checks で確認します。`curriculum-verification-evidence-*` と `visual-cs-lab-review-*` アーティファクトには、その実行で検査したSHA、数値・ブラウザ・回帰試験の生結果が含まれます。

- `Curriculum integration and verification` はPRのhead SHAを固定して検証します。
- `Lesson review` はPRイベントではGitHubのマージ予定コミットを検証します。
- どちらも `contents: read` です。検証のためにソースを修復したり、ブランチへコミット・pushしたりしません。
- HTMLと単元一覧はチェックイン済みソースから作業ディレクトリにビルドします。これはソースを変更する移行処理とは別です。
- 古い失敗を現在の状態として見せていた `curriculum-status.json` は削除しました。履歴上の失敗はGit履歴・当時のActionsに残っています。

`CURRICULUM_REPORT.md` / `curriculum.json` は `b16714e` での拡張時の検証記録です。PR #2のレビュー対応後の結果は、PR Checksと `docs/PR2_REVIEW.md` を確認してください。
