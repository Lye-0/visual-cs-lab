import test from 'node:test';
import assert from 'node:assert/strict';
import {classicUrl} from './legacy-routes.mjs';
test('classic tests explicitly choose the public detail view',()=>assert.equal(classicUrl('http://localhost:1234/#/lab/c01-entropy'),'http://localhost:1234/#/lab/c01-entropy?view=classic'));
test('Pages subpath and document query remain unchanged',()=>assert.equal(classicUrl('http://localhost:1234/visual-cs-lab/?test=2#/lab/gap-155'),'http://localhost:1234/visual-cs-lab/?test=2#/lab/gap-155?view=classic'));
test('the free experiment is not silently changed into another renderer',()=>assert.equal(classicUrl('http://localhost/#/lab/n11-tcp?view=experiment'),'http://localhost/#/lab/n11-tcp?view=experiment'));
test('non-lesson navigation never gains an irrelevant view',()=>{for(const url of ['about:blank','http://localhost/#/catalog?domain=math','http://localhost/#/'])assert.equal(classicUrl(url),url);});
test('existing chapter and explicit view are preserved without duplicate keys',()=>{assert.equal(classicUrl('http://localhost/#/lab/gap-002?chapter=inverse'),'http://localhost/#/lab/gap-002?chapter=inverse&view=classic');assert.equal(classicUrl('http://localhost/#/lab/gap-002?view=classic'),'http://localhost/#/lab/gap-002?view=classic');});
