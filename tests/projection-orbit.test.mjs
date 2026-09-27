import test from 'node:test';
import assert from 'node:assert/strict';
import {L,run} from './helpers.mjs';
const cube=async patch=>(await run('c18-projection',patch)).frames.at(-1).visual.points;
test('existing front view and new vertical rotation use the same perspective model',async()=>{
 const front=await cube({angle:0,pitch:0,distance:5});
 assert.equal(front.length,8);assert.equal(front[0].x,-.75);assert.equal(front[0].y,-.75);
 const tilted=await cube({angle:0,pitch:30,distance:5});
 assert.notDeepEqual(tilted,front);
 assert.ok(tilted.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)));
});
test('rotation and camera distance remain finite at their allowed edges',async()=>{
 for(const angle of [-180,0,180])for(const pitch of [-75,0,75])for(const distance of [3,10]){
  const points=await cube({angle,pitch,distance});assert.ok(points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),`${angle}/${pitch}/${distance}`);
 }
 const near=await cube({angle:0,pitch:0,distance:3}),far=await cube({angle:0,pitch:0,distance:10});
 assert.ok(Math.abs(near[0].x)>Math.abs(far[0].x));
});
test('the orbit feature belongs only to the cube projection',()=>{
 const lab=L.labs.find(l=>l.id==='c18-projection');assert.equal(lab.defaults.pitch,0);
 assert.deepEqual(L.experiences.find('c18-projection').chapters[0].activities[0].keys,['angle','pitch','distance']);
 assert.ok(!L.experiences.find('gap-137').chapters.some(ch=>ch.activities.some(a=>a.kind==='projection-orbit')));
});
