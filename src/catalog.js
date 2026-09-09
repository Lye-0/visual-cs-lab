(() => {
'use strict';
const L=CSL,{range:N,select:S,toggle:B,text:T,code:C}=L.ctrl;
L.sources={
 curriculum:{name:'情報理工学部 学修要覧 2026',type:'提供資料',detail:'全学部表 pp.36–37／セキュリティ・ネットワークコース表 pp.40–41。科目名と対象分野の対応に使用。個別のプロトコル・演習内容・履修時期をこのサイトが保証するものではありません。'},
 tcp:{name:'RFC 9293 — TCP',url:'https://www.rfc-editor.org/rfc/rfc9293.html'},
 dns:{name:'RFC 1034 — Domain Names',url:'https://www.rfc-editor.org/rfc/rfc1034.html'},
 http:{name:'RFC 9110 — HTTP Semantics',url:'https://www.rfc-editor.org/rfc/rfc9110.html'},
 http3:{name:'RFC 9114 — HTTP/3',url:'https://www.rfc-editor.org/rfc/rfc9114.html'},
 tls:{name:'RFC 8446 — TLS 1.3（教材で対象とする基本フロー）',url:'https://www.rfc-editor.org/rfc/rfc8446.html'},
 ipv6:{name:'RFC 8200 — IPv6',url:'https://www.rfc-editor.org/rfc/rfc8200.html'},
 cors:{name:'WHATWG Fetch Standard',url:'https://fetch.spec.whatwg.org/'},
 webcrypto:{name:'W3C Web Cryptography API',url:'https://www.w3.org/TR/WebCryptoAPI/'},
 asvs:{name:'OWASP ASVS',url:'https://owasp.org/www-project-application-security-verification-standard/'},
 git:{name:'Git公式 — git-reset',url:'https://git-scm.com/docs/git-reset'},
 gitbook:{name:'Pro Git — Gitの内部構造',url:'https://git-scm.com/book/ja/v2'},
 os:{name:'Operating Systems: Three Easy Pieces',url:'https://pages.cs.wisc.edu/~remzi/OSTEP/'},
 mqtt:{name:'OASIS MQTT 5.0 Specification',url:'https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html'},
 wcag:{name:'W3C WCAG 2.2 — Contrast',url:'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html'},
 unicode:{name:'Unicode — UTF-8 FAQ',url:'https://www.unicode.org/faq/utf_bom.html'},
 csf:{name:'NIST Cybersecurity Framework 2.0',url:'https://www.nist.gov/cyberframework'},
 ssdf:{name:'NIST SP 800-218 — SSDF',url:'https://csrc.nist.gov/pubs/sp/800/218/final'},
 pqc:{name:'NIST Post-Quantum Cryptography',url:'https://csrc.nist.gov/projects/post-quantum-cryptography'},
 browser:{name:'WHATWG HTML — Event loops',url:'https://html.spec.whatwg.org/multipage/webappapis.html#event-loops'},
 models:{name:'このサイトの実装・モデル定義',type:'独自教材',detail:'純粋関数による計算モデルと状態遷移。各実験の「モデルと根拠」に前提・省略範囲を記載。教材の具体的な課題・数値は学修要覧には記載されていません。ソースコード・自動テストを同梱。'}
};
L.areas=[
['C01','情報の表現','binary','0と1から、数・文字・情報へ'],['C02','論理と計算理論','logic','条件と状態で、計算を考える'],['C03','数学・確率・統計','math','式を動かして、その意味に触れる'],['C04','プログラムの実行','code','1行のコードの内側をたどる'],['C05','データ構造','tree','データの持ち方が、操作を変える'],['C06','アルゴリズム','algorithm','同じ問題を、違う手順で解く'],['C07','言語処理系','compiler','文字から構造へ、構造から実行へ'],['C08','論理回路','circuit','スイッチから、計算する回路を作る'],['C09','CPU','cpu','命令がハードウェアを動かす'],['C10','メモリ','memory','値と場所と、生存期間を区別する'],['C11','OSとファイル','os','限られた資源をどう配るか'],['C12','並行・分散処理','concurrency','同時に動くと何が変わるか'],['C13','ネットワークとWeb','network','相手に届くまでのすべてをたどる'],['C14','データベース','database','保存・探索・更新の仕組みを知る'],['C15','セキュリティ','shield','守る、見つける、回復する'],['C16','Gitとソフトウェア開発','git','変更を安全に積み重ねる'],['C17','AI・機械学習','ai','データから規則を学ぶ'],['C18','画像・音・CG','wave','信号と空間を計算で表す'],['C19','組み込み・制御','control','観測し、判断し、動かす'],['C20','人とシステム・倫理','human','使う人と、データへの影響を考える']
].map(([id,name,icon,description])=>({id,name,icon,description}));
L.topics={
 network:['通信の全体像','信号・誤り・通信時間','LANとスイッチ','IPv4とサブネット','アドレス解決と自動設定','IPv6','分割とループ','ルーティング','DNS','UDP・TCP・ソケット','信頼性と輻輳制御','NAT','HTTP','中継・負荷分散','アプリの通信','性能と待ち行列','無線の共有','障害診断','IoT通信','トンネルと仮想ネットワーク'],
 security:['守る対象と脅威','暗号の数学','共通鍵暗号','ハッシュ・MAC・署名','公開鍵と鍵共有','PKI・TLS','パスワードとMFA','認可・最小権限','セッションと連携','ブラウザの安全境界','Web・APIの安全性','ネットワーク防御','OSの権限','メモリの安全性','安全な開発','クラウド権限','監視と検知','調査と証拠','バックアップと復旧','機器の更新','プライバシー','人と運用','発展的な暗号','AIの安全性']
};
const D=(id,area,title,question,engine,variant,controls,options={})=>{
 let track=id.startsWith('n')?'network':id.startsWith('s')?'security':id.startsWith('x')?'missions':'core';
 let topic=track==='network'?'N'+id.slice(1,3):track==='security'?'S'+id.slice(1,3):null;
 let defaults={sources:track==='network'?['models','tcp']:track==='security'?['models','asvs']:['models'],course:track==='network'?'コンピュータネットワーク／インターネット技術':track==='security'?'ネットワークセキュリティ／システムセキュリティ':L.areas.find(a=>a.id===area)?.name||'分野横断',...options};
 return L.add({id,area,title,question,engine,variant,controls,track,topic,intro:question,guide:[`初期設定で「1ステップ」を押し、${title}の流れを追います。`,`${controls[0]?.label||'条件'}を変えて、表示と内部状態の変化を確かめます。`,'条件Aに保存してから別の条件を試し、比較タブで結果の違いを説明してみましょう。'],...defaults});
};
// General computer science: all 20 original areas are retained.
D('c01-bits','C01','0と1で数を作る','同じビット列なのに、正の数にも負の数にもなる？','binary','integer',[N('value','数値 / ビット列',42,0,65535),N('width','ビット数',8,4,16)],{sources:['models'],scope:'整数を実計算',lesson:'データそのものと、その読み方は別です。',guide:['42が00101010になることを確かめます。','図の最上位ビットをクリックして1にします。','符号なしと2の補数の値を比べ、同じビットの違う意味を確かめます。']});
D('c01-float','C01','小数の丸めを観察する','0.1を32ビットに保存すると、何が起きる？','binary','float',[N('value','保存する小数',0.1,-10,10,.01)],{level:2,scope:'IEEE 754 binary32 実変換'});
D('c01-utf8','C01','文字とUTF-8','「A」と「あ」は、同じ1バイト？','encoding','utf8',[T('text','文字列','Aあ🔒','見た目の文字数とコードポイント数も区別します。')],{sources:['unicode','models'],scope:'UTF-8の実エンコード'});
D('c01-huffman','C01','頻度から符号を作る','よく出る文字を短くすると、どれだけ減る？','huffman','',[T('text','圧縮する文字列','AAAAAAAABBBBCCDE')],{level:2,scope:'Huffman符号を実計算'});
D('c01-hamming','C01','誤りを見つけて直す','受信した1ビットが違う。その位置をどう知る？','encoding','hamming',[T('text','4ビットのデータ','1011'),N('flip','反転する位置（0は変更なし）',3,0,7)],{scope:'Hamming(7,4)を実計算',limits:'1ビット誤りの訂正に限定します。複数ビット誤りの保証はありません。'});
D('c02-set','C02','集合を組み合わせる','「両方にある」と「どちらかにある」は違う？','sets','',[T('a','集合A','1,2,3,4'),T('b','集合B','3,4,5'),S('op','演算','intersection',[['union','和集合'],['intersection','共通部分'],['difference','差集合 A−B']])],{scope:'集合演算の実計算'});
D('c02-dfa','C02','状態で入力を覚える','すべての入力を覚えず、1の個数の偶奇を判定できる？','automaton','',[T('input','0と1の入力','101101')],{scope:'2状態DFAの実行'});
D('c03-matrix','C03','行列で空間を変える','行列の数字を変えると、図形はどこへ動く？','matrix','',[N('a','a / 横の基底のx',1,-3,3,.1),N('b','b / 縦の基底のx',.6,-3,3,.1),N('c','c / 横の基底のy',0,-3,3,.1),N('d','d / 縦の基底のy',1,-3,3,.1)],{scope:'2×2線形変換',course:'数学／データ線形分析法'});
D('c03-derivative','C03','微分に近づく','2点の間隔を小さくすると、傾きはどう変わる？','calculus','derivative',[N('x','調べる位置 x',1,-2,2,.1),N('h','2点の間隔 h',.5,.01,1,.01)],{scope:'f(x)=x²の差分計算'});
D('c03-integral','C03','小さな台形を積み上げる','区間を細かくすると、面積の近似は正確になる？','calculus','integral',[N('n','分割数',6,2,30),N('start','積分の始点',0,-2,0,.1),N('end','積分の終点',2,.1,3,.1)],{scope:'台形則による数値積分',course:'数値解析'});
D('c03-probability','C03','偶然を繰り返す','50%のコインなら、いつでも半分が表になる？','probability','sample',[N('probability','成功する確率',50,0,100,1,'%'),N('n','試行回数',200,20,1000,20),N('seed','乱数seed',42,1,99)],{scope:'seed固定のBernoulli試行',course:'確率・統計'});
D('c03-bayes','C03','陽性の意味を読み解く','検知率が高いなら、警告はほとんど正しい？','probability','bayes',[N('base','対象が存在する割合',1,.1,50,.1,'%'),N('sensitivity','対象を検知する割合',95,1,100,1,'%'),N('falsePositive','正常を誤検知する割合',5,0,50,.1,'%')],{level:2,scope:'条件付き確率を実計算',course:'確率・統計'});
D('c04-trace','C04','1行ずつプログラムを動かす','条件分岐の内側は、何回実行される？','program','loop',[N('n','1からいくつまで？',10,1,20),N('divisor','割り切れる数だけ足す',3,1,7)],{scope:'固定プログラムの実行追跡',course:'プログラミング演習1'});
D('c04-recursion','C04','関数が自分を呼ぶ','再帰呼び出しの途中の計算は、どこに残る？','program','recursion',[N('n','階乗を求める n',5,1,10)],{scope:'階乗の呼出しスタック',prereq:['c04-trace']});
D('c04-eventloop','C04','イベントループをたどる','0msのタイマーよりPromiseが先に動くのはなぜ？','eventloop','',[N('microtasks','Promiseのコールバック数',2,1,8)],{level:2,sources:['browser','models'],scope:'固定のブラウザタスクモデル'});
D('c05-stack','C05','スタックと取り出す順番','最後に置いたものが、最初に出てくる。','structure','stack',[T('values','追加する値','3,7,2,9'),N('remove','取り出す個数',2,0,8)],{scope:'LIFO操作'});
D('c05-queue','C05','キューと待ち行列','先に来た仕事から、順番に取り出す。','structure','queue',[T('values','追加する値','3,7,2,9'),N('remove','取り出す個数',2,0,8)],{scope:'FIFO操作'});
D('c05-bst','C05','二分探索木を育てる','同じ値でも、追加する順番で木の形が変わる？','structure','bst',[T('values','追加する順番','8,3,10,1,6,14,4,7')],{scope:'非平衡BSTの挿入'});
D('c05-heap','C05','最小ヒープを作る','根が最小なら、全体も整列されている？','structure','heap',[T('values','追加する順番','8,3,10,1,6,14,4,7')],{scope:'最小ヒープの挿入'});
D('c05-hash','C05','ハッシュの衝突を見る','違う値が、同じ保存場所に割り当てられたら？','structure','hash',[T('values','保存する整数','10,15,22,17,30,9'),N('size','バケット数',5,2,12)],{scope:'剰余ハッシュ＋チェイン法'});
D('c06-sort','C06','整列の方法を比べる','同じ配列を、違うアルゴリズムで並べ替える。','sort','',[T('values','並べ替える値','8,3,11,1,7,4,10,2'),S('algorithm','アルゴリズム','bubble',[['bubble','バブルソート'],['insertion','挿入ソート'],['selection','選択ソート'],['quick','クイックソート'],['merge','マージソート']])],{scope:'5種類のソートを実行'});
D('c06-search','C06','探す回数を減らす','候補を半分にできるのは、どんなとき？','search','',[T('values','昇順の値','1,3,5,7,9,11,13,15,17,19,21,23'),N('target','探す値',17,0,30),S('method','探索方法','binary',[['linear','線形探索'],['binary','二分探索']])],{scope:'探索の実行と比較回数'});
D('c06-graph','C06','グラフを探索する','近い順に見るか、1本の道を深く見るか。','graphsearch','',[S('method','探索方法','BFS',['BFS','DFS'])],{scope:'BFS / DFS',prereq:['c05-queue','c05-stack']});
D('c06-dp','C06','動的計画法で荷物を選ぶ','一度解いた小さい問題を、どう再利用する？','dp','',[N('capacity','ナップサックの容量',8,2,12)],{level:2,scope:'0/1ナップサックのDP'});
D('c07-compiler','C07','式から構文木へ','2 + 3 × 4 は、どうやって14になる？','compiler','',[T('code','算術式','2 + 3 * 4','数値、+ − * /、括弧。負数は 0-3 のように記述します。')],{scope:'字句解析・後置記法・AST評価'});
D('c08-gate','C08','論理ゲートを操作する','2つのスイッチから、どんな条件を作れる？','logic','gate',[B('a','入力 A',true),B('b','入力 B',false),S('gate','ゲート','AND',['AND','OR','XOR','NAND','NOR','NOT'])],{scope:'論理式と真理値表',course:'論理回路'});
D('c08-adder','C08','1ビットの加算器','スイッチだけで、1 + 1を計算できる？','logic','adder',[B('a','入力 A',true),B('b','入力 B',true),B('carry','下の桁からの繰上り',false)],{scope:'全加算器の論理計算',prereq:['c08-gate']});
D('c09-cpu','C09','小さなCPUを動かす','命令を書くと、レジスタの中はどう変わる？','cpu','',[C('code','教材ISAの命令列','MOV R1, 5\nMOV R2, 8\nADD R3, R1, R2\nSTORE R3, 16\nHALT','MOV, ADD, SUB, MUL, LOAD, STORE, JMP, JZ, HALT。R0〜R3。最大60命令で停止。')],{scope:'4レジスタの教材ISA',course:'計算機構成論／計算機アーキテクチャ'});
D('c09-pipeline','C09','命令の段階を重ねる','1命令の時間が同じでも、全体を速くできる？','pipeline','',[N('instructions','命令数',6,3,12),B('pipeline','パイプライン化',true),B('hazard','I3にロード依存を発生',false),B('forward','フォワーディングを使用',true)],{level:2,scope:'固定5段パイプライン'});
D('c09-cache','C09','キャッシュのヒットと衝突','空いている場所があっても、ミスは起こる？','cache','',[T('addresses','読み出すバイトアドレス','0,4,8,0,16,0,4,8'),N('lines','キャッシュライン数',4,2,8),N('block','1ブロックのバイト数',4,1,16)],{scope:'ダイレクトマップキャッシュ',sources:['os','models']});
D('c10-pointer','C10','値とアドレスを区別する','ポインタを通して書くと、何が変わる？','memory','pointer',[N('value','xの最初の値',10,0,100),N('write','参照先に書く値',25,0,100),B('free','解放後の参照に切り替える',false)],{scope:'明示アドレスの教材メモリ',sources:['os','models']});
D('c10-pages','C10','仮想メモリとページ置換','メモリが足りないとき、どのページを入れ替える？','memory','pages',[T('references','ページの参照列','1,2,3,4,1,2,5,1,2,3,4,5'),N('frames','物理フレーム数',3,2,6),S('policy','置換方針','LRU',['FIFO','LRU'])],{level:2,scope:'ページ置換の実計算',sources:['os','models']});
D('c10-allocation','C10','メモリの空きと断片化','空き容量はあるのに、確保できない？','allocation','',[T('sizes','順番に要求するセル数','8,6,10,5,9'),N('capacity','全体のセル数',32,16,64),S('policy','空き領域の選択','first',[['first','First fit'],['best','Best fit']]),B('release','3回目の後に最初の領域を解放',true)],{scope:'連続領域の確保モデル'});
D('c11-scheduler','C11','CPUの時間を分ける','長い仕事が1つあると、ほかの仕事はどう待つ？','scheduler','',[T('bursts','各プロセスの仕事量','5,3,8,2'),S('policy','スケジューラー','RR',['FCFS','SJF','RR']),N('quantum','RRの時間量子',2,1,8)],{scope:'全到着時刻0のスケジューリング',sources:['os','models']});
D('c11-files','C11','ファイルの名前と中身','名前を増やすと、データも複製される？','filesystem','',[N('size','ファイルのバイト数',7000,500,16000,500),N('block','ブロックのバイト数',4096,1024,4096,1024),N('links','ハードリンク数',2,1,5)],{scope:'inodeとデータブロック',sources:['os','models']});
D('c12-race','C12','同時更新と競合','1を2回足したのに、答えが1になる？','concurrency','race',[S('order','処理順','interleave',[['interleave','交互に読み出す'],['serial','順番に実行']]),B('lock','排他制御を入れる',false)],{scope:'read/add/writeの割込みモデル',sources:['os','models']});
D('c12-deadlock','C12','待ちの輪をほどく','互いに待ち続ける状態を、どう防ぐ？','concurrency','deadlock',[B('order','ロックの取得順序を統一',false)],{scope:'単一インスタンス資源の循環待ち',sources:['os','models']});
D('c12-quorum','C12','多数決で更新を確かめる','3台のうち何台が止まると、更新できなくなる？','replication','',[N('nodes','ノード数',5,3,9,2),N('failed','停止する台数',2,0,3)],{level:2,scope:'過半数確認の概念モデル'});
D('c14-index','C14','索引で検索はどう変わる？','すべての行を見る以外の探し方はある？','database','index',[N('age','age以上の行を取得',21,18,30),B('index','ageの索引を使用',true)],{scope:'範囲検索のアクセス数モデル',course:'データベース'});
D('c14-join','C14','テーブルを結合する','相手の行がないとき、その行は残る？','database','join',[S('join','結合方式','LEFT',['INNER','LEFT'])],{scope:'固定2表のNested Loop Join'});
D('c14-bplus','C14','B+木の分割を見る','キーがいっぱいになったら、木はどう育つ？','btree','',[T('values','追加するキー','10,20,5,6,12,30,7,17,3,25,15')],{level:2,scope:'次数4のB+木・挿入専用'});
D('c14-transaction','C14','トランザクションと更新消失','入金と出金が同時に起きると？','transaction','',[B('serial','ロックで直列化する',false)],{scope:'固定された2更新の競合'});
const baseScript='edit notes.txt "hello"\nadd .\ncommit "最初の変更"';
D('c16-git','C16','Git Playground','作業ファイル、ステージ、履歴はどう違う？','git','',[C('script','仮想Gitコマンド',baseScript,'実際のPCやリポジトリは変更しません。1ステップずつ状態を確認できます。')],{scope:'ファイル単位の仮想Git',sources:['git','gitbook','models'],course:'ソフトウェア工学／独自の開発教材'});
D('c16-reset','C16','3種類のresetを比べる','戻る場所が同じでも、ファイルの状態は違う？','git','',[C('script','仮想Gitコマンド',baseScript+'\nedit notes.txt "second"\nadd .\ncommit "次の変更"\nreset --soft HEAD~1','最後の行を --mixed / --hard に変えて比較します。')],{scope:'soft/mixed/hardの状態遷移',sources:['git','gitbook','models'],prereq:['c16-git']});
D('c16-branches','C16','ブランチとマージ','分かれた変更を、どう合流させる？','git','',[C('script','仮想Gitコマンド','branch feature\nswitch feature\nedit feature.txt "new feature"\nadd .\ncommit "機能を追加"\nswitch main\nedit main.txt "main update"\nadd .\ncommit "mainを更新"\nmerge feature')],{scope:'ファイル単位の3-way merge',sources:['gitbook','models']});
D('c16-rebase','C16','rebaseとコミットの作り直し','土台を移すと、元のコミットはどうなる？','git','',[C('script','仮想Gitコマンド','branch feature\nswitch feature\nedit feature.txt "new feature"\nadd .\ncommit "機能を追加"\nswitch main\nedit main.txt "main update"\nadd .\ncommit "mainを更新"\nswitch feature\nrebase main')],{level:2,scope:'線形履歴のrebase',sources:['gitbook','models']});
D('c16-remote','C16','fetch・pull・pushを分ける','リモートを知ることと、取り込むことは同じ？','git','',[C('script','仮想Gitコマンド','remote-edit main remote.txt "remote update"\nfetch\nstatus\npull\nedit local.txt "local update"\nadd .\ncommit "ローカルの変更"\npush')],{scope:'単一仮想リモートの同期',limits:'ローカルとリモートのコミットは同じ教材空間に表示します。fetchは追跡参照の更新に限定し、オブジェクト転送・認証・競合する通信は再現しません。',sources:['gitbook','models']});
D('c16-undo','C16','revertとamend','履歴を戻す・打ち消す・作り直すを区別する。','git','',[C('script','仮想Gitコマンド',baseScript+'\nedit extra.txt "append"\nadd .\namend "内容を修正"\nrevert HEAD')],{scope:'revert/amendのオブジェクト変化',sources:['gitbook','models']});
D('c17-regression','C17','直線がデータに近づく','学習率を変えると、学び方はどう変わる？','ml','regression',[N('rate','学習率',.2,.01,1.5,.01),N('epochs','更新回数',50,10,150,10),N('noise','データのばらつき',.5,0,2,.1),N('seed','seed',42,1,99)],{scope:'線形回帰の勾配降下を実計算',course:'人工知能／データサイエンス'});
D('c17-kmeans','C17','点の集まりを見つける','グループの数は、結果にどう影響する？','kmeans','',[N('k','グループ数 k',3,2,5),N('seed','データのseed',42,1,99)],{scope:'k-meansの実計算'});
D('c18-sampling','C18','波を点で記録する','サンプルを減らすと、別の波に見える？','signalmedia','sampling',[N('frequency','信号の周波数',7,1,30,1,'Hz'),N('samples','1秒間の標本数',24,8,64,2)],{scope:'正弦波の標本化',course:'デジタル信号処理'});
D('c18-fourier','C18','音を周波数に分ける','時間の波形を、周波数の量として読む。','signalmedia','fourier',[N('frequency','信号の周波数',5,1,25,.5,'Hz'),N('samples','標本数',32,8,64,2)],{level:2,scope:'DFTの実計算',course:'フーリエ解析／デジタル信号処理'});
D('c18-filter','C18','信号をなめらかにする','周囲を平均すると、何が消えて何が残る？','signalmedia','filter',[N('radius','近傍の半径',1,0,5)],{scope:'1次元の移動平均'});
D('c18-projection','C18','立体を画面に映す','奥にあるものが小さく見える理由を計算する。','projection','',[N('angle','Y軸の回転角',30,-180,180,1,'°'),N('distance','視点からの距離',5,3,10,.1)],{scope:'立方体の透視投影',course:'コンピュータグラフィックス'});
D('c19-pid','C19','目標に近づく制御','強く押すほど、すぐに安定する？','control','',[N('kp','Pゲイン',4,0,15,.1),N('ki','Iゲイン',0,0,4,.1),N('kd','Dゲイン',1,0,6,.1),N('target','目標の位置',3,1,8,.1),N('damping','摩擦の係数',1,.2,4,.1)],{level:2,scope:'架空の質点＋PID制御'});
D('c20-contrast','C20','読みやすさを測る','暗いデザインでも、情報を読み取りやすくする。','accessibility','',[S('foreground','文字色','#e5eaf1',[['#e5eaf1','明るいグレー'],['#8b97aa','ミディアムグレー'],['#46505e','暗いグレー'],['#8ad7c3','ミント']]),S('background','背景色','#11161e',[['#11161e','深いダーク'],['#303945','グレー'],['#ffffff','ホワイト']]),N('size','文字のサイズ',18,12,28)],{scope:'WCAGコントラスト比を実計算',sources:['wcag','models'],course:'ユーザビリティ工学'});
D('c20-privacy','C20','データ収集の選択を考える','便利さのために集める情報は、本当に必要？','ethics','',[B('location','精密な位置情報を収集',true),B('share','提携企業にも共有',false),N('days','データの保存日数',30,1,365)],{scope:'トレードオフを整理する設計教材',course:'情報倫理と情報技術'});
// Network specialization — N01..N20.
D('n01-packet','C13','メッセージがパケットになるまで','送りたい言葉に、どんな情報が付け加えられる？','encapsulation','',[T('message','送るメッセージ','Hello, network.'),S('protocol','トランスポート','TCP',['TCP','UDP'])],{scope:'固定ヘッダーのカプセル化'});
D('n02-signal','C13','距離と回線速度を分ける','帯域を増やせば、距離の待ち時間も消える？','signal','time',[N('bytes','データ量',1500,100,10000,100,'B'),N('bandwidth','回線速度',10,1,100,1,'Mbps'),N('distance','伝送距離',1000,1,10000,1,'km'),N('noise','表示ビットの反転確率',0,0,40,1,'%'),T('data','表示するビット列','10110101')],{scope:'伝送・伝搬時間の実計算'});
D('n02-crc','C13','CRCで誤りを検出する','1ビットの変化は、割り算の余りに表れる？','signal','crc',[T('data','0と1のデータ','10110101'),N('flip','反転する位置（0はなし）',4,0,11)],{scope:'生成多項式1011のCRC'});
D('n03-switch','C13','スイッチが宛先を覚える','最初の通信と2回目の通信は、同じように流れる？','switch','',[B('learned','AとBのMACを学習済みにする',false),S('target','Aからの宛先','B',['B','C'])],{scope:'MAC学習と転送表'});
D('n04-subnet','C13','サブネットを切り分ける','同じネットワークにいるか、ビットで確かめる。','subnet','',[T('ip','自分のIPv4','192.168.1.10'),T('peer','相手のIPv4','192.168.2.20'),N('prefix','プレフィックス長',24,0,32,1,'bit')],{scope:'IPv4/CIDRの実計算',prereq:['c01-bits'],guide:['192.168.1.10/24から192.168.2.20を見ると別サブネットです。','プレフィックスを/16に変え、ネットワーク部を見ます。','/31と/32ではホスト数の解釈が違う点も確かめます。']});
D('n05-arp','C13','IPからMACを調べる','相手のIPが分かっていても、まだ必要な情報がある。','addressing','arp',[B('cached','ARPキャッシュを使う',false),B('remote','宛先は別ネットワーク',false)],{scope:'ARPの問い合わせ関係'});
D('n05-dhcp','C13','アドレスを自動でもらう','端末が増えすぎると、どこで困る？','addressing','dhcp',[N('clients','接続する端末数',6,1,20),N('pool','割り当てられるアドレス数',4,0,20)],{scope:'DORAフローとプール容量'});
D('n06-ipv6','C13','IPv6の128ビットを読む','長いアドレスの「::」には、何が隠れている？','ipv6','',[T('ip','IPv6アドレス','2001:db8:1234::10'),N('prefix','プレフィックス長',64,16,128,8)],{scope:'IPv6の展開と基本概念',sources:['ipv6','models']});
D('n07-vlan','C13','同じスイッチでも分けられる','部署と来訪者を、どう別のネットワークにする？','vlan','vlan',[S('a','端末AのVLAN',10,[10,20,30]),S('b','端末BのVLAN',20,[10,20,30]),B('route','VLAN間ルーティングを有効化',false)],{scope:'ブロードキャストドメインとL3経路'});
D('n07-stp','C13','冗長リンクとループ','切断に備えた接続が、ループを作ってしまう？','vlan','stp',[B('enabled','STPを使う',true),B('cut','S1–S2のリンクを切断',false)],{level:2,scope:'3スイッチの木構造モデル'});
D('n08-routing','C13','パケットの道を選ぶ','リンクを切ると、最適な経路はどう変わる？','routing','dijkstra',[N('cost','R1–R3のリンクコスト',2,1,15),B('cut','R1–R3を切断',false)],{scope:'Dijkstraの経路計算',prereq:['c06-graph']});
D('n08-prefix','C13','最も長く一致する経路','/8と/24が両方一致したら、どちらへ進む？','routing','prefix',[T('destination','宛先IPv4','10.1.2.34')],{scope:'最長プレフィックス一致',prereq:['n04-subnet']});
D('n08-bgp','C13','経路は方針でも変わる','最短の道より、優先したい接続先を選べる？','bgp','',[N('preference','ISP-AのLOCAL_PREF',120,50,150)],{level:3,scope:'BGP選択条件の一部',limits:'LOCAL_PREF→AS_PATH長の2条件だけのモデル。BGPの全選択手順・UPDATE・収束を実装していません。'});
D('n09-dns','C13','DNSキャッシュの時間を進める','サーバーを変えたのに、古いIPへ向かうのはなぜ？','dns','',[B('cached','リゾルバーに記録がある',true),N('ttl','記録を保存してよい時間',60,0,300,10,'s'),N('elapsed','保存してからの経過',30,0,360,5,'s'),B('updated','権威側のIPを変更した',true)],{scope:'単一リゾルバーのTTLモデル',sources:['dns','models'],guide:['有効なキャッシュがある状態で、古いIPが返る理由を見ます。','経過時間をTTL以上にして問い合わせをやり直します。','キャッシュを無効にした条件と、やり取りの数を比較します。']});
D('n10-transport','C13','通信の入口とポート','同じサーバーで、アプリをどう区別する？','transport','',[S('protocol','プロトコル','TCP',['TCP','UDP']),N('port','サーバー側ポート',443,1,65535)],{scope:'接続準備とメッセージ境界',sources:['tcp','models']});
D('n11-tcp','C13','パケットを途中で落としてみる','届かなかったデータを、どうやって取り戻す？','tcp','',[N('loss','一度だけ落とすDATA番号（0はなし）',3,0,12),N('count','送るセグメント数',8,4,12),N('window','同時に送る上限',4,1,6),N('rtt','往復にかかる時間',80,10,300,10,'ms'),N('rto','追加の再送待ち時間',400,100,1000,50,'ms')],{scope:'接続済みTCPの固定ラウンドモデル',sources:['tcp','models'],limits:'1000バイト固定セグメント、1回限りの損失、固定タイムアウト。高速再送・SACK・輻輳制御・適応RTO・実装固有のタイマーはここでは省略。',prereq:['n01-packet','n10-transport'],guide:['DATA 3を落とした状態で、DATA 4が届いても連続ACKが進まないことを見ます。','損失番号を0にして、待ち時間と送信回数を比べます。','ウィンドウを1と4に変え、同じRTTで必要なラウンドが変わることを確かめます。']});
D('n11-congestion','C13','混雑したら送信量を抑える','信頼性のための再送と、混雑への対応は違う。','congestion','',[N('lossAt','損失を検出するラウンド（0始まり）',5,1,10),S('mode','回復モデル','timeout',[['timeout','タイムアウト'],['fast','半減するAIMDの概念']])],{level:2,scope:'Reno系AIMDの概念モデル',sources:['tcp','models']});
D('n12-nat','C13','NATの変換表を追う','1つの公開IPで、複数の端末を区別できる？','nat','',[N('clients','内部の端末数',4,1,8),N('port','宛先ポート',443,1,65535)],{scope:'NAPTの対応表'});
D('n13-http','C13','HTTPの受け取り方を比べる','1つのデータの損失は、別の画像にも影響する？','http','protocol',[S('protocol','HTTPの方式','HTTP/2',['HTTP/1.1','HTTP/2','HTTP/3']),N('objects','受け取るオブジェクト数',5,2,8),N('rtt','往復時間',80,20,200,10,'ms'),B('loss','object 2のデータを失う',true)],{level:2,scope:'接続済み・固定RTTのHOLモデル',sources:['http','http3','models']});
D('n13-cache','C13','HTTPキャッシュと再検証','304が返ったら、何を再利用する？','http','cache',[N('maxAge','max-age',60,0,300,10,'s'),N('age','保存からの経過',80,0,360,10,'s'),B('changed','サーバー上の内容が変更された',false),B('reload','再検証を要求する',false)],{scope:'fresh/stale/ETagのモデル',sources:['http','models']});
D('n14-lb','C13','負荷をサーバーに振り分ける','1台が停止しても、応答を続けられる？','loadbalancer','',[S('algorithm','振り分け方針','round',[['round','Round robin'],['least','Least connections']]),N('requests','追加リクエスト数',8,1,16),B('down','Server Bを停止',false)],{scope:'接続数を保持した割当モデル'});
D('n15-mail','C13','メールの配送をたどる','「受理した」は「読まれた」と同じ？','protocol','mail',[B('fail','受信サーバーが一時エラー',false),N('delay','片道の遅延',30,10,200,10,'ms')],{scope:'SMTP配送の固定フロー'});
D('n15-ssh','C13','SSHで誰に接続したか確かめる','パスワードの前に、サーバーを確認する。','protocol','ssh',[B('fail','ホスト鍵が記録と異なる',false),N('delay','片道の遅延',30,10,200,10,'ms')],{scope:'SSHの信頼確認フロー'});
D('n15-websocket','C13','WebSocketで双方向に送る','サーバーからも、同じ接続で通知できる。','protocol','websocket',[B('fail','通知後に接続を閉じる',false),N('delay','片道の遅延',30,10,200,10,'ms')],{scope:'HTTP/1.1 Upgradeの固定フロー'});
D('n15-ntp','C13','時計のずれを推定する','通信の遅さと、時計のずれを分けられる？','protocol','ntp',[N('offset','サーバーの時計のずれ',120,-300,300,10,'ms'),N('delay','片道の遅延',30,5,200,5,'ms')],{level:2,scope:'対称遅延での4時刻計算'});
D('n16-queue','C13','待ち行列があふれるまで','バッファを大きくすれば、問題は消える？','queue','',[N('arrival','1時刻あたり到着する数',8,1,15),N('service','1時刻あたり処理する数',5,1,15),N('capacity','待ち行列の容量',24,5,60)],{scope:'離散時刻・到着→制限→処理'});
D('n17-wifi','C13','無線の送信機会を共有する','同時に送ろうとする端末が増えると？','wifi','',[N('stations','端末数',5,2,12),N('backoff','送信を控える大きさ',4,2,12),N('seed','seed',42,1,99)],{scope:'共有媒体の確率的な概念モデル',limits:'各スロットの送信確率を1/backoffとするモデル。802.11 CSMA/CA、隠れ端末、実電波伝搬を再現するものではありません。'});
const diagnosisControls=()=>[N('seed','障害シナリオ番号',7,1,20),S('guess','原因の候補','未選択',['未選択','DNS設定','経路設定','証明書','アクセス規則','処理能力'])];
D('n18-diagnose','C13','つながらない理由を調べる','見えた証拠だけで、原因を絞り込める？','diagnose','',diagnosisControls(),{scope:'固定5種類の障害診断'});
D('n19-mqtt','C13','MQTTの配送保証を比べる','必ず届けることと、1回だけ処理することは違う？','mqtt','',[S('qos','送信者→BrokerのQoS','1',['0','1','2']),B('loss','QoS 0/1でデータまたはACKを失う',true)],{level:2,scope:'QoS交換の固定状態モデル',sources:['mqtt','models']});
D('n20-tunnel','C13','トンネルの外と内を比べる','包み直したパケットが、大きすぎたら？','tunnel','',[N('inner','内側パケットの大きさ',1450,200,2000,10,'B'),N('overhead','外側の追加情報',80,20,160,10,'B'),N('mtu','経路のMTU',1500,576,1600,1,'B'),S('ipVersion','外側のIP','IPv6',['IPv4','IPv6']),B('df','IPv4のDFを立てる',true)],{level:2,scope:'トンネルサイズとMTUの判定',sources:['ipv6','models']});
// Security specialization — S01..S24.
D('s01-threat','C15','守る性質を切り分ける','暗号化しても、防げないことはある？','threat','',[B('publicData','外部からデータを観測できる',true),B('encryption','内容を暗号化',true),B('editable','外部から書き換え可能',true),B('integrity','変更の認証・検証をする',false),B('outage','機器を停止させる',true),B('redundant','正常な冗長系がある',false)],{scope:'CIAの条件分解モデル',sources:['csf','models']});
D('s02-mod','C15','剰余と逆元','時計のように一周する数の世界を触る。','modular','',[N('a','整数 a',7,1,80),N('modulus','法 m',17,2,31)],{scope:'剰余・逆元の実計算',course:'暗号理論／離散数学'});
D('s02-euclid','C15','ユークリッドの互除法','大きな数の最大公約数を、小さい余りで求める。','modular','euclid',[N('a','整数 a',240,1,500),N('b','整数 b',46,1,300)],{scope:'最大公約数を実計算',course:'暗号理論／離散数学'});
D('s03-aes','C15','暗号化と改ざん検出','暗号文の1ビットを変えたら、復号はどうなる？','aes','',[T('message','実験用の平文','Meet at the library.'),B('tamper','暗号文の1ビットを反転',false),T('key','教材用AES鍵（16進数）','000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'),T('nonce','教材用nonce（96 bit）','00112233445566778899aabb')],{scope:'Web Crypto / AES-GCM 実演算',sources:['webcrypto','models'],limits:'固定鍵・nonceは結果を比較する教材専用。実用途で同一鍵とnonceを再利用しないでください。実際の秘密情報を入力しないでください。'});
D('s04-hash','C15','1ビットでハッシュはどう変わる？','入力の小さな違いを、出力で見比べる。','hash','sha',[T('message','ハッシュ化する文字列','Visual CS Lab'),B('flip','入力の最初の1ビットを反転',true)],{scope:'Web Crypto / SHA-256 実演算',sources:['webcrypto','models']});
D('s04-hmac','C15','共有鍵で内容を検証する','ハッシュに鍵を加えると、何を確認できる？','hash','hmac',[T('message','メッセージ','balance=100'),T('key','架空の共有鍵','demo-shared-key'),B('flip','受信内容の1ビットを変更',true)],{scope:'Web Crypto / HMAC-SHA-256',sources:['webcrypto','models']});
D('s04-signature','C15','署名を公開鍵で確かめる','秘密鍵を渡さず、文書の正しさを検証する。','signature','',[T('message','署名する文書','This is a laboratory note.'),B('tamper','文書の末尾に ! を追加',false)],{level:2,scope:'Web Crypto / ECDSA P-256',sources:['webcrypto','models'],limits:'実験ごとに新しい鍵を生成するため、署名値は毎回変わります。鍵は保存も送信もしません。'});
D('s05-dh','C15','秘密を送らず鍵を共有する','公開した数だけで、両側に同じ値を作れる？','dh','',[N('a','Aliceの秘密 a',6,1,20),N('b','Bobの秘密 b',15,1,20)],{level:2,scope:'法23のDH数式を実計算',sources:['models'],limits:'非常に小さい数の教材用計算。実用の秘密性も相手認証もありません。'});
D('s05-rsa','C15','小さなRSAを計算する','公開できる鍵と、戻すための鍵を分ける。','rsa','',[N('message','平文に相当する整数',65,0,3232)],{level:2,scope:'教科書的RSAの整数演算',sources:['models'],limits:'n=3233、パディングなしの説明用数式。実用暗号ではありません。'});
D('s06-tls','C15','TLSで相手を確かめる','鍵を共有できても、それだけで信頼できる？','tls','',[B('hostname','証明書の名前が一致',true),B('date','証明書の有効期間内',true),B('trusted','信頼する認証局へつながる',true),B('proof','秘密鍵の所持を検証できる',true)],{scope:'TLS 1.3基本フローの概念モデル',sources:['tls','models'],prereq:['s05-dh','s04-signature']});
D('s07-password','C15','パスワードをそのまま保存しない','同じパスワードでも、保存する値を変えられる。','password','',[T('password','架空のパスワード','demo-password-only'),T('salt','教材用salt','alice-example'),N('iterations','教材用の反復回数',10000,1000,50000,1000),B('sameSalt','AとBで同じsaltを使う',false)],{scope:'Web Crypto / PBKDF2 実演算',sources:['webcrypto','asvs','models'],limits:'低い反復回数と固定saltは比較用で、実サービスへの推奨値ではありません。実際のパスワードを入力しないでください。'});
D('s07-mfa','C15','認証の要素を重ねる','追加の認証要素は、何を防いで何を残す？','mfa','',[S('kind','追加要素','passkey',[['otp','OTP'],['passkey','パスキーの概念']]),B('password','パスワード確認に成功',true),B('factor','追加要素の確認に成功',true),B('phishing','別サイト経由の中継を想定',true)],{scope:'認証要素と信頼先の概念モデル'});
D('s08-access','C15','本人確認の後に、権限を確かめる','ログインできた人は、誰のデータでも変更できる？','access','rbac',[S('role','利用者の役割','member',['guest','member','editor','admin']),S('operation','操作','write',['read','write','delete']),B('owner','対象は自分のデータ',false),B('explicitDeny','この操作を明示的に拒否',false)],{scope:'明示した架空ポリシーの評価'});
D('s09-session','C15','ログアウトしたら失効する？','署名が正しいトークンを、いつ拒否する？','session','',[S('strategy','認証の状態管理','jwt',[['server','サーバーセッション'],['jwt','自己完結トークン']]),N('now','現在時刻',30,0,120,5),N('expiry','有効期限',60,10,120,5),B('logout','ログアウト済み',true),B('revocationCheck','失効ストアにも照会する',false),B('signed','署名・認証情報は正しい',true)],{scope:'期限・失効条件の評価'});
D('s09-oauth','C15','ログイン連携の境界を追う','認可コードは、そのままアクセストークンになる？','oauth','',[B('state','stateを照合できる',true),B('pkce','PKCE検証が成功',true),B('redirect','登録済みredirect URIと一致',true)],{level:2,scope:'Authorization Code + PKCEの概念'});
D('s10-cors','C15','送れることと読めることを分ける','CORSで読めないなら、要求も届いていない？','cors','',[S('origin','呼出し元','cross',[['cross','別オリジン'],['same','同一オリジン']]),S('request','要求の種類','simple',[['simple','単純GET'],['json','JSONのPOST']]),S('allowOrigin','許可オリジン','none',[['none','許可ヘッダーなし'],['match','呼出し元に一致'],['star','*（ワイルドカード）']]),B('credentials','認証情報付き',false),B('allowCredentials','認証情報を許可する応答',false),B('allowMethod','preflightでメソッドを許可',true),B('authorized','サーバー側の認可は成功',true)],{scope:'CORSの送信/処理/読取判定',sources:['cors','models'],level:2});
D('s11-sql','C15','コードとデータを分ける','外部入力をSQLの一部にしてしまうと？','websecurity','sql',[B('untrusted','構文を含む入力を想定',true),B('parameterized','パラメーター化する',false)],{scope:'SQL入力境界の条件モデル'});
D('s11-xss','C15','文字を実行可能にしない','表示するはずの入力が、命令になる境界。','websecurity','xss',[B('untrusted','実行可能なHTMLを含む想定',true),B('escape','HTMLテキスト文脈でエスケープ',true),B('csp','今回のインライン実行をCSPで拒否',false)],{scope:'固定XSS例の防御条件'});
D('s11-csrf','C15','意図しない送信を防ぐ','Cookieが自動で付くことに、どんな注意が必要？','websecurity','csrf',[B('untrusted','外部サイトからのPOST',true),B('token','CSRFトークンを照合',false),B('sameSite','今回のCookieをSameSiteで非送信',false)],{scope:'架空クロスサイトPOSTの判定'});
D('s11-ssrf','C15','サーバーからのアクセスを制限する','URLを受け取る機能が、内部への入口になる？','websecurity','ssrf',[B('untrusted','内部アドレスを指定する想定',true),B('allowlist','完全一致の許可先に限定',true)],{scope:'SSRFの固定到達性モデル'});
D('s11-path','C15','ファイルの範囲を守る','指定されたパスは、本当に許可した場所の中？','websecurity','path',[B('untrusted','範囲外のパスを想定',true),B('normalize','正規化後に許可ルート配下か照合',false)],{scope:'ファイルパスの境界判定'});
D('s12-firewall','C15','ファイアウォールの順序を読む','同じ通信に複数の規則が当たったら？','firewall','',[S('zone','送信元のゾーン','external',['external','internal','admin']),S('port','宛先ポート',443,[22,53,80,443,3306]),B('blockHttps','先頭にHTTPS拒否規則を追加',false),B('established','確立済み接続の戻りと判定済み',false)],{scope:'first-matchの規則評価'});
D('s13-permission','C15','Linuxの権限ビットを読む','755や644の数字は、どんな操作を許す？','access','posix',[S('mode','通常ファイルのmode','640',['600','640','644','700','750','755','777']),S('who','アクセスする立場','other',['owner','group','other']),S('operation','要求する操作','read',['read','write','execute'])],{scope:'通常ファイルのPOSIX rwx',sources:['os','models']});
D('s14-buffer','C15','メモリの境界を越える前に','長さが収まっていれば、いつでも安全？','buffer','',[N('capacity','確保したセル数',8,4,20),N('length','書き込むセル数',12,1,24),B('freed','領域は解放済み',false),B('check','境界・生存期間を検査',true)],{scope:'範囲と生存期間の条件判定'});
D('s15-pipeline','C15','検査を開発に組み込む','1種類のテストだけで、全部の問題が見つかる？','pipeline-security','',[S('issue','混入する問題','permission',['unsafe input','known dependency','regression','permission','secret']),B('static','静的解析',true),B('dependencies','依存関係照合',true),B('tests','回帰テスト',true),B('review','レビュー',false)],{scope:'既知の検出表による設計演習',sources:['ssdf','models']});
D('s16-cloud','C15','公開設定と権限を重ねる','読取りを許可しても、拒否規則があったら？','cloud','',[S('role','主体の権限','none',['none','reader','admin']),B('public','保存領域を公開',true),B('deny','明示的な拒否を適用',false)],{scope:'架空クラウドのIAM条件モデル'});
D('s17-detection','C15','警告の閾値を調整する','見逃しを減らすと、正常なイベントはどうなる？','detection','',[N('threshold','警告を出す閾値',65,0,100),N('base','100件中の異常イベント数',10,1,60),N('seed','合成データのseed',42,1,99)],{scope:'合成ラベル付き100件の評価',prereq:['c03-bayes']});
D('s18-incident','C15','証拠から時系列を組み立てる','時計がずれていたら、出来事の順序は信じられる？','incident','',[N('skew','APIサーバーの時計のずれ',8,-20,20,1,'s'),B('correct','既知の時計のずれを補正',false),S('filter','表示する発生源','all',['all','Auth','API','Audit'])],{scope:'架空の認証・操作ログ'});
D('s19-backup','C15','障害からどこまで戻れる？','バックアップがあれば、データは失われない？','backup','',[N('interval','バックアップ間隔',15,5,30,5,'分'),N('failure','障害が起きる時刻',52,31,90,1,'分'),N('restore','復元にかかる時間',10,1,30,1,'分'),N('verify','検証にかかる時間',5,1,15,1,'分'),B('corrupted','保存領域ごと破損',false),B('isolated','バックアップを隔離',true)],{scope:'復元時点と所要時間の計算',sources:['csf','models']});
D('s20-update','C15','安全に機器を更新する','正しい署名なら、古い脆弱な版へ戻してよい？','iot-security','',[B('identity','対象機器の識別が一致',true),B('signature','署名の検証結果が正しい',true),B('rollback','古いバージョンへ戻す',true)],{scope:'機器更新の受入れ条件'});
D('s21-anonymity','C15','名前を消すだけで十分？','年齢と地域の組み合わせで、1人に絞れる？','privacy','',[S('generalize','年齢の一般化',0,[[0,'実年齢'],[1,'10歳刻み'],[2,'成人にまとめる']]),B('hideZip','地域を伏せる',false),B('removeName','明示的なIDを除く',true)],{scope:'架空12人の準識別子グループ数'});
D('s22-human','C15','急ぐ前に確認する','見慣れたメールでも、何を確かめる？','people','',[B('unexpected','予期しないメッセージ',true),B('sensitive','金銭や認証情報を要求',true),B('urgent','急いで判断させる',true),B('confirmed','独立した連絡先で確認済み',false)],{scope:'判断の観点を整理する教材',sources:['csf','models']});
D('s23-sharing','C15','秘密を分けて持つ','5つのうち2つ集まったときだけ復元する。','shamir','',[N('secret','教材用の秘密',9,0,16),N('count','集める共有片の数',2,1,5)],{level:3,scope:'2-of-5 Shamirの数式モデル',sources:['models'],limits:'法17・公開固定係数7。秘密性のある実装ではなく、有限体での復元計算だけを示します。'});
D('s23-zk','C15','秘密を見せずに確かめる','答えを知らない人が、偶然通れる確率は？','zk','',[B('cheat','秘密の通路を知らない人',true),N('rounds','独立した確認回数',5,1,15),N('seed','seed',42,1,99)],{level:3,scope:'ゼロ知識証明の洞窟の類推',sources:['models']});
D('s23-migration','C15','暗号の移行と通信量','新しい方式で、通信するデータ量はどう変わる？','pqc','',[N('key','公開鍵サイズ（仮定値）',1200,100,4000,100,'B'),N('ciphertext','暗号文サイズ（仮定値）',1100,100,4000,100,'B'),N('signature','署名サイズ（仮定値）',2500,100,8000,100,'B'),N('bandwidth','回線速度',10,1,100,1,'Mbps')],{level:3,scope:'入力したサイズの転送時間計算',sources:['pqc','models'],limits:'ML-KEM/ML-DSA等の暗号演算や安全性検証は未実装。特定方式の公称サイズではなく自由入力の移行コスト教材です。'});
D('s24-ai','C15','AIに渡す情報と権限を分ける','読んだ文書の指示で、秘密を送信してよい？','ai-security','',[B('injection','未信頼文書に外部送信の指示',true),B('readSecret','機密情報を読む権限',true),B('send','外部送信ツールの権限',true),B('guard','今回の要求を外部ポリシーで拒否',false)],{level:3,scope:'架空エージェントの権限モデル'});
// Eight integrated exercises.
D('x01-build','C13','小さなネットワークを組む','機器を追加し、線を切り、届く道を自分で作る。','builder','',[T('source','送信元のID','PC'),T('target','宛先のID','WEB'),C('topology','トポロジーJSON',JSON.stringify(L.defaultTopology,null,2),'図のリンクをクリックすると接続/切断。機器の追加と接続は作業台のボタンを使います。')],{track:'missions',scope:'経路・到達性の編集可能モデル',minutes:20,prereq:['n03-switch','n08-routing'],course:'セキュリティ・ネットワーク開発演習への準備'});
D('x02-publish','C15','Webサービスを安全に公開する','表示できるだけでなく、境界を守る構成にする。','mission','publish',[B('dns','DNSの回答が正しい',true),B('port','443番への経路を許可',true),B('cert','TLS証明書を検証できる',false),B('adminPublic','管理用の入口を一般公開',true),B('auth','データへの認可を行う',false)],{track:'missions',scope:'条件評価による構成演習',minutes:20});
D('x03-diagnose','C13','つながらない・遅いを診断する','原因の名前を見る前に、証拠から考える。','diagnose','',diagnosisControls(),{track:'missions',scope:'5種類の架空障害の診断演習',minutes:20});
D('x04-organization','C15','組織のネットワークを分ける','業務を止めず、ゲストから大切なデータを守る。','mission','organization',[B('routing','必要なルーティングを有効化',true),B('web','業務用Web通信を許可',true),B('segment','ゲストのネットワークを分割',false),B('guestDb','ゲスト→DBを許可',true),B('management','管理用経路を独立',false),B('dns','必要なDNSを許可',true)],{track:'missions',scope:'通信要件の構成評価',minutes:20});
D('x05-patch','C16','問題のあるアプリを修正する','修正・検証・履歴まで、ひと続きに考える。','mission','patch',[B('parameterized','SQLをパラメーター化',true),B('owner','対象データの所有者を検証',false),B('tests','回帰テストを追加',false),B('commit','変更をコミットとして記録',false)],{track:'missions',scope:'修正手順の設計演習',minutes:20});
D('x06-response','C15','調査から復旧まで進める','ログを消してしまう前に、何を残す？','mission','response',[B('evidence','証拠を保全',false),B('revoke','侵害した認証情報を失効',true),B('isolate','影響範囲を隔離',true),B('verified','復元元の正常性を検証',false),B('fix','再発原因を修正',false)],{track:'missions',scope:'対応・復旧の条件演習',minutes:25});
D('x07-iot','C19','止まっても戻れるIoTを作る','接続・通知・更新・回復をひとつの構成にする。','mission','iot',[B('identity','機器を一意に識別',true),B('network','必要な通信を許可',true),B('idempotent','重複しても同じ結果にする',false),B('signed','更新の署名を検証',false),B('recovery','更新失敗から回復できる',false)],{track:'missions',scope:'機器運用の条件演習',minutes:20});
D('x08-research','C03','実験して、根拠を残す','その違いは、変えた条件のせいと言える？','mission','research',[N('seedA','条件Aのseed',42,1,99),N('seedB','条件Bのseed',43,1,99),N('changed','変えた条件の数',3,1,5),N('repeats','繰り返し回数',1,1,10),B('limit','モデルの限界を記録',false)],{track:'missions',scope:'比較実験の設計演習',minutes:25});
})();
