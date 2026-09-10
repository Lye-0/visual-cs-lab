/* Navigation and topic explanations. No history, notes or persisted preferences. */
(() => {
'use strict';
const L=CSL,K=L.curriculum,h=L.h;
if(typeof document==='undefined')return;
let queued=false;
function catalogue(){
 const root=document.querySelector('.main');
 if(!root||root.querySelector('[data-cv-catalogue]'))return;
 const fragment=document.createElement('section');fragment.className='cv-catalogue-gateway';fragment.dataset.cvCatalogue='true';
 fragment.innerHTML=`<details><summary>カリキュラムの追加テーマを探す <span>GAP-001〜155</span></summary><div class="cv-catalogue-content"><p>単元名・関連科目・GAP番号から直接開けます。学習順の制限や履歴の保存はありません。</p><label for="cv-curriculum-query">追加テーマの検索</label><input id="cv-curriculum-query" type="search" placeholder="例：GAP-037、固有値、データベース" autocomplete="off"><p role="status" aria-live="polite" data-cv-match-count>155テーマ</p><div class="cv-curriculum-index">${K.groups.map(g=>`<section class="cv-curriculum-group" data-cv-group><h2>${h(g.name)}</h2><p>${h(g.course)}</p><div class="cv-curriculum-links">${K.entries.filter(e=>e.group===g.id).sort((a,b)=>a.number-b.number).map(e=>{const lab=L.labs.find(l=>l.id===e.id);return `<a href="#/lab/${h(e.id)}" class="cv-curriculum-link" data-cv-query="${h([e.tag,e.title,g.name,g.course,...lab.coverage.targets.map(x=>x.name)].join(' ').toLowerCase())}"><small>${h(e.tag)}</small><strong>${h(e.title)}</strong><span>${h(lab.question)}</span></a>`;}).join('')}</div></section>`).join('')}</div><p data-cv-no-results hidden>一致するテーマがありません。短い用語やGAP番号でも検索できます。</p></div></details>`;
 const heading=root.querySelector('.page-heading');
 if(heading)heading.after(fragment);else root.prepend(fragment);
 const input=fragment.querySelector('input');
 input.addEventListener('input',()=>{const terms=input.value.trim().normalize('NFKC').toLowerCase().split(/\s+/).filter(Boolean);let count=0;for(const link of fragment.querySelectorAll('[data-cv-query]')){const query=link.dataset.cvQuery.normalize('NFKC');link.hidden=!terms.every(term=>query.includes(term));if(!link.hidden)count++;}for(const group of fragment.querySelectorAll('[data-cv-group]'))group.hidden=![...group.querySelectorAll('[data-cv-query]')].some(a=>!a.hidden);fragment.querySelector('[data-cv-match-count]').textContent=count+'テーマ';fragment.querySelector('[data-cv-no-results]').hidden=count!==0;});
}
function topics(){
 const current=L.app?.current,lab=current?.lab,host=document.getElementById('reader-guidance');
 if(!current?.reader||!lab?.gapId||!host||host.querySelector('[data-cv-topic-guide]'))return;
 const section=document.createElement('section');section.className='cv-lesson-sections';section.dataset.cvTopicGuide=lab.id;
 section.setAttribute('aria-label','この単元で使う考え方');
 section.innerHTML=`<h3>この単元で使う考え方 <small>${h(lab.gapId)}</small></h3>${lab.reading.sections.map(([name,description,formula])=>`<details><summary>${h(name)}</summary><div class="cv-section-body"><p>${h(description)}</p>${formula?`<div class="cv-section-formula">${h(formula)}</div>`:''}</div></details>`).join('')}<p class="cv-caption">実験で再現する方式・規模・前提は「モデルと根拠」で確認できます。</p>`;
 host.append(section);
}
function update(){queued=false;const route=location.hash.split('?')[0];if(route.startsWith('#/catalog')||route.startsWith('#/courses'))catalogue();topics();}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(update);}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
addEventListener('hashchange',schedule);schedule();
})();
