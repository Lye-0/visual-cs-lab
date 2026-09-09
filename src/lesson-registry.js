/* Enforce coverage; never silently substitute a generic lesson for a missing one. */
(() => {
'use strict';
const L=CSL;
const verbs={binary:'次の読み方を確かめる',encoding:'次の検査へ進む',huffman:'次の結合を見る',automaton:'次の文字を読む','subset-automaton':'次の集合状態を見る',cpu:'次の命令の動きを見る',scheduler:'次の割り当てを見る',tcp:'次の送受信を見る',signal:'次の計算へ進む','linear-code':'次の検査を実行する','load-register':'次の選択・クロックを見る','hop-envelopes':'次の区間・受渡しを見る','source-entropy':'次の項を足す'};
for(const lab of L.labs){
 const d=L.lessonDrafts[lab.id];if(!d)throw Error('固有の解説がありません: '+lab.id);
 const keys=(d.focus||'').split(',').filter(k=>lab.controls.some(c=>c.key===k));
 lab.reading={...d,focus:keys.length?keys:lab.controls.slice(0,2).map(c=>c.key),nextLabel:verbs[lab.engine]||'次の判断・計算を見る',notes:d.notes||lab.notes||'',terms:(L.glossary||[]).filter(g=>g.lab===lab.id).slice(0,5)};
 lab.guide=[d.example,lab.exploration.label+'：'+lab.observe,d.pitfall];
 lab.lesson=d.idea;
 lab.keywords=[...(lab.keywords||[]),...(lab.reading.notes?[lab.reading.notes.split(' ')[0]]:[]),d.idea];
}
const additions=[
 ['自己情報量','ある出来事が起きたと知ったときの情報量。底2なら−log₂pでbitを単位にします。','c01-information'],
 ['平均情報量','各出来事の自己情報量を、その確率で重み付けした平均です。','c01-entropy'],
 ['結合エントロピー','2つの変数を組として知るときの平均情報量です。','c01-joint'],
 ['条件付きエントロピー','片方を知った条件で、もう片方に残る平均的な不確かさです。','c01-joint'],
 ['相互情報量','片方を知ることによって減る、もう片方の不確かさです。','c01-joint'],
 ['マルコフ情報源','次の記号の確率が、過去の状態に依存する情報源のモデルです。','c01-markov'],
 ['定常確率','遷移を1回行っても変わらない、状態の確率分布です。','c01-markov'],
 ['通信路容量','入力分布を選んだときの、伝送情報量の最大値です。','c01-channel'],
 ['BSC','0→1と1→0の反転確率が等しい2元対称通信路です。','c01-channel'],
 ['瞬時符号','どの符号語も別の符号語の先頭でなく、遅れずに区切れる符号です。','c01-prefix'],
 ['クラフトの不等式','指定された長さで瞬時符号を構成できるかを表す条件です。','c01-kraft'],
 ['シャノン・ファノ','確率の大きい順に並べ、確率の和が近い2群へ分割する符号化法です。','c01-shannon-fano'],
 ['ハミング距離','同じ長さのビット列の間で、異なる位置の個数です。','c01-distance'],
 ['シンドローム','受信したビット列に検査行列を作用させて得る検査結果です。','c01-linear-code'],
 ['生成行列','情報ビットから符号語を作るための行列です。','c01-linear-code'],
 ['検査行列','受信した符号語に対する各パリティ検査を行としてまとめた行列です。','c01-linear-code'],
 ['NFA','入力と状態に対して複数の遷移先を持てる、非決定性有限オートマトンです。','c02-nfa'],
 ['集合状態','NFAで同時にあり得る複数の状態を、集合として1つにまとめた表現です。','c02-nfa'],
 ['DFF','この教材ではクロックの立上りで入力を取り込む、1ビットの記憶回路です。','c08-register'],
 ['Mux','選択信号に応じて複数の入力の1つを出力へ渡す回路です。','c08-register']
];
for(const [term,definition,lab] of additions){if(!(L.glossary||[]).some(g=>g.term===term))L.glossary.push({term,definition,lab});}
const ent=L.glossary.find(g=>g.term==='エントロピー');if(ent)ent.lab='c01-entropy';
for(const lab of L.labs)lab.reading.terms=L.glossary.filter(g=>g.lab===lab.id).slice(0,5);
L.readingCourses=[
 {id:'information',name:'情報理論',description:'確率 → 情報量 → 通信路 → 符号化 → 誤りの検出・訂正。提供ノートの流れに沿う入口です。',groups:[
  ['確率から情報量へ',['c03-probability','c03-bayes','c01-information','c01-entropy','c01-joint']],
  ['情報源と通信路',['c01-markov','c01-channel']],
  ['符号を作る',['c01-prefix','c01-kraft','c01-shannon-fano','c01-huffman']],
  ['誤りを調べる',['c01-distance','c01-hamming','c01-linear-code','n02-crc']]
 ]},
 {id:'introduction',name:'計算機科学入門',description:'0と1 → 回路 → 計算のモデル → CPU・OS → ネットワーク。必要な単元から直接開けます。',groups:[
  ['表現と回路',['c01-bits','c01-utf8','c08-gate','c08-nand','c08-adder','c08-register']],
  ['状態と計算',['c02-dfa','c02-nfa','c02-turing','c07-compiler']],
  ['CPUとメモリ',['c09-cpu','c09-cache','c10-pointer','c10-address-spaces','c10-translation','c10-pages']],
  ['OSと並行処理',['c11-scheduler','c12-race','c12-deadlock','c11-files']],
  ['ネットワークと安全性',['n01-packet','n01-forwarding','n04-subnet','n04-vlsm','n05-arp','n10-transport','n11-tcp','n09-dns','s01-threat','s06-tls']],
  ['人と操作',['c20-contrast','c20-privacy']]
 ]}
];
L.readingRelations={
 'c01-hamming':['c01-distance','c01-linear-code','n02-crc'],
 'c01-huffman':['c01-entropy','c01-prefix','c01-shannon-fano'],
 'c01-linear-code':['c01-hamming','c01-distance','n02-crc'],
 'n01-packet':['n01-forwarding','n10-transport'],
 'n01-forwarding':['n05-arp','n04-subnet','n12-nat'],
 'n11-tcp':['n10-transport','n11-congestion','n13-http'],
 'c10-pages':['c10-address-spaces','c10-translation'],
 'c10-translation':['c10-address-spaces','c10-pages'],
 'c08-gate':['c08-nand','c08-adder','c08-register'],
 's06-tls':['s05-dh','s04-signature','s08-access'],
 's10-cors':['s08-access','s11-csrf','n13-http']
};
})();
