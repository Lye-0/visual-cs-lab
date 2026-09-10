/* Safe raster inspection. Pixels are computed model data, not remote images. */
(() => {
'use strict';
const L=CSL,h=L.h,previous=L.visualize;
L.visualize=(v,ctx={})=>{
 if(v?.type!=='curriculum-raster')return previous(v,ctx);
 const pixels=v.pixels,rows=pixels?.length,columns=pixels?.[0]?.length;
 if(!rows||rows>64||!columns||columns>64||pixels.some(row=>row.length!==columns))throw Error('画像は同じ幅の1〜64行・列にしてください。');
 const pick=ctx.focus?.match(/^cv:pixel:(\d+):(\d+)$/),y=pick?Number(pick[1]):0,x=pick?Number(pick[2]):0;
 const color=value=>{const a=Array.isArray(value)?value:[value,value,value];if(a.length<3||a.slice(0,3).some(v=>!Number.isFinite(v)))throw Error('画素のRGB値は有限の数値です。');return a.slice(0,3).map(v=>Math.max(0,Math.min(255,Math.round(v))));};
 const chosen=pixels[y]?.[x],caption=v.caption||'計算した画像';
 return `<figure class="cv-raster"><figcaption>${h(caption)}</figcaption><div class="cv-raster-frame"><div class="cv-pixels" role="grid" aria-label="${h(caption)}。矢印キーで画素を選びます" aria-rowcount="${rows}" aria-colcount="${columns}" data-columns="${columns}" style="--cv-pixel-columns:${columns}">${pixels.map((row,yy)=>`<div role="row" class="cv-pixel-row">${row.map((value,xx)=>{const rgb=color(value),selected=yy===y&&xx===x;return `<button type="button" role="gridcell" class="cv-pixel${selected?' is-picked':''}" tabindex="${selected?0:-1}" data-r-focus="cv:pixel:${yy}:${xx}" aria-rowindex="${yy+1}" aria-colindex="${xx+1}" aria-selected="${selected}" aria-label="x ${xx}、y ${yy}、RGB ${rgb.join(', ')}" style="background:rgb(${rgb.join(' ')})"></button>`;}).join('')}</div>`).join('')}</div></div><p class="cv-pixel-readout" aria-live="polite">${chosen===undefined?'画素を選んでください。':`選択中：x=${x}、y=${y} ／ ${Array.isArray(chosen)?'RGB':'値'} = <strong>${h(Array.isArray(chosen)?chosen.map(v=>Number(v.toFixed(5))).join(', '):Number(chosen.toFixed(5)))}</strong>`}</p><p class="cv-caption">色の表示は0〜255へ丸めています。値の欄は計算値です。マウス・タップ・矢印キーで位置を変えられます。</p></figure>`;
};
if(typeof document!=='undefined')document.addEventListener('keydown',event=>{
 const pixel=event.target.closest?.('.cv-pixel');if(!pixel||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
 const grid=pixel.closest('.cv-pixels'),columns=Number(grid.dataset.columns),rows=Number(grid.getAttribute('aria-rowcount'));let x=Number(pixel.getAttribute('aria-colindex'))-1,y=Number(pixel.getAttribute('aria-rowindex'))-1;
 if(event.key==='ArrowLeft')x--;if(event.key==='ArrowRight')x++;if(event.key==='ArrowUp')y--;if(event.key==='ArrowDown')y++;if(event.key==='Home')x=0;if(event.key==='End')x=columns-1;
 x=Math.max(0,Math.min(columns-1,x));y=Math.max(0,Math.min(rows-1,y));event.preventDefault();event.stopPropagation();
 const key=`cv:pixel:${y}:${x}`,target=grid.querySelector(`[data-r-focus="${key}"]`);target?.click();queueMicrotask(()=>document.querySelector(`#reader-diagram [data-r-focus="${key}"]`)?.focus({preventScroll:true}));
});
})();
