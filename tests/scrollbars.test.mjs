import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {styles} from '../scripts/modules.mjs';
const css=await readFile(new URL('../src/scrollbars.css',import.meta.url),'utf8');

test('scrollbar theme is the final shared stylesheet, without replacing native scrolling',()=>{
 assert.equal(styles.at(-1),'scrollbars');
 assert.match(css,/@media \(pointer: fine\) and \(forced-colors: none\)/);
 assert.match(css,/@supports selector\(::-webkit-scrollbar\)/);
 assert.match(css,/scrollbar-width: auto;\s+scrollbar-color: auto;/);
 assert.doesNotMatch(css,/overflow\s*:|scrollbar-width:\s*none|!important|url\(/);
});
test('idle and hover thumb colors remain distinguishable against the dark surfaces',()=>{
 const luminance=hex=>{
  const rgb=hex.match(/[0-9a-f]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
 };
 for(const property of ['thumb','thumb-hover','thumb-active']){
  const match=css.match(new RegExp('--scrollbar-'+property+': (#[0-9a-f]{6})'));assert.ok(match);
  for(const bg of ['#0b0e13','#0e1218','#121820','#171e28','#1c2531']){
   const light=luminance(match[1].slice(1)),dark=luminance(bg.slice(1));
   assert.ok((light+.05)/(dark+.05)>=3,property+' on '+bg);
  }
 }
});
