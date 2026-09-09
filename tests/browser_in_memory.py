"""Optional Chromium regression checks for Visual CS Lab 2.

Install Python Playwright separately. This uses set_content (not URL navigation)
in an offline, opaque-origin document. No browser policy is weakened. Native
storage is unavailable and is not required by the app. Five Web Crypto labs
must explain the unsupported context; their real computations are covered by
Node tests. A separate explicit storage double tests only the v1-key cleanup.
Set CHROMIUM_PATH and QA_OUTPUT as needed. No third-party network is requested.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os, shutil, time, traceback

ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('QA_OUTPUT',ROOT/'test-results'))
OUT.mkdir(parents=True,exist_ok=True)
HTML=(ROOT/'index.html').read_text()
CRYPTO={'s03-aes','s04-hash','s04-hmac','s04-signature','s07-password'}
report={'version':'2.0.0','environment':'Chromium offline opaque document; page.set_content; managed navigation policy not modified',
        'checks':[],'labs':[],'errors':[],'requests':[],'screenshots':[],
        'limitations':['No actual URL / file-origin browser run in this environment.','Five native Web Crypto computations tested in Node, not in this opaque browser origin.','Storage cleanup verified with an explicit double; no real-origin persistence tested.','Chromium desktop and mobile viewport emulation only; not physical iOS / Safari / Firefox.']}

def save(final=False):
    (OUT/('browser-report.json' if final else 'browser-report.partial.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2))

def check(name,condition=True,data=None):
    if not condition: raise AssertionError(f'{name}: {data}')
    report['checks'].append({'name':name,'pass':True,**({'data':data} if data is not None else {})})

def goto(page,route,lab=None):
    page.evaluate('(r)=>{if(location.hash===r)CSL.app.navigate();else location.hash=r;}',route)
    if lab:ready(page,lab)
    else:page.wait_for_function('(r)=>location.hash===r&&CSL.app.page===(r.slice(2).split(/[/?]/)[0]||"home")',arg=route)

def ready(page,lab=None):
    page.wait_for_function('(id)=>CSL.app.current&&(!id||CSL.app.current.lab.id===id)&&!CSL.app.current.pending&&!CSL.app.current.dirty&&(!!CSL.app.current.result||!!CSL.app.current.error)',arg=lab)

def snapshot(page,name,full=True):
    page.evaluate('CSL.app.stop();document.getElementById("toast").hidden=true;document.activeElement?.blur();window.scrollTo({top:0,behavior:"instant"})')
    page.screenshot(path=str(OUT/name),full_page=full,animations='disabled')
    report['screenshots'].append(name)

def fit(page):
    return page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')

start=time.time()
try:
 with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('chromium-browser'),headless=True,args=['--no-sandbox'])
    report['browser_version']=browser.version
    ctx=browser.new_context(viewport={'width':1440,'height':1050},device_scale_factor=1)
    ctx.set_offline(True)
    page=ctx.new_page()
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.on('request',lambda r:report['requests'].append(r.url))
    page.set_content(HTML);page.wait_for_function('()=>CSL.app.ready')
    check('Boots without storage / API / external resources',page.locator('#home-query').is_visible())
    check('All 144 units retained',page.evaluate('CSL.labs.length')==144)
    check('20 areas and 8 suggested routes',page.evaluate('CSL.areas.length===20&&CSL.routes.length===8'))
    check('No history-based dashboard / notebook navigation',page.locator('a[href*="notebook"],[data-action="favorite"],[data-action="export-data"],[data-action="note"]').count()==0)
    snapshot(page,'home-desktop.png')
    # Actual search inputs; no submission needed for results.
    page.locator('#home-query').fill('ＴＣＰ 再送')
    check('Home search updates immediately',page.locator('#home-results [data-lab-id="n11-tcp"]').count()==1)
    check('Search results have unit names and summaries',page.locator('#home-results .unit-summary').count()>0)
    page.locator('#home-query').fill('xyz_NOT_A_TOPIC_845')
    check('No-result recovery',page.locator('#home-results .search-empty').is_visible())
    page.locator('#home-query').fill('')
    check('Clearing home search restores subjects',page.locator('#home-browse').is_visible())
    page.keyboard.press('Control+k');page.wait_for_selector('#global-search')
    page.locator('#global-search').fill('TCP 再送');page.keyboard.press('Enter');ready(page,'n11-tcp')
    check('Global search Enter opens matching unit',page.locator('.lab-heading h1').inner_text()=='TCPの再送とウィンドウ')
    check('Search dialog restores active shell',not page.evaluate('document.querySelector(".app-shell").inert'))
    goto(page,'#/catalog')
    check('Catalog initially contains all units',page.locator('#catalog-results .lab-card').count()==144)
    page.locator('#catalog-query').fill('認証')
    check('Catalog search preserves focus',page.evaluate('document.activeElement.id')=='catalog-query')
    check('Catalog live search narrows units',0<page.locator('#catalog-results .lab-card').count()<144)
    page.locator('#catalog-query').fill('')
    page.locator('[data-filter="track"][data-value="network"]').click()
    page.wait_for_function('()=>CSL.app.params.get("track")==="network"')
    check('Network count unchanged',page.locator('#catalog-results .lab-card').count()==34)
    page.locator('#filter-topic').select_option('N11');page.wait_for_function('()=>CSL.app.params.get("topic")==="N11"')
    check('Topic filter shows TCP unit',page.locator('#catalog-results [data-lab-id="n11-tcp"]').count()==1)
    page.locator('#filter-area').select_option('C09');page.wait_for_function('()=>CSL.app.params.get("area")==="C09"')
    check('Area filter clears contradictory track/topic filters',page.evaluate('!CSL.app.params.has("track")&&!CSL.app.params.has("topic")&&CSL.app.catalogSelection().length>0'))
    # Every non-lab page and suggested route.
    paths=['#/','#/catalog','#/routes','#/map','#/curriculum','#/sources','#/settings']+page.evaluate('CSL.routes.map(r=>"#/route/"+r.id)')
    for path in paths:
        goto(page,path)
        check(path+' heading',page.locator('#main h1').count()==1)
        for width in [1440,390,320]:
            page.set_viewport_size({'width':width,'height':950});size=fit(page)
            check(path+f' fits {width}px',size['scroll']<=width+1,size)
    page.set_viewport_size({'width':1440,'height':1050})
    # Every unit: default state, playback, seek, every frame, direct mode,
    # example B, comparison, explanatory tabs, narrow viewport.
    ids=page.evaluate('CSL.labs.map(l=>l.id)')
    for ix,lab in enumerate(ids):
        goto(page,'#/lab/'+lab,lab)
        info=page.evaluate('(()=>{const c=CSL.app.current;return {id:c.lab.id,unit:c.lab.unit,summary:c.lab.summary,frames:c.result?.frames.length||0,error:c.error,presentation:c.lab.presentation};})()')
        check(lab+' academic unit name',page.locator('.lab-heading h1').inner_text()==info['unit'])
        check(lab+' concise learning objective',page.locator('.lab-summary').inner_text()==info['summary'])
        check(lab+' actionable example and observation',page.locator('.observe-point').inner_text().strip()!='' and page.locator('[data-example="variant"]').count()==1)
        check(lab+' input names connected to labels',page.evaluate('Array.from(document.querySelectorAll("#controls input:not([type=number]),#controls textarea,#controls select")).every(el=>!!document.querySelector(`label[for="${el.id}"]`))'))
        if lab in CRYPTO:
            check(lab+' explains unavailable native crypto (no fake result)',info['frames']==0 and page.locator('.experiment-error').is_visible(),info)
            check(lab+' disabled playback for compute error',page.locator('#play-button').is_disabled())
            page.locator('[data-tab="model"]').click();check(lab+' model remains readable',page.locator('#detail-content .model-card').count()==4)
        else:
            check(lab+' initial model succeeds',info['error'] is None and info['frames']>0,info)
            check(lab+' starts at first state',page.evaluate('CSL.app.current.index')==0)
            if info['frames']==1:
                check(lab+' immediate-result mode (no meaningless playbar)',not page.locator('#player-sequence').is_visible() and page.locator('#direct-hint').is_visible())
            else:
                check(lab+' visible playback and seek controls',page.locator('#player-sequence').is_visible() and not page.locator('#play-button').is_disabled())
                check(lab+' seek touch target >=44px',page.locator('#scrubber').bounding_box()['height']>=44)
                # Real native timer with UI event, accelerated only using the app's speed selector.
                page.select_option('#play-speed','4')
                page.locator('#play-button').evaluate('(el)=>el.click()')
                page.wait_for_function('()=>CSL.app.current.index>=1',timeout=3500)
                page.evaluate('CSL.app.stop()')
                check(lab+' play advances and pause agrees with button',page.evaluate('CSL.app.current.index>=1&&!CSL.app.current.playing&&document.getElementById("play-button").getAttribute("aria-pressed")==="false"'))
                page.locator('#scrubber').evaluate('(el)=>{el.value=el.max;el.dispatchEvent(new Event("input",{bubbles:true}));}')
                check(lab+' seek reaches final state in model and UI',page.evaluate('CSL.app.current.index===CSL.app.current.result.frames.length-1&&CSL.app.current.player.state.index===CSL.app.current.index'))
                page.locator('#play-button').evaluate('(el)=>el.click()')
                check(lab+' replay at end restarts at beginning',page.evaluate('CSL.app.current.index===0&&CSL.app.current.playing'))
                page.evaluate('CSL.app.stop()')
            # Validate DOM rendering at every generated step, including data tables.
            frame_errors=page.evaluate('''()=>{const A=CSL.app,c=A.current,errors=[];A.setTab('data');for(let i=0;i<c.result.frames.length;i++){A.seek(i);const f=c.result.frames[i];if(document.querySelector('#current-step h3').textContent!==f.title)errors.push(i+':title');if(!document.querySelector('#visualization').textContent.trim()&&!document.querySelector('#visualization svg'))errors.push(i+':visual');if(!document.querySelector('#detail-content .timeline-event.active'))errors.push(i+':timeline');if(document.getElementById('scrubber').value!==String(i))errors.push(i+':seek');}return errors;}''')
            check(lab+' all frame views and timeline stay synchronized',not frame_errors,frame_errors)
            page.evaluate('CSL.app.setTab("understand")')
            # Invoke the actual B button handler and wait for its model.
            page.locator('[data-example="variant"]').evaluate('(el)=>el.click()')
            ready(page,lab);page.evaluate('CSL.app.stop()')
            state=page.evaluate('(()=>{const c=CSL.app.current;return {error:c.error,baseline:!!c.baseline,matches:Object.entries(c.lab.exploration.patch).every(([k,v])=>JSON.stringify(c.params[k])===JSON.stringify(v)),length:c.result?.frames.length};})()')
            check(lab+' prepared B example really changes the model',state['error'] is None and state['matches'] and state['baseline'],state)
            page.locator('[data-tab="compare"]').evaluate('(el)=>el.click()')
            check(lab+' A/B values and conditions shown',page.locator('#detail-content > .table-wrap > .data-table').count()==2)
            page.locator('.compare-diagrams summary').evaluate('(el)=>el.click()')
            check(lab+' read-only A/B figures available',page.locator('.compare-drawing[inert]').count()==2)
            check(lab+' unique DOM and SVG identifiers',page.evaluate('(()=>{const ids=Array.from(document.querySelectorAll("[id]"),el=>el.id);return new Set(ids).size===ids.length;})()'))
            current_index=page.evaluate('CSL.app.current.index')
            if not page.locator('#compare-step-a').is_disabled():page.locator('#compare-step-a').select_option('0')
            check(lab+' independent A step selector does not move main player',page.evaluate('CSL.app.current.index')==current_index)
            page.set_viewport_size({'width':390,'height':844});size=fit(page)
            check(lab+' expanded comparison fits mobile',size['scroll']<=391,size)
            page.set_viewport_size({'width':1440,'height':1050})
            page.locator('[data-tab="model"]').evaluate('(el)=>el.click()')
            check(lab+' scope, limits, course and references visible',page.locator('#detail-content .model-card').count()==4)
            page.evaluate('CSL.app.setMode("challenge")')
            check(lab+' optional knowledge check present',page.locator('.challenge-option').count()==3)
            page.evaluate('CSL.app.current.answer=CSL.app.current.lab.challenge.answer;CSL.app.grade()')
            check(lab+' answer feedback without progress record',page.locator('.challenge-result:not(.wrong)').count()==1 and page.evaluate('CSL.app.store===undefined'))
            page.evaluate('CSL.app.setMode("guided")')
        for width in [1440,390]:
            page.set_viewport_size({'width':width,'height':1050 if width==1440 else 844});size=fit(page)
            check(lab+f' no page overflow at {width}px',size['scroll']<=width+1,size)
        page.set_viewport_size({'width':1440,'height':1050})
        report['labs'].append(info)
        if ix%12==0:print(f'Unit coverage {ix+1}/144: {lab}',flush=True);save()
    # Practical pointer and keyboard regressions on actual widgets.
    goto(page,'#/lab/n11-tcp','n11-tcp')
    page.locator('#scrubber').scroll_into_view_if_needed();box=page.locator('#scrubber').bounding_box()
    page.mouse.click(box['x']+box['width']*.7,box['y']+box['height']/2)
    check('Physical mouse click seeks',page.evaluate('CSL.app.current.index')>4)
    box=page.locator('#scrubber').bounding_box();page.mouse.move(box['x']+box['width']*.7,box['y']+22);page.mouse.down();page.mouse.move(box['x']+10,box['y']+22,steps=12);page.mouse.up()
    check('Physical drag seeks back without detaching input',page.evaluate('CSL.app.current.index')<2)
    page.locator('#scrubber').focus();page.keyboard.press('End')
    check('Native range End key reaches final',page.evaluate('CSL.app.current.index===CSL.app.current.result.frames.length-1'))
    page.keyboard.press('Home');page.keyboard.press('ArrowRight');check('Native range Home and arrow',page.evaluate('CSL.app.current.index')==1)
    page.locator('#visualization').focus();page.keyboard.press('ArrowRight');check('Experiment keyboard step',page.evaluate('CSL.app.current.index')==2)
    page.keyboard.press('Space');check('Experiment Space plays',page.evaluate('CSL.app.current.playing'))
    page.keyboard.press('Space');check('Experiment Space pauses',not page.evaluate('CSL.app.current.playing'))
    page.locator('#play-speed').select_option('4');page.locator('#play-button').click();page.wait_for_timeout(310)
    old=page.evaluate('CSL.app.current.index');page.keyboard.press('Control+k')
    page.wait_for_timeout(400);check('Opening search pauses underlying experiment',page.evaluate('CSL.app.current.index')==old and not page.evaluate('CSL.app.current.playing'))
    page.keyboard.press('Escape')
    # Editing while playing must stop and recompute at step zero, never last.
    page.locator('#play-button').click();page.locator('#p-rtt').evaluate('(el)=>{el.value=200;el.dispatchEvent(new Event("input",{bubbles:true}));}');ready(page)
    check('Parameter change pauses and recomputes from the beginning',page.evaluate('CSL.app.current.params.rtt===200&&CSL.app.current.index===0&&!CSL.app.current.playing'))
    page.locator('#num-p-rtt').fill('');check('Incomplete number marks previous result as stale',page.evaluate('CSL.app.current.dirty&&!CSL.app.current.playing'))
    page.locator('#num-p-rtt').press('Enter');ready(page);check('Invalid numeric commit restores valid value',page.locator('#num-p-rtt').input_value()=='200')
    page.locator('#num-p-rtt').fill('');page.locator('#num-p-rtt').fill('200');ready(page);check('Pasting the same valid number after clearing recovers automatically',not page.evaluate('CSL.app.current.dirty'))
    page.locator('#num-p-rtt').fill('99999');page.locator('#num-p-rtt').press('Enter');ready(page);check('Numeric bounds stay synchronized',page.evaluate('CSL.app.current.params.rtt===300&&document.getElementById("num-p-rtt").value==="300"'))
    # Context and route isolation.
    page.evaluate('CSL.app.baseline();window.__old=CSL.app.current;CSL.app.play()')
    goto(page,'#/lab/c08-gate','c08-gate');page.wait_for_timeout(350)
    check('Navigation disposes previous player and baseline',page.evaluate('!window.__old.player.state.playing&&CSL.app.current.baseline===null'))
    goto(page,'#/lab/n11-tcp','n11-tcp');check('Revisit restores defaults, not previous inputs/answer/baseline',page.evaluate('CSL.app.current.params.rtt===CSL.app.current.lab.defaults.rtt&&CSL.app.current.baseline===null&&CSL.app.current.answer===null&&CSL.app.current.index===0'))
    # Error/dirty handling with editable teaching code.
    goto(page,'#/lab/c09-cpu','c09-cpu')
    code=page.locator('#controls textarea').first
    code.fill('THIS_IS_NOT_AN_INSTRUCTION')
    check('Unapplied code disables seek and marks stale data',page.evaluate('CSL.app.current.dirty&&document.getElementById("scrubber").disabled'))
    page.locator('[data-action="apply"]').click();ready(page)
    check('Invalid teaching code is reported without stale results',page.evaluate('!!CSL.app.current.error&&CSL.app.current.result===null'))
    page.locator('[data-tab="model"]').click();check('Model help remains reachable during error',page.locator('#detail-content .model-card').count()==4)
    page.locator('.control-footer [data-action="reset"]').click();ready(page);check('Reset recovers from model error',page.evaluate('!CSL.app.current.error&&CSL.app.current.result.frames.length>0'))
    # Direct state changes via actual switch control.
    goto(page,'#/lab/c08-gate','c08-gate');before=page.locator('#visualization').inner_text()
    page.locator('#p-b').check(force=True);ready(page)
    check('Direct switch updates output without play',page.locator('#visualization').inner_text()!=before and not page.locator('#player-sequence').is_visible())
    # Mobile touch: real Playwright touch input on range and player.
    touchctx=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
    touchctx.set_offline(True);touch=touchctx.new_page();touch.set_content(HTML);touch.wait_for_function('()=>CSL.app.ready')
    goto(touch,'#/lab/n11-tcp','n11-tcp')
    touch.locator('#scrubber').scroll_into_view_if_needed();box=touch.locator('#scrubber').bounding_box();touch.touchscreen.tap(box['x']+box['width']*.75,box['y']+22)
    check('Emulated touchscreen range tap seeks',touch.evaluate('CSL.app.current.index')>4)
    touch.locator('#play-button').tap();check('Emulated touchscreen play works',touch.evaluate('CSL.app.current.playing'))
    touchctx.close()
    # Responsive snapshots and representative complex figures.
    for lab in ['n11-tcp','s10-cors','c16-git','c08-gate','x01-build']:
        goto(page,'#/lab/'+lab,lab);page.evaluate('CSL.app.seek(Math.min(2,CSL.app.current.result.frames.length-1))')
        snapshot(page,lab+'-desktop.png')
        page.set_viewport_size({'width':390,'height':844});snapshot(page,lab+'-mobile.png')
        for width in [320,768,1920]:
            page.set_viewport_size({'width':width,'height':950});size=fit(page);check(lab+f' additional responsive {width}px',size['scroll']<=width+1,size)
        page.set_viewport_size({'width':1440,'height':1050})
    goto(page,'#/');page.set_viewport_size({'width':390,'height':844});snapshot(page,'home-mobile.png')
    # Explicit test double only for old-data cleanup. Unrelated data survives.
    migrated=ctx.new_page();migrated.evaluate('''()=>{window.__ops=[];window.__data={'visual-cs-lab:v1':'{"notes":["old"],"progress":{}}','unrelated':'keep'};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>{__ops.push(['read',k]);return __data[k]||null},setItem:(k,v)=>{__ops.push(['write',k]);__data[k]=String(v)},removeItem:k=>{__ops.push(['remove',k]);delete __data[k]},clear:()=>{__ops.push(['clear']);__data={}}}});}''')
    migrated.set_content(HTML);migrated.wait_for_function('()=>CSL.app.ready');goto(migrated,'#/lab/n11-tcp','n11-tcp')
    migrated.evaluate('CSL.app.baseline();CSL.app.current.answer=0;CSL.app.grade()');goto(migrated,'#/')
    check('Only old app key removed; no tracking reads or writes',migrated.evaluate('JSON.stringify(__ops)===JSON.stringify([["remove","visual-cs-lab:v1"]])&&__data.unrelated==="keep"&&!Object.hasOwn(__data,"visual-cs-lab:v1")'))
    migrated.close()
    check('No uncaught browser exceptions',not report['errors'],report['errors'])
    check('No runtime network requests',not report['requests'],report['requests'])
    browser.close()
 report['elapsed_seconds']=round(time.time()-start,2)
 report['total_checks']=len(report['checks']);report['passed']=True;save(True)
 print(json.dumps({'passed':True,'checks':len(report['checks']),'labs':len(report['labs']),'seconds':report['elapsed_seconds']},ensure_ascii=False),flush=True)
except Exception as e:
 report['passed']=False;report['failure']=str(e);report['traceback']=traceback.format_exc();save(True)
 print(report['traceback'],flush=True)
 raise
