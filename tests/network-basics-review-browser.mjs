// Real browser tests for n03-switch, n04-subnet, n05-arp, n05-dhcp, n06-ipv6.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';
const name=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[name];if(!engine)throw Error('Unknown browser');
const base='http://127.0.0.1:4235/',out='review-output/network-basics';
const report={sourceCommit:process.env.GITHUB_SHA||'local',engine:name,cases:[],errors:[],visualReview:'not-certified-by-test'};
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:'4235'},stdio:['ignore','ignore','pipe']});let browserInstance,serverLog='';
server.stderr.on('data',x=>serverLog+=x);server.on('error',e=>serverLog+=e.message);
const state=page=>page.locator('[data-sec-state]').evaluate(el=>JSON.parse(el.dataset.secState));
const field=(page,key)=>page.locator('[data-sec-field="'+key+'"]');
const idle=page=>page.waitForFunction(()=>!document.querySelector('.experience [aria-busy="true"]'));
async function click(page,code){await page.locator('[data-sec-action="'+code+'"]').first().click();await idle(page);}
async function open(page,id,chapter='communication'){await page.goto(base+'#/lab/'+id+(chapter?'?chapter='+chapter:''));await page.waitForFunction(({id,chapter})=>{const c=CSL?.app?.current;if(!c?.experience||c.lab.id!==id||c.chapter!==chapter)return false;const d=CSL.experiences.find(id).chapters.find(x=>x.id===chapter);return c.completed.size>=d.activities.length&&!document.querySelector('.experience [aria-busy="true"]');},{id,chapter},{timeout:18000});}
async function check(id,fn){try{await fn();report.cases.push({id,passed:true});}catch(e){report.cases.push({id,passed:false,error:String(e.stack||e)});console.error('NB_FAIL '+id+' '+e.message);}}
try{
 await mkdir(out,{recursive:true});for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===99)throw Error(serverLog||'server timeout');await sleep(100);}
 browserInstance=await engine.launch({headless:true});report.version=browserInstance.version();
 for(const width of [1440,390,320]){
  const context=await browserInstance.newContext({viewport:{width,height:1000},hasTouch:width<500,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(8000);
  await context.addInitScript(()=>{window.__nbCsp=[];document.addEventListener('securitypolicyviolation',e=>__nbCsp.push(e.effectiveDirective));});
  page.on('pageerror',e=>report.errors.push({width,message:e.message}));page.on('response',r=>{if(r.status()>=400)report.errors.push({width,status:r.status(),url:r.url()});});
  for(const id of ['n03-switch','n04-subnet','n05-arp','n05-dhcp','n06-ipv6']){
   const chapters=id==='n03-switch'?['communication']:['communication','calculation'];
   for(const chapter of chapters)await check(`${width}/${id}/${chapter}/entry`,async()=>{
    await open(page,id,chapter);assert.deepEqual(await page.evaluate(()=>CSL.app.current.errors),[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(await page.evaluate(()=>__nbCsp),[]);
    assert.deepEqual(await page.locator('.experience label[for]').evaluateAll(ls=>ls.filter(l=>!document.getElementById(l.htmlFor)).map(l=>l.htmlFor)),[]);
   });
  }
  await check(width+'/switch/source-learning-before-destination',async()=>{
   await open(page,'n03-switch');const form=page.locator('.ex-kind-switch form');await form.locator('button[type=submit]').click();assert.match(await page.locator('[data-switch-log]').textContent(),/A → B/);assert.match(await page.locator('[data-switch-log]').textContent(),/2, 3/);
   await form.locator('[name=from]').selectOption('B');await form.locator('[name=to]').selectOption('A');await form.locator('button[type=submit]').click();assert.match(await page.locator('[data-ex-status]').textContent(),/宛先Aの場所を知っている/);assert.match(await page.locator('[data-switch-log]').textContent(),/1/);
   await page.locator('[data-switch-reset]').click();assert.match(await page.locator('[data-ex-status]').textContent(),/まだ受信していません/);
  });
  await check(width+'/subnet/same-mask-changes-decision',async()=>{
   await open(page,'n04-subnet');assert.equal((await page.locator('[data-sec-board]').textContent()).includes('同じサブネット'),true);
   await field(page,'prefix').fill('25');await click(page,'configure');const s=await state(page),v=await page.evaluate(()=>CSL.experiences.networkBasics.subnetView(JSON.parse(document.querySelector('[data-sec-state]').dataset.secState)));assert.equal(s.prefix,25);assert.equal(v.same,false);assert.equal(v.nextHop,'192.168.1.1');
   await click(page,'bit:24');assert.match(await page.locator('[data-sec-board]').textContent(),/選んだbit 25/);assert.equal(await page.locator('.ex-nb-bitrow').count(),5);
  });
  await check(width+'/subnet/invalid-input-is-atomic',async()=>{
   await open(page,'n04-subnet');const before=await state(page);await field(page,'ip').fill('300.1.1.1');await click(page,'configure');assert.deepEqual(await state(page),before);assert.ok((await page.locator('[data-sec-status]').textContent()).length>0);
  });
  await check(width+'/arp/remote-keeps-final-ip-and-resolves-gateway-mac',async()=>{
   await open(page,'n05-arp');await click(page,'destination:remote');assert.match(await page.locator('[data-sec-board]').textContent(),/203\\.0\\.113\\.20/);assert.match(await page.locator('[data-sec-board]').textContent(),/192\\.168\\.1\\.1/);
   await click(page,'request');assert.deepEqual((await state(page)).wire,{kind:'request',target:'192.168.1.1'});await click(page,'reply');assert.ok((await state(page)).cache['192.168.1.1']);await click(page,'send');const s=await state(page);assert.equal(s.wire.ip,'203.0.113.20');assert.equal(s.wire.mac,'02:00:00:00:00:01');
   assert.match(await page.locator('[data-sec-board]').textContent(),/IP最終宛先/);assert.match(await page.locator('[data-sec-board]').textContent(),/Ethernet宛先MAC/);
  });
  await check(width+'/arp/cache-hit-skips-request',async()=>{
   await open(page,'n05-arp');await click(page,'preset-cache');await click(page,'request');assert.equal((await state(page)).wire,null);assert.match(await page.locator('[data-sec-status]').textContent(),/問い合わせを送る必要はありません/);await click(page,'clear');assert.deepEqual((await state(page)).cache,{});
  });
  await check(width+'/dhcp/offer-request-do-not-configure-address',async()=>{
   await open(page,'n05-dhcp');await click(page,'next');assert.equal((await state(page)).leases[0],null);await click(page,'next');assert.ok((await state(page)).offer);assert.equal((await state(page)).leases[0],null);await click(page,'next');assert.equal((await state(page)).leases[0],null);await click(page,'next');assert.equal((await state(page)).leases[0],'192.0.2.100');
   assert.match(await page.locator('[data-sec-board]').textContent(),/確定済み/);
  });
  await check(width+'/dhcp/pool-exhaustion',async()=>{
   await open(page,'n05-dhcp');await field(page,'clients').fill('2');await field(page,'pool').fill('1');await click(page,'configure');for(let i=0;i<6;i++)await click(page,'next');const s=await state(page);assert.equal(s.leases[0],'192.0.2.100');assert.equal(s.leases[1],null);assert.equal(s.client,2);assert.match(await page.locator('[data-sec-status]').textContent(),/DHCPOFFERはありません/);
  });
  await check(width+'/ipv6/expansion-and-partial-prefix',async()=>{
   await open(page,'n06-ipv6');assert.equal(await page.locator('.ex-nb-ipv6-groups button').count(),8);assert.match(await page.locator('[data-sec-board]').textContent(),/0000:0000:0000:abcd/);
   await field(page,'prefix').fill('60');await click(page,'configure');await click(page,'group:3');const v=await page.evaluate(()=>CSL.experiences.networkBasics.ipv6View(JSON.parse(document.querySelector('[data-sec-state]').dataset.secState)));assert.equal(v.selected.prefixBits,12);
   await click(page,'bit:12');assert.equal((await state(page)).bit,12);
  });
  await check(width+'/ipv6/ambiguous-compression-rejected',async()=>{
   await open(page,'n06-ipv6');const before=await state(page);await field(page,'ip').fill('2001::1::2');await click(page,'configure');assert.deepEqual(await state(page),before);assert.ok((await page.locator('[data-sec-status]').textContent()).length>0);
  });
  await mkdir(out+'/captures',{recursive:true});for(const id of ['n03-switch','n04-subnet','n05-arp','n05-dhcp','n06-ipv6']){await open(page,id);await page.locator('.experience').screenshot({path:`${out}/captures/${name}-${width}-${id}.png`});}
  await context.close();
 }
}catch(e){report.errors.push({message:String(e.stack||e)});console.error(e);}
finally{await browserInstance?.close();server.kill();report.passed=report.cases.filter(x=>x.passed).length;report.failed=report.cases.length-report.passed;await mkdir(out,{recursive:true});await writeFile(`${out}/${name}.json`,JSON.stringify(report,null,2));console.log('NETWORK_BASICS_SUMMARY '+JSON.stringify({sourceCommit:report.sourceCommit,engine:name,passed:report.passed,failed:report.failed,errors:report.errors,failures:report.cases.filter(x=>!x.passed)}));if(report.failed||report.errors.length)process.exitCode=1;}
