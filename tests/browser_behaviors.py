"""Focused interaction/race tests. Same offline set_content limits as the main suite."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,shutil,traceback
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('QA_OUTPUT',ROOT/'test-results'));OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def check(name,condition):
    if not condition:raise AssertionError(name)
    checks.append(name)
def ready(page):page.wait_for_function('()=>CSL.app.current&&!CSL.app.current.pending&&!CSL.app.current.dirty&&(CSL.app.current.result||CSL.app.current.error)')
def go(page,id):
    page.evaluate('(id)=>{location.hash="#/lab/"+id}',id)
    page.wait_for_function('(id)=>CSL.app.current?.lab.id===id',arg=id);ready(page)
try:
 with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox'])
    ctx=b.new_context(viewport={'width':1440,'height':1000});ctx.set_offline(True)
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content((ROOT/'index.html').read_text());page.wait_for_function('()=>CSL.app.ready')
    # Inject explicit compute delays, not fake calculation results.
    go(page,'n11-tcp')
    page.evaluate('''()=>{const L=CSL,key=L.app.current.lab.engine;window.__engine=L.engines[key];window.__engineKey=key;L.engines[key]=async(p,l)=>{const r=await __engine(p,l);await new Promise(resolve=>setTimeout(resolve,p.rtt===100?180:15));return r;};}''')
    page.evaluate('CSL.app.parameter("rtt",100,{immediate:true})');page.wait_for_timeout(25)
    check('Slow calculation is pending',page.evaluate('CSL.app.current.pending'))
    page.evaluate('CSL.app.parameter("rtt",200,{immediate:true})');ready(page);page.wait_for_timeout(230)
    check('Later fast calculation wins over old slow result',page.evaluate('CSL.app.current.params.rtt===200&&CSL.app.current.computedParams.rtt===200&&!CSL.app.current.pending&&CSL.app.current.index===0'))
    page.evaluate('CSL.app.parameter("rtt",100,{immediate:true})');page.wait_for_timeout(20)
    go(page,'c08-gate');page.wait_for_timeout(250)
    check('Old async result cannot overwrite new unit',page.evaluate('CSL.app.current.lab.id==="c08-gate"&&!CSL.app.current.error&&CSL.app.current.result.frames[0].visual.type==="gate"'))
    page.evaluate('()=>{CSL.engines[window.__engineKey]=window.__engine;}')
    # Builder: actual pointer moves and links, not only text JSON.
    go(page,'x01-build')
    page.evaluate('window.__before=CSL.parseTopology(CSL.app.current.params.topology)')
    node=page.locator('#visualization [data-node="PC"]');node.scroll_into_view_if_needed();box=node.bounding_box()
    page.mouse.move(box['x']+box['width']/2,box['y']+20);page.mouse.down();page.mouse.move(box['x']+box['width']/2+40,box['y']+38,steps=8);page.mouse.up();ready(page)
    check('Dragging a machine changes its coordinates',page.evaluate('CSL.parseTopology(CSL.app.current.params.topology).nodes.find(n=>n.id==="PC").x!==__before.nodes.find(n=>n.id==="PC").x'))
    page.locator('[data-action="add-node"][data-kind="pc"]').click();ready(page)
    check('Adding a machine updates the graph',page.evaluate('CSL.parseTopology(CSL.app.current.params.topology).nodes.length===__before.nodes.length+1'))
    page.locator('[data-action="connect-nodes"]').click()
    page.locator('#visualization [data-node="SW"]').click();ready(page)
    check('Selected new machine can connect to switch',page.evaluate('CSL.parseTopology(CSL.app.current.params.topology).edges.some(e=>e.a==="N1"&&e.b==="SW"||e.a==="SW"&&e.b==="N1")'))
    page.locator('#visualization [data-edge="0"]').click();ready(page)
    check('Clicking a link toggles only virtual topology',page.evaluate('CSL.parseTopology(CSL.app.current.params.topology).edges[0].off===true'))
    # Prepared comparison: graph marker IDs unique; steps independent; read-only.
    page.locator('[data-example="variant"]').click();ready(page);page.evaluate('CSL.app.stop();CSL.app.setTab("compare")')
    page.locator('.compare-diagrams summary').click()
    check('Two independent diagram panels rendered',page.locator('.compare-drawing[inert]').count()==2)
    page.locator('#compare-step-a').select_option('0')
    check('A selector displays its selected frame',page.evaluate('document.querySelector("#compare-figure-a .compare-frame-description strong").textContent===CSL.app.current.baseline.frames[0].title'))
    check('Main step stays independent of comparison selection',page.evaluate('CSL.app.current.index===0'))
    check('Comparison figures excluded from direct editing',page.evaluate('Array.from(document.querySelectorAll(".compare-drawing")).every(x=>x.inert)'))
    check('Comparison network nodes keep the readable diagram theme',page.evaluate('''()=>Array.from(document.querySelectorAll('.compare-drawing .network-node rect')).every(e=>!['rgb(0, 0, 0)','black'].includes(getComputedStyle(e).fill))'''))
    check('Comparison text keeps the readable diagram theme',page.evaluate('''()=>Array.from(document.querySelectorAll('.compare-drawing svg text')).every(e=>!['rgb(0, 0, 0)','black'].includes(getComputedStyle(e).fill))'''))
    page.wait_for_timeout(3200)
    page.evaluate('window.scrollTo({top:0,behavior:"instant"})')
    page.screenshot(path=str(OUT/'network-comparison.png'),full_page=True)
    # All visual families: capture the data-driven rendering for manual review.
    representatives=page.evaluate('''async()=>{const seen={};for(const lab of CSL.labs){if(['aes','hash','signature','password'].includes(lab.engine))continue;const r=await CSL.run(lab,lab.defaults);r.frames.forEach((f,i)=>{if(!seen[f.visual.type])seen[f.visual.type]={lab:lab.id,index:i};});}return seen;}''')
    (OUT/'visual-families').mkdir(exist_ok=True)
    for kind,spec in representatives.items():
        go(page,spec['lab']);page.evaluate('(i)=>CSL.app.seek(i)',spec['index'])
        page.locator('#visualization').screenshot(path=str(OUT/'visual-families'/f'{kind}.png'))
        check(f'{kind} diagram rendered',page.locator('#visualization').inner_text().strip()!='' or page.locator('#visualization svg').count()>0)
    # Re-reading the HTML is a new app instance, not restoration.
    go(page,'n11-tcp');page.evaluate('CSL.app.parameter("rtt",200,{immediate:true})');ready(page);page.evaluate('CSL.app.baseline()')
    page.set_content((ROOT/'index.html').read_text());page.wait_for_function('()=>CSL.app.ready');ready(page)
    check('Reloaded application forgets changed input and comparison',page.evaluate('CSL.app.current.params.rtt===80&&CSL.app.current.baseline===null'))
    check('No uncaught exceptions in focused interactions',not errors)
    b.close()
 result={'passed':True,'total_checks':len(checks),'checks':checks,'visual_families':len(representatives),'note':'Offline set_content. Async delays injected only to test races. No native URL-origin storage / crypto validation.'}
 (OUT/'behavior-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
 print(json.dumps(result,ensure_ascii=False),flush=True)
except Exception:
 (OUT/'behavior-failure.txt').write_text(traceback.format_exc());raise
