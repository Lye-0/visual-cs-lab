(() => {
'use strict';
const L=CSL,X=L.experiences,S=X.securityDesk,h=L.h;
if(typeof document==='undefined')return;
const {b,p,box,table}=S.ui;
X.registerWidget('jwt-check-desk',(root,a,c)=>S.mount(root,c,{
 start:S.jwtStart,reduce:S.jwt,
 instruction:'発行者からtokenを受け取り、まず本文を読むだけにしてください。その後に検証します。roleだけを改変した場合と、本文を変えず別APIへ出した場合を比べます。',
 action:(code,f)=>code==='edit'?{kind:code,token:f.get('token'),fresh:true}:code==='context'?{kind:code,now:f.get('now'),audience:f.get('audience')}:{kind:code,fresh:code==='issue'||code==='tamper'},
 render:(s,{field})=>`<div class="ex-actions">${b('発行者からtokenを受け取る','issue')}${b('本文を読むだけ','decode')}${b('手元でroleをadminへ改変','tamper')}${b('受理条件を検証する','verify')}</div><div class="ex-sec-two">${box('手元に届いた文字列',`<form>${field('token','header.payload.MAC（教材用）',s.token,{type:'textarea'})}${b('編集した文字列を手元へ反映','edit')}</form>`+p('HS256の公開テスト鍵を使います。MAC付きであり暗号化したJWTではありません。'))}${box('読み取った本文',`<pre data-sec-claims>${h(s.claims?JSON.stringify(s.claims,null,2):'まだデコードしていません。')}</pre>`+p('この表示は、本文を発行者が承認したという証拠ではありません。'))}</div><div class="ex-sec-two">${box('受け取る側の条件',`<form>${field('now','検証時刻（仮想の秒）',s.now,{min:0,max:1000})}${field('audience','受け取るAPI',s.audience,{choices:['classroom-api','other-api']})}${b('受信側の条件を変更','context')}</form>`)}${box('今回の検証結果',`<p class="ex-sec-verdict" data-sec-verdict>${s.accepted===null?'未検証':s.accepted?'この教材では受理':'拒否'}</p>`+(s.checks?table(['確認','結果'],s.checks.map(([name,ok])=>[name,ok?'成立':'不成立'])):p('デコードと別の操作で検証してください。')))}</div>${p('このprofileではHS256・iss・aud・nbf・expを必須照合し、時計の許容誤差は0です。完全なJOSE実装ではありません。検証後にも対象データの認可が必要です。')}`
}));
X.registerWidget('refresh-delivery',(root,a,c)=>S.mount(root,c,{
 start:S.refreshStart,reduce:S.refresh,
 instruction:'R0で交換を要求し、応答だけを失わせてください。端末に残ったR0をもう一度出すと、サーバーではどの判断が起きるでしょうか。',
 action:(code,f,s)=>code==='use-client'?{kind:'use',token:s.client}:code==='use'?{kind:'use',token:f.get('token')}:{kind:code},
 render:(s,{field})=>`<div class="ex-sec-paths">${box('端末が持っているもの',`<p class="ex-sec-verdict">${h(s.client)}</p>`+b('端末のtokenで交換を要求','use-client'))}${box('まだ届いていない応答',p(s.responses.length?s.responses.join('、'):'配送待ちはありません。')+`<div class="ex-actions">${b('次の応答を届ける','deliver')}${b('次の応答だけ失わせる','lose')}</div>`)}${box('サーバーに残った使用記録',`<p class="ex-sec-verdict" data-sec-verdict>${s.revoked?'family全体が失効':'familyは有効'}</p>`+table(['token','使用記録'],Object.entries(s.tokens).map(([key,t])=>[key,t.used?'使用済み':'未使用'])))}</div><details><summary>以前のtokenを指定して再使用を試す</summary><form>${field('token','提示するtoken','R0',{choices:Object.keys(s.tokens)})}${b('指定したtokenを提示','use')}</form></details>${p('この例は一つのfamilyを厳格に回転させる方式です。再使用が正当な再試行なのか第三者なのかを断定しません。猶予期間・sender constraint・実際の期限管理は別の設計です。tokenの文字列は公開模型です。')}`
}));
X.registerWidget('evidence-copy',(root,a,c)=>S.mount(root,c,{
 start:S.evidenceStart,reduce:S.evidence,
 instruction:'原本からコピーを取得して照合します。その後、作業コピーの末尾へ空白を一つ足してください。内容の見た目がほぼ同じでも、byteの同一性はどうなるでしょうか。',
 action:(code,f)=>code==='edit'?{kind:code,text:f.get('copy'),fresh:true}:{kind:code,fresh:code==='acquire'},
 render:(s,{field})=>`<div class="ex-sec-two">${box('この実験の原本',`<pre>${h(s.original)}</pre>`+b('コピーを取得してhashを記録','acquire'))}${box('作業コピー',`<form>${field('copy','検査するコピー',s.copy??'',{type:'textarea',maxLength:2000})}${b('編集をコピーへ反映','edit')}</form>`)}</div><div class="ex-actions">${b('今のコピーを取得時と照合','verify')}${b('同一性を確認して受渡しを記録','handover')}</div>${box('取得時記録と現在の検算',`<p class="ex-sec-verdict" data-sec-verdict>${s.same===null?'未照合':s.same?'取得時と同じbyte列':'取得時と異なるbyte列'}</p>`+table(['比較する対象','SHA-256'],[['取得時',s.sealed||'まだ記録していません'],['今回のコピー',s.currentHash||'まだ照合していません']]))}<details><summary>受渡しの連鎖</summary>${table(['順序','前の記録のhash','今回の記録のhash'],s.handovers.map(r=>[r.order,r.previous,r.hash]))}</details>${p('hashはWeb Cryptoで実計算します。取得後の同一性は、元の出来事の真実性・本人性・法的証拠能力を保証しません。この画面は永続保存せず、実務の証拠保全ツールとしては使えません。')}`
}));
})();
