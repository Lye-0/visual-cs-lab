/* Shared discovery UI. No saved filters, learning records or duplicate GAP list. */
(() => {
'use strict';
const L=CSL,T=L.taxonomy,h=L.h,icon=L.icon;
if(typeof document==='undefined')return;
const A=L.app,$=id=>document.getElementById(id);
const levels=['','入門','基礎＋','発展'];
const link=(params={})=>'#/catalog'+(Object.keys(params).length?'?'+new URLSearchParams(params):'');
const unique=ids=>[...new Set(ids)].map(A.lab).filter(Boolean);
const scopeCopy=p=>Object.fromEntries([...p].filter(([k,v])=>v&&['q','domain','category','level','area','track','topic'].includes(k)));
let focusResults=false;
function render(body,title,nav='catalog'){
 A.setTitle(title);A.setNav(nav,title);$('main').innerHTML=body+A.footer();
}
function cleanParams(p){
 const q=(p.get('q')||'').slice(0,200);if(q)p.set('q',q);else p.delete('q');
 if(p.has('domain')&&!T.domain(p.get('domain')))p.delete('domain');
 if(p.has('category')){const c=T.category(p.get('category'));if(c)p.set('domain',c.domain);else p.delete('category');}
 if(!['1','2','3'].includes(p.get('level')))p.delete('level');
 if(p.has('area')&&!A.area(p.get('area')))p.delete('area');
 // Old URLs keep working; network/security now use the common classification.
 if(['network','security'].includes(p.get('track'))&&!p.has('domain')){p.set('domain',p.get('track'));p.delete('track');}
 if(p.get('track')==='missions'&&!p.has('category')){p.set('domain','practice');p.set('category','practice-missions');p.delete('track');}
 if(p.has('track')&&!['core','network','security','missions'].includes(p.get('track')))p.delete('track');
 if(p.has('topic')&&!/^[NS]\d{2}$/.test(p.get('topic')))p.delete('topic');
 p.delete('favorites');return p;
}
function nextParams(key,value){
 const p=new URLSearchParams(A.params);
 if(key==='all')return new URLSearchParams();
 if(value)p.set(key,value);else p.delete(key);
 if(key==='domain'){p.delete('category');p.delete('area');p.delete('track');p.delete('topic');}
 if(key==='category'){const c=T.category(value);if(c)p.set('domain',c.domain);p.delete('area');p.delete('track');p.delete('topic');}
 if(key==='area'||key==='track'){p.delete('domain');p.delete('category');p.delete('topic');}
 return cleanParams(p);
}
function headingPath(lab){
 const [d,c]=T.path(lab);
 return `<nav class="library-breadcrumb" aria-label="単元の分類"><a href="#/catalog">すべての単元</a><span aria-hidden="true">/</span><a href="${link({domain:d.id})}">${h(d.name)}</a><span aria-hidden="true">/</span><a href="${link({domain:d.id,category:c.id})}">${h(c.name)}</a></nav>`;
}
A.searchLabs=T.search;
A.labCard=lab=>{
 const [d,c]=T.path(lab);
 return `<a class="lab-card library-unit" data-lab-id="${h(lab.id)}" data-category="${c.id}" href="#/lab/${h(lab.id)}"><div class="library-unit-meta"><span class="library-tag">${h(d.name)} / ${h(c.name)}</span><span class="library-level">${levels[lab.level]||'基礎＋'}</span></div><h3>${h(lab.unit)}</h3><p class="library-unit-summary">${h(lab.summary)}</p><div class="library-unit-question">${h(lab.question)}</div><div class="library-unit-foot"><span>${lab.presentation==='direct'?'入力して確かめる':'手順を追って確かめる'}</span><span>${lab.gapId?h(lab.gapId):'解説と実験'} ${icon('arrow',15)}</span></div></a>`;
};
function grouped(labs,{compact=false}={}){
 if(!labs.length)return '';
 const groups=new Map();for(const lab of labs){const key=lab.taxonomy.category;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(lab);}
 return T.categories.filter(c=>groups.has(c.id)).map(c=>{
  const rows=groups.get(c.id),d=T.domain(c.domain);
  return `<section class="library-topic-section" data-library-category="${c.id}"><header class="library-topic-heading"><div><p class="library-overline">${h(d.name)}</p><h2>${h(c.name)} <span class="library-count">${rows.length}</span></h2>${compact?'':`<p>${h(c.description)}</p>`}</div></header><div class="library-unit-grid">${rows.map(A.labCard).join('')}</div></section>`;
 }).join('');
}
function domainCards(){return T.domains.map(d=>`<a class="library-domain-card" data-library-domain="${d.id}" href="${link({domain:d.id})}"><div class="library-domain-top">${icon(d.icon,23)}<span>${d.count}単元</span></div><h2>${h(d.name)}</h2><p>${h(d.description)}</p><small>${T.categories.filter(c=>c.domain===d.id).slice(0,4).map(c=>h(c.name)).join(' / ')} …</small><span class="library-card-cta">テーマを選ぶ ${icon('arrow',15)}</span></a>`).join('');}
function readingLinks(){return L.readingCourses.filter(c=>!c.id.startsWith('curriculum-')).map(c=>`<a class="library-reading-link" href="#/course/${h(c.id)}"><strong>${h(c.name)}</strong><span>${h(c.description)}</span>${icon('arrow',16)}</a>`).join('');}
A.views.home=()=>{
 render(`<section class="library library-home"><header class="library-hero"><p class="library-overline">VISUAL CS LAB / EXPLORE COMPUTER SCIENCE</p><h1>学びたいことを、<br class="mobile-only">見つけよう。</h1><p>分野を選ぶ。小さな例を読む。図を動かして確かめる。</p><form id="home-search-form" class="home-search" role="search"><label class="sr-only" for="home-query">単元名・用語・科目名</label>${icon('search',21)}<input id="home-query" name="q" type="search" placeholder="例：線形代数、TCP、オブジェクト指向、GAP-037" autocomplete="off"><button class="btn primary" type="submit">探す</button></form><div class="quick-terms">${['エントロピー','仮想メモリ','SQL','自然言語処理','TCP','認証'].map(q=>`<button type="button" data-action="home-query" data-query="${h(q)}">${h(q)}</button>`).join('')}</div></header><section id="home-results" aria-label="単元の検索結果" hidden></section><div id="home-browse"><header class="library-section-title"><div><h2>分野から探す</h2><p>${T.domains.length}つの大分類・${T.categories.length}のテーマ。全${L.labs.length}単元を重複なく整理しています。</p></div><a href="#/catalog">すべての単元 ${icon('arrow',15)}</a></header><div class="library-domain-grid">${domainCards()}</div><section class="library-course-shortcuts"><h2>授業・説明の順番から探す</h2><div class="library-reading-links">${readingLinks()}<a class="library-reading-link" href="#/curriculum"><strong>科目名から探す</strong><span>科目名で絞り、必要な授業の単元だけを開けます。</span>${icon('arrow',16)}</a></div></section><section><header class="library-section-title"><div><h2>小さな例から始める</h2><p>知らない言葉は、図と一緒に確かめられます。</p></div><a href="#/routes">おすすめの順番 →</a></header><div class="library-unit-grid">${['c01-entropy','c08-adder','c10-address-spaces','gap-037','n11-tcp','s08-access'].map(id=>A.labCard(A.lab(id))).join('')}</div></section></div></section>`,'学びたい単元を探す','home');
};
A.homeSearch=q=>{
 const results=$('home-results'),browse=$('home-browse');if(!results)return;
 const active=!!q.trim();results.hidden=!active;browse.hidden=active;
 if(!active){results.innerHTML='';return;}
 const labs=T.search(q);
 results.innerHTML=`<header class="library-section-title"><div><h2>「${h(q)}」の検索結果</h2><p role="status">${labs.length}件。分類の見出しから選べます。</p></div><button type="button" class="btn ghost" data-action="home-query" data-query="">検索をクリア</button></header>${grouped(labs)||'<p class="library-empty">一致する単元がありません。短い用語でも検索できます。</p>'}`;
};
function facetButton(key,id,label,count,selected,cls=''){
 return `<button type="button" class="library-facet ${cls}${selected?' active':''}" data-filter="${key}" data-value="${id}" aria-pressed="${selected}"><span>${h(label)}</span><span class="library-count">${count}</span></button>`;
}
function navigation(p,counts,openIds=[]){return T.domains.map(d=>{
 const active=p.get('domain')===d.id;
 return `<details class="library-nav-group" data-library-nav="${d.id}"${active||openIds.includes(d.id)?' open':''}><summary><span>${h(d.name)}</span><span class="library-count">${counts.domains[d.id]}</span></summary><div>${facetButton('domain',d.id,'この分野をすべて',counts.domains[d.id],active&&!p.get('category'))}${T.categories.filter(c=>c.domain===d.id).map(c=>facetButton('category',c.id,c.name,counts.categories[c.id],p.get('category')===c.id)).join('')}</div></details>`;
}).join('');}
function selectionTitle(p){return T.category(p.get('category'))?.name||T.domain(p.get('domain'))?.name||'すべての単元';}
function activeFilters(p){
 const names={domain:v=>T.domain(v)?.name,category:v=>T.category(v)?.name,level:v=>levels[v],area:v=>'旧分野：'+(A.area(v)?.name||v),track:v=>'旧一覧：'+A.trackName(v),topic:v=>'旧テーマ：'+v};
 const chips=Object.entries(names).filter(([key])=>p.has(key)).map(([key,get])=>`<button type="button" data-filter="${key}" data-value="" class="library-chip" aria-label="${h(get(p.get(key)))}の絞り込みを解除">${h(get(p.get(key)))} ${icon('close',12)}</button>`).join('');
 return chips?chips+'<button type="button" class="btn sm ghost" data-filter="all" data-value="">すべて解除</button>':'<span class="library-caption">分類は主な学習内容に基づきます。複数の分野に関わる単元も、件数は重複させません。</span>';
}
A.catalogSelection=()=>T.select(A.params);
A.updateCatalogResults=()=>{
 if(!$('catalog-results'))return;
 const p=A.params,labs=A.catalogSelection(),base=new URLSearchParams(p);base.delete('domain');base.delete('category');
 const counts=T.counts(T.select(base));
 const openIds=[...document.querySelectorAll('[data-library-nav][open]')].map(el=>el.dataset.libraryNav);
 $('library-topic-nav').innerHTML=navigation(p,counts,openIds);
 $('library-domains').innerHTML=facetButton('domain','','すべて',counts.total,!p.get('domain'))+T.domains.map(d=>facetButton('domain',d.id,d.name,counts.domains[d.id],p.get('domain')===d.id)).join('');
 $('library-applied-filters').innerHTML=activeFilters(p);
 $('catalog-count').textContent=`${labs.length} 件の単元`;
 const q=p.get('q');
 $('library-search-note').textContent=q?`「${q}」を現在の条件で検索しています。分類の件数もこの検索に連動します。`:'単元を選ぶと、解説と操作できる図が開きます。';
 const clear={...scopeCopy(p)};delete clear.domain;delete clear.category;delete clear.track;delete clear.area;delete clear.topic;
 $('catalog-results').innerHTML=grouped(labs)||`<section class="library-empty"><h2>条件に合う単元がありません。</h2><p>分類の条件を外すか、短い用語で検索してください。</p><div class="button-row"><a class="btn" href="${link(clear)}">他の分野も含めて探す</a><button class="btn ghost" data-filter="all" data-value="" type="button">すべての条件を解除</button></div></section>`;
};
A.catalogSearch=q=>{
 q=q.slice(0,200);if(q)A.params.set('q',q);else A.params.delete('q');
 try{history.replaceState(null,'',link(scopeCopy(A.params)));}catch{}
 A.updateCatalogResults();
};
A.filter=(key,value)=>{
 const p=nextParams(key,value);focusResults=true;
 const target=link(scopeCopy(p));
 if(location.hash===target){A.params=p;A.views.catalog([],p);}else location.hash=target;
};
A.views.catalog=(_,params)=>{
 const p=cleanParams(new URLSearchParams(params));A.params=p;
 const canonical=link(scopeCopy(p));if(location.hash!==canonical)try{history.replaceState(null,'',canonical);}catch{}
 const d=T.domain(p.get('domain')),c=T.category(p.get('category')),title=selectionTitle(p);
 const desc=c?.description||d?.description||'大分類からテーマへ。単元名・用語・科目名・GAP番号でも探せます。';
 const breadcrumb=`<nav class="library-breadcrumb" aria-label="選択中の分類"><a href="#/catalog">すべての単元</a>${d?`<span aria-hidden="true">/</span><a href="${link({domain:d.id})}">${h(d.name)}</a>`:''}${c?`<span aria-hidden="true">/</span><span aria-current="page">${h(c.name)}</span>`:''}</nav>`;
 render(`<section class="library library-catalog" data-cv-catalogue="true">${breadcrumb}<header class="library-catalog-heading"><p class="library-overline">SUBJECT LIBRARY</p><h1 id="library-selection-heading" tabindex="-1">${h(title)}</h1><p>${h(desc)}</p></header><div class="library-domain-bar" id="library-domains" aria-label="大分類を選ぶ"></div><div class="library-catalog-layout"><aside class="library-category-panel" aria-label="テーマ別の絞り込み"><details id="library-filter-drawer"${matchMedia('(min-width: 1200px)').matches?' open':''}><summary>テーマから絞り込む <span>${c?h(c.name):d?h(d.name):'すべて'}</span></summary><nav id="library-topic-nav" aria-label="大分類とテーマ"></nav></details></aside><div class="library-results-pane"><form class="library-search-row" id="catalog-search" role="search"><label class="sr-only" for="catalog-query">現在の分類から単元を検索</label>${icon('search',20)}<input id="catalog-query" name="q" type="search" autocomplete="off" value="${h(p.get('q')||'')}" placeholder="単元名・用語・科目名・GAP番号" aria-controls="catalog-results"><button type="submit" class="btn primary">検索</button></form><div class="library-level-row"><label for="filter-level">学習の段階 <select id="filter-level" data-filter-select="level"><option value="">すべて</option>${[1,2,3].map(n=>`<option value="${n}"${p.get('level')===String(n)?' selected':''}>${levels[n]}</option>`).join('')}</select></label><span id="catalog-count" role="status" aria-live="polite"></span></div><div id="library-applied-filters" class="library-applied-filters"></div><p id="library-search-note" class="library-caption"></p><div id="catalog-results"></div></div></div></section>`,title,d?'domain-'+d.id:'catalog');
 A.updateCatalogResults();
 if(focusResults){focusResults=false;$('library-selection-heading').focus({preventScroll:true});}
};
function courseList(){
 const byName=new Map();
 for(const course of L.courses){if(!byName.has(course.name))byName.set(course.name,{...course,labs:[]});byName.get(course.name).labs.push(...course.labs);}
 return [...byName.values()].map(c=>({...c,labs:[...new Set(c.labs)].filter(A.lab)})).filter(c=>c.labs.length);
}
const courses=courseList();
function courseDetails(course,index){
 const labs=unique(course.labs),names=[...new Set(labs.map(l=>T.domain(l.taxonomy.domain).name))];
 return `<details class="library-course-disclosure" data-library-course="${index}"><summary><span><strong>${h(course.name)}</strong><small>${h(names.join(' / '))}</small></span><span class="library-count">${labs.length}単元</span></summary><div class="library-course-content" data-course-content></div></details>`;
}
A.views.curriculum=()=>{
 render(`<section class="library library-courses"><header class="library-catalog-heading"><p class="library-overline">COURSES & READING GUIDES</p><h1>授業・科目から探す</h1><p>科目名を探し、必要な科目だけを開いて単元を選べます。</p></header><p class="library-scope-note">科目名と関連づけは既存の教材データに基づくサイト独自の案内です。大学の公式な授業範囲・試験範囲・履修条件を保証するものではありません。</p><div class="library-reading-links">${readingLinks()}</div><form class="library-search-row" id="library-course-search" role="search"><label for="library-course-query">科目名</label><input id="library-course-query" type="search" placeholder="例：情報理論、確率・統計、自然言語処理" autocomplete="off"><button type="submit" class="btn">探す</button></form><p class="library-caption" role="status" id="library-course-count">${courses.length}科目</p><div class="library-course-list">${courses.map(courseDetails).join('')}</div><p class="library-empty" id="library-course-empty" hidden>一致する科目がありません。短い科目名でも検索できます。</p></section>`,'授業から探す','curriculum');
};
A.views.courses=A.views.curriculum;
A.views.course=parts=>{
 const course=L.readingCourses.find(c=>c.id===parts[0]);if(!course)return A.views.notfound();
 render(`<section class="library library-reading-course"><nav class="library-breadcrumb" aria-label="学習ガイド"><a href="#/curriculum">授業・科目から探す</a><span>/</span><span aria-current="page">${h(course.name)}</span></nav><header class="library-catalog-heading"><p class="library-overline">READING GUIDE</p><h1>${h(course.name)}</h1><p>${h(course.description)}</p></header><p class="library-scope-note">説明の順序を参考にした案内です。実際の履修条件とは異なり、どの単元からでも開けます。</p>${course.groups.map(([name,ids],i)=>`<section class="library-reading-section"><header class="library-section-title"><div><p class="library-overline">SECTION ${String(i+1).padStart(2,'0')}</p><h2>${h(name)}</h2></div><span>${unique(ids).length}単元</span></header>${grouped(unique(ids),{compact:true})}</section>`).join('')}</section>`,course.name,'curriculum');
};
A.views.map=()=>{
 render(`<section class="library"><header class="library-catalog-heading"><p class="library-overline">THE BIG PICTURE</p><h1>情報科学の分野を見渡す</h1><p>同じ分類を、ホーム・一覧・検索・各単元で使っています。テーマを選ぶと、その単元一覧へ進めます。</p></header>${T.domains.map(d=>`<section class="library-map-domain"><header class="library-section-title"><div><h2>${icon(d.icon,21)} ${h(d.name)}</h2><p>${h(d.description)}</p></div><span>${d.count}単元</span></header><div class="library-map-grid">${T.categories.filter(c=>c.domain===d.id).map(c=>`<a class="library-map-theme" href="${link({domain:d.id,category:c.id})}"><h3>${h(c.name)} <span class="library-count">${c.count}</span></h3><p>${h(c.description)}</p></a>`).join('')}</div></section>`).join('')}</section>`,'分野のつながり','map');
};
const originalShell=A.shell;
A.shell=()=>{
 originalShell();
 const old=[...document.querySelectorAll('.sidebar [data-nav]')].filter(el=>['network','security','missions'].includes(el.dataset.nav));
 if(old.length){const anchor=old[0],heading=anchor.previousElementSibling;if(heading?.classList.contains('side-heading'))heading.textContent='分野から探す';anchor.insertAdjacentHTML('beforebegin',T.domains.map(d=>`<a class="nav-link" data-nav="domain-${d.id}" href="${link({domain:d.id})}">${icon(d.icon,17)}<span>${h(d.name)}</span><span class="nav-number">${d.count}</span></a>`).join(''));old.forEach(el=>el.remove());}
 const badge=document.querySelector('.course-badge');if(badge)badge.textContent='情報科学の実験室';
};
const originalLab=A.views.lab;
A.views.lab=(parts,params)=>{
 originalLab(parts,params);const lab=A.current?.lab;if(!lab?.taxonomy)return;
 const [d,c]=T.path(lab),title=document.querySelector('.reader-title');
 if(title){title.insertAdjacentHTML('afterbegin',headingPath(lab));const pill=title.querySelector('.reader-title-top .pill');if(pill){pill.textContent=c.name;pill.className='pill library-tag';}const back=title.querySelector('.reader-title-links a[href="#/catalog"]');if(back){back.href=link({domain:d.id,category:c.id});back.textContent='← このテーマの単元一覧';}}
 A.setNav('domain-'+d.id,lab.unit);
};
const originalUpdateSearch=A.updateSearch;
A.updateSearch=q=>{
 originalUpdateSearch(q);
 for(const el of document.querySelectorAll('#global-results .search-result')){
  const id=el.hash.split('/').at(-1),lab=A.lab(id);if(!lab?.taxonomy)continue;
  const meta=document.createElement('small');meta.className='library-search-category';meta.textContent=T.path(lab).map(c=>c.name).join(' / ');el.querySelector('h4')?.after(meta);
 }
};
function updateCourses(q){
 const words=T.normalize(q).split(/\s+/).filter(Boolean);let count=0;
 for(const el of document.querySelectorAll('[data-library-course]')){const c=courses[Number(el.dataset.libraryCourse)];el.hidden=!words.every(w=>T.normalize(c.name).includes(w));if(!el.hidden)count++;}
 $('library-course-count').textContent=count+'科目';$('library-course-empty').hidden=count!==0;
}
document.addEventListener('input',e=>{if(e.target.id==='library-course-query')updateCourses(e.target.value);});
document.addEventListener('submit',e=>{if(e.target.id==='library-course-search'){e.preventDefault();updateCourses($('library-course-query').value);}});
document.addEventListener('toggle',e=>{
 const details=e.target;if(!details.matches?.('[data-library-course]')||!details.open||details.dataset.loaded)return;
 const c=courses[Number(details.dataset.libraryCourse)];details.querySelector('[data-course-content]').innerHTML=grouped(unique(c.labs));details.dataset.loaded='true';
},true);
// Topic explanations stay next to the current lesson. The old independent GAP
// catalogue is removed: GAPs are ordinary units in the shared taxonomy now.
let queued=false;
function topics(){
 queued=false;const current=A.current,lab=current?.lab,host=$('reader-guidance');
 if(!current?.reader||!lab?.gapId||!host||host.querySelector('[data-cv-topic-guide]'))return;
 const section=document.createElement('section');section.className='cv-lesson-sections';section.dataset.cvTopicGuide=lab.id;
 section.setAttribute('aria-label','この単元で使う考え方');
 section.innerHTML=`<h3>この単元で使う考え方 <small>${h(lab.gapId)}</small></h3>${lab.reading.sections.map(([name,description,formula])=>`<details><summary>${h(name)}</summary><div class="cv-section-body"><p>${h(description)}</p>${formula?`<div class="cv-section-formula">${h(formula)}</div>`:''}</div></details>`).join('')}<p class="cv-caption">実験で再現する方式・規模・前提は「モデルと根拠」で確認できます。</p>`;
 host.append(section);
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(topics);}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
addEventListener('hashchange',schedule);schedule();
})();
