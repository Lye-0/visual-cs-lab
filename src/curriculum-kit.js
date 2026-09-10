/* Curriculum expansion: explicit, bounded teaching models, never eval user code. */
(() => {
'use strict';
const L=CSL;
const K=L.curriculum={baselineIds:L.labs.map(l=>l.id),entries:[],tests:[],math:{},version:1};
const groups=[
 ['A',1,10,'数学・線形代数・数値解析','C03','数学・数学演習・情報基礎数学・数値解析','core','mit-linear'],
 ['B',11,17,'確率・統計・多変量解析','C03','確率・統計・多変量解析・データ線形分析法','core','mit-stats'],
 ['C',18,27,'離散数学・論理・計算理論','C02','情報基礎数学・離散数学・計算機科学入門','core','mit-discrete'],
 ['D',28,34,'情報理論・符号・データ表現','C01','情報理論・計算機科学入門','core','mit-info'],
 ['E',35,42,'プログラミング・オブジェクト指向','C04','プログラミング言語・プログラミング演習・オブジェクト指向論','core','ecmascript'],
 ['F',43,51,'データ構造・アルゴリズム','C06','データ構造とアルゴリズム・コンピュータプログラミング論','core','mit-algorithms'],
 ['G',52,58,'言語処理系・システムソフトウェア','C07','言語処理系・システムソフトウェア構成論','core','compiler-book'],
 ['H',59,65,'電気電子・論理回路','C08','電気電子回路・論理回路・計算機構成論','core','mit-circuits'],
 ['I',66,73,'計算機アーキテクチャ','C09','計算機構成論・計算機アーキテクチャ','core','nand-course'],
 ['J',74,81,'OS・並行・並列処理','C11','オペレーティングシステム・システムソフトウェア構成論','core','ostep'],
 ['K',82,87,'分散システム','C12','分散システム・情報通信ネットワーク','core','raft-paper'],
 ['L',88,94,'データモデル・データベース','C14','データモデル論・データベース','core','cs186'],
 ['M',95,108,'ネットワーク・情報通信','C13','コンピュータネットワーク・インターネット技術・情報通信ネットワーク','network','rfc9293'],
 ['N',109,121,'セキュリティ・暗号','C15','ネットワークセキュリティ・システムセキュリティ・暗号理論','security','nist-crypto'],
 ['O',122,132,'AI・データサイエンス・自然言語処理','C17','人工知能・データサイエンス・自然言語処理','core','d2l'],
 ['P',133,139,'信号処理・画像・音・CG','C18','フーリエ解析・デジタル信号処理・コンピュータグラフィックス','core','mit-signals'],
 ['Q',140,143,'IoT・組み込み・制御','C19','IoT・電気電子回路・開発演習','core','embedded-book'],
 ['R',144,153,'ソフトウェア工学・HCI・倫理・研究','C20','ソフトウェア工学・ユーザビリティ工学・ヒューマンインタフェース・情報倫理と情報技術','core','acm-ethics'],
 ['S',154,155,'Webアプリケーション','C13','インターネット技術・プログラミング演習・開発演習','core','whatwg']
].map(([id,start,end,name,area,course,track,source])=>({id,start,end,name,area,course,track,source}));
K.groups=groups;
const sources={
 'mit-linear':['MIT OCW 18.06SC: Linear Algebra','https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/'],
 'mit-calculus':['MIT OCW 18.02SC: Multivariable Calculus','https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/'],
 'mit-stats':['MIT OCW 18.05: Introduction to Probability and Statistics','https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/'],
 'mit-discrete':['MIT OCW 6.042J: Mathematics for Computer Science','https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/'],
 'mit-algorithms':['MIT OCW 6.006: Introduction to Algorithms','https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/'],
 'mit-info':['MIT OCW 6.441: Information Theory','https://ocw.mit.edu/courses/6-441-information-theory-spring-2016/'],
 'ecmascript':['ECMA-262: ECMAScript Language Specification','https://tc39.es/ecma262/'],
 'compiler-book':['Crafting Interpreters — Robert Nystrom','https://craftinginterpreters.com/'],
 'mit-circuits':['MIT OCW 6.002: Circuits and Electronics','https://ocw.mit.edu/courses/6-002-circuits-and-electronics-spring-2007/'],
 'nand-course':['Nand to Tetris — 著者によるコース','https://www.nand2tetris.org/course'],
 'ostep':['Operating Systems: Three Easy Pieces — Arpaci-Dusseau','https://pages.cs.wisc.edu/~remzi/OSTEP/'],
 'raft-paper':['In Search of an Understandable Consensus Algorithm — Ongaro / Ousterhout','https://raft.github.io/raft.pdf'],
 'lamport-paper':['Time, Clocks, and the Ordering of Events — Lamport','https://lamport.azurewebsites.net/pubs/time-clocks.pdf'],
 'cs186':['UC Berkeley CS186 — Database Systems notes','https://cs186berkeley.net/notes/'],
 'rfc9293':['RFC 9293 — TCP','https://www.rfc-editor.org/rfc/rfc9293.html'],
 'rfc8200':['RFC 8200 — IPv6','https://www.rfc-editor.org/rfc/rfc8200.html'],
 'rfc1034':['RFC 1034 — Domain Names','https://www.rfc-editor.org/rfc/rfc1034.html'],
 'rfc9000':['RFC 9000 — QUIC','https://www.rfc-editor.org/rfc/rfc9000.html'],
 'rfc9110':['RFC 9110 — HTTP Semantics','https://www.rfc-editor.org/rfc/rfc9110.html'],
 'rfc8446':['RFC 8446 — TLS 1.3','https://www.rfc-editor.org/rfc/rfc8446.html'],
 'rfc4303':['RFC 4303 — ESP','https://www.rfc-editor.org/rfc/rfc4303.html'],
 'nist-crypto':['NIST — Cryptographic Standards and Guidelines','https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines'],
 'owasp-asvs':['OWASP Application Security Verification Standard','https://owasp.org/www-project-application-security-verification-standard/'],
 'd2l':['Dive into Deep Learning — 著者による公開教科書','https://d2l.ai/'],
 'slp':['Speech and Language Processing — Jurafsky / Martin','https://web.stanford.edu/~jurafsky/slp3/'],
 'mit-signals':['MIT OCW 6.003: Signals and Systems','https://ocw.mit.edu/courses/6-003-signals-and-systems-fall-2011/'],
 'pbrt':['Physically Based Rendering — 著者による公開教科書','https://pbr-book.org/4ed/contents'],
 'embedded-book':['UT Austin — Embedded Systems Shape the World','https://users.ece.utexas.edu/~valvano/Volume1/'],
 'acm-ethics':['ACM Code of Ethics and Professional Conduct','https://www.acm.org/code-of-ethics'],
 'wcag':['W3C — WCAG 2.2','https://www.w3.org/TR/WCAG22/'],
 'whatwg':['WHATWG — HTML Living Standard','https://html.spec.whatwg.org/'],
 'fetch-standard':['WHATWG — Fetch','https://fetch.spec.whatwg.org/']
};
for(const [id,[name,url]]of Object.entries(sources))L.sources['gap-'+id]={name,url,detail:'仕組み・用語の参考。図、数値例、実装、問題は本サイト独自の教材です。学修要覧は科目名との対応にのみ用い、授業内容そのものの保証とは区別します。'};
K.clean=function clean(v){if(typeof v==='number'){if(Number.isNaN(v))throw Error('計算が数値として定まりません。入力とモデルの前提を確認してください。');return Number.isFinite(v)?v:v>0?'∞':'−∞';}if(Array.isArray(v))return v.map(clean);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,clean(x)]));return v===undefined?'—':v;};
K.f=(title,explain,visual,stats={},table=null)=>L.frame(title,explain,K.clean(visual),K.clean(stats),table?K.clean(table):null);
K.result=(frames,metrics={},conclusion)=>L.result(frames,K.clean(metrics),conclusion);
K.table=(headers,rows,extra={})=>({type:'curriculum-board',kind:'table',headers,rows:K.clean(rows),...extra});
K.cells=(rows,extra={})=>({type:'curriculum-board',kind:'cells',rows:K.clean(rows),...extra});
K.matrix=(matrix,extra={})=>({type:'curriculum-board',kind:'matrix',matrix:K.clean(matrix),...extra});
K.graph=(nodes,edges,extra={})=>({type:'curriculum-board',kind:'graph',nodes:K.clean(nodes),edges:K.clean(edges),...extra});
K.plot=(series,extra={})=>({type:'curriculum-board',kind:'plot',series:K.clean(series),...extra});
K.bits=(rows,extra={})=>({type:'curriculum-board',kind:'bits',rows:K.clean(rows),...extra});
K.code=(code,line,values={},extra={})=>({type:'curriculum-board',kind:'code',code,line,values:K.clean(values),...extra});
K.diagram=(items,extra={})=>({type:'curriculum-board',kind:'diagram',items:K.clean(items),...extra});
K.r=(key,label,value,min,max,step=1,unit='')=>L.ctrl.range(key,label,value,min,max,step,unit);
K.s=(key,label,value,options)=>L.ctrl.select(key,label,value,options);
K.t=(key,label,value,help='')=>L.ctrl.text(key,label,value,help);
K.b=(key,label,value=false)=>L.ctrl.toggle(key,label,value);
K.codeInput=(key,label,value,help='')=>L.ctrl.code(key,label,value,help);
K.numbers=(s,min=1,max=128)=>{const xs=String(s).trim().split(/[\s,、]+/).filter(Boolean).map(Number);if(xs.length<min||xs.length>max||xs.some(x=>!Number.isFinite(x)||Math.abs(x)>1e6))throw Error(`${min}〜${max}個の有限な数値をカンマで区切ってください（絶対値100万以下）。`);return xs;};
K.readMatrix=(s,max=6)=>{const a=String(s).trim().split(/[;\n]+/).filter(x=>x.trim()).map(x=>K.numbers(x,1,max));if(!a.length||a.length>max||a.some(x=>x.length!==a[0].length))throw Error(`同じ列数の行を ; で区切ってください。最大${max}行×${max}列です。`);return a;};
K.round=(v,p=6)=>Number.isFinite(v)?Number(v.toFixed(p)):v;
K.range=(n,f=i=>i)=>Array.from({length:n},(_,i)=>f(i));
K.sum=a=>a.reduce((s,v)=>s+v,0);
K.dot=(a,b)=>K.sum(a.map((x,i)=>x*b[i]));
K.norm=a=>Math.hypot(...a);
K.transpose=a=>a[0].map((_,j)=>a.map(row=>row[j]));
K.multiply=(a,b)=>{if(a[0].length!==b.length)throw Error('行列の内側の次元が一致していません。');const t=K.transpose(b);return a.map(row=>t.map(col=>K.dot(row,col)));};
K.identity=n=>K.range(n,i=>K.range(n,j=>+(i===j)));
K.rref=(input,columns=input[0].length)=>{const a=input.map(r=>r.slice()),steps=[],pivots=[];let row=0;for(let col=0;col<columns&&row<a.length;col++){let best=row;for(let i=row+1;i<a.length;i++)if(Math.abs(a[i][col])>Math.abs(a[best][col]))best=i;if(Math.abs(a[best][col])<1e-10)continue;if(best!==row){[a[best],a[row]]=[a[row],a[best]];steps.push({text:`行${row+1}と行${best+1}を交換`,matrix:a.map(r=>r.slice()),row});}const p=a[row][col];a[row]=a[row].map(v=>v/p);steps.push({text:`行${row+1}を ${K.round(p)} で割る`,matrix:a.map(r=>r.slice()),row});for(let i=0;i<a.length;i++){if(i===row)continue;const f=a[i][col];if(Math.abs(f)<1e-10)continue;a[i]=a[i].map((v,j)=>v-f*a[row][j]);steps.push({text:`行${i+1} − ${K.round(f)} × 行${row+1}`,matrix:a.map(r=>r.slice()),row:i});}pivots.push(col);row++;}return {matrix:a.map(r=>r.map(x=>Math.abs(x)<1e-10?0:x)),pivots,rank:row,steps};};
K.solve=(a,b)=>{const cols=a[0].length,r=K.rref(a.map((row,i)=>[...row,b[i]]),cols),bad=r.matrix.some(row=>row.slice(0,cols).every(x=>Math.abs(x)<1e-9)&&Math.abs(row[cols])>1e-9);const solution=Array(cols).fill(0);r.pivots.forEach((j,i)=>solution[j]=r.matrix[i][cols]);return {...r,status:bad?'解なし':r.rank<cols?'無数の解':'一意解',solution:bad?null:solution};};
K.inverse=a=>{if(a.length!==a[0].length)throw Error('正方行列を入力してください。');const n=a.length,r=K.rref(a.map((row,i)=>[...row,...K.identity(n)[i]]),n);return r.rank<n?null:r.matrix.map(row=>row.slice(n));};
K.eigenSym=a=>{const n=a.length;if(n!==a[0].length||a.some((r,i)=>r.some((x,j)=>Math.abs(x-a[j][i])>1e-8)))throw Error('実対称行列を入力してください。');let d=a.map(r=>r.slice()),v=K.identity(n);for(let it=0;it<80*n*n;it++){let p=0,q=n>1?1:0,m=0;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(d[i][j])>m){m=Math.abs(d[i][j]);p=i;q=j;}if(m<1e-11)break;const angle=.5*Math.atan2(2*d[p][q],d[q][q]-d[p][p]),c=Math.cos(angle),s=Math.sin(angle),J=K.identity(n);J[p][p]=c;J[q][q]=c;J[p][q]=s;J[q][p]=-s;d=K.multiply(K.multiply(K.transpose(J),d),J);v=K.multiply(v,J);}const order=K.range(n).sort((i,j)=>d[j][j]-d[i][i]);return {values:order.map(i=>d[i][i]),vectors:v.map(row=>order.map(i=>row[i]))};};
K.svd=a=>{const {values,vectors:V}=K.eigenSym(K.multiply(K.transpose(a),a)),s=values.map(x=>Math.sqrt(Math.max(0,x))),av=K.multiply(a,V),U=av.map(row=>row.map((x,i)=>s[i]>1e-9?x/s[i]:0));return {U,s,V};};
K.mean=a=>K.sum(a)/a.length;
K.variance=(a,sample=true)=>a.length>(sample?1:0)?K.sum(a.map(x=>(x-K.mean(a))**2))/(a.length-(sample?1:0)):0;
K.normal=(random)=>Math.sqrt(-2*Math.log(Math.max(random(),1e-12)))*Math.cos(2*Math.PI*random());
K.normalCDF=x=>{const t=1/(1+.2316419*Math.abs(x)),d=Math.exp(-x*x/2)/Math.sqrt(2*Math.PI),p=1-d*t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));return x>=0?p:1-p;};
K.quantile=p=>{if(p<=0)return -Infinity;if(p>=1)return Infinity;let lo=-10,hi=10;for(let i=0;i<80;i++){const m=(lo+hi)/2;if(K.normalCDF(m)<p)lo=m;else hi=m;}return (lo+hi)/2;};
K.logGamma=z=>{const co=[676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.507343278686905,-.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];if(z<.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-K.logGamma(1-z);z--;let x=.9999999999998099;co.forEach((c,i)=>x+=c/(z+i+1));const t=z+7.5;return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x);};
K.betaI=(x,a,b)=>{if(x<=0)return 0;if(x>=1)return 1;const cf=(a,b,x)=>{let c=1,d=1-(a+b)*x/(a+1);if(Math.abs(d)<1e-30)d=1e-30;d=1/d;let h=d;for(let m=1;m<=250;m++){let aa=m*(b-m)*x/((a+2*m-1)*(a+2*m));d=1+aa*d;if(Math.abs(d)<1e-30)d=1e-30;c=1+aa/c;if(Math.abs(c)<1e-30)c=1e-30;d=1/d;h*=d*c;aa=-(a+m)*(a+b+m)*x/((a+2*m)*(a+2*m+1));d=1+aa*d;if(Math.abs(d)<1e-30)d=1e-30;c=1+aa/c;if(Math.abs(c)<1e-30)c=1e-30;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<1e-12)break;}return h;};const f=Math.exp(K.logGamma(a+b)-K.logGamma(a)-K.logGamma(b)+a*Math.log(x)+b*Math.log1p(-x));return x<(a+1)/(a+b+2)?f*cf(a,b,x)/a:1-f*cf(b,a,1-x)/b;};
K.tCDF=(t,df)=>{const x=df/(df+t*t),b=K.betaI(x,df/2,.5);return t>=0?1-b/2:b/2;};
K.gammaP=(a,x)=>{if(x<=0)return 0;const scale=Math.exp(-x+a*Math.log(x)-K.logGamma(a));if(x<a+1){let sum=1/a,term=sum;for(let i=1;i<500;i++){term*=x/(a+i);sum+=term;if(Math.abs(term)<Math.abs(sum)*1e-13)break;}return sum*scale;}let b=x+1-a,c=1e30,d=1/b,h=d;for(let i=1;i<500;i++){const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<1e-30)d=1e-30;c=b+an/c;if(Math.abs(c)<1e-30)c=1e-30;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<1e-13)break;}return 1-h*scale;};
K.choose=(n,k)=>{if(k<0||k>n)return 0;k=Math.min(k,n-k);let v=1;for(let i=1;i<=k;i++)v*=((n-i+1)/i);return v;};
K.entropy=p=>-K.sum(p.filter(x=>x>0).map(x=>x*Math.log2(x)));
K.softMax=xs=>{const max=Math.max(...xs),e=xs.map(x=>Math.exp(x-max)),sum=K.sum(e);return e.map(x=>x/sum);};
K.mod=(x,m)=>((x%m)+m)%m;
K.define=(number,d,model)=>{
 const group=groups.find(g=>number>=g.start&&number<=g.end),tag='GAP-'+String(number).padStart(3,'0'),id=tag.toLowerCase();
 if(!group||K.entries.some(x=>x.number===number))throw Error('重複または不正なGAP: '+number);
 for(const key of ['title','question','scope'])if(!d[key])throw Error(tag+' '+key+' が必要です');
 if(d.intro?.length!==5||d.intro.some(x=>typeof x!=='string'||x.length<12))throw Error(tag+' 固有の説明5項目が必要です');
 if(!d.controls?.length||!d.alt?.[1]||d.quiz?.length!==5||!d.topics?.length)throw Error(tag+' 操作・比較・問題・細目が必要です');
 const [why,idea,example,observe,pitfall]=d.intro,[question,correct,wrong1,wrong2,explanation]=d.quiz,answer=number%3,options=[wrong1,wrong2];options.splice(answer,0,correct);
 const reading={why,idea,example,pitfall,focus:(d.focus||d.controls.slice(0,2).map(c=>c.key)),nextLabel:d.nextLabel||'次の計算・判断を確かめる',terms:d.topics.slice(0,5).map(t=>({term:t[0],definition:t[1]})),notes:'',sections:d.topics};
 L.register(id,(params,lab)=>model(params,lab));
 const lab=L.add({id,title:d.title,unit:d.title,summary:d.summary||idea,question:d.question,engine:id,area:d.area||group.area,course:d.course||group.course,track:d.track||group.track,topic:d.topic||'',level:d.level||2,minutes:d.minutes||15,gapId:tag,gapGroup:group.id,scope:d.scope,limits:d.scope+' 入力可能な大きさと方式に限定した教材です。大学の公式シラバス・実装規格の完全な再現とは区別します。',sources:(d.sources||[group.source]).map(id=>'gap-'+id),prereq:d.prereq||[],controls:d.controls,guide:[example,observe,pitfall],lesson:idea,reading,keywords:[tag,group.name,...d.topics.map(t=>t[0]),...(d.keywords||[])],exploration:{label:d.alt[0],patch:d.alt[1]},observe,challenge:{question,options,answer,explanation},coverage:{status:'implemented-model',targets:d.topics.map(([name,description,formula])=>({name,description,formula:formula||''})),notes:'科目名との対応は学修要覧を参考にした推定です。モデルの範囲を越えた実機・一般証明の網羅を表すものではありません。'}});
 L.lessonDrafts[id]={...reading};
 K.entries.push({number,id,tag,title:d.title,group:group.id,area:lab.area,scope:d.scope,targets:lab.coverage.targets});
 for(const [params,expected] of d.tests||[])K.tests.push({id,params,expected});
 return lab;
};
})();
