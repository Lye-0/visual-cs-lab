/* Preserve the values actually calculated by a model beside its explanation.
 * This is not a score or a required page layout. Empty values create no UI.
 * Final answers stay hidden until the corresponding sequence has finished. */
(() => {
'use strict';
const X=CSL.experiences;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
X.valueEntries=values=>Object.entries(values||{}).map(([label,value])=>({label,text:value===null||value===undefined?'—':typeof value==='object'?JSON.stringify(value):String(value)}));
X.valuesMarkup=(values,kind='frame')=>{
 const entries=X.valueEntries(values);if(!entries.length)return '';
 if(!['frame','result'].includes(kind))throw Error('Unknown value group');
 return `<dl class="ex-calculated-values" data-ex-values="${kind}" aria-label="${kind==='frame'?'この状態で計算した値':'この入力で得られた最終結果'}">${entries.map(e=>'<div><dt>'+escape(e.label)+'</dt><dd>'+escape(e.text)+'</dd></div>').join('')}</dl>`;
};
X.finalValues=(result,kind,index,limit)=>{
 if(!result?.frames?.length)return {};
 const atEnd=kind==='ledger'?limit>=result.frames.length:index===result.frames.length-1;
 return atEnd?result.metrics||{}:{};
};
})();
