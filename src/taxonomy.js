/* Primary navigation taxonomy. Preserve every lab ID, model and legacy area.
 * Every unit has exactly one primary theme; related themes do not inflate counts.
 */
(() => {
'use strict';
const L=CSL;
const domains=[
 ['math','数学・理論','math','数・確率・論理から、情報と計算の性質を理解します。'],
 ['systems','計算機・システム','cpu','データの表現、回路、CPU、OS、分散処理をつなぎます。'],
 ['network','ネットワーク','network','アドレス、通信手順、経路、性能と障害を確かめます。'],
 ['security','セキュリティ','shield','暗号、認証、権限、防御と調査を区別して学びます。'],
 ['data','データ・AI','database','データの設計・検索から、学習と自然言語処理へ進みます。'],
 ['software','プログラミング・開発','code','コード、データ構造、算法、言語処理系、開発手法を学びます。'],
 ['media','メディア・HCI','wave','波・画像・立体の表現と、人に伝わる操作を考えます。'],
 ['practice','総合・倫理・研究','flask','複数の知識を使う演習、社会への影響、実験と研究を扱います。']
].map(([id,name,icon,description])=>({id,name,icon,description}));
const categories=[];
function theme(domain,id,name,description,gaps=[]){categories.push({id,domain,name,description,gaps});}
theme('math','math-linear','線形代数・複素数','ベクトル、行列、基底、固有値と、複素平面上の表現を調べます。',[1,2,3,7]);
theme('math','math-calculus','微分・積分','変化率と累積量を、関数・近似・多変数へ広げて考えます。',[4,5,6]);
theme('math','math-numerical','数値解析・最適化','近似計算の手順、誤差、微分方程式、最適化を比べます。',[8,9,10]);
theme('math','math-probability','確率・確率分布','偶然の起き方、条件付き確率、標本のばらつきを理解します。',[12,13,14]);
theme('math','math-statistics','統計・多変量解析','データの特徴をまとめ、推定・検定・多変量の分析を行います。',[11,15,16,17]);
theme('math','math-discrete','離散数学・論理','集合、命題、証明、組合せ、グラフの性質を確かめます。',[18,19,20,21,22]);
theme('math','math-computation','オートマトン・計算理論','状態や文法で計算を表し、計算可能性と問題の難しさを学びます。',[24,25,26,27]);
theme('math','math-information','情報量・情報源・通信路','自己情報量からエントロピー、通信で伝わる情報量へ進みます。',[29]);
theme('math','math-coding','符号理論・誤り訂正','復号の一意性、符号の長さ、検査・訂正の仕組みを調べます。',[28,30,31,32]);
theme('math','math-compression','データ圧縮','頻度・辞書・区間を使って、データを短く表す手順を比べます。',[33]);
theme('systems','sys-representation','数・文字・ビットの表現','同じビットを、整数・小数・文字・バイト列として読み分けます。',[34]);
theme('systems','sys-circuits','電気・電子回路','電圧、電流、素子と、時間・周波数による回路の変化を扱います。',[59,60,61]);
theme('systems','sys-logic','論理回路','真理値表からゲート、加算器、記憶する回路を組み立てます。',[62,63,64,65]);
theme('systems','sys-cpu','CPU・アーキテクチャ','命令、制御信号、パイプライン、割込み、性能を調べます。',[66,67,68,69,71,73]);
theme('systems','sys-memory','メモリ・キャッシュ','値と場所、確保、アドレス変換、局所性を区別して学びます。',[70,72]);
theme('systems','sys-os','OS・ファイル・仮想化','プロセス、資源の配分、入出力、ファイル、隔離を学びます。',[74,75,76,79,80]);
theme('systems','sys-concurrency','並行・並列処理','処理の順番を変え、競合・待機・排他・並列化を確かめます。',[77,78,81]);
theme('systems','sys-distributed','分散システム','別々に動く機器の時刻、複製、合意、再試行を考えます。',[82,83,84,85,86,87]);
theme('systems','sys-embedded','IoT・組み込み・制御','機器の入出力、センサー、制御と時間制約を扱います。',[140,141,142,143]);
theme('network','net-basics','通信の全体像・階層','データが相手へ届くまでに、各階層が何を担当するかを追います。');
theme('network','net-lan','LAN・Ethernet・VLAN','リンク上の転送、MAC学習、ネットワークの分割とループを調べます。',[95]);
theme('network','net-ip','IP・アドレス設定','IPv4・IPv6、サブネット、ARP、DHCP、NATとMTUを扱います。',[96,97]);
theme('network','net-routing','ルーティング','経路表と経路広告を使い、次に渡す相手を選ぶ手順を学びます。',[101]);
theme('network','net-dns','名前解決・DNS','名前を問い合わせる階層、キャッシュ、委任を確かめます。',[98]);
theme('network','net-transport','TCP・UDP・信頼性','接続、順序、再送、受信窓と混雑への対応を区別します。',[99,100]);
theme('network','net-applications','Web・アプリの通信','HTTP、QUIC、メッセージ配信など、アプリが使う通信を追います。',[105]);
theme('network','net-wireless','物理層・無線通信','伝送時間、信号、変調、共有する無線媒体の振る舞いを学びます。',[103,104]);
theme('network','net-operations','性能・構築・障害診断','待ち行列、負荷分散、構成、観測結果から通信を診断します。',[102,106,108]);
theme('security','sec-risk','守る対象・脅威・リスク','何を誰から守るのか、境界と対策を整理します。',[109]);
theme('security','sec-crypto','暗号の基礎・共通鍵・ハッシュ','剰余計算、暗号化、ハッシュ、MACと安全性の前提を分けます。',[110,111,112]);
theme('security','sec-public','公開鍵・電子署名','鍵共有、公開鍵暗号、署名の生成と検証を学びます。');
theme('security','sec-channel','PKI・TLS・VPN','相手の確認と鍵の利用を組み合わせ、通信を保護します。',[107,113]);
theme('security','sec-identity','認証・セッション','パスワード、追加要素、トークン、認証連携を区別します。',[114]);
theme('security','sec-access','認可・アクセス制御','誰が何をできるか、役割・属性・ポリシーで判断します。',[115]);
theme('security','sec-web','Web・APIの安全性','ブラウザの境界と、入力が処理の構造を変える問題を確かめます。',[116]);
theme('security','sec-system','システム・開発・機器の防御','OS、メモリ、依存部品、機器の更新に関わる防御を扱います。',[118,119]);
theme('security','sec-operations','防御運用・検知・復旧','通信制御、検知、証拠、バックアップと復旧の判断を学びます。',[117,120]);
theme('security','sec-advanced','発展的な暗号','秘密分散、証明、耐量子暗号などを範囲を絞って確かめます。',[121]);
theme('data','data-design','データモデル・正規化','データの構造、キー、制約と、表を分ける理由を理解します。',[88,89,94]);
theme('data','data-query','SQL・索引・検索','問い合わせ、JOIN、索引、実行計画をデータに対応させます。',[90,91]);
theme('data','data-transactions','トランザクション・障害回復','同時更新、分離レベル、ログと回復の手順を確かめます。',[92,93]);
theme('data','data-learning','機械学習・データ分析','前処理、回帰、分類、クラスタリングと評価を扱います。',[122,123,124]);
theme('data','data-neural','ニューラルネットワーク','重み、出力、損失、逆伝播がどのようにつながるかを追います。',[125]);
theme('data','data-reasoning','AIの探索・推論・強化学習','状態から行動や解を選び、探索・推論・報酬による学習を比べます。',[126,127]);
theme('data','data-language','自然言語処理・情報検索','語の分割、文書表現、構文、Attention、検索と評価を学びます。',[128,129,130,131,132]);
theme('software','dev-programming','プログラム・関数・型','値、参照、スコープ、関数、型、例外、モジュールを確かめます。',[35,36,39,40,41,42]);
theme('software','dev-objects','オブジェクト指向','クラス、インスタンス、責務、継承と多態性を学びます。',[37,38]);
theme('software','dev-structures','データ構造','配列、リスト、木、ヒープ、ハッシュの操作と費用を比べます。',[43,44,45,46]);
theme('software','dev-algorithms','アルゴリズム・計算量','探索、整列、グラフ、動的計画法と、手順の増え方を学びます。',[23,47,48,49,50,51]);
theme('software','dev-languages','言語処理系・ランタイム','字句・構文・意味解析からコード生成、リンク、実行とGCへ進みます。',[52,53,54,55,56,57,58]);
theme('software','dev-git','Git・バージョン管理','作業ツリー、ステージ、履歴、ブランチと同期を操作します。');
theme('software','dev-engineering','設計・テスト・共同開発','要求、設計、変更、テスト、ビルドと共同作業を考えます。',[144,145,146,147]);
theme('software','dev-web','ブラウザ・Webアプリ開発','DOM、CSS、イベントと、API・入力検証・DB連携を学びます。',[154,155]);
theme('media','media-signals','信号・音・フーリエ解析','標本化、周波数、フィルタ、量子化と再構成を調べます。',[133,134,135]);
theme('media','media-images','画像処理','画素、色、畳み込み、領域と幾何変換を対応させます。',[136]);
theme('media','media-graphics','CG・描画・アニメーション','座標、投影、奥行き、光、材質と動きの表現を学びます。',[137,138,139]);
theme('media','media-hci','HCI・ユーザビリティ','操作の手掛かり、フィードバック、観察と使いやすさを考えます。',[148,149]);
theme('media','media-accessibility','アクセシビリティ','配色、名前、フォーカス、キーボード操作と情報の伝え方を確かめます。',[150]);
theme('practice','practice-missions','総合演習・ケーススタディ','構築、診断、修正、復旧などで複数の知識を組み合わせます。');
theme('practice','practice-ethics','情報倫理・プライバシー','情報の扱い、権利、公平性、説明責任と社会への影響を考えます。',[151]);
theme('practice','practice-research','実験・研究の進め方','問い、測定、比較、再現性、引用と考察のつながりを学びます。',[152,153]);
const domainMap=new Map(domains.map(d=>[d.id,d])),categoryMap=new Map(categories.map(c=>[c.id,c]));
if(categoryMap.size!==categories.length)throw Error('分類IDが重複しています。');
const gapMap=new Map();
for(const c of categories)for(const n of c.gaps){if(gapMap.has(n))throw Error('GAPの分類が重複: '+n);gapMap.set(n,c.id);}
if(gapMap.size!==155||Array.from({length:155},(_,i)=>i+1).some(n=>!gapMap.has(n)))throw Error('GAPの分類が不足しています。');
const overrides={
 'c01-bits':'sys-representation','c01-float':'sys-representation','c01-utf8':'sys-representation',
 'c01-information':'math-information','c01-entropy':'math-information','c01-joint':'math-information','c01-markov':'math-information','c01-channel':'math-information',
 'c01-huffman':'math-compression','c01-shannon-fano':'math-compression',
 'c01-hamming':'math-coding','c01-prefix':'math-coding','c01-kraft':'math-coding','c01-distance':'math-coding','c01-linear-code':'math-coding',
 'c02-set':'math-discrete','c03-matrix':'math-linear','c03-derivative':'math-calculus','c03-integral':'math-numerical',
 'c09-cache':'sys-memory','n02-crc':'math-coding','s04-signature':'sec-public',
 'c18-image':'media-images','c18-projection':'media-graphics','c20-privacy':'practice-ethics','c20-contrast':'media-accessibility'
};
const areaMap={C02:'math-computation',C03:'math-probability',C04:'dev-programming',C05:'dev-structures',C06:'dev-algorithms',C07:'dev-languages',C08:'sys-logic',C09:'sys-cpu',C10:'sys-memory',C11:'sys-os',C12:'sys-concurrency',C14:'data-query',C16:'dev-git',C17:'data-learning',C18:'media-signals',C19:'sys-embedded',C20:'media-hci'};
const networkMap=['net-basics','net-wireless','net-lan','net-ip','net-ip','net-ip','net-lan','net-routing','net-dns','net-transport','net-transport','net-ip','net-applications','net-operations','net-applications','net-operations','net-wireless','net-operations','net-applications','net-ip'];
const securityMap=['sec-risk','sec-crypto','sec-crypto','sec-crypto','sec-public','sec-channel','sec-identity','sec-access','sec-identity','sec-web','sec-web','sec-operations','sec-system','sec-system','sec-system','sec-access','sec-operations','sec-operations','sec-operations','sec-system','practice-ethics','sec-operations','sec-advanced','sec-system'];
const baseline=new Set(L.curriculum.baselineIds);
function primary(lab){
 if(lab.gapId)return gapMap.get(Number(lab.id.slice(4)));
 if(!baseline.has(lab.id))throw Error('新しい単元の分類を定義してください: '+lab.id);
 if(overrides[lab.id])return overrides[lab.id];
 if(lab.track==='missions')return 'practice-missions';
 if(lab.track==='network')return networkMap[Number(lab.topic?.slice(1))-1];
 if(lab.track==='security')return securityMap[Number(lab.topic?.slice(1))-1];
 if(lab.engine==='eventloop')return 'dev-web';
 if(lab.engine==='replication')return 'sys-distributed';
 if(lab.engine==='transaction')return 'data-transactions';
 if(lab.area==='C16'&&lab.engine!=='git')return 'dev-engineering';
 return areaMap[lab.area];
}
const related={
 'gap-007':['media-signals'],'gap-017':['data-learning'],'gap-019':['dev-algorithms'],
 'gap-022':['dev-algorithms'],'gap-023':['math-computation'],'gap-028':['math-information','math-compression'],
 'gap-029':['net-wireless'],'gap-032':['net-lan'],'gap-034':['dev-programming'],
 'gap-036':['sys-memory'],'gap-058':['sys-memory'],'gap-071':['sys-concurrency','sys-memory'],
 'gap-080':['sec-system'],'gap-086':['data-transactions'],'gap-096':['net-dns'],
 'gap-107':['net-ip'],'gap-110':['math-discrete','math-linear'],'gap-117':['net-operations'],
 'gap-119':['dev-engineering'],'gap-122':['math-statistics'],'gap-131':['data-neural'],
 'gap-139':['media-signals','math-compression'],'gap-141':['net-applications'],
 'gap-147':['dev-git'],'gap-150':['dev-web'],'gap-151':['sec-risk'],
 'n02-crc':['net-lan'],'c01-huffman':['math-coding'],'c03-bayes':['sec-operations'],'c07-gc':['sys-memory']
};
for(const lab of L.labs){
 const id=primary(lab),category=categoryMap.get(id);
 if(!category)throw Error('単元の分類がありません: '+lab.id+' ('+id+')');
 const more=(related[lab.id]||[]).filter(x=>x!==id);
 if(more.some(x=>!categoryMap.has(x)))throw Error('関連分類がありません: '+lab.id);
 lab.taxonomy=Object.freeze({domain:category.domain,category:id,related:Object.freeze(more)});
}
const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase().replace(/[\u30a1-\u30f6]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)).trim();
const glossary=new Map(),courseNames=new Map();
for(const g of L.glossary){if(!glossary.has(g.lab))glossary.set(g.lab,[]);glossary.get(g.lab).push(g.term+' '+g.definition);}
for(const course of L.courses)for(const id of course.labs){if(!courseNames.has(id))courseNames.set(id,[]);courseNames.get(id).push(course.name);}
const documents=new Map(L.labs.map(l=>[l.id,normalize([l.id,l.gapId,l.unit,l.title,l.summary,l.question,l.course,...(l.keywords||[]),...(courseNames.get(l.id)||[]),domainMap.get(l.taxonomy.domain).name,categoryMap.get(l.taxonomy.category).name,categoryMap.get(l.taxonomy.category).description,...l.taxonomy.related.map(id=>categoryMap.get(id).name),...(glossary.get(l.id)||[])].join(' '))]));
function search(q=''){
 const words=normalize(q).split(/\s+/).filter(Boolean);
 return L.labs.filter(l=>words.every(w=>documents.get(l.id).includes(w))).sort((a,b)=>{
  if(!words.length)return 0;
  const score=l=>words.reduce((s,w)=>s+(normalize(l.id)===w?20:0)+(normalize(l.unit).includes(w)?4:0)+(normalize(l.title).includes(w)?2:0),0);
  return score(b)-score(a);
 });
}
function select(params={}){
 const p=params instanceof URLSearchParams?Object.fromEntries(params):params;
 return search(p.q).filter(l=>(!p.domain||l.taxonomy.domain===p.domain)&&(!p.category||l.taxonomy.category===p.category)&&(!p.level||l.level===+p.level)&&(!p.area||l.area===p.area)&&(!p.track||l.track===p.track)&&(!p.topic||l.topic===p.topic));
}
function counts(labs=L.labs){const unique=new Map(labs.map(l=>[l.id,l])),d=Object.fromEntries(domains.map(x=>[x.id,0])),c=Object.fromEntries(categories.map(x=>[x.id,0]));for(const l of unique.values()){d[l.taxonomy.domain]++;c[l.taxonomy.category]++;}return {total:unique.size,domains:d,categories:c};}
function page(labs,requested=1,size=24){
 const pages=Math.max(1,Math.ceil(labs.length/size));
 const index=Math.max(1,Math.min(pages,Math.floor(Number(requested))||1));
 return {items:labs.slice((index-1)*size,index*size),number:index,pages,total:labs.length,start:labs.length?(index-1)*size+1:0,end:Math.min(index*size,labs.length)};
}
const T=L.taxonomy={domains,categories,domain:id=>domainMap.get(id),category:id=>categoryMap.get(id),search,select,counts,page,normalize};
T.path=lab=>[T.domain(lab.taxonomy.domain),T.category(lab.taxonomy.category)];
T.total=counts();
for(const c of categories){c.count=T.total.categories[c.id];if(!c.count)throw Error('空の分類: '+c.id);Object.freeze(c.gaps);Object.freeze(c);}
for(const d of domains){d.count=T.total.domains[d.id];Object.freeze(d);}
Object.freeze(categories);Object.freeze(domains);
})();
