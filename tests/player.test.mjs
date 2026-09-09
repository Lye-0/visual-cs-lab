import test from 'node:test';
import assert from 'node:assert/strict';
import {L} from './helpers.mjs';

function fixture(onChange) {
  let time=0, id=0;
  const pending=new Map(), emitted=[];
  const player=L.createPlayer({
    onChange:s=>{emitted.push({...s});onChange?.(s,player);},
    schedule:(fn,ms)=>{pending.set(++id,{at:time+ms,fn});return id;},
    cancel:key=>pending.delete(key)
  });
  const advance=ms=>{
    const until=time+ms;
    for(let guard=0;guard<10000;guard++){
      const next=[...pending].filter(([,task])=>task.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!next){time=until;return;}
      pending.delete(next[0]);time=next[1].at;next[1].fn();
    }
    throw Error('Unexpected runaway timer');
  };
  return {player,pending,emitted,advance};
}

test('空・1状態の実験では再生を開始しない',()=>{
 const f=fixture();for(const n of [0,1]){f.player.configure(n);assert.equal(f.player.play(),false);assert.equal(f.pending.size,0);assert.equal(f.player.state.playing,false);assert.equal(f.player.state.canPlay,false);}
});
test('再生は1手順ずつ進み、最終手順で止まる',()=>{
 const f=fixture();f.player.configure(4);f.player.play();f.advance(999);assert.equal(f.player.state.index,0);f.advance(1);assert.equal(f.player.state.index,1);f.advance(2000);assert.equal(f.player.state.index,3);assert.equal(f.player.state.playing,false);assert.equal(f.pending.size,0);f.advance(10000);assert.equal(f.player.state.index,3);
});
test('再生中の再押下は一時停止、再押下でその位置から再開',()=>{
 const f=fixture();f.player.configure(10);f.player.play();f.advance(1300);f.player.play();f.advance(9999);assert.equal(f.player.state.index,1);assert.equal(f.pending.size,0);f.player.play();f.advance(1000);assert.equal(f.player.state.index,2);
});
test('最後からの再生は先頭に戻って再開する',()=>{
 const f=fixture();f.player.configure(3,2);f.player.play();assert.equal(f.player.state.index,0);assert.equal(f.player.state.playing,true);f.advance(1000);assert.equal(f.player.state.index,1);
});
test('シークは再生を止め、位置を範囲内の整数へ丸める',()=>{
 const f=fixture();f.player.configure(6);f.player.play();f.player.seek(3.9);assert.equal(f.player.state.index,3);assert.equal(f.player.state.playing,false);assert.equal(f.pending.size,0);f.advance(9999);assert.equal(f.player.state.index,3);f.player.seek(-20);assert.equal(f.player.state.index,0);f.player.seek(100);assert.equal(f.player.state.index,5);f.player.seek(NaN);assert.equal(f.player.state.index,5);
});
test('1手順の前後移動はプレイヤーの状態と一貫する',()=>{
 const f=fixture();f.player.configure(3);f.player.step(-1);assert.equal(f.player.state.index,0);f.player.step(1);assert.equal(f.player.state.index,1);f.player.step(10);assert.equal(f.player.state.index,2);
});
test('再生中の速度変更はタイマーを一つだけ組み直す',()=>{
 const f=fixture();f.player.configure(10);f.player.play();f.advance(500);f.player.setSpeed(4);assert.equal(f.pending.size,1);f.advance(249);assert.equal(f.player.state.index,0);f.advance(1);assert.equal(f.player.state.index,1);f.advance(250);assert.equal(f.player.state.index,2);assert.equal(f.player.state.speed,4);
});
test('速度設定の範囲検証・停止中の設定では再生しない',()=>{
 const f=fixture();f.player.configure(8);f.player.setSpeed(.5);for(const x of [0,-1,9,NaN,Infinity,'bad']){f.player.setSpeed(x);assert.equal(f.player.state.speed,.5);}assert.equal(f.pending.size,0);f.player.play();f.advance(1999);assert.equal(f.player.state.index,0);f.advance(1);assert.equal(f.player.state.index,1);
});
test('条件の再計算は旧タイマーを破棄し、先頭から停止する',()=>{
 const f=fixture();f.player.configure(99);f.player.play();f.advance(700);f.player.configure(2);f.advance(10000);assert.equal(f.player.state.index,0);assert.equal(f.player.state.length,2);assert.equal(f.pending.size,0);
});
test('破棄後に旧画面のコールバックを実行しない',()=>{
 const f=fixture();f.player.configure(10);f.player.play();const stale=[...f.pending.values()][0].fn;f.player.dispose();const emitted=f.emitted.length;stale();f.advance(10000);f.player.play();f.player.seek(8);f.player.configure(99);assert.equal(f.emitted.length,emitted);assert.equal(f.pending.size,0);
});
test('古いタイマーを手動で実行してもシークした状態を上書きしない',()=>{
 const f=fixture();f.player.configure(10);f.player.play();const stale=[...f.pending.values()][0].fn;f.player.seek(7);stale();assert.equal(f.player.state.index,7);assert.equal(f.player.state.playing,false);
});
test('手順更新コールバック内での停止後に次のタイマーを作らない',()=>{
 const f=fixture((s,p)=>{if(s.index===1&&s.playing)p.pause();});f.player.configure(20);f.player.play();f.advance(1000);assert.equal(f.player.state.index,1);assert.equal(f.pending.size,0);assert.equal(f.player.state.playing,false);
});
test('全144実験の手順数で、再生・端点シークが範囲を越えない',async()=>{
 for(const lab of L.labs){const result=await L.run(lab,lab.defaults),f=fixture();f.player.configure(result.frames.length);f.player.setSpeed(8);f.player.play();f.advance(125*result.frames.length);assert.equal(f.player.state.index,result.frames.length-1,lab.id);assert.equal(f.pending.size,0,lab.id);f.player.seek(0);assert.equal(f.player.state.index,0);f.player.dispose();}
});

test('再生開始コールバックが画面を破棄してもタイマーを作らない',()=>{
 const f=fixture((s,p)=>{if(s.playing)p.dispose();});f.player.configure(3);f.player.play();assert.equal(f.pending.size,0);f.advance(5000);assert.equal(f.player.state.index,0);
});
