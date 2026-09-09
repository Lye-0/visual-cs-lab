import test from 'node:test';
import assert from 'node:assert/strict';
import {L} from './helpers.mjs';

for (const lab of L.labs) {
 test(`${lab.id} — 単元名・説明・操作・観察点・比較用条件を備える`, async () => {
  for (const key of ['unit','summary','observe']) assert.ok(typeof lab[key] === 'string' && lab[key].length >= 4, `${lab.id} ${key}`);
  assert.equal(lab.guide.length, 3);
  assert.ok(lab.guide.every(x => x.length > 10));
  assert.ok(lab.exploration.label.length > 3);
  const patch = lab.exploration.patch;
  assert.ok(Object.keys(patch).length > 0);
  for (const key of Object.keys(patch)) assert.ok(lab.controls.some(c => c.key === key), `${lab.id} ${key}`);
  const checked = L.validateParams(lab, {...lab.defaults, ...patch});
  for (const [key, value] of Object.entries(patch)) assert.deepEqual(checked[key], value, `${lab.id} invalid example ${key}`);
  assert.ok(Object.keys(patch).some(k => JSON.stringify(patch[k]) !== JSON.stringify(lab.defaults[k])), lab.id + ' must change a condition');
  const result = await L.run(lab, checked);
  const initial = await L.run(lab, lab.defaults);
  assert.ok(result.frames.length > 0);
  assert.notDeepEqual(result, initial, lab.id + ' must produce an observable difference');
  for (const frame of result.frames) {
   const html = L.visualize(frame.visual);
   assert.ok(html.length > 0);
   assert.doesNotMatch(html, /\bNaN\b|="undefined"|="Infinity"/);
  }
  // Referencing lecture notes is allowed. Asking learners to save a note is not.
  // Storage calls and controls are tested separately in privacy.test.mjs.
  assert.doesNotMatch(lab.guide.join(' '), /ノート(?:を|に)?保存|ノート作成|お気に入り|学習履歴|理解済み/);
  if (lab.presentation === 'direct') {
   assert.equal(initial.frames.length, 1);
   assert.equal(result.frames.length, 1);
   assert.doesNotMatch(lab.guide[0], /1ステップ/);
  }
 });
}

test('旧144単元を全て保持し、追加単元と単元名に重複がない', () => {
 assert.equal(L.legacyLabIds.length, 144);
 assert.equal(new Set(L.legacyLabIds).size, 144);
 const ids = new Set(L.labs.map(l => l.id));
 assert.equal(ids.size, L.labs.length);
 for (const id of L.legacyLabIds) assert.ok(ids.has(id), `削除された単元: ${id}`);
 assert.equal(new Set(L.labs.map(l => l.unit)).size, L.labs.length);
 assert.equal(L.labs.filter(l => L.legacyLabIds.includes(l.id) && l.presentation === 'direct').length, 7);
});

test('全単元に固有の解説と有効な操作対象を持つ', () => {
 for (const lab of L.labs) {
  assert.ok(L.lessonDrafts[lab.id], lab.id);
  for (const key of ['why','idea','example','pitfall','nextLabel']) assert.ok(lab.reading[key]?.length > 5, `${lab.id}: ${key}`);
  assert.ok(lab.reading.focus.length > 0, lab.id);
  for (const key of lab.reading.focus) assert.ok(lab.controls.some(c => c.key === key), `${lab.id}: ${key}`);
  assert.ok(lab.challenge.options[lab.challenge.answer], lab.id);
 }
});

test('科目の見出し・関連単元から実在する単元へ移動できる', () => {
 const ids = new Set(L.labs.map(l => l.id));
 for (const course of L.readingCourses) {
  const covered = course.groups.flatMap(([title, links]) => { assert.ok(title.length); return links; });
  assert.equal(new Set(covered).size, covered.length, course.id);
  for (const id of covered) assert.ok(ids.has(id), `${course.id}: ${id}`);
 }
 for (const [id, links] of Object.entries(L.readingRelations)) {
  assert.ok(ids.has(id));
  for (const related of links) assert.ok(ids.has(related), related);
 }
});
