/* Independent, bounded signal/image experiments. No timer, storage or I/O. */
(() => {
'use strict';
const X=CSL.experiences,K=CSL.curriculum,M=X.mediaDesk={};
M.clone=X.clone;
M.number=(v,min,max,label='値')=>{if(!Number.isFinite(v)||v<min||v>max)throw Error(label+'は'+min+'〜'+max+'の有限な数です。');return v;};
M.integer=(v,min,max,label='番号')=>{M.number(v,min,max,label);if(!Number.isInteger(v))throw Error(label+'は整数です。');return v;};
M.choice=(v,choices)=>{if(!choices.includes(v))throw Error('対象を選び直してください。');return v;};
M.begin=s=>{if(s.log.length>=160)throw Error('この小例は160操作までです。最初から試してください。');return M.clone(s);};
M.note=(s,message)=>{s.log.push(message);return s;};
M.range=(n,f)=>Array.from({length:n},(_,i)=>f(i));
const {integer:int,number:num,choice,begin,note,range}=M,tau=2*Math.PI;
M.fourierStart=()=>({input:range(16,i=>.5+Math.cos(tau*2*i/16)+.5*Math.sin(tau*3*i/16)),keep:range(9,i=>i),sample:2,phaseZero:false,log:[]});
M.fourierView=s=>{
 const coefficients=K.fft(s.input),n=s.input.length;
 const selected=coefficients.map((z,k)=>s.keep.includes(Math.min(k,n-k))?(s.phaseZero?[Math.hypot(...z),0]:z.slice()):[0,0]);
 const back=K.fft(selected,true).map(z=>z[0]);
 const terms=range(n,k=>{const angle=tau*k*s.sample/n,z=selected[k];return {k,re:z[0],im:z[1],cos:Math.cos(angle),sin:Math.sin(angle),value:(z[0]*Math.cos(angle)-z[1]*Math.sin(angle))/n};});
 return {coefficients,selected,back,terms,error:Math.max(...back.map((v,i)=>Math.abs(v-s.input[i])))};
};
M.fourier=(input,a)=>{
 const s=begin(input);
 if(a.kind==='pair'){const k=int(a.k,0,8);s.keep=s.keep.includes(k)?s.keep.filter(v=>v!==k):[...s.keep,k].sort((a,b)=>a-b);return note(s,'周波数の組 '+k+' を'+(s.keep.includes(k)?'戻しました。':'外しました。')+'実数信号なのでkと16−kを組にします。0と8は単独です。');}
 if(a.kind==='sample'){s.sample=int(a.index,0,15);return s;}
 if(a.kind==='phase'){s.phaseZero=!s.phaseZero;return note(s,s.phaseZero?'残した係数の大きさを保ち、位相を0へ変更しました。':'元の実部・虚部を使う状態へ戻しました。');}
 throw Error('未定義の周波数操作です。');
};
M.filterStart=()=>({input:[1,0,0,0,0,0,0,0],sample:2,feedback:0,taps:[.25,.5,.25],log:[]});
M.filterView=s=>{
 const output=K.filterSignal(s.input,s.taps,[1,-s.feedback]),n=s.sample;
 const terms=s.taps.map((weight,k)=>({name:'b'+k+' × x['+(n-k)+']',index:n-k,value:s.input[n-k]??0,weight,product:weight*(s.input[n-k]??0),source:'入力'}));
 terms.push({name:'帰還係数 × y['+(n-1)+']',index:n-1,value:output[n-1]??0,weight:s.feedback,product:s.feedback*(output[n-1]??0),source:'出力'});
 return {output,terms};
};
M.filter=(input,a)=>{
 const s=begin(input);
 if(a.kind==='sample'){s.sample=int(a.index,0,7);return s;}
 if(a.kind==='input'){s.input[int(a.index,0,7)]=num(a.value,-2,2,'入力値');return note(s,'入力を変更し、先頭から出力を計算し直しました。');}
 if(a.kind==='feedback'){s.feedback=choice(a.value,[0,.6,1.1]);return note(s,'帰還係数 '+s.feedback+'。初期状態0から同じ入力を計算します。');}
 throw Error('未定義のフィルター操作です。');
};
M.samplingStart=()=>({rate:8,bits:3,sample:1,log:[]});
M.samplingView=s=>{
 const levels=2**s.bits,step=2/(levels-1),samples=range(s.rate,i=>{
  const time=i/s.rate,one=Math.cos(tau*time),seven=Math.cos(tau*7*time),code=Math.max(0,Math.min(levels-1,Math.round((one+1)/step)));
  return {i,time,one,seven,code,saved:code*step-1};
 });
 return {levels,step,samples,same:samples.every(p=>Math.abs(p.one-p.seven)<1e-10)};
};
M.sampling=(input,a)=>{
 const s=begin(input);
 if(a.kind==='rate'){s.rate=choice(a.value,[8,12,20]);s.sample=Math.min(s.sample,s.rate-1);return note(s,'記録する時刻だけを変更。量子化段階数は '+2**s.bits+' のままです。');}
 if(a.kind==='bits'){s.bits=choice(a.value,[2,3,8]);return note(s,'値の段階だけを変更。標本の時刻は変えていません。');}
 if(a.kind==='sample'){s.sample=int(a.index,0,s.rate-1);return s;}
 throw Error('未定義の標本操作です。');
};
M.imageStart=()=>({pixels:range(64,i=>Math.floor(i/8)>=2&&Math.floor(i/8)<=5&&i%8>=2&&i%8<=5?200:40),cell:27,threshold:128,operation:'threshold',bin:null,log:[]});
M.imageView=s=>{
 const binary=s.pixels.map(v=>Number(v>=s.threshold)),neighbors=index=>{
  const x=index%8,y=Math.floor(index/8);return range(9,k=>{const xx=x+k%3-1,yy=y+Math.floor(k/3)-1,inside=xx>=0&&xx<8&&yy>=0&&yy<8,index=inside?yy*8+xx:null;return {x:xx,y:yy,index,binary:inside?binary[index]:0};});
 };
 const output=binary.map((v,i)=>s.operation==='threshold'?v:s.operation==='dilate'?Math.max(...neighbors(i).map(p=>p.binary)):Math.min(...neighbors(i).map(p=>p.binary)));
 return {binary,output,neighbors:neighbors(s.cell),histogram:range(8,b=>s.pixels.filter(v=>Math.floor(v/32)===b).length),matching:s.bin===null?[]:range(64,i=>i).filter(i=>Math.floor(s.pixels[i]/32)===s.bin)};
};
M.image=(input,a)=>{
 const s=begin(input);
 if(a.kind==='cell'){s.cell=int(a.index,0,63);return s;}
 if(a.kind==='edit'){s.pixels[s.cell]=int(a.value,0,255,'画素値');return note(s,'選んだ元画素だけを変更。出力と度数分布を同じ画像から再計算します。');}
 if(a.kind==='operation'){s.operation=choice(a.value,['threshold','dilate','erode']);return note(s,'毎回、元画像の二値化結果へ一回の処理を適用します。');}
 if(a.kind==='threshold'){s.threshold=int(a.value,0,255,'しきい値');return note(s,'元の値は変えず、値 ≥ しきい値 の条件を変更しました。');}
 if(a.kind==='bin'){s.bin=int(a.index,0,7);return s;}
 throw Error('未定義の画素操作です。');
};
})();