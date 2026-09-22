/* The test keys below are intentionally public. This is an offline lesson,
 * not a reusable JWT validator, identity provider or forensic evidence store. */
(() => {
'use strict';
const L=CSL,X=L.experiences,S=X.securityDesk,C=L.curriculum.cryptoTools;
const publicKey=()=>C.utf8('PUBLIC CLASSROOM TEST KEY - NEVER USE FOR REAL TOKENS');
const encode=obj=>C.b64(C.utf8(JSON.stringify(obj)));
S.jwtStart=()=>({token:'',now:100,audience:'classroom-api',claims:null,checks:null,accepted:null,log:[]});
S.jwt=async(input,a)=>{
 const s=S.begin(input);
 if(a.kind==='issue'){
  const head=encode({alg:'HS256',typ:'JWT'}),body=encode({iss:'classroom-issuer',aud:'classroom-api',sub:'aki',nbf:0,exp:600,role:'reader'});
  const signature=C.b64(await C.hmac(publicKey(),C.utf8(head+'.'+body)));s.token=head+'.'+body+'.'+signature;s.claims=null;s.checks=null;s.accepted=null;
  return S.note(s,'発行者が読取り用のtokenを作りました。payloadは暗号化していません。まずデコードと検証を分けて試してください。');
 }
 if(!s.token)throw Error('最初に発行者からtokenを受け取ってください。');
 if(a.kind==='edit'){
  if(typeof a.token!=='string'||a.token.length>4096)throw Error('教材tokenは4096文字以内です。');
  s.token=a.token;s.checks=null;s.accepted=null;s.claims=null;
  return S.note(s,'手元の文字列を変更しました。発行者による新しいMACは作っていません。');
 }
 if(a.kind==='context'){
  s.now=S.int(a.now,0,1000,'検証時刻');s.audience=S.choose(a.audience,['classroom-api','other-api']);s.checks=null;s.accepted=null;
  return S.note(s,'受け取る側の時刻・用途だけを変更。tokenのbyte列は同じです。');
 }
 const pieces=s.token.split('.');if(pieces.length!==3||pieces.some(x=>!x||!/^[A-Za-z0-9_-]+$/.test(x)))throw Error('header.payload.MACの3部分で示した教材tokenを使います。');
 let header,claims;try{header=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(C.unb64(pieces[0])));claims=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(C.unb64(pieces[1])));}catch{throw Error('headerとpayloadをUTF-8のJSONとして読めません。');}
 if(!header||typeof header!=='object'||Array.isArray(header)||!claims||typeof claims!=='object'||Array.isArray(claims))throw Error('headerとpayloadはJSONオブジェクトです。');
 if(a.kind==='tamper'){
  claims.role='admin';s.token=pieces[0]+'.'+encode(claims)+'.'+pieces[2];s.claims=claims;s.checks=null;s.accepted=null;
  return S.note(s,'本文のroleだけをadminへ変更。元のMACをそのまま残しました。読めることと検証が通ることを比べます。');
 }
 s.claims=claims;
 if(a.kind==='decode'){s.checks=null;s.accepted=null;return S.note(s,'JSONを読んだだけです。ここでは内容を信頼していません。');}
 if(a.kind!=='verify')throw Error('デコードか検証を選んでください。');
 const algorithm=header.alg==='HS256',signature=algorithm&&await C.verifyHmac(publicKey(),C.utf8(pieces[0]+'.'+pieces[1]),C.unb64(pieces[2]));
 const audience=typeof claims.aud==='string'?claims.aud===s.audience:Array.isArray(claims.aud)&&claims.aud.every(x=>typeof x==='string')&&claims.aud.includes(s.audience);
 s.checks=[['許可した算法HS256',algorithm],['受信した文字列のMAC',Boolean(signature)],['予定した発行者',claims.iss==='classroom-issuer'],['このAPI向けのaud',Boolean(audience)],['nbf以上・exp未満',typeof claims.nbf==='number'&&Number.isFinite(claims.nbf)&&typeof claims.exp==='number'&&Number.isFinite(claims.exp)&&s.now>=claims.nbf&&s.now<claims.exp]];
 s.accepted=s.checks.every(x=>x[1]);return S.note(s,s.accepted?'この教材の受理条件を満たしました。許される具体的な操作は別の認可で確認します。':'受理しません。MACと用途・期限のどこで条件が崩れたかを分けて読んでください。');
};

S.refreshStart=()=>({tokens:{R0:{used:false}},revoked:false,client:'R0',responses:[],serial:0,log:[]});
S.refresh=(input,a)=>{
 const s=S.begin(input);
 if(a.kind==='use'){
  const token=String(a.token);if(!Object.hasOwn(s.tokens,token))throw Error('このfamilyが発行したtokenを選んでください。');
  if(s.revoked)return S.note(s,'familyが失効済みなので拒否。まだ使っていない新tokenも無効です。');
  if(s.tokens[token].used){s.revoked=true;return S.note(s,token+'の再使用を検出しfamilyを失効。どちらの相手が正当かは、この再使用だけでは分かりません。');}
  s.tokens[token].used=true;const next='R'+(++s.serial);s.tokens[next]={used:false};s.responses.push(next);
  return S.note(s,token+'を使用済みにして'+next+'を発行。二つは原子的な操作と仮定します。応答はまだ端末に届けていません。');
 }
 if(a.kind==='deliver'||a.kind==='lose'){
  if(!s.responses.length)throw Error('配送待ちの応答がありません。');const next=s.responses.shift();
  if(a.kind==='deliver'){s.client=next;return S.note(s,next+'を端末へ配送。失効後に届いても、そのtokenが有効に戻るわけではありません。');}
  return S.note(s,'新token '+next+'を含む応答だけが失われました。端末には古い'+s.client+'が残ります。');
 }
 throw Error('交換要求または応答の配送を選んでください。');
};

S.evidenceStart=()=>({original:'auth 10 aki login failed\nauth 20 aki login success\napi 18 aki data export',copy:null,sealed:null,currentHash:null,same:null,handovers:[],log:[]});
S.evidence=async(input,a)=>{
 const s=S.begin(input);
 if(a.kind==='acquire'){
  if(s.sealed)throw Error('取得時の記録は上書きしません。新しい実験は最初から始めてください。');
  s.copy=s.original;s.sealed=C.hex(await C.hash(C.utf8(s.original)));s.currentHash=null;s.same=null;
  return S.note(s,'原本byte列のコピーと取得時SHA-256を記録しました。元のログが真実だと証明したのではありません。');
 }
 if(!s.sealed)throw Error('先にコピーを取得してください。');
 if(a.kind==='edit'){
  if(typeof a.text!=='string'||a.text.length>2000)throw Error('作業コピーは2000文字以内です。');s.copy=a.text;s.same=null;s.currentHash=null;
  return S.note(s,'作業コピーだけを変更しました。取得時hashや原本は変更していません。');
 }
 if(a.kind==='verify'||a.kind==='handover'){
  s.currentHash=C.hex(await C.hash(C.utf8(s.copy)));s.same=s.currentHash===s.sealed;
  if(a.kind==='handover'){
   if(!s.same)throw Error('コピーが取得時と違うため、同一の証拠としての受渡しは拒否します。');
   const record={order:s.handovers.length+1,evidence:s.sealed,previous:s.handovers.at(-1)?.hash||s.sealed};
   s.handovers.push({...record,hash:C.hex(await C.hash(C.utf8(JSON.stringify(record))))});
  }
  return S.note(s,s.same?'取得後のbyte同一性を確認。ログ内の主体・時刻の真実性は別に調査が必要です。':'取得時とbyteが違います。空白一文字の追加も検出します。');
 }
 throw Error('未定義の保全操作です。');
};
})();
