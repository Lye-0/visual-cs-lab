/* Additional circuit lessons use the existing, separately scoped device model. */
(() => {
'use strict';
const L=CSL;if(L.onDemand)return;
const original=L.labs.find(l=>l.id==='gap-061');
L.sources['openstax-semiconductor']={name:'OpenStax University Physics: Semiconductor Devices',url:'https://openstax.org/books/university-physics-volume-3/pages/9-7-semiconductor-devices',type:'教科書'};
const defs=[
 ['c08-pn-junction','pn接合とダイオード','pn接合では、なぜ電圧の向きで電流が変わる？','pn接合の内部と電圧・電流の関係を対応させます。'],
 ['c08-bipolar','バイポーラトランジスタの動作','ベースを通った電子は、なぜコレクタへ届く？','二つの接合、キャリアの移動、端子の電流をつなぎます。'],
 ['c08-amplifier','トランジスタの増幅回路','小さな入力の変化が、なぜ出力を逆向きに変える？','エミッタ接地回路の動作点、電流、波形を対応させます。'],
 ['c08-bias','バイアス回路と計算','エミッタ抵抗は、電流の変化をどう抑える？','固定バイアスと電流帰還を回路と式で読みます。']
];
for(const [id,unit,question,summary] of defs){const lab=L.add({...L.clone(original),id,unit,title:unit,question,summary,sources:[...original.sources,'openstax-semiconductor'],lesson:summary,reading:{...L.clone(original.reading),why:question,idea:summary,terms:[]},gapId:undefined,scope:'半導体・回路の働きを、限られた小例と模式図で示します。',limits:'表示値は教育用の近似で、実機の設計値や全ての条件を表すものではありません。',prereq:[],keywords:[unit,'ダイオード','トランジスタ','増幅','バイアス','電気電子回路']});L.lessonDrafts[id]={...L.lessonDrafts['gap-061'],why:question,idea:summary};for(const course of L.courses)if(course.labs.includes('gap-061')&&!course.labs.includes(id))course.labs.push(id);}
L.additionalLabIds=[...(L.additionalLabIds||[]),...defs.map(d=>d[0])];L.curriculum.coverage.units=L.labs.length;L.curriculum.coverage.additionalIds=L.additionalLabIds.slice();
})();
