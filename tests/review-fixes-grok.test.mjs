import test from 'node:test';
import assert from 'node:assert/strict';
import {run, last, L, lab} from './helpers.mjs';

const indicesFromHex = (original, changed) => {
  const a = Uint8Array.from(original.match(/../g).map(x => parseInt(x, 16)));
  const b = Uint8Array.from(changed.match(/../g).map(x => parseInt(x, 16)));
  const out = [];
  for (let i = 0; i < a.length; i++) for (let j = 0; j < 8; j++) if (((a[i] ^ b[i]) >> (7 - j)) & 1) out.push(i * 8 + j);
  return out;
};

test('SEC-001: 変化したbitは位置の番号であり、256個の0/1ではない', async () => {
  for (const id of ['s04-hash', 's04-hmac']) {
    const flipped = await run(id, {flip: true});
    const digest = flipped.frames[0].visual;
    const bits = flipped.frames[1].visual.changedBits;
    const expected = indicesFromHex(digest.original, digest.changed);
    assert.deepEqual(bits, expected);
    assert.ok(expected.length > 0 && expected.length < 256);
    assert.deepEqual((await run(id, {flip: false})).frames[1].visual.changedBits, []);
  }
});

test('SEC-002: パスキーの中継は拒否、OTPの中継は要素が揃えば許可', async () => {
  const passkey = await run('s07-mfa', {kind: 'passkey', password: true, factor: true, phishing: true});
  assert.equal(passkey.metrics['認証結果'], '拒否');
  assert.equal(passkey.metrics['中継した要求'], '拒否');
  assert.match(last(passkey).visual.nodes.at(-1), /拒否/);
  assert.ok(passkey.frames[0].visual.items.every(item => item.ok));
  const otp = await run('s07-mfa', {kind: 'otp', password: true, factor: true, phishing: true});
  assert.equal(otp.metrics['認証結果'], '許可');
  assert.equal(otp.metrics['中継した要求'], '許可');
  assert.match(last(otp).visual.nodes.at(-1), /許可/);
});

test('SEC-003: ASLRはseedで基点が変わり、4の倍数では固定基点と一致し得る', async () => {
  const moved = await run('gap-118', {mode: 'stack', aslr: true, seed: 3, bounds: false});
  const fixed = await run('gap-118', {mode: 'stack', aslr: false, seed: 3, bounds: false});
  assert.equal(moved.metrics['仮想配置基点'], 48);
  assert.equal(fixed.metrics['仮想配置基点'], 0);
  assert.equal((await run('gap-118', {mode: 'stack', aslr: true, seed: 4})).metrics['仮想配置基点'], 0);
  assert.equal((await run('gap-118', {mode: 'stack', aslr: true, seed: 8})).metrics['仮想配置基点'], 0);
  assert.match(last(moved).explain, /4の倍数/);
  assert.match(last(moved).explain, /相対/);
  const text = L.experiences.find('gap-118').chapters.find(c => c.id === 'locations').paragraphs.join('');
  assert.match(text, /4の倍数/);
});

test('SEC-004: 逆元は掛ける数の表で探し、べき乗表は補足', async () => {
  const none = await run('gap-110', {mode: 'mod', a: 2, modulus: 8});
  assert.deepEqual(last(none).visual.headers, ['掛ける数k', 'a×k mod m']);
  assert.ok(last(none).visual.rows.every(row => row[1] !== 1));
  assert.equal(none.metrics['逆元'], '存在しない');
  const some = await run('gap-110', {mode: 'mod', a: 3, modulus: 8});
  assert.equal(last(some).visual.rows[3][1], 1);
  assert.equal(last(some).visual.activeRow, 3);
  assert.equal(some.metrics['逆元'], 3);
  assert.match(some.frames[1].title, /補足/);
});

test('SEC-005: 生RSAのm1とm2は章の操作名と表の両方で読める', async () => {
  const keys = L.experiences.find('gap-112').chapters.find(c => c.id === 'structure').activities[0].keys;
  assert.deepEqual(keys, [{key: 'width', label: '署名する値m1'}, {key: 'seed', label: '署名する値m2'}]);
  assert.equal(lab('gap-112').controls.find(c => c.key === 'width').label, '切り詰めたhashのbit数');
  assert.equal(lab('gap-112').controls.find(c => c.key === 'seed').label, '公開test seed');
  const rsa = await run('gap-112', {mode: 'raw-rsa', width: 4, seed: 7});
  assert.match(JSON.stringify(rsa.frames[0].visual.rows), /m1=4/);
  assert.match(JSON.stringify(rsa.frames[0].visual.rows), /m2=7/);
  assert.equal(rsa.metrics['元と別の値の署名が通る'], true);
});

test('NET-001: FINのACKは受信側NEXTを先に進め、アプリbyteにFINを数えない', async () => {
  const options = {bytes: 600, mss: 200, window: 4, rtt: 100, rto: 400, loss: 'none', lossSegment: 2, sack: true, adaptive: true};
  const half = L.curriculum.tcpFlow({...options, close: 'half'});
  const closeWait = half.trace.find(e => e.note.includes('CLOSE_WAIT'));
  assert.equal(closeWait.state, 'FIN_WAIT_1');
  assert.equal(closeWait.una, 1601);
  assert.equal(closeWait.expected, 1602);
  assert.equal(half.trace.at(-1).state, 'FIN_WAIT_2');
  assert.equal(half.trace.at(-1).una, 1602);
  assert.equal(half.trace.at(-1).expected, 1602);
  assert.equal(half.bytesDelivered, 600);
  assert.equal(half.complete, true);
  const graceful = L.curriculum.tcpFlow({...options, close: 'graceful'});
  assert.equal(graceful.state, 'TIME_WAIT');
  assert.equal(graceful.trace.at(-1).una, 1602);
  assert.equal(graceful.trace.at(-1).expected, 1602);
  assert.equal(graceful.bytesDelivered, 600);
  const shown = await run('gap-099', {bytes: 600, close: 'half', loss: 'none'});
  assert.equal(shown.metrics['アプリへ届いたbyte'], 600);
  assert.equal(shown.metrics['全byte確認済み'], true);
  assert.equal(shown.metrics['終了時のclient状態'], 'FIN_WAIT_2');
  assert.equal(last(shown).stats['送信側UNA'], 1602);
  assert.equal(last(shown).stats['受信側NEXT'], 1602);
  const defaults = await run('gap-099');
  assert.equal(defaults.metrics['アプリへ届いたbyte'], 1200);
  assert.equal(defaults.metrics['全byte確認済み'], true);
});

test('NET-002: BGPの表はlocal preferenceとAS長、RIPだけが16を説明する', async () => {
  const bgp = await run('gap-101', {protocol: 'bgp'});
  for (const frame of bgp.frames) {
    const text = JSON.stringify(frame);
    assert.equal(text.includes('RIPの16'), false);
    assert.equal(text.includes('知っているLSA'), false);
  }
  assert.match(bgp.frames[0].explain, /local preference/);
  assert.ok(bgp.frames.some(frame => frame.visual.headers?.includes('選択の根拠')));
  assert.match(JSON.stringify(bgp.frames[0].visual.rows), /自身が宛先/);
  const rip = await run('gap-101', {protocol: 'rip'});
  assert.ok(rip.frames.some(frame => frame.explain.includes('RIPの16')));
  const link = await run('gap-101', {protocol: 'linkstate'});
  assert.ok(link.frames.some(frame => frame.explain.includes('LSA') && frame.explain.includes('SPF')));
  assert.ok(!link.frames.some(frame => frame.explain.includes('RIPの16')));
});

test('OS-001: journalなしの途中故障は確定記録への復旧と書かない', async () => {
  const bare = await run('gap-079', {mode: 'journal', journal: false, crash: 'middle'});
  assert.equal(bare.metrics['中間状態が残る'], true);
  assert.doesNotMatch(last(bare).title, /確定記録を基準に復旧/);
  assert.doesNotMatch(last(bare).explain, /確定前の変更を捨て/);
  assert.match(last(bare).explain, /\/old/);
  assert.match(last(bare).explain, /\/new/);
  const kept = await run('gap-079', {mode: 'journal', journal: true, crash: 'middle'});
  assert.match(last(kept).explain, /確定前の変更を捨て/);
  assert.equal(kept.metrics['中間状態が残る'], false);
});

test('OS-002: 検出モードは安全性ではなくデッドロックを返す', async () => {
  const detect = await run('gap-078', {mode: 'detect'});
  assert.equal(detect.metrics['デッドロックを検出'], true);
  assert.equal(Object.hasOwn(detect.metrics, '最初の状態は安全'), false);
  assert.match(last(detect).explain, /デッドロック/);
  const avoid = await run('gap-078', {mode: 'avoid'});
  assert.equal(avoid.metrics['最初の状態は安全'], true);
  assert.equal(Object.hasOwn(avoid.metrics, 'デッドロックを検出'), false);
});

test('MEM-001: 隣り合う空きはまとめ、離れた穴は要求を拒否したまま', async () => {
  const merged = await run('c10-allocation', {sizes: '8,40,40,30', capacity: 32, release: true, policy: 'first'});
  assert.equal(merged.metrics['失敗'], 2);
  assert.match(merged.frames[1].explain, /40/);
  assert.match(merged.frames[1].explain, /連続/);
  const normal = await run('c10-allocation');
  assert.equal(normal.metrics['失敗'], 1);
  assert.match(normal.frames.at(-1).explain, /連続/);
});

test('MEM-002: VPNとoffsetは足さず、PFNにページサイズを掛ける', async () => {
  const page = await run('c10-translation');
  assert.match(page.frames[0].visual.nodes[1], /VPN 0／offset 0/);
  assert.match(page.frames[0].visual.nodes[2], /4 × 64 \+ 0/);
  assert.match(page.frames[0].explain, /足しません/);
  assert.equal(page.metrics['TLBヒット'], 2);
  assert.equal(page.metrics['ページフォルト'], 1);
  const missing = await run('c10-translation', {resolve: false, addresses: '192'});
  assert.match(missing.frames[0].visual.nodes[2], /不在/);
  assert.doesNotMatch(missing.frames[0].visual.nodes[2], /×/);
});

test('CIRCUIT-002: ORの途中はNOT AとNOT Bであり、A NAND Bではない', async () => {
  const or = await run('c08-nand', {gate: 'OR', a: true, b: false});
  assert.equal(or.metrics['出力'], 1);
  const labels = [...or.frames[0].visual.terms, ...last(or).visual.terms].map(term => term.label);
  assert.ok(labels.includes('A NAND A'));
  assert.ok(labels.includes('B NAND B'));
  assert.equal(labels.includes('A NAND B'), false);
  assert.equal(or.frames[0].visual.terms.find(term => term.label === 'A NAND A').value, 0);
  assert.equal(or.frames[0].visual.terms.find(term => term.label === 'B NAND B').value, 1);
  const and = await run('c08-nand', {gate: 'AND', a: true, b: true});
  assert.equal(and.metrics['出力'], 1);
  assert.ok(last(and).visual.terms.some(term => term.label === 'A NAND B'));
});

test('CIRCUIT-003: ダイオードの最後の図は逆電圧を含む非対称な電流', async () => {
  const diode = await run('gap-061', {device: 'diode', input: 2.5, resistance: 1000});
  const plot = last(diode).visual;
  assert.equal(plot.kind, 'plot');
  assert.equal(plot.yLabel, '電流mA');
  assert.ok(plot.series[0].points.some(point => point.x < 0));
  assert.ok(plot.series[0].points.some(point => point.x > 0 && point.y > 1));
  assert.ok(Math.abs(diode.metrics['逆方向電流mA']) < 1e-3);
  assert.ok(diode.metrics['順方向電流mA'] > 1);
  assert.match(last(diode).explain, /符号を反転/);
  assert.equal(diode.metrics['領域'], '順方向の連立解');
  const cmos = await run('gap-061', {device: 'cmos', input: 2.5});
  assert.equal(typeof cmos.metrics['出力電圧V'], 'number');
  assert.equal(last(cmos).visual.yLabel, '出力V');
  assert.ok(last(cmos).visual.series[0].points.every(point => point.x >= 0));
  assert.equal(Object.hasOwn(cmos.metrics, '逆方向電流mA'), false);
});

test('CIRCUIT-004: 減算の表は元のBとNOT Bを分け、数値は変えない', async () => {
  const sub = await run('gap-063', {operation: 'sub', a: 15, b: 1, width: 4});
  assert.ok(last(sub).visual.headers.includes('元のB'));
  assert.ok(last(sub).visual.headers.includes('加算器へ渡すNOT B'));
  assert.equal(last(sub).visual.rows[0][2], 1);
  assert.equal(last(sub).visual.rows[0][3], 0);
  assert.equal(sub.metrics['結果'], 14);
  assert.equal(sub.metrics['carry'], 1);
  assert.equal(sub.metrics['符号付きの結果'], -2);
  assert.equal(sub.metrics['符号付きoverflow'], false);
  assert.match(last(sub).explain, /反転/);
  const add = await run('gap-063');
  assert.ok(last(add).visual.headers.includes('B入力'));
  assert.equal(add.metrics['結果'], 0);
  assert.equal(add.metrics['carry'], 1);
  const known = await run('gap-063', {operation: 'sub', a: 5, b: 3});
  assert.equal(known.metrics['結果'], 2);
});

test('ARCH-001: 誤予測で読んだ命令は取消として残り、実行数には入らない', async () => {
  const pipe = await run('gap-069');
  const labels = last(pipe).visual.rowLabels;
  const mov = labels.findIndex(label => label.includes('5') && label.includes('MOV') && label.includes('取消'));
  assert.ok(mov >= 0);
  assert.equal(labels.some(label => label.includes('HALT') && label.includes('取消')), false);
  const cells = last(pipe).visual.matrix[mov];
  assert.ok(cells.includes('IF') && cells.includes('ID') && cells.includes('取消'));
  assert.equal(cells.includes('EX'), false);
  assert.equal(pipe.metrics['分岐誤予測'], 1);
  assert.equal(pipe.metrics['実行命令数'], 6);
  const predicted = await run('gap-069', {predictTaken: true});
  assert.equal(predicted.metrics['分岐誤予測'], 0);
  assert.equal(predicted.metrics['実行命令数'], 6);
  assert.equal(last(predicted).visual.rowLabels.some(label => label.includes('取消')), false);
});
