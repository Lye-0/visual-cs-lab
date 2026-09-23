import test from 'node:test';
import assert from 'node:assert/strict';
import {modelModules} from '../scripts/modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
const X=CSL.experiences,M=X.multivariable,copy=structuredClone;
const close=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
const analytic=(a,b,c,x,y)=>[a*x**3/3,b*x*x/2,c*x].map((v,i)=>v*[y,y*y/2,y**3/3][i]).reduce((s,v)=>s+v,0);
test('the local example retains its original T and independently known J',()=>{
 const v=M.localView(M.localStart());assert.deepEqual(v.base,[.75,1]);assert.deepEqual(v.J,[[2,-1],[1,2]]);
 assert.deepEqual(v.selected.actual,[.5,2]);assert.deepEqual(v.selected.predicted,[.5,1.5]);assert.deepEqual(v.selected.error,[0,.5]);assert.equal(v.det,5);assert.equal(v.linearArea,1.25);
});
test('each column predicts its own input direction, each row adds two contributions',()=>{
 const s=M.localStart();for(let corner=0;corner<4;corner++){
  const v=M.localView(M.local(s,{kind:'corner',index:corner}));v.J.forEach((row,i)=>close(v.selected.predicted[i],v.terms[i][0]+v.terms[i][1]));
 }
 const first=M.localView(M.local(s,{kind:'corner',index:1}));assert.deepEqual(first.selected.predicted,[1,.5]);
 const second=M.localView(M.local(s,{kind:'corner',index:3}));assert.deepEqual(second.selected.predicted,[-.5,1]);
});
test('central numerical differences independently match all four partial derivatives',()=>{
 const f=(x,y)=>[x*x-y*y,2*x*y],eps=1e-5;
 for(const [x,y]of [[1,.5],[-1,1.5],[0,0],[.17,-.9]]){
  const v=M.localView(M.local(M.localStart(),{kind:'point',x,y}));
  for(let i=0;i<2;i++){close(v.J[i][0],(f(x+eps,y)[i]-f(x-eps,y)[i])/(2*eps));close(v.J[i][1],(f(x,y+eps)[i]-f(x,y-eps)[i])/(2*eps));}
 }
});
test('halving h holds P and the visual scale fixed and quarters the absolute error',()=>{
 const s=M.localStart(),v=M.localView(s),half=M.local(s,{kind:'h',value:.25}),w=M.localView(half);
 assert.deepEqual(half.point,s.point);close(v.absoluteError,4*w.absoluteError);assert.equal(v.outputExtent,w.outputExtent);
});
test('the zero Jacobian does not turn the nonconstant transform into zero',()=>{
 const s=M.local(M.localStart(),{kind:'point',x:0,y:0}),v=M.localView(s);assert.equal(v.det,0);assert.deepEqual(v.selected.predicted,[0,0]);assert.deepEqual(v.selected.actual,[0,.5]);
 const w=M.localView(M.local(s,{kind:'h',value:.25}));close(w.absoluteError,.125);
});
test('local boundary is a closed curve with independently computed endpoints',()=>{
 const v=M.localView(M.localStart());assert.equal(v.boundary.length,68);assert.deepEqual(v.boundary[0].actual,v.boundary.at(-1).actual);
 for(const q of v.boundary){const [dx,dy]=q.delta;close(q.error[0],dx*dx-dy*dy);close(q.error[1],2*dx*dy);}
});
test('the fixed diagram range contains allowed boundary extremes',()=>{
 for(const x of [-1.5,-.5,0,.5,1.5])for(const y of [-1.5,-.5,0,.5,1.5])for(const h of [.05,.5,.8]){
  const v=M.localView({...M.localStart(),point:[x,y],h});for(const b of v.boundary)for(const value of [...b.actual,...b.predicted])assert.ok(Math.abs(value)<v.outputExtent);
 }
});
test('invalid local edits leave the input untouched',()=>{
 const s=M.localStart(),original=copy(s);for(const a of [{kind:'point',x:NaN,y:0},{kind:'point',x:0,y:2},{kind:'h',value:0},{kind:'corner',index:4},{kind:'entry',index:1.5}])assert.throws(()=>M.local(s,a));assert.deepEqual(s,original);
});
test('full-square area and integral match analytic polynomial integrals',()=>{
 const v=M.regionView(M.regionStart());close(v.area,1);assert.equal(v.count,16);close(v.exact,1.25);close(v.sum,1.234375);close(v.error,-.015625);
});
test('the cell contribution is height times both widths, not height times one width',()=>{
 const v=M.regionView(M.regionStart()),c=v.selected;close(c.x,.375);close(c.y,.375);close(c.height,.5625);close(c.cellArea,.0625);close(c.contribution,.03515625);
});
test('excluding a cell changes the sum but not the height at that point',()=>{
 const s=M.regionStart(),v=M.regionView(s),next=M.region(s,{kind:'toggle'}),w=M.regionView(next);close(w.sum,v.sum-v.selected.contribution);close(w.selected.height,v.selected.height);close(w.area,15/16);assert.equal(w.selected.contribution,0);
});
test('an L region is exactly a union of rectangles, not an unlabelled approximated triangle',()=>{
 const s=M.region(M.regionStart(),{kind:'preset',value:'L'}),v=M.regionView(s);close(v.area,.75);assert.equal(v.count,12);
 const square=analytic(1,1,2,1,1),removed=analytic(1,1,2,1,1)-analytic(1,1,2,.5,1)-analytic(1,1,2,1,.5)+analytic(1,1,2,.5,.5);close(v.exact,square-removed);
});
test('refinement holds the edited region, area and exact integral fixed',()=>{
 let s=M.region(M.regionStart(),{kind:'preset',value:'L'});s=M.region(s,{kind:'toggle'});const v=M.regionView(s),r=M.region(s,{kind:'refine'}),w=M.regionView(r);
 assert.equal(r.n,8);assert.equal(w.count,4*v.count);close(v.area,w.area);close(v.exact,w.exact);close(v.error,4*w.error);
 // Every child's membership is the original parent's, including excluded cells.
 for(const child of w.cells){const parent=Math.floor(child.j/2)*s.n+Math.floor(child.i/2);assert.equal(child.included,s.included[parent]);}
});
test('all cell exact integrals match an independent antiderivative at four corners',()=>{
 const coefficients=[-1.5,2.5,.7],s={...M.regionStart(),coefficients};
 for(const c of M.regionView(s).cells){const expected=analytic(...coefficients,c.x1,c.y1)-analytic(...coefficients,c.x0,c.y1)-analytic(...coefficients,c.x1,c.y0)+analytic(...coefficients,c.x0,c.y0);close(c.exact,expected);}
});
test('empty regions and all-zero heights are distinct states with zero integrals',()=>{
 const empty=M.regionView(M.region(M.regionStart(),{kind:'preset',value:'empty'}));close(empty.area,0);close(empty.sum,0);close(empty.exact,0);assert.ok(empty.selected.height>0);
 const flat=M.regionView(M.region(M.regionStart(),{kind:'coefficients',a:0,b:0,c:0}));close(flat.area,1);close(flat.sum,0);close(flat.exact,0);
});
test('negative heights remain signed and coefficients do not change the domain',()=>{
 const s=M.regionStart(),next=M.region(s,{kind:'coefficients',a:-1,b:-1,c:-2}),v=M.regionView(next);assert.deepEqual(next.included,s.included);close(v.sum,-1.234375);close(v.exact,-1.25);
});
test('mixed signs may cancel; membership is not inferred from height sign',()=>{
 const s=M.region(M.regionStart(),{kind:'coefficients',a:1,b:0,c:-1}),v=M.regionView(s);close(v.sum,0);close(v.exact,0);assert.ok(v.cells.some(c=>c.height>0)&&v.cells.some(c=>c.height<0));assert.equal(v.count,16);
});
test('selection, editing and keyboard navigation have different effects',()=>{
 const s=M.regionStart(),selected=M.region(s,{kind:'cell',index:0});assert.deepEqual(selected.included,s.included);
 const edit=M.region(s,{kind:'mode',edit:true}),paint=M.region(edit,{kind:'cell',index:0});assert.equal(paint.included[0],false);
 const focused=M.region(edit,{kind:'focus-cell',index:0});assert.deepEqual(focused.included,s.included);assert.equal(focused.selected,0);
});
test('refinement stops at 16 and all state reductions are atomic',()=>{
 const s=M.regionStart(),saved=copy(s);for(const a of [{kind:'cell',index:-1},{kind:'coefficients',a:2,b:NaN,c:1},{kind:'mode',edit:1},{kind:'preset',value:'triangle'}])assert.throws(()=>M.region(s,a));assert.deepEqual(s,saved);
 const refined=M.region(M.region(s,{kind:'refine'}),{kind:'refine'});assert.equal(refined.n,16);assert.throws(()=>M.region(refined,{kind:'refine'}));
});
test('existing routes and calculation activities survive, only two activities are new',()=>{
 const d=X.find('gap-006');assert.equal(X.lessons.size,314);assert.deepEqual(d.chapters.map(c=>c.id),['gradient','gradient-calculation','jacobian','jacobian-calculation','area','area-calculation']);
 assert.equal(d.chapters.find(c=>c.id==='jacobian').activities[0].kind,'jacobian-local');assert.equal(d.chapters.find(c=>c.id==='area').activities[0].kind,'double-integral-region');
 assert.equal(d.chapters.find(c=>c.id==='jacobian-calculation').activities[0].patch.mode,'jacobian');assert.equal(d.chapters.find(c=>c.id==='area-calculation').activities[0].patch.mode,'integral');
});
