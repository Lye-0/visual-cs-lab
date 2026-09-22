import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {modelModules} from '../scripts/modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
const E=CSL.experiences.mathEvidence,R=E.rational,clone=structuredClone;
const close=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const op=(s,operation,row,other,factor)=>E.row(s,{kind:'operate',operation,row,other,factor});
function solve(s){s=op(s,'add',0,1,'1');s=op(s,'scale',0,1,'1/3');s=op(s,'add',1,0,'-1');return op(s,'scale',1,0,'-1');}
test('fraction syntax preserves decimal and negative denominator exactly',()=>{
 assert.deepEqual(R.parse('2/6'),[1,3]);assert.deepEqual(R.parse(' -3 / -9 '),[1,3]);assert.deepEqual(R.parse('0.125'),[1,8]);assert.deepEqual(R.parse('-0.5'),[-1,2]);assert.deepEqual(R.parse('0/8'),[0,1]);
 for(const value of ['1/0','','1/2/3','NaN','1.1234567','1e3','2+3'])assert.throws(()=>R.parse(value));
});
test('rational operations do not round a third between operations',()=>{
 assert.deepEqual(R.add(R.parse('1/3'),R.parse('2/3')),[1,1]);assert.deepEqual(R.mul(R.parse('3/7'),R.parse('7/3')),[1,1]);assert.deepEqual(R.sub([1,3],[1,3]),[0,1]);assert.throws(()=>R.fraction(Number.MAX_SAFE_INTEGER+1));
});
test('equation row operations are reversible, including the RHS',()=>{
 const s=E.rowStart(),before=clone(s),next=op(s,'add',0,1,'2/3'),back=op(next,'add',0,1,'-2/3');assert.deepEqual(s,before);assert.deepEqual(back.entries.at(-1).matrix,s.initial);
 assert.deepEqual(next.entries.at(-1).terms.map(t=>t.result),next.entries.at(-1).matrix[0]);
});
test('fractional elimination finds a solution and verifies original equations independently',()=>{
 const s=solve(E.rowStart()),v=E.rowView(s);assert.equal(v.unit,true);assert.deepEqual(v.matrix.map(r=>r[2]),[[2,1],[1,1]]);assert.deepEqual(v.verification,[{left:[5,1],right:[5,1]},{left:[1,1],right:[1,1]}]);
});
test('augmented identity is changed by the same operations and yields an exact inverse',()=>{
 const s=solve(E.rowStart('unique',true)),v=E.rowView(s);assert.deepEqual(v.matrix.map(r=>r.slice(2)),[[[1,3],[1,3]],[[1,3],[-2,3]]]);assert.deepEqual(v.verification,[[[1,1],[0,1]],[[0,1],[1,1]]]);
});
test('zero equals zero and zero equals nonzero are not called the same outcome',()=>{
 const dep=E.rowView(op(E.rowStart('dependent'),'add',1,0,'-2')),bad=E.rowView(op(E.rowStart('inconsistent'),'add',1,0,'-2'));
 assert.equal(dep.redundant,1);assert.equal(bad.contradiction,1);assert.match(dep.outcome,/無数/);assert.match(bad.outcome,/解はありません/);
});
test('a singular inverse cannot be reported as a successful inverse',()=>{
 const v=E.rowView(op(E.rowStart('dependent',true),'add',1,0,'-2'));assert.equal(v.unit,false);assert.equal(v.verification,null);assert.match(v.outcome,/逆行列はありません/);
});
test('invalid row operations are atomic and limited',()=>{
 const s=E.rowStart(),old=clone(s);for(const a of [{operation:'scale',factor:'0'},{operation:'add',row:0,other:0},{operation:'scale',factor:'1/0'},{operation:'scale',factor:'101'}])assert.throws(()=>E.row(s,{kind:'operate',row:0,other:1,operation:'add',factor:'1',...a}));assert.deepEqual(s,old);
});
test('matrix product has independently calculated values, not componentwise multiplication',()=>{
 const v=E.productView(E.productStart());assert.deepEqual(v.result,[[4,5],[10,11]]);assert.equal(v.terms.length,3);const ba=E.productView(E.product(E.productStart(),{kind:'order',value:'BA'}));assert.deepEqual(ba.result,[[1,2,3],[4,5,6],[5,7,9]]);
});
test('selecting a result cell selects its row, column and full sum',()=>{
 const s=E.product(E.productStart(),{kind:'select',row:1,col:0}),v=E.productView(s);assert.deepEqual(v.terms.map(t=>[t.left,t.right,t.product]),[[4,1,4],[5,0,0],[6,1,6]]);assert.equal(v.value,10);
});
test('dimension mismatch is represented as undefined rather than a fake answer',()=>{
 const s=E.product(E.productStart(),{kind:'load',A:'1,2,3;4,5,6',B:'1;2;3'}),ba=E.product(s,{kind:'order',value:'BA'});assert.equal(E.productView(s).valid,true);assert.equal(E.productView(ba).valid,false);assert.throws(()=>E.product(ba,{kind:'select',row:0,col:0}));
});
test('an invalid matrix cannot half-update the pair',()=>{
 const s=E.productStart(),old=clone(s);for(const B of ['','1,2;3','1,,2','1;','1;\n2','NaN','21'])assert.throws(()=>E.product(s,{kind:'load',A:'2,0;0,2',B}));assert.deepEqual(s,old);
});
test('gradient direction at (1,1) corresponds to its partial derivatives',()=>{
 const v=E.gradientView(E.gradientStart());assert.deepEqual(v.gradient,[2,4]);close(v.slope,2);close(v.value,3);close(v.actual,3.5625);close(v.linear,3.5);close(v.error,.0625);
});
test('normalized steepest direction reaches gradient magnitude, opposite reverses sign',()=>{
 const up=E.gradientView(E.gradient(E.gradientStart(),{kind:'direction',value:'up'})),down=E.gradientView(E.gradient(E.gradientStart(),{kind:'direction',value:'down'}));close(up.slope,Math.sqrt(20));close(down.slope,-Math.sqrt(20));close(Math.hypot(...up.u),1);
});
test('perpendicular has zero first derivative but a finite straight move changes height',()=>{
 const v=E.gradientView(E.gradient(E.gradientStart(),{kind:'direction',value:'level'}));close(v.slope,0);assert.ok(v.actual>v.linear);assert.ok(v.error>0);
});
test('the tangent-plane error scales quadratically in these quadratic examples',()=>{
 let s=E.gradient(E.gradientStart(),{kind:'angle',value:37}),large=E.gradientView(s);s=E.gradient(s,{kind:'step',value:.125});const small=E.gradientView(s);close(large.error,4*small.error);
});
test('zero gradient does not label every stationary point as a minimum',()=>{
 let s=E.gradient(E.gradientStart(),{kind:'point',x:0,y:0});assert.equal(E.gradientView(s).norm,0);assert.throws(()=>E.gradient(s,{kind:'direction',value:'up'}));s=E.gradient(s,{kind:'shape',value:'saddle'});assert.equal(E.gradientView(s).norm,0);assert.ok(E.surface('saddle',1,0)>0&&E.surface('saddle',0,1)<0);
});
test('directional derivative agrees with an independent centered difference',()=>{
 for(const shape of ['bowl','saddle'])for(const angle of [-130,-15,80]){
  const s={...E.gradientStart(),shape,angle,point:[-.4,.8]},v=E.gradientView(s),eps=1e-5,calc=(x,y)=>shape==='bowl'?x*x+2*y*y:x*x-y*y;
  close(v.slope,(calc(s.point[0]+eps*v.u[0],s.point[1]+eps*v.u[1])-calc(s.point[0]-eps*v.u[0],s.point[1]-eps*v.u[1]))/(2*eps),1e-8);
 }
});
test('ODE retains the departure state and slope separately from the arrival time',()=>{
 const s=E.ode(E.odeStart(),{kind:'step'}),row=s.rows[1];assert.equal(row.t,.25);assert.equal(row.departure.t,0);assert.equal(row.departure.slope,-2);assert.equal(row.euler,1.5);assert.notEqual(-s.k*row.euler,row.departure.slope);
});
test('RK4 uses its own previous value and exposes the intermediate evaluations',()=>{
 let s=E.ode(E.odeStart(),{kind:'step'});const first=s.rows[1];s=E.ode(s,{kind:'step'});const d=s.rows[2].departure;assert.equal(d.rk4,first.rk4);assert.notEqual(d.rk4,first.euler);d.states.forEach((value,i)=>close(d.stages[i],-s.k*value));assert.deepEqual(d.weights,[1,2,2,1]);
});
test('the displayed RK4 expansion adds up to its arrival result',()=>{
 const s=E.ode(E.odeStart(),{kind:'step'}),row=s.rows[1],d=row.departure;close(row.rk4,d.rk4+s.step*d.stages.reduce((sum,k,i)=>sum+d.weights[i]*k,0)/6);close(row.rk4,2*(1-.25+.25**2/2-.25**3/6+.25**4/24));
});
test('one-step rollback preserves initial parameters; a zero solution is retained',()=>{
 const start=E.odeStart(0,2,.5),next=E.ode(start,{kind:'step'});assert.deepEqual(E.ode(next,{kind:'back'}),start);assert.deepEqual(next.rows[1].departure.stages,[0,0,0,0].map(()=>-0));assert.equal(next.rows[1].exact,0);
});
test('large-step divergence remains in the data instead of being clipped to a friendly range',()=>{
 let s=E.odeStart(3,3,1);for(let i=0;i<4;i++)s=E.ode(s,{kind:'step'});assert.equal(s.rows[4].euler,48);assert.throws(()=>E.ode(s,{kind:'step'}));assert.ok(s.rows[4].exact<.001);
});
test('all 314 registrations and previous chapter links remain; new chapter is additive',()=>{
 const X=CSL.experiences;assert.equal(X.lessons.size,314);assert.equal(X.find('c03-matrix').chapters[0].id,'meaning');assert.ok(X.find('c03-matrix').chapters.some(c=>c.id==='product'));assert.equal(X.find('gap-006').chapters[0].id,'gradient');assert.equal(X.find('gap-006').chapters[0].activities[0].kind,'gradient-direction');assert.deepEqual(X.find('gap-002').chapters.map(c=>c.id),['equations','inverse','solutions']);
});
test('the reviewed slope caption is not allowed to return',async()=>{
 const text=await readFile(new URL('../src/experiences-ode-evidence.js',import.meta.url),'utf8');assert.match(text,/出発点での傾き/);assert.doesNotMatch(text,/その点の傾き/);
});
