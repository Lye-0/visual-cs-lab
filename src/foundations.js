(() => {
'use strict';
const L=CSL,{register:R,frame:F,result:out,clone,parseNumbers,bits,round,rng,clamp,modPow}=L;
R('binary',(p,lab)=>{
 if(lab.variant==='float'){
  let f=new Float32Array([p.value]),u=new Uint32Array(f.buffer)[0],b=bits(u,32),ex=(u>>>23)&255,m=u&0x7fffff;
  return out([F('32ビットの浮動小数点に変換','JavaScriptのNumberからIEEE 754 binary32へ丸めます。符号1ビット、指数8ビット、仮数部23ビットです。',{type:'bitrow',bits:b,segments:[1,9],split:9,labels:['符号＋指数','仮数部']},{'保存された値':f[0]}),F('表現できる値との差を見る','10進数の小数を2進数の有限桁で正確に表現できないことがあります。丸めによって値に小さな差が生じます。',{type:'cells',rows:[{label:'符号',values:[b[0]]},{label:'指数フィールド',values:[ex]},{label:'仮数フィールド',values:[m]},{label:'binary32の値',values:[f[0]]}]},{'入力との差':f[0]-p.value})],{'入力':p.value,'binary32':f[0],'絶対誤差':Math.abs(f[0]-p.value)});
 }
 const width=p.width,mask=2**width,value=((Math.floor(p.value)%mask)+mask)%mask,signed=value>=mask/2?value-mask:value;
 const b=value.toString(2).padStart(width,'0'),rows=[...b].map((x,i)=>({label:`bit ${width-1-i}`,values:[x,2**(width-1-i),+x*2**(width-1-i)]}));
 return out([F('0と1の位置に重みがある','右端から1、2、4、8…の重みが付いています。ビットを押すか値を変え、合計を確かめてください。',{type:'bitrow',bits:b,interactive:'value'},{'符号なし':value,'16進':value.toString(16).toUpperCase()}),F('同じビット列を別の規則で読む','2の補数では最上位ビットの重みを負にします。ビット列が同じでも、符号の規則によって読み方が変わります。',{type:'bitrow',bits:b,interactive:'value',split:1,labels:['符号の重み','残りの重み']},{'符号なし':value,'符号付き':signed})],{'ビット数':width,'符号なし':value,'2の補数':signed,'16進':'0x'+value.toString(16).toUpperCase()});
});
R('encoding',(p,lab)=>{
 if(lab.variant==='hamming'){
  let s=String(p.text).replace(/[^01]/g,'').padEnd(4,'0').slice(0,4),a=[0,0,0,+s[0],0,+s[1],+s[2],+s[3]];a[1]=a[3]^a[5]^a[7];a[2]=a[3]^a[6]^a[7];a[4]=a[5]^a[6]^a[7];let encoded=a.slice(1).join('');if(p.flip>0)a[p.flip]^=1;let syndrome=(a[1]^a[3]^a[5]^a[7])+2*(a[2]^a[3]^a[6]^a[7])+4*(a[4]^a[5]^a[6]^a[7]);
  let received=a.slice(1).join('');if(syndrome)a[syndrome]^=1;
  return out([F('Hamming(7,4)を作る','4ビットに3ビットの偶数パリティを追加します。位置1、2、4が検査用です。',{type:'bitrow',bits:encoded},{'入力':s}),F('シンドロームを計算','1ビット誤りに限定すると、検査結果は誤りの位置を示します。2ビット以上は正しく訂正できるとは限りません。',{type:'bitrow',bits:received,active:p.flip-1},{'シンドローム':syndrome}),F('1ビットを訂正','位置は1始まりです。誤りがなければ変更しません。',{type:'bitrow',bits:a.slice(1).join(''),active:syndrome-1},{'復元データ':[a[3],a[5],a[6],a[7]].join('')})],{'送信列':encoded,'誤り位置':syndrome||'なし','復元':[a[3],a[5],a[6],a[7]].join('')});
 }
 const chars=[...p.text],bytes=new TextEncoder().encode(p.text);const rows=chars.map(c=>[c,'U+'+c.codePointAt(0).toString(16).toUpperCase(),[...new TextEncoder().encode(c)].map(b=>b.toString(16).padStart(2,'0')).join(' ')]);
 return out([F('文字とバイトを区別する','UnicodeのコードポイントとUTF-8のバイト列は別のものです。絵文字の見た目1文字が複数のコードポイントになることもあります。',{type:'cells',rows:rows.map(r=>({label:r[0],values:r.slice(1)}))},{'コードポイント':chars.length,'UTF-8':`${bytes.length} B`})],{'コードポイント':chars.length,'UTF-16コード単位':p.text.length,'UTF-8バイト数':bytes.length});
});
R('huffman',(p)=>{
 let freq={};for(const c of [...p.text].slice(0,120))freq[c]=(freq[c]||0)+1;if(!Object.keys(freq).length)throw Error('文字列を入力してください。');let queue=Object.entries(freq).map(([char,n])=>({char,n})),frames=[];const codes={};
 while(queue.length>1){queue.sort((a,b)=>a.n-b.n);let a=queue.shift(),b=queue.shift();queue.push({n:a.n+b.n,left:a,right:b});frames.push(F('頻度の小さい2つを結合','出現頻度の小さい記号から木を構成します。復号のために木や符号表を共有するコストは別に必要です。',{type:'bars',values:queue.map(x=>x.n),labels:queue.map(x=>x.char||'結合')}));}
 function walk(n,s){if(n.char!==undefined)codes[n.char]=s||'0';else{walk(n.left,s+'0');walk(n.right,s+'1');}}walk(queue[0],'');
 const text=[...p.text].slice(0,120),encoded=text.map(c=>codes[c]).join(''),entropy=Object.values(freq).reduce((sum,n)=>sum-(n/text.length)*Math.log2(n/text.length),0);
 frames.push(F('頻度に応じた符号ができる','頻出する記号に短いビット列を割り当てます。UTF-8との比較は符号表の保存コストを除く参考値です。',{type:'cells',rows:Object.entries(codes).map(([k,v])=>({label:k,values:[freq[k]+'回',v]}))}));
 return out(frames,{'符号化部分':`${encoded.length} bit`,'UTF-8':`${new TextEncoder().encode(text.join('')).length*8} bit`,'エントロピー':`${round(entropy,3)} bit/記号`});
});
R('logic',(p,lab)=>{
 const gates={AND:(a,b)=>a&&b,OR:(a,b)=>a||b,XOR:(a,b)=>a!==b,NAND:(a,b)=>!(a&&b),NOR:(a,b)=>!(a||b),NOT:a=>!a};
 if(lab.variant==='adder'){
  let a=+p.a,b=+p.b,ci=+p.carry,sum=a^b^ci,carry=(a&b)|(ci&(a^b));
  return out([F('XORで和の下位ビットを作る','1が奇数個なら和の下位ビットは1になります。',{type:'flow',nodes:[`${a} ⊕ ${b}`,`⊕ ${ci}`,`SUM = ${sum}`],active:2}),F('桁上がりを計算','入力3つのうち2つ以上が1なら、上位の桁へ1を送ります。',{type:'cells',rows:[{label:'A + B + Cin',values:[a,b,ci]},{label:'Cout / Sum',values:[carry,sum]}]})],{'合計':a+b+ci,'SUM':sum,'CARRY':carry});
 }
 const value=+gates[p.gate](p.a,p.b),rows=[[0,0],[0,1],[1,0],[1,1]].map(([a,b])=>[a,b,+gates[p.gate](!!a,!!b)]);
 return out([F('入力を論理ゲートに通す','数値の大小ではなく、真と偽の組み合わせで結果が決まります。入力スイッチを切り替えて確かめます。',{type:'gate',gate:p.gate,a:+p.a,b:+p.b,output:value},{'出力':value},{headers:['A','B','出力'],rows})],{'A':+p.a,'B':+p.b,'出力':value});
});
R('automaton',(p)=>{
 let input=String(p.input).replace(/[^01]/g,'').slice(0,24),state=0,frames=[F('開始状態 q0','1の個数が偶数のとき受理する有限オートマトンです。空文字も受理します。',{type:'automaton',state:0,input,index:-1})];
 [...input].forEach((c,i)=>{if(c==='1')state=1-state;frames.push(F(`「${c}」を読む`,c==='1'?'1を読むと偶数・奇数の状態が切り替わります。':'0を読んでも1の個数は変わりません。',{type:'automaton',state,input,index:i},{'状態':'q'+state,'受理状態':state===0?'はい':'いいえ'}));});
 return out(frames,{'入力長':input.length,'1の個数':[...input].filter(c=>c==='1').length,'受理':state===0?'はい':'いいえ'});
});
R('sets',(p)=>{
 let a=new Set(p.a.split(',').map(x=>x.trim()).filter(Boolean)),b=new Set(p.b.split(',').map(x=>x.trim()).filter(Boolean)),v=p.op==='union'?[...new Set([...a,...b])]:p.op==='intersection'?[...a].filter(x=>b.has(x)):[...a].filter(x=>!b.has(x));
 return out([F('集合を作る','集合では同じ要素を重複して数えません。順番は本質ではありません。',{type:'zones',zones:[{name:'A',items:[...a]},{name:'B',items:[...b]}]}),F('集合演算の結果',p.op==='union'?'AまたはBに含まれる要素です。':p.op==='intersection'?'AとBの両方に含まれる要素です。':'Aに含まれ、Bには含まれない要素です。',{type:'cells',rows:[{label:'結果',values:v.length?v:['∅']}]} )],{'|A|':a.size,'|B|':b.size,'結果の要素数':v.length});
});
R('matrix',(p)=>{
 const a=p.a,b=p.b,c=p.c,d=p.d,orig=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1},{x:0,y:0}],trans=orig.map(v=>({x:a*v.x+b*v.y,y:c*v.x+d*v.y}));
 return out([F('2つの基底ベクトルを置く','横方向(1,0)と縦方向(0,1)が、座標の基準になります。',{type:'plane',original:orig,transformed:orig,matrix:[[1,0],[0,1]]}),F('行列で座標を変換する','行列の第1列は横方向の基底、第2列は縦方向の基底の行き先です。頂点だけでなく空間全体が変換されます。',{type:'plane',original:orig,transformed:trans,matrix:[[a,b],[c,d]]},{'行列式':round(a*d-b*c)})],{'行列式':round(a*d-b*c),'面積倍率':Math.abs(round(a*d-b*c)),'逆行列':a*d-b*c===0?'存在しない':'存在する'});
});
R('calculus',(p,lab)=>{
 const f=x=>x*x,points=Array.from({length:81},(_,i)=>({x:-3+i*6/80,y:f(-3+i*6/80)}));
 if(lab.variant==='integral'){
 const n=p.n,h=(p.end-p.start)/n,frames=[],rects=[];let sum=0;for(let i=0;i<n;i++){let x=p.start+i*h,area=(f(x)+f(x+h))/2*h;sum+=area;rects.push({x,y:f(x),x2:x+h,y2:f(x+h)});frames.push(F(`区間 ${i+1} を台形で近似`,'小さな区間に分け、両端の関数値から台形の面積を足します。刻み幅を変えて誤差を比較してください。',{type:'plot',series:[{name:'f(x)=x²',points}],rects:clone(rects),xLabel:'x',yLabel:'f(x)'},{'部分和':round(sum,5)}));}
 let exact=(p.end**3-p.start**3)/3;return out(frames,{'近似積分':round(sum,5),'解析的な値':round(exact,5),'絶対誤差':round(Math.abs(sum-exact),7)});
 }
 const x=p.x,h=p.h,approx=(f(x+h)-f(x))/h,deriv=2*x;
 return out([F('2点を通る直線を引く','差分の比 (f(x+h)−f(x))/h は割線の傾きです。hを小さくすると、この関数では接線の傾きへ近づきます。',{type:'plot',series:[{name:'x²',points},{name:'割線',points:[{x:x-1,y:f(x)-approx},{x:x+1,y:f(x)+approx}]}],xLabel:'x',yLabel:'y'},{'差分近似':round(approx,6),'厳密な微分 2x':deriv})],{'h':h,'近似傾き':round(approx,6),'微分値':deriv,'差':round(Math.abs(approx-deriv),6)});
});
R('probability',(p,lab)=>{
 if(lab.variant==='bayes'){
 let total=10000,pos=total*p.base/100,tp=pos*p.sensitivity/100,fp=(total-pos)*p.falsePositive/100,precision=tp+fp?tp/(tp+fp):0;
 return out([F('母集団を分ける','陽性反応のうち本当に対象である割合は、感度だけでは決まりません。対象がもともとどれだけ存在するかも影響します。',{type:'confusion',tp:round(tp),fn:round(pos-tp),fp:round(fp),tn:round(total-pos-fp)},{'基準率':p.base+'%'}),F('陽性の中での割合を計算','P(対象 | 陽性) = 真陽性 / (真陽性 + 偽陽性)。逆方向の条件付き確率を取り違えないようにします。',{type:'bars',values:[tp,fp],labels:['真陽性','偽陽性']},{'陽性的中率':`${round(precision*100)}%`})],{'真陽性(期待数)':round(tp,2),'偽陽性(期待数)':round(fp,2),'陽性的中率':`${round(precision*100)}%`});
 }
 let random=rng(p.seed),heads=0,frames=[],points=[];for(let i=1;i<=p.n;i++){heads+=random()<p.probability/100?1:0;if(i===1||i%Math.max(1,Math.floor(p.n/30))===0||i===p.n){points.push({x:i,y:heads/i});frames.push(F(`${i}回の試行`,'同じ確率でも有限回の試行では結果がばらつきます。seedを変えると別の、再現可能な試行列になります。',{type:'plot',series:[{name:'標本比率',points:clone(points)}],xLabel:'試行回数',yLabel:'比率'},{'成功':heads,'比率':round(heads/i,4)}));}}
 return out(frames,{'試行回数':p.n,'成功回数':heads,'標本比率':round(heads/p.n,4),'設定確率':p.probability/100});
});
R('program',(p,lab)=>{
 if(lab.variant==='recursion'){
 const n=p.n,stack=[],frames=[];let value=1;for(let i=n;i>=1;i--){stack.push(`factorial(${i})`);frames.push(F(`factorial(${i}) を呼ぶ`,'呼び出し元の続きを保存して、次の関数呼び出しに進みます。',{type:'stack',values:clone(stack)},{'呼び出し深さ':stack.length}));}while(stack.length){const i=n-stack.length+1;value*=i;stack.pop();frames.push(F(`${i}! = ${value} を返す`,'戻り値を受け取り、呼び出し元の計算を続けます。',{type:'stack',values:clone(stack),result:value},{'戻り値':value}));}return out(frames,{'n':n,'結果':value,'最大深さ':n});
 }
 const code=['sum = 0','for i = 1 .. n','    if i % divisor == 0','        sum = sum + i','print(sum)'],frames=[],n=p.n,div=p.divisor;let sum=0;frames.push(F('変数を初期化','sumに0を保存してから繰り返しを始めます。',{type:'code',code,line:0,vars:{n,divisor:div,sum}}));for(let i=1;i<=n;i++){frames.push(F(`i = ${i}: 条件を確認`,`${i}を${div}で割った余りは${i%div}です。`,{type:'code',code,line:2,vars:{n,i,sum,divisor:div}}));if(i%div===0){sum+=i;frames.push(F('条件を満たしたので加算','右辺を計算してからsumを更新します。',{type:'code',code,line:3,vars:{n,i,sum,divisor:div}}));}}
 frames.push(F('結果を表示','繰り返し全体が終わってから、集計結果を表示します。',{type:'code',code,line:4,vars:{n,sum},output:[String(sum)]}));return out(frames,{'反復回数':n,'条件を満たす回数':Math.floor(n/div),'合計':sum});
});
R('structure',(p,lab)=>{
 let values=parseNumbers(p.values,20),frames=[],data=[];const kind=lab.variant;
 if(kind==='hash'){
  let buckets=Array.from({length:p.size},()=>[]);values.forEach(v=>{const idx=((v%p.size)+p.size)%p.size;buckets[idx].push(v);frames.push(F(`${v} → bucket ${idx}`,'h(x)=x mod サイズ の単純なハッシュです。同じ位置に来た値を連結するチェイン法を使います。',{type:'cells',rows:buckets.map((b,i)=>({label:'bucket '+i,values:b.length?clone(b):['—']}))},{'衝突':buckets.reduce((a,b)=>a+Math.max(0,b.length-1),0)}));});return out(frames,{'要素数':values.length,'バケット数':p.size,'衝突数':buckets.reduce((a,b)=>a+Math.max(0,b.length-1),0)});
 }
 if(kind==='bst'||kind==='heap'){
  let root=null,heap=[];
  function snapshotTree(n){if(!n)return null;return {label:String(n.v),left:snapshotTree(n.l),right:snapshotTree(n.r)};}
  for(const value of values){if(kind==='bst'){let insert=n=>!n?{v:value}:value<n.v?{...n,l:insert(n.l)}:{...n,r:insert(n.r)};root=insert(root);frames.push(F(`${value} を二分探索木に追加`,'小さい値は左、大きいか等しい値は右へ進みます。平衡化しないBSTなので入力順によって形が偏ります。',{type:'tree',root:snapshotTree(root)}));}else{heap.push(value);let i=heap.length-1;while(i>0){let par=Math.floor((i-1)/2);if(heap[par]<=heap[i])break;[heap[par],heap[i]]=[heap[i],heap[par]];i=par;}const toTree=i=>i>=heap.length?null:{label:String(heap[i]),left:toTree(i*2+1),right:toTree(i*2+2)};frames.push(F(`${value} を最小ヒープに追加`,'親が子以下になるように上へ移動します。左右の部分木同士の大小は保証しません。',{type:'tree',root:toTree(0)}));}}
  return out(frames,{'要素数':values.length,'根':kind==='bst'?root.v:heap[0],'構造':kind==='bst'?'非平衡BST':'最小ヒープ'});
 }
 for(const v of values){data.push(v);frames.push(F(`${v} を追加`,kind==='stack'?'スタックの上へpushします。最後に入れた要素が最初に取り出されます。':'キューの末尾へenqueueします。先に入れた要素を先に取り出します。',{type:kind==='stack'?'stack':'cells',values:clone(data),rows:[{label:'front → back',values:clone(data)}]}));}
 let removed=[];for(let i=0;i<Math.min(p.remove,values.length);i++){let x=kind==='stack'?data.pop():data.shift();removed.push(x);frames.push(F(`${x} を取り出す`,kind==='stack'?'LIFO: Last In, First Out':'FIFO: First In, First Out',{type:kind==='stack'?'stack':'cells',values:clone(data),rows:[{label:'残り',values:data.length?clone(data):['空']}],result:x}));}
 return out(frames,{'追加':values.length,'取り出し順':removed.join(' → ')||'なし','残り':data.length});
});
R('sort',(p)=>{
 let a=parseNumbers(p.values,22),frames=[],comparisons=0,swaps=0;const push=(title,explain,active=[],sorted=[])=>frames.push(F(title,explain,{type:'bars',values:clone(a),labels:a.map((_,i)=>String(i)),active,sorted},{'比較':comparisons,'交換/書込':swaps}));push('同じ入力からスタート','比較方法を切り替えて、値の動きだけでなく操作回数を比べてください。');
 if(p.algorithm==='bubble'){for(let end=a.length-1;end>0;end--){let change=false;for(let i=0;i<end;i++){comparisons++;if(a[i]>a[i+1]){[a[i],a[i+1]]=[a[i+1],a[i]];swaps++;change=true;}push('隣り合う2つを比較','大きい値を右へ送ります。1巡すると右端の位置が確定します。',[i,i+1],a.map((_,j)=>j).filter(j=>j>end));}if(!change)break;}}
 else if(p.algorithm==='insertion'){for(let i=1;i<a.length;i++){let val=a[i],j=i-1;while(j>=0){comparisons++;if(a[j]<=val)break;a[j+1]=a[j];swaps++;j--;}a[j+1]=val;swaps++;push('整列済み部分に挿入','左側の整列済み部分の中で、正しい位置まで値を移します。',[j+1,i]);}}
 else if(p.algorithm==='selection'){for(let i=0;i<a.length-1;i++){let min=i;for(let j=i+1;j<a.length;j++){comparisons++;if(a[j]<a[min])min=j;}if(min!==i){[a[i],a[min]]=[a[min],a[i]];swaps++;}push('残りから最小値を選ぶ','未整列部分の最小値を探し、先頭に置きます。',[i,min],Array.from({length:i+1},(_,k)=>k));}}
 else if(p.algorithm==='quick'){const quick=(lo,hi)=>{if(lo>=hi)return;let pivot=a[hi],i=lo;for(let j=lo;j<hi;j++){comparisons++;if(a[j]<pivot){if(i!==j){[a[i],a[j]]=[a[j],a[i]];swaps++;}i++;}}[a[i],a[hi]]=[a[hi],a[i]];swaps++;push('ピボットで分割',`ピボット${pivot}より小さい値を左へ集めます。`,[i]);quick(lo,i-1);quick(i+1,hi);};quick(0,a.length-1);}
 else{const merge=(l,r)=>{if(r-l<2)return;let m=(l+r)>>1;merge(l,m);merge(m,r);let left=a.slice(l,m),right=a.slice(m,r),x=0,y=0;for(let k=l;k<r;k++){if(x<left.length&&y<right.length)comparisons++;a[k]=y>=right.length||(x<left.length&&left[x]<=right[y])?left[x++]:right[y++];swaps++;}push('整列された2つをマージ','それぞれの先頭を比較し、小さい方から書き戻します。',Array.from({length:r-l},(_,i)=>l+i));};merge(0,a.length);}
 push('整列が完了','すべての値が昇順になりました。再生速度は処理回数やこの結果を変えません。',[],a.map((_,i)=>i));return out(frames,{'要素数':a.length,'比較回数':comparisons,'交換/書込回数':swaps},'交換と書込の数え方がアルゴリズムで異なるため、その指標だけで速度を断定しないでください。');
});
R('search',(p)=>{
 let a=parseNumbers(p.values),frames=[],comparisons=0,found=-1;if(p.method==='binary'&&a.some((v,i)=>i&&v<a[i-1]))throw Error('二分探索は昇順に整列された入力が前提です。配列を昇順に直すか、線形探索を選んでください。');
 if(p.method==='linear'){for(let i=0;i<a.length;i++){comparisons++;frames.push(F(`位置 ${i} を調べる`,'先頭から順に比較します。並び順に依存せず使えます。',{type:'bars',values:clone(a),active:[i],labels:a.map((_,i)=>String(i))},{'比較回数':comparisons}));if(a[i]===p.target){found=i;break;}}}
 else {let lo=0,hi=a.length-1;while(lo<=hi){let m=Math.floor((lo+hi)/2);comparisons++;frames.push(F(`範囲 [${lo}, ${hi}] の中央 ${m}`,'中央と比べることで候補をおよそ半分に絞ります。これが成立するのは、値が整列されているからです。',{type:'bars',values:clone(a),active:[m],range:[lo,hi],labels:a.map((_,i)=>String(i))},{'比較回数':comparisons}));if(a[m]===p.target){found=m;break;}if(a[m]<p.target)lo=m+1;else hi=m-1;}}
 return out(frames,{'探索値':p.target,'発見位置':found<0?'なし':found,'比較回数':comparisons});
});
R('graphsearch',(p)=>{
 const nodes=[{id:'A',label:'A',x:80,y:180},{id:'B',label:'B',x:255,y:70},{id:'C',label:'C',x:255,y:280},{id:'D',label:'D',x:470,y:70},{id:'E',label:'E',x:470,y:280},{id:'F',label:'F',x:660,y:180}],edges=[{a:'A',b:'B'},{a:'A',b:'C'},{a:'B',b:'D'},{a:'B',b:'E'},{a:'C',b:'E'},{a:'D',b:'F'},{a:'E',b:'F'}];let frontier=['A'],seen=new Set(),order=[],frames=[];
 while(frontier.length){let u=p.method==='BFS'?frontier.shift():frontier.pop();if(seen.has(u))continue;seen.add(u);order.push(u);const adjacent=edges.filter(e=>e.a===u||e.b===u).map(e=>e.a===u?e.b:e.a).filter(v=>!seen.has(v));frontier.push(...(p.method==='DFS'?adjacent.reverse():adjacent));frames.push(F(`${u} を訪問`,p.method==='BFS'?'キューを使い、始点に近い層から探索します。':'スタックを使い、1つの道を深くたどります。',{type:'network',nodes,edges,active:u,visited:[...seen]},{'次の候補':frontier.join(', ')||'なし','訪問数':seen.size}));}
 return out(frames,{'方式':p.method,'訪問順':order.join(' → '),'頂点数':nodes.length});
});
R('dp',(p)=>{
 let weights=[2,3,4,5],values=[3,4,5,8],capacity=p.capacity,dp=Array.from({length:5},()=>Array(capacity+1).fill(0)),frames=[];
 for(let i=1;i<=4;i++){for(let c=0;c<=capacity;c++){dp[i][c]=dp[i-1][c];if(weights[i-1]<=c)dp[i][c]=Math.max(dp[i][c],dp[i-1][c-weights[i-1]]+values[i-1]);}frames.push(F(`品物 ${i} まで考える`,'その品物を使わない場合と、1度だけ使う場合を比較します。小さい部分問題の結果を再利用します。',{type:'grid',matrix:dp.slice(0,i+1),rowLabels:['なし','w2 / v3','w3 / v4','w4 / v5','w5 / v8'].slice(0,i+1),colLabels:Array.from({length:capacity+1},(_,i)=>i)},{'現在の最大価値':dp[i][capacity]}));}
 return out(frames,{'容量':capacity,'最大価値':dp[4][capacity],'品物数':4});
});
function arithmetic(source){
 const tokens=String(source).match(/\d+(?:\.\d+)?|[()+\-*/]/g)||[];if(tokens.join('')!==String(source).replace(/\s/g,''))throw Error('数値と + - * / ( ) だけを使ってください。負数は 0-3 のように記述します。');if(!tokens.length||tokens.length>60)throw Error('式は1〜60トークンで入力してください。');const output=[],operators=[],prec={'+':1,'-':1,'*':2,'/':2},tr=[];let expectOperand=true;
 for(const t of tokens){if(/^\d/.test(t)){if(!expectOperand)throw Error('数値の間には演算子が必要です。');output.push(t);expectOperand=false;}else if(t==='('){if(!expectOperand)throw Error('括弧の前に演算子が必要です。');operators.push(t);}else if(t===')'){if(expectOperand)throw Error('括弧の中に式が必要です。');while(operators.length&&operators.at(-1)!=='(')output.push(operators.pop());if(operators.pop()!=='(')throw Error('括弧が対応していません。');}else{if(expectOperand)throw Error('演算子の前に数値が必要です。');while(operators.length&&prec[operators.at(-1)]>=prec[t])output.push(operators.pop());operators.push(t);expectOperand=true;}tr.push({token:t,output:clone(output),operators:clone(operators)});}
 if(expectOperand)throw Error('式が演算子で終わっています。');while(operators.length){let t=operators.pop();if(t==='(')throw Error('括弧が閉じられていません。');output.push(t);}let stack=[];for(const t of output){if(/^\d/.test(t))stack.push({label:t,value:+t});else{let b=stack.pop(),a=stack.pop();if(!a||!b)throw Error('式が正しくありません。');const v=t==='+'?a.value+b.value:t==='-'?a.value-b.value:t==='*'?a.value*b.value:a.value/b.value;if(!Number.isFinite(v))throw Error('0で割ることはできません。');stack.push({label:t,left:a,right:b,value:v});}}if(stack.length!==1)throw Error('式が正しくありません。');return {tokens,postfix:output,tree:stack[0],trace:tr};
}
L.arithmetic=arithmetic;
R('compiler',(p)=>{const r=arithmetic(p.code),frames=[F('文字列をトークンに分ける','数値・演算子・括弧を読み取ります。ここでは算術式だけを扱う小さな言語です。',{type:'cells',rows:[{label:'tokens',values:r.tokens}]})];r.trace.forEach(t=>frames.push(F(`トークン「${t.token}」を処理`,'演算子の優先順位と括弧に従って後置記法へ変換します。ソース文字列をevalで実行してはいません。',{type:'cells',rows:[{label:'出力',values:t.output.length?t.output:['—']},{label:'演算子スタック',values:t.operators.length?t.operators:['空']}]})));frames.push(F('構文木として評価する','葉の値を演算子ノードへ渡し、下から順番に計算します。',{type:'tree',root:r.tree},{'評価結果':r.tree.value}));return out(frames,{'トークン数':r.tokens.length,'後置記法':r.postfix.join(' '),'計算結果':round(r.tree.value,6)});});
R('cpu',(p)=>{
 const code=p.code.trim().split('\n').map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));if(code.length>40||!code.length)throw Error('1〜40行の命令を入力してください。');const regs={R0:0,R1:0,R2:0,R3:0},mem={},frames=[];let pc=0,count=0,halted=false;
 const reg=n=>{if(!(n in regs))throw Error('レジスタはR0〜R3を使います。');return n;},val=s=>s in regs?regs[s]:(/^[-+]?\d+$/.test(s)?Number(s):NaN);
 while(pc<code.length&&count<60&&!halted){let line=code[pc],tok=line.replaceAll(',',' ').split(/\s+/),op=tok[0].toUpperCase(),next=pc+1;frames.push(F(`PC=${pc}: 命令を取り出す`,'プログラムカウンターが示す命令をフェッチします。実機の命令セットではなく、4レジスタの教材ISAです。',{type:'code',code,line:pc,vars:{...regs,PC:pc},stage:'FETCH'}));
 if(op==='MOV'){reg(tok[1]);const v=val(tok[2]);if(!Number.isFinite(v))throw Error('MOVの第2引数は整数かレジスタです。');regs[tok[1]]=v;}
 else if(['ADD','SUB','MUL'].includes(op)){reg(tok[1]);let a=val(tok[2]),b=val(tok[3]);if(!Number.isFinite(a)||!Number.isFinite(b))throw Error('演算の入力を確認してください。');regs[tok[1]]=op==='ADD'?a+b:op==='SUB'?a-b:a*b;}
 else if(op==='STORE'){if(!/^\d+$/.test(tok[2]||''))throw Error('STOREのアドレスは0〜255の整数です。');let addr=+tok[2];if(addr>255)throw Error('アドレスは0〜255です。');mem[addr]=regs[reg(tok[1])];}
 else if(op==='LOAD'){if(!/^\d+$/.test(tok[2]||'')||+tok[2]>255)throw Error('LOADのアドレスは0〜255です。');regs[reg(tok[1])]=mem[+tok[2]]??0;}
 else if(op==='JMP'){next=Number(tok[1]);}
 else if(op==='JZ'){reg(tok[1]);if(regs[tok[1]]===0)next=Number(tok[2]);}
 else if(op==='HALT')halted=true;else throw Error('対応命令: MOV / ADD / SUB / MUL / LOAD / STORE / JMP / JZ / HALT');
 if(!Number.isInteger(next)||next<0||next>code.length)throw Error('ジャンプ先は0から始まる命令位置です。');if(Object.values(regs).some(v=>!Number.isFinite(v)||Math.abs(v)>1e12))throw Error('計算値が教材上限を超えました。');
 frames.push(F(`${op} を実行`,'命令の種類に応じてレジスタやメモリを更新し、次のPCを決めます。',{type:'code',code,line:pc,vars:{...regs,PC:next},stage:'EXECUTE'},{'実行済み命令':count+1},{headers:['メモリアドレス','値'],rows:Object.entries(mem)}));pc=next;count++;
 }
 return out(frames,{'命令数':count,'R0':regs.R0,'R1':regs.R1,'停止':count>=60?'60命令で安全停止':'正常'},count>=60?'無限ループの可能性があるため、60命令で停止しました。':'すべての命令を実行しました。整数幅のオーバーフローや実CPUのタイミングはモデル対象外です。');
});
R('pipeline',(p)=>{
 const n=p.instructions,stages=['F','D','E','M','W'],items=[],frames=[];let extra=0;
 for(let i=0;i<n;i++){if(i===2&&p.pipeline&&p.hazard)extra+=p.forward?1:2;let start=p.pipeline?i+extra:i*5;items.push({label:'I'+(i+1),start,end:start+5,segments:stages});frames.push(F(`命令 ${i+1} を投入`,p.pipeline?'異なる命令の段階を重ねます。今回は5段パイプライン、メモリは固定1サイクルとします。':'各命令の5段階が終わってから次を開始します。',{type:'lanes',items:clone(items),unit:'cycle'},{'ここまでのサイクル':start+5}));}
 let total=items.at(-1).end;return out(frames,{'命令数':n,'サイクル':total,'CPI':round(total/n,2),'挿入ストール':p.pipeline&&p.hazard?(p.forward?1:2):0},'I3が直前のロード結果に依存する固定例です。分岐・キャッシュミス・複数発行は含めません。');
});
R('cache',(p)=>{
 const addresses=parseNumbers(p.addresses,32).map(x=>Math.floor(Math.abs(x))),lines=Array(p.lines).fill(null),frames=[];let hits=0,misses=0;
 addresses.forEach(addr=>{let block=Math.floor(addr/p.block),index=block%p.lines,tag=Math.floor(block/p.lines),hit=lines[index]?.tag===tag;hit?hits++:misses++;lines[index]={tag,block};frames.push(F(`${addr}番地: ${hit?'キャッシュヒット':'キャッシュミス'}`,`ブロック番号${block}を、index=${block} mod ${p.lines}=${index}に対応させます。タグが一致するとヒットです。`,{type:'cells',rows:lines.map((l,i)=>({label:'line '+i,values:l?[`tag ${l.tag}`,`block ${l.block}`]:['invalid'],active:i===index}))},{'HIT':hits,'MISS':misses,'アドレス':addr}));});
 return out(frames,{'ヒット':hits,'ミス':misses,'ヒット率':`${round(hits/addresses.length*100)}%`,'モデル時間':`${hits+misses*50} 単位`},'ダイレクトマップ・読み出し専用。ヒット1、ミス50という教材用コストで、実機のnsではありません。');
});
R('memory',(p,lab)=>{
 if(lab.variant==='pages'){
 let refs=parseNumbers(p.references,24).map(x=>Math.floor(Math.abs(x))),slots=[],last={},frames=[],faults=0,queue=[];refs.forEach((page,t)=>{let hit=slots.includes(page),evicted=null;if(!hit){faults++;if(slots.length<p.frames)slots.push(page);else{evicted=p.policy==='FIFO'?queue.shift():slots.slice().sort((a,b)=>last[a]-last[b])[0];slots[slots.indexOf(evicted)]=page;queue=queue.filter(x=>x!==evicted);}queue.push(page);}last[page]=t;frames.push(F(`page ${page}: ${hit?'常駐している':'ページフォルト'}`,hit?'必要なページは既に物理メモリにあります。':`必要なページがありません。${evicted!==null?`page ${evicted}を置き換えます。`:'空きフレームに読み込みます。'}`,{type:'cells',rows:[{label:'物理フレーム',values:Array.from({length:p.frames},(_,i)=>slots[i]??'空')},{label:'今回の参照',values:[page]}]},{'フォルト':faults,'ヒット':t+1-faults}));});return out(frames,{'参照回数':refs.length,'ページフォルト':faults,'ヒット率':`${round((refs.length-faults)/refs.length*100)}%`});
 }
 const x=p.value,addr='0x1000',frames=[F('変数xに値を入れる','この教材では、xがアドレス0x1000にあると決めます。実際の配置は言語や実行環境によって異なります。',{type:'memory',stack:[{name:'x',address:addr,value:x}],heap:[]}),F('pにxのアドレスを入れる','pは値そのものではなく、xのある場所を指します。',{type:'memory',stack:[{name:'x',address:addr,value:x},{name:'p',address:'0x1008',value:addr}],heap:[],arrow:true}),F(p.free?'ヒープを解放した後の参照':'参照先を通じて書き換える',p.free?'ヒープを解放してもポインタの値が自動的に消えるわけではありません。この教材は解放後のアクセスを検出して停止します。':'*pを通じて書き換えると、pが指しているxの値が変わります。',{type:'memory',stack:[{name:'x',address:addr,value:p.free?x:p.write},{name:'p',address:'0x1008',value:p.free?'0x2000':addr}],heap:p.free?[{name:'解放済み',address:'0x2000',value:'INVALID',freed:true}]:[],arrow:!p.free},{'参照結果':p.free?'無効な参照':p.write})];if(p.free)frames.splice(2,0,F('ヒープを確保し、pの参照先を変更','教材用の0x2000に領域を確保し、pにそのアドレスを入れます。この後で領域だけを解放します。',{type:'memory',stack:[{name:'x',address:addr,value:x},{name:'p',address:'0x1008',value:'0x2000'}],heap:[{name:'確保領域',address:'0x2000',value:p.write}]}));return out(frames,{'x':p.free?x:p.write,'pの値':p.free?'0x2000':addr,'状態':p.free?'解放後アクセスを検出':'有効'});
});
R('allocation',(p)=>{
 const sizes=parseNumbers(p.sizes,12).map(v=>Math.max(1,Math.floor(Math.abs(v)))),capacity=p.capacity,free=[{start:0,size:capacity}],allocated=[],frames=[];let failures=0;
 sizes.forEach((size,i)=>{let candidates=free.map((b,j)=>({...b,index:j})).filter(b=>b.size>=size);if(p.policy==='best')candidates.sort((a,b)=>a.size-b.size);let b=candidates[0];if(b){allocated.push({id:i,start:b.start,size});free[b.index].start+=size;free[b.index].size-=size;free.splice(0,free.length,...free.filter(x=>x.size>0));}else failures++;
 if(i===2&&p.release&&allocated.length){let released=allocated.shift();free.push({start:released.start,size:released.size});free.sort((a,b)=>a.start-b.start);}
 frames.push(F(`${size}セルの確保を要求`,b?'連続した空き領域から確保します。途中で先頭の領域を解放する条件も試せます。':'十分に大きな連続空間がありません。空き容量の合計だけでは確保の成功を判断できません。',{type:'allocation',capacity,blocks:clone(allocated),free:clone(free)},{'確保失敗':failures,'空き合計':free.reduce((s,b)=>s+b.size,0)}));});return out(frames,{'確保中':allocated.length,'失敗':failures,'空き':free.reduce((s,b)=>s+b.size,0)});
});
R('scheduler',(p)=>{
 const bursts=parseNumbers(p.bursts,8).map(x=>Math.max(1,Math.min(20,Math.floor(Math.abs(x))))),remaining=clone(bursts),items=[],frames=[],completion=Array(bursts.length).fill(0);let time=0,ready=bursts.map((_,i)=>i);if(p.policy==='SJF')ready.sort((a,b)=>bursts[a]-bursts[b]);
 while(ready.length){let i=ready.shift(),length=p.policy==='RR'?Math.min(p.quantum,remaining[i]):remaining[i];items.push({label:'P'+(i+1),start:time,end:time+length});time+=length;remaining[i]-=length;if(remaining[i])ready.push(i);else completion[i]=time;frames.push(F(`P${i+1} を ${length}単位実行`,p.policy==='RR'?'時間量子まで実行し、残りがあれば待ち行列の末尾へ戻します。':'この非プリエンプティブ設定では、選んだプロセスを終了まで実行します。',{type:'lanes',items:clone(items),unit:'time'},{'時刻':time,'待ち行列':ready.map(i=>'P'+(i+1)).join(' → ')||'空'}));}
 return out(frames,{'完了時刻':time,'平均待ち時間':round(completion.reduce((s,t,i)=>s+t-bursts[i],0)/bursts.length),'平均ターンアラウンド':round(completion.reduce((a,b)=>a+b)/bursts.length)},'すべての到着時刻は0、I/O待ちなし、切替コスト0とした比較です。');
});
R('filesystem',(p)=>{
 let size=p.size,blocks=Math.ceil(size/p.block),links=p.links,frames=[F('ファイルをブロックに分ける','ファイルの内容は複数のブロックに保存されます。このモデルでは最終ブロックの余りだけを内部断片化として数えます。',{type:'cells',rows:[{label:'data blocks',values:Array.from({length:blocks},(_,i)=>`block ${i}`)}]}),F('名前と内容の管理を分ける','ディレクトリエントリは名前からinodeを参照します。ハードリンクを増やしても、同じinodeとデータを共有します。',{type:'flow',nodes:[`${links}個の名前`,'inode 42',`${blocks} blocks`],active:1},{'link count':links})];
 return out(frames,{'ファイルサイズ':`${size} B`,'データブロック':blocks,'末尾の空き':`${blocks*p.block-size} B`},'間接ブロックやinode自体の保存領域など、メタデータの容量は除外しています。');
});
R('concurrency',(p,lab)=>{
 if(lab.variant==='deadlock'){
 let dead=!p.order;return out([F('2つの資源を取り合う','P1とP2がそれぞれ資源を保持したまま、相手の資源を待つ状態を作ります。各資源は1インスタンスです。プロセス→資源は要求、資源→プロセスは割当を表します。',{type:'network',directed:true,nodes:[{id:'p1',label:'P1',x:170,y:90},{id:'r1',label:'Lock A',x:530,y:90},{id:'p2',label:'P2',x:530,y:290},{id:'r2',label:'Lock B',x:170,y:290}],edges:dead?[{a:'p1',b:'r2'},{a:'r2',b:'p2'},{a:'p2',b:'r1'},{a:'r1',b:'p1'}]:[{a:'p1',b:'r1'},{a:'p2',b:'r1'}],active:'p1',detail:dead?'循環待ち':'取得順序を統一'}),F(dead?'循環待ちで進めない':'順序の統一で循環を防ぐ',dead?'単一インスタンス資源で待ちの輪ができています。強制終了や資源の解放をしない限り進みません。':'両方がA→Bの順番に取得すると、この例の循環待ちを作れません。',{type:'flow',nodes:['P1','Lock A','Lock B'],active:1,failed:dead})],{'デッドロック':dead?'発生':'回避','方針':p.order?'A → Bに統一':'逆順で取得'});
 }
 let sequence=p.lock?['A read','A add','A write','B read','B add','B write']:p.order==='interleave'?['A read','B read','A add','B add','A write','B write']:['A read','A add','A write','B read','B add','B write'];let shared=0,local={A:0,B:0},frames=[];for(const s of sequence){let [who,op]=s.split(' ');if(op==='read')local[who]=shared;if(op==='add')local[who]++;if(op==='write')shared=local[who];frames.push(F(s,'インクリメントを読み出し・加算・書き戻しに分けた教材です。処理順が結果に影響します。',{type:'cells',rows:[{label:'共有値',values:[shared]},{label:'Aの手元',values:[local.A]},{label:'Bの手元',values:[local.B]}]},{'共有値':shared}));}return out(frames,{'最終値':shared,'意図した加算回数':2,'更新消失':shared===2?'なし':'あり'});
});
R('replication',(p)=>{
 const n=p.nodes,quorum=Math.floor(n/2)+1,alive=n-p.failed,ok=alive>=quorum,replicas=Array.from({length:n},(_,i)=>i<alive?'v2':'offline');
 return out([F('更新を複数ノードへ送る','多数決型の書込み確認を使う簡略モデルです。リーダー選出やRaftのログ複製全体ではありません。',{type:'cells',rows:[{label:'レプリカ',values:replicas}]},{'応答できる台数':alive}),F(ok?'過半数の確認がそろう':'過半数に届かない',ok?'このモデルのコミット条件を満たしました。障害台数を増やすと確認数が足りなくなります。':'安全性のため書込み成功を返しません。少数側でも成功させる設計とは結果が異なります。',{type:'bars',values:[alive,quorum],labels:['応答数','必要数'],active:[0]})],{'全ノード':n,'必要な確認':quorum,'応答数':alive,'書込み':ok?'commit':'待機 / 失敗'});
});
R('eventloop',(p)=>{
 const micro= p.microtasks,events=[{name:'main',stack:['main()'],micro:[],task:[],output:['A']}];let microQ=Array.from({length:micro},(_,i)=>'Promise '+(i+1));events.push({name:'処理を予約',stack:['main()'],micro:clone(microQ),task:['timer B'],output:['A']});events.push({name:'同期処理を終える',stack:[],micro:clone(microQ),task:['timer B'],output:['A','D']});let output=['A','D'];while(microQ.length){let m=microQ.shift();output.push('C'+(micro-microQ.length));events.push({name:m,stack:[m],micro:clone(microQ),task:['timer B'],output:clone(output)});}output.push('B');events.push({name:'timer task',stack:['timer B'],micro:[],task:[],output:clone(output)});
 return out(events.map(e=>F(e.name,'単一の同期タスクが終わるとマイクロタスクを処理し、その後タイマーのタスクへ進みます。0ms指定は即実行の意味ではありません。',{type:'queues',columns:[{name:'Call stack',items:e.stack},{name:'Microtasks',items:e.micro},{name:'Tasks',items:e.task}],output:e.output})),{'出力順':output.join(' → '),'マイクロタスク数':micro});
});
R('database',(p,lab)=>{
 const users=[{id:1,name:'Aoi',age:19,dept:'Network'},{id:2,name:'Ren',age:22,dept:'Security'},{id:3,name:'Yui',age:20,dept:'Network'},{id:4,name:'Sora',age:24,dept:'Systems'},{id:5,name:'Haru',age:18,dept:'Security'},{id:6,name:'Rin',age:21,dept:'Systems'}];
 if(lab.variant==='join'){
 const courses=[{uid:1,title:'TCP'},{uid:1,title:'DNS'},{uid:3,title:'TLS'},{uid:5,title:'ACL'}],frames=[],rows=[];let comparisons=0;for(const u of users){let found=false;for(const c of courses){comparisons++;if(c.uid===u.id){rows.push([u.id,u.name,c.title]);found=true;}}if(!found&&p.join==='LEFT')rows.push([u.id,u.name,'NULL']);frames.push(F(`${u.name} の結合相手を探す`,p.join==='LEFT'?'一致する右側の行がなくても、左側の行をNULLとともに残します。':'一致する結合キーがある組み合わせだけを残します。',{type:'cells',rows:[{label:'左の行',values:[u.id,u.name]},{label:'一致数',values:[courses.filter(c=>c.uid===u.id).length]}]}, {'比較回数':comparisons},{headers:['id','name','course'],rows:clone(rows)}));}return out(frames,{'結合方式':p.join,'結果行数':rows.length,'比較回数':comparisons});
 }
 const sorted=users.slice().sort((a,b)=>a.age-b.age),examined=p.index?sorted.filter(u=>u.age>=p.age):users,matched=users.filter(u=>u.age>=p.age),frames=examined.map((u,i)=>F(`${u.name} / age=${u.age} を確認`,p.index?'索引で範囲の開始位置へ到達した後、条件に合う索引エントリを走査します。索引の探索コストは別途あります。':'各行のageを順番に確認します。',{type:'bars',values:users.map(x=>x.age),labels:users.map(x=>x.name),active:[users.indexOf(u)]},{'走査した行':i+1},{headers:['id','name','age'],rows:matched.map(x=>[x.id,x.name,x.age])}));if(!frames.length)frames.push(F('条件を満たす行がない','索引の範囲探索で、該当データがないと分かりました。',{type:'cells',rows:[{label:'result',values:['0 rows']}]}));return out(frames,{'結果行数':matched.length,'走査した行':examined.length,'索引探索の目安':p.index?`${Math.ceil(Math.log2(users.length+1))}比較以下`:'なし'});
});
R('transaction',(p)=>{
 let balance=100,readA=100,readB=p.serial?120:100,final=p.serial?110:90;
 let events=p.serial?[['A reads',100],['A deposits +20',120],['A commits',120],['B reads',120],['B withdraws -10',110],['B commits',110]]:[['A reads',100],['B reads',100],['A writes 120',120],['B writes 90',90]];
 return out(events.map(([name,v],i)=>F(name,p.serial?'ロックによってこの例ではトランザクションを直列化します。':'それぞれが読み取った値を元に書き戻すため、Aの更新が失われます。',{type:'cells',rows:[{label:'balance',values:[v]},{label:'Aの読取り',values:[readA]},{label:'Bの読取り',values:[readB]}]},{'balance':v})),{'最終残高':final,'意図した残高':110,'更新消失':p.serial?'なし':'あり'});
});
R('btree',(p)=>{
 // B+ tree of order 4: at most 3 keys / 4 children; leaf split promotes the right minimum.
 let root={leaf:true,keys:[]};let frames=[];function insert(n,k){if(n.leaf){n.keys.push(k);n.keys.sort((a,b)=>a-b);if(n.keys.length<=3)return null;let right={leaf:true,keys:n.keys.splice(2)};return {key:right.keys[0],right};}let i=n.keys.findIndex(x=>k<x);if(i<0)i=n.keys.length;let split=insert(n.children[i],k);if(split){n.keys.splice(i,0,split.key);n.children.splice(i+1,0,split.right);}if(n.keys.length<=3)return null;let mid=n.keys[2],right={leaf:false,keys:n.keys.slice(3),children:n.children.slice(3)};n.keys=n.keys.slice(0,2);n.children=n.children.slice(0,3);return {key:mid,right};}
 function view(n){return {label:n.keys.join(' | '),children:n.children?.map(view),leaf:n.leaf};}
 const values=[...new Set(parseNumbers(p.values,24))];for(const v of values){let s=insert(root,v);if(s)root={leaf:false,keys:[s.key],children:[root,s.right]};frames.push(F(`${v} をB+木に追加`,'葉にキーを追加し、上限3キーを超えると分割します。内部ノードのキーは探索の区切りです。値本体は葉に保持します。',{type:'tree',root:view(root)}));}let depth=1,t=root;while(!t.leaf){depth++;t=t.children[0];}return out(frames,{'キー数':values.length,'高さ':depth,'ノードの最大キー数':3},'次数4の挿入専用B+木です。重複キーは1つにまとめ、削除・ディスクI/O・並行制御は対象外です。');
});
R('ml',(p,lab)=>{
 let random=rng(p.seed),data=Array.from({length:18},(_,i)=>{let x=i/17;return {x,y:1.8*x+.2+(random()-.5)*p.noise};}),w=0,b=0,frames=[],loss=[];
 for(let t=0;t<p.epochs;t++){let dw=0,db=0,mse=0;for(const pt of data){let e=w*pt.x+b-pt.y;dw+=2*e*pt.x/data.length;db+=2*e/data.length;mse+=e*e/data.length;}w-=p.rate*dw;b-=p.rate*db;loss.push({x:t+1,y:mse});if(t%Math.max(1,Math.floor(p.epochs/30))===0||t===p.epochs-1)frames.push(F(`学習 ${t+1} 回目`,'予測と正解の二乗誤差が小さくなる向きに、傾きwと切片bを更新します。学習率が大きすぎると不安定になり得ます。',{type:'scatter',points:data,line:[{x:0,y:b},{x:1,y:w+b}]},{'w':round(w,4),'b':round(b,4),'更新前MSE':round(mse,5)}));if(!Number.isFinite(w)||Math.abs(w)>1e6)break;}
 const finalLoss=data.reduce((s,pt)=>s+(w*pt.x+b-pt.y)**2/data.length,0);return out(frames,{'傾き w':round(w,4),'切片 b':round(b,4),'学習誤差 MSE':round(finalLoss,5)},'生成した同じ18点での学習誤差です。未知のデータでの性能を保証する値ではありません。');
});
R('kmeans',(p)=>{
 let random=rng(p.seed),points=Array.from({length:36},(_,i)=>({x:(i%3)*2+(random()-.5)*1.8,y:Math.floor(i%6/3)*2+random()*1.7,cluster:0})),centers=Array.from({length:p.k},(_,i)=>({x:points[i*3].x,y:points[i*3].y})),frames=[];
 for(let t=0;t<8;t++){for(const pt of points)pt.cluster=centers.map((c,i)=>({i,d:(c.x-pt.x)**2+(c.y-pt.y)**2})).sort((a,b)=>a.d-b.d)[0].i;centers=centers.map((c,i)=>{const group=points.filter(x=>x.cluster===i);return group.length?{x:group.reduce((s,x)=>s+x.x,0)/group.length,y:group.reduce((s,x)=>s+x.y,0)/group.length}:c;});frames.push(F(`反復 ${t+1}: 割当と中心の更新`,'最も近い中心へ点を割り当て、各グループの平均に中心を移します。kや初期配置によって結果が変わります。',{type:'scatter',points:clone(points),legend:Array.from({length:p.k},(_,i)=>'群'+(i+1)),centers:clone(centers)},{'グループ数':p.k}));}
 let inertia=points.reduce((s,x)=>s+(x.x-centers[x.cluster].x)**2+(x.y-centers[x.cluster].y)**2,0);return out(frames,{'点の数':points.length,'k':p.k,'中心との二乗距離和':round(inertia)});
});
R('signalmedia',(p,lab)=>{
 if(lab.variant==='filter'){
 let vals=[0,0,0,1,1,1,0,0,1,0,0,0],filtered=vals.map((_,i)=>{let sum=0,n=0;for(let j=Math.max(0,i-p.radius);j<=Math.min(vals.length-1,i+p.radius);j++){sum+=vals[j];n++;}return sum/n;});
 return out([F('信号の近傍を平均する','各位置の周囲を平均し、急激な変化をならします。境界では存在する点だけを平均しています。',{type:'plot',series:[{name:'元の信号',points:vals.map((y,x)=>({x,y}))},{name:'平滑化',points:filtered.map((y,x)=>({x,y}))}],xLabel:'位置',yLabel:'値'})],{'半径':p.radius,'窓の最大サイズ':p.radius*2+1,'最大値':round(Math.max(...filtered))});
 }
 const n=p.samples,f=p.frequency,points=Array.from({length:401},(_,i)=>({x:i/400,y:Math.sin(2*Math.PI*f*i/400)})),sampled=Array.from({length:n},(_,i)=>({x:i/n,y:Math.sin(2*Math.PI*f*i/n)}));
 if(lab.variant==='fourier'){const spectrum=Array.from({length:Math.floor(n/2)+1},(_,k)=>{let re=0,im=0;for(let i=0;i<n;i++){re+=sampled[i].y*Math.cos(2*Math.PI*k*i/n);im-=sampled[i].y*Math.sin(2*Math.PI*k*i/n);}return {x:k,y:Math.hypot(re,im)/n*2};});return out([F('時間の波形を見る','1秒の信号を等間隔に標本化します。',{type:'plot',series:[{name:'標本',points:sampled}],xLabel:'秒',yLabel:'振幅'}),F('周波数ごとの成分を計算','DFTを実際に計算します。1秒窓・窓関数なし。周波数と窓が合わない場合は漏れが生じます。',{type:'plot',series:[{name:'振幅スペクトル',points:spectrum}],xLabel:'Hz',yLabel:'振幅'})],{'サンプル数':n,'ナイキスト周波数':n/2+' Hz','入力周波数':f+' Hz'});}
 return out([F('連続波から点を取り出す','等間隔の点だけを記録します。標本化周波数が不足すると別の周波数に見えるエイリアシングが起き得ます。',{type:'plot',series:[{name:'連続波',points},{name:'標本を結ぶ線',points:sampled}],xLabel:'秒',yLabel:'振幅'})],{'標本化':`${n} Hz`,'信号':`${f} Hz`,'条件':n>2*f?'理想再構成の基本条件を満たす':'ナイキスト条件を満たさない'});
});
R('projection',(p)=>{
 const a=p.angle*Math.PI/180,z=p.distance,verts=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([x,y,zz])=>{let X=x*Math.cos(a)+zz*Math.sin(a),Z=-x*Math.sin(a)+zz*Math.cos(a)+z;return {x:X/Z*3,y:y/Z*3};});
 return out([F('3Dの頂点を回転する','Y軸を中心に回転し、視点からの奥行きで座標を割って透視投影します。',{type:'wireframe',points:verts,edges:[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]},{'回転角':p.angle+'°','距離':z})],{'頂点数':8,'辺数':12,'投影':'透視投影'});
});
R('control',(p)=>{
 let value=0,velocity=0,integral=0,prev=0,frames=[],points=[],targets=[],dt=.05;
 for(let i=0;i<160;i++){let error=p.target-value;integral+=error*dt;let derivative=(error-prev)/dt;let u=p.kp*error+p.ki*integral+p.kd*derivative;u=clamp(u,-30,30);velocity+=(u-p.damping*velocity)*dt;value+=velocity*dt;prev=error;points.push({x:round(i*dt,2),y:value});targets.push({x:round(i*dt,2),y:p.target});if(i%5===0||i===159)frames.push(F(`時刻 ${round(i*dt,2)} 秒`,'目標との誤差を見て操作量を更新します。Pは現在の誤差、Iは累積、Dは変化を使います。架空の質点モデルです。',{type:'plot',series:[{name:'位置',points:clone(points)},{name:'目標',points:clone(targets)}],xLabel:'秒',yLabel:'位置'},{'位置':round(value,3),'誤差':round(error,3),'操作量':round(u,3)}));}
 return out(frames,{'最後の位置':round(value,3),'残る誤差':round(p.target-value,3),'最大位置':round(Math.max(...points.map(x=>x.y)),3)},'実機へのゲイン推奨ではありません。操作量を±30に制限し、センサーノイズ等を省略しています。');
});
R('accessibility',(p)=>{
 const luminance=hex=>{const c=hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];},a=luminance(p.foreground),b=luminance(p.background),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 return out([F('文字と背景の相対輝度を比較','通常サイズの文字のWCAG AA基準は4.5:1です。色だけで状態を区別せず、記号やラベルも併用します。',{type:'contrast',foreground:p.foreground,background:p.background,text:'読めることが、理解の入口。',size:p.size},{'コントラスト比':round(ratio,2)}),F('状態を複数の手掛かりで伝える','同じ色が区別しにくい人にも分かるように、成功・警告・失敗を言葉と形で表します。',{type:'cells',rows:[{label:'状態',values:['✓ 完了','! 注意','× 失敗']}]})],{'コントラスト':round(ratio,2)+':1','通常文字AA':ratio>=4.5?'満たす':'満たさない','文字サイズ':p.size+' px'});
});
R('ethics',(p)=>{
 const collected=p.location?['メール','行動履歴','精密な位置']:['メール','行動履歴'],uses=p.share?['運営者','提携企業']:['運営者'];
 return out([F('データの流れを確認する','便利さだけでなく、誰が何のために使うかを明らかにします。ここでは架空のサービスの選択肢を比較します。',{type:'zones',zones:[{name:'収集する情報',items:collected},{name:'利用する相手',items:uses}],linked:true}),F('保存期間を考える','保存期間が長いほど、過去の分析に使える情報と管理すべきデータが増えます。唯一の正解を数値で決める実験ではありません。',{type:'cells',rows:[{label:'保持期間',values:[p.days+'日']},{label:'判断の観点',values:['必要性','利用者の理解','削除','漏えい時の影響']}]} )],{'情報の種類':collected.length,'利用主体数':uses.length,'保存期間':p.days+'日'},'これは価値判断を整理する教材です。法的適合性や安全性の判定は行いません。');
});
})();
