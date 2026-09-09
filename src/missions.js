(() => {
'use strict';
const L=CSL,{register:R,frame:F,result:out,clone,shortest,round}=L;
const defaultTopology={nodes:[{id:'PC',label:'クライアント',x:80,y:175,kind:'pc'},{id:'SW',label:'スイッチ',x:260,y:175,kind:'switch'},{id:'R1',label:'ルーター A',x:440,y:80,kind:'router'},{id:'R2',label:'ルーター B',x:440,y:280,kind:'router'},{id:'WEB',label:'Webサーバー',x:650,y:175,kind:'server'}],edges:[{a:'PC',b:'SW',cost:1},{a:'SW',b:'R1',cost:2},{a:'SW',b:'R2',cost:4},{a:'R1',b:'WEB',cost:2},{a:'R2',b:'WEB',cost:3}]};
L.defaultTopology=defaultTopology;
function topology(input){let v;try{v=JSON.parse(input);}catch{throw Error('トポロジーJSONを読み取れません。初期化で戻せます。');}if(!Array.isArray(v.nodes)||!Array.isArray(v.edges)||v.nodes.length<2||v.nodes.length>12||v.edges.length>30)throw Error('ノード2〜12個、リンク30本以下にしてください。');let ids=new Set();for(const n of v.nodes){if(!/^[A-Za-z0-9_-]{1,20}$/.test(n.id)||ids.has(n.id))throw Error('ノードIDは一意の英数字にしてください。');ids.add(n.id);n.x=L.clamp(n.x,55,690);n.y=L.clamp(n.y,55,325);n.label=String(n.label).slice(0,20);if(!['pc','switch','router','server'].includes(n.kind))n.kind='router';}for(const e of v.edges){if(!ids.has(e.a)||!ids.has(e.b)||e.a===e.b)throw Error('リンクの両端を確認してください。');e.cost=L.clamp(e.cost??1,1,99);e.off=!!e.off;}return v;}
L.parseTopology=topology;
R('builder',(p)=>{
 const v=topology(p.topology),start=p.source||v.nodes[0].id,end=p.target||v.nodes.at(-1).id;
 if(!v.nodes.some(n=>n.id===start)||!v.nodes.some(n=>n.id===end))throw Error('送信元と宛先に、図に存在する機器IDを指定してください。');
 const allowedEdges=v.edges.filter(e=>{const a=v.nodes.find(n=>n.id===e.a),b=v.nodes.find(n=>n.id===e.b);return [a,b].every(n=>n.id===start||n.id===end||['switch','router'].includes(n.kind));});
 const s=shortest(v.nodes.map(n=>n.id),allowedEdges,start,end),frames=[];
 for(const t of s.trace)frames.push(F(`${t.u} の到達性を調べる`,'この作業台は双方向リンクの到達性と経路コストを計算します。中継できるのはswitch/routerだけです。IP経路表、ARP、STPなどはそれぞれの専門実験で扱います。',{type:'network',...v,active:t.u,visited:t.done,editable:true},{'到達済み':t.done.length},{headers:['機器','現在の経路コスト'],rows:Object.entries(t.dist).map(([k,v])=>[k,v===Infinity?'到達不可':v])}));
 frames.push(F(s.path.length?'終点まで経路がある':'終点に到達できない',s.path.length?`${s.path.join(' → ')} を使います。線をクリックして切断し、別経路へ変わるか確かめましょう。`:'切れているリンクを接続するか、経路を追加してください。ネットワーク図の線を押すと接続状態を切り替えます。',{type:'network',...v,path:s.path,active:end,editable:true}));return out(frames,{'機器数':v.nodes.length,'有効リンク':v.edges.filter(e=>!e.off).length,'到達性':s.path.length?'到達可能':'到達不可','経路コスト':s.path.length?s.dist[end]:'—'});
});
R('mission',(p,lab)=>{
 const v=lab.variant;let checks=[],labels=[],explain='',metrics={},objective='';
 if(v==='publish'){
  checks=[['DNSで宛先が分かる',p.dns],['443番の到達経路がある',p.port],['証明書を検証できる',p.cert],['不要な管理アクセスを拒否',!p.adminPublic],['データへの認可が有効',p.auth]];labels=['DNS','TCP :443','TLS','認可','応答'];objective='利用者にサービスを提供しつつ、管理とデータを保護する';explain='通信成立に必要な条件と、安全な公開の条件は同じではありません。ページが表示されるだけで完成としない構成です。';metrics={'サービスへの接続':p.dns&&p.port&&p.cert?'成功':'失敗','管理面の公開':p.adminPublic?'あり':'なし'};
 } else if(v==='organization'){
  const canBusiness=p.routing&&p.web,guestBlocked=p.segment&&!p.guestDb;
  checks=[['業務ネットワークからWebを利用',canBusiness],['ゲストからDBへの経路を制限',guestBlocked],['管理経路を独立させる',p.management],['必要なDNS通信を許可',p.dns]];labels=['業務 / ゲスト','分離','Firewall','DB / Web'];objective='必要な通信を残し、不要な到達を防ぐ';explain='VLANを分けるだけでなく、VLAN間で何を許可するかまで設計します。全部遮断しても課題達成にはなりません。';metrics={'業務通信':canBusiness?'可能':'不可','ゲストDB到達':guestBlocked?'拒否':'到達条件あり'};
 } else if(v==='patch'){
  checks=[['入力をSQL構造と分離',p.parameterized],['データ所有者を照合',p.owner],['修正後の回帰テスト',p.tests],['修正を変更履歴に残す',p.commit]];labels=['問題再現','原因修正','テスト','履歴'];objective='修正を確かめ、再発を防ぐ';explain='1つの脆弱性だけ直しても、別の認可の問題が残ることがあります。修正と検証を分けて追います。';
 } else if(v==='response'){
  checks=[['証拠を保全してから変更',p.evidence],['侵害した認証情報を失効',p.revoke],['影響範囲を隔離',p.isolate],['正常な復元元を検証',p.verified],['再発原因を修正',p.fix]];labels=['観測','保全','封じ込め','復旧','再発防止'];objective='被害を広げず、根拠を残して復旧する';explain='実際の対応順は状況に依存します。ここでは既知の仮想インシデントに対する必要条件のチェックを練習します。';
 } else if(v==='iot'){
  checks=[['機器を一意に識別',p.identity],['通知に必要な通信を許可',p.network],['再接続時の重複に対応',p.idempotent],['更新の署名を確認',p.signed],['失敗時に旧正常版へ回復',p.recovery]];labels=['センサー','MQTT','処理','署名更新','復旧'];objective='途切れても、更新に失敗しても回復できる';explain='配送保証と業務処理の一回性を区別します。更新を受理した後の電源断なども想定した構成を比較します。';
 } else {
  const consistent=p.seedA===p.seedB,oneChange=p.changed===1;
  checks=[['同じ初期条件・seedで比較',consistent],['変更する条件を1つに限定',oneChange],['複数回の測定',p.repeats>=3],['限界・未確認事項を記録',p.limit]];labels=['仮説','条件','測定','比較','考察'];objective='結果の違いを説明できる比較実験にする';explain='同じseedによる対照比較と、複数seedでの頑健性の確認は役割が違います。この課題はまず対照比較を設計します。';metrics={'条件Aのseed':p.seedA,'条件Bのseed':p.seedB,'反復数':p.repeats};
 }
 const all=checks.every(c=>c[1]),frames=checks.map(([label,ok],i)=>F(`${i+1}. ${label}`,`${ok?'この条件を満たしています。':'この条件が不足しています。'} ${explain}`,{type:'flow',nodes:labels,active:Math.min(i,labels.length-1),failed:!ok},{'満たした条件':checks.slice(0,i+1).filter(c=>c[1]).length}, {headers:['検証項目','判定'],rows:checks.slice(0,i+1).map(([l,o])=>[l,o?'OK':'要変更'])}));frames.push(F(all?'課題の条件を満たしました':'構成を見直しましょう',objective,{type:'checks',items:checks.map(([label,ok])=>({label,ok}))}));return out(frames,{...metrics,'達成条件':`${checks.filter(c=>c[1]).length} / ${checks.length}`,'演習結果':all?'条件達成':'要改善'},'これは提示した条件に基づく設計演習です。実システムの安全性を認定する検査ではありません。');
});
})();
