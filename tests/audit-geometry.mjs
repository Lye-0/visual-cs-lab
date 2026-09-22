// Installed in the browser by Playwright; no application sources are changed.
export function installGeometryAudit(){
 globalThis.__auditSvgBox=(element,svg)=>{
  const local=element.getBBox(),from=element.getScreenCTM(),to=svg.getScreenCTM();
  if(!from||!to)throw Error('The SVG coordinate transforms are unavailable.');
  const matrix=to.inverse().multiply(from);
  const corners=[[local.x,local.y],[local.x+local.width,local.y],[local.x,local.y+local.height],[local.x+local.width,local.y+local.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(matrix));
  const x=Math.min(...corners.map(p=>p.x)),y=Math.min(...corners.map(p=>p.y));
  return {x,y,w:Math.max(...corners.map(p=>p.x))-x,h:Math.max(...corners.map(p=>p.y))-y};
 };
 globalThis.__auditSvgOutside=(element,svg,padding=3)=>{
  const b=__auditSvgBox(element,svg),v=svg.viewBox.baseVal;
  return b.x<v.x-padding||b.y<v.y-padding||b.x+b.w>v.x+v.width+padding||b.y+b.h>v.y+v.height+padding;
 };
}
export async function verifyGeometryAudit(browser){
 const context=await browser.newContext(),page=await context.newPage();
 await context.addInitScript(installGeometryAudit);
 try{
  await page.goto('about:blank');
  await page.setContent('<svg id="plot" viewBox="0 0 400 300" width="600" height="450"><g transform="translate(180 120)"><text id="inside" x="0" y="0" text-anchor="middle">Inside</text><g transform="scale(1.5) rotate(15)"><text id="nested" x="0" y="20">Nested</text></g></g><text id="outside" x="-100" y="80">Outside</text><text id="bottom" x="30" y="350">Bottom</text></svg>');
  await page.evaluate(()=>document.fonts.ready);
  const result=await page.evaluate(()=>{
   const svg=document.getElementById('plot'),inside=document.getElementById('inside');
   return {negativeLocalX:inside.getBBox().x<0,inside:__auditSvgOutside(inside,svg),nested:__auditSvgOutside(document.getElementById('nested'),svg),outside:__auditSvgOutside(document.getElementById('outside'),svg),bottom:__auditSvgOutside(document.getElementById('bottom'),svg),box:__auditSvgBox(inside,svg)};
  });
  if(!result.negativeLocalX||result.inside||result.nested||!result.outside||!result.bottom||result.box.x<100)throw Error('SVG coordinate regression: '+JSON.stringify(result));
  return {checks:5,passed:5,result};
 }finally{await context.close();}
}
