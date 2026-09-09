import test from 'node:test';import assert from 'node:assert/strict';import {run,last} from './helpers.mjs';

test('Mark & Sweepは到達不能な循環も回収する',async()=>{
 assert.equal((await run('c07-gc')).metrics['保持'],3);
 assert.equal((await run('c07-gc',{roots:''})).metrics['回収'],5);
 assert.equal((await run('c07-gc',{bridge:true})).metrics['回収'],0);
 assert.equal((await run('c07-gc',{roots:'D'})).metrics['保持'],2);
 await assert.rejects(()=>run('c07-gc',{roots:'Z'}));
});
test('全64組の単項加算で1の数がa+bになる',async()=>{for(let a=1;a<=8;a++)for(let b=1;b<=8;b++){const r=await run('c02-turing',{a,b});assert.equal(r.metrics['結果の1の個数'],a+b);assert.equal(r.metrics['状態'],'HALT');}});
test('分岐予測の飽和カウンタは1回の外れで必ずしも反転しない',async()=>{const r=await run('c09-branch',{pattern:'TTTNTTTN',initial:3,method:'two'});assert.equal(r.metrics['予測外れ'],2);assert.equal(r.metrics['固定コスト換算'],14);await assert.rejects(()=>run('c09-branch',{pattern:'T?N'}));});
test('直列命令実行ではロード依存によるパイプラインストールを加えない',async()=>{const a=await run('c09-pipeline',{pipeline:false,hazard:false}),b=await run('c09-pipeline',{pipeline:false,hazard:true});assert.equal(a.metrics['サイクル'],b.metrics['サイクル']);assert.equal(b.metrics['挿入ストール'],0);});
test('TLBミス・不在・書込保護違反は別の結果',async()=>{
 const a=await run('c10-translation');assert.equal(a.metrics['TLBヒット'],2);assert.equal(a.metrics['ページフォルト'],1);
 const b=await run('c10-translation',{tlb:false});assert.equal(b.metrics['TLBヒット'],0);assert.equal(b.metrics['ページフォルト'],1);
 const c=await run('c10-translation',{resolve:false});assert.equal(c.metrics['ページフォルト'],2);
 const d=await run('c10-translation',{write:true});assert.equal(d.metrics['保護違反'],1);
 await assert.rejects(()=>run('c10-translation',{addresses:'256'}));
});
test('セマフォの空き+要素数は容量、消費は生産を超えない',async()=>{for(const capacity of [1,3,8]){const r=await run('c12-semaphore',{capacity,operations:'C,P,P,P,P,C,C,C,C,C'});for(const f of r.frames)assert.equal(f.stats['empty + full'],capacity);assert.equal(r.metrics['生産']-r.metrics['消費'],r.metrics['蓄積した要素']);assert.equal(r.metrics['空きスロット']+r.metrics['蓄積した要素'],capacity);}});
test('kNNの投票はk票、同じseedは同じ結果',async()=>{for(const k of [1,3,5,9,15]){const r=await run('c17-knn',{k});assert.equal(r.metrics['クラスA']+r.metrics['クラスB'],k);assert.deepEqual(r,await run('c17-knn',{k}));}});
test('均一領域の平滑化と輪郭の計算',async()=>{assert.equal((await run('c18-image',{x:4,y:4,kernel:'blur'})).metrics['選択画素（計算値）'],220);assert.equal((await run('c18-image',{x:4,y:4,kernel:'edge'})).metrics['選択画素（計算値）'],0);});
test('境界値テストが通常値だけでは見つからないバグを検出する',async()=>{assert.equal((await run('c16-testing',{suite:'normal'})).metrics['失敗'],0);assert.equal((await run('c16-testing',{suite:'boundary'})).metrics['失敗'],1);assert.equal((await run('c16-testing',{suite:'boundary',implementation:'fixed'})).metrics['失敗'],0);});
test('VLSMはCIDRの境界と容量に従う',async()=>{const r=await run('n04-vlsm');assert.equal(r.metrics['割当成功'],4);assert.equal(last(r).table.rows[0][2],'192.0.2.0/26');assert.equal(last(r).table.rows[1][2],'192.0.2.64/27');assert.equal((await run('n04-vlsm',{hosts:'250,250'})).metrics['失敗'],1);});
test('SLAACはアドレス・デフォルト経路・重複を分ける',async()=>{const a=await run('n06-slaac',{router:false});assert.match(a.metrics['リンクローカル'],/^fe80:/);assert.equal(a.metrics['デフォルト経路'],'なし');const b=await run('n06-slaac',{lifetime:false});assert.match(b.metrics['グローバル'],/^2001:db8:/);assert.equal(b.metrics['デフォルト経路'],'なし');assert.match((await run('n06-slaac',{duplicate:true})).metrics['リンクローカル'],/重複/);});
test('リンク情報は端点から全台へ伝わる',async()=>{for(const cut of [false,true]){const r=await run('n08-linkstate',{cut});assert.equal(r.metrics['更新できた台数'],5);assert.ok(r.metrics['観察したラウンド']>0);assert.ok(r.frames[0].table.rows.some(row=>row[1]==='古い情報'));}});
test('QoSは容量を増やさず音声の待ちを調整する',async()=>{const a=await run('n16-qos',{policy:'fifo'}),b=await run('n16-qos',{policy:'priority'});assert.ok(b.metrics['音声の平均待ち']<=a.metrics['音声の平均待ち']);for(const r of [a,b])assert.equal(last(r).stats['音声を送信']+last(r).stats['転送を送信']+r.metrics['音声の破棄']+r.metrics['転送の破棄']+r.metrics['観察終了時の待ち'],12+24*3);});
test('ロック中の正規利用者と、クールダウン境界',async()=>{assert.equal((await run('s07-ratelimit',{userTime:5})).metrics['正規利用者'],'ロックで拒否');assert.equal((await run('s07-ratelimit',{userTime:12})).metrics['正規利用者'],'ログイン成功');assert.equal((await run('s07-ratelimit',{enabled:false})).metrics['正規利用者'],'ログイン成功');});
