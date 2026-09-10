import test from 'node:test';
import assert from 'node:assert/strict';
import {L} from './helpers.mjs';
const T=L.taxonomy;
const ids=xs=>xs.map(l=>l.id);

test('全314単元に8大分類と61テーマの主分類を一意に割り当てる',()=>{
 assert.equal(L.labs.length,314);assert.equal(T.domains.length,8);assert.equal(T.categories.length,61);
 assert.equal(new Set(T.domains.map(d=>d.id)).size,8);assert.equal(new Set(T.categories.map(c=>c.id)).size,61);
 assert.equal(L.areas.length,20);assert.equal(L.legacyLabIds.length,144);assert.equal(L.curriculum.baselineIds.length,159);
 for(const l of L.labs){assert.ok(T.domain(l.taxonomy.domain),l.id);assert.equal(T.category(l.taxonomy.category).domain,l.taxonomy.domain);assert.equal(T.select({category:l.taxonomy.category}).filter(x=>x.id===l.id).length,1);for(const id of l.taxonomy.related)assert.ok(T.category(id));}
 for(const c of T.categories){assert.ok(c.count>0);assert.ok(c.description.length>15);}
 for(const d of T.domains){assert.ok(d.count>0&&d.count<100,d.id);assert.ok(d.description.length>15);}
 assert.equal(T.categories.reduce((sum,c)=>sum+c.count,0),314);assert.equal(T.domains.reduce((sum,d)=>sum+d.count,0),314);
});
test('符号・圧縮・ビット表現と異なる科目を区別する',()=>{
 const expected={'c01-entropy':'math-information','gap-029':'math-information','gap-030':'math-coding','gap-031':'math-coding','gap-032':'math-coding','gap-033':'math-compression','gap-034':'sys-representation','gap-037':'dev-objects','gap-043':'dev-structures','c09-cache':'sys-memory','c12-quorum':'sys-distributed','c14-transaction':'data-transactions','c18-image':'media-images','gap-059':'sys-circuits','gap-088':'data-design','gap-128':'data-language','gap-148':'media-hci','gap-150':'media-accessibility','gap-153':'practice-research','gap-154':'dev-web'};
 for(const [id,category]of Object.entries(expected))assert.equal(L.labs.find(l=>l.id===id).taxonomy.category,category,id);
 assert.equal(T.select({category:'practice-missions'}).length,8);
});
test('科目名を中黒で壊さず、科目ごとに適切な追加単元を関連づける',()=>{
 const names=L.courses.map(c=>c.name);assert.equal(new Set(names).size,names.length);
 for(const name of ['確率・統計','セキュリティ・ネットワーク概論','自然言語処理','オブジェクト指向論','電気電子回路'])assert.ok(names.includes(name),name);
 for(const fragment of ['確率','統計','セキュリティ','ネットワーク概論','多変量','電気電子'])assert.ok(!names.includes(fragment),fragment);
 const statistics=L.courses.find(c=>c.name==='確率・統計').labs;assert.ok(statistics.includes('gap-016'));assert.ok(!statistics.includes('gap-001'));assert.ok(!statistics.includes('gap-128'));
 const nlp=L.courses.find(c=>c.name==='自然言語処理').labs;for(let n=128;n<=132;n++)assert.ok(nlp.includes('gap-'+n));assert.ok(!nlp.includes('gap-059'));
 for(const course of L.courses){assert.equal(new Set(course.labs).size,course.labs.length);for(const id of course.labs)assert.ok(L.labs.some(l=>l.id===id),id);}
});
test('分類・用語・完全な科目名・GAP番号を共通検索できる',()=>{
 assert.ok(ids(T.search('線形代数')).includes('gap-002'));
 assert.ok(ids(T.search('エントロピー')).includes('c01-entropy'));
 assert.ok(ids(T.search('自然言語処理')).includes('gap-128'));
 assert.ok(ids(T.search('確率・統計')).includes('gap-016'));
 assert.equal(T.search('ＧＡＰ－０３７')[0].id,'gap-037');
 assert.equal(T.search('gap-037')[0].id,'gap-037');
 assert.deepEqual(ids(T.search('ｔｃｐ')),ids(T.search('TCP')));
 assert.deepEqual(ids(T.search('エントロピー')),ids(T.search('えんとろぴー')));
 assert.deepEqual(T.search('NOT-A-REAL-UNIT-987654321'),[]);
 assert.deepEqual(T.search('<img src=x onerror=alert(1)>'),[]);
});
test('検索と分類と段階を積集合として適用する',()=>{
 assert.equal(T.select({domain:'network',q:'GAP-037'}).length,0);
 assert.deepEqual(ids(T.select({domain:'software',q:'GAP-037'})),['gap-037']);
 for(const l of T.select({domain:'math',level:2,q:'情報'})){assert.equal(l.taxonomy.domain,'math');assert.equal(l.level,2);assert.ok(ids(T.search('情報')).includes(l.id));}
 assert.deepEqual(ids(T.select(new URLSearchParams('domain=math&category=math-coding'))),ids(T.select({category:'math-coding'})));
});
test('検索に連動した件数は主分類だけ数え、同一IDの複製は二重集計しない',()=>{
 const labs=T.search('TCP'),counts=T.counts(labs);assert.equal(counts.total,labs.length);
 assert.equal(Object.values(counts.domains).reduce((s,n)=>s+n,0),labs.length);
 assert.equal(Object.values(counts.categories).reduce((s,n)=>s+n,0),labs.length);
 const sample=L.labs[0];assert.equal(T.counts([sample,{...sample}]).total,1);
 assert.equal(T.counts([]).total,0);
});
test('24件ずつの全ページをたどっても欠落・重複がなく異常なページ値を丸める',()=>{
 const labs=T.select(),all=[];for(let n=1;n<=Math.ceil(labs.length/24);n++){const p=T.page(labs,n);assert.ok(p.items.length<=24);all.push(...p.items);}
 assert.deepEqual(ids(all),ids(labs));assert.equal(new Set(ids(all)).size,314);
 assert.equal(T.page(labs,-3).number,1);assert.equal(T.page(labs,'bad').number,1);assert.equal(T.page(labs,1e12).number,14);
 assert.equal(T.page(labs,14).items.length,2);assert.deepEqual(T.page([],7),{items:[],number:1,pages:1,total:0,start:0,end:0});
});
test('旧track・area・topicのURLでも対象単元を失わない',()=>{
 for(const area of L.areas)assert.deepEqual(ids(T.select({area:area.id})),ids(L.labs.filter(l=>l.area===area.id)));
 for(const track of ['core','network','security','missions'])assert.deepEqual(ids(T.select({track})),ids(L.labs.filter(l=>l.track===track)));
 for(const topic of ['N02','N07','N11','S04','S21'])assert.deepEqual(ids(T.select({topic})),ids(L.labs.filter(l=>l.topic===topic)));
});
