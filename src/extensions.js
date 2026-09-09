/* Further foundations needed by the specialization. All models are bounded and local. */
(() => {
'use strict';
const L=CSL,{frame:F,result:out,register:R,clone,round,rng,parseNumbers}=L;
const {range:N,select:S,toggle:B,text:T}=L.ctrl;
const add=(id,area,title,question,engine,controls,opts={})=>{
 const track=id[0]==='n'?'network':id[0]==='s'?'security':'core';
 return L.add({id,area,title,question,engine,variant:'',track,topic:track==='core'?null:id[0].toUpperCase()+id.slice(1,3),controls,level:2,minutes:10,intro:question,course:L.areas.find(a=>a.id===area).name,sources:['models'],guide:['初期条件でステップを進め、判定に使われる値を確認します。',`${controls[0].label}を変えて、どの内部状態から結果が変わるか調べます。`,'条件を比較基準に保存し、別の条件との差をノートに説明します。'],...opts});
};
L.sources.gc={name:'Crafting Interpreters — Garbage Collection',url:'https://craftinginterpreters.com/garbage-collection.html'};
L.sources.ospf={name:'RFC 2328 — OSPF Version 2',url:'https://www.rfc-editor.org/rfc/rfc2328.html'};
L.sources.slaac={name:'RFC 4862 — IPv6 Stateless Address Autoconfiguration',url:'https://www.rfc-editor.org/rfc/rfc4862.html'};

R('gc',p=>{
 const ids=['A','B','C','D','E'];const roots=String(p.roots).split(/[\s,]+/).filter(Boolean);
 if(roots.some(x=>!ids.includes(x)))throw Error('根はA〜Eをカンマで区切ってください。空欄では根がありません。');
 const edges=[['A','B'],['B','C'],['C','B'],['D','E'],['E','D'],...(p.bridge?[['C','D']]:[])].map(([a,b])=>({a,b}));
 const seen=new Set(),frames=[],work=[...new Set(roots)],swept=new Set();
 const picture=active=>({type:'network',directed:true,active,nodes:ids.map((id,i)=>({id,label:`${id} · ${swept.has(id)?'回収':seen.has(id)?'印あり':'未到達'}`,x:[130,360,590,300,530][i],y:i<3?110:280})),edges:clone(edges),detail:`根: ${roots.join(', ')||'なし'} / 灰色待ち行列: ${work.join(', ')||'空'}`});
 frames.push(F('根から到達できるものを探す','参照数ではなく、根からたどって到達できるかで判定します。DとEは互いを参照しています。',picture(null)));
 while(work.length){const id=work.pop();if(seen.has(id))continue;seen.add(id);for(const e of edges)if(e.a===id&&!seen.has(e.b))work.push(e.b);frames.push(F(`${id}に印を付ける`,'参照先を探索します。既に印があるものは再び探索しないので、循環があっても終了します。',picture(id),{'到達した数':seen.size}));}
 for(const id of ids)if(!seen.has(id)){swept.add(id);frames.push(F(`${id}を回収する`,'Markが終了した後、印のないオブジェクトをSweepします。互いを参照する循環も、根から到達できなければ回収対象です。',picture(id)));}
 frames.push(F('回収後のヒープ','この教材は停止型のMark & Sweepです。並行GC・世代別GC・移動・弱参照は含めません。',{type:'cells',rows:[{label:'保持',values:[...seen].sort().length?[...seen].sort():['なし']},{label:'回収',values:[...swept].length?[...swept]:['なし']}]}));
 return out(frames,{'オブジェクト数':5,'保持':seen.size,'回収':swept.size});
});
add('c07-gc','C07','使われないオブジェクトを回収する','参照の輪が残っていても、使わないものを回収できる？','gc',[T('roots','根から直接参照するオブジェクト','A','A〜Eをカンマで指定。空欄も試せます。'),B('bridge','CからDにも参照をつなぐ',false)],{scope:'Mark & Sweepを実行',sources:['gc','models'],prereq:['c05-stack','c10-pointer'],limits:'固定の5オブジェクト、停止型GC。実際のJavaScriptのGCを操作しているのではありません。',lesson:'生きているかは参照数だけでなく、根からの到達可能性で考えます。'});

R('branchpredict',p=>{
 const outcomes=String(p.pattern).replace(/[\s,]/g,'').toUpperCase();if(!/^[TN]{1,40}$/.test(outcomes))throw Error('T（分岐する）とN（しない）を1〜40個入力してください。');
 let counter=p.initial,last=counter>=2,wrong=0;const frames=[],rows=[];
 for(const actual of outcomes){const predicted=p.method==='static'?false:p.method==='one'?last:counter>=2;const bad=predicted!==(actual==='T');wrong+=Number(bad);const before=counter;counter=Math.max(0,Math.min(3,counter+(actual==='T'?1:-1)));last=actual==='T';rows.push([rows.length+1,predicted?'T':'N',actual,bad?'外れ':'的中']);frames.push(F(`予測 ${predicted?'T':'N'} → 実際 ${actual}`,p.method==='two'?`2ビットカウンタ ${before} → ${counter}。2以上をTと予測し、結果の方向へ1段だけ変更します。`:'予測結果を実際の分岐と照合します。予測が外れたときの回復を、固定の追加コストで表します。',{type:'cells',rows:[{label:'予測方式',values:[p.method==='two'?'2ビット飽和':p.method==='one'?'直前の結果':'常にN']},{label:'予測 / 実際',values:[predicted?'T':'N',actual]},{label:'カウンタ',values:[counter]}]},{'予測外れ':wrong},{headers:['回','予測','実際','結果'],rows:clone(rows)}));}
 return out(frames,{'分岐回数':outcomes.length,'予測外れ':wrong,'的中率':`${round((1-wrong/outcomes.length)*100)}%`,'固定コスト換算':outcomes.length+wrong*p.penalty},'1分岐=1単位、予測外れごとに設定値を加算。実CPUのIPC・投機実行時間ではありません。');
});
add('c09-branch','C09','分岐の結果を予測する','たまに外れる分岐で、1ビットと2ビットの記憶は違う？','branchpredict',[T('pattern','分岐結果の列','TTTNTTTN'),S('method','予測の方法','two',[['static','常に分岐しない'],['one','直前と同じ結果'],['two','2ビット飽和カウンタ']]),N('initial','初期カウンタ（2以上はT予測）',1,0,3),N('penalty','外れ1回の追加コスト',3,0,10)],{scope:'固定の1分岐に対する予測器',prereq:['c09-pipeline'],limits:'1個の分岐を繰り返すモデルです。複数アドレス・履歴テーブルの衝突・投機実行・実CPUの予測器は含みません。'});

R('translation',p=>{
 const refs=parseNumbers(p.addresses,24);if(refs.some(x=>x<0||!Number.isInteger(x)||x>=p.pageSize*4))throw Error(`アドレスは0〜${p.pageSize*4-1}の整数にしてください。`);
 const table=[{pfn:4,write:true},{pfn:1,write:false},{pfn:6,write:true},{pfn:null,write:true}],tlb=[],frames=[];let hits=0,walks=0,faults=0,denied=0;
 for(const va of refs){const vpn=Math.floor(va/p.pageSize),offset=va%p.pageSize,entry=table[vpn],hit=p.tlb&&tlb.includes(vpn);if(hit)hits++;else walks++;let pa='—',status=hit?'TLB hit':'ページ表を参照';if(entry.pfn===null){faults++;if(p.resolve){entry.pfn=7;status='ページフォルト → frame 7を割当 → 再実行';}else status='ページフォルト（未解決）';}
  if(entry.pfn!==null){if(p.write&&!entry.write){denied++;status='書込保護違反';}else{pa=entry.pfn*p.pageSize+offset;if(p.tlb){const i=tlb.indexOf(vpn);if(i>=0)tlb.splice(i,1);tlb.push(vpn);while(tlb.length>p.entries)tlb.shift();}}}
  frames.push(F(`仮想アドレス ${va}: ${status}`,'ページ番号を物理フレームへ変換し、オフセットはそのまま足します。TLBがヒットしてもアクセス権限の確認は省略しません。',{type:'flow',nodes:[`VA ${va}`,`VPN ${vpn} + ${offset}`,`PFN ${entry.pfn??'不在'}`,`PA ${pa}`],active:3,failed:pa==='—'},{'TLBヒット':hits,'ページ表参照':walks,'ページフォルト':faults},{headers:['VPN','PFN','書込み'],rows:table.map((x,i)=>[i,x.pfn??'不在',x.write?'許可':'不可'])}));
 }
 return out(frames,{'参照回数':refs.length,'TLBヒット':hits,'ページ表参照':walks,'ページフォルト':faults,'保護違反':denied},'4仮想ページ・固定ページサイズ・LRUの小さなTLB。ページイン時にページ表を更新する操作を1段にまとめています。');
});
add('c10-translation','C10','仮想アドレスを物理アドレスへ','アドレス変換のキャッシュミスは、ページフォルトと同じ？','translation',[T('addresses','仮想アドレスの参照列','0,4,64,128,192,196,0'),S('pageSize','1ページのバイト数',64,[[64,'64 B'],[128,'128 B'],[256,'256 B']]),B('tlb','TLBを使う',true),N('entries','TLBのエントリ数',2,1,4),B('write','読取りではなく書込み',false),B('resolve','不在ページを割り当てて再実行',true)],{scope:'ページ表・TLB・権限の計算',sources:['os','models'],prereq:['c10-pages'],limits:'実OSの全ページフォルト処理や多段ページ表、プロセス切替は含みません。不在のVPN 3だけをframe 7へ割り当てます。'});

R('semaphore',p=>{
 const ops=p.operations.toUpperCase().split(/[\s,]+/).filter(Boolean);if(!ops.length||ops.length>30||ops.some(x=>!['P','C'].includes(x)))throw Error('P（生産）とC（消費）を1〜30個、カンマで入力してください。');
 const buffer=[],frames=[];let serial=0,full=0,empty=p.capacity,blocked=0,produced=0,consumed=0;
 for(const op of ops){let ok=false;if(op==='P'&&empty>0){empty--;buffer.push(++serial);full++;produced++;ok=true;}else if(op==='C'&&full>0){full--;buffer.shift();empty++;consumed++;ok=true;}else blocked++;
  frames.push(F(`${op==='P'?'生産':'消費'}: ${ok?'実行':'今は実行不可'}`,'この教材はtry-waitです。必要なカウントが0なら今回の操作は実行せず戻ります。待機・自動再開・複数CPUでのロック実装は再現しません。',{type:'cells',rows:[{label:'バッファ',values:Array.from({length:p.capacity},(_,i)=>buffer[i]??'空')},{label:'空き / 要素数',values:[empty,full]}]},{'empty + full':empty+full,'成功した生産':produced,'成功した消費':consumed}));}
 return out(frames,{'空きスロット':empty,'蓄積した要素':full,'生産':produced,'消費':consumed,'実行不可':blocked});
});
add('c12-semaphore','C12','空き数と要素数を数える','空のバッファから取り出すことを、どう防ぐ？','semaphore',[N('capacity','バッファの容量',3,1,8),T('operations','P=生産、C=消費','P,P,P,P,C,C,P,C,C')],{scope:'数え上げセマフォのtry-wait',sources:['os','models'],prereq:['c05-queue','c12-race'],limits:'各操作を原子的に1回試行。sem_waitでブロックされたスレッドの再開やmutex内部は対象外です。'});

R('turing',p=>{
 const tape=[...'1'.repeat(p.a)+'#'+'1'.repeat(p.b),'□'],frames=[];let head=0,state='q0',steps=0;
 while(state!=='HALT'&&steps<40){const read=tape[head],from=state;let action='';if(state==='q0'&&read==='1'){head++;action='右へ';}else if(state==='q0'&&read==='#'){tape[head]='1';head++;state='q1';action='#を1にして右へ';}else if(state==='q1'&&read==='1'){head++;action='右へ';}else if(state==='q1'&&read==='□'){head--;state='q2';action='左へ';}else if(state==='q2'&&read==='1'){tape[head]='□';state='HALT';action='最後の1を消して停止';}else throw Error('教材の遷移規則に一致しません。');steps++;frames.push(F(`${from}: ${read}を読む → ${action}`,'1の個数で自然数を表します。区切りを1に変えた分、末尾の1を消して個数を合わせる固定のチューリング機械です。',{type:'cells',rows:[{label:'テープ',values:tape.map((x,i)=>i===head?`[${x}]`:x)},{label:'内部状態',values:[state]}]},{'ステップ':steps,'ヘッド位置':head}));}
 return out(frames,{'入力A':p.a,'入力B':p.b,'結果の1の個数':tape.filter(x=>x==='1').length,'ステップ':steps,'状態':state},'固定の単項加算機械。すべてのプログラムの停止性を判定する教材ではありません。');
});
add('c02-turing','C02','テープと状態だけで計算する','足し算の記号を使わず、1を何個残せる？','turing',[N('a','左側の1の個数',3,1,8),N('b','右側の1の個数',2,1,8)],{scope:'単項加算の固定チューリング機械',prereq:['c02-dfa'],limits:'固定の遷移規則・有限の入力範囲のみ。汎用の機械エディタや停止性判定ではありません。'});

R('knn',p=>{
 const random=rng(p.seed),data=Array.from({length:40},()=>{const x=random()*2-1,y=random()*2-1,truth=x*x+y*y<.5?0:1,label=random()<p.noise/100?1-truth:truth;return{x,y,cluster:label,truth};});
 const nearest=data.map((x,i)=>({...x,id:i,d:Math.hypot(x.x-p.x,x.y-p.y)})).sort((a,b)=>a.d-b.d).slice(0,p.k),frames=[],votes=[0,0];
 nearest.forEach((pt,i)=>{votes[pt.cluster]++;frames.push(F(`${i+1}番目に近い点を調べる`,`距離 ${round(pt.d,3)} / class ${pt.cluster===0?'A':'B'}。ここでは2次元のユークリッド距離を使います。`,{type:'scatter',points:clone(data),legend:['クラスA / ○','クラスB / ○'],xLabel:'×は未知点',centers:[{x:p.x,y:p.y}],line:[{x:p.x,y:p.y},{x:pt.x,y:pt.y}]},{'Aへの票':votes[0],'Bへの票':votes[1]}));});
 const prediction=votes[0]>votes[1]?'A':'B';return out(frames,{'k':p.k,'クラスA':votes[0],'クラスB':votes[1],'予測':prediction,'生成規則でのクラス':p.x*p.x+p.y*p.y<.5?'A':'B'},'○の標本から近いk点を選び、×の未知点を分類。固定の円形規則から生成したデータであり、現実の汎化性能の評価ではありません。');
});
add('c17-knn','C17','近いデータから分類する','近くの1点だけを信じるか、周囲の多数を見るか。','knn',[N('x','未知点のx',.4,-1,1,.05),N('y','未知点のy',.2,-1,1,.05),S('k','参照する点の数',3,[1,3,5,9,15]),N('noise','学習ラベルを反転する確率',5,0,40,5,'%'),N('seed','seed',42,1,99)],{scope:'k近傍分類を実計算',course:'人工知能／データサイエンス',limits:'2次元・40点・ユークリッド距離・奇数k。未知点1個の結果でモデル全体の性能を判断しません。'});

R('imagefilter',p=>{
 const size=9,input=Array.from({length:size},(_,y)=>Array.from({length:size},(_,x)=>p.pattern==='box'?(x>=3&&x<=5&&y>=3&&y<=5?220:20):(x<4?25:230)));
 const kernels={blur:[[1,1,1],[1,1,1],[1,1,1]],edge:[[-1,-1,-1],[-1,8,-1],[-1,-1,-1]],sharpen:[[0,-1,0],[-1,5,-1],[0,-1,0]]},kernel=kernels[p.kernel],div=p.kernel==='blur'?9:1,values=input.map((r,y)=>r.map((_,x)=>round(kernel.reduce((s,row,ky)=>s+row.reduce((t,k,kx)=>t+k*input[Math.max(0,Math.min(size-1,y+ky-1))][Math.max(0,Math.min(size-1,x+kx-1))],0),0)/div,1)));
 const show=values=>({type:'imagegrid',values,selected:[p.x,p.y]});const terms=[];let sum=0;for(let ky=0;ky<3;ky++)for(let kx=0;kx<3;kx++){const value=input[Math.max(0,Math.min(size-1,p.y+ky-1))][Math.max(0,Math.min(size-1,p.x+kx-1))],weight=kernel[ky][kx];sum+=value*weight;terms.push([kx-1,ky-1,value,weight,value*weight]);}
 return out([F('入力画像の画素を選ぶ','0は黒、255は白。選択枠の周り3×3の画素を、カーネルの重みで足し合わせます。',show(input)),F('近傍を重み付きで合計','画像端では最も近い端の画素を繰り返す境界条件を使います。平滑化は合計を9で割ります。',{type:'grid',matrix:kernel},{'重み付き合計':sum,'除算後':round(sum/div,1)},{headers:['dx','dy','画素','係数','積'],rows:terms}),F('全画素に同じ処理を適用','見た目は0〜255にクリップします。元の計算値は状態の表に残し、負の値を消して計算したことにはしません。',show(values),{}, {headers:['y / x',...Array.from({length:size},(_,i)=>i)],rows:values.map((r,i)=>[i,...r])})],{'選択画素（入力）':input[p.y][p.x],'選択画素（計算値）':values[p.y][p.x],'表示値':Math.max(0,Math.min(255,values[p.y][p.x]))});
});
add('c18-image','C18','画像の周りの画素を混ぜる','ぼかしと輪郭抽出は、どの数字を変えている？','imagefilter',[S('pattern','入力画像','box',[['box','四角形'],['step','明暗の境界']]),S('kernel','3×3カーネル','blur',[['blur','平均でぼかす'],['edge','輪郭を抽出'],['sharpen','鮮鋭化']]),N('x','観察する画素のx',3,0,8),N('y','観察する画素のy',3,0,8)],{scope:'グレースケール畳み込み計算',course:'デジタル信号処理／コンピュータグラフィックス',limits:'9×9の固定画像。今回の対称カーネルでは相関と畳み込みの値が同じです。カラーマネジメントは含みません。'});

R('boundarytests',p=>{
 const tests=p.suite==='normal'?[4,8,12]:[-1,0,1,4,5,6,8,12,13];if(p.custom)tests.push(p.customValue);const frames=[];let failed=0;
 const valid=x=>Number.isInteger(x)&&x>=0&&x<=12,expected=x=>valid(x)?(x<6?0:100):'error';
 for(const age of tests){const got=p.implementation==='fixed'?expected(age):p.implementation==='boundary'?(valid(age)?(age<=6?0:100):'error'):(age<6?0:100),want=expected(age),ok=got===want;failed+=!ok;frames.push(F(`年齢 ${age}: ${ok?'PASS':'FAIL'}`,'仕様は「0〜12の整数だけを受け付け、6未満は無料、それ以外は100」。テストの期待値は実装と独立に、仕様から定めます。',{type:'code',code:[p.implementation==='validation'?'// 範囲の検証がない':'if (!integer(age) || age < 0 || age > 12) error',`return age ${p.implementation==='boundary'?'<=':'<'} 6 ? 0 : 100`],line:1,vars:{age,expected:want,actual:got},output:ok?'PASS':'FAIL'},{'失敗数':failed}));}
 return out(frames,{'テスト数':tests.length,'成功':tests.length-failed,'失敗':failed},'検査した入力に対する結果です。すべてPASSでも、すべての入力・実装の安全性を証明したことにはなりません。');
});
add('c16-testing','C16','境界をテストしてバグを見つける','普通の値では通るのに、境目だけで失敗する？','boundarytests',[S('implementation','試す実装','boundary',[['boundary','境界条件が <= になっている'],['validation','入力範囲を確認していない'],['fixed','仕様どおりに修正']]),S('suite','テストする範囲','normal',[['normal','よくある値だけ'],['boundary','境界・範囲外も含む']]),B('custom','自分の入力を1件追加',false),N('customValue','追加する年齢',6,-2,14)],{scope:'仕様・実装・期待値を別々に計算',course:'ソフトウェア工学／プログラミング演習',limits:'固定の関数3実装を使います。任意のコードを実行するテストサービスではありません。'});

R('vlsm',p=>{
 const demands=parseNumbers(p.hosts,8);if(demands.some(x=>!Number.isInteger(x)||x<1||x>250))throw Error('必要な端末数を1〜250の整数で入力してください。');
 const base=L.ipInt('192.0.2.0'),end=base+256,groups=demands.map((n,i)=>({id:i+1,n,size:2**Math.ceil(Math.log2(n+2))}));if(p.sorted)groups.sort((a,b)=>b.size-a.size||a.id-b.id);const allocated=[],frames=[];let cursor=base,failures=0;
 for(const g of groups){const start=Math.ceil(cursor/g.size)*g.size,prefix=32-Math.log2(g.size),ok=start+g.size<=end;if(ok){allocated.push([`LAN ${g.id}`,g.n,`${L.intIp(start)}/${prefix}`,L.intIp(start+1),L.intIp(start+g.size-2),g.size-2-g.n]);cursor=start+g.size;}else{failures++;allocated.push([`LAN ${g.id}`,g.n,'不足','—','—','—']);}frames.push(F(`LAN ${g.id}: ${ok?'割当':'空間が不足'}`,'各LANにネットワーク・ブロードキャストの2個を確保する従来型IPv4 LANモデルです。CIDRブロックの先頭をサイズの倍数にそろえます。',{type:'cells',rows:[{label:'今回のブロック',values:[ok?`${L.intIp(start)}/${prefix}`:'割当不可']}]},{'失敗したLAN':failures},{headers:['LAN','必要端末','CIDR','先頭ホスト','末尾ホスト','余剰ホスト'],rows:clone(allocated)}));}
 return out(frames,{'LAN数':demands.length,'割当成功':demands.length-failures,'失敗':failures,'未使用の末尾アドレス':end-cursor},'192.0.2.0/24は説明用。順次割当で空き穴を再利用しない方針のため、大きいブロックから割り当てる順序も比べます。/31・/32は対象外です。');
});
add('n04-vlsm','C13','必要な人数でネットワークを分ける','部屋ごとの台数が違うとき、アドレスをどう割り当てる？','vlsm',[T('hosts','LANごとの必要端末数','50,10,25,5'),B('sorted','大きいブロックから割り当てる',true)],{scope:'固定/24内のVLSM割当',course:'コンピュータネットワーク',prereq:['n04-subnet'],limits:'教材用192.0.2.0/24。指定順または降順の順次割当。ホスト用の従来型サブネット計算で、/31のポイント間接続は含みません。'});

R('slaac',p=>{
 const iid=String(p.iid).toLowerCase();if(!/^[0-9a-f]{1,4}(:[0-9a-f]{1,4}){3}$/.test(iid))throw Error('IIDは1234:5678:9abc:def0のように16進数4組で入力してください。');
 const link='fe80::'+iid,global='2001:db8:1:2:'+iid,frames=[],messages=[],actors=['Host','Router','同じリンクの機器'];
 const emit=(title,explain,msg,stats={})=>{if(msg)messages.push(msg);frames.push(F(title,explain,{type:'sequence',actors,messages:clone(messages),active:messages.length-1},stats));};
 emit('リンクローカルの候補を作る','IIDはこの教材では手動入力です。実環境のMAC由来・安定ランダム・一時アドレスの生成方式は再現していません。',null,{'候補':link});
 emit('DADで重複を調べる','候補アドレスを通常の通信に使う前に、このリンクで既に使われていないか調べます。',{from:0,to:2,label:'Neighbor Solicitation / DAD'});
 if(p.duplicate){emit('重複が見つかった','候補アドレスは利用しません。別のIIDを生成する回復処理は今回省略します。',{from:2,to:0,label:'Neighbor Advertisement / duplicate'});return out(frames,{'リンクローカル':'重複で利用不可','グローバル':'未設定','デフォルト経路':'未設定'});}
 emit('重複応答がなく、リンクローカルを設定','この教材ではDAD待ち時間を1ステップにまとめています。',{from:0,to:1,label:'Router Solicitation'});
 if(p.router){emit('Router Advertisementを受け取る','プレフィックス2001:db8:1:2::/64、Aフラグ=1、有効なlifetimeを固定条件にしています。',{from:1,to:0,label:'RA: /64 prefix + router lifetime'});emit('グローバル候補のDADも通過','今回のグローバル候補は重複しない固定条件です。リンクローカルの確認だけで全アドレスを検証したことにはしません。',{from:0,to:2,label:'DAD for global candidate'});}
 return out(frames,{'リンクローカル':link,'グローバル':p.router?global:'RAなし / 未設定','デフォルト経路':p.router&&p.lifetime?'Router':'なし'},'同じリンクの通信と、外側へのデフォルト経路を区別します。Router lifetimeが0でもアドレス用プレフィックスが有効な場合を扱います。');
});
add('n06-slaac','C13','IPv6アドレスを自動設定する','ルーターがいなくても、同じリンクのアドレスを持てる？','slaac',[T('iid','教材用の64ビットIID','1234:5678:9abc:def0'),B('duplicate','リンクローカルの候補が重複',false),B('router','有効なプレフィックスを広告するルーター',true),B('lifetime','Router lifetimeが0より大きい',true)],{scope:'SLAACとDADの固定条件フロー',sources:['slaac','ipv6','models'],prereq:['n06-ipv6'],limits:'SLAACの固定/64条件を抜粋。IIDの実生成、多重インターフェース、再送・更新・アドレス寿命の全処理は含みません。'});

R('linkstate',p=>{
 const ids=['A','B','C','D','E'],coords=[[100,180],[290,90],[290,290],[500,180],[680,180]],base=[['A','B',2],['A','C',4],['B','C',2],['B','D',2],['C','D',3],['D','E',1]].map(([a,b,cost])=>({a,b,cost}));
 const updated=clone(base);updated[0].cost=p.cost;updated[3].off=p.cut;
 // Both endpoints of the changed B-D link originate the same abstract version here.
 const known=new Set(p.cut?['A','B','D']:['A','B']),frames=[];
 const view=()=>({type:'network',nodes:ids.map((id,i)=>({id,label:`${id} · ${known.has(id)?'新':'旧'}`,x:coords[i][0],y:coords[i][1]})),edges:clone(updated),detail:'新 / 旧 は、この教材のリンク情報の版です。'});
 for(let roundId=0;roundId<6;roundId++){const rows=ids.map(id=>{const db=known.has(id)?updated:base,r=L.shortest(ids,db,id,'E');return[id,known.has(id)?'新しい情報':'古い情報',r.path.join(' → ')||'なし',Number.isFinite(r.dist.E)?r.dist.E:'到達不可'];});frames.push(F(`情報伝達 ${roundId} ホップ後`,'物理的なリンクの変更と、全ルーターが変更を知る時刻を区別します。知っているリンク情報から、各ルーターが自分の経路を計算します。',view(),{'更新済み':known.size},{headers:['ルーター','情報の版','Eへの経路','コスト'],rows}));
  const next=new Set(known);for(const e of updated)if(!e.off){if(known.has(e.a))next.add(e.b);if(known.has(e.b))next.add(e.a);}if(next.size===known.size)break;for(const id of next)known.add(id);
 }
 return out(frames,{'ルーター数':5,'更新できた台数':known.size,'観察したラウンド':frames.length-1},'OSPFのリンク情報配布と各機器でのSPF計算に絞ったモデル。Hello/隣接確立/LSA種類/ACK/再送/エリア/実際の収束時間は省略します。');
});
add('n08-linkstate','C13','経路の変更を周りへ知らせる','ケーブルが変わったことを、離れたルーターはいつ知る？','linkstate',[N('cost','A–Bの新しいコスト',8,1,15),B('cut','B–Dを切断する',false)],{scope:'リンク情報のホップ単位フラッディング',sources:['ospf','models'],prereq:['n08-routing'],limits:'OSPFの全実装ではありません。変更情報を1つの抽象的な版としてまとめ、変更を知る端点から1ホップずつ共有します。',course:'情報通信ネットワーク／インターネット技術'});

R('qos',p=>{
 let queue=[],voice=0,bulk=0,delayVoice=0,delayBulk=0,droppedVoice=0,droppedBulk=0;const frames=[];
 for(let t=0;t<24;t++){const arrivals=[];if(t%2===0)arrivals.push({kind:'voice',at:t});for(let i=0;i<p.bulk;i++)arrivals.push({kind:'bulk',at:t});for(const item of arrivals){if(queue.length<p.buffer)queue.push(item);else item.kind==='voice'?droppedVoice++:droppedBulk++;}
  const sent=[];for(let i=0;i<p.capacity&&queue.length;i++){let idx=p.policy==='priority'?queue.findIndex(x=>x.kind==='voice'):0;if(idx<0)idx=0;const item=queue.splice(idx,1)[0],wait=t-item.at;sent.push(item.kind==='voice'?'音声':'転送');if(item.kind==='voice'){voice++;delayVoice+=wait;}else{bulk++;delayBulk+=wait;}}
  frames.push(F(`時刻 ${t}: ${sent.join(' / ')||'送信なし'}`,'音声は2単位に1個、データ転送は毎単位に設定数到着。同じ大きさのパケットを有限バッファに入れ、FIFOか音声の厳密優先で取り出します。',{type:'queues',columns:[{name:'待ち行列',items:queue.map(x=>`${x.kind==='voice'?'音声':'転送'} / 到着${x.at}`)},{name:'この単位で送信',items:sent}]},{'音声を送信':voice,'転送を送信':bulk,'破棄':droppedVoice+droppedBulk}));
 }
 return out(frames,{'音声の平均待ち':voice?round(delayVoice/voice):'未送信','転送の平均待ち':bulk?round(delayBulk/bulk):'未送信','音声の破棄':droppedVoice,'転送の破棄':droppedBulk,'観察終了時の待ち':queue.length},'24時間単位の有限観測。平均は送信できたパケットだけを対象にし、未送信・破棄を別表示します。厳密優先は総容量を増やすものではありません。');
});
add('n16-qos','C13','音声とファイル転送を同じ回線へ','優先度を付けると、遅延も容量も両方解決する？','qos',[S('policy','取り出す方針','fifo',[['fifo','FIFO / 到着順'],['priority','音声を厳密優先']]),N('bulk','毎単位に届く転送パケット',3,1,5),N('capacity','毎単位に送信できる数',2,1,5),N('buffer','待ち行列の最大個数',10,3,20)],{scope:'2種類の到着と有限キューを計算',prereq:['n16-queue'],limits:'固定長パケット・離散時間・tail drop。実ネットワークのDSCP、WFQ、シェーピング、音声の品質指標は含みません。',course:'情報通信ネットワーク'});

R('ratelimit',p=>{
 const attempts=Array.from({length:p.attempts},(_,i)=>({time:i*p.interval,valid:false}));attempts.push({time:p.userTime,valid:true});attempts.sort((a,b)=>a.time-b.time||Number(a.valid)-Number(b.valid));let fails=0,until=-1,blocked=0,allowed=0,legitimate='まだ試行なし';const frames=[],rows=[];
 for(const a of attempts){if(a.time>=until&&until>=0){until=-1;fails=0;}let state='';if(a.time<until){blocked++;state='ロック中 / 検証しない';if(a.valid)legitimate='ロックで拒否';}else if(a.valid){allowed++;fails=0;state='正しい認証 / 成功';legitimate='ログイン成功';}else{allowed++;fails++;state='認証失敗';if(p.enabled&&fails>=p.threshold){until=a.time+p.cooldown;state+=' → 一時ロック';}}
  rows.push([a.time,a.valid?'正規利用者':'誤った認証情報',state]);frames.push(F(`時刻 ${a.time}s: ${state}`,'固定の1アカウントへの試行です。ロック中は正しい認証情報でも拒否されるので、試行制限と可用性の両方を観察します。',{type:'cells',rows:[{label:'失敗回数',values:[fails]},{label:'ロック終了時刻',values:[until<0?'ロックなし':`${until}s`]}]},{'検証した試行':allowed,'ロック中の拒否':blocked},{headers:['時刻','試行の種類','結果'],rows:clone(rows)}));}
 return out(frames,{'検証した試行':allowed,'ロック中の拒否':blocked,'正規利用者':legitimate},'固定しきい値とクールダウンの比較教材。IP単位の制限、複数アカウント、MFA、現実の推奨設定値は対象外です。');
});
add('s07-ratelimit','C15','認証の試行回数を制限する','厳しく制限すると、正しい利用者にも影響する？','ratelimit',[B('enabled','アカウントの一時ロックを使う',true),N('threshold','連続失敗のしきい値',3,1,8),N('cooldown','ロックの継続時間',10,1,30,1,'s'),N('attempts','誤った認証情報の試行数',8,1,15),N('interval','誤試行の間隔',1,1,5,1,'s'),N('userTime','正規利用者が試す時刻',5,0,40,1,'s')],{scope:'1アカウントの固定ロック方針',sources:['asvs','models'],prereq:['s07-mfa'],limits:'架空の認証情報・架空のアカウント内で完結します。実サービスへのログイン要求やパスワード試行を行いません。'});
})();
