import {fixtureDefinitions,fixtureInventory} from './lesson-fixtures.mjs';
// Test actual committed multi-file documents over HTTP; no repair/build here.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
const engineName=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[engineName];if(!engine)throw Error('Invalid BROWSER');
const report={sourceCommit:process.env.SOURCE_COMMIT||process.env.GITHUB_SHA||'local',engine:engineName,scope:'GAP-095..108',cases:[],errors:[]};
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4198'},stdio:['ignore','ignore','pipe']});let browser,serverLog='',navigation=0;
server.stderr.on('data',d=>serverLog+=d);server.on('error',e=>serverLog+=e.message);
const base='http://127.0.0.1:4198/';
const ids=Array.from({length:14},(_,i)=>'gap-'+String(i+95).padStart(3,'0'));
const click=(page,action)=>page.locator('[data-net-action="'+action+'"]').click();
const field=(page,key)=>page.locator('[data-net-field="'+key+'"]');
const state=page=>page.locator('[data-net-state]').evaluate(el=>JSON.parse(el.dataset.netState));
async function check(title,fn){try{await fn();report.cases.push({title,passed:true});}catch(e){report.cases.push({title,passed:false,error:String(e.stack||e)});console.error('FAIL '+title+'\n'+e.stack);}}
async function open(page,id,chapter=''){
 // A different search value forces a fresh document, not a hash-only revisit.
 await page.goto(base+'?review='+ ++navigation+'#/lab/'+id+(chapter?'?chapter='+chapter:''));
 await page.waitForFunction(({id,chapter})=>{
  const c=globalThis.CSL?.app?.current;if(!c?.experience||c.lab.id!==id||chapter&&c.chapter!==chapter)return false;
  const def=CSL.experiences.find(id),ch=def.chapters.find(x=>x.id===c.chapter);
  return c.completed.size>=ch.activities.length&&!document.querySelector('.experience [aria-busy="true"]');
 },{id,chapter},{timeout:15000});
 assert.deepEqual(await page.evaluate(()=>CSL.app.current.errors),[]);
}
async function screenshot(page,name,size){if(size!=='desktop')return;await mkdir('review-output/network-screenshots',{recursive:true});await page.screenshot({path:`review-output/network-screenshots/${engineName}-${name}.png`,fullPage:true});}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw Error(serverLog||'server unavailable');await sleep(100);}
 browser=await engine.launch({headless:true});report.version=browser.version();
 for(const [size,viewport]of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}],['narrow',{width:320,height:760}]]){
  const context=await browser.newContext({viewport,hasTouch:size!=='desktop',reducedMotion:'reduce'});
  await context.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.effectiveDirective+':'+e.blockedURI));});
  const page=await context.newPage();page.setDefaultTimeout(8000);const responses=[];
  page.on('pageerror',e=>report.errors.push({size,message:e.message}));page.on('response',r=>{if(r.status()>=400)responses.push({url:r.url(),status:r.status()});});
  await open(page,'gap-095');
  const defs=fixtureDefinitions(ids);
  if(size==='desktop')report.chapters=defs.reduce((n,d)=>n+(d.chapters?.length||0),0);
  await check(size+': fourteen units have individually registered activities',async()=>{
   assert.equal(defs.length,14);assert.ok(defs.every(d=>d.chapters?.length));
   // Other lessons' widgets are intentionally absent until their route opens.
  });
  for(const d of defs)for(const ch of d.chapters||[])await check(size+'/'+d.id+'/'+ch.id+': chapter renders with valid inputs, labels and layout',async()=>{
   await open(page,d.id,ch.id);assert.equal(await page.locator('[data-ex-kind]').count(),ch.kinds.length);
   assert.deepEqual(await page.evaluate(kinds=>kinds.filter(k=>!CSL.experiences.widgets.has(k)),ch.kinds),[]);
   assert.equal(await page.locator('.experience input[type="number"]:invalid').count(),0);
   const labels=await page.locator('.experience label[for]').evaluateAll(ls=>ls.filter(l=>!document.getElementById(l.htmlFor)).map(l=>l.htmlFor));assert.deepEqual(labels,[]);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   assert.deepEqual(await page.evaluate(()=>window.__csp),[]);
  });
  await check(size+': switch learns source, narrows delivery and expires entries',async()=>{
   await open(page,'gap-095');await click(page,'send:A:B');const initial=(await state(page)).transfers.length;
   await click(page,'send:B:A');await click(page,'send:A:B');assert.ok((await state(page)).transfers.length<initial);
   await click(page,'wait');assert.ok(Object.values((await state(page)).tables).every(x=>!x.length));
   await click(page,'send:A:C');assert.deepEqual((await state(page)).arrivals,[]);await screenshot(page,'vlan',size);
  });
  await check(size+': DHCP uses REQUEST time and stops at expiration without ACK',async()=>{
   await open(page,'gap-096');for(const action of ['discover','offer','request'])await click(page,action);
   await click(page,'wait:10');await click(page,'ack');assert.equal((await state(page)).expires,80);
   await click(page,'wait:30');assert.equal((await state(page)).state,'RENEWING');
   await click(page,'wait:40');assert.equal((await state(page)).address,null);assert.equal((await state(page)).state,'INIT');
   await click(page,'undo');assert.equal((await state(page)).state,'RENEWING');await screenshot(page,'lease',size);
  });
  await check(size+': out-of-order fragments keep holes visible and duplicate delivery is harmless',async()=>{
   await open(page,'gap-097');await click(page,'deliver:3');assert.deepEqual((await state(page)).received,[3]);
   for(const i of [0,2,1])await click(page,'deliver:'+i);await click(page,'deliver:1');assert.equal((await state(page)).received.length,4);
   assert.match(await page.locator('[data-net-board]').textContent(),/再構成可能/);await screenshot(page,'fragments',size);
  });
  await check(size+': DNS edits do not rewrite cache and time crossing refreshes only expired RR',async()=>{
   await open(page,'gap-098');await click(page,'query');assert.equal((await state(page)).last.value,'192.0.2.10');
   await click(page,'set-a');await click(page,'query');assert.equal((await state(page)).last.value,'192.0.2.10');
   await click(page,'wait:40');await click(page,'query');let s=await state(page);assert.equal(s.last.value,'192.0.2.20');assert.deepEqual(s.last.trail.map(t=>t.origin),['cache','authority']);
   await field(page,'query').selectOption('new.example.test');await click(page,'query');assert.equal((await state(page)).last.status,'NXDOMAIN');await screenshot(page,'dns',size);
  });
  await check(size+': TCP receiver knows more than the sender until the ACK arrives',async()=>{
   await open(page,'gap-099');for(const i of [0,1,2,3])await click(page,'send:'+i);const data=(await state(page)).data;
   for(const i of [0,2,3])await click(page,'deliver-data:'+data[i].id);let s=await state(page);assert.equal(s.una,1001);assert.equal(s.acks.at(-1).ack,1007);assert.equal(s.received.filter(Boolean).length,18);
   await click(page,'deliver-data:'+data[1].id);s=await state(page);assert.equal(s.una,1001);assert.equal(s.acks.at(-1).ack,1025);
   await click(page,'deliver-ack:'+s.acks.at(-1).id);assert.equal((await state(page)).una,1025);await screenshot(page,'tcp',size);
  });
  await check(size+': changing cwnd cannot fix rwnd zero and failed sends do not change state',async()=>{
   await open(page,'gap-100');await field(page,'rwnd').fill('0');await click(page,'rwnd');await field(page,'cwnd').fill('12');await click(page,'cwnd');
   const before=await state(page);await click(page,'send');assert.deepEqual(await state(page),before);assert.match(await page.locator('[data-net-status]').textContent(),/足りません/);
   assert.equal(await field(page,'rwnd').inputValue(),'0');await click(page,'reset');assert.equal((await state(page)).rwnd,8);assert.equal(await field(page,'rwnd').inputValue(),'8');
  });
  await check(size+': physical cut and local router knowledge are changed by separate operations',async()=>{
   await open(page,'gap-101');await click(page,'link:down');let s=await state(page);assert.equal(s.db.A.C.seq,1);
   await click(page,'deliver:'+s.pending.find(p=>p.from==='C'&&p.to==='A').id);assert.equal((await state(page)).db.A.C.seq,2);await screenshot(page,'routing',size);
  });
  await check(size+': Little workspace selects a stay and rejects unsorted arrivals',async()=>{
   await open(page,'gap-102');await click(page,'select:1');assert.equal((await state(page)).selected,1);
   await field(page,'arrival').fill('0');const before=await state(page);await click(page,'add');assert.deepEqual(await state(page),before);
   await click(page,'clear');await field(page,'arrival').fill('5');await click(page,'add');assert.deepEqual((await state(page)).jobs,[{arrival:5,service:1}]);await screenshot(page,'little',size);
  });
  await check(size+': signal ties, another decision and keyboard movement keep the sent bits',async()=>{
   await open(page,'gap-104');await field(page,'I').fill('0');await field(page,'Q').fill('0');await click(page,'move');assert.match(await page.locator('[data-net-decision]').textContent(),/複数/);
   await field(page,'I').fill('-1');await field(page,'Q').fill('-1');await click(page,'move');assert.equal((await state(page)).sent,'00');assert.equal(await page.locator('[data-net-decision]').textContent(),'11');
   const graph=page.locator('[data-net-signal]');await graph.focus();await page.keyboard.press('ArrowRight');assert.ok(Math.abs((await state(page)).received[0]+.95)<1e-8);assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-net-signal')),true);
   await screenshot(page,'signal',size);
  });
  await check(size+': repeated POST creates two resources, conditional GET and HEAD omit body',async()=>{
   await open(page,'gap-105');await field(page,'method').selectOption('POST');await field(page,'path').fill('/items');await field(page,'text').fill('hello');await click(page,'request');await click(page,'request');assert.equal(Object.keys((await state(page)).resources).length,3);
   await field(page,'method').selectOption('GET');await field(page,'path').fill('/items/1');await field(page,'condition').fill('"v1"');await click(page,'request');let s=await state(page);assert.equal(s.last.status,304);assert.equal(s.last.body,null);
   await field(page,'method').selectOption('HEAD');await field(page,'condition').fill('');await click(page,'request');assert.equal((await state(page)).last.body,null);await screenshot(page,'http',size);
  });
  await check(size+': streams receive the same selected units but reveal different blocking',async()=>{
   await open(page,'gap-105','streams');for(const id of [1,3,4,5,6])await click(page,'deliver:'+id);
   const counts=await page.evaluate(()=>{const s=JSON.parse(document.querySelector('[data-net-state]').dataset.netState),N=CSL.experiences.net;return [N.streamView(s.h2),N.streamView(s.h3)].map(u=>u.filter(p=>p.delivered).length);});assert.deepEqual(counts,[1,4]);await screenshot(page,'streams',size);
  });
  await check(size+': packet fields point to byte ranges and selecting them does not change capture',async()=>{
   await open(page,'gap-106');const before=(await state(page)).bytes;await click(page,'field:seq');assert.deepEqual(await page.locator('[data-net-byte].selected').evaluateAll(es=>es.map(e=>Number(e.dataset.netByte))),[38,39,40,41]);
   assert.deepEqual((await state(page)).bytes,before);await click(page,'field:ack');assert.equal(await page.locator('[data-net-byte].selected').count(),4);await screenshot(page,'pcap',size);
  });
  await check(size+': failed authentication never advances the replay window',async()=>{
   await open(page,'gap-107');for(const sequence of [1,2,2,4,3]){await field(page,'sequence').fill(String(sequence));await click(page,'receive');}
   assert.deepEqual((await state(page)).decisions.map(d=>d.accepted),[true,true,false,true,true]);await field(page,'sequence').fill('99');await field(page,'authenticated').uncheck();await click(page,'receive');assert.equal((await state(page)).high,4);await screenshot(page,'replay',size);
  });
  await check(size+': changing DNS rule removes stale success and repairing it restores the page',async()=>{
   await open(page,'gap-108');await click(page,'run');assert.equal((await state(page)).result.success,true);
   await click(page,'select:router');await field(page,'allowDNS').uncheck();await click(page,'rules');assert.equal((await state(page)).result,null);
   await click(page,'run');assert.equal((await state(page)).result.success,false);
   await field(page,'allowDNS').check();await click(page,'rules');await click(page,'run');assert.equal((await state(page)).result.success,true);
   await click(page,'select:dns');assert.equal(await field(page,'ip').inputValue(),'10.0.1.53');await screenshot(page,'config',size);
  });
  await check(size+': leaving a workspace disposes handlers; re-entering starts fresh',async()=>{
   await open(page,'gap-095');await page.evaluate(()=>window.__oldNet=document.querySelector('[data-net-action="send:A:B"]'));
   await page.locator('.library-breadcrumb a').first().click();await page.waitForFunction(()=>!CSL.app.current?.experience);
   await page.evaluate(()=>window.__oldNet.click());await open(page,'gap-095');assert.equal((await state(page)).log.length,0);
   const button=page.locator('[data-net-action="send:A:B"]');await button.focus();await page.keyboard.press('Enter');assert.equal((await state(page)).log.length,1);
   await page.locator('[data-net-action="undo"]').focus();await page.keyboard.press('Space');assert.equal((await state(page)).log.length,0);
  });
  await check(size+': no failed resources, CSP violations or horizontal page overflow',async()=>{assert.deepEqual(responses,[]);assert.deepEqual(await page.evaluate(()=>window.__csp),[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);});
  await context.close();
 }
}catch(e){report.errors.push({message:String(e.stack||e)});}
finally{
 await browser?.close();server.kill();report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.length-report.passed;
 await mkdir('review-output',{recursive:true});await writeFile(`review-output/network-${engineName}.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({...report,cases:undefined,failures:report.cases.filter(c=>!c.passed)},null,2));if(report.failed||report.errors.length)process.exitCode=1;
}
