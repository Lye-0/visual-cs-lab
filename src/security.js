(() => {
'use strict';
const L=CSL,{register:R,frame:F,result:out,clone,round,rng,modPow,gcd,invMod}=L;
const enc=new TextEncoder();
const hex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
const fromHex=s=>{if(!/^[0-9a-f]+$/i.test(s)||s.length%2)throw Error('偶数桁の16進数を入力してください。');return Uint8Array.from(s.match(/../g),x=>parseInt(x,16));};
const subtle=()=>{if(!globalThis.crypto?.subtle)throw Error('この暗号実験にはWeb Crypto対応ブラウザが必要です。localhostまたはHTTPSで開いてください。');return crypto.subtle;};
const seq=(actors,messages)=>messages.map((m,i)=>F(m[2],m[3],{type:'sequence',actors,messages:messages.slice(0,i+1).map(x=>({from:x[0],to:x[1],label:x[2],failed:x[4]===false}))}));
R('threat',(p)=>{
 const exposed=p.publicData&&!p.encryption,alter=p.editable&&!p.integrity,unavailable=!p.redundant&&p.outage;
 return out([F('守るものと境界を決める','機密性・完全性・可用性は違う性質です。暗号化だけで、削除や停止まで防げるわけではありません。',{type:'zones',zones:[{name:'信頼された側',items:['利用者','顧客データ']},{name:'境界の外側',items:['閲覧者','外部通信']}],linked:p.publicData}),F('設定した脅威に対する結果','この固定シナリオの前提から、3つの性質への影響を別々に判定します。実システムの総合リスク評価ではありません。',{type:'cells',rows:[{label:'機密性',values:[exposed?'内容が閲覧可能':'今回の漏えい条件なし']},{label:'完全性',values:[alter?'未検証の変更を許可':'今回の改ざんを検知/禁止']},{label:'可用性',values:[unavailable?'停止':'サービス継続']}]} )],{'機密性':exposed?'影響あり':'今回の影響なし','完全性':alter?'影響あり':'今回の影響なし','可用性':unavailable?'影響あり':'今回の影響なし'});
});
R('modular',(p,lab)=>{
 if(lab.variant==='euclid'){
 let a=p.a,b=p.b,frames=[];while(b){let q=Math.floor(a/b),r=a%b;frames.push(F(`${a} = ${b} × ${q} + ${r}`,'最大公約数は、大きい数を小さい数で割った余りを使って求められます。余りが0になるまで繰り返します。',{type:'cells',rows:[{label:'a',values:[a]},{label:'b',values:[b]},{label:'余り',values:[r]}]}));[a,b]=[b,r];}return out(frames,{'最大公約数':a,'互いに素':a===1?'はい':'いいえ'});
 }
 const a=p.a,m=p.modulus,rem=((a%m)+m)%m,inv=gcd(a,m)===1?invMod(rem,m):null;
 return out([F('整数を同じ余りでまとめる',`${a}を${m}で割った余りは${rem}です。剰余の世界では差が${m}の倍数になる数を同じものとして扱います。`,{type:'modclock',modulus:m,active:rem},{'a mod m':rem}),F('掛け算の逆を考える',inv===null?'この組み合わせには乗法逆元がありません。aとmが互いに素である必要があります。':`${a} × ${inv} ≡ 1 (mod ${m})。逆元を使うと、剰余の世界で割り算に相当する操作ができます。`,{type:'cells',rows:[{label:'gcd(a,m)',values:[gcd(a,m)]},{label:'乗法逆元',values:[inv??'なし']}]} )],{'余り':rem,'最大公約数':gcd(a,m),'逆元':inv??'なし'});
});
R('aes',async(p)=>{
 let keyBytes=fromHex(p.key),iv=fromHex(p.nonce);if(![16,24,32].includes(keyBytes.length))throw Error('AES鍵は16・24・32バイト（32・48・64桁の16進数）にしてください。');if(iv.length!==12)throw Error('この実験のnonceは12バイト（24桁の16進数）です。');
 let key=await subtle().importKey('raw',keyBytes,'AES-GCM',false,['encrypt','decrypt']),plain=enc.encode(p.message),sealed=new Uint8Array(await subtle().encrypt({name:'AES-GCM',iv,tagLength:128},key,plain)),received=sealed.slice();if(p.tamper)received[0]^=1;let valid=true,decrypted='';try{decrypted=new TextDecoder().decode(await subtle().decrypt({name:'AES-GCM',iv,tagLength:128},key,received));}catch{valid=false;}
 return out([F('AES-GCMで暗号化する','ブラウザのWeb Crypto APIで実際に計算します。表示される鍵・nonceは実験用です。同じ鍵とnonceの再使用は実用途で禁止してください。',{type:'cells',rows:[{label:'平文 UTF-8',values:[p.message]},{label:'暗号文',values:[hex(sealed.slice(0,-16))||'（空）']},{label:'認証タグ',values:[hex(sealed.slice(-16))]}]},{'平文':plain.length+' B','タグ':'16 B'}),F(p.tamper?'受信データの1ビットを変える':'暗号文をそのまま渡す',p.tamper?'暗号文と認証タグを連結した受信データの先頭1ビットを反転させます。復号時に認証タグを検証します。':'暗号文に変更はありません。',{type:'bitrow',bits:[...received.slice(0,8)].map(x=>x.toString(2).padStart(8,'0')).join(''),active:p.tamper?7:-1}),F(valid?'復号と認証に成功':'改ざんを検知して拒否',valid?'認証に成功し、元の平文を得ました。':'Web Cryptoの復号が認証エラーになりました。改ざんした内容を正しい平文として使いません。',{type:'flow',nodes:['受信データ','GCM検証',valid?decrypted||'空の平文':'認証エラー'],active:2,failed:!valid})],{'鍵長':keyBytes.length*8+' bit','暗号文＋タグ':sealed.length+' B','検証':valid?'成功':'失敗'});
});
R('hash',async(p,lab)=>{
 let bytes=enc.encode(p.message),changed=bytes.slice();if(!bytes.length&&p.flip)throw Error('空の入力には反転するビットがありません。1文字以上入力するか、入力ビットの反転をオフにしてください。');if(p.flip)changed[0]^=1;
 let hash1,hash2;if(lab.variant==='hmac'){let key=await subtle().importKey('raw',enc.encode(p.key||'demo-key'),{name:'HMAC',hash:'SHA-256'},false,['sign']);hash1=new Uint8Array(await subtle().sign('HMAC',key,bytes));hash2=new Uint8Array(await subtle().sign('HMAC',key,p.flip?changed:bytes));}else{hash1=new Uint8Array(await subtle().digest('SHA-256',bytes));hash2=new Uint8Array(await subtle().digest('SHA-256',p.flip?changed:bytes));}
 let diff=0;for(let i=0;i<hash1.length;i++)diff+=(hash1[i]^hash2[i]).toString(2).replaceAll('0','').length;
 const name=lab.variant==='hmac'?'HMAC-SHA-256':'SHA-256';
 return out([F(`${name}を計算`,lab.variant==='hmac'?'鍵付きのメッセージ認証コードを計算します。共有鍵を知る当事者が検証できます。署名とは違い、同じ共有鍵の所有者は生成もできます。':'固定長のダイジェストを計算します。ハッシュだけでは送信者の認証や秘密の保護にはなりません。',{type:'digest',original:hex(hash1),changed:hex(hash2),flip:p.flip},{'出力長':'256 bit'}),F('入力の変化と出力を比較','1ビットを変えたとき、出力のどの部分が変化するかを確認します。変化したビット数が毎回ちょうど半分になる保証はありません。',{type:'bitrow',bits:[...hash2].map(x=>x.toString(2).padStart(8,'0')).join(''),changedBits:[...hash2].flatMap((x,i)=>Array.from({length:8},(_,j)=>((x^hash1[i])>>(7-j))&1))},{'変化した出力ビット':diff})],{'方式':name,'入力長':bytes.length+' B','出力長':'256 bit','異なるビット':diff});
});
R('dh',(p)=>{
 const prime=23,g=5,a=p.a,b=p.b,A=modPow(g,a,prime),B=modPow(g,b,prime),sa=modPow(B,a,prime),sb=modPow(A,b,prime);
 let frames=seq(['Alice','公開通信路','Bob'],[[0,1,`A = 5^${a} mod 23 = ${A}`,'秘密aは送らず、計算した公開値Aを送ります。'],[2,1,`B = 5^${b} mod 23 = ${B}`,'Bobも秘密bから公開値Bを作ります。'],[1,0,`B = ${B}`,'Aliceは受信したBを自分の秘密aで計算します。'],[1,2,`A = ${A}`,'Bobは受信したAを自分の秘密bで計算します。']]);
 frames.push(F('両側で同じ共有値になる','数学的な一致を小さな数で確かめています。p=23は安全ではありません。鍵共有だけでは相手の身元を保証せず、認証も必要です。',{type:'cells',rows:[{label:'Alice側 B^a mod p',values:[sa]},{label:'Bob側 A^b mod p',values:[sb]}]}));return out(frames,{'公開値 A':A,'公開値 B':B,'共有値':sa,'一致':sa===sb?'はい':'いいえ'});
});
R('rsa',(p)=>{
 const n=61*53,phi=60*52,e=17,d=2753,m=p.message,c=modPow(m,e,n),recovered=modPow(c,d,n);
 return out([F('公開鍵と秘密鍵を分ける','教材用にp=61、q=53を使います。n=3233、φ(n)=3120。e=17に対して逆元d=2753です。',{type:'cells',rows:[{label:'公開鍵 (n,e)',values:[n,e]},{label:'秘密指数 d',values:[d]}]}),F('公開指数で変換する','c = m^e mod n を繰り返し二乗法で計算します。実用のRSA暗号には安全なパディング等が必要です。',{type:'flow',nodes:[String(m),'^17 mod 3233',String(c)],active:2}),F('秘密指数で戻す','m = c^d mod n。これは教科書的な小さいRSAの数式を確認する実験であり、実用暗号ではありません。',{type:'flow',nodes:[String(c),'^2753 mod 3233',String(recovered)],active:2})],{'平文整数':m,'変換値':c,'復元':recovered,'一致':m===recovered?'はい':'いいえ'});
});
R('signature',async(p)=>{
 const keys=await subtle().generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']),data=enc.encode(p.message),sig=await subtle().sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,data),input=enc.encode(p.tamper?p.message+'!':p.message),valid=await subtle().verify({name:'ECDSA',hash:'SHA-256'},keys.publicKey,sig,input);
 return out([F('秘密鍵で署名する','Web CryptoのECDSA P-256を使用します。鍵は実験ごとに生成され、このページから送信しません。鍵や署名が毎回異なるのは正常です。',{type:'cells',rows:[{label:'文書',values:[p.message]},{label:'署名',values:[hex(sig)]}]}),F('公開鍵で検証する',valid?'文書・署名・公開鍵の関係が正しいと検証できました。':'文書を変更したので検証に失敗しました。署名は文書を暗号化するものではありません。',{type:'flow',nodes:['文書＋署名','公開鍵で検証',valid?'VALID':'INVALID'],active:2,failed:!valid})],{'方式':'ECDSA / P-256','署名長':sig.byteLength+' B','検証':valid?'成功':'失敗'});
});
R('tls',(p)=>{
 const valid=p.hostname&&p.date&&p.trusted&&p.proof;const messages=[[0,1,'ClientHello + key_share','対応方式と鍵共有用の公開値を送ります。'],[1,0,'ServerHello + key_share','共通の鍵素材を計算できるようになります。以後の主要なハンドシェイクは暗号化されます。'],[1,0,'EncryptedExtensions / Certificate','この教材はTLS 1.3の証明書認証・初回接続の基本フローです。0-RTTやPSKなどは省略します。']];
 const checks=[['名前が一致',p.hostname],['有効期間内',p.date],['信頼する認証局へつながる',p.trusted],['秘密鍵による証明が正しい',p.proof]];
 let frames=seq(['ブラウザ','サーバー'],messages);frames.push(F('証明書と秘密鍵の所持を検証','暗号化できることと、相手を信頼できることは別です。名前、期間、信頼経路、CertificateVerifyによる秘密鍵の所持を確認します。',{type:'checks',items:checks.map(([label,ok])=>({label,ok}))},{'成功した確認':checks.filter(c=>c[1]).length}));frames.push(F(valid?'Finishedを検証してアプリデータへ':'接続を中止する',valid?'双方がハンドシェイクの完全性を確認した後、アプリケーションデータを送ります。':'証明書や鍵の確認が失敗しました。検証を無効化して通すのではなく、原因を直す必要があります。',{type:'flow',nodes:['鍵共有','相手の検証',valid?'保護された通信':'中止'],active:2,failed:!valid}));return out(frames,{'名前':p.hostname?'一致':'不一致','信頼':p.trusted?'あり':'なし','接続':valid?'成功':'中止'});
});
R('password',async(p)=>{
 const key=await subtle().importKey('raw',enc.encode(p.password),{name:'PBKDF2'},false,['deriveBits']),salt=enc.encode(p.salt),bits=await subtle().deriveBits({name:'PBKDF2',salt,iterations:p.iterations,hash:'SHA-256'},key,256),otherSalt=enc.encode(p.sameSalt?p.salt:p.salt+'-B'),other=await subtle().deriveBits({name:'PBKDF2',salt:otherSalt,iterations:p.iterations,hash:'SHA-256'},key,256);
 return out([F('同じパスワードを異なるsaltで処理','PBKDF2-HMAC-SHA-256をブラウザで実計算します。saltは秘密にするためでなく、同じパスワードの結果が一律になるのを防ぐためです。',{type:'cells',rows:[{label:'ユーザーAの結果',values:[hex(bits)]},{label:'ユーザーBの結果',values:[hex(other)]}]}),F('反復回数の役割を見る','計算コストを増やしますが、この教材の小さい回数を実サービスの推奨設定として使わないでください。実験用の架空パスワードだけを使います。',{type:'bars',values:[p.iterations,1],labels:['設定した反復回数','単一処理の比較目安']})],{'反復回数':p.iterations,'salt':p.sameSalt?'同じ':'異なる','結果の一致':hex(bits)===hex(other)?'一致':'不一致'});
});
R('mfa',(p)=>{
 const pass=p.password,second=p.factor,phishingResistant=p.kind==='passkey',success=pass&&second,stolen=p.phishing&&p.kind==='otp';
 return out([F('認証の要素を確認','この教材ではパスワードと追加要素の両方を要求する方針です。パスキーの実運用はパスワードなしの場合もあります。',{type:'checks',items:[{label:'パスワードの確認',ok:pass},{label:'追加要素の確認',ok:second}]}),F('フィッシングとの関係を比較',phishingResistant?'パスキーはRP IDなどに結び付いた検証を行います。ここでは別サイトへ同じように応答できないという関係をモデル化します。':'OTPは追加要素ですが、中継型フィッシング等への耐性はパスキーと同じではありません。',{type:'flow',nodes:['本人','認証要素',success?'認証成功':'拒否'],active:2,failed:!success})],{'認証結果':success?'許可':'拒否','方式':p.kind,'中継シナリオ':p.phishing?(stolen?'OTP中継を想定':'別RPのため拒否を想定'):'未実施'});
});
R('access',(p,lab)=>{
 if(lab.variant==='posix'){
  const mode=String(p.mode),digits=mode.split('').map(Number);let idx=p.who==='owner'?0:p.who==='group'?1:2,needed=p.operation==='read'?4:p.operation==='write'?2:1,allow=(digits[idx]&needed)!==0;
  return out([F('利用者に対応する権限欄を選ぶ','所有者、グループ、その他のどれに該当するかを決めます。rootの特権やACL等を省略した通常ファイルのモデルです。',{type:'cells',rows:digits.map((d,i)=>({label:['owner','group','other'][i],values:[d&4?'r':'-',d&2?'w':'-',d&1?'x':'-'],active:i===idx}))}),F(allow?'操作を許可':'操作を拒否','選んだ欄のビットが要求する操作を許しているか判定します。ディレクトリのxなど、意味が違う場合は対象外です。',{type:'flow',nodes:[p.who,p.operation,allow?'ALLOW':'DENY'],active:2,failed:!allow})],{'mode':mode,'適用欄':p.who,'判定':allow?'許可':'拒否'});
 }
 let same=p.owner,role=p.role,deny=p.explicitDeny,allow=!deny&&(role==='admin'||p.operation==='read'&&role!=='guest'||same&&role==='member');
 return out([F('認証と認可を区別する','本人だと分かっても、すべてのデータを使えるわけではありません。この教材の役割・所有者ルールを評価します。',{type:'zones',zones:[{name:'要求主体',items:[role,same?'自分のデータ':'他人のデータ']},{name:'操作対象',items:[p.operation,'document 42']}],linked:allow}),F(allow?'この操作を許可':'この操作は拒否','優先順位: 明示拒否 → admin → member/editorの読取り → 所有者memberの操作 → 既定拒否。教材の架空ポリシーです。',{type:'checks',items:[{label:'明示拒否されていない',ok:!deny},{label:'役割・所有権ルールを満たす',ok:allow}]})],{'主体':role,'操作':p.operation,'判定':allow?'ALLOW':'DENY'});
});
R('session',(p)=>{
 let expired=p.now>=p.expiry,checked=p.strategy==='server'||p.revocationCheck,revoked=p.logout&&checked,allowed=p.signed&&!expired&&!revoked;
 return out([F('トークンまたはセッションを提示','セッション型はサーバー側の状態を参照します。自己完結したトークンの検証だけでは、ログアウト後の失効情報を知らない場合があります。',{type:'sequence',actors:['ブラウザ','API','状態ストア'],messages:[{from:0,to:1,label:'認証情報を送る'},...(checked?[{from:1,to:2,label:'失効/セッション状態を確認'}]:[])]}),F('受け入れ条件を評価','署名が正しい、有効期限内、必要な失効確認を通るという条件を個別に見ます。JWTなら常にログアウト不能という意味ではありません。',{type:'checks',items:[{label:'署名・認証情報が正しい',ok:p.signed},{label:'有効期限内',ok:!expired},{label:'確認した状態で未失効',ok:!revoked}]} )],{'現在時刻':p.now,'期限':p.expiry,'状態ストア照会':checked?'あり':'なし','受入れ':allowed?'許可':'拒否'});
});
R('oauth',(p)=>{
 const ok=p.state&&p.pkce&&p.redirect;let messages=[[0,1,'認可要求 + state + code_challenge','クライアントが認可サーバーへ利用者を移動させます。OAuthは認可、OIDCはその上の認証層です。'],[1,0,'authorization code','認可コードを登録済みredirect URIへ戻します。'],[0,1,'code + code_verifier','コードをトークンと交換します。PKCEの対応が正しいか検証します。']];let frames=seq(['クライアント','認可サーバー'],messages);frames.push(F('応答と要求を結び付ける','この教材ではstate照合、PKCE、redirect URI照合をすべて必須にした方針です。方式ごとの実仕様全体ではありません。',{type:'checks',items:[{label:'state一致',ok:p.state},{label:'PKCE検証',ok:p.pkce},{label:'登録redirect URI',ok:p.redirect}]}));return out(frames,{'フロー':'Authorization Code + PKCE','トークン発行':ok?'成功':'拒否'});
});
R('cors',(p)=>{
 const same=p.origin==='same',preflight=!same&&p.request==='json',credentials=p.credentials,allowOrigin=same||p.allowOrigin==='match'||p.allowOrigin==='star'&&!credentials,credOK=!credentials||p.allowCredentials,preflightOK=!preflight||(allowOrigin&&credOK&&p.allowMethod),sent=preflightOK,authorized=sent&&p.authorized,readable=sent&&(same||allowOrigin&&credOK);
 let messages=[];if(preflight)messages.push([0,1,'OPTIONS / preflight','非単純なクロスオリジン要求の前に許可を確認します。']);if(sent)messages.push([0,1,p.request==='simple'?'単純GET':'POST application/json','リクエストを送信します。サーバーはブラウザの読み取り可否と無関係に認可を判断します。'],[1,0,authorized?'200 response':'403 response','サーバー側の認可結果です。CORSは認可の代わりではありません。']);else messages.push([0,0,'本リクエストを送らない','preflightの確認に失敗したので、今回の本リクエストは送信しません。']);
 let frames=seq(['ブラウザ','APIサーバー'],messages);frames.push(F('送信・処理・読み取りを分ける','単純要求は、応答をJavaScriptから読めなくても送信される場合があります。credentials付き要求ではAccess-Control-Allow-Origin: *は使えません。',{type:'checks',items:[{label:'本リクエストを送った',ok:sent},{label:'サーバーが操作を許可した',ok:authorized},{label:'JSが応答を読める',ok:readable}]}));
 return out(frames,{'事前確認':preflight?'必要':'不要','本要求の送信':sent?'あり':'なし','サーバー処理':authorized?'許可':'拒否/未到達','JSで読取り':readable?'可能':'不可'});
});
R('websecurity',(p,lab)=>{
 const kind=lab.variant;let safe=false,why='',nodes=[],rules=[];
 if(kind==='sql'){safe=p.parameterized||!p.untrusted;why=p.parameterized?'SQL文の構造と入力値を別々に渡す方針です。入力をSQLの構文として解釈しません。':'文字列連結でSQL文を作るモデルです。構文を含む入力がコードとデータの境界を越える条件を表現します。';nodes=['外部入力',p.parameterized?'バインドされた値':'SQL文字列に連結',safe?'意図した検索':'構造が変化'];rules=[['パラメーター化',p.parameterized],['構文を含む架空入力',p.untrusted]];}
 if(kind==='xss'){safe=p.escape||p.csp||!p.untrusted;why=p.escape?'このモデルではHTMLのテキスト文脈でエスケープします。JavaScript/URL/CSS等には別の対策が必要です。':p.csp?'この固定インラインスクリプト例はCSPで遮断します。CSPだけで全XSSを防げるとは言いません。':'未信頼の入力が実行可能なHTMLとして挿入される条件をモデル化しています。実際のスクリプトはこの教材では実行しません。';nodes=['入力',p.escape?'テキストとして出力':'HTMLとして解釈',safe?'実行なし':'実行に至る条件'];rules=[['文脈に合う出力処理',p.escape],['今回の実行をCSPで遮断',p.csp]];}
 if(kind==='csrf'){safe=p.token||p.sameSite||!p.untrusted;why='Cookieが自動で添付される架空のクロスサイトPOSTを扱います。CSRFトークン検証またはこの条件でのSameSite制限が防御になります。CORSとは別問題です。';nodes=['外部サイト','Cookie付きPOST',safe?'変更を拒否':'意図しない変更'];rules=[['CSRF token照合',p.token],['この条件でCookie非送信',p.sameSite]];}
 if(kind==='ssrf'){safe=p.allowlist||!p.untrusted;why='サーバーが外部入力のURLを取得するモデルです。ここでは完全一致の許可先リストで内部アドレスへの到達を防ぎます。実装にはリダイレクトやDNS解決後の検証も必要です。';nodes=['利用者の入力','サーバーがURL取得',safe?'許可先だけ':'内部宛に到達'];rules=[['許可先限定',p.allowlist],['架空の内部宛URL',p.untrusted]];}
 if(kind==='path'){safe=p.normalize||!p.untrusted;why='正規化した後に許可されたルート配下か確認するモデルです。単純な文字列置換だけで十分とはしません。ファイルは実際には読みません。';nodes=['パス文字列','正規化＋ルート判定',safe?'許可範囲内':'範囲外アクセス'];rules=[['正規化後の包含判定',p.normalize],['範囲外を指す入力',p.untrusted]];}
 return out([F('未信頼データが通る場所を見る',why,{type:'flow',nodes,active:1}),F(safe?'今回の問題は成立しない':'今回の問題が成立する','教材内の条件式の結果です。任意のコード、SQL、URLを実行する脆弱なサーバーではありません。修正を切り替え、結果を比較してください。',{type:'checks',items:rules.map(([label,ok])=>({label,ok}))})],{'対象':kind.toUpperCase(),'今回の結果':safe?'防御/成立条件なし':'問題が成立','実環境への接続':'なし'});
});
R('firewall',(p)=>{
 const rules=[{name:'管理網のSSH',source:'admin',port:22,action:'ALLOW'},{name:'公開HTTPS',source:'any',port:443,action:'ALLOW'},{name:'内部網のDNS',source:'internal',port:53,action:'ALLOW'}];if(p.blockHttps)rules.unshift({name:'臨時HTTPS遮断',source:'any',port:443,action:'DENY'});
 if(p.established)rules.unshift({name:'ESTABLISHEDの戻り',source:'any',port:'any',action:'ALLOW'});
 const match=rules.find(r=>(r.source==='any'||r.source===p.zone)&&(r.port==='any'||r.port===p.port)),allowed=match?.action==='ALLOW';
 const frames=[F('上から順に規則と比較','最初に一致した規則を採用し、一致しなければ拒否します。ステートフル判定は入力した接続状態を信頼する簡略モデルです。',{type:'flow',nodes:[p.zone+':client','Firewall',':'+p.port],active:1,failed:!allowed},{}, {headers:['順序','条件','動作'],rows:[...rules.map((r,i)=>[i+1,`${r.source} → ${r.port}`,r.action]),['最後','その他すべて','DENY']]}),F(allowed?'通信を許可':'通信を拒否',match?`「${match.name}」に一致しました。`:'一致する許可規則がないため、既定の拒否が適用されます。',{type:'flow',nodes:[p.zone,match?.name||'DEFAULT',allowed?'ALLOW':'DENY'],active:2,failed:!allowed})];
 return out(frames,{'送信元ゾーン':p.zone,'宛先ポート':p.port,'一致規則':match?.name||'既定拒否','結果':allowed?'ALLOW':'DENY'});
});
R('buffer',(p)=>{
 const capacity=p.capacity,written=p.length,oob=written>capacity,freed=p.freed;
 return out([F('メモリ領域を確保する','長さを持つバッファの教材です。配列の実体と長さ情報を区別します。',{type:'allocation',capacity:Math.max(capacity,written)+2,blocks:[{id:0,start:0,size:capacity}],free:[]},{'確保サイズ':capacity}),F('書き込みを要求する',freed?'既に解放した領域への書込みです。長さが収まっていても無効な参照です。':oob?'確保した範囲を超えています。境界確認を入れて、書込み前に検出します。':'確保した範囲内であり、まだ解放されていません。',{type:'cells',rows:[{label:'領域内',values:Array.from({length:Math.min(capacity,24)},(_,i)=>i<written?'data':'空')},{label:'範囲外',values:oob?[`${written-capacity}セル超過`]:['なし']}]})],{'領域':capacity,'書込要求':written,'判定':freed?'解放後アクセス':oob?'範囲外':'範囲内','境界検査':p.check?(freed||oob?'拒否':'許可'):'検査しない設定'},'検査を無効にしても、教材は実メモリを書き壊しません。未定義動作の具体的な結果を断定しません。');
});
R('pipeline-security',(p)=>{
 const issue=p.issue,checks=[{label:'静的解析',enabled:p.static,detect:['unsafe input','secret'].includes(issue)},{label:'依存関係照合',enabled:p.dependencies,detect:issue==='known dependency'},{label:'テスト',enabled:p.tests,detect:issue==='regression'},{label:'レビュー',enabled:p.review,detect:['permission','secret'].includes(issue)}];let found=checks.filter(x=>x.enabled&&x.detect);return out(checks.map((x,i)=>F(x.label,x.enabled?(x.detect?'この教材の既知パターンに一致して検出しました。':'今回の問題はこの検査の対象条件に一致しません。'):'この検査は実行しない設定です。',{type:'checks',items:checks.slice(0,i+1).map(x=>({label:x.label+(x.enabled?'':' / 無効'),ok:x.enabled&&x.detect}))})),{'検出数':found.length,'実行した検査':checks.filter(x=>x.enabled).length,'結果':found.length?'検出':'今回の検査では未検出'},'架空の検査器の検出表です。「検出なし」は安全の証明ではなく、実際の静的解析や脆弱性DB照合は行いません。');
});
R('cloud',(p)=>{
 let explicit=p.deny,allow=!explicit&&(p.public||p.role==='reader'||p.role==='admin'),write=!explicit&&p.role==='admin';return out([F('ポリシーを重ねて評価する','公開設定や主体の許可があっても、この教材では明示的な拒否を優先します。特定クラウドのIAM仕様全体を実装しているわけではありません。',{type:'zones',zones:[{name:'主体',items:[p.role]},{name:'保存領域',items:[p.public?'public':'private',p.deny?'explicit deny':'no deny']}],linked:allow}),F('操作ごとに結果を分ける','読めることと書けることは異なります。最小権限で必要な操作だけを与える構成を試してください。',{type:'checks',items:[{label:'read allowed',ok:allow},{label:'write allowed',ok:write}]})],{'読取り':allow?'許可':'拒否','書込み':write?'許可':'拒否','公開':p.public?'有効':'無効'});
});
R('detection',(p)=>{
 let random=rng(p.seed),data=Array.from({length:100},(_,i)=>{let actual=i<p.base,score=actual?25+random()*75:random()*80;return {actual,score,positive:score>=p.threshold};});let tp=0,fp=0,fn=0,tn=0;for(const x of data){if(x.actual)x.positive?tp++:fn++;else x.positive?fp++:tn++;}
 let precision=tp+fp?tp/(tp+fp):null,recall=tp+fn?tp/(tp+fn):null;
 return out([F('100件の架空イベントを採点する','点数は安全性の真実ではありません。この教材ではラベルが分かる合成データを使い、閾値の影響を検証します。',{type:'scatter',points:data.map((x,i)=>({x:i,y:x.score,cluster:x.actual?1:0})),threshold:p.threshold,thresholdAxis:'y',legend:['正常（正解ラベル）','異常（正解ラベル）'],xLabel:'イベントの番号',yLabel:'異常スコア'},{'閾値':p.threshold}),F('誤検知と見逃しを数える','閾値を下げると多く拾える一方、正常なイベントも警告に含まれやすくなります。検知率と警告の信頼性を分けて見ます。',{type:'confusion',tp,fp,fn,tn})],{'適合率':precision===null?'未定義':round(precision*100)+'%','再現率':recall===null?'未定義':round(recall*100)+'%','誤検知':fp,'見逃し':fn});
});
R('incident',(p)=>{
 const raw=[{t:10,source:'Auth',event:'member login success',kind:'normal'},{t:12,source:'API',event:'GET /docs/42 -> 200',kind:'normal'},{t:13,source:'Auth',event:'admin login failed x5',kind:'suspect'},{t:16,source:'Auth',event:'admin login success / new device',kind:'suspect'},{t:18,source:'API',event:'EXPORT records / admin',kind:'suspect'},{t:21,source:'Audit',event:'token revoked / admin',kind:'response'}];let rows=raw.filter(x=>p.filter==='all'||p.filter===x.source).map(x=>[x.t+(x.source==='API'?p.skew:0),x.source,x.event]);if(p.correct)rows=raw.filter(x=>p.filter==='all'||p.filter===x.source).map(x=>[x.t,x.source,x.event]);rows.sort((a,b)=>a[0]-b[0]);
 return out([F('異なる観測点のログを集める','時刻のずれを補正しないと、出来事の順番を取り違える場合があります。ここではAPIログだけに一定の時計のずれを与えます。',{type:'logs',rows},{},{headers:['時刻（秒）','発生源','イベント'],rows}),F('事実と仮説を区別する','新しい端末からのログインとデータのエクスポートは観測できます。ただし、この証拠だけでは操作した人物や漏えい先は特定できません。',{type:'cells',rows:[{label:'観測できたこと',values:['認証成功','EXPORT実行']},{label:'追加調査が必要',values:['本人の操作か','送付先','影響した件数']}]} )],{'表示した証拠':rows.length,'API時刻補正':p.correct?'適用':'未適用','時計のずれ':p.skew+'秒'});
});
R('backup',(p)=>{
 const interval=p.interval,failure=p.failure,lastBackup=Math.floor(failure/interval)*interval,recoverable=p.isolated||!p.corrupted,rpo=recoverable?failure-lastBackup:failure,rto=p.restore+p.verify;
 let items=[];for(let i=0;i<=failure;i+=interval)items.push({label:'backup',start:i,end:i+1});items.push({label:'outage',start:failure,end:failure+rto});
 return out([F('定期バックアップを置く','データが毎分増えるモデルです。障害直前の復元可能な時点と、障害発生時点の差を調べます。',{type:'lanes',items,unit:'min'},{'最後の予定バックアップ':lastBackup}),F(recoverable?'バックアップから戻す':'バックアップも利用できない',recoverable?'復元と検証の時間を足した後に再開できます。隔離したバックアップを設計する意味を比較します。':'今回の破損が同じ場所のバックアップにも影響しました。初期時点からのデータを失う設定です。',{type:'flow',nodes:['障害',recoverable?'復元可能':'復元元がない',recoverable?'検証→再開':'復旧不能'],active:2,failed:!recoverable})],{'最後の復元可能時点':recoverable?lastBackup+'分':'初期のみ','失う時間幅':rpo+'分','復旧所要':recoverable?rto+'分':'未定'},'ここでの値は発生した障害の実績モデルです。RPO/RTOという目標値と、実際の損失・所要時間は区別してください。');
});
R('iot-security',(p)=>{
 const valid=p.signature&&!p.rollback&&p.identity;return out([F('更新ファイルを受け取る','通信の暗号化だけでは、更新ファイルを誰が作ったかは確かめられません。このモデルは機器ID、署名、バージョン条件を別々に判定します。',{type:'flow',nodes:['配布元','更新ファイル','機器'],active:1}),F('更新の受入れ条件を確認','署名の真偽は教材入力として与えています。実際の署名検証の計算は「電子署名」実験で確認できます。',{type:'checks',items:[{label:'対象機器が一致',ok:p.identity},{label:'署名が正しい',ok:p.signature},{label:'旧版への戻しではない',ok:!p.rollback}]}),F(valid?'更新を受理':'更新を拒否',valid?'必要条件を満たしています。実機では電源断時の回復や安全な鍵管理なども必要です。':'拒否の原因を修正してから、もう一度検証してください。',{type:'flow',nodes:['検証','バージョン確認',valid?'INSTALL':'REJECT'],active:2,failed:!valid})],{'更新':valid?'受理':'拒否','バージョン後退':p.rollback?'あり':'なし'});
});
R('privacy',(p)=>{
 const data=[['A',19,'100'],['B',21,'100'],['C',23,'100'],['D',28,'101'],['E',32,'101'],['F',34,'101'],['G',36,'102'],['H',41,'102'],['I',43,'102'],['J',47,'103'],['K',52,'103'],['L',56,'103']];
 const groups={},rows=data.map(([id,age,zip])=>{let ag=p.generalize===0?String(age):p.generalize===1?Math.floor(age/10)*10+'代':'成人',z=p.hideZip?'***':zip;let key=ag+'|'+z;groups[key]=(groups[key]||0)+1;return [p.removeName?'—':id,ag,z];}),k=Math.min(...Object.values(groups));
 return out([F('公開する項目を変える','名前を消しただけでは、年齢と地域の組み合わせが1人に絞れる場合があります。ここでは架空の12人だけでグループの大きさを計算します。',{type:'cells',rows:[{label:'準識別子',values:['年齢','地域コード']}]},{},{headers:['ID','年齢','地域'],rows}),F('同じ組み合わせの人数を見る','kは同じ準識別子を持つ最小グループの大きさです。kが大きくても、属性推測や外部情報との結合を含めた安全の保証にはなりません。',{type:'bars',values:Object.values(groups),labels:Object.keys(groups)},{'k':k})],{'最小グループ k':k,'グループ数':Object.keys(groups).length,'明示ID':p.removeName?'除去':'残存'},p.removeName?'表示kは選んだ準識別子に限る指標です。匿名性全体の保証ではありません。':'IDが残っているため、kの値にかかわらず個人を区別できる状態です。');
});
R('people',(p)=>{
 const evidence=[{label:'予期しない送付',ok:!p.unexpected},{label:'送信元を別経路で確認',ok:p.confirmed},{label:'金銭・認証情報の要求なし',ok:!p.sensitive},{label:'急いで判断させない',ok:!p.urgent}];let verify=p.unexpected||p.sensitive||p.urgent;let action=p.confirmed?'確認結果に基づき通常手順へ':verify?'開く前に別経路で確認':'通常手順で内容を確認';return out([F('メッセージの文脈を確認','単一の特徴だけで本物・偽物と断定しません。独立した連絡先や組織の報告先で確認する判断を練習します。',{type:'checks',items:evidence}),F('次の行動を選ぶ',action+'。画面の警告数は悪意の確率ではありません。',{type:'flow',nodes:['受信','立ち止まる',action],active:2})],{'別経路確認':p.confirmed?'済':'未実施','推奨行動（教材）':action});
});
R('shamir',(p)=>{
 const prime=17,secret=p.secret,a=7,shares=Array.from({length:5},(_,i)=>({x:i+1,y:(secret+a*(i+1))%prime})),count=p.count,selected=shares.slice(0,count);let recovered=null;if(count>=2){const [u,v]=selected;let l1=(((-v.x*invMod(((u.x-v.x)%prime+prime)%prime,prime))%prime)+prime)%prime,l2=(((-u.x*invMod(((v.x-u.x)%prime+prime)%prime,prime))%prime)+prime)%prime;recovered=(u.y*l1+v.y*l2)%prime;}
 return out([F('秘密を直線の切片にする','法17の有限体で f(x)=secret+7x とします。係数7は説明用に固定して公開しているため、この実験自体には秘密性がありません。実用では秘密のランダム係数が必要です。',{type:'scatter',points:shares,centers:[{x:0,y:secret}]},{},{headers:['共有片 x','共有片 y'],rows:shares.map(x=>[x.x,x.y])}),F(count>=2?'2つの共有片から復元':'共有片が不足',count>=2?'2点から有限体上の直線を復元し、x=0の値を計算します。':'係数が未知である本来の方式では1点だけから切片は定まりません。このモデルは2-of-5の計算関係を示します。',{type:'cells',rows:[{label:'選択した共有片',values:selected.map(x=>`(${x.x},${x.y})`)},{label:'復元',values:[recovered??'2片必要']}]} )],{'しきい値':'2 / 5','共有片数':count,'復元値':recovered??'未計算'});
});
R('zk',(p)=>{
 const cheat=p.cheat,trials=p.rounds,prob=2**(-trials);let random=rng(p.seed),frames=[],passed=true;for(let i=0;i<trials;i++){let challenge=random()<.5?'左':'右',guess=random()<.5?'左':'右',ok=!cheat||challenge===guess;passed&&=ok;frames.push(F(`確認 ${i+1}: ${challenge}側を指定`,'「秘密の通路」を知っている人はどちらの出口要求にも応じられる、という説明用の洞窟モデルです。暗号プロトコルの実装ではありません。',{type:'flow',nodes:['検証者の要求',challenge+'の出口',ok?'応答できた':'失敗'],active:2,failed:!ok},{'この回':ok?'成功':'失敗'}));}
 return out(frames,{'今回の検証':passed?'すべて成功':'失敗あり','知らない人が全回当てる確率':prob.toExponential(3),'独立した確認回数':trials});
});
R('pqc',(p)=>{
 // Explicit user-supplied illustrative sizes, not a named algorithm's benchmark.
 let bytes=p.key+p.ciphertext+p.signature,ms=bytes*8/(p.bandwidth*1e6)*1000;
 return out([F('方式を変更したときの通信量を計算','暗号方式の移行では鍵や暗号文・署名のサイズも変わります。ここでのサイズは自由設定で、特定の耐量子方式の公称値や安全性評価ではありません。',{type:'bars',values:[p.key,p.ciphertext,p.signature],labels:['公開鍵','暗号文','署名']}),F('転送に必要な時間を計算','データ量÷回線速度だけを計算します。暗号の計算時間、往復遅延、フレームのヘッダーは含みません。',{type:'flow',nodes:['方式の選択','データ量',`${round(ms,4)} ms`],active:2})],{'転送量':bytes+' B','伝送時間':round(ms,4)+' ms','安全性評価':'対象外'});
});
R('ai-security',(p)=>{
 let untrusted=p.injection,canRead=p.readSecret,canSend=p.send,guard=p.guard,leak=untrusted&&canRead&&canSend&&!guard;
 return out([F('外部文書は命令ではなくデータ','この仮想エージェントは、外部文書を読み、ツールを使う構成です。実際のLLMやAPIには接続しません。',{type:'zones',zones:[{name:'信頼する指示',items:['質問に答える']},{name:'未信頼の文書',items:[untrusted?'外部送信を要求する文':'通常の参考情報']}],linked:!guard}),F('権限と境界を評価','プロンプトの注意書きだけでなく、秘密情報へのアクセスや外部送信の権限を制限します。ガードが常に完璧という主張ではなく、この固定シナリオの条件判定です。',{type:'checks',items:[{label:'秘密にアクセス不可',ok:!canRead},{label:'外部送信ツールを無効化',ok:!canSend},{label:'今回の要求をポリシーで拒否',ok:guard}]}),F(leak?'情報流出の条件がそろう':'今回の外部送信は成立しない',leak?'未信頼データの指示、読取り権限、送信権限が結び付いています。':'必要な条件のどれかを断つことで、この例では流出を防ぎます。',{type:'flow',nodes:['外部文書','仮想エージェント',leak?'機密の外部送信':'送信なし'],active:2,failed:leak})],{'未信頼入力':untrusted?'悪意ある指示':'通常データ','結果':leak?'流出条件が成立':'今回の流出なし','外部通信':'実際には行わない'});
});
})();
