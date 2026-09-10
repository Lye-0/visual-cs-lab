/* GAP-133..139: actual transforms and bounded software rendering, no remote assets. */
(() => {
'use strict';
const L=CSL,K=L.curriculum,{define:D,f:F,result:out,r,s,t,round:q}=K;
const seq=K.range,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),tau=2*Math.PI;
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]],abs=a=>Math.hypot(...a);
function fft(input,inverse=false){
 const n=input.length;if(!n||(n&(n-1)))throw Error('FFTの標本数は2のべき乗です。');
 function rec(a){if(a.length===1)return [a[0].slice()];const half=a.length/2,e=rec(a.filter((_,i)=>i%2===0)),o=rec(a.filter((_,i)=>i%2===1)),v=Array(a.length);for(let i=0;i<half;i++){const angle=(inverse?1:-1)*tau*i/a.length,z=mul([Math.cos(angle),Math.sin(angle)],o[i]);v[i]=add(e[i],z);v[i+half]=sub(e[i],z);}return v;}
 const result=rec(input.map(x=>Array.isArray(x)?x:[x,0]));return inverse?result.map(z=>z.map(x=>x/n)):result;
}
function dft(a){return a.map((_,k)=>a.reduce((v,x,i)=>add(v,mul(Array.isArray(x)?x:[x,0],[Math.cos(-tau*k*i/a.length),Math.sin(-tau*k*i/a.length)])),[0,0]));}
K.fft=fft;
K.raster=(pixels,extra={})=>({type:'curriculum-raster',pixels,...extra});
const points=a=>a.map((y,x)=>({x,y}));
const plane=(a,caption)=>K.raster(a,{caption});
D(133,{
 title:'フーリエ級数・DFT・FFT・逆変換と窓',question:'波を周波数の成分へ分けると、元の波は戻せる？',
 scope:'2のべき乗8〜64標本の複素FFT、独立な直接DFTとの照合、逆変換、3種類の窓。別モードで方形波の解析的なFourier級数を部分和として計算します。',
 controls:[s('mode','実験','transform',[['transform','DFT・FFTと逆変換'],['series','方形波の級数']]),s('n','標本数',32,[8,16,32,64]),r('frequency','1区間中の波の回数',3.5,1,15,.5),s('window','区間端の窓','rect',['rect','hann','hamming']),r('terms','奇数次の項数',5,1,20)],
 alt:['端を滑らかにするHann窓を使う',{window:'hann'}],
 intro:['時間の波をそのまま比べると、どの周期の成分が含まれるか分かりにくいことがあります。周波数ごとの大きさと位相へ読み替えます。','DFTは各周波数の複素指数との内積です。FFTは同じDFTを効率よく計算する算法で、別の変換ではありません。逆変換では大きさだけでなく位相も使います。','3.5周期を32点で観測します。区間の端がつながらないため、一つの周波数だけにエネルギーが集まりません。FFTと直接DFTの差も確認してください。','窓をHannへ変えて漏れ方を比較します。級数モードでは奇数次の項を増やし、方形波の平坦部と飛びの近くを分けて観察します。','窓を掛けた後の逆変換が戻すのは、窓を掛けた信号です。有限の項や標本の実験を、連続変換の一般的な収束証明と混同しません。'],
 topics:[['フーリエ級数','周期関数を三角関数の和で表します。','square(x) ≈ Σ 4 sin((2k+1)x)/(π(2k+1))'],['DFTとFFT','FFTもDFTと同じ複素数の係数を返します。','X[k]=Σ x[n] exp(−j2πkn/N)'],['逆変換','全複素係数から標本列を復元します。'],['窓と漏れ','区間を切り出す方法がスペクトルへ影響します。'],['連続時間との対応','積分によるFourier変換と、有限標本の和を区別します。']],
 quiz:['FFTから逆変換した結果が一致するのは？','FFTへ実際に入力した標本列','常に窓を掛ける前の無限に長い信号','振幅だけを残した任意の信号','位相を含む全係数が必要です。窓を掛けた場合、その後の標本列が入力です。'],
 tests:[[{},{'FFTと直接DFTの最大差':0,'逆変換の最大誤差':0}]]
},p=>{
 if(p.mode==='series'){
  const xs=seq(181,i=>-Math.PI+tau*i/180),frames=[];let sums=xs.map(()=>0);
  for(let k=0;k<p.terms;k++){const harmonic=2*k+1;sums=sums.map((y,i)=>y+4/Math.PI*Math.sin(harmonic*xs[i])/harmonic);if(k<3||k===p.terms-1)frames.push(F(`${harmonic}次まで足す`,'平坦な場所では近づいても、飛びの近くに振動が残ります。項数を増やしたときの幅と高さを区別してください。',K.plot([{name:'方形波の片側の値',points:xs.map(x=>({x,y:Math.sin(x)>=0?1:-1}))},{name:'級数の部分和',points:xs.map((x,i)=>({x,y:sums[i]}))}],{xLabel:'x',yLabel:'振幅'})));}
  return out(frames,{'項数':p.terms,'表示区間の最大値':q(Math.max(...sums)),'DFT用窓設定':p.window});
 }
 const x=seq(p.n,i=>Math.sin(tau*p.frequency*i/p.n)+.35*Math.cos(tau*2*i/p.n)),window=seq(p.n,i=>p.window==='hann'?.5-.5*Math.cos(tau*i/(p.n-1)):p.window==='hamming'?.54-.46*Math.cos(tau*i/(p.n-1)):1),input=x.map((v,i)=>v*window[i]),a=fft(input),b=dft(input),back=fft(a,true),error=Math.max(...back.map((v,i)=>Math.abs(v[0]-input[i]))),difference=Math.max(...a.map((v,i)=>abs(sub(v,b[i]))));
 const frames=[F('観測区間と窓を対応させる','同じ位置の標本に窓の値を掛けます。端を小さくすると、その周辺の信号自体も変わります。',K.plot([{name:'窓を掛ける前',points:points(x)},{name:'FFTへ入れる値',points:points(input)}],{xLabel:'標本番号',yLabel:'値'}))];
 frames.push(F('複素係数へ分解する','各係数には実部と虚部があります。表示する振幅は|X[k]|/Nで、片側スペクトルの振幅補正はしていません。',K.plot([{name:'振幅 |X|/N',points:a.slice(0,p.n/2+1).map((v,i)=>({x:i,y:abs(v)/p.n}))}],{xLabel:'周波数の番号k',yLabel:'係数の大きさ'})));
 frames.push(F('係数と計算法を照合する','直接DFTとFFTは別の手順で同じ値を計算しています。丸め誤差程度の差があることも確認します。',K.table(['k','実部','虚部','位相(rad)','直接DFTとの差'],a.map((v,i)=>[i,q(v[0]),q(v[1]),q(Math.atan2(v[1],v[0])),q(abs(sub(v,b[i])),10)]))));
 frames.push(F('逆変換して入力と比べる','窓を掛けた入力が戻っています。係数の一部を捨てる圧縮とは違い、この操作では全係数を使用しています。',K.plot([{name:'FFTへ入れた標本',points:points(input)},{name:'逆変換',points:points(back.map(v=>v[0]))}],{xLabel:'標本番号',yLabel:'復元値'})));
 return out(frames,{'FFTと直接DFTの最大差':q(difference,10),'逆変換の最大誤差':q(error,10),'標本数':p.n,'窓':p.window});
});
function filterSignal(x,b,a){if(!a.length||a[0]===0)throw Error('分母の先頭a0は0以外にしてください。');const y=[];for(let i=0;i<x.length;i++){let v=0;for(let k=0;k<b.length;k++)if(i>=k)v+=b[k]*x[i-k];for(let k=1;k<a.length;k++)if(i>=k)v-=a[k]*y[i-k];v/=a[0];if(!Number.isFinite(v)||Math.abs(v)>1e100)throw Error('この係数では計算が発散して数値範囲を超えます。極や係数を確認してください。');y.push(v);}return y;}
K.filterSignal=filterSignal;
D(134,{
 title:'インパルス応答・FIR／IIR・周波数応答と極',question:'過去の入力や出力を足すだけで、どんな波が通る？',
 scope:'最大8係数のFIRと2次までのIIRを差分方程式で実行。初期状態0、64標本。周波数応答と分母の根を計算し、極零相殺は仮定しません。',
 controls:[s('mode','方式','IIR',['FIR','IIR']),t('b','入力側の係数b','0.25,0.5,0.25'),t('a','出力側の係数a','1,-0.6'),s('signal','入力','impulse',['impulse','step','sine']),r('frequency','正弦波の回数',4,1,20)],
 alt:['FIRへ切り替え、過去の出力を使わない',{mode:'FIR'}],
 intro:['信号の周りを平均する操作も、過去の出力を少し足す操作も、差分方程式として書けます。どの成分を残すかが係数で変わります。','入力の遅れに重みを掛けるのがFIRの基本です。IIRでは過去の出力も戻します。インパルスへの応答と畳み込みから、線形時不変な系の出力を考えます。','最初の1点だけ1にした信号を入れます。bの3係数だけの場合と、出力を0.6倍して戻す場合の尾の長さを比べてください。','入力を正弦波へ変更し、周波数を動かします。時間の波だけでなく、H(e^jω)と極の位置も比べると通り方を説明できます。','有限時間で値が小さいことだけでは安定性の証明になりません。この極判定は表示する有理系の分母を対象とし、極零相殺や実機の有限精度を省略しています。'],
 topics:[['インパルス応答','一つの刺激への応答から系の性質を調べます。'],['畳み込み','入力をずらした応答の重ね合わせとして出力を計算します。'],['差分方程式','過去の入力と出力を使います。','a0 y[n]=Σ bk x[n−k]−Σ(k≥1) ak y[n−k]'],['Z変換','遅れをz⁻¹の因子として表します。'],['周波数応答と安定性','単位円上の応答と、分母の根を区別します。']],
 quiz:['FIRとIIRのこの教材での違いは？','IIRは過去の出力を計算に戻す','FIRは必ず入力を変えない','IIRはすべて安定している','フィードバックにより無限に続く応答や不安定な応答も生じ得ます。'],
 tests:[[{mode:'FIR',b:'1',signal:'impulse'},{'出力の最初の値':1,'出力の最後の値':0}]]
},p=>{
 const b=K.numbers(p.b,1,8),a=p.mode==='FIR'?[1]:K.numbers(p.a,1,3),x=seq(64,i=>p.signal==='impulse'?+(i===0):p.signal==='step'?1:Math.sin(tau*p.frequency*i/64)),y=filterSignal(x,b,a),poles=[];
 if(a.length===2)poles.push([-a[1]/a[0],0]);
 if(a.length===3){const dis=a[1]*a[1]-4*a[0]*a[2];if(dis>=0)poles.push([(-a[1]+Math.sqrt(dis))/(2*a[0]),0],[(-a[1]-Math.sqrt(dis))/(2*a[0]),0]);else poles.push([-a[1]/(2*a[0]),Math.sqrt(-dis)/(2*Math.abs(a[0]))],[-a[1]/(2*a[0]),-Math.sqrt(-dis)/(2*Math.abs(a[0]))]);}
 const response=seq(81,i=>{const omega=Math.PI*i/80,evalPoly=c=>c.reduce((z,v,k)=>add(z,[v*Math.cos(-omega*k),v*Math.sin(-omega*k)]),[0,0]),num=abs(evalPoly(b)),den=abs(evalPoly(a));return {x:omega/Math.PI,y:den<1e-12?null:num/den};});
 const frames=[F('係数の担当を分ける','bは入力、aの先頭以外は過去の出力の担当です。符号とa0による割り算を確認してください。',K.table(['位置k','bk','ak'],seq(Math.max(a.length,b.length),i=>[i,b[i]??0,a[i]??0]))),F('入力から順に出力を計算する','まだ存在しない負の時刻の値は0です。同じ差分方程式を標本ごとに実行しています。',K.plot([{name:'入力',points:points(x)},{name:'出力',points:points(y)}],{xLabel:'標本番号',yLabel:'値'}))];
 frames.push(F('周波数ごとの倍率を見る','分母が0になる点はグラフから省き、極の欄で確認します。周波数はπ rad/sampleを1とする正規化表示です。',K.plot([{name:'|H|',points:response.filter(p=>p.y!==null)}],{xLabel:'ω/π',yLabel:'倍率'})));
 frames.push(F('分母の根を確認する','この因果的な有理系では、相殺がなければ全極が単位円内にあることがBIBO安定の条件です。',K.table(['極の実部','虚部','半径','単位円の内側'],poles.length?poles.map(z=>[q(z[0]),q(z[1]),q(abs(z)),abs(z)<1]):[['FIR','有限の応答','—',true]])));
 return out(frames,{'出力の最初の値':q(y[0]),'出力の最後の値':q(y.at(-1)),'極が全て単位円内':poles.every(z=>abs(z)<1),'方式':p.mode});
});
D(135,{
 title:'標本化・量子化・ディザ・信号の再構成',question:'時間を細かく記録することと、値を細かく記録することは同じ？',
 scope:'1秒の正弦波、2〜32 sample/s、2〜8bitの端点を含む一様量子化。有限区間の零次保持・線形補間・有限sinc和を比較します。音声を外部へ送信しません。',
 controls:[r('frequency','信号周波数',3,1,12,.5,'Hz'),r('rate','1秒の標本数',16,2,32),r('bits','量子化bit数',3,2,8),s('reconstruction','再構成','linear',['hold','linear','sinc']),K.b('dither','量子化前に微小な雑音を加える',false),r('seed','ディザのseed',42,1,99)],
 alt:['量子化を8bitにする',{bits:8}],
 intro:['同じ時刻に記録しても、保存できる値の段階が少ないと階段状に丸められます。一方、時間の点が少なければ別の周波数と区別できなくなります。','標本化は時間方向、量子化は値の方向の離散化です。標本の間を埋める方法にも仮定があり、失った情報が自動で復活するわけではありません。','3Hzを16点、3bitで記録します。元の波、標本化した値、丸めた値を同じ位置で比べてください。','bit数だけを増やした場合と、標本数だけを増やした場合を分けます。保持・線形補間・sinc和を切り替え、区間の端にも注目します。','sinc再構成の理想的な定理は帯域制限などの条件を持ちます。ここでは有限の標本を足すため端の誤差があり、ディザも単にすべての誤差を小さくする処理ではありません。'],
 topics:[['標本化','記録する時刻の間隔を決めます。'],['量子化','表現可能な段階へ丸めます。','L=2^b'],['エイリアシング','異なる波が同じ標本に見える場合があります。'],['ディザ','丸める前の雑音で量子化誤差の性質を変えます。'],['再構成','保存した点から連続的な表現を作ります。']],
 quiz:['標本化周波数を変えずbit数だけを増やすと？','値の丸めは細かくなるが、時間方向のエイリアシングは解消しない','必ずどんな周波数も復元できる','記録する時刻が自動で増える','時間方向と値方向の制限は別に扱う必要があります。']
},p=>{
 const random=L.rng(p.seed),fn=x=>Math.sin(tau*p.frequency*x+.2),levels=2**p.bits,step=2/(levels-1),samples=seq(p.rate,i=>({x:i/p.rate,y:fn(i/p.rate)})),quantized=samples.map(pt=>({x:pt.x,y:Math.round((clamp(pt.y+(p.dither?(random()-.5)*step:0),-1,1)+1)/step)*step-1}));
 const sinc=x=>Math.abs(x)<1e-12?1:Math.sin(Math.PI*x)/(Math.PI*x),reconstruct=x=>{const position=x*p.rate,index=Math.min(p.rate-1,Math.floor(position));if(p.reconstruction==='hold')return quantized[index].y;if(p.reconstruction==='linear'){const next=Math.min(p.rate-1,index+1),fraction=position-index;return quantized[index].y*(1-fraction)+quantized[next].y*fraction;}return K.sum(quantized.map((point,i)=>point.y*sinc(position-i)));};
 const domain=seq(161,i=>i/160),mse=K.mean(samples.map((pt,i)=>(pt.y-quantized[i].y)**2)),power=K.mean(samples.map(pt=>pt.y**2));
 const frames=[F('時間の点を選ぶ','まず値を丸めず、指定した時刻の信号を取り出します。',K.plot([{name:'元の信号',points:domain.map(x=>({x,y:fn(x)}))},{name:'標本',scatter:true,points:samples}],{xLabel:'秒',yLabel:'振幅'})),F('保存できる値へ丸める','時刻は変わりません。表の同じ行で、丸める前と後を比べます。',K.table(['時刻','標本値','保存値','差'],samples.map((pt,i)=>[q(pt.x),q(pt.y),q(quantized[i].y),q(quantized[i].y-pt.y)]))),F('点の間を埋める','この再構成は指定した仮定で計算したものです。有限区間と量子化の誤差が残ります。',K.plot([{name:'元の信号',points:domain.map(x=>({x,y:fn(x)}))},{name:'再構成',points:domain.map(x=>({x,y:reconstruct(x)}))},{name:'保存した点',scatter:true,points:quantized}],{xLabel:'秒',yLabel:'振幅'}))];
 return out(frames,{'量子化段階数':levels,'標本値との平均二乗誤差':q(mse,8),'標本上のSNR(dB)':mse===0?'∞':q(10*Math.log10(power/mse)),'折返し周波数(Hz)':q(Math.abs(p.frequency-Math.round(p.frequency/p.rate)*p.rate))});
});
function rgbToHsv([r,g,b]){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d)h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;return [K.mod(h/6,1),max?d/max:0,max];}
function hsvToRgb([h,s,v]){h=K.mod(h,1)*6;const c=v*s,x=c*(1-Math.abs(h%2-1)),m=v-c,a=h<1?[c,x,0]:h<2?[x,c,0]:h<3?[0,c,x]:h<4?[0,x,c]:h<5?[x,0,c]:[c,0,x];return a.map(x=>Math.round((x+m)*255));}
const gray=rgb=>Math.round(.299*rgb[0]+.587*rgb[1]+.114*rgb[2]);
function sampleImage(n=16){return seq(n,y=>seq(n,x=>[Math.round(255*x/(n-1)),Math.round(255*y/(n-1)),(Math.floor(x/3)+Math.floor(y/3))%2?220:35]));}
D(136,{
 title:'RGB・ヒストグラム・二値化・形態学的処理',question:'画素の数値を変えると、形や色の何が変わる？',
 scope:'独自の16×16 RGB画像。Y′の単純加重、HSV回転、二値化、3×3の膨張・収縮、CDFによる平坦化、逆写像の最近傍回転を実計算します。',
 controls:[s('operation','処理','threshold',['gray','threshold','dilate','erode','equalize','rotate','hue']),r('threshold','二値化のしきい値',128,0,255),r('angle','回転・色相の角度',30,-180,180,5)],
 alt:['しきい値を60へ下げる',{threshold:60}],
 intro:['画像は画素の集まりですが、数値を変える規則によって、色を変える操作にも形を変える操作にもなります。まず小さな画像で対応を追います。','RGBの成分をまとめる、しきい値で2段階に分ける、近傍の最大・最小を取るなど、それぞれ別の処理です。座標変換では値だけでなく位置も変わります。','しきい値128で16×16の画像を二値化します。明るい側と暗い側の境界を、元の画素の数値と比べてください。','しきい値を変えた後、膨張と収縮を試します。回転では移動先から元画像を引く逆写像を使い、穴ができる理由も考えます。','ここで使うY′は符号化されたRGBの単純加重で、物理的な輝度や色管理全体ではありません。近傍処理では画像の外側を0として扱います。'],
 topics:[['RGBとHSV','同じ色を成分の値や色相・彩度・明度で表します。'],['ヒストグラム','明るさごとの画素数を集計します。'],['二値化','値をしきい値で分けます。'],['膨張と収縮','近傍の最大・最小で二値領域を変えます。'],['逆写像','移動先の画素から、参照する元の座標を求めます。']],
 quiz:['二値画像の膨張で行うのは？','各画素の近傍の最大値を取って領域を広げる','各画素を必ず半分の値にする','座標を一切使わず画像のサイズだけ増やす','どの近傍を使うかも処理の一部です。この例では3×3を使います。']
},p=>{
 const source=sampleImage(),g=source.map(row=>row.map(gray)),binary=g.map(row=>row.map(v=>v>=p.threshold?255:0)),hist=Array(256).fill(0);g.flat().forEach(v=>hist[v]++);let output,extra='';
 if(p.operation==='gray')output=g;
 else if(p.operation==='threshold')output=binary;
 else if(['dilate','erode'].includes(p.operation)){output=g.map((row,y)=>row.map((_,x)=>{const values=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)values.push(binary[y+dy]?.[x+dx]??0);return p.operation==='dilate'?Math.max(...values):Math.min(...values);}));extra='境界の外側は0。';}
 else if(p.operation==='equalize'){let total=0;const cdf=hist.map(v=>(total+=v)),min=cdf.find(v=>v>0)||0;output=g.map(row=>row.map(v=>total===min?v:Math.round((cdf[v]-min)/(total-min)*255)));}
 else if(p.operation==='hue')output=source.map(row=>row.map(rgb=>{const hsv=rgbToHsv(rgb);hsv[0]+=p.angle/360;return hsvToRgb(hsv);}));
 else{const a=p.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),center=7.5;output=source.map((row,y)=>row.map((_,x)=>{const sx=Math.round(c*(x-center)+s*(y-center)+center),sy=Math.round(-s*(x-center)+c*(y-center)+center);return source[sy]?.[sx]||[0,0,0];}));extra='参照元が画像外なら黒。補間は最近傍。';}
 const outGray=output.map(row=>row.map(v=>Array.isArray(v)?gray(v):v)),histOut=Array(256).fill(0);outGray.flat().forEach(v=>histOut[v]++);
 const frames=[F('元の画素と数値を見る','小さな独自画像を使い、個々の画素を選べるようにしています。',plane(source,'元のRGB画像')),F('選んだ規則で画素を変える',p.operation+'を実行しました。'+extra,plane(output,'処理後')),F('値の分布を比較する','同じ画像でも、分布が変わった場合と位置だけが変わった場合を区別します。',K.plot([{name:'処理前',points:points(hist)},{name:'処理後',points:points(histOut)}],{xLabel:'8bitの値',yLabel:'画素数'}))];
 return out(frames,{'画素数':256,'処理':p.operation,'処理後の平均Y′':q(K.mean(outGray.flat())),'白画素数':outGray.flat().filter(v=>v===255).length});
});
const mix=(a,b,t)=>a.map((v,i)=>v*(1-t)+b[i]*t);
function clipPolygon(vertices){let v=vertices;for(const plane of [p=>p[3]+p[0],p=>p[3]-p[0],p=>p[3]+p[1],p=>p[3]-p[1],p=>p[3]+p[2],p=>p[3]-p[2]]){const output=[];for(let i=0;i<v.length;i++){const a=v[i],b=v[(i+1)%v.length],da=plane(a.clip),db=plane(b.clip),ia=da>=0,ib=db>=0;if(ia)output.push(a);if(ia!==ib){const t=da/(da-db);output.push({clip:mix(a.clip,b.clip,t),color:mix(a.color,b.color,t)});}}v=output;if(!v.length)break;}return v;}
function rasterTriangles(triangles,n,depth=true,cull=false){
 const image=seq(n,()=>seq(n,()=>[15,24,34])),zbuffer=seq(n,()=>Array(n).fill(Infinity));let covered=0,rejected=0;
 const edge=(a,b,p)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
 for(const triangle of triangles){const a=triangle.map(v=>({x:(v.clip[0]/v.clip[3]+1)*(n-1)/2,y:(1-v.clip[1]/v.clip[3])*(n-1)/2,z:v.clip[2]/v.clip[3],w:v.clip[3],color:v.color}));const area=edge(a[0],a[1],a[2]);if(Math.abs(area)<1e-9||cull&&area>=0)continue;
  for(let y=Math.max(0,Math.floor(Math.min(...a.map(v=>v.y))));y<=Math.min(n-1,Math.ceil(Math.max(...a.map(v=>v.y))));y++)for(let x=Math.max(0,Math.floor(Math.min(...a.map(v=>v.x))));x<=Math.min(n-1,Math.ceil(Math.max(...a.map(v=>v.x))));x++){const sample={x:x+.5,y:y+.5},weights=[edge(a[1],a[2],sample)/area,edge(a[2],a[0],sample)/area,edge(a[0],a[1],sample)/area];if(weights.some(w=>w< -1e-9))continue;covered++;const z=K.sum(weights.map((w,i)=>w*a[i].z));if(depth&&z>=zbuffer[y][x]){rejected++;continue;}zbuffer[y][x]=z;const reciprocal=K.sum(weights.map((w,i)=>w/a[i].w));image[y][x]=seq(3,k=>clamp(Math.round(K.sum(weights.map((w,i)=>w*a[i].color[k]/a[i].w))/reciprocal),0,255));}
 }
 return {image,zbuffer,covered,rejected};
}
K.clipPolygon=clipPolygon;K.rasterTriangles=rasterTriangles;
D(137,{
 title:'3D描画：座標変換・クリッピング・画素・深度',question:'3次元の三角形が、どの画素のどの色になる？',
 scope:'8頂点12三角形の立方体を回転し、透視投影、6平面クリッピング、重心座標による32×32ソフトウェア描画、深度検査を順に実行します。GPUやWebGLの完全な実装ではありません。',
 controls:[r('angle','物体のY回転',25,0,355,5),r('distance','視点からの距離',4,2,6,.2),r('near','近い側のクリップ距離',.5,.1,3,.1),K.b('depth','深度検査を使う',true),K.b('cull','裏面を除く',false),K.b('reverse','三角形の描画順を逆にする',false)],
 alt:['深度検査を外す',{depth:false}],
 intro:['画面は平らな画素ですが、入力する形は3次元の頂点です。座標変換から、見える範囲の切取り、画素の決定までを分けて追います。','モデル・視点・投影の変換の後も、すぐに画素になるわけではありません。切取り、透視除算、画面座標への変換、補間、深度検査が必要です。','立方体を25度回転して32×32の画素へ描きます。最初は粗い画素で、どの段階が何を決めるかを確認してください。','深度検査と描画順を別々に変えます。近い側の平面を物体へ近づけると、頂点を捨てるだけでなく新しい交点が必要になります。','この教材は独自のソフトウェア描画器です。画面の上下や深度の範囲を明示し、実際のAPIごとの座標規約の違いまで同一視しません。'],
 topics:[['座標の段階','物体、視点、クリップ、画面の座標を区別します。'],['同次座標','透視除算に使うwを保持します。'],['クリッピング','平面との交点を追加して多角形を切り取ります。'],['ラスタライズ','画素中心と三角形の重心座標を照合します。'],['深度検査','近い面を残し、描画順への依存を減らします。']],
 quiz:['深度検査を外して三角形の順を変えると？','後から描いた遠い面が近い面を上書きする場合がある','必ず同じ画像になる','3D座標が自動で近い順に並ぶ','深度検査と、あらかじめ面を並べる処理は別です。']
},p=>{
 const vertices=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],faces=[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[3,7,6],[3,6,2],[0,4,7],[0,7,3],[1,2,6],[1,6,5]],angle=p.angle*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),far=12,f=1/Math.tan(Math.PI/6),view=vertices.map(([x,y,z])=>[c*x+s*z,y,-s*x+c*z-p.distance]),clip=view.map(([x,y,z])=>[f*x,f*y,(far+p.near)/(p.near-far)*z+2*far*p.near/(p.near-far),-z]);
 let triangles=[];for(const face of faces){const polygon=clipPolygon(face.map(index=>({clip:clip[index],color:vertices[index].map(v=>v>0?225:45)})));for(let i=1;i<polygon.length-1;i++)triangles.push([polygon[0],polygon[i],polygon[i+1]]);}if(p.reverse)triangles.reverse();
 const render=rasterTriangles(triangles,32,p.depth,p.cull),depthImage=render.zbuffer.map(row=>row.map(z=>Number.isFinite(z)?Math.round((1-clamp((z+1)/2,0,1))*255):0));
 const frames=[F('頂点を視点と投影の座標へ移す','物体の回転と、視点から見た移動を分けます。wを割る前の座標も保持します。',K.table(['頂点','物体 xyz','視点 xyz','clip xyzw'],vertices.map((v,i)=>[i,v,view[i].map(x=>q(x)),clip[i].map(x=>q(x))]))),F('見える範囲で切り取る','各三角形を6つの平面で切り、残った多角形を三角形へ分けます。完全に消えた面もあります。',K.table(['元の三角形','クリップ後の三角形','near','far'],[[faces.length,triangles.length,p.near,far]])),F('画素と色を決める','色は1/wを使って透視補正しています。暗い背景はどの三角形にも覆われなかった画素です。',plane(render.image,'32×32の描画結果')),F('奥行きだけを読む','白いほど手前、黒いほど奥です。背景には面がありません。',plane(depthImage,'深度の可視化'))];
 return out(frames,{'クリップ後の三角形':triangles.length,'被覆したフラグメント':render.covered,'深度で拒否したフラグメント':render.rejected,'深度検査':p.depth});
});
const normalize=v=>{const n=Math.hypot(...v);return n?v.map(x=>x/n):v.map(()=>0);};
D(138,{
 title:'法線・照明・材質・テクスチャとアンチエイリアス',question:'同じ形でも、光や表面の規則で見え方が変わるのはなぜ？',
 scope:'解析的な球の表面法線にLambert拡散とPhong型鏡面項を適用。UVのチェッカーテクスチャと1／4／16点スーパーサンプリングを32×32で比較します。物理的な光輸送全体ではありません。',
 controls:[r('azimuth','光の左右角',30,-180,180,5),r('elevation','光の上下角',35,-80,80,5),r('shininess','鏡面項の指数',24,1,96),K.b('texture','UVのチェッカーを使う',false),s('samples','画素内の標本数',1,[1,4,16]),r('frequency','テクスチャの細かさ',8,2,24)],
 alt:['画素内を16点で平均する',{samples:16}],
 intro:['表面がどちらを向くか、光がどこから来るか、反射の規則が何かを分けると、同じ球の見え方を説明できます。','法線と光の方向の内積が拡散反射の基本です。鏡面項は視線との関係も使います。テクスチャはUVで値を引き、画素の標本化でその見え方も変わります。','球の左上から光を当てます。明るい場所を探してから光を移動し、物体が動いていないことを確認してください。','鏡面項の指数を変え、UVチェッカーを有効にします。画素内の標本数を増やすと、球の輪郭と細かい模様の境界がどう変わるか比べます。','Phong型の経験的な式を使った教材です。全ての材質を物理的に再現するものではなく、標本数を増やしても無限に細かい模様が完全に復元されるわけではありません。'],
 topics:[['法線','表面の向きを表すベクトルです。'],['拡散と鏡面','光と法線、反射方向と視線の関係を別々に使います。'],['材質','同じ照明でも反射の係数や指数が異なります。'],['UV','表面上の場所をテクスチャの座標へ移します。'],['アンチエイリアス','画素の中の複数標本を平均します。']],
 quiz:['法線が同じでも鏡面ハイライトが変わる要因は？','光や視線の向き、材質の指数','ファイル名だけ','画素番号は必ず同じ反射率を持つ','幾何と照明と材質を分けて考えます。']
},p=>{
 const az=p.azimuth*Math.PI/180,el=p.elevation*Math.PI/180,light=normalize([Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)]),side=Math.sqrt(p.samples),normalImage=seq(32,()=>seq(32,()=>[15,24,34]));let hits=0,total=0;
 const image=seq(32,y=>seq(32,x=>{const sum=[0,0,0];for(let sy=0;sy<side;sy++)for(let sx=0;sx<side;sx++){const xx=(x+(sx+.5)/side)/32*2-1,yy=1-(y+(sy+.5)/side)/32*2,r2=xx*xx+yy*yy;if(r2>1){[15,24,34].forEach((v,i)=>sum[i]+=v);continue;}hits++;const z=Math.sqrt(1-r2),n=[xx,yy,z],dot=Math.max(0,K.dot(n,light)),reflection=sub3(n.map(v=>2*dot*v),light),spec=dot>0?Math.max(0,reflection[2])**p.shininess:0,u=.5+Math.atan2(z,xx)/tau,v=Math.acos(clamp(yy,-1,1))/Math.PI,checker=(Math.floor(u*p.frequency)+Math.floor(v*p.frequency))%2,albedo=p.texture?(checker?[.75,.8,.9]:[.1,.16,.22]):[.25,.65,.6];const rgb=albedo.map(a=>clamp((.07+.75*dot)*a+.5*spec,0,1)*255);rgb.forEach((v,i)=>sum[i]+=v);total+=K.mean(rgb);normalImage[y][x]=n.map(v=>Math.round((v+1)*127.5));}return sum.map(v=>Math.round(v/p.samples));}));
 const frames=[F('法線を色として見る','各成分を−1〜1から0〜255へ写しています。これは物体の材質の色ではありません。',plane(normalImage,'表面法線 RGB=(N+1)/2')),F('光と材質の規則を適用する','UVと内積、反射方向から、この画像の画素を実際に計算しています。',plane(image,'照明とテクスチャを適用した結果')),F('標本数と計算を分ける','1画素に複数点を置き、各点の色を平均します。多いほど計算量も増えます。',K.table(['画素数','画素内標本','球に当たった標本','光の方向'],[[1024,p.samples,hits,light.map(x=>q(x))]]))];
 return out(frames,{'球表面を評価した回数':hits,'標本数':p.samples,'球表面の平均値':q(hits?total/hits:0),'テクスチャ':p.texture});
});
function sub3(a,b){return a.map((v,i)=>v-b[i]);}
function dct2(a,inverse=false){const n=a.length,alpha=k=>k===0?Math.sqrt(1/n):Math.sqrt(2/n),c=(x,u)=>Math.cos(Math.PI*(2*x+1)*u/(2*n));return seq(n,y=>seq(n,x=>{let sum=0;for(let v=0;v<n;v++)for(let u=0;u<n;u++)sum+=inverse?alpha(u)*alpha(v)*a[v][u]*c(x,u)*c(y,v):alpha(x)*alpha(y)*a[v][u]*c(u,x)*c(v,y);return sum;}));}
K.dct2=dct2;
D(139,{
 title:'ベジェ曲線・姿勢の補間・画像と音と動画の圧縮',question:'途中を補う計算と、差や係数を残す圧縮はどう違う？',
 scope:'三次Bezierのde Casteljau法、2D角度の最短弧補間、8×8直交DCTと量子化、1次DPCM、16×16の整数画素ブロック照合を実行。JPEGや動画コンテナの完全な符号器ではありません。',
 controls:[s('mode','実験','bezier',['bezier','rotation','image','audio','video']),t('controlPoints','4つの制御点 x,y','0,0;1,3;3,-1;4,2'),r('u','途中の位置t',.5,0,1,.05),r('startAngle','開始角',350,0,355,5),r('endAngle','終了角',10,0,355,5),K.b('shortArc','角度を短い向きに補間',true),r('quantizer','量子化の幅',8,1,32),r('motion','動画内の移動画素',2,0,4)],
 alt:['2番目の制御点を下げる',{controlPoints:'0,0;1,-2;3,-1;4,2'}],
 intro:['曲線やアニメーションでは途中の値を計算します。圧縮では、元の値そのものより表現しやすい係数や差へ変換します。どちらも途中の計算を見ると意味が分かります。','Bezierは点どうしの線形補間を繰り返します。画像のDCTは周波数的な係数へ変え、音のDPCMや動画の予測は参照からの差を保存します。','4点から作る曲線のt=0.5を見ます。1回目、2回目、3回目の補間点が、最終的な曲線の一点になります。','モードを切り替え、変換と量子化、予測と残差を分けます。量子化の幅を増やしたとき、残す値の数と復元誤差がどう変わるか確認します。','小さな演算教材であり、圧縮率を実ファイルのサイズと同一視しません。角度の最短弧は2Dの例で、3D姿勢の一般的な補間では四元数などが必要です。'],
 topics:[['de Casteljau法','制御点の補間を繰り返して曲線上の点を求めます。'],['姿勢の補間','角度の周期性を考慮しない補間と比較します。'],['DCTと量子化','変換だけなら戻せますが、係数を丸めると誤差が生じます。'],['DPCM','復号側と同じ予測値からの差を符号化します。'],['動き補償','前の画像の似た場所を探し、残差を作ります。']],
 quiz:['DCTだけと、DCT係数の量子化の違いは？','係数を丸める量子化で情報が失われる','DCTの逆変換はどんな係数でも常に元画像を返す','DCTを計算すると画像の大きさが必ず変わる','変換と、情報を削る操作を区別してください。']
},p=>{
 if(p.mode==='bezier'){const a=K.readMatrix(p.controlPoints,4);if(a.length!==4||a.some(v=>v.length!==2))throw Error('制御点は4行、各行x,yの2値です。');const levels=[a];while(levels.at(-1).length>1){const last=levels.at(-1);levels.push(last.slice(0,-1).map((pt,i)=>mix(pt,last[i+1],p.u)));}const curve=seq(61,i=>{let row=a;const t=i/60;while(row.length>1)row=row.slice(0,-1).map((pt,j)=>mix(pt,row[j+1],t));return {x:row[0][0],y:row[0][1]};}),frames=levels.map((row,i)=>F(`補間の段階${i}`,'同じtを使って隣り合う点を補間します。tを動かすと全段階が同じ条件で変わります。',K.plot([{name:'曲線',points:curve},{name:'この段階の点',points:row.map(([x,y])=>({x,y}))}],{xLabel:'x',yLabel:'y'})));return out(frames,{'曲線上のx':q(levels.at(-1)[0][0]),'曲線上のy':q(levels.at(-1)[0][1]),'t':p.u});}
 if(p.mode==='rotation'){const raw=p.endAngle-p.startAngle,difference=p.shortArc?K.mod(raw+180,360)-180:raw,angle=p.startAngle+p.u*difference;return out([F('角度の周期性を確認する','350度と10度の差は、数値だけでは−340度ですが短い弧では+20度です。',K.plot([{name:'選んだ補間',points:seq(21,i=>({x:i/20,y:p.startAngle+i/20*difference}))},{name:'数値をそのまま補間',points:seq(21,i=>({x:i/20,y:p.startAngle+i/20*raw}))}],{xLabel:'t',yLabel:'展開した角度'}))],{'途中の角度':q(K.mod(angle,360)),'回転量':difference,'量子化設定':p.quantizer});}
 if(p.mode==='image'){const source=seq(8,y=>seq(8,x=>clamp(20+x*22+y*5+((x+y)%2?30:0),0,255))),centered=source.map(row=>row.map(x=>x-128)),coeff=dct2(centered),quantized=coeff.map((row,v)=>row.map((x,u)=>Math.round(x/(p.quantizer*(1+u+v))))),decoded=dct2(quantized.map((row,v)=>row.map((x,u)=>x*p.quantizer*(1+u+v))),true).map(row=>row.map(x=>clamp(x+128,0,255))),mse=K.mean(source.flatMap((row,y)=>row.map((v,x)=>(v-decoded[y][x])**2)));const frames=[F('画素を係数へ変換する','128を引いた8×8ブロックを直交DCTへ入れます。左上がDC成分です。',plane(source,'元の8×8画像')),F('係数を量子化する','係数の大きさと周波数位置に応じて丸めます。この段階で0になった係数があります。',K.matrix(quantized,{caption:'量子化したDCT係数'})),F('逆変換で復元する','量子化の幅を掛け直しても、丸める前の値そのものには戻りません。',plane(decoded,'復元した8×8画像'))];return out(frames,{'ゼロ係数数':quantized.flat().filter(x=>x===0).length,'平均二乗誤差':q(mse),'係数数':64});}
 if(p.mode==='audio'){const source=seq(48,i=>Math.round(90*Math.sin(tau*i/16)+20*Math.sin(tau*i/5))),residual=[],decoded=[];let previous=0;for(const x of source){const code=Math.round((x-previous)/p.quantizer);residual.push(code);previous+=code*p.quantizer;decoded.push(previous);}return out([F('復号器と同じ予測値を使う','前の復元値からの差を量子化します。元の前標本ではなく、復号側が知っている値を使います。',K.table(['n','元の値','差の符号','復元値'],source.map((v,i)=>[i,v,residual[i],decoded[i]]))),F('誤差を観察する','ここではファイル形式や可聴音の符号化全体ではなく、差分の予測と復元を調べます。',K.plot([{name:'元の標本',points:points(source)},{name:'DPCM復元',points:points(decoded)}],{xLabel:'標本',yLabel:'値'}))],{'最大復元誤差':Math.max(...source.map((v,i)=>Math.abs(v-decoded[i]))),'量子化幅':p.quantizer,'ゼロ差分数':residual.filter(x=>x===0).length});}
 const old=seq(16,y=>seq(16,x=>x>=3&&x<9&&y>=4&&y<10?190:20)),current=seq(16,y=>seq(16,x=>old[y]?.[x-p.motion]??20));let best={dx:0,dy:0,sad:Infinity};for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){let sad=0;for(let y=4;y<12;y++)for(let x=4;x<12;x++)sad+=Math.abs(current[y][x]-(old[y+dy]?.[x+dx]??20));if(sad<best.sad)best={dx,dy,sad};}const predicted=seq(16,y=>seq(16,x=>old[y+best.dy]?.[x+best.dx]??20)),residual=current.map((row,y)=>row.map((v,x)=>v-predicted[y][x])),restored=residual.map((row,y)=>row.map((v,x)=>clamp(predicted[y][x]+Math.round(v/p.quantizer)*p.quantizer,0,255)));
 return out([F('前の画像と今の画像を分ける','動きの探索は中央8×8のブロックで、前フレームの±4画素から探します。',plane(old,'参照フレーム')),F('参照する場所を探す','絶対差の和が最小になる移動を選びました。符号は現在の場所から参照元へ向かう向きです。',plane(current,'現在のフレーム')),F('予測との差を表す','残差0を灰色128に対応させた表示です。これは復元画像そのものではありません。',plane(residual.map(row=>row.map(v=>clamp(128+v,0,255))),'予測残差')),F('予測と量子化した残差で復元する','参照画像と動きだけでは足りない部分を、残差で補います。',plane(restored,'復元フレーム'))],{'参照元へのdx':best.dx,'参照元へのdy':best.dy,'探索ブロックのSAD':best.sad,'平均二乗誤差':q(K.mean(current.flatMap((row,y)=>row.map((v,x)=>(v-restored[y][x])**2))))});
});
})();
