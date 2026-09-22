(() => {
'use strict';
const L=CSL,X=L.experiences,A=X.aiDesk,h=L.h,f=X.format;
if(typeof document==='undefined')return;
const {b,p,box,table}=A.ui;
X.registerWidget('search-frontier',(root,a,c)=>A.mount(root,c,{
 start:A.searchStart,reduce:A.search,
 instruction:'候補のg・h・fを見て、次に展開するマスを選びます。fが最小、同じなら番号が小さいマスです。既に調べたマスと、最終経路は別の印で表示します。',
 action:code=>{const [kind,value]=code.split(':');return kind==='mode'?{kind,value,fresh:true}:{kind:'expand',id:Number(value)};},
 render:s=>{
  const v=A.searchView(s),next=v.frontier[0];
  return `<div class="ex-actions">${[['zero','h=0で最初から'],['manhattan','Manhattan距離で最初から'],['over','5倍の見積りで最初から']].map(([id,t])=>b(t,'mode:'+id,`aria-pressed="${s.heuristic===id}"`)).join('')}</div><div class="ex-ai-two">${box('番号・入る費用・現在の候補',`<div class="ex-ai-grid five">${s.costs.map((cost,i)=>s.blocked.includes(i)?'<div class="ai-grid-cell wall">壁</div>':`<button type="button" class="ai-grid-cell ${s.open.includes(i)?'frontier':''} ${s.closed.includes(i)?'visited':''} ${v.path.includes(i)?'path':''}" data-sec-action="expand:${i}" ${s.done||!s.open.includes(i)?'disabled':''} aria-label="マス${i} 入る費用${cost}"><strong>${i===0?'START':i===24?'GOAL':i}</strong><small>費用 ${cost}</small><small>${v.path.includes(i)?'経路':s.open.includes(i)?'候補':s.closed.includes(i)?'展開済':'未到達'}</small></button>`).join('')}</div>`+p('一歩の費用は入る先のマスで決まります。斜めには進めません。'))}${box('どれを次に取り出すか',table(['候補番号','ここまでg','残り見積りh','合計f'],v.frontier.map(r=>[r.id,r.g,r.h,r.f]))+p(s.done?'終了：'+(v.path.length?'経路 '+v.path.join(' → ')+'、費用 '+s.g[24]:'到達できない'):next?'規則で選ばれるのは '+next.id+' です。図か候補のボタンを押してください。':'候補なし')+`<div class="ex-actions">${v.frontier.map(r=>b('候補'+r.id+'を展開','expand:'+r.id)).join('')}</div>`)}</div>`+box('これまでの展開と、親の参照',table(['番号','最良の到達候補g','親'],s.g.map((g,i)=>[i,g===null?'未到達':g,s.parent[i]===null?'—':s.parent[i]])))+p('h=0はこの正の費用ではDijkstraです。Manhattan距離は各移動の最小費用1で残りを見積もります。5倍では過大評価になり、最短の保証を失いますが、必ず誤るという意味ではありません。');
 }
}));
X.registerWidget('q-step-desk',(root,a,c)=>A.mount(root,c,{
 start:A.qStart,reduce:A.q,
 instruction:'まず右へ一歩進みます。経験の欄で旧Q・報酬・次の最大Qを読んでから更新してください。行動したことと、表へ学習したことを別に試します。',
 action:(code,fields)=>{const [kind,value]=code.split(':');return kind==='move'?{kind,action:Number(value),actual:fields.get('slip')?(Number(value)+1)%4:Number(value)}:kind==='update'?{kind,alpha:fields.get('alpha'),gamma:fields.get('gamma')}:{kind};},
 render:(s,{field})=>{
  const moves=['↑','→','↓','←'],experience=s.pending||s.last;
  return `<div class="ex-ai-two">${box('どこで、何をしたか',`<div class="ex-ai-grid four">${s.Q.map((_,i)=>`<div class="ai-grid-cell ${i===s.position?'current':''} ${[5,10].includes(i)?'hazard':''}"><strong>${i===s.position?'現在':i===15?'GOAL':[5,10].includes(i)?'危険':i}</strong><small>${i}</small></div>`).join('')}</div><div class="ex-actions">${moves.map((m,i)=>b(m+'へ動く','move:'+i,s.pending||s.terminal?'disabled':'')).join('')}${b('次の試行へ（Qは残す）','restart')}</div>`)}${box('受けた経験をQへ反映する',experience?table(['項目','値'],[['状態',experience.state],['選んだ行動',moves[experience.chosen]],['実際の移動',moves[experience.actual]],['次の状態',experience.next],['報酬',experience.reward],['終端か',experience.terminal?'はい':'いいえ']]):p('まだ行動していません。'))}</div><form class="ex-ai-form">${field('alpha','更新率α',.3,{min:.01,max:1,step:'any'})}${field('gamma','割引γ',.9,{min:0,max:1,step:'any'})}${field('slip','選んだ方向を時計回りにずらす（手動の外乱）',false,{type:'checkbox'})}${b('この経験でQを一回更新','update')}</form>`+(s.last?box('更新した一つの値と式',p('目標 = '+f(s.last.reward)+' + '+f(s.last.gamma)+' × '+f(s.last.future)+' = '+f(s.last.target))+p('Q['+s.last.state+','+moves[s.last.chosen]+'] = '+f(s.last.old)+' + '+f(s.last.alpha)+' × ('+f(s.last.target)+' − '+f(s.last.old)+') = '+f(s.last.value)):'')+box('状態×行動の表',table(['状態',...moves],s.Q.map((row,i)=>[i,...row.map(x=>f(x))])))+p('一回の経験では、選んだ行動のQだけを書き換えます。goalと危険マスは終端で、将来のQを加えません。次の章では探索の確率を使う連続学習と比べます。');
 }
}));
})();
