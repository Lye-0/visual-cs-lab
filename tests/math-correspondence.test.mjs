import test from 'node:test';
import assert from 'node:assert/strict';
import {modelModules} from '../scripts/modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
const E=CSL.experiences.mathEvidence,R=E.rational;
const row=(...values)=>values.map(value=>R.parse(String(value)));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('implicit vertical and horizontal equations clip without dividing by zero',()=>{
 assert.deepEqual(E.equationLine(row(1,0,2)).points,[[2,-4],[2,4]]);
 assert.deepEqual(E.equationLine(row(0,1,1)).points,[[-4,1],[4,1]]);
});
test('each clipped endpoint actually satisfies its corresponding equation',()=>{
 for(const coefficients of [[2,1,5],[1,-1,1],[-1,3,-2],[0,2,2],[2,0,-2]]){
  const line=E.equationLine(row(...coefficients));assert.equal(line.kind,'line');assert.equal(line.points.length,2);
  for(const [x,y]of line.points){close(coefficients[0]*x+coefficients[1]*y,coefficients[2]);assert.ok(Math.abs(x)<=4&&Math.abs(y)<=4);}
 }
});
test('a zero row means either the entire plane or an empty solution set',()=>{
 assert.equal(E.equationLine(row(0,0,0)).kind,'plane');assert.equal(E.equationLine(row(0,0,1)).kind,'empty');assert.equal(E.equationLine(row(1,0,20)).points.length,0);
});
test('intersection is derived from the original equations and remains on transformed lines',()=>{
 let s=E.rowStart();for(const action of [{operation:'add',row:0,other:1,factor:'1'},{operation:'scale',row:0,other:1,factor:'1/3'},{operation:'add',row:1,other:0,factor:'-1'}]){
  s=E.row(s,{kind:'operate',...action});const g=E.rowGeometry(s);assert.deepEqual(g.solution,[2,1]);assert.equal(g.classification,'one');
  for(const line of g.current){const [a,b,c]=line.coefficients;close(a*g.solution[0]+b*g.solution[1],c);}
 }
});
test('a redundant row and an impossible row do not create invented straight lines',()=>{
 const action={kind:'operate',operation:'add',row:1,other:0,factor:'-2'};
 const many=E.rowGeometry(E.row(E.rowStart('dependent'),action)),none=E.rowGeometry(E.row(E.rowStart('inconsistent'),action));
 assert.equal(many.classification,'many');assert.equal(many.current[1].kind,'plane');assert.equal(none.classification,'none');assert.equal(none.current[1].kind,'empty');assert.equal(many.solution,null);assert.equal(none.solution,null);
});
test('the inverse experiment is not mislabeled as Ax equals its first identity column',()=>{
 assert.equal(E.rowGeometry(E.rowStart('unique',true)),null);
});
test('three sections pass through precisely the same selected point and height',()=>{
 const s=E.gradient(E.gradientStart(),{kind:'point',x:-.5,y:1.25}),sections=E.directionSections(s),value=E.surface(s.shape,...s.point);
 assert.equal(sections.length,3);for(const section of sections){assert.equal(section.samples[30].t,0);close(section.samples[30].height,value);close(section.samples[30].tangent,value);}
 close(sections[0].slope,-1);close(sections[1].slope,5);
});
test('the selected direction section agrees with the tangent-plane prediction',()=>{
 const s=E.gradient(E.gradientStart(),{kind:'angle',value:73}),view=E.gradientView(s),u=E.directionSections(s)[2];
 close(u.slope,view.slope);close(u.selected.height,view.actual);close(u.selected.tangent,view.linear);
});
test('changing the viewing direction leaves the two coordinate sections untouched',()=>{
 const old=E.directionSections(E.gradientStart()),next=E.directionSections(E.gradient(E.gradientStart(),{kind:'angle',value:90}));assert.deepEqual(old.slice(0,2),next.slice(0,2));assert.notDeepEqual(old[2],next[2]);
});
test('the saddle is visibly convex on one section and concave on the other',()=>{
 const s={...E.gradientStart(),shape:'saddle',point:[0,0]},sections=E.directionSections(s);
 assert.ok(sections[0].samples[0].height>0);assert.ok(sections[1].samples[0].height<0);for(const section of sections)close(section.slope,0);
});
