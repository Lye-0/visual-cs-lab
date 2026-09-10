/* Typed educational diagrams. CSS colors apply to the diagram itself, not a
 * particular page wrapper. All content is escaped; coordinates are finite.
 */
(() => {
'use strict';
const L=CSL,K=L.curriculum,h=L.h;
const previous=L.visualize;
const palette=['#9bd6c3','#a9c8f2','#d2b9ef','#e6c18b','#e1abba','#b9d393'];
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const value=x=>x===null?'null':typeof x==='boolean'?(x?'真':'偽'):typeof x==='number'?(Number.isFinite(x)?String(Number(x.toPrecision(7))):x>0?'∞':'−∞'):Array.isArray(x)?x.map(value).join(', '):x&&typeof x==='object'?JSON.stringify(x):String(x??'—');
const fmt=x=>h(value(x));
const button=(key,label,focus,cls='')=>`<button type="button" class="cv-pick ${cls}${focus===key?' is-picked':''}" data-r-focus="${h(key)}" aria-pressed="${focus===key}">${fmt(label)}</button>`;
const equation=v=>v.equation?`<div class="cv-equation" role="math" aria-label="${h(v.equation)}">${h(v.equation)}</div>`:'';
const caption=v=>v.caption?`<p class="cv-caption">${h(v.caption)}</p>`:'';
const text=(x,y,label,cls='',anchor='middle')=>`<text class="cv-svg-text ${h(cls)}" x="${num(x)}" y="${num(y)}" text-anchor="${h(anchor)}">${fmt(label)}</text>`;
function svg(body,w,height,label){return `<svg class="cv-svg" viewBox="0 0 ${num(w)} ${num(height)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${h(label)}"><title>${h(label)}</title>${body}</svg>`;}
function table(v,focus){
 const headers=v.headers||[],rows=v.rows||[];
 const selected=focus?.match(/^cv:cell:(\d+):(\d+)$/),row=selected?Number(selected[1]):-1,col=selected?Number(selected[2]):-1;
 return `<div class="cv-scroll" tabindex="0" role="region" aria-label="${h(v.caption||'値と計算の対応表')}"><table class="cv-table">${v.caption?`<caption>${h(v.caption)}</caption>`:''}<thead><tr>${headers.map((x,i)=>`<th scope="col" class="${i===col?'is-linked':''}">${fmt(x)}</th>`).join('')}</tr></thead><tbody>${rows.map((xs,i)=>`<tr class="${i===row||i===v.activeRow?'is-linked':''}">${xs.map((x,j)=>`<${j?'td':'th scope="row"'} class="${j===col||j===v.activeCol?'is-linked':''}">${button(`cv:cell:${i}:${j}`,x,focus)}</${j?'td':'th'}>`).join('')}</tr>`).join('')}</tbody></table></div>${selected&&rows[row]?.[col]!==undefined?`<p class="cv-focus-note">${h(headers[col]||'列'+(col+1))} ／ 行${row+1}：<strong>${fmt(rows[row][col])}</strong></p>`:'<p class="cv-caption">値を選ぶと、その行と列を対応させて確認できます。</p>'}`;
}
function matrix(v,focus){
 const a=v.matrix||[],cols=a[0]?.length||0,headers=['',...(v.colLabels||Array.from({length:cols},(_,i)=>'列'+(i+1)))],rows=a.map((row,i)=>[v.rowLabels?.[i]??'行'+(i+1),...row]);
 return `<div class="cv-matrix">${table({headers,rows,activeRow:v.activeRow,activeCol:Number.isInteger(v.activeCol)?v.activeCol+1:undefined,caption:v.caption},focus)}</div>`;
}
function cells(v,focus,bits=false){
 const selected=focus?.match(/^cv:position:(\d+)$/),index=selected?Number(selected[1]):-1;
 return `<div class="cv-cells ${bits?'cv-bit-rows':''}">${(v.rows||[]).map((row,i)=>`<section class="cv-cell-row"><h3>${h(row.label||'行'+(i+1))}</h3><div class="cv-cell-values">${(row.values||[]).map((x,j)=>`<button type="button" class="cv-cell${j===index||j===row.active||j===v.active?' is-linked':''}" data-r-focus="cv:position:${j}" aria-label="${h(row.label||'行'+(i+1))}、位置${j+1}、${h(value(x))}" aria-pressed="${j===index}"><small>${bits?j+1:j}</small><span>${fmt(x)}</span></button>`).join('')||'<span class="cv-empty">空</span>'}</div></section>`).join('')}</div><p class="cv-caption">${bits?'位置は左から1始まりです。':'添字は0始まりです。'}同じ位置を選ぶと、複数の行の値を縦に比較できます。</p>`;
}
function graph(v,focus){
 const nodes=v.nodes||[],edges=v.edges||[],count=nodes.length;if(!count)return '<p class="cv-empty">頂点がありません。</p>';
 const columns=count<=4?2:count<=12?4:6,rows=Math.ceil(count/columns),w=Math.max(650,columns*160),height=Math.max(250,rows*140+60),positions=new Map();
 nodes.forEach((node,i)=>positions.set(String(node.id),{x:85+(i%columns)*(w-170)/Math.max(1,columns-1),y:75+Math.floor(i/columns)*140,node}));
 const marker='cv-arrow-'+String(count)+'-'+String(edges.length),active=new Set((Array.isArray(v.active)?v.active:[v.active]).filter(x=>x!==undefined).map(String));
 let drawing=`<defs><marker id="${marker}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#7995ad"/></marker></defs>`;
 edges.forEach((edge,i)=>{
  const a=positions.get(String(edge.from)),b=positions.get(String(edge.to));if(!a||!b)return;
  const selected=focus==='cv:node:'+edge.from||focus==='cv:node:'+edge.to||edge.active||(v.activeEdges||[]).includes(edge.id??i),stroke=edge.off?'#c49ba0':selected?'#a9dfcc':'#728ca4',dash=edge.off?' stroke-dasharray="6 5"':'';
  let path,labelX,labelY;
  if(a===b){path=`M${a.x-25} ${a.y-28}C${a.x-70} ${a.y-90} ${a.x+70} ${a.y-90} ${a.x+25} ${a.y-28}`;labelX=a.x;labelY=a.y-67;}
  else{const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1,startX=a.x+dx/length*40,startY=a.y+dy/length*30,endX=b.x-dx/length*44,endY=b.y-dy/length*32,reverse=edges.some(e=>String(e.from)===String(edge.to)&&String(e.to)===String(edge.from)),bend=reverse?22:0,mx=(startX+endX)/2-dy/length*bend,my=(startY+endY)/2+dx/length*bend;path=reverse?`M${startX} ${startY}Q${mx} ${my} ${endX} ${endY}`:`M${startX} ${startY}L${endX} ${endY}`;labelX=mx;labelY=my-7;}
  drawing+=`<path d="${path}" fill="none" stroke="${stroke}" stroke-width="${selected?2.8:1.5}"${dash}${v.directed?` marker-end="url(#${marker})"`:''}/>`;
  if(edge.label!==undefined&&edge.label!==''){const label=value(edge.label),width=Math.max(28,Math.min(132,[...label].length*7+12));drawing+=`<rect x="${labelX-width/2}" y="${labelY-13}" width="${width}" height="20" rx="4" fill="#111b27"/>`+text(labelX,labelY+1,label,'cv-edge-label');}
 });
 nodes.forEach((node,i)=>{
  const pos=positions.get(String(node.id)),key='cv:node:'+node.id,isActive=active.has(String(node.id)),isPicked=focus===key,fill=isActive?'#203e37':'#172534',stroke=isPicked?'#ecd29f':isActive?'#a2d7c2':'#637b96',label=value(node.label??node.id),detail=value(v.nodeValues?.[node.id]??node.value??''),parts=[...label],first=parts.slice(0,15).join(''),rest=parts.slice(15,30).join('');
  drawing+=`<g class="cv-graph-node" role="button" tabindex="0" data-r-focus="${h(key)}" aria-label="${h(label+(detail?'、'+detail:''))}" aria-pressed="${isPicked}"><rect x="${pos.x-63}" y="${pos.y-31}" width="126" height="62" rx="11" fill="${fill}" stroke="${stroke}" stroke-width="${isPicked||isActive?2.2:1.2}"/>${node.accept?`<rect x="${pos.x-58}" y="${pos.y-26}" width="116" height="52" rx="8" fill="none" stroke="${stroke}"/>`:''}${text(pos.x,pos.y+(rest?-3:5),first,'cv-node-label')}${rest?text(pos.x,pos.y+15,rest,'cv-node-label'):''}${detail?text(pos.x,pos.y+53,[...detail].slice(0,24).join(''),'cv-node-detail'):''}</g>`;
 });
 const chosen=focus?.startsWith('cv:node:')?nodes.find(n=>'cv:node:'+n.id===focus):null;
 return `<div class="cv-scroll cv-graph-scroll" tabindex="0" role="region" aria-label="グラフ全体。横に長い場合は内部をスクロールできます">${svg(drawing,w,height,v.caption||'頂点と辺の関係')}</div>${chosen?`<p class="cv-focus-note"><strong>${fmt(chosen.label??chosen.id)}</strong> ${fmt(v.nodeValues?.[chosen.id]??chosen.value??'')} ／ 関係する辺 ${edges.filter(e=>String(e.from)===String(chosen.id)||String(e.to)===String(chosen.id)).length}本</p>`:'<p class="cv-caption">頂点を選ぶと、関係する線と値を強調します。位置や交差そのものに意味を持たせていません。</p>'}`;
}
function plot(v,focus){
 const series=(v.series||[]).map(series=>({...series,points:(series.points||[]).filter(point=>Number.isFinite(Number(point.x))&&Number.isFinite(Number(point.y))).map(point=>({x:Number(point.x),y:Number(point.y)}))})),all=series.flatMap(s=>s.points);if(!all.length)return '<p class="cv-empty">この段階には数値の点がありません。</p>';
 let minX=Math.min(...all.map(p=>p.x)),maxX=Math.max(...all.map(p=>p.x)),minY=Math.min(0,...all.map(p=>p.y)),maxY=Math.max(0,...all.map(p=>p.y));if(minX===maxX){minX-=.5;maxX+=.5;}if(minY===maxY){minY-=.5;maxY+=.5;}
 const pad=(maxY-minY)*.07;minY-=pad;maxY+=pad;const w=720,height=400,x0=78,y0=42,pw=600,ph=280,sx=x=>x0+(x-minX)/(maxX-minX)*pw,sy=y=>y0+ph-(y-minY)/(maxY-minY)*ph;
 let drawing='';
 for(const band of v.bands||[]){const a=sx(Math.max(minX,Math.min(band.x1,band.x2))),b=sx(Math.min(maxX,Math.max(band.x1,band.x2)));drawing+=`<rect x="${a}" y="${y0}" width="${Math.max(0,b-a)}" height="${ph}" fill="#a6ceb620"/>`;}
 for(let i=0;i<=4;i++){const x=minX+(maxX-minX)*i/4,y=minY+(maxY-minY)*i/4;drawing+=`<path d="M${x0} ${sy(y)}h${pw}M${sx(x)} ${y0}v${ph}" stroke="#52667d66" fill="none" stroke-width=".8"/>`+text(x0-10,sy(y)+5,Number(y.toPrecision(4)),'cv-axis-label','end')+text(sx(x),y0+ph+24,Number(x.toPrecision(4)),'cv-axis-label');}
 drawing+=`<path d="M${x0} ${y0}V${y0+ph}H${x0+pw}" stroke="#8b9db3" fill="none" stroke-width="1.2"/>`;
 series.forEach((series,i)=>{const color=palette[i%palette.length],picked=focus==='cv:series:'+i,points=series.points;if(!series.scatter)drawing+=`<polyline points="${points.map(p=>`${sx(p.x)},${sy(p.y)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="${picked?3.5:2.1}" stroke-linejoin="round" stroke-linecap="round"/>`;if(series.scatter||points.length<=32)points.forEach(point=>drawing+=`<circle cx="${sx(point.x)}" cy="${sy(point.y)}" r="${picked?4.5:3.2}" fill="${color}"/>`);});
 drawing+=text(x0+pw/2,height-25,v.xLabel||'入力・時間','cv-axis-title')+text(x0,y0-17,v.yLabel||'値','cv-axis-title','start');
 return `<div class="cv-plot-legend">${series.map((s,i)=>button('cv:series:'+i,s.name||'系列'+(i+1),focus,`cv-series-${i%palette.length}`)).join('')}</div><div class="cv-scroll cv-plot-scroll" tabindex="0" role="region" aria-label="数値の変化のグラフ">${svg(drawing,w,height,v.caption||'同じ軸で数値を比較するグラフ')}</div><details class="cv-data-details"><summary>グラフの元の値を表で見る</summary>${table({headers:['系列',v.xLabel||'x',v.yLabel||'y'],rows:series.flatMap(s=>s.points.map(point=>[s.name,point.x,point.y])).slice(0,400)},focus)}</details>`;
}
function code(v,focus){
 const lines=Array.isArray(v.code)?v.code:String(v.code||'').split('\n'),variables=Object.entries(v.values||{});
 return `<div class="cv-program"><div class="cv-code-scroll" tabindex="0" role="region" aria-label="現在の実行位置とコード"><ol class="cv-code">${lines.map((line,i)=>`<li class="${i===v.line?'is-current':''}"${i===v.line?' aria-current="step"':''}><span class="cv-line-number">${i+1}</span><code>${h(line||' ')}</code></li>`).join('')}</ol></div><section class="cv-values"><h3>この環境から見える値</h3><dl>${variables.map(([name,x])=>`<div>${button('cv:var:'+name,name,focus)}<dd>${fmt(x)}</dd></div>`).join('')||'<p class="cv-empty">まだ変数はありません。</p>'}</dl></section>${v.scopes?.length?`<details class="cv-data-details"><summary>名前が属する環境を見る</summary>${cells({rows:v.scopes},focus)}</details>`:''}${v.heap?.length?`<section class="cv-heap"><h3>参照先の配列</h3>${cells({rows:v.heap},focus)}</section>`:''}${v.output?`<section class="cv-output"><h3>ここまでの出力</h3><pre>${h(v.output.length?v.output.join('\n'):'まだ出力していません')}</pre></section>`:''}</div>`;
}
function diagram(v,focus){
 return `<div class="cv-story">${(v.items||[]).map((item,i)=>{const x=typeof item==='object'?item:{label:item};return `<section class="cv-story-item${i===v.active||x.active?' is-linked':''}${x.failed?' is-failed':''}"><span class="cv-story-index">${i+1}</span><div><h3>${button('cv:item:'+i,x.label??x.name??'段階'+(i+1),focus)}</h3>${x.text?`<p>${h(x.text)}</p>`:''}${x.value!==undefined?`<strong>${fmt(x.value)}</strong>`:''}</div></section>`;}).join('')}</div>`;
}
const renderers={table,matrix,cells,bits:(v,focus)=>cells(v,focus,true),graph,plot,code,diagram};
K.renderVisual=(v,ctx={})=>{
 const renderer=renderers[v.kind];if(!renderer)throw Error('未登録の教材図です: '+v.kind);
 return `<div class="cv-scene" data-cv-kind="${h(v.kind)}">${equation(v)}${renderer(v,ctx.focus)}${v.kind==='table'?'':caption(v)}</div>`;
};
L.visualize=(v,ctx={})=>v?.type==='curriculum-board'?K.renderVisual(v,ctx):previous(v,ctx);
})();
