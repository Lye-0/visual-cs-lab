import test from 'node:test';import assert from 'node:assert/strict';import {L,run,last,gitState} from './helpers.mjs';

test('IPv4 /24, /0, /31, /32 と入力の検証',async()=>{
 let r=await run('n04-subnet',{ip:'192.168.1.130',peer:'192.168.1.1',prefix:24});assert.equal(r.metrics['ネットワーク'],'192.168.1.0/24');assert.equal(r.metrics['通常ホスト数'],254);assert.equal(r.metrics['相手'],'同一サブネット');
 r=await run('n04-subnet',{ip:'255.255.255.255',prefix:0});assert.equal(r.metrics['ネットワーク'],'0.0.0.0/0');assert.equal(r.metrics['通常ホスト数'],4294967294);
 assert.equal((await run('n04-subnet',{prefix:31})).metrics['通常ホスト数'],2);assert.equal((await run('n04-subnet',{prefix:32})).metrics['通常ホスト数'],1);
 for(const s of ['256.1.1.1','1.2.3','x.2.3.4','-1.0.0.0'])assert.throws(()=>L.ipInt(s));assert.equal(L.intIp(L.ipInt('203.0.113.255')),'203.0.113.255');
});
test('IPv6の圧縮表記を128ビットに展開する',()=>{assert.equal(L.expandIPv6('2001:db8::1').length,8);assert.throws(()=>L.expandIPv6('2001::db8::1'));assert.throws(()=>L.expandIPv6('gg::1'));});
test('2の補数と16ビット幅',async()=>{let r=await run('c01-bits',{width:8,value:255});assert.equal(r.metrics['符号なし'],255);assert.equal(r.metrics['2の補数'],-1);r=await run('c01-bits',{width:16,value:32768});assert.equal(r.metrics['2の補数'],-32768);});
test('UTF-8はコードポイントとバイトを分ける',async()=>{const r=await run('c01-utf8',{text:'Aあ🔒'});assert.equal(r.metrics['コードポイント'],3);assert.equal(r.metrics['UTF-16コード単位'],4);assert.equal(r.metrics['UTF-8バイト数'],8);});
test('Hammingは全4ビット入力の全1ビット誤りを訂正する',async()=>{for(let x=0;x<16;x++)for(let pos=0;pos<=7;pos++){let s=x.toString(2).padStart(4,'0'),r=await run('c01-hamming',{text:s,flip:pos});assert.equal(r.metrics['復元'],s);assert.equal(r.metrics['誤り位置'],pos||'なし');}});
test('CRCはこの8ビット例の単一誤りを検出する',async()=>{for(let i=1;i<=8;i++){const r=await run('n02-crc',{data:'10110101',flip:i});assert.match(JSON.stringify(r.metrics),/検出|不一致|誤り|失敗/);}});
test('全ソート方法が負数・重複を含む入力を整列する',async()=>{for(const algorithm of ['bubble','insertion','selection','quick','merge'])for(const values of ['3,1,2','-2,9,-2,0','9','4,3,2,1']){const r=await run('c06-sort',{algorithm,values});assert.deepEqual(last(r).visual.values,values.split(',').map(Number).sort((a,b)=>a-b));}});
test('二分探索は未整列入力を受け入れない',async()=>{await assert.rejects(()=>run('c06-search',{values:'3,1,2',algorithm:'binary'}));});
test('式パーサは演算子優先順位と括弧を評価、evalを使わない',async()=>{
 let r=await run('c07-compiler',{code:'2 + 3 * (4 - 1)'});assert.match(JSON.stringify(r.metrics),/11/);
 for(const expression of ['alert(1)','1;globalThis.x=1','2+(3','2 / 0'])await assert.rejects(()=>run('c07-compiler',{code:expression}));
});
test('論理回路の真理値表',async()=>{for(const gate of ['AND','OR','XOR','NAND','NOR','NOT'])for(const a of [false,true])for(const b of [false,true]){const r=await run('c08-gate',{gate,a,b}),expected={AND:a&&b,OR:a||b,XOR:a!==b,NAND:!(a&&b),NOR:!(a||b),NOT:!a}[gate];assert.equal(last(r).visual.output,+expected);}});
test('全加算器は全8通りで合計を保存する',async()=>{for(const a of [false,true])for(const b of [false,true])for(const carry of [false,true]){const r=await run('c08-adder',{a,b,carry});assert.equal(r.metrics.SUM+2*r.metrics.CARRY,+a+(+b)+(+carry));}});
test('FIFOとLRUで同じ参照列の結果が異なる',async()=>{let a=await run('c10-pages',{references:'1,2,3,1,4,1',frames:3,policy:'FIFO'}),b=await run('c10-pages',{references:'1,2,3,1,4,1',frames:3,policy:'LRU'});assert.equal(a.metrics['ページフォルト'],5);assert.equal(b.metrics['ページフォルト'],4);});
test('スケジューラは合計CPU時間を保存する',async()=>{for(const policy of ['FCFS','SJF','RR']){const r=await run('c11-scheduler',{bursts:'5,3,8',policy,quantum:2});assert.equal(r.metrics['完了時刻'],16);}assert.equal((await run('c11-scheduler',{bursts:'5,3,8',policy:'FCFS'})).metrics['平均待ち時間'],4.33);});
test('競合と排他による更新消失',async()=>{assert.equal((await run('c12-race',{lock:false,order:'interleave'})).metrics['最終値'],1);assert.equal((await run('c12-race',{lock:true})).metrics['最終値'],2);});
test('直列化により残高の更新消失を防ぐ',async()=>{assert.equal((await run('c14-transaction',{serial:false})).metrics['最終残高'],90);assert.equal((await run('c14-transaction',{serial:true})).metrics['最終残高'],110);});
test('B+木の葉の深さ・キー順序・全要素',async()=>{for(const values of ['1,2,3,4,5,6,7,8,9,10,11,12','12,11,10,9,8,7,6,5,4,3,2,1','8,8,5,3,13,2,10,4,12']){const r=await run('c14-bplus',{values}),depths=[],keys=[];function walk(node,d){const ks=node.label.split(' | ').filter(Boolean).map(Number);assert.ok(ks.length<=3);assert.deepEqual(ks,[...ks].sort((a,b)=>a-b));if(node.leaf){depths.push(d);keys.push(...ks);}else{assert.equal(node.children.length,ks.length+1);node.children.forEach(c=>walk(c,d+1));}}walk(last(r).visual.root,0);assert.equal(new Set(depths).size,1);assert.deepEqual(keys,[...new Set(values.split(',').map(Number))].sort((a,b)=>a-b));}});
test('最短経路がリンク切断を迂回、非到達を正しく扱う',()=>{const nodes=['A','B','C'],edges=[{a:'A',b:'B',cost:2},{a:'B',b:'C',cost:1},{a:'A',b:'C',cost:9}];assert.deepEqual(L.shortest(nodes,edges,'A','C').path,['A','B','C']);edges[1].off=true;assert.equal(L.shortest(nodes,edges,'A','C').dist.C,9);edges[2].off=true;assert.deepEqual(L.shortest(nodes,edges,'A','C').path,[]);});
test('TCPのACKは単調、損失は一度だけ、最後に全セグメントが揃う',async()=>{
 for(const count of [4,8,12])for(const window of [1,2,4,6])for(const loss of [0,1,count]){const r=await run('n11-tcp',{count,window,loss});const frames=r.frames.filter(f=>f.visual.type==='packets');let ack=1;for(const f of frames){assert.ok(f.visual.ack>=ack);ack=f.visual.ack;assert.equal(new Set(f.visual.received).size,f.visual.received.length);for(let i=1;i<f.visual.ack;i++)assert.ok(f.visual.received.includes(i));for(const i of f.visual.inflight)assert.ok(!f.visual.received.includes(i));}assert.equal(last(r).visual.received.length,count);assert.equal(last(r).visual.ack,count+1);assert.equal(r.metrics['送信回数'],count+(loss?1:0));assert.equal(r.metrics['再送回数'],loss?1:0);}
});
test('DNSキャッシュは有効期限の境界で変わる',async()=>{const a=await run('n09-dns',{cached:true,elapsed:25,ttl:30,updated:true}),b=await run('n09-dns',{cached:true,elapsed:30,ttl:30,updated:true});assert.notDeepEqual(a.metrics,b.metrics);assert.match(JSON.stringify(a.metrics),/203\.0\.113\.20/);assert.match(JSON.stringify(b.metrics),/203\.0\.113\.30/);});
test('CORSは送信・認可・読み取りを区別する',async()=>{
 let r=await run('s10-cors',{origin:'cross',request:'simple',allowOrigin:'none',authorized:true});assert.equal(r.metrics['本要求の送信'],'あり');assert.equal(r.metrics['サーバー処理'],'許可');assert.equal(r.metrics['JSで読取り'],'不可');
 r=await run('s10-cors',{origin:'cross',request:'json',allowOrigin:'none'});assert.equal(r.metrics['本要求の送信'],'なし');
 r=await run('s10-cors',{origin:'cross',request:'simple',allowOrigin:'match',authorized:false});assert.equal(r.metrics['JSで読取り'],'可能');assert.equal(r.metrics['サーバー処理'],'拒否/未到達');
 r=await run('s10-cors',{origin:'cross',allowOrigin:'star',credentials:true,allowCredentials:true});assert.equal(r.metrics['JSで読取り'],'不可');
 r=await run('s10-cors',{origin:'same',request:'json',credentials:true,allowOrigin:'none',allowCredentials:false});assert.equal(r.metrics['JSで読取り'],'可能');
});
test('SHA-256の既知値と入力ビット差',async()=>{const r=await run('s04-hash',{message:'abc',flip:true}),v=r.frames.find(f=>f.visual.type==='digest').visual;assert.equal(v.original,'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');assert.notEqual(v.changed,v.original);});
test('AES-GCMは実際に復号・改ざん検出する',async()=>{assert.equal((await run('s03-aes',{tamper:false})).metrics['検証'],'成功');assert.equal((await run('s03-aes',{tamper:true})).metrics['検証'],'失敗');await assert.rejects(()=>run('s03-aes',{key:'bad'}));});
test('ECDSAは元の文書のみ検証成功',async()=>{let a=await run('s04-signature',{tamper:false}),b=await run('s04-signature',{tamper:true});assert.match(JSON.stringify(a.metrics),/成功/);assert.match(JSON.stringify(b.metrics),/失敗/);});
test('Shamirの数式は全秘密値を2共有片で復元する',async()=>{for(let secret=0;secret<17;secret++){const r=await run('s23-sharing',{secret,count:2});assert.match(JSON.stringify(r.metrics),new RegExp('復元'));const cells=r.frames.at(-1).visual;assert.ok(JSON.stringify(cells).includes(String(secret)));}});
test('TTL/期限は「等しい時刻」で失効する',async()=>{const r=await run('s09-session',{now:60,expiry:60,signed:true,logout:false});assert.equal(r.metrics['受入れ'],'拒否');});
test('トポロジー編集で機器追加しても宛先は変わらない',async()=>{const v=L.clone(L.defaultTopology);v.nodes.push({id:'ISOLATED',label:'isolated',kind:'pc',x:100,y:100});const r=await run('x01-build',{topology:JSON.stringify(v),source:'PC',target:'WEB'});assert.equal(r.metrics['到達性'],'到達可能');});
test('トポロジーのID重複・壊れたリンクを拒否する',()=>{assert.throws(()=>L.parseTopology('{'));let v=L.clone(L.defaultTopology);v.nodes[1].id='PC';assert.throws(()=>L.parseTopology(JSON.stringify(v)));v=L.clone(L.defaultTopology);v.edges.push({a:'PC',b:'notfound'});assert.throws(()=>L.parseTopology(JSON.stringify(v)));});
test('全部遮断した組織設計は課題達成ではない',async()=>{const r=await run('x04-organization',{routing:false,web:false,segment:true,guestDb:false,management:true,dns:false});assert.equal(r.metrics['演習結果'],'要改善');});
test('検知スコアの閾値はx番号ではなくy軸に描かれる',async()=>{const r=await run('s17-detection'),v=r.frames[0].visual;assert.equal(v.thresholdAxis,'y');const s=L.visualize(v),m=s.match(/<line[^>]+data-threshold="y"[^>]*>/);assert.ok(m);const y1=m[0].match(/y1="([^"]+)/)[1],y2=m[0].match(/y2="([^"]+)/)[1];assert.equal(y1,y2);});
test('空文字のハッシュと1ビット反転の前提を区別する',async()=>{const r=await run('s04-hash',{message:'',flip:false});assert.equal(r.frames[0].visual.original,'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');await assert.rejects(()=>run('s04-hash',{message:'',flip:true}),/空の入力/);});
