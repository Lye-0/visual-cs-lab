// Actual committed site, with mouse/keyboard controls and measured layouts.
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,firefox,webkit} from 'playwright';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const engine=process.env.BROWSER||'chromium';
const report={sourceCommit:process.env.GITHUB_SHA||'local',engine,cases:[],errors:[]};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name.startsWith('/visual-cs-lab/'))name=name.slice('/visual-cs-lab'.length);if(name==='/')name='/index.html';const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);}catch{res.writeHead(404).end();}});
server.listen(0,'127.0.0.1');await once(server,'listening');
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
async function check(name,fn){try{await fn();report.cases.push({name,passed:true});}catch(e){report.cases.push({name,passed:false,error:String(e.stack||e)});console.error('FAIL '+name+'\n'+e.stack);}}
async function visit(page,base,hash){await page.goto(base+hash);await page.waitForFunction(()=>CSL.app.ready&&!!document.querySelector('.library,.reader'));}
async function catalogue(page){await page.waitForFunction(()=>CSL.app.page==='catalog'&&!!document.getElementById('catalog-results'));}
async function layout(page){
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'horizontal page overflow');
 const cards=await page.locator('.library-unit').evaluateAll(els=>els.filter(el=>el.getClientRects().length).map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,font:parseFloat(getComputedStyle(el.querySelector('.library-unit-summary')).fontSize),text:getComputedStyle(el.querySelector('.library-unit-summary')).color,bg:getComputedStyle(el).backgroundColor})));
 for(const card of cards){assert.ok(card.width>=215,JSON.stringify(card));assert.ok(card.height<620,JSON.stringify(card));assert.ok(card.font>=14);assert.notEqual(card.text,'rgb(0, 0, 0)');}
}
try{
 browser=await {chromium,firefox,webkit}[engine].launch({headless:true});report.browser=browser.version();
 for(const [label,viewport]of [['desktop',{width:1440,height:1000}],['wide',{width:1920,height:1080}],['tablet',{width:768,height:1024}],['mobile',{width:390,height:844}],['narrow',{width:320,height:800}]]){
  const context=await browser.newContext({viewport,locale:'ja-JP',hasTouch:viewport.width<800,...(engine!=='firefox'?{isMobile:viewport.width<800}:{}),reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(10000);
  page.on('pageerror',e=>report.errors.push({label,message:e.message}));
  const bad=[];page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
  const base=origin+(label==='desktop'?'/':'/visual-cs-lab/');
  await check(label+': home has eight subject entrances, without the huge old course columns',async()=>{
   await visit(page,base,'#/');assert.equal(await page.locator('[data-library-domain]').count(),8);
   assert.equal(await page.locator('.course-grid,.cv-catalogue-gateway').count(),0);
   assert.equal(await page.locator('.sidebar [data-nav^="domain-"]').count(),8);
   await layout(page);
   await page.locator('#home-query').fill('エントロピー');
   await page.locator('#home-results a[href="#/lab/c01-entropy"]').waitFor();
   assert.ok(await page.locator('#home-results .library-unit').count()<=24);
   await page.locator('#home-results a[href="#/lab/c01-entropy"]').click();
   await page.locator('.reader-title h1').waitFor();assert.equal(await page.locator('.reader-title .library-breadcrumb a').count(),3);
   await page.locator('.reader-title-links a').filter({hasText:'このテーマの単元一覧'}).click();await catalogue(page);
   assert.ok(page.url().includes('category=math-information'));await layout(page);
  });
  await check(label+': classification controls preserve query, update counts and support zero results',async()=>{
   await visit(page,base,'#/catalog?domain=network');
   await page.locator('#catalog-query').fill('GAP-037');
   await page.waitForFunction(()=>document.getElementById('catalog-count').textContent.startsWith('0 '));
   assert.equal(await page.locator('#catalog-results .library-unit').count(),0);
   const software=page.locator('#library-domains [data-value="software"]');await software.focus();await software.press('Enter');
   await page.waitForFunction(()=>CSL.app.params.get('domain')==='software'&&document.getElementById('catalog-count').textContent.startsWith('1 '));
   assert.equal(await page.locator('#catalog-query').inputValue(),'GAP-037');
   assert.equal(await page.locator('#catalog-results .library-unit').getAttribute('data-lab-id'),'gap-037');
   assert.equal(await page.locator('#library-domains [data-value="software"]').getAttribute('aria-pressed'),'true');
   await page.locator('#filter-level').selectOption('3');
   await page.waitForFunction(()=>CSL.app.params.get('level')==='3');assert.ok(page.url().includes('q=GAP-037'));
   await page.locator('[data-filter="all"]').first().click();await page.waitForFunction(()=>CSL.app.params.size===0);
   assert.ok((await page.locator('#catalog-count').textContent()).startsWith('314 '));await layout(page);
  });
  await check(label+': theme disclosure is operable and returns to the right parent',async()=>{
   await visit(page,base,'#/catalog?domain=math');
   const drawer=page.locator('#library-filter-drawer');if(!await drawer.evaluate(el=>el.open))await drawer.locator(':scope > summary').click();
   const theme=page.locator('#library-topic-nav [data-value="math-coding"]');await theme.focus();await theme.press('Enter');
   await page.waitForFunction(()=>CSL.app.params.get('category')==='math-coding');
   assert.ok(await page.locator('#catalog-results a[href="#/lab/gap-030"]').count());
   assert.equal(await page.locator('#catalog-results [data-category="sys-representation"]').count(),0);
   await layout(page);
   await page.locator('.library-chip[data-filter="category"]').click();
   await page.waitForFunction(()=>CSL.app.params.get('domain')==='math'&&!CSL.app.params.has('category'));
   assert.equal(await page.locator('#catalog-query').inputValue(),'');
  });
  await check(label+': whole course names, collapsed lists and no stretched neighboring cards',async()=>{
   await visit(page,base,'#/curriculum');
   assert.equal(await page.locator('.course-grid,.course-card,.cv-catalogue-gateway').count(),0);
   assert.equal(await page.locator('.library-course-list .library-unit').count(),0);
   const boxes=await page.locator('[data-library-course]').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};}));
   assert.ok(boxes.length>35);for(let i=0;i<boxes.length;i++){assert.ok(boxes[i].height<240);if(i)assert.ok(boxes[i].top-boxes[i-1].bottom<16);}
   await page.locator('#library-course-query').fill('確率・統計');
   const visible=page.locator('[data-library-course]:visible');assert.equal(await visible.count(),1);
   const summary=visible.locator(':scope > summary');await summary.focus();await summary.press('Space');
   await visible.locator('a[href="#/lab/gap-016"]').waitFor();
   assert.equal(await visible.locator('a[href="#/lab/gap-001"]').count(),0);await layout(page);
   await summary.focus();await summary.press('Enter');assert.equal(await visible.evaluate(el=>el.open),false);
   await page.locator('#library-course-query').fill('存在しない科目987654');assert.equal(await page.locator('[data-library-course]:visible').count(),0);assert.equal(await page.locator('#library-course-empty').isVisible(),true);
  });
  await check(label+': literal search input cannot inject markup and storage remains empty',async()=>{
   await visit(page,base,'#/');await page.locator('#home-query').fill('<img src=x onerror=alert(1)>');
   assert.equal(await page.locator('#home-results img').count(),0);assert.ok((await page.locator('#home-results h2').textContent()).includes('<img'));
   assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);assert.deepEqual(bad,[]);
  });
  if(label==='desktop'){
   await check('all 61 themes have working URLs and match their actual unit IDs',async()=>{
    const themes=await page.evaluate(()=>CSL.taxonomy.categories.map(c=>({id:c.id,domain:c.domain,ids:CSL.taxonomy.select({category:c.id}).map(l=>l.id)})));
    for(const c of themes){await visit(page,base,`#/catalog?domain=${c.domain}&category=${c.id}`);const actual=await page.locator('#catalog-results .library-unit').evaluateAll(els=>els.map(el=>el.dataset.labId));assert.deepEqual(actual.slice().sort(),c.ids.slice(0,24).sort(),c.id);}
   });
   await check('all 314 units remain reachable through page navigation without omission or duplication',async()=>{
    await visit(page,base,'#/catalog');const all=[];
    for(let n=1;n<=14;n++){
     all.push(...await page.locator('#catalog-results .library-unit').evaluateAll(els=>els.map(el=>el.dataset.labId)));
     const next=page.locator('#catalog-results [data-library-page]').last();if(n===14){assert.equal(await next.isDisabled(),true);break;}
     await next.click();await page.waitForFunction(n=>CSL.app.params.get('page')===String(n),n+1);
    }
    const expected=await page.evaluate(()=>CSL.labs.map(l=>l.id));assert.equal(all.length,314);assert.deepEqual([...new Set(all)].sort(),expected.sort());
    await page.goBack();await page.waitForFunction(()=>CSL.app.params.get('page')==='13');
   });
   await check('old area/track/topic URLs retain their original selection and category counts',async()=>{
    for(const query of ['area=C01','track=network&topic=N07','track=core','track=missions']){
     await visit(page,base,'#/catalog?'+query);
     const result=await page.evaluate(()=>({count:CSL.app.catalogSelection().length,units:CSL.app.catalogSelection().map(l=>l.id)}));
     const expected=await page.evaluate(query=>{const p=new URLSearchParams(query);return CSL.labs.filter(l=>(!p.has('area')||l.area===p.get('area'))&&(!p.has('track')||l.track===p.get('track'))&&(!p.has('topic')||l.topic===p.get('topic'))).map(l=>l.id);},query);
     assert.deepEqual(result.units.slice().sort(),expected.sort());assert.ok((await page.locator('#catalog-count').textContent()).startsWith(String(expected.length)+' '));
    }
   });
   await check('invalid filters and excessive page numbers recover without hiding the catalogue',async()=>{
    await visit(page,base,'#/catalog?domain=unknown&category=invalid&page=999999');
    assert.equal(await page.evaluate(()=>CSL.app.params.has('domain')||CSL.app.params.has('category')),false);
    assert.equal(await page.locator('#catalog-results .library-unit').count(),2);
   });
  }
  await mkdir('review-output/library-screenshots',{recursive:true});
  for(const [id,hash]of [['home','#/'],['coding','#/catalog?domain=math&category=math-coding'],['courses','#/curriculum']]){
   await visit(page,base,hash);await page.screenshot({path:`review-output/library-screenshots/${engine}-${label}-${id}.png`,fullPage:false});
  }
  await context.close();
 }
}catch(e){report.errors.push({message:String(e.stack||e)});}
finally{
 await browser?.close();server.close();server.closeAllConnections?.();
 report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;
 await mkdir('review-output',{recursive:true});await writeFile(`review-output/library-${engine}.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));if(report.failed||report.errors.length)process.exitCode=1;
}
