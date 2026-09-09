(() => {
'use strict';
const L=CSL,{register:R,frame:F,result:out,round,clone,ipInt,intIp,maskOf,bits,rng,shortest,clamp}=L;
const node=(id,label,x,y,kind='server',sub='')=>({id,label,x,y,kind,sub});
const basicNodes=[node('pc','クライアント',90,175,'pc','192.168.1.10'),node('sw','スイッチ',265,175,'switch','L2 / Ethernet'),node('rt','ルーター',445,175,'router','192.168.1.1'),node('sv','サーバー',640,175,'server','203.0.113.20')];
const basicEdges=[{a:'pc',b:'sw'},{a:'sw',b:'rt'},{a:'rt',b:'sv'}];
function net(active='pc',detail='',edges=basicEdges,nodes=basicNodes){return {type:'network',nodes,edges,active,detail};}
function sequence(actors,messages,upto){return {type:'sequence',actors,messages:messages.slice(0,upto+1)};}
function flowResult(actors,messages,metrics){const frames=messages.map((m,i)=>F(m.title||m.label,m.why||m.label,sequence(actors,messages,i),{'イベント':i+1,...(m.stats||{})}));return out(frames,metrics);}
const msg=(from,to,label,why,extra={})=>({from,to,label,why,...extra});
R('encapsulation',(p)=>{
 const len=new TextEncoder().encode(p.message).length,proto=p.protocol;
 const layers=[{name:'アプリケーション',size:len,note:'送りたいメッセージをUTF-8のバイト列に変換します。'},{name:proto,size:proto==='TCP'?20:8,note:proto==='TCP'?'TCPヘッダーにはポートや順序番号などが入ります。オプションなし20バイトを扱います。':'UDPヘッダーは8バイト。送信元・宛先ポート、長さ、チェックサムを持ちます。'},{name:'IPv4',size:20,note:'IPヘッダーには送信元・宛先IPなどが入ります。オプションなし20バイトです。'},{name:'Ethernet',size:18,note:'MACヘッダー14バイトとFCS 4バイトを追加します。最小長のパディングは別に補います。'}];
 let total=0;const frames=layers.map((l,i)=>{total+=l.size;return F(`${l.name}の情報を加える`,l.note,{type:'layers',layers:layers.slice(0,i+1),payload:p.message},{'ここまで':`${total} B`});});
 const pad=Math.max(0,46-(len+(proto==='TCP'?20:8)+20));
 frames.push(F('次の機器へフレームを送る','スイッチは主にMACアドレス、ルーターは宛先IPを基に転送を判断します。リンクが変わるとEthernetヘッダーも変わります。',net('rt',p.message),{'Ethernetフレーム':`${total+pad} B`,'パディング':`${pad} B`}));
 return out(frames,{'データ':`${len} B`,'ヘッダー等':`${total-len} B`,'フレーム':`${total+pad} B`},'階層ごとに役割が異なります。表示サイズはプリアンブル・IFGを除いた教材設定です。');
});
R('signal',(p,lab)=>{
 const data=String(p.data).replace(/[^01]/g,'').slice(0,24)||'10110101';
 if(lab.variant==='crc'){
 const divisor='1011',divide=s=>{let b=s.split('').map(Number);for(let i=0;i<=b.length-4;i++)if(b[i])for(let j=0;j<4;j++)b[i+j]^=+divisor[j];return b.slice(-3).join('');};
 const crc=divide(data+'000'),sent=data+crc,received=sent.split('');if(p.flip>0&&p.flip<=received.length)received[p.flip-1]=String(1-+received[p.flip-1]);let rem=divide(received.join(''));
 return out([F('検査用のビットを計算','生成多項式は x³+x+1（1011）。GF(2)の割り算では引き算をXORで行います。',{type:'bitrow',bits:sent,split:data.length,labels:['データ','CRC']},{'CRC':crc}),F('伝送中のビットを変える',p.flip?'選択した位置の1ビットを反転しました。':'今回はビットを変更していません。',{type:'bitrow',bits:received.join(''),active:p.flip-1,split:data.length},{'受信列':received.join('')}),F('受信側で余りを確認',rem==='000'?'余りは0です。今回の変更は検出されていません。CRCはすべての誤りを検出できるわけではありません。':'余りが0でないので、誤りを検出しました。CRCは送信者の認証には使えません。',{type:'flow',nodes:['受信列','1011で除算',rem==='000'?'余り = 0':'誤りを検出'],active:2,failed:rem!=='000'}, {'余り':rem})],{'データ長':data.length,'CRC長':3,'検出':rem==='000'?'なし':'あり'});
 }
 const transmission=p.bytes*8/(p.bandwidth*1e6)*1000,propagation=p.distance*1000/2e8*1000;
 const rand=rng(42),received=[...data].map(b=>rand()<p.noise/100?String(1-+b):b).join(''),errors=[...data].filter((b,i)=>b!==received[i]).length;
 return out([F('信号にして送り出す','ここでは0と1の2値信号として描きます。伝送時間はデータ量÷回線速度です。',{type:'wave',points:[...data].flatMap((b,i)=>[{x:i,y:+b},{x:i+.98,y:+b}])},{'伝送時間':`${round(transmission,3)} ms`}),F('信号が伝わる','伝搬速度を2×10⁸ m/sに固定したモデルです。回線を太くしても、距離による伝搬時間は変わりません。',{type:'wave',points:[...received].flatMap((b,i)=>[{x:i,y:+b},{x:i+.98,y:+b}])},{'伝搬時間':`${round(propagation,3)} ms`,'表示ビットの誤り':errors})],{'伝送':`${round(transmission,3)} ms`,'伝搬':`${round(propagation,3)} ms`,'合計':`${round(transmission+propagation,3)} ms`});
});
R('switch',(p)=>{
 const nodes=[node('a','端末 A',80,85,'pc','MAC …0A'),node('b','端末 B',80,280,'pc','MAC …0B'),node('s','スイッチ',360,180,'switch','3 ports'),node('c','端末 C',640,180,'pc','MAC …0C')],edges=[{a:'a',b:'s'},{a:'b',b:'s'},{a:'s',b:'c'}];
 const table=p.learned?{A:'port 1',B:'port 2'}:{};let target=p.target;
 const frames=[F('送信元を学習','端末Aから入ったフレームの送信元MACと入力ポートを記録します。',{...net('s','A → '+target,edges,nodes)}, {},{headers:['MAC','ポート'],rows:Object.entries({...table,A:'port 1'})})];
 table.A='port 1';let known=table[target]!==undefined;
 frames.push(F(known?'宛先のポートだけへ転送':'宛先が未学習なのでフラッディング',known?'転送表に宛先があります。対応するポートへ転送します。':'転送表に宛先がありません。受信ポート以外のポートに複製して送ります。ハブと違い、学習後は転送先を絞れます。',{type:'network',nodes,edges:edges.map(e=>({...e,active:!known?e.a!=='a':(target==='B'?e.a==='b':e.b==='c')})),active:target.toLowerCase()}, {'宛先への出力数':known?1:2}, {headers:['MAC','ポート'],rows:Object.entries(table)}));
 return out(frames,{'学習済みMAC':Object.keys(table).length,'転送方式':known?'ユニキャスト':'フラッディング'});
});
R('subnet',(p)=>{
 const a=ipInt(p.ip),b=ipInt(p.peer),prefix=Math.floor(p.prefix),mask=maskOf(prefix),network=(a&mask)>>>0,broadcast=(network|(~mask))>>>0,same=((a&mask)>>>0)===((b&mask)>>>0),size=2**(32-prefix);
 const frames=[F('アドレスを32ビットに分ける',`先頭${prefix}ビットがネットワーク部です。残り${32-prefix}ビットがホスト部です。`,{type:'bitrow',bits:bits(a,32),split:prefix,labels:['ネットワーク部','ホスト部']},{'IPアドレス':p.ip,'プレフィックス':`/${prefix}`}),F('マスクとのANDを計算','両者のネットワーク部をANDで取り出します。ホスト部が違っていても、ネットワーク部が一致すれば同じサブネットです。',{type:'cells',rows:[{label:'自分',values:[p.ip]},{label:'マスク',values:[intIp(mask)]},{label:'ネットワーク',values:[intIp(network)]},{label:'相手のネットワーク',values:[intIp((b&mask)>>>0)]}]},{'同一サブネット':same?'はい':'いいえ'}),F('配送先を判断',same?'相手を同一リンク上として扱い、リンク層の宛先を調べます。':'通常はデフォルトゲートウェイなどの経路が必要です。相手のMACを遠隔まで直接調べるわけではありません。',{type:'flow',nodes:['自分',same?'同一リンク':'ゲートウェイ',p.peer],active:2},{'アドレス総数':size,'利用数の注意':prefix===31?'P2P用 /31':prefix===32?'単一ホスト経路':'通常はネットワーク/ブロードキャスト除外'})];
 return out(frames,{'ネットワーク':intIp(network)+'/'+prefix,'末尾アドレス':intIp(broadcast),'通常ホスト数':prefix>=31?size:Math.max(0,size-2),'相手':same?'同一サブネット':'別サブネット'});
});
R('addressing',(p,lab)=>{
 if(lab.variant==='dhcp'){
 const n=p.clients,available=p.pool;const messages=[msg(0,1,'DHCPDISCOVER','アドレスをまだ持たないクライアントが、利用できるDHCPサーバーを探します。'),msg(1,0,available>0?'DHCPOFFER':'応答なし',available>0?'サーバーが利用可能なアドレスを提案します。':'利用できるアドレスがありません。'),msg(0,1,'DHCPREQUEST','クライアントが提案を選び、利用を要求します。'),msg(1,0,'DHCPACK','リースと設定情報が確定します。')];
 const successes=Math.min(n,available);return flowResult(['端末','DHCPサーバー'],available>0?messages:messages.slice(0,2),{'要求台数':n,'割当成功':successes,'不足台数':Math.max(0,n-available)});
 }
 const messages=p.cached?[msg(0,0,'キャッシュを参照','既知のIP→MACの対応を使います。ARP Requestは不要です。')]:[msg(0,1,'ARP Request / broadcast','同一リンク内へ「このIPを持つ端末は？」と問い合わせます。ルーターはこのブロードキャストをそのまま遠隔に転送しません。'),msg(1,0,'ARP Reply / unicast','対象端末が自分のMACアドレスを返します。'),msg(0,1,'Ethernet frame','得られたMACアドレスを使ってフレームを送ります。')];
 return flowResult(['自分',p.remote?'ゲートウェイ':'同一リンクの相手'],messages,{'ARP問い合わせ':p.cached?0:1,'対応先':p.remote?'ゲートウェイのMAC':'相手のMAC'});
});
function expandIPv6(input){let s=String(input).trim();if(!/^[a-fA-F0-9:]+$/.test(s)||s.split('::').length>2)throw Error('IPv6を16進数とコロンで入力してください。IPv4埋め込み表記はこの教材では扱いません。');let sides=s.split('::'),a=sides[0]?sides[0].split(':'):[],b=sides[1]?sides[1].split(':'):[];if([...a,...b].some(x=>x.length>4||!x))throw Error('IPv6の各ブロックは1〜4桁です。');let z=8-a.length-b.length;if(sides.length===1&&a.length!==8||sides.length===2&&z<1)throw Error('IPv6は展開すると8ブロックになる必要があります。');return [...a,...Array(sides.length===2?z:0).fill('0'),...b].map(x=>x.padStart(4,'0').toLowerCase());}
L.expandIPv6=expandIPv6;
R('ipv6',(p)=>{
 let parts=expandIPv6(p.ip),bin=parts.map(x=>parseInt(x,16).toString(2).padStart(16,'0')).join('');
 return out([F('省略表記を展開','IPv6は128ビットです。「::」は連続した0のブロックを1度だけ省略できます。',{type:'cells',rows:[{label:'128 bit',values:parts}]},{'完全表記':parts.join(':')}),F('ネットワーク部分を見る',`今回は /${p.prefix} の区切りを使います。IPv6にIPv4のブロードキャストはありません。`,{type:'bitrow',bits:bin,split:p.prefix,labels:['プレフィックス','残り']},{'プレフィックス長':p.prefix}),F('近隣探索を行う','IPv6ではARPではなくICMPv6のNeighbor Discoveryを使います。ここではNeighbor SolicitationとAdvertisementの関係を示します。',{type:'sequence',actors:['自分','相手'],messages:[msg(0,1,'Neighbor Solicitation',''),msg(1,0,'Neighbor Advertisement','')]},{'探索方式':'ICMPv6'})],{'アドレス幅':'128 bit','ブロック数':8,'ARP':'使わない'});
});
R('vlan',(p,lab)=>{
 if(lab.variant==='stp'){
 const nodes=[node('s1','S1 / root',150,100,'switch'),node('s2','S2',540,100,'switch'),node('s3','S3',345,320,'switch')],edges=[{a:'s1',b:'s2',off:p.cut},{a:'s1',b:'s3'},{a:'s2',b:'s3',off:p.enabled&&!p.cut}];
 return out([F('冗長リンクを接続','三角形には閉路があります。ブロードキャストを転送し続ける構成に注意します。',net('s1','',edges,nodes)),F(p.enabled?'木になるように転送ポートを選ぶ':'STPが無効',p.enabled?(p.cut?'直接リンクが切断され、以前は待機していた経路を使う構成に変化します。':'1つのリンクを転送に使わないことで、論理的な閉路を除きます。'):'このモデルではループが残ります。実機の収束タイマーやBPDU詳細は対象外です。',net('s3',p.enabled?'loop-free':'loop',edges,nodes),{'閉路':!p.enabled&&!p.cut?'あり':'なし'})],{'STP':p.enabled?'有効':'無効','転送リンク':edges.filter(e=>!e.off).length});
 }
 const same=p.a===p.b,allowed=same||p.route;
 return out([F('端末をVLANに所属させる','VLANはリンク層のブロードキャストドメインを分けます。同じスイッチでもVLANが違えば直接は届きません。',{type:'zones',zones:[{name:'VLAN '+p.a,items:['端末 A']},{name:'VLAN '+p.b,items:['端末 B']}],linked:allowed}),F(allowed?'通信経路がある':'VLAN間通信が必要',same?'同じVLAN内で転送できます。':p.route?'VLAN間ルーティングを有効にしています。経路があっても、実環境では別途ポリシーによる制限があり得ます。':'VLANが異なり、ルーティングも無効です。到達できません。',{type:'flow',nodes:['VLAN '+p.a,same?'スイッチ':p.route?'ルーター':'経路なし','VLAN '+p.b],active:1,failed:!allowed})],{'同一VLAN':same?'はい':'いいえ','到達':allowed?'可能':'不可'});
});
R('routing',(p,lab)=>{
 if(lab.variant==='prefix'){
 let ip=ipInt(p.destination),routes=[['0.0.0.0',0,'default'],['10.0.0.0',8,'router A'],['10.1.0.0',16,'router B'],['10.1.2.0',24,'router C']],matches=routes.filter(([a,m])=>((ip&maskOf(m))>>>0)===ipInt(a));let chosen=matches.at(-1);
 return out(routes.map(([a,m,g],i)=>F(`${a}/${m} と比較`,(((ip&maskOf(m))>>>0)===ipInt(a))?'宛先に一致する経路です。より長く一致するプレフィックスを優先します。':'この経路は宛先に一致しません。',{type:'cells',rows:[{label:'宛先',values:[p.destination]},{label:'候補',values:[`${a}/${m}`]},{label:'現在の候補',values:[matches.filter(x=>x[1]<=m).at(-1)?.[2]||'なし']}]})),{'採用経路':chosen[0]+'/'+chosen[1],'次ホップ':chosen[2]},'最短の数値コストではなく、まず最長プレフィックス一致で経路を選びます。');
 }
 const nodes=[node('A','端末 A',70,180,'pc'),node('R1','R1',255,90,'router'),node('R2','R2',255,285,'router'),node('R3','R3',480,90,'router'),node('R4','R4',480,285,'router'),node('B','サーバー B',675,180,'server')];
 const edges=[{a:'A',b:'R1',cost:2},{a:'A',b:'R2',cost:5},{a:'R1',b:'R3',cost:p.cost,off:p.cut},{a:'R2',b:'R4',cost:3},{a:'R1',b:'R2',cost:2},{a:'R3',b:'R4',cost:1},{a:'R3',b:'B',cost:3},{a:'R4',b:'B',cost:5}];
 const s=shortest(nodes.map(n=>n.id),edges,'A','B');
 const frames=s.trace.map(t=>F(`${t.u}までの最短距離を確定`,'未確定の中で距離が最小の頂点を選び、隣接する頂点への距離を更新します。これはDijkstraの計算であり、OSPFの全プロトコルではありません。',{type:'network',nodes,edges,active:t.u,visited:t.done},{'確定した頂点':t.done.length},{headers:['宛先','距離'],rows:Object.entries(t.dist).map(([k,v])=>[k,v===Infinity?'∞':v])}));
 frames.push(F('選ばれた経路',`${s.path.join(' → ')}。設定や切断を変えると経路を再計算します。`,{type:'network',nodes,edges,path:s.path,active:'B'},{'合計コスト':s.dist.B}));
 return out(frames,{'経路コスト':s.dist.B,'通過リンク':s.path.length-1,'経路':s.path.join(' → ')});
});
R('bgp',(p)=>{
 const routes=[{name:'ISP-A',pref:p.preference,hops:4},{name:'ISP-B',pref:100,hops:2}].sort((a,b)=>b.pref-a.pref||a.hops-b.hops);
 return out([F('異なる経路が広告される','この簡略モデルはLOCAL_PREFを先に比較し、同値ならAS_PATH長を比較します。BGPの他の選択条件は省略します。',{type:'flow',nodes:['自AS','ISP-A / 4 AS','目的AS'],active:1},{}, {headers:['経路','LOCAL_PREF','AS_PATH長'],rows:routes.map(r=>[r.name,r.pref,r.hops])}),F('方針を基に経路を選ぶ',`${routes[0].name}を選びます。ネットワークでの「最適」は、常に最短距離や最小遅延を意味するわけではありません。`,{type:'flow',nodes:['自AS',routes[0].name,'目的AS'],active:1})],{'採用経路':routes[0].name,'LOCAL_PREF':routes[0].pref,'AS_PATH長':routes[0].hops});
});
R('dns',(p)=>{
 const cached=p.cached&&p.elapsed<p.ttl,remaining=cached?p.ttl-p.elapsed:0;
 let messages=[];
 if(cached)messages.push(msg(0,1,'A? lab.example','再帰リゾルバーに問い合わせます。'),msg(1,0,p.updated?'203.0.113.20（古い値）':'203.0.113.20','このリゾルバーのキャッシュはまだ有効です。権威側の変更をただちに反映するとは限りません。'));
 else messages=[msg(0,1,'A? lab.example','端末から再帰リゾルバーに問い合わせます。'),msg(1,2,'ルートへ問い合わせ','有効なキャッシュがない状態を仮定します。'),msg(2,1,'example の委任先','ルートは次に問い合わせる先を紹介します。'),msg(1,3,'example のサーバーへ','委任先をたどります。'),msg(3,1,'lab.example の権威先','対象ゾーンの権威サーバーを紹介します。'),msg(1,4,'権威サーバーに A を質問','最新のレコードを問い合わせます。'),msg(4,1,p.updated?'203.0.113.30':'203.0.113.20','権威側の回答をTTLとともにキャッシュします。'),msg(1,0,'IPアドレスを返す','端末はこのアドレスを使って接続できます。')];
 return flowResult(['端末','リゾルバー','ルート','TLD','権威'],messages,{'キャッシュ':cached?'HIT':'MISS','取得IP':cached?'203.0.113.20':p.updated?'203.0.113.30':'203.0.113.20','残りTTL':`${cached?remaining:p.ttl} s`,'メッセージ数':messages.length});
});
R('transport',(p)=>{
 const tcp=p.protocol==='TCP';let messages=tcp?[msg(0,1,'SYN / seq=100','接続を要求します。SYNは順序番号を1つ消費します。'),msg(1,0,'SYN-ACK / seq=500 ack=101','サーバーも初期順序番号を伝え、受信したSYNを確認します。'),msg(0,1,'ACK / seq=101 ack=501','3ウェイハンドシェイクが完了します。')]:[];
 messages.push(msg(0,1,`${tcp?'TCP segment':'UDP datagram'} / ${p.port}`,tcp?'データはバイト列として扱われ、アプリ側の送信呼び出し境界がそのまま受信単位になるとは限りません。':'データグラムの境界を保ちます。UDP自身には再送・順序保証がありません。'));
 if(tcp)messages.push(msg(1,0,'ACK','受信したバイトの次に期待する順序番号を返します。'));
 return flowResult(['client : 51000',`server : ${p.port}`],messages,{'トランスポート':p.protocol,'接続準備のメッセージ':tcp?3:0,'宛先ポート':p.port});
});
R('tcp',(p)=>{
 const count=p.count,window=p.window,loss=p.loss,rtt=p.rtt;let received=new Set(),ack=1,rounds=0,transmissions=0;const frames=[],messages=[];
 frames.push(F('接続済みのTCPで送信を始める','各セグメントを1000バイトに固定。シーケンス番号は教材用に1から表示します。初期接続の時間は含めません。',{type:'packets',count,received:[],inflight:[],lost:0,window,ack:1},{'受信済み':`0 / ${count}`,'経過': '0 ms'}));
 let dropped=false,timeout=0;
 while(received.size<count&&rounds<30){
 rounds++;let sending=[];for(let i=ack,end=ack+window;i<=count&&i<end;i++)if(!received.has(i))sending.push(i);
 for(const [sentIndex,i] of sending.entries()){transmissions++;let drop=i===loss&&!dropped;if(drop){dropped=true;}else received.add(i);while(received.has(ack))ack++;
 frames.push(F(drop?`DATA ${i} が途中で失われる`:`DATA ${i} を受信`,drop?'一度だけ、このセグメントを落とします。送信側は即座に損失を知るわけではありません。':i>=ack?'後続データは届きましたが、手前に欠けた部分があります。順番がそろうまでアプリへの連続した引き渡しを待ちます。':`連続したデータがそろいました。次に期待するセグメントは${ack}です。`,{type:'packets',count,received:[...received],inflight:sending.slice(sentIndex+1),lost:drop?i:0,window,ack},{'ACK（次のバイト）':(ack-1)*1000+1,'受信済み':`${received.size} / ${count}`,'ラウンド':rounds}));}
 if(dropped&&received.size<count&&!received.has(loss)&&timeout===0){timeout=p.rto;frames.push(F('再送タイマーの満了を待つ','この実験はタイムアウトによる回復に限定します。重複ACKによる高速再送・SACK・輻輳ウィンドウ変更は省略しています。',{type:'packets',count,received:[...received],inflight:[],lost:loss,window,ack},{'追加の待ち時間':`${timeout} ms`}));}
 }
 const elapsed=rounds*rtt+timeout;
 frames.push(F('すべてのデータを順番に渡せる',`${count*1000}バイトがそろいました。表示時間はラウンド×RTT＋固定タイムアウトという教材モデルです。`,{type:'packets',count,received:[...received],inflight:[],lost:0,window,ack},{'完了時間':`${elapsed} ms`,'送信回数':transmissions}));
 return out(frames,{'モデル時間':`${elapsed} ms`,'送信回数':transmissions,'再送回数':transmissions-count,'データ':`${count} kB`});
});
R('congestion',(p)=>{
 let cwnd=1,threshold=16,frames=[],points=[];for(let t=0;t<12;t++){if(t===p.lossAt){threshold=Math.max(2,Math.floor(cwnd/2));cwnd=p.mode==='timeout'?1:threshold;}else cwnd=cwnd<threshold?Math.min(cwnd*2,threshold):cwnd+1;points.push({x:t+1,y:cwnd});frames.push(F(t===p.lossAt?'損失を検出':'送信可能量を更新',t===p.lossAt?'ネットワークの混雑を想定して輻輳ウィンドウを小さくします。':'スロースタート領域では倍増、輻輳回避領域では1 MSSずつ増やす教材モデルです。',{type:'plot',series:[{name:'cwnd / MSS',points:clone(points)}],xLabel:'RTTラウンド',yLabel:'MSS'},{'cwnd':cwnd,'ssthresh':threshold}));}return out(frames,{'最終cwnd':`${cwnd} MSS`,'閾値':`${threshold} MSS`},'Reno系のAIMDを概念化しています。実装ごとのACK処理、Fast Recovery、CUBIC/BBRは再現していません。');
});
R('nat',(p)=>{
 const rows=Array.from({length:p.clients},(_,i)=>[`192.168.1.${10+i}:${50000+i}`,`198.51.100.8:${40000+i}`,`203.0.113.20:${p.port}`]);
 return out([F('LAN側から接続を始める','送信元IPだけでなくポートも対応付けるNAPTの例です。',{type:'flow',nodes:['プライベートLAN','NAPT','外部サーバー'],active:0}),F('変換表を作る','端末ごとの通信を外側の異なるポートに対応付けます。戻りのパケットでは逆引きして内部へ配送します。',net('rt','アドレス＋ポートの対応'),{}, {headers:['内部の送信元','外部に見える送信元','宛先'],rows}),F('戻りの通信を配送する','NATは暗号化ではありません。また、セキュリティポリシー全体の代わりにはなりません。',{type:'flow',nodes:['外部サーバー','変換表を逆引き','内部の端末'],active:2})],{'同時接続':p.clients,'外部IPv4数':1,'変換表の項目':rows.length});
});
R('http',(p,lab)=>{
 if(lab.variant==='cache'){
 const hit=p.age<p.maxAge&&!p.reload,changed=p.changed;const messages=hit?[msg(0,0,'fresh cache','保存された応答は新鮮です。このモデルではサーバーに再取得しません。')]:[msg(0,1,'GET / asset + If-None-Match','保存済みETagを使い、内容に変化があるか問い合わせます。'),msg(1,0,changed?'200 OK + body':'304 Not Modified',changed?'内容が変わったため、新しい表現の本体を転送します。':'内容が同じため、既存の本体を再利用できます。')];
 return flowResult(['ブラウザ','サーバー'],messages,{'キャッシュ':hit?'fresh':'再検証','本体転送':!hit&&changed?'100 kB':'0 kB','ネットワーク往復':hit?0:1});
 }
 const n=p.objects,base=p.rtt,drop=p.loss,proto=p.protocol;let frames=[],times=[];const concurrency=proto==='HTTP/1.1'?1:n;
 for(let i=0;i<n;i++){let start=proto==='HTTP/1.1'?i*base:0;let end=start+base;if(drop&&i===1)end+=base*2;if(drop&&proto==='HTTP/2')end=Math.max(end,base*3);if(drop&&proto==='HTTP/1.1'&&i>1){start+=2*base;end+=2*base;}times.push({label:`object ${i+1}`,start,end});}
 for(let i=0;i<n;i++)frames.push(F(`object ${i+1} の通信を配置`,proto==='HTTP/1.1'?'この比較は1接続・パイプラインなしに固定します。実際のブラウザは複数接続を使う場合があります。':proto==='HTTP/2'?'複数ストリームを1つのTCP接続で扱います。失われたTCPデータの穴は後続のストリームにも影響し得ます。':'QUICの別ストリームは、あるストリームの未受信データがそろうのを同じ形では待ちません。ただし回線帯域と輻輳制御は共有します。',{type:'lanes',items:times.slice(0,i+1),unit:'ms'}, {'通信方式':proto,'図に追加したオブジェクト':i+1}));
 return out(frames,{'モデル完了時間':`${Math.max(...times.map(t=>t.end))} ms`,'オブジェクト':n,'同時ストリーム上限':concurrency},'帯域を十分大きくし、接続済み・固定RTTとした比較です。一般的な実測速度や優劣を示すものではありません。');
});
R('loadbalancer',(p)=>{
 const servers=Array.from({length:3},(_,i)=>({name:'Server '+String.fromCharCode(65+i),load:i===0?2:i===1?0:1,up:!(p.down&&i===1)}));const frames=[],counts=[0,0,0];let cursor=0;
 for(let i=0;i<p.requests;i++){let candidates=servers.filter(s=>s.up),s=p.algorithm==='least'?candidates.slice().sort((a,b)=>a.load-b.load)[0]:candidates[cursor++%candidates.length];s.load++;counts[servers.indexOf(s)]++;frames.push(F(`リクエスト ${i+1} → ${s.name}`,p.algorithm==='least'?'接続がまだ継続中と仮定し、現在の接続数が最も少ない稼働サーバーへ送ります。':'稼働中のサーバーを順番に選びます。停止したサーバーはヘルスチェック済みとして除外します。',{type:'bars',values:servers.map(s=>s.up?s.load:0),labels:servers.map(s=>s.name+(s.up?'':' / down')),active:servers.indexOf(s)},{'割当先':s.name}));}return out(frames,{'稼働台数':servers.filter(s=>s.up).length,'追加割当 A / B / C':counts.join(' / ')});
});
R('protocol',(p,lab)=>{
 const type=lab.variant,lag=p.delay;let actors,messages,metrics={};
 if(type==='ntp'){const t1=0,t2=lag+p.offset,t3=t2+5,t4=lag*2+5,offset=((t2-t1)+(t3-t4))/2;return out([F('4つのタイムスタンプを記録','往路と復路の遅延を等しいと仮定します。時計のずれと往復遅延を別々に求めます。',{type:'sequence',actors:['client','server'],messages:[msg(0,1,`t1=${t1} → t2=${t2}`,''),msg(1,0,`t3=${t3} → t4=${t4}`,'')]},{'推定offset':`${offset} ms`,'往復遅延':`${t4-t1-(t3-t2)} ms`})],{'時計のずれ':`${offset} ms`,'往復遅延':`${2*lag} ms`},'経路が非対称なら推定誤差が生じます。このモデルは対称遅延のみです。');}
 if(type==='mail'){actors=['送信アプリ','送信サーバー','受信サーバー'];messages=[msg(0,1,'Submission','メールの送信を依頼します。'),msg(1,2,'SMTP / RCPT TO','宛先サーバーへ配送します。DNSのMX探索は別実験です。'),msg(1,2,'DATA','本文を渡します。暗号化や認証は別の設定に依存します。'),msg(2,1,p.fail?'4xx / retry later':'250 accepted',p.fail?'一時的な失敗です。送信側はキューに入れ、後で再試行します。':'相手がメールを受理しました。人間が読んだことの確認ではありません。')];}
 else if(type==='ssh'){actors=['SSHクライアント','SSHサーバー'];messages=[msg(0,1,'バージョン交換','利用可能な方式を確認します。'),msg(1,0,'ホスト鍵を確認',p.fail?'記録したホスト鍵と一致しません。接続を続行しない設定です。':'サーバーのホスト鍵を信頼できる記録と照合します。')];if(!p.fail)messages.push(msg(0,1,'利用者の認証','サーバーの確認と利用者の認証は別の処理です。'),msg(0,1,'暗号化チャネル','認証後にチャネルを開きます。'));}
 else if(type==='websocket'){actors=['ブラウザ','サーバー'];messages=[msg(0,1,'HTTP Upgrade','HTTP/1.1経由のWebSocketを仮定します。'),msg(1,0,'101 Switching Protocols','接続がWebSocketに切り替わります。'),msg(1,0,'server event','サーバー側からデータを送れます。'),msg(0,1,p.fail?'Close':'client message',p.fail?'接続を閉じます。アプリ側で再接続方針を設計します。':'同じ接続で双方向にメッセージを送れます。')];}
 else{actors=['端末','サーバー'];messages=[msg(0,1,'要求','操作を開始します。'),msg(1,0,p.fail?'失敗':'応答',p.fail?'設定した障害で処理を継続できません。':'処理が完了しました。')];}
 metrics={'イベント数':messages.length,'片道遅延設定':`${lag} ms`,'シナリオ時間':`${messages.length*lag} ms`};return flowResult(actors,messages,metrics);
});
R('queue',(p)=>{
 const arrival=p.arrival,service=p.service,capacity=p.capacity;let q=0,dropped=0,served=0,frames=[],points=[];
 for(let t=0;t<12;t++){q+=arrival;let loss=Math.max(0,q-capacity);dropped+=loss;q=Math.min(q,capacity);let done=Math.min(q,service);q-=done;served+=done;points.push({x:t,y:q});frames.push(F(`時刻 ${t}: 待ち行列を更新`,`${arrival}個が到着し、${done}個を処理しました。${loss?`満杯で${loss}個を捨てました。`:'今回は容量超過がありません。'}`,{type:'plot',series:[{name:'待機数',points:clone(points)}],xLabel:'離散時刻',yLabel:'個'}, {'待機数':q,'累積廃棄':dropped,'処理済み':served}));}return out(frames,{'処理済み':served,'廃棄':dropped,'残り待機':q,'廃棄率':`${round(dropped/(12*arrival)*100)}%`},'各時刻に到着→容量制限→処理する離散モデルです。バーストや実時間の細かな到着分布は省略します。');
});
R('wifi',(p)=>{
 let random=rng(p.seed),frames=[],success=0,collisions=0,idle=0,counts=Array(p.stations).fill(0);
 for(let t=0;t<20;t++){const tx=counts.map((_,i)=>i).filter(()=>random()<1/p.backoff);if(tx.length===1){success++;counts[tx[0]]++;}else if(tx.length>1)collisions++;else idle++;frames.push(F(`スロット ${t+1}: ${tx.length===1?'送信成功':tx.length>1?'競合':'待機'}`,'各端末が1/backoffの確率で送信を試す共有媒体の概念モデルです。実際の802.11 CSMA/CAや電波伝搬そのものではありません。',{type:'bars',values:clone(counts),labels:counts.map((_,i)=>'STA '+(i+1)),active:tx[0]??-1},{'同時送信':tx.length,'成功':success,'競合':collisions}));}
 return out(frames,{'成功スロット':success,'競合スロット':collisions,'空きスロット':idle,'使用効率':`${success/20*100}%`});
});
R('mqtt',(p)=>{
 let m=[msg(0,1,'CONNECT','クライアントがブローカーへ接続します。'),msg(1,0,'CONNACK','接続を受理します。'),msg(2,1,'SUBSCRIBE sensors/temp','購読者がトピックを登録します。'),msg(0,1,'PUBLISH 23°C','送信者はブローカーに公開します。')];
 if(p.qos==='0'){if(!p.loss)m.push(msg(1,2,'PUBLISH','QoS 0はat most once。このシナリオでは受信します。'));else m.push(msg(0,1,'PUBLISH lost','QoS 0にはプロトコル上の確認応答がありません。今回のデータは届きません。',{failed:true}));}
 else if(p.qos==='1'){m.push(msg(1,0,p.loss?'PUBACK lost':'PUBACK','QoS 1はat least once。確認応答が失われた場合には再送され得ます。'));if(p.loss)m.push(msg(0,1,'PUBLISH / DUP=1','同じデータが再び届きます。処理を冪等にする設計も大切です。'));m.push(msg(1,2,'PUBLISH','ブローカーから購読者への配送QoSは別途決まります。'));}
 else m.push(msg(1,0,'PUBREC','QoS 2の受信を確認します。'),msg(0,1,'PUBREL','送信者が公開処理の解放を要求します。'),msg(1,0,'PUBCOMP','この送受信間でのQoS 2交換が完了します。'),msg(1,2,'PUBLISH','エンドツーエンドの業務処理が一度だけ行われる保証とは区別します。'));
 return flowResult(['Publisher','Broker','Subscriber'],m,{'QoS':p.qos,'制御イベント':m.length,'確認応答':p.qos==='0'?'なし':'あり'});
});
R('tunnel',(p)=>{
 const total=p.inner+p.overhead,tooBig=total>p.mtu,fragment=tooBig&&p.ipVersion==='IPv4'&&!p.df;
 return out([F('内側のパケットを包む','トンネルは内側のパケットに外側のヘッダーなどを加えます。ここでは入力したオーバーヘッドを固定値として使います。',{type:'layers',layers:[{name:'inner IP packet',size:p.inner},{name:'tunnel overhead',size:p.overhead}],payload:'PRIVATE DATA'},{'外側サイズ':`${total} B`}),F('経路のMTUと比較',tooBig?(fragment?'このIPv4教材設定では断片化が可能です。':'この設定では転送できません。パケットを小さくするなどの対応が必要です。IPv6ルーターは途中で断片化しません。'):'MTU以内なので転送できます。VPNという言葉だけで、すべてのトンネルが暗号化されるわけではありません。',{type:'flow',nodes:['拠点 A','MTU '+p.mtu,'拠点 B'],active:1,failed:tooBig&&!fragment},{'超過':`${Math.max(0,total-p.mtu)} B`})],{'外側サイズ':`${total} B`,'内側の目安上限':`${Math.max(0,p.mtu-p.overhead)} B`,'判定':tooBig?(fragment?'断片化が必要':'Packet too big / drop'):'転送可能'});
});
R('diagnose',(p,lab)=>{
 const faults={dns:{title:'名前解決に失敗',cause:'DNS設定',observations:[['ping 203.0.113.20','応答あり'],['DNS A lab.example','応答なし'],['TCP :443 to IP','確立できる']]},route:{title:'経路がない',cause:'経路設定',observations:[['DNS A lab.example','203.0.113.20'],['ping gateway','応答あり'],['経路表','宛先への経路なし']]},tls:{title:'証明書を検証できない',cause:'証明書',observations:[['DNS A lab.example','203.0.113.20'],['TCP :443','接続確立'],['TLS certificate','名前がother.example']]},firewall:{title:'通信が拒否された',cause:'アクセス規則',observations:[['DNS A lab.example','203.0.113.20'],['送信ログ','TCP SYN送信'],['Firewall log','DENY dstport=443']]},queue:{title:'待ち行列が増加',cause:'処理能力',observations:[['DNS / TCP','正常'],['到着数 / 処理数','12 / 4 packets per tick'],['Queue depth','8 → 16 → 24']]}};
 const keys=Object.keys(faults),k=keys[p.seed%keys.length],f=faults[k];
 return out(f.observations.map((obs,i)=>F(`観測 ${i+1}: ${obs[0]}`,'観測された情報から原因を絞り込みます。1つの観測だけで断定せず、複数の証拠を結び付けてください。',{type:'network',nodes:basicNodes,edges:basicEdges,active:['pc','rt','sv'][i],detail:obs[1]},{}, {headers:['観測項目','得られた情報'],rows:f.observations.slice(0,i+1)})),{'観測数':3,'選んだ原因':p.guess,'診断':p.guess==='未選択'?'判断待ち':p.guess===f.cause?'証拠と整合':'再検討'},p.guess==='未選択'?'原因の候補を選んで検証してください。':p.guess===f.cause?`今回のシナリオは「${f.title}」です。判断は提示された証拠の範囲に限定されます。`:'選んだ原因では説明できない観測があります。証拠をもう一度比較しましょう。');
});
})();
