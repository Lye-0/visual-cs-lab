/* Stateless application shell. Only the open experiment keeps temporary state. */
(() => {
'use strict';
const L = CSL, {h, icon} = L;
// Delete this app's old v1 data only. Do not read it or touch other apps' keys.
// This is best effort: file:// and sandboxed documents may deny storage access.
try { globalThis.localStorage?.removeItem('visual-cs-lab:v1'); } catch { /* No storage is required. */ }
const A = L.app = {
  page: '', views: {}, current: null, viewToken: 0, modalFocus: null,
  settings: {reduceMotion: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false}
};
let toastTimer;
A.toast = (message, error = false) => {
  const el = document.getElementById('toast'); if (!el) return;
  clearTimeout(toastTimer);
  el.className = 'toast' + (error ? ' error' : '');
  el.innerHTML = icon(error ? 'info' : 'check', 17) + `<span>${h(message)}</span>`;
  el.hidden = false; toastTimer = setTimeout(() => el.hidden = true, 4200);
};
A.trackName = t => ({core:'情報科学の基礎・応用',network:'ネットワーク',security:'セキュリティ',missions:'総合演習'}[t] || t);
A.trackIcon = t => ({core:'flask',network:'network',security:'shield',missions:'terminal'}[t] || 'flask');
A.area = id => L.areas.find(a => a.id === id);
A.lab = id => L.labs.find(l => l.id === id);
A.pill = (track, label) => `<span class="pill ${h(track)}">${h(label || A.trackName(track))}</span>`;
A.button = (label, action, ic = 'arrow', cls = '', attrs = '') => `<button type="button" class="btn ${cls}" data-action="${h(action)}" ${attrs}>${ic ? icon(ic,16) : ''}${h(label)}</button>`;
A.link = (url, label, ic = 'arrow', cls = '') => `<a href="${h(url)}" class="btn ${cls}">${ic ? icon(ic,16) : ''}${h(label)}</a>`;
A.heading = (eyebrow, title, desc, actions = '') => `<div class="page-heading"><div><div class="eyebrow">${h(eyebrow)}</div><h1>${h(title)}</h1><p>${h(desc)}</p></div>${actions ? `<div class="button-row">${actions}</div>` : ''}</div>`;
A.footer = () => `<footer class="page-footer"><span>VISUAL CS LAB <span class="muted">/</span> ${L.version}　<span class="footer-privacy">学習履歴は保存しません</span></span><a href="#/sources">教材の前提と参考資料 ${icon('external',11)}</a></footer>`;
A.labCard = lab => `<article class="lab-card" data-lab-id="${h(lab.id)}"><a href="#/lab/${h(lab.id)}" class="unit-link"><div class="lab-card-top">${A.pill(lab.track, lab.topic || A.area(lab.area)?.name)}<span class="level-label">${['','入門','基礎＋','発展'][lab.level] || '入門'}</span></div><h3>${h(lab.unit)}</h3><p class="unit-summary">${h(lab.summary)}</p><div class="card-question">${h(lab.question)}</div><div class="lab-card-bottom"><span>${lab.minutes} 分の目安</span><span class="open-unit">実験を開く ${icon('arrow',16)}</span></div></a></article>`;
A.openModal = (content, opts = {}) => {
  A.stop?.(); // Searching and reading a term should not advance the experiment behind the dialog.
  // Keep the focus return point when one dialog replaces another.
  if (!document.querySelector('.modal')) A.modalFocus = document.activeElement;
  const holder = document.getElementById('modal-holder');
  holder.innerHTML = `<div class="modal-backdrop" data-backdrop="true"><section class="modal${opts.search ? ' search-modal' : ''}" role="dialog" aria-modal="true" aria-label="${h(opts.label || '詳細')}" tabindex="-1">${content}</section></div>`;
  document.querySelector('.app-shell').inert = true;
  document.body.style.overflow = 'hidden';
  setTimeout(() => holder.querySelector('input,button,a,textarea,[tabindex="-1"]')?.focus(), 0);
};
A.closeModal = () => {
  const holder = document.getElementById('modal-holder');
  if (!holder?.children.length) return;
  holder.innerHTML = ''; document.querySelector('.app-shell').inert = false;
  document.body.style.overflow = '';
  if (A.modalFocus?.isConnected) A.modalFocus.focus({preventScroll:true});
  A.modalFocus = null;
};
A.showGlossary = (term, labId) => {
  const items = term ? L.glossary.filter(x => x.term === term && (!labId || x.lab === labId)) : L.glossary;
  A.openModal(`<div class="modal-header"><strong>用語の説明</strong><button type="button" class="btn icon-only ghost" data-action="close-modal" aria-label="閉じる">${icon('close')}</button></div><div class="modal-body"><p class="muted">必要な言葉を、関連する実験と一緒に確認できます。</p>${items.map(x => `<section class="glossary-entry"><h2>${h(x.term)}</h2><p>${h(x.definition)}</p><a class="btn sm" href="#/lab/${h(x.lab)}" data-close-modal>${h(A.lab(x.lab)?.unit || '関連する実験')} ${icon('arrow',15)}</a></section>`).join('')}</div>`, {label:'用語の説明'});
};
const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0)-0x60)).trim();
A.searchLabs = query => {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return L.labs.filter(l => {
    const haystack = normalize([l.title,l.unit,l.summary,l.question,l.id,l.topic,l.course,A.area(l.area)?.name,l.keywords || '',L.glossary.filter(g => g.lab === l.id).map(g => g.term+' '+g.definition).join(' ')].join(' '));
    return words.every(w => haystack.includes(w));
  }).sort((a,b) => {
    if (!words.length) return 0;
    const score = l => words.reduce((n,w) => n + (normalize(l.unit).includes(w) ? 4 : 0) + (normalize(l.title).includes(w) ? 2 : 0),0);
    return score(b) - score(a);
  });
};
A.openSearch = () => {
  A.openModal(`<div class="modal-header">${icon('search')}<input id="global-search" type="search" placeholder="単元名・用語・疑問から探す" aria-label="単元と用語を検索" autocomplete="off"><button type="button" class="btn icon-only ghost" data-action="close-modal" aria-label="閉じる">${icon('close',18)}</button></div><div class="search-results" id="global-results"></div><div class="search-footer">Enterで先頭の実験を開く · Escで閉じる</div>`, {search:true,label:'単元を探す'});
  A.updateSearch('');
};
A.updateSearch = q => {
  const all = A.searchLabs(q), results = q.trim() ? all.slice(0,18) : ['n01-packet','n11-tcp','s06-tls','s10-cors','c16-git','c09-cpu'].map(A.lab);
  const el = document.getElementById('global-results'); if (!el) return;
  el.innerHTML = `<div class="search-caption" role="status">${q.trim() ? `${all.length} 件の実験` : 'はじめやすい単元'}</div>${results.map(l => `<a class="search-result" href="#/lab/${h(l.id)}" data-close-modal><div class="square-icon">${icon(A.trackIcon(l.track))}</div><div><h4>${h(l.unit)}</h4><p>${h(l.summary)}</p></div>${icon('arrow',15)}</a>`).join('') || '<div class="empty-state">見つかりませんでした。用語を短くするか、「通信」「認証」「メモリ」などで探してください。</div>'}${q.trim() && all.length > 18 ? `<a href="#/catalog?q=${encodeURIComponent(q)}" class="btn search-all" data-close-modal>すべての検索結果を見る (${all.length}件) ${icon('arrow',15)}</a>` : ''}`;
};
A.shell = () => {
  document.getElementById('app').innerHTML = `<a class="skip" href="#main" data-action="skip-main">本文へ移動</a><div class="app-shell"><aside class="sidebar" id="sidebar" aria-label="メインナビゲーション"><a href="#/" class="brand"><span class="brand-symbol">${icon('flask',31)}</span><span><span class="brand-name">VISUAL CS LAB</span><br><span class="brand-sub">LEARN BY EXPLORING.</span></span></a><nav><div class="side-heading">単元を探す</div>${[['#/','search','学びたいことから','home'],['#/catalog','grid','すべての単元','catalog'],['#/curriculum','book','授業から探す','curriculum'],['#/routes','route','おすすめの順番','routes'],['#/map','map','分野のつながり','map']].map(([url,ic,title,id])=>`<a class="nav-link" data-nav="${id}" href="${url}">${icon(ic,18)}<span>${title}</span>${id === 'catalog' ? `<span class="nav-number">${L.labs.length}</span>` : ''}</a>`).join('')}<div class="side-heading">専門の実験室</div>${[['network','ネットワーク'],['security','セキュリティ'],['missions','総合演習']].map(([tr,name])=>`<a class="nav-link" data-nav="${tr}" href="#/catalog?track=${tr}"><span class="nav-dot ${tr}"></span><span>${name}</span><span class="nav-number">${L.labs.filter(l=>l.track===tr).length}</span></a>`).join('')}<div class="side-heading">使い方と参考資料</div>${[['#/sources','info','教材と参考資料','sources'],['#/settings','settings','操作ガイド・表示','settings']].map(([url,ic,name,id])=>`<a class="nav-link" data-nav="${id}" href="${url}">${icon(ic,18)}<span>${name}</span></a>`).join('')}</nav><div class="side-footer"><div class="offline"><i class="status-dot"></i>NO ACCOUNT · NO HISTORY</div><p>探す → 試す → 変化を見る<br>どの単元からでも始められます。</p></div></aside><div class="drawer-shade" id="drawer-shade"></div><div class="layout"><header class="topbar"><div class="breadcrumb"><button type="button" class="btn ghost icon-only mobile-menu" data-action="menu" aria-label="メニューを開く" aria-expanded="false">${icon('menu',20)}</button><a href="#/">学びたいことから</a><span class="slash">/</span><span id="breadcrumb-page"></span></div><div class="top-actions"><button type="button" class="search-trigger" data-action="search">${icon('search',15)}<span>単元・用語を検索</span><kbd class="kbd">Ctrl K</kbd></button><span class="course-badge">${icon('shield',14)} Security & Network</span></div></header><main class="main" id="main" tabindex="-1"></main></div></div><div id="modal-holder"></div><div class="toast" id="toast" role="status" aria-live="polite" hidden></div>`;
};
A.setNav = (id,title) => {
  document.querySelectorAll('[data-nav]').forEach(el => { el.classList.toggle('active',el.dataset.nav===id); if(el.dataset.nav===id)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current'); });
  document.getElementById('breadcrumb-page').textContent = title;
  const home = id === 'home';
  document.getElementById('breadcrumb-page').hidden = home;
  document.querySelector('.breadcrumb .slash').hidden = home;
};
A.setTitle = title => document.title = (title ? title+' · ' : '')+'Visual CS Lab';
A.navigate = () => {
  clearTimeout(toastTimer); const toast=document.getElementById('toast'); if(toast)toast.hidden=true;
  A.current?.player?.dispose(); clearTimeout(A.parameterTimer); clearTimeout(A.searchTimer);
  A.viewToken++; A.current = null; A.closeDrawer(); A.closeModal();
  document.body.classList.toggle('reduce-motion',A.settings.reduceMotion);
  const raw=location.hash.slice(1)||'/',[path,qs='']=raw.split('?'),params=new URLSearchParams(qs),parts=path.split('/').filter(Boolean);
  let page=parts[0]||'home'; if (page === 'notebook') page = 'catalog'; // Old bookmarks remain usable; no notebook exists.
  A.page=page; A.params=params;
  const main=document.getElementById('main'); main.innerHTML='';
  const view=A.views[page]; if(view)view(parts.slice(1),params);else A.views.notfound();
  window.scrollTo({top:0,behavior:'instant'});
};
A.closeDrawer = () => {
  document.getElementById('sidebar')?.classList.remove('open'); document.getElementById('drawer-shade')?.classList.remove('open');
  document.querySelector('.mobile-menu')?.setAttribute('aria-expanded','false');
};
})();
