/* Unit-level introductions and concrete, executable comparisons for every lab. */
(() => {
'use strict';
const metadata = {
  "c01-bits": {
    "unit": "2進数と符号付き整数",
    "summary": "ビットを切り替え、同じ0と1を符号なし整数と2の補数で読み比べます。",
    "observe": "最上位ビットを変えたとき、2通りの読み方のどちらが負になるかを見ます。",
    "patch": {
      "value": 170
    },
    "label": "最上位ビットを1にする"
  },
  "c01-float": {
    "unit": "浮動小数点と丸め誤差",
    "summary": "小数を32ビットで保存し、元の数と保存後の数の差を確かめます。",
    "observe": "0.1と0.5で、保存後の値と誤差を比べます。",
    "patch": {
      "value": 0.5
    },
    "label": "0.5を保存する"
  },
  "c01-utf8": {
    "unit": "文字コードとUTF-8",
    "summary": "文字・コードポイント・バイト列を並べ、文字ごとのデータ量を調べます。",
    "observe": "A、あ、絵文字の行で、文字の数ではなくバイト数に注目します。",
    "patch": {
      "text": "ABCあいう🔒"
    },
    "label": "文字の種類を増やす"
  },
  "c01-huffman": {
    "unit": "ハフマン符号と圧縮",
    "summary": "文字の出現頻度から符号を作り、圧縮する前後のビット数を比べます。",
    "observe": "頻度が偏る場合と均等な場合で、符号の長さがどう変わるかを見ます。",
    "patch": {
      "text": "ABCDEABCDEABCDE"
    },
    "label": "出現頻度を均等にする"
  },
  "c01-hamming": {
    "unit": "ハミング符号と誤り訂正",
    "summary": "送信データの1ビットを反転し、検査から誤りの位置を求める手順を追います。",
    "observe": "誤りを入れない場合と、指定した位置を反転した場合の検査結果を比べます。",
    "patch": {
      "flip": 0
    },
    "label": "ビットを反転しない"
  },
  "c02-set": {
    "unit": "集合の和・積・差",
    "summary": "2つの集合の要素を操作し、共通部分と全体の集まりを区別します。",
    "observe": "共通する要素だけでなく、片方だけにある要素が結果に入るかを見ます。",
    "patch": {
      "op": "union"
    },
    "label": "和集合に切り替える"
  },
  "c02-dfa": {
    "unit": "有限オートマトンと状態遷移",
    "summary": "0と1を順番に読み、少数の状態だけで1の個数の偶奇を判断します。",
    "observe": "末尾に1を加えると最終状態と受理の判定がどう変わるかを見ます。",
    "patch": {
      "input": "1011011"
    },
    "label": "末尾に1を追加する"
  },
  "c03-matrix": {
    "unit": "行列と線形変換",
    "summary": "行列の4つの値を変え、基底と図形が移る位置を観察します。",
    "observe": "縦の基底を0にしたとき、図形の面積と行列式を見ます。",
    "patch": {
      "b": 0,
      "d": 0
    },
    "label": "縦方向をつぶす"
  },
  "c03-derivative": {
    "unit": "微分と差分近似",
    "summary": "2点の間隔を狭め、割線の傾きがどこへ近づくかを調べます。",
    "observe": "位置xはそのままにし、間隔hだけ変えたときの近似誤差を比べます。",
    "patch": {
      "h": 0.01
    },
    "label": "2点の間隔を小さくする"
  },
  "c03-integral": {
    "unit": "数値積分と台形則",
    "summary": "区間を小さな台形に分け、面積の合計と解析的な値を比べます。",
    "observe": "積分する区間を固定し、分割数を増やしたときの誤差を見ます。",
    "patch": {
      "n": 20
    },
    "label": "台形の数を増やす"
  },
  "c03-probability": {
    "unit": "確率と繰り返し試行",
    "summary": "同じ確率で試行を繰り返し、観測された割合のばらつきを見ます。",
    "observe": "確率と回数を変えずseedだけ変え、別の試行列を比べます。",
    "patch": {
      "seed": 17
    },
    "label": "別の試行列を作る"
  },
  "c03-bayes": {
    "unit": "条件付き確率とベイズの定理",
    "summary": "対象の割合と検知性能を変え、陽性だったものの内訳を調べます。",
    "observe": "検知率が同じでも、対象の割合で陽性の内訳が変わるかを見ます。",
    "patch": {
      "base": 10
    },
    "label": "対象の割合を増やす"
  },
  "c04-trace": {
    "unit": "変数・繰り返し・条件分岐",
    "summary": "短いプログラムを1行ずつ実行し、条件を満たしたときの変数の変化を追います。",
    "observe": "どの数が加算され、どの数が飛ばされるかをコードと変数で確かめます。",
    "patch": {
      "divisor": 2
    },
    "label": "偶数だけを足す"
  },
  "c04-recursion": {
    "unit": "再帰とコールスタック",
    "summary": "階乗を計算し、関数を呼ぶ段階と結果を返す段階を分けて観察します。",
    "observe": "呼び出しが増える場面と、結果が戻ってスタックが減る場面を見ます。",
    "patch": {
      "n": 3
    },
    "label": "小さい階乗を求める"
  },
  "c04-eventloop": {
    "unit": "JavaScriptのイベントループ",
    "summary": "同期処理・マイクロタスク・タイマーが処理される順序を追います。",
    "observe": "Promise側の処理を増やしたとき、タイマーの出力位置を見ます。",
    "patch": {
      "microtasks": 4
    },
    "label": "Promiseの処理を増やす"
  },
  "c05-stack": {
    "unit": "スタックとLIFO",
    "summary": "データを積み、後から入れたものから取り出す様子を操作します。",
    "observe": "取り出す個数を増やし、末尾の値から消えていく順番を見ます。",
    "patch": {
      "remove": 3
    },
    "label": "3個取り出す"
  },
  "c05-queue": {
    "unit": "キューとFIFO",
    "summary": "データを追加し、先に入れたものから取り出す様子を操作します。",
    "observe": "スタックとの違いを、取り出された値と残った順番で確認します。",
    "patch": {
      "remove": 3
    },
    "label": "3個取り出す"
  },
  "c05-bst": {
    "unit": "二分探索木と挿入順",
    "summary": "値の大小で枝を選びながら木を作り、挿入順による形の違いを見ます。",
    "observe": "昇順で挿入したとき、木が片側へ偏るかを見ます。",
    "patch": {
      "values": "1,2,3,4,5,6,7,8"
    },
    "label": "昇順で挿入する"
  },
  "c05-heap": {
    "unit": "最小ヒープ",
    "summary": "値を追加し、親子の大小関係を保つ入れ替えを追います。",
    "observe": "根が最小になることと、配列全体が整列することを区別します。",
    "patch": {
      "values": "9,8,7,6,5,4,3,2,1"
    },
    "label": "小さい値を後から入れる"
  },
  "c05-hash": {
    "unit": "ハッシュ表と衝突",
    "summary": "整数を保存するバケットを求め、同じ場所に集まった値を観察します。",
    "observe": "バケット数だけを変え、衝突する値の組み合わせを比べます。",
    "patch": {
      "size": 7
    },
    "label": "バケット数を7にする"
  },
  "c06-sort": {
    "unit": "ソートと処理回数",
    "summary": "配列を並べ替える途中の比較・移動を見て、手法ごとの処理を比べます。",
    "observe": "同じ配列で、比較回数と入れ替えの手順を比べます。",
    "patch": {
      "algorithm": "insertion"
    },
    "label": "挿入ソートで試す"
  },
  "c06-search": {
    "unit": "線形探索と二分探索",
    "summary": "並んだデータから値を探し、調べた位置と候補の減り方を追います。",
    "observe": "同じ値を探すとき、何回の比較が必要になるかを比べます。",
    "patch": {
      "method": "linear"
    },
    "label": "先頭から順に探す"
  },
  "c06-graph": {
    "unit": "幅優先探索と深さ優先探索",
    "summary": "グラフの頂点を訪ねる順番を変え、探索の進み方を比べます。",
    "observe": "未処理の頂点と訪問順が、BFSとDFSでどう違うかを見ます。",
    "patch": {
      "method": "DFS"
    },
    "label": "深さ優先で探索する"
  },
  "c06-dp": {
    "unit": "動的計画法・ナップサック",
    "summary": "小さな容量の答えを再利用し、荷物の価値を最大化する表を埋めます。",
    "observe": "容量を変えたとき、最適値と再利用された表の位置を見ます。",
    "patch": {
      "capacity": 5
    },
    "label": "容量を小さくする"
  },
  "c07-compiler": {
    "unit": "字句解析と構文木",
    "summary": "算術式をトークンと木に分け、演算の順序が決まる過程を追います。",
    "observe": "括弧を入れたときの木の形と、最終的な計算結果を比べます。",
    "patch": {
      "code": "(2 + 3) * 4"
    },
    "label": "括弧を追加する"
  },
  "c08-gate": {
    "unit": "論理ゲートと真理値表",
    "summary": "入力スイッチとゲートを変え、出力と真理値表の対応を確認します。",
    "observe": "同じANDゲートで入力Bだけを変え、該当する行と出力を見ます。",
    "patch": {
      "b": true
    },
    "label": "入力Bを1にする"
  },
  "c08-adder": {
    "unit": "全加算器と繰り上がり",
    "summary": "1ビットの入力と繰り上がりを足し、和と次の桁への出力を調べます。",
    "observe": "繰り上がり入力を追加したとき、和のビットと出力桁を見ます。",
    "patch": {
      "carry": true
    },
    "label": "繰り上がりを入れる"
  },
  "c09-cpu": {
    "unit": "CPUの命令実行とレジスタ",
    "summary": "教材用の命令を読み、計算した値がレジスタやメモリへ移る過程を追います。",
    "observe": "最初の定数を変え、ADDとSTOREの後の値を確かめます。",
    "patch": {
      "code": "MOV R1, 10\nMOV R2, 8\nADD R3, R1, R2\nSTORE R3, 16\nHALT"
    },
    "label": "R1の初期値を10にする"
  },
  "c09-pipeline": {
    "unit": "命令パイプライン",
    "summary": "複数の命令の実行段階を重ね、全体のサイクル数を比べます。",
    "observe": "同じ命令数で、重ねる場合と順番に終わらせる場合を比べます。",
    "patch": {
      "pipeline": false
    },
    "label": "重ねずに実行する"
  },
  "c09-cache": {
    "unit": "キャッシュ・インデックス・タグ",
    "summary": "アドレスを順番に読み、キャッシュのヒットと置き換えを観察します。",
    "observe": "ライン数を増やすと、同じアドレス列の衝突とミスがどう変わるかを見ます。",
    "patch": {
      "lines": 8
    },
    "label": "キャッシュを広げる"
  },
  "c10-pointer": {
    "unit": "ポインタ・アドレス・参照先",
    "summary": "メモリの位置を指す値と、そこに保存された値を分けて追います。",
    "observe": "解放した場所を参照したとき、通常の書き込みとどう違うかを見ます。",
    "patch": {
      "free": true
    },
    "label": "解放後に参照する"
  },
  "c10-pages": {
    "unit": "仮想メモリとページ置換",
    "summary": "ページを参照し、限られた物理フレームで何を残すかを比較します。",
    "observe": "同じ参照列で、FIFOとLRUの置き換え対象とフォルト数を比べます。",
    "patch": {
      "policy": "FIFO"
    },
    "label": "FIFOで置き換える"
  },
  "c10-allocation": {
    "unit": "動的メモリ確保と断片化",
    "summary": "領域の確保・解放を行い、空きの合計と連続した空きの違いを見ます。",
    "observe": "領域の解放で空きの合計・連続した空き・確保失敗がどう変わるかを見ます。",
    "patch": {
      "release": false
    },
    "label": "途中の領域解放を止める"
  },
  "c11-scheduler": {
    "unit": "CPUスケジューリング",
    "summary": "複数の仕事をCPUに割り当て、実行順と待ち時間を比較します。",
    "observe": "同じ仕事量でRRとFCFSの実行順、終了までの時間を見ます。",
    "patch": {
      "policy": "FCFS"
    },
    "label": "到着順に実行する"
  },
  "c11-files": {
    "unit": "ファイル・inode・ブロック",
    "summary": "名前とファイル情報、保存先のブロックを分けて観察します。",
    "observe": "名前の数を減らしたとき、ブロック数と参照の対応を見ます。",
    "patch": {
      "links": 1
    },
    "label": "ハードリンクを1つにする"
  },
  "c12-race": {
    "unit": "競合状態と排他制御",
    "summary": "共有値を更新する処理を重ね、読み出しと書き込みの順番を変えます。",
    "observe": "排他制御を入れた場合の最終値と、処理の重なり方を比べます。",
    "patch": {
      "lock": true
    },
    "label": "排他制御を入れる"
  },
  "c12-deadlock": {
    "unit": "デッドロックとロック順序",
    "summary": "互いの資源を待つ状態を作り、待ちの輪ができる条件を見ます。",
    "observe": "ロック順を統一したとき、待ちの輪が解消されるかを見ます。",
    "patch": {
      "order": true
    },
    "label": "取得順を統一する"
  },
  "c12-quorum": {
    "unit": "複製とクォーラム",
    "summary": "複数のノードを停止させ、過半数を集められるかを確認します。",
    "observe": "停止台数が増えたとき、必要な数と応答できる数を比べます。",
    "patch": {
      "failed": 3
    },
    "label": "3台を停止する"
  },
  "c14-index": {
    "unit": "データベースの索引",
    "summary": "条件に合う行を検索し、索引を使う場合と全件を見る場合を比べます。",
    "observe": "結果の行が同じでも、調べた行や値の数が変わるかを見ます。",
    "patch": {
      "index": false
    },
    "label": "索引を使わず検索する"
  },
  "c14-join": {
    "unit": "SQLのINNER JOIN・LEFT JOIN",
    "summary": "2つの表を対応付け、結合相手がない行の扱いを調べます。",
    "observe": "一致する相手がない行が、どちらの結合で結果に残るかを見ます。",
    "patch": {
      "join": "INNER"
    },
    "label": "INNER JOINで結合する"
  },
  "c14-bplus": {
    "unit": "B+木の挿入と分割",
    "summary": "キーを挿入し、葉がいっぱいになったときの分割を追います。",
    "observe": "挿入の途中で葉と上位の区切りが変わる場面に注目します。",
    "patch": {
      "values": "1,2,3,4,5,6,7,8,9,10,11"
    },
    "label": "昇順でキーを追加する"
  },
  "c14-transaction": {
    "unit": "トランザクションと更新消失",
    "summary": "同じ値を読む2つの更新を実行し、片方の変更が失われる状況を比較します。",
    "observe": "直列化したとき、各処理が読む値と最後の値を比べます。",
    "patch": {
      "serial": true
    },
    "label": "更新を直列化する"
  },
  "c16-git": {
    "unit": "Git：編集・ステージ・コミット",
    "summary": "仮想リポジトリで、作業ファイル・ステージ・コミットを並べて操作します。",
    "observe": "コミット後に追加で編集したとき、どの領域だけが変わるかを見ます。",
    "patch": {
      "script": "edit notes.txt \"hello\"\nadd .\ncommit \"最初の変更\"\nedit notes.txt \"uncommitted\""
    },
    "label": "コミット後にもう一度編集する"
  },
  "c16-reset": {
    "unit": "Git：soft・mixed・hard reset",
    "summary": "履歴の位置を戻し、作業ファイルとステージが残る範囲を比べます。",
    "observe": "同じ履歴でsoftとhardを比べ、各領域の中身を見ます。",
    "patch": {
      "script": "edit notes.txt \"hello\"\nadd .\ncommit \"最初の変更\"\nedit notes.txt \"second\"\nadd .\ncommit \"次の変更\"\nreset --hard HEAD~1"
    },
    "label": "hard resetと比較する"
  },
  "c16-branches": {
    "unit": "Git：ブランチとマージ",
    "summary": "枝で作業し、別の枝の変更を合流させる手順を追います。",
    "observe": "コミット前後でブランチの指す場所と、合流後の親を見ます。",
    "patch": {
      "script": "branch feature\nswitch feature\nedit feature.txt \"new feature\"\nadd .\ncommit \"機能を追加\"\nswitch main\nmerge feature"
    },
    "label": "mainが進まない場合を試す"
  },
  "c16-rebase": {
    "unit": "Git：rebase",
    "summary": "分岐後のコミットを別の基点へ作り直し、親と参照の移動を見ます。",
    "observe": "合流する方法を変え、コミットの親子関係がどう異なるかを見ます。",
    "patch": {
      "script": "branch feature\nswitch feature\nedit feature.txt \"new feature\"\nadd .\ncommit \"機能を追加\"\nswitch main\nedit main.txt \"main update\"\nadd .\ncommit \"mainを更新\"\nswitch feature\nmerge main"
    },
    "label": "mergeと比較する"
  },
  "c16-remote": {
    "unit": "Git：fetch・pull・push",
    "summary": "仮想リモートとローカルを分け、取得・取り込み・送信で変わる場所を見ます。",
    "observe": "fetchだけではどの参照が更新され、作業ファイルはどうなるかを見ます。",
    "patch": {
      "script": "remote-edit main remote.txt \"remote update\"\nfetch\nstatus"
    },
    "label": "fetchだけで止める"
  },
  "c16-undo": {
    "unit": "Git：revertとamend",
    "summary": "直前のコミットの作り直しと、変更を打ち消す新規コミットを比べます。",
    "observe": "amendまでで止めた場合と、revertを追加した場合の履歴を見ます。",
    "patch": {
      "script": "edit notes.txt \"hello\"\nadd .\ncommit \"最初の変更\"\nedit extra.txt \"append\"\nadd .\namend \"内容を修正\""
    },
    "label": "amendまでで止める"
  },
  "c17-regression": {
    "unit": "線形回帰と勾配降下法",
    "summary": "直線をデータへ近づけ、更新幅による学習の進み方を観察します。",
    "observe": "同じデータと更新回数で、学習率だけを小さくした結果を比べます。",
    "patch": {
      "rate": 0.05
    },
    "label": "学習率を小さくする"
  },
  "c17-kmeans": {
    "unit": "k-meansクラスタリング",
    "summary": "点をグループへ割り当て、重心の更新を繰り返します。",
    "observe": "グループ数だけを変えたとき、境界と重心の場所を見ます。",
    "patch": {
      "k": 2
    },
    "label": "2グループに分ける"
  },
  "c18-sampling": {
    "unit": "標本化とエイリアシング",
    "summary": "連続した波を点で記録し、点の密度と見える波の関係を調べます。",
    "observe": "信号の周波数を固定し、標本数を減らしたときの波の見え方を比べます。",
    "patch": {
      "samples": 8
    },
    "label": "標本数を減らす"
  },
  "c18-fourier": {
    "unit": "離散フーリエ変換",
    "summary": "信号を周波数成分へ分解し、強い成分がどこに現れるかを見ます。",
    "observe": "周波数を変えたとき、スペクトルのピークがどこへ動くかを見ます。",
    "patch": {
      "frequency": 8
    },
    "label": "信号を8Hzにする"
  },
  "c18-filter": {
    "unit": "移動平均フィルタ",
    "summary": "周りの点を平均し、信号の細かい変化がどう変わるかを見ます。",
    "observe": "平均する範囲を広げたとき、なめらかさと細部の両方を見ます。",
    "patch": {
      "radius": 4
    },
    "label": "平均する範囲を広げる"
  },
  "c18-projection": {
    "unit": "3D座標と透視投影",
    "summary": "立体の向きと視点の距離を変え、2D画面への写り方を観察します。",
    "observe": "視点の距離を固定して回転させ、頂点と辺の位置を見ます。",
    "patch": {
      "angle": 80
    },
    "label": "立体を回転させる"
  },
  "c19-pid": {
    "unit": "フィードバックとPID制御",
    "summary": "目標との差を使って制御し、位置の変化や行き過ぎを見ます。",
    "observe": "他の値を固定し、Pゲインだけを大きくしたときの応答を比べます。",
    "patch": {
      "kp": 10
    },
    "label": "Pゲインを大きくする"
  },
  "c20-contrast": {
    "unit": "色のコントラストと読みやすさ",
    "summary": "文字と背景を変え、コントラスト比と見え方を同時に確認します。",
    "observe": "文字色だけを暗くし、数値の変化と実際の読みやすさを比べます。",
    "patch": {
      "foreground": "#46505e"
    },
    "label": "文字色を暗くする"
  },
  "c20-privacy": {
    "unit": "データ収集とプライバシー",
    "summary": "位置情報や共有範囲、保持期間を変え、利用目的と影響を比較します。",
    "observe": "位置情報を集めない設定で、残る利益とリスクを見ます。",
    "patch": {
      "location": false
    },
    "label": "精密な位置情報を集めない"
  },
  "n01-packet": {
    "unit": "通信の階層とカプセル化",
    "summary": "メッセージに各層のヘッダーが付く過程を追い、それぞれの役割を分けます。",
    "observe": "TCPとUDPで、付く情報とデータ量の違いを見ます。",
    "patch": {
      "protocol": "UDP"
    },
    "label": "UDPに切り替える"
  },
  "n02-signal": {
    "unit": "伝送時間・伝搬時間・通信誤り",
    "summary": "データ量、回線速度、距離を操作し、待ち時間の理由を分けます。",
    "observe": "距離を変えず回線速度だけを上げ、どの時間が短くなるかを見ます。",
    "patch": {
      "bandwidth": 100
    },
    "label": "回線速度を上げる"
  },
  "n02-crc": {
    "unit": "CRCと誤り検出",
    "summary": "ビット列の検査用情報を計算し、転送中の反転を検出します。",
    "observe": "反転なしと反転ありで、受信側の割り算の余りを比べます。",
    "patch": {
      "flip": 0
    },
    "label": "データを反転させない"
  },
  "n03-switch": {
    "unit": "EthernetとMACアドレス学習",
    "summary": "スイッチが送信元を覚え、宛先に応じて転送先を選ぶ過程を見ます。",
    "observe": "宛先のMACを知っている場合と知らない場合の転送先を比べます。",
    "patch": {
      "learned": true
    },
    "label": "MACを学習済みにする"
  },
  "n04-subnet": {
    "unit": "IPv4とサブネット",
    "summary": "アドレスの区切りを変え、同一ネットワークかどうかを確かめます。",
    "observe": "同じ2台のIPで、/24と/16のネットワーク部分を比べます。",
    "patch": {
      "prefix": 16
    },
    "label": "プレフィックスを/16にする"
  },
  "n05-arp": {
    "unit": "ARPと次の宛先",
    "summary": "IPv4から同一リンク上のMACを調べ、キャッシュの役割を確認します。",
    "observe": "記録がある場合、問い合わせが省略されるかを見ます。",
    "patch": {
      "cached": true
    },
    "label": "ARPキャッシュを使う"
  },
  "n05-dhcp": {
    "unit": "DHCPのアドレス割り当て",
    "summary": "端末がアドレスを要求する流れと、割り当てられる数の制限を調べます。",
    "observe": "端末数を変えず、アドレス数を増やしたときの成功・失敗を見ます。",
    "patch": {
      "pool": 8
    },
    "label": "割り当て可能数を増やす"
  },
  "n06-ipv6": {
    "unit": "IPv6の表記とプレフィックス",
    "summary": "省略されたIPv6を展開し、128ビットの区切りを確認します。",
    "observe": "アドレスを固定し、プレフィックス長だけ変えて共通部分を見ます。",
    "patch": {
      "prefix": 48
    },
    "label": "プレフィックスを/48にする"
  },
  "n07-vlan": {
    "unit": "VLANとネットワーク分割",
    "summary": "同じスイッチの端末を別のVLANに分け、通信可能な範囲を調べます。",
    "observe": "同じVLANにそろえたとき、ルーティングなしで届くかを見ます。",
    "patch": {
      "b": 10
    },
    "label": "2台を同じVLANにする"
  },
  "n07-stp": {
    "unit": "STPと冗長リンク",
    "summary": "ループを避けるリンクの選択と、接続が切れたときの再構成を追います。",
    "observe": "リンク切断後、どの線が使われるかを見ます。",
    "patch": {
      "cut": true
    },
    "label": "リンクを1本切断する"
  },
  "n08-routing": {
    "unit": "経路選択とリンクコスト",
    "summary": "接続のコストを変え、パケットが通る経路を計算します。",
    "observe": "1本のコストだけを高くし、選ばれる道と合計値を比べます。",
    "patch": {
      "cost": 12
    },
    "label": "近道のコストを上げる"
  },
  "n08-prefix": {
    "unit": "ルーティングの最長一致",
    "summary": "宛先と複数の経路を照合し、最も長く一致するプレフィックスを選びます。",
    "observe": "宛先を変え、どの経路の一致が最後まで残るかを見ます。",
    "patch": {
      "destination": "10.2.3.4"
    },
    "label": "宛先を別の範囲にする"
  },
  "n08-bgp": {
    "unit": "BGPと経路選択ポリシー",
    "summary": "経路の長さだけでなく、優先方針が接続先の選択に与える影響を見ます。",
    "observe": "LOCAL_PREFを下げたとき、選択されるISPを比べます。",
    "patch": {
      "preference": 80
    },
    "label": "ISP-Aの優先度を下げる"
  },
  "n09-dns": {
    "unit": "DNSとキャッシュの有効期限",
    "summary": "名前の問い合わせとキャッシュを使い分け、情報の更新が見える時点を調べます。",
    "observe": "保存からの時間がTTLを越えたとき、参照する情報と回答を見ます。",
    "patch": {
      "elapsed": 80
    },
    "label": "有効期限を過ぎる"
  },
  "n10-transport": {
    "unit": "TCP・UDPとポート番号",
    "summary": "通信の受け口を区別し、接続を作る手順とデータグラム送信を比べます。",
    "observe": "TCPとUDPで、データを送る前のやり取りを比べます。",
    "patch": {
      "protocol": "UDP"
    },
    "label": "UDPで送る"
  },
  "n11-tcp": {
    "unit": "TCPの再送とウィンドウ",
    "summary": "途中でデータを落とし、受信状態・確認応答・送り直しを追います。",
    "observe": "損失なしと損失ありで、ACK、再送数、所要時間を比べます。",
    "patch": {
      "loss": 0
    },
    "label": "パケットを落とさない"
  },
  "n11-congestion": {
    "unit": "TCPの輻輳制御",
    "summary": "損失を検出したときの送信量の減らし方と、その後の増加を見ます。",
    "observe": "回復モデルを変え、損失の直後のウィンドウを比べます。",
    "patch": {
      "mode": "fast"
    },
    "label": "半減する回復モデルを試す"
  },
  "n12-nat": {
    "unit": "NATとポート変換",
    "summary": "複数の内部端末の通信を、外側のアドレスとポートへ対応付けます。",
    "observe": "端末数を増やし、対応を区別する変換表の列を見ます。",
    "patch": {
      "clients": 6
    },
    "label": "同時に通信する端末を増やす"
  },
  "n13-http": {
    "unit": "HTTP/1.1・HTTP/2・HTTP/3",
    "summary": "複数のデータを受け取るモデルで、方式と損失による待ち方を比べます。",
    "observe": "同じ損失条件で、他のオブジェクトの待ちが変わるかを見ます。",
    "patch": {
      "protocol": "HTTP/3"
    },
    "label": "HTTP/3で比較する"
  },
  "n13-cache": {
    "unit": "HTTPキャッシュと再検証",
    "summary": "有効期限とサーバー側の変更を使い、キャッシュ・再検証・再取得を分けます。",
    "observe": "内容が変わった場合に、応答と受け取るデータ量を見ます。",
    "patch": {
      "changed": true
    },
    "label": "サーバーの内容を変更する"
  },
  "n14-lb": {
    "unit": "負荷分散と正常性確認",
    "summary": "リクエストを複数のサーバーへ割り当て、停止した機器の扱いを見ます。",
    "observe": "Server Bを止めた後、割り当て先から外れるかを見ます。",
    "patch": {
      "down": true
    },
    "label": "Server Bを停止する"
  },
  "n15-mail": {
    "unit": "メールの配送と再試行",
    "summary": "送信者から受信側までのメール配送を追い、一時エラー時の判断を見ます。",
    "observe": "一時エラーのとき、配送手順のどこが変わるかを見ます。",
    "patch": {
      "fail": true
    },
    "label": "受信側を一時エラーにする"
  },
  "n15-ssh": {
    "unit": "SSHとホスト鍵",
    "summary": "接続先の鍵を確かめてから進む流れを観察します。",
    "observe": "既知の鍵と異なる場合、どの時点で確認が必要になるかを見ます。",
    "patch": {
      "fail": true
    },
    "label": "ホスト鍵を変更する"
  },
  "n15-websocket": {
    "unit": "WebSocketの双方向通信",
    "summary": "接続後の通知と応答を時系列で見て、接続終了までを追います。",
    "observe": "通知の後で閉じた場合、どこまで送受信できるかを見ます。",
    "patch": {
      "fail": true
    },
    "label": "通知後に接続を閉じる"
  },
  "n15-ntp": {
    "unit": "NTPと時計のずれ",
    "summary": "送受信の時刻から時計の差と往復時間を計算します。",
    "observe": "同じずれのまま通信遅延だけ増やし、推定値とRTTを見ます。",
    "patch": {
      "delay": 100
    },
    "label": "片道の遅延を増やす"
  },
  "n16-queue": {
    "unit": "待ち行列・処理能力・損失",
    "summary": "到着と処理の数を変え、待ち行列が増える条件を調べます。",
    "observe": "到着数を処理能力以下にしたとき、待ちと破棄を比べます。",
    "patch": {
      "arrival": 4
    },
    "label": "到着を少なくする"
  },
  "n17-wifi": {
    "unit": "無線通信と競合",
    "summary": "複数端末が送信機会を取り合うモデルで、衝突と待ちを観察します。",
    "observe": "同じseedで端末数を増やし、衝突する機会を比べます。",
    "patch": {
      "stations": 10
    },
    "label": "無線端末を増やす"
  },
  "n18-diagnose": {
    "unit": "ネットワーク障害の切り分け",
    "summary": "DNS・経路・証明書などの観測結果から、原因候補を選びます。",
    "observe": "観測の一覧を先に読み、候補を選んでから判定を確認します。",
    "patch": {
      "guess": "DNS設定"
    },
    "label": "原因の候補を選ぶ"
  },
  "n19-mqtt": {
    "unit": "MQTTのQoSと再送",
    "summary": "送信者とBrokerのやり取りを追い、配送条件による応答と再試行を比べます。",
    "observe": "同じ損失を想定し、QoS 0と1の配送結果を比べます。",
    "patch": {
      "qos": "0"
    },
    "label": "QoS 0で送る"
  },
  "n20-tunnel": {
    "unit": "トンネル・追加ヘッダー・MTU",
    "summary": "内側と外側のパケット長を比べ、経路で送れる上限を調べます。",
    "observe": "内側のサイズを小さくしたとき、MTUに収まるかを見ます。",
    "patch": {
      "inner": 1300
    },
    "label": "内側パケットを小さくする"
  },
  "s01-threat": {
    "unit": "機密性・完全性・可用性",
    "summary": "守る性質を3つに分け、対策がどの性質へ作用するかを比較します。",
    "observe": "内容の変更を検証したとき、完全性の判定だけがどう変わるかを見ます。",
    "patch": {
      "integrity": true
    },
    "label": "変更の検証を入れる"
  },
  "s02-mod": {
    "unit": "剰余演算と逆元",
    "summary": "余りの世界で掛け算を行い、逆元が存在する条件を調べます。",
    "observe": "法と共通の約数を持つ数で、逆元が見つかるかを見ます。",
    "patch": {
      "a": 17
    },
    "label": "法と同じ数で試す"
  },
  "s02-euclid": {
    "unit": "最大公約数とユークリッドの互除法",
    "summary": "割り算の余りを使い、最大公約数を求める手順を追います。",
    "observe": "小さい数の組み合わせで、余りが0になるまでを追います。",
    "patch": {
      "a": 48,
      "b": 18
    },
    "label": "48と18で求める"
  },
  "s03-aes": {
    "unit": "AES-GCMと改ざん検出",
    "summary": "教材用の鍵で暗号化し、暗号文を変えた場合の検証結果を見ます。",
    "observe": "暗号文の1ビットだけを変え、復号の成功・失敗を比べます。",
    "patch": {
      "tamper": true
    },
    "label": "暗号文を1ビット変える"
  },
  "s04-hash": {
    "unit": "SHA-256と入力の変化",
    "summary": "文字列とハッシュ値を並べ、入力の小さな変更が出力へ与える影響を見ます。",
    "observe": "入力を同じにしたときと1ビット変えたときのハッシュを比べます。",
    "patch": {
      "flip": false
    },
    "label": "入力を変更しない"
  },
  "s04-hmac": {
    "unit": "HMACとメッセージ認証",
    "summary": "共有鍵とメッセージから認証値を作り、受信内容を検証します。",
    "observe": "受信内容を変えない場合に、検証結果がどう変わるかを見ます。",
    "patch": {
      "flip": false
    },
    "label": "メッセージを改変しない"
  },
  "s04-signature": {
    "unit": "電子署名と公開鍵検証",
    "summary": "文書へ署名し、公開鍵で改変の有無を検証する手順を追います。",
    "observe": "文書の末尾に文字を足したとき、元の署名が通るかを見ます。",
    "patch": {
      "tamper": true
    },
    "label": "署名後の文書を変更する"
  },
  "s05-dh": {
    "unit": "Diffie–Hellman鍵共有",
    "summary": "教材用の小さな数で、秘密を公開せず共有値を計算する流れを追います。",
    "observe": "Aliceの秘密だけ変え、双方の計算結果が一致するかを見ます。",
    "patch": {
      "a": 9
    },
    "label": "Aliceの秘密を変える"
  },
  "s05-rsa": {
    "unit": "RSAの暗号化と復号",
    "summary": "小さな整数で暗号化・復号を計算し、鍵と剰余の関係を追います。",
    "observe": "入力する整数を変え、暗号文と復号後の値を見ます。",
    "patch": {
      "message": 42
    },
    "label": "42を暗号化する"
  },
  "s06-tls": {
    "unit": "TLS・証明書・相手の認証",
    "summary": "証明書の名前・期限・信頼・鍵の確認を分け、安全な接続の条件を見ます。",
    "observe": "名前だけを不一致にして、手順のどこで止まるかを見ます。",
    "patch": {
      "hostname": false
    },
    "label": "証明書の名前を不一致にする"
  },
  "s07-password": {
    "unit": "パスワードの保存とsalt",
    "summary": "同じパスワードに別のsaltを加え、保存用の値を計算します。",
    "observe": "saltまで同じにすると、保存用の値が同じになるかを見ます。",
    "patch": {
      "sameSalt": true
    },
    "label": "同じsaltを使う"
  },
  "s07-mfa": {
    "unit": "多要素認証とパスキー",
    "summary": "追加の認証要素と中継の条件を変え、モデル内の受理条件を調べます。",
    "observe": "同じ中継条件でOTPとパスキーの概念モデルを比べます。",
    "patch": {
      "kind": "otp"
    },
    "label": "OTPと比較する"
  },
  "s08-access": {
    "unit": "認証・認可・最小権限",
    "summary": "利用者の役割と対象データを変え、許可される操作を確認します。",
    "observe": "自分のデータに切り替えたとき、同じ操作の可否が変わるかを見ます。",
    "patch": {
      "owner": true
    },
    "label": "自分のデータへ操作する"
  },
  "s09-session": {
    "unit": "セッション・トークン・失効",
    "summary": "ログアウトと期限の確認を分け、状態管理方式の違いを比較します。",
    "observe": "ログアウト後に失効照会を追加すると、判定がどう変わるかを見ます。",
    "patch": {
      "revocationCheck": true
    },
    "label": "失効ストアを照会する"
  },
  "s09-oauth": {
    "unit": "OAuthのリダイレクトとPKCE",
    "summary": "連携時の照合ポイントをたどり、どの条件で処理が止まるかを見ます。",
    "observe": "PKCE検証を失敗させ、認可コードの交換まで進めるかを見ます。",
    "patch": {
      "pkce": false
    },
    "label": "PKCEの検証を失敗させる"
  },
  "s10-cors": {
    "unit": "同一オリジンポリシーとCORS",
    "summary": "要求の送信・サーバーの許可・JavaScriptでの読み取りを区別します。",
    "observe": "許可ヘッダーだけ変え、送信と読み取りのどちらが変わるかを見ます。",
    "patch": {
      "allowOrigin": "match"
    },
    "label": "呼び出し元の読み取りを許可する"
  },
  "s11-sql": {
    "unit": "SQLインジェクションと対策",
    "summary": "未信頼の入力がSQLの構造に混ざる条件を、教材の判定で確かめます。",
    "observe": "入力はそのままでパラメーター化し、コードと値の扱いを比べます。",
    "patch": {
      "parameterized": true
    },
    "label": "パラメーター化する"
  },
  "s11-xss": {
    "unit": "XSSと出力時の扱い",
    "summary": "未信頼の文字列がHTMLとして解釈される条件を比較します。",
    "observe": "エスケープを外したとき、文字とコードの境界を見ます。",
    "patch": {
      "escape": false
    },
    "label": "エスケープなしと比較する"
  },
  "s11-csrf": {
    "unit": "CSRFと送信の意図",
    "summary": "外部サイトからの要求に対し、Cookieとトークン照合の役割を分けます。",
    "observe": "CSRFトークンの照合を加えたとき、処理の可否を見ます。",
    "patch": {
      "token": true
    },
    "label": "トークンを照合する"
  },
  "s11-ssrf": {
    "unit": "SSRFとアクセス先の制限",
    "summary": "サーバーが取得する宛先の制限を変え、内部へのアクセスを判定します。",
    "observe": "許可先への限定を外したとき、内部宛先が選ばれるかを見ます。",
    "patch": {
      "allowlist": false
    },
    "label": "宛先制限なしと比較する"
  },
  "s11-path": {
    "unit": "パストラバーサルとルート確認",
    "summary": "入力されたパスを正規化し、許可した範囲内かを確認します。",
    "observe": "正規化後の確認を入れ、範囲外の要求の扱いを比べます。",
    "patch": {
      "normalize": true
    },
    "label": "許可ルートを確認する"
  },
  "s12-firewall": {
    "unit": "ファイアウォールの規則順序",
    "summary": "通信条件を規則へ順に照合し、最初に一致する判定を追います。",
    "observe": "先頭に拒否規則を置き、後続の許可規則との関係を見ます。",
    "patch": {
      "blockHttps": true
    },
    "label": "先頭にHTTPS拒否を追加する"
  },
  "s13-permission": {
    "unit": "Linuxのファイル権限",
    "summary": "所有者・グループ・その他の権限を区別し、要求する操作を判定します。",
    "observe": "同じ640の設定で、立場だけを変えたときの読み取り権限を見ます。",
    "patch": {
      "who": "group"
    },
    "label": "グループの立場で読む"
  },
  "s14-buffer": {
    "unit": "メモリ境界と生存期間",
    "summary": "確保した領域を越える操作や解放後の参照を、仮想メモリで調べます。",
    "observe": "境界検査なしの場合、どのセルまで書かれるかを見ます。",
    "patch": {
      "check": false
    },
    "label": "検査なしと比較する"
  },
  "s15-pipeline": {
    "unit": "セキュア開発と検査工程",
    "summary": "混入した問題を各工程で調べ、どの検査が検出を担当するかを見ます。",
    "observe": "レビューを追加し、権限の問題がどこで見つかるかを見ます。",
    "patch": {
      "review": true
    },
    "label": "レビューを追加する"
  },
  "s16-cloud": {
    "unit": "クラウドの公開範囲と権限",
    "summary": "公開設定・主体の権限・明示的な拒否を重ねてアクセスを判定します。",
    "observe": "保存領域を非公開にし、権限なしの主体の結果を比べます。",
    "patch": {
      "public": false
    },
    "label": "保存領域を非公開にする"
  },
  "s17-detection": {
    "unit": "異常検知・誤検知・見逃し",
    "summary": "合成イベントをしきい値で分類し、警告と実際の異常の内訳を見ます。",
    "observe": "同じデータでしきい値を下げ、見逃しと誤検知の両方を比べます。",
    "patch": {
      "threshold": 40
    },
    "label": "警告のしきい値を下げる"
  },
  "s18-incident": {
    "unit": "ログの時系列とインシデント調査",
    "summary": "複数の発生源のログを並べ、時計のずれが推定に与える影響を見ます。",
    "observe": "既知の時計のずれを補正し、イベントの順番を比べます。",
    "patch": {
      "correct": true
    },
    "label": "時計のずれを補正する"
  },
  "s19-backup": {
    "unit": "バックアップ・RPO・復旧時間",
    "summary": "障害の時刻とバックアップ間隔から、戻れる時点と復旧時間を求めます。",
    "observe": "間隔だけを短くしたとき、失われるデータ量と復旧時間を見ます。",
    "patch": {
      "interval": 5
    },
    "label": "バックアップ間隔を短くする"
  },
  "s20-update": {
    "unit": "IoTの更新検証とロールバック",
    "summary": "機器の識別・署名・バージョンを確かめ、更新の受理条件を追います。",
    "observe": "古い版へ戻さない場合に、どの検証を通るかを見ます。",
    "patch": {
      "rollback": false
    },
    "label": "新しいバージョンを使う"
  },
  "s21-anonymity": {
    "unit": "匿名化と再識別",
    "summary": "名前以外の項目をまとめ、同じ条件に一致する人の数を比較します。",
    "observe": "年齢を10歳刻みにしたとき、個人を絞れる組み合わせを見ます。",
    "patch": {
      "generalize": 1
    },
    "label": "年齢を10歳刻みにする"
  },
  "s22-human": {
    "unit": "不審な要求と独立した確認",
    "summary": "メッセージの特徴と確認手順を分け、判断の材料を整理します。",
    "observe": "独立した連絡先で確認した場合、判断に使える根拠がどう変わるかを見ます。",
    "patch": {
      "confirmed": true
    },
    "label": "別の連絡先で確認する"
  },
  "s23-sharing": {
    "unit": "秘密分散と復元しきい値",
    "summary": "秘密を共有片へ分け、集めた数による復元結果を見ます。",
    "observe": "共有片を1つに減らし、復元できるかを見ます。",
    "patch": {
      "count": 1
    },
    "label": "共有片を1つだけ集める"
  },
  "s23-zk": {
    "unit": "ゼロ知識証明の直観",
    "summary": "秘密を見せない確認を繰り返す教材で、偶然通る確率を見ます。",
    "observe": "確認回数だけを増やし、知らない人が通る確率を比べます。",
    "patch": {
      "rounds": 10
    },
    "label": "確認の回数を増やす"
  },
  "s23-migration": {
    "unit": "暗号移行とデータ量",
    "summary": "鍵・暗号文・署名のサイズを仮定し、転送に必要な量を計算します。",
    "observe": "署名サイズだけを増やし、合計のデータ量と時間を見ます。",
    "patch": {
      "signature": 5000
    },
    "label": "署名の仮定サイズを増やす"
  },
  "s24-ai": {
    "unit": "AIの信頼境界とツール権限",
    "summary": "未信頼文書の指示と外部ツールの権限を分け、意図しない処理を判定します。",
    "observe": "文書は変えず外部送信の権限だけ外したときの結果を見ます。",
    "patch": {
      "send": false
    },
    "label": "外部送信を許可しない"
  },
  "x01-build": {
    "unit": "総合演習：ネットワーク構築",
    "summary": "機器とリンクを編集し、送信元から宛先へ届く経路を作ります。",
    "observe": "宛先を変えたときの経路を見た後、図の線を押して切断してみます。",
    "patch": {
      "target": "R2"
    },
    "label": "宛先をルーターBにする"
  },
  "x02-publish": {
    "unit": "総合演習：Webサービスの公開",
    "summary": "DNS・経路・証明書・権限を順に確認し、機能と安全性を分けて調べます。",
    "observe": "証明書の条件だけ直し、まだ残る公開設定や権限の問題を見ます。",
    "patch": {
      "cert": true
    },
    "label": "証明書の問題だけ直す"
  },
  "x03-diagnose": {
    "unit": "総合演習：通信障害の診断",
    "summary": "観測結果をもとに原因の候補を選び、理由とともに確かめます。",
    "observe": "候補を選ぶ前にDNS・経路・応答などの観測を読みます。",
    "patch": {
      "guess": "DNS設定"
    },
    "label": "原因の候補を選ぶ"
  },
  "x04-organization": {
    "unit": "総合演習：組織のネットワーク分割",
    "summary": "ゲスト・業務・管理用の通信を分け、必要な機能が残るかを確認します。",
    "observe": "分割とゲスト→DBの拒否を組み合わせ、業務Web通信が残ることを確認します。",
    "patch": {
      "segment": true,
      "guestDb": false
    },
    "label": "ゲストを分割し、DBへの通信を拒否する"
  },
  "x05-patch": {
    "unit": "総合演習：修正と検証",
    "summary": "入力処理・認可・テストを確認し、対策を1つずつ追加します。",
    "observe": "所有者の確認だけ追加したとき、残る検証不足を見ます。",
    "patch": {
      "owner": true
    },
    "label": "所有者の認可を追加する"
  },
  "x06-response": {
    "unit": "総合演習：調査・封じ込め・復旧",
    "summary": "証拠保全から復元までの判断を分け、必要な対処を確認します。",
    "observe": "証拠を保全しても、復元元の検証や原因修正が必要かを見ます。",
    "patch": {
      "evidence": true
    },
    "label": "証拠を保全する"
  },
  "x07-iot": {
    "unit": "総合演習：IoTの運用と回復",
    "summary": "機器の通信・重複処理・更新・復旧の条件を組み合わせます。",
    "observe": "更新の署名を検証したとき、通信や回復の問題まで解消するかを見ます。",
    "patch": {
      "signed": true
    },
    "label": "更新の署名を検証する"
  },
  "x08-research": {
    "unit": "総合演習：実験条件と再現性",
    "summary": "乱数の初期値や変更した条件の数を比べ、比較の根拠を考えます。",
    "observe": "seedだけをそろえた場合でも、他の条件をそろえる必要があるかを見ます。",
    "patch": {
      "seedB": 42
    },
    "label": "AとBのseedをそろえる"
  },
  "c07-gc": {
    "unit": "ガベージコレクション",
    "summary": "根から参照をたどり、到達できないオブジェクトを回収します。",
    "observe": "参照を1本つないだとき、回収されなくなる領域を見ます。",
    "patch": {
      "bridge": true
    },
    "label": "CからDへの参照をつなぐ"
  },
  "c09-branch": {
    "unit": "分岐予測と飽和カウンタ",
    "summary": "過去の分岐結果を使い、次の予測と外れたときのコストを比べます。",
    "observe": "同じ分岐列で1ビットと2ビットの予測を比較します。",
    "patch": {
      "method": "one"
    },
    "label": "1ビット予測に切り替える"
  },
  "c10-translation": {
    "unit": "アドレス変換とTLB",
    "summary": "仮想アドレスからページを求め、変換キャッシュとページ表を調べます。",
    "observe": "TLBを外し、キャッシュミスとページ不在の違いを見ます。",
    "patch": {
      "tlb": false
    },
    "label": "TLBなしで変換する"
  },
  "c12-semaphore": {
    "unit": "セマフォと生産者・消費者",
    "summary": "空きと要素の数を数え、バッファへ追加・取り出しを試します。",
    "observe": "容量だけを増やしたとき、失敗する操作がどこで変わるかを見ます。",
    "patch": {
      "capacity": 4
    },
    "label": "バッファを広げる"
  },
  "c02-turing": {
    "unit": "チューリングマシン",
    "summary": "テープの読み書きと状態遷移だけで、単項表現の計算を追います。",
    "observe": "入力の1を増やし、移動回数と最後に残る1を見ます。",
    "patch": {
      "a": 5
    },
    "label": "左の1を増やす"
  },
  "c17-knn": {
    "unit": "k近傍法による分類",
    "summary": "未知点の近くのデータを選び、多数決による分類を見ます。",
    "observe": "位置とデータを固定してkだけ増やし、使う点と判定を比べます。",
    "patch": {
      "k": 9
    },
    "label": "近くの9点で判断する"
  },
  "c18-image": {
    "unit": "画像フィルタと畳み込み",
    "summary": "周りの画素へ重みを掛け、ぼかし・輪郭抽出の計算を見ます。",
    "observe": "同じ入力に別のカーネルを使い、計算値と表示の範囲を比べます。",
    "patch": {
      "kernel": "edge"
    },
    "label": "輪郭抽出に切り替える"
  },
  "c16-testing": {
    "unit": "境界値テスト",
    "summary": "入力の範囲を広げ、境目でだけ起こるバグを検出します。",
    "observe": "実装を変えず、境界と範囲外をテストに加えた結果を見ます。",
    "patch": {
      "suite": "boundary"
    },
    "label": "境界もテストする"
  },
  "n04-vlsm": {
    "unit": "VLSMとアドレス割り当て",
    "summary": "必要台数からブロックを求め、アドレスの境界へ配置します。",
    "observe": "大きい順に並べないとき、配置の空きや次の境界を見ます。",
    "patch": {
      "sorted": false
    },
    "label": "入力した順で割り当てる"
  },
  "n06-slaac": {
    "unit": "IPv6の自動設定・SLAAC・DAD",
    "summary": "アドレス候補の確認とルーター広告を分け、使えるアドレスと経路を見ます。",
    "observe": "広告がないとき、リンク内のアドレスと外向け経路を分けて確認します。",
    "patch": {
      "router": false
    },
    "label": "ルーター広告なしで試す"
  },
  "n08-linkstate": {
    "unit": "リンク状態と経路情報の伝播",
    "summary": "リンクの変更が伝わるまで、各ルーターが持つ情報の違いを追います。",
    "observe": "切断の直後と情報交換後で、経路表を比べます。",
    "patch": {
      "cut": true
    },
    "label": "B–Dのリンクを切る"
  },
  "n16-qos": {
    "unit": "QoSと優先キュー",
    "summary": "音声とファイル転送を同じ回線へ入れ、待ち時間と破棄を比べます。",
    "observe": "音声を優先したとき、転送側への影響も一緒に見ます。",
    "patch": {
      "policy": "priority"
    },
    "label": "音声を優先する"
  },
  "s07-ratelimit": {
    "unit": "認証の試行制限",
    "summary": "失敗が続くアカウントを一時ロックし、正しい利用者への影響も調べます。",
    "observe": "制限なしの場合と、誤試行・正規利用者の両方の結果を比べます。",
    "patch": {
      "enabled": false
    },
    "label": "試行制限なしと比較する"
  }
};
const direct = new Set(["c01-utf8", "c03-derivative", "c08-gate", "c18-sampling", "c18-filter", "c18-projection", "n15-ntp"]);
for (const lab of CSL.labs) {
  const m = metadata[lab.id];
  if (!m) throw Error('学習案内がありません: ' + lab.id);
  lab.unit = m.unit;
  lab.summary = m.summary;
  lab.observe = m.observe;
  lab.exploration = {label:m.label, patch:m.patch};
  lab.presentation = direct.has(lab.id) ? 'direct' : 'sequence';
  lab.guide = [
    direct.has(lab.id) ? '初期条件の図と結果を見てください。入力を変えると、その場で表示が更新されます。' : '「最初から再生」または「1ステップ進む」で、図と「今の状態」を一緒に確認します。',
    '「' + m.label + '」で比較用の条件に切り替えます。変更する項目はボタンの下に表示しています。',
    m.observe
  ];
}
})();
