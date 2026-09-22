/* Small teaching objects. No real accounts, files, sockets or executable
 * memory. Public test keys/coefficients must never protect real information. */
(() => {
'use strict';
const L=CSL,X=L.experiences,C=L.curriculum.cryptoTools,S=X.securityDesk={};
S.clone=X.clone;
S.int=(v,min,max,name='値')=>{if(!Number.isInteger(v)||v<min||v>max)throw Error(name+'は'+min+'〜'+max+'の整数です。');return v;};
S.choose=(v,choices,name='候補')=>{if(!choices.includes(v))throw Error(name+'から選び直してください。');return v;};
S.begin=input=>{if(input.log.length>=80)throw Error('この小例は80操作までです。最初から試してください。');return X.clone(input);};
S.note=(state,line)=>{state.log.push(line);return state;};

S.threatStart=()=>({checks:{login:true,owner:true,legacy:false,approval:true},log:[]});
S.threatPaths=()=>[
 {id:'api',title:'通常のAPI',steps:['利用者','APIで本人確認','文書の所有者確認','文書本文']},
 {id:'legacy',title:'以前の書出し口',steps:['利用者','旧サービスの所有者確認','文書本文']},
 {id:'approval',title:'申請の承認',steps:['利用者','APIで本人確認','承認者・申請者の確認','承認結果']}
];
S.threatView=s=>{
 const cases=[['guest','他人の文書',false],['owner','自分の文書',true],['member','他人の文書',false],['approver','他人の申請',true]];
 return cases.map(([actor,intent,needed])=>{
  const login=actor!=='guest',owns=actor==='owner',canApprove=actor==='approver';
  const api=(!s.checks.login||login)&&(!s.checks.owner||owns);
  const legacy=!s.checks.legacy||login&&owns;
  const approval=(!s.checks.login||login)&&(!s.checks.approval||canApprove);
  const wantsApproval=actor==='approver',actual=wantsApproval?approval:api||legacy;
  return {actor,intent,needed,api,legacy,approval,actual,correct:actual===needed};
 });
};
S.threat=(input,a)=>{const s=S.begin(input);if(a.kind!=='toggle'||!Object.hasOwn(s.checks,a.key))throw Error('図にある確認箇所を選んでください。');s.checks[a.key]=!s.checks[a.key];return S.note(s,a.key+'の確認を'+(s.checks[a.key]?'実施':'省略')+'。通常の利用も同じ条件で再検査しました。');};

S.aesStart=()=>({plain:'00112233445566778899aabbccddeeff',key:'000102030405060708090a0b0c0d0e0f',step:2,cell:0,log:[]});
S.aesView=s=>{
 const result=C.aes128(C.bytes(s.plain,16),C.bytes(s.key,16),true),step=result.trace[s.step],previous=result.trace[Math.max(0,s.step-1)],row=s.cell%4,col=Math.floor(s.cell/4);
 let sources=[s.cell],explanation='',terms=[];
 if(step.operation==='入力')explanation='入力のbyte '+s.cell+' は row '+row+'、column '+col+' に置きます。入力の並びは列ごとです。';
 if(step.operation==='SubBytes'){const value=previous.state[s.cell];explanation='この場所の '+C.hex([value])+' をS-boxの '+(value>>4).toString(16)+'行 '+(value&15).toString(16)+'列で置換します。場所は変わりません。';terms=[['入力',C.hex([value])],['S-boxの結果',C.hex([C.sbox[value]])]];}
 if(step.operation==='ShiftRows'){sources=[((col+row)%4)*4+row];explanation='row '+row+'を左へ'+row+'個ずらします。出力('+row+','+col+')は入力('+row+','+((col+row)%4)+')から来ます。byteの値ではなく場所を変えます。';}
 if(step.operation==='MixColumns'){
  sources=[0,1,2,3].map(r=>col*4+r);
  const factors=[0,1,2,3].map(r=>{const d=(r-row+4)%4;return d===0?2:d===1?3:1;});
  terms=sources.map((index,r)=>[C.hex([factors[r]])+' × '+C.hex([previous.state[index]]),C.hex([C.gfMul(factors[r],previous.state[index])])]);
  explanation='同じ列の4byteを有限体上で掛け、XORします。通常の整数加算の繰上がりとは違います。4つの項をXORすると '+C.hex([step.state[s.cell]])+' です。';
 }
 if(step.operation==='AddRoundKey'){explanation='同じ場所の状態byteと、このroundの鍵byteをXORします。平文と鍵は別の入力です。';terms=[['変更前',C.hex([previous.state[s.cell]])],['round key',C.hex([step.key[s.cell]])],['XOR後',C.hex([step.state[s.cell]])]];}
 return {trace:result.trace,step,previous,sources,explanation,terms,cipher:C.hex(result.bytes)};
};
S.aes=(input,a)=>{
 const s=S.begin(input);
 if(a.kind==='step')s.step=S.int(a.value,0,40,'処理番号');
 else if(a.kind==='cell')s.cell=S.int(a.value,0,15,'byte番号');
 else if(a.kind==='flip'){const p=C.bytes(s.plain,16);p[s.cell]^=1;s.plain=C.hex(p);}
 else throw Error('処理またはbyteを選んでください。');
 return S.note(s,a.kind==='flip'?'選んだ入力byteの最下位1bitだけを変更しました。鍵は同じです。':'選んだ処理とbyteの対応を表示します。');
};

const mod=x=>(x%17+17)%17;
S.shareStart=()=>({secret:7,a:5,b:3,selected:[],log:[]});
S.sharePoints=s=>Array.from({length:5},(_,i)=>({x:i+1,y:mod(s.secret+s.a*(i+1)+s.b*(i+1)**2)}));
S.shareView=s=>{
 const observed=S.sharePoints(s).filter(p=>s.selected.includes(p.x)),counts=Array(17).fill(0),examples=[];
 // Enumerate degrees <=2, including zero coefficients: excluding them would
 // incorrectly bias the distribution and lose perfect threshold secrecy.
 for(let secret=0;secret<17;secret++)for(let a=0;a<17;a++)for(let b=0;b<17;b++)if(observed.every(p=>mod(secret+a*p.x+b*p.x*p.x)===p.y)){counts[secret]++;if(!examples.some(e=>e.secret===secret))examples.push({secret,a,b});}
 return {observed,counts,examples,candidates:counts.map((n,i)=>n?i:null).filter(x=>x!==null),polynomials:counts.reduce((a,b)=>a+b,0)};
};
S.share=(input,a)=>{const s=S.begin(input);if(a.kind==='toggle'){const x=S.int(a.x,1,5,'共有片');s.selected=s.selected.includes(x)?s.selected.filter(i=>i!==x):s.selected.concat(x);}else if(a.kind==='secret'){s.secret=S.int(a.value,0,16,'教材の秘密');s.selected=[];}else throw Error('共有片を選んでください。');return S.note(s,'集めた共有片 '+s.selected.length+'個。受信側の候補は、集めた点だけから全て計算します。');};

S.policyStart=()=>({actor:'aki',object:'aki',operation:'read',hour:12,mode:'owner',log:[]});
S.policyView=s=>{
 const logged=s.actor!=='guest',owns=s.actor===s.object,roles={aki:['writer'],haru:['approver'],guest:[]},hasApproval=roles[s.actor].includes('approver');
 const checks=s.mode==='owner'?[['本人確認済み',logged],['文書の所有者',owns],['読取りまたは更新',s.operation==='read'||s.operation==='write']]:[
 ['本人確認済み',logged],['承認者の役割',hasApproval],['承認操作を要求',s.operation==='approve'],['自分の申請ではない',!owns],['業務時間 9時以上18時未満',s.hour>=9&&s.hour<18]
 ];
 return {checks,roles:roles[s.actor],allowed:checks.every(x=>x[1])};
};
S.policy=(input,a)=>{const s=S.begin(input);if(a.kind!=='set')throw Error('要求を組み立ててください。');s.actor=S.choose(a.actor,['aki','haru','guest']);s.object=S.choose(a.object,['aki','haru']);s.operation=S.choose(a.operation,['read','write','approve']);s.mode=S.choose(a.mode,['owner','approval']);s.hour=S.int(a.hour,0,23,'時刻');return S.note(s,'主体・対象・操作・環境を別々に照合しました。');};

S.memoryStart=()=>({memory:[0,0,0,0,165,165,64,64],bounds:true,canary:true,nx:true,alive:true,generation:1,handle:1,last:null,log:[]});
S.memory=(input,a)=>{
 const s=S.begin(input);
 if(a.kind==='toggle'){S.choose(a.key,['bounds','canary','nx']);s[a.key]=!s[a.key];return S.note(s,a.key+'だけを変更。既に書き換えられたbyteは元に戻りません。');}
 if(a.kind==='free'){if(!s.alive)throw Error('既に解放しています。');s.alive=false;s.last='解放。旧ハンドルは無効です。';}
 else if(a.kind==='allocate'){if(s.alive)throw Error('先に解放してください。');s.alive=true;s.generation++;s.memory=[9,9,9,9,165,165,64,64];s.last='同じ番地へ新しい割当。旧ハンドルの世代は更新していません。';}
 else if(a.kind==='read'){s.last=!s.alive?'割当が無効なので拒否':s.bounds&&s.handle!==s.generation?'世代が違う古い参照を拒否':'旧ハンドルで読んだ値：'+s.memory[0];}
 else if(a.kind==='write'){
  const count=S.int(a.count,1,8,'byte数');
  if(!s.alive||s.bounds&&(s.handle!==s.generation||count>4))s.last='書込み前に拒否。byteを一つも変更していません。';
  else{for(let i=0;i<count;i++)s.memory[i]=65;s.last=count+'byteを書きました。境界検査なしなら隣も変わります。';}
 }else if(a.kind==='return'){s.last=s.canary&&s.memory.slice(4,6).some(x=>x!==165)?'canaryの不一致を検出して停止':'canaryでは停止しない。範囲外のバグがないと保証したわけではありません。';}
 else if(a.kind==='execute')s.last=s.nx?'NX：データ領域の実行を拒否。byteの破損は直していません。':'この模型では実行権限を許可。実コードは実行しません。';
 else throw Error('未定義の仮想メモリ操作です。');
 return S.note(s,s.last);
};
})();
