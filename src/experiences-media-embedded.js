/* Virtual electronics and plants only. No hardware API or wall-clock timer. */
(() => {
'use strict';
const M=CSL.experiences.mediaDesk,{integer:int,number:num,choice,begin,note,range}=M;
M.pinsStart=()=>({direction:240,output:165,external:15,compare:3,counter:0,log:[]});
M.pinsView=s=>({pin:(s.output&s.direction)|(s.external&(~s.direction&255)),wave:range(10,i=>Number(i<s.compare)),duty:Math.min(s.compare,10)/10});
M.pins=(input,a)=>{
 const s=begin(input);
 if(a.kind==='bit'){const key=choice(a.key,['direction','output','external']),bit=int(a.bit,0,7);s[key]^=1<<bit;return note(s,key+'のbit'+bit+'だけを切り替えました。PINは方向に従って参照元を選びます。');}
 if(a.kind==='compare'){s.compare=int(a.value,0,10,'比較値');return note(s,'0〜9のカウンタが比較値未満の間だけHigh。実機の更新バッファは省略した静的比較です。');}
 if(a.kind==='tick'){s.counter=(s.counter+1)%10;return note(s,'カウンタ '+s.counter+'、出力 '+Number(s.counter<s.compare)+'。平均と同じ電圧を常時出しているわけではありません。');}
 throw Error('未定義のピン操作です。');
};
M.sensorStart=()=>({temperature:25,bias:.05,gain:1,bits:10,references:{},calibrated:false,log:[]});
M.sensorCode=(s,temp)=>{const voltage=.5+s.gain*.01*temp+s.bias,top=2**s.bits-1,code=Math.round(Math.max(0,Math.min(3.3,voltage))/3.3*top);return {voltage,code,clipped:voltage<0||voltage>3.3};};
M.sensorView=s=>{
 const value=M.sensorCode(s,s.temperature),back=value.code/(2**s.bits-1)*3.3,naive=(back-.5)/.01;
 const lo=s.references[0],hi=s.references[50],estimate=s.calibrated?50*(value.code-lo)/(hi-lo):naive;
 return {...value,back,naive,estimate,error:estimate-s.temperature};
};
M.sensor=(input,a)=>{
 const s=begin(input);
 if(a.kind==='temperature'){s.temperature=num(a.value,-10,80,'真の温度');return note(s,'測る対象だけを変更。既に取得した基準点を保持します。');}
 if(a.kind==='hardware'){s.bias=num(a.bias,-.1,.1,'ずれV');s.gain=num(a.gain,.8,1.2,'感度倍率');s.bits=int(a.bits,4,12,'ADC bit数');s.references={};s.calibrated=false;return note(s,'測定器の特性が変わったため、以前の基準点を無効にしました。');}
 if(a.kind==='reference'){const t=choice(a.temperature,[0,50]);s.references[t]=M.sensorCode(s,t).code;s.calibrated=false;return note(s,'既知の'+t+'℃でADCコード'+s.references[t]+'を取得。校正式はまだ適用していません。');}
 if(a.kind==='calibrate'){if(s.references[0]===undefined||s.references[50]===undefined||s.references[0]===s.references[50])throw Error('異なるコードの基準点を二つ取得してください。');s.calibrated=true;return note(s,'二つの基準点を通る直線で温度へ読み替えます。ADCの丸め誤差は残ります。');}
 throw Error('未定義のセンサー操作です。');
};
M.controlStart=()=>({time:0,target:1,plants:[{x:0,v:0,I:0,guard:false},{x:0,v:0,I:0,guard:true}],history:[],log:[]});
M.plantStep=(plant,target,dt=.05)=>{
 const next={...plant},error=target-plant.x,candidate=plant.I+error*dt,trial=2*error+candidate-.5*plant.v;
 const blocked=plant.guard&&((trial>.6&&error>0)||(trial<-.6&&error<0));
 next.I=blocked?plant.I:candidate;
 const P=2*error,I=next.I,D=-.5*plant.v,raw=P+I+D,u=Math.max(-.6,Math.min(.6,raw));
 const f=([x,v])=>[v,u-.5*v-.25*x],state=[plant.x,plant.v],a=f(state),b=f(state.map((v,i)=>v+dt*a[i]/2)),c=f(state.map((v,i)=>v+dt*b[i]/2)),d=f(state.map((v,i)=>v+dt*c[i]));
 [next.x,next.v]=state.map((v,i)=>v+dt/6*(a[i]+2*b[i]+2*c[i]+d[i]));
 next.last={beforeX:plant.x,beforeV:plant.v,error,candidate,trial,blocked,P,I,D,raw,u,acceleration:u-.5*plant.v-.25*plant.x};return next;
};
M.control=(input,a)=>{
 const s=begin(input);
 if(a.kind==='target'){s.target=num(a.value,-1,1,'目標');return note(s,'目標だけを変更。位置・速度・積分状態はそのままです。');}
 if(a.kind==='kick'){const delta=num(a.delta,-1,1,'速度の追加');s.plants.forEach(p=>p.v+=delta);return note(s,'両方の対象へ同じ速度変化を加えました。制御器の積分は消していません。');}
 if(a.kind==='advance'){
  const count=choice(a.count,[1,10]);if(s.history.length+count>200)throw Error('10秒までの比較です。最初から試してください。');
  for(let n=0;n<count;n++){s.plants=s.plants.map(p=>M.plantStep(p,s.target));s.time=(s.history.length+1)*.05;s.history.push({time:s.time,target:s.target,plants:s.plants.map(p=>({...p,last:{...p.last}}))});}
  return note(s,count+'刻み進めました。位置の変化は実際に加えたuから計算。積分を止めた理由はtrialと誤差で確認します。');
 }
 throw Error('未定義の制御操作です。');
};
M.deadlineStart=(method='RM')=>({method:choice(method,['RM','EDF']),time:0,jobs:[],timeline:[],log:[]});
const tasks=[{name:'A',cost:2,period:5},{name:'B',cost:4,period:7}];
const arrivals=(jobs,time)=>{for(const t of tasks)if(time%t.period===0&&!jobs.some(j=>j.id===t.name+'@'+time))jobs.push({...t,id:t.name+'@'+time,release:time,deadline:time+t.period,left:t.cost,finish:null});};
M.deadlineView=s=>{
 const jobs=s.jobs.map(j=>({...j}));if(s.time<20)arrivals(jobs,s.time);
 const ready=jobs.filter(j=>j.left>0).sort((a,b)=>(s.method==='RM'?a.period-b.period:a.deadline-b.deadline)||a.release-b.release||a.name.localeCompare(b.name));
 return {jobs,ready,missed:jobs.filter(j=>j.deadline<=s.time&&(j.left>0||j.finish>j.deadline))};
};
M.deadline=(input,a)=>{
 if(a.kind==='method')return M.deadlineStart(a.value);
 const s=begin(input);if(a.kind!=='run')throw Error('次に実行する仕事を選んでください。');if(s.time>=20)throw Error('20tickの実験が終了しています。');
 const {jobs,ready}=M.deadlineView(s),chosen=ready[0];
 if(a.id!==(chosen?.id||'idle'))throw Error(s.method==='RM'?'待機中で周期が最も短い仕事を選びます。':'待機中で絶対締切が最も早い仕事を選びます。');
 s.jobs=jobs;if(chosen){const j=s.jobs.find(j=>j.id===chosen.id);j.left--;if(j.left===0)j.finish=s.time+1;}
 s.timeline.push(chosen?.id||'idle');s.time++;
 return note(s,s.time+'tickまで完了。締切と同時に完了した仕事は間に合っています。待機の条件は次の時刻で見直します。');
};
})();