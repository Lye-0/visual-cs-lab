/* Direct correspondence for three reviewed foundation lessons.
 * No storage, remote calls or simulated user progress. Reducers are atomic.
 * Hamming reception uses only received bits; the sender comparison is separate. */
(() => {
'use strict';
const X=CSL.experiences,V=X.foundationReview={};
const clone=X.clone;
const integer=(v,min,max,label='値')=>{if(!Number.isInteger(v)||v<min||v>max)throw Error(label+'は'+min+'〜'+max+'の整数です。');return v;};
const number=(v,min,max,label='値')=>{if(!Number.isFinite(v)||v<min||v>max)throw Error(label+'は'+min+'〜'+max+'の有限な数です。');return v;};
const begin=s=>{if(s.log.length>=100)throw Error('この例は100操作までです。最初から試してください。');return clone(s);};
const note=(s,text)=>{s.log.push(text);return s;};
const word=(bits,n)=>{if(!Array.isArray(bits)||bits.length!==n||bits.some(v=>v!==0&&v!==1))throw Error(n+'個の0または1で指定してください。');return bits;};
V.encode=message=>{
 const m=word(message,4),c=[0,0,m[0],0,m[1],m[2],m[3]];
 for(const mask of [1,2,4])c[mask-1]=c.reduce((sum,bit,i)=>(i+1)&mask?sum^bit:sum,0);
 return c;
};
V.receive=received=>{
 const bits=word(received,7);
 const checks=[1,2,4].map(mask=>{const positions=Array.from({length:7},(_,i)=>i+1).filter(p=>p&mask);return {mask,positions,values:positions.map(p=>bits[p-1]),parity:positions.reduce((n,p)=>n^bits[p-1],0)};});
 const syndrome=checks.reduce((n,c)=>n+c.mask*c.parity,0),candidate=bits.slice();if(syndrome)candidate[syndrome-1]^=1;
 return {checks,syndrome,candidate,message:[candidate[2],candidate[4],candidate[5],candidate[6]]};
};
V.hammingStart=()=>({message:[1,0,1,1],sent:null,channel:null,received:null,report:null,repaired:null,mask:1,log:[]});
V.hamming=(input,a)=>{
 const s=begin(input);
 if(a.kind==='message'){s.message[integer(a.index,0,3)]^=1;s.sent=s.channel=s.received=s.report=s.repaired=null;return note(s,'情報bitを変更。以前の送信・受信は消し、新しい情報から符号化し直します。');}
 if(a.kind==='encode'){s.sent=V.encode(s.message);s.channel=s.sent.slice();s.received=s.report=s.repaired=null;return note(s,'送信側で検査bitを作りました。通信路に7bitを置きましたが、受信側にはまだ届いていません。');}
 if(a.kind==='flip'){if(!s.channel)throw Error('先に符号化してください。');const i=integer(a.index,0,6);s.channel[i]^=1;return note(s,'通信路の位置'+(i+1)+'を反転。既に届けた受信列は変えていません。新しい状態を調べるには、もう一度届けてください。');}
 if(a.kind==='deliver'){if(!s.channel)throw Error('先に符号化してください。');s.received=s.channel.slice();s.report=s.repaired=null;return note(s,'通信路の今の7bitを受信側へ届けました。受信側に渡すのは、この7bitだけです。');}
 if(a.kind==='check'){integer(a.mask,1,4);if(![1,2,4].includes(a.mask))throw Error('検査1・2・4から選んでください。');s.mask=a.mask;return s;}
 if(a.kind==='inspect'){if(!s.received)throw Error('先に7bitを届けてください。');s.report=V.receive(s.received);s.repaired=null;return note(s,'受信した7bitだけで三つの偶数パリティを検査。反転した場所や送信前の正解は計算に使いません。');}
 if(a.kind==='correct'){if(!s.report)throw Error('先に受信列を検査してください。');s.repaired=s.report.candidate.slice();return note(s,s.report.syndrome?'高々1bit誤りという仮定で位置'+s.report.syndrome+'を反転しました。複数bit誤りでは、この操作が元へ戻す保証はありません。':'検査結果が全て0なので変更しません。「全て0」だけでは、任意個数の誤りがなかったとは保証できません。');}
 throw Error('未定義の符号操作です。');
};

V.integralStart=()=>({start:0,end:2,n:4,selected:1,log:[]});
V.integralView=s=>{
 const dx=(s.end-s.start)/s.n,cells=Array.from({length:s.n},(_,i)=>{const x0=s.start+i*dx,x1=s.start+(i+1)*dx,y0=x0*x0,y1=x1*x1;return {i,x0,x1,y0,y1,dx,average:(y0+y1)/2,contribution:dx*(y0+y1)/2};});
 const sum=cells.reduce((n,c)=>n+c.contribution,0),exact=(s.end**3-s.start**3)/3;
 return {cells,selected:cells[s.selected],sum,exact,error:sum-exact};
};
V.integral=(input,a)=>{
 const s=begin(input);
 if(a.kind==='select'){s.selected=integer(a.index,0,s.n-1);return s;}
 if(a.kind==='configure'){
  const start=number(a.start,-3,3,'始点'),end=number(a.end,-3,3,'終点'),n=integer(a.n,1,16,'分割数');
  Object.assign(s,{start,end,n,selected:Math.min(s.selected,n-1)});
  return note(s,'f(x)=x²は変えず、区間と分割を変更しました。各区間の項と、全体の和を同じ条件で計算しています。');
 }
 throw Error('未定義の積分操作です。');
};

V.knapsackStart=()=>({items:[{name:'A',weight:2,value:3},{name:'B',weight:3,value:4},{name:'C',weight:4,value:5},{name:'D',weight:5,value:8}],capacity:7,row:4,col:7,log:[]});
V.knapsackView=s=>{
 const dp=Array.from({length:s.items.length+1},()=>Array(s.capacity+1).fill(0));
 for(let i=1;i<dp.length;i++)for(let c=0;c<=s.capacity;c++){const item=s.items[i-1];dp[i][c]=Math.max(dp[i-1][c],item.weight<=c?dp[i-1][c-item.weight]+item.value:0);}
 const i=s.row,c=s.col,item=i?s.items[i-1]:null,skip=i?{row:i-1,col:c,value:dp[i-1][c]}:null;
 const take=item&&item.weight<=c?{row:i-1,col:c-item.weight,previous:dp[i-1][c-item.weight],added:item.value,value:dp[i-1][c-item.weight]+item.value}:null;
 const trace=[],bag=[];let remaining=s.capacity;
 for(let r=s.items.length;r>0;r--){const chosen=dp[r][remaining]!==dp[r-1][remaining],it=s.items[r-1];trace.push({row:r,col:remaining,value:dp[r][remaining],chosen,item:it.name,nextCol:chosen?remaining-it.weight:remaining});if(chosen){bag.unshift(it.name);remaining-=it.weight;}}
 return {dp,item,skip,take,value:dp[i][c],tie:!!take&&take.value===skip.value,trace,bag,optimum:dp.at(-1)[s.capacity]};
};
V.knapsack=(input,a)=>{
 const s=begin(input);
 if(a.kind==='select'){s.row=integer(a.row,0,s.items.length);s.col=integer(a.col,0,s.capacity);return s;}
 if(a.kind==='capacity'){s.capacity=integer(a.value,0,12,'容量');s.col=Math.min(s.col,s.capacity);return note(s,'容量を変更。品物の個数は変えず、表を計算し直しました。');}
 if(a.kind==='item'){
  const i=integer(a.index,0,s.items.length-1),weight=integer(a.weight,1,8,'重さ'),value=integer(a.value,0,12,'価値');Object.assign(s.items[i],{weight,value});
  return note(s,'品物'+s.items[i].name+'の条件を変更しました。全てのセルと参照元は同じ新しい条件から計算します。');
 }
 throw Error('未定義の動的計画法の操作です。');
};
})();
