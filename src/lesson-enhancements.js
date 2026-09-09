/* Deeper traces, while preserving the original engines' public metrics. */
(() => {
'use strict';
const L=CSL,{frame:F,result:out,clone,register:R}=L;
const signal=L.engines.signal;
L.teachingMath.polynomialDivide=(text,divisor='1011')=>{
 const a=L.teachingMath.binary(text,4,64),d=L.teachingMath.binary(divisor,2,16),steps=[];
 if(d[0]!==1)throw Error('生成多項式の先頭を1にしてください。');
 for(let i=0;i<=a.length-d.length;i++){
  const before=a.join(''),apply=a[i]===1;
  if(apply)for(let j=0;j<d.length;j++)a[i+j]^=d[j];
  steps.push({before,after:a.join(''),position:i,apply,divisor:d.join('')});
 }
 return {remainder:a.slice(-(d.length-1)).join(''),steps};
};
R('signal',(p,lab)=>{
 if(lab.variant!=='crc')return signal(p,lab);
 const data=L.teachingMath.binary(p.data,1,24).join(''),divide=L.teachingMath.polynomialDivide,encoding=divide(data+'000'),sent=data+encoding.remainder,received=[...sent];
 if(p.flip>sent.length)throw Error(`反転位置は0〜${sent.length}で指定してください。0は反転なしです。`);
 if(p.flip>0)received[p.flip-1]=String(1-Number(received[p.flip-1]));
 const decoding=divide(received.join(''));
 const frames=[F('データを多項式の係数として読む','右端が定数項です。生成多項式1011はx³+x+1なので、検査ビット用に3個の0を右へ足します。',{type:'lesson-division',original:data+'000',before:data+'000',after:data+'000',position:-1,divisor:'1011',phase:'送信側',apply:false})];
 encoding.steps.forEach(s=>frames.push(F(`送信側：左から${s.position+1}番目を確かめる`,s.apply?'先頭が1なので、1011をこの位置に合わせてXORします。繰下がりはありません。':'先頭は0なので、この位置ではXORせず次へ進みます。',{type:'lesson-division',...s,original:data+'000',phase:'送信側'})));
 frames.push(F('検査ビットを付けて送る',`余り${encoding.remainder}を右へ付けます。受信側へは元のデータの正解や誤り位置を判定用に渡しません。`,{type:'bitrow',bits:sent,split:data.length,labels:['データ','CRC']}));
 frames.push(F('通信路を通った列を受け取る',p.flip?'今回は1ビットを反転した条件です。検査は受信列から計算します。':'今回は反転なしです。',{type:'bitrow',bits:received.join(''),split:data.length,labels:['受信データ','受信CRC']}));
 decoding.steps.forEach(s=>frames.push(F(`受信側：左から${s.position+1}番目を確かめる`,s.apply?'受信した列を1011で割ります。1の位置でXORを行います。':'この位置は0です。次の位置へ進みます。',{type:'lesson-division',...s,original:received.join(''),phase:'受信側'})));
 frames.push(F('受信側の余りで判定する',decoding.remainder==='000'?'余りは000です。今回は誤りを検出しませんでした。一般に誤りなしと同値だとは限りません。':'余りが0でないため誤りを検出しました。CRCから自動で正しい本文を復元する処理ではありません。',{type:'flow',nodes:['受信列','1011で割る',`余り ${decoding.remainder}`],active:2,failed:decoding.remainder!=='000'},{'余り':decoding.remainder}));
 return out(frames,{'データ長':data.length,'CRC長':3,'検出':decoding.remainder==='000'?'なし':'あり'});
});
// A separate example makes the distinction between IP and per-link MAC explicit.
R('hop-envelopes',p=>{
 const remote=p.remote,source='192.0.2.10',destination=remote?'198.51.100.20':'192.0.2.20';
 const view=(phase,from,to)=>({type:'lesson-hop',remote,source,destination,message:p.message,phase,from,to});
 const frames=[F('最終的に届けたい相手を選ぶ',`IPの宛先は${destination}です。送りたい中身と、今回の区間の相手を分けます。`,view(0,'—','—')),F(remote?'最初のLANではルーターへ渡す':'同じLANの相手へ直接渡す',remote?'宛先IPは遠くのBのままです。Ethernetの宛先だけを、同じLANの出口であるルーターのMACにします。':'宛先IPも、この区間のMACも、同じLANにいるBを指します。',view(1,'MAC-A',remote?'MAC-R左':'MAC-B'))];
 if(remote)frames.push(F('ルーターが次の区間の包みを作る','前のEthernetフレームをそのまま別LANへ流し続けるのではありません。次の区間の送信元・宛先MACにして包み直します。',view(2,'MAC-R右','MAC-B')));
 frames.push(F('Bで中身を受け取る','リンクの包みを外し、IP、さらに上の層へ渡します。この例はNATなしなので送信元・宛先IPは途中でも同じです。',view(3,remote?'MAC-R右':'MAC-A','MAC-B')));
 return out(frames,{'最終送信元IP':source,'最終宛先IP':destination,'通るLANの数':remote?2:1},'MACは説明用の名前です。ARPは解決済み、経路設定済み、NATなし。Ethernet以外のリンクや全ヘッダーフィールドは省略します。');
});
const l=L.add({id:'n01-forwarding',area:'C13',track:'network',topic:'N01',title:'IPとMAC・1区間ずつの配送',unit:'IPとMAC・1区間ずつの配送',question:'最終的な相手と、今の区間で渡す相手は同じ？',summary:'LANを越えると変わるMACと、最終宛先を示すIPを、図の同じ相手へ対応させます。',intro:'同じデータを送るのに、なぜ2種類の宛先が必要なのでしょう。',engine:'hop-envelopes',variant:'',controls:[L.ctrl.toggle('remote','別のLANへ送る',true),L.ctrl.text('message','送りたい中身','Hello, B.')],prereq:['n01-packet','n04-subnet'],course:'計算機科学入門／コンピュータネットワーク',sources:['notesIntro','models'],scope:'NATなし・2つのLANの独自教材',limits:'MACは架空の名前。ARPと経路は設定済みとし、IPの全フィールド変化や実際の信号伝送は含みません。',presentation:'sequence',observe:'各段階でIPの宛先とMACの宛先が、図のどの相手を示すか比べます。',exploration:{label:'同じLANの相手へ送る',patch:{remote:false}},guide:['最終宛先を確認します。','1区間ずつ送り、MACの対象を選んでください。','同じLANの条件と比較します。'],lesson:'今の区間と最終宛先では、必要な宛先情報の役割が違います。',challenge:{question:'NATのないこの例で、ルーターを越えると何が変わる？',options:['各区間の送信元・宛先MAC','IPの宛先が必ずルーターに変わる','メッセージの文字列が変わる'],answer:0,explanation:'各リンクのMACを使い直します。最終宛先IPはBのままです。'}});
l.notes='計算機科学入門 pp.53,56–59';
L.defineLessons([['n01-forwarding','住所を指定した荷物も、最初は同じ町の配達拠点へ渡す場合があります。ネットワークでも最終宛先と今渡す相手を分けます。','IPはここでは最終的な端末を示し、EthernetのMACは今のLANで受け渡す相手を示します。ルーターを越えると次のLANのMACへ包み直します。','A→ルーター→Bの例で1区間だけ送ります。宛先IPがBのまま、MACの宛先がルーターになっていることを確認します。次の区間では送信元MACも変わります。','NATなしの簡単な例です。IPのすべてのフィールドが不変なのではなく、ここでは送信元・宛先アドレスを観察しています。','計算機科学入門 pp.53,56–59','remote']]);
})();
