"""One-off authoring transaction for the eight already reviewed lessons.
Not part of build/test/runtime. Every old file and restored blob is hash-guarded.
The accompanying workflow tests a LOCAL commit before pushing that commit.
"""
import base64
import hashlib
import json
import os
from pathlib import Path
import subprocess
import urllib.request

expected = {
 'scripts/modules.mjs':'f69740cd3a3fadf6667ab091e6611a0c6dda414d',
 'src/experiences-foundations.js':'028e7cde5f60089f37fc4681e4ad139d81fe9e93',
 'src/experiences-systems.js':'bb245284d4171ec9e4b71c7ea154084a7928a0e4',
 'src/experiences-objects.js':'fadd051830ff45d15e6c90600738580d2408138b',
 'tests/authored-result-values-browser.mjs':'bd4a87f77f17338e69460c0cee1328b522dba51c'
}
for path, sha in expected.items():
 actual = subprocess.check_output(['git','hash-object',path]).decode().strip()
 if actual != sha:
  raise RuntimeError('Reviewed source changed: '+path+' '+actual)
blobs = {
 'src/experiences-foundation-review.js':'886f53d3108edf53f4d7d2b3fdc02e8a8f6e2c1c',
 'src/experiences-foundation-review-widgets.js':'3a437448dbbae099efc652ffdac17d8cb6d628b4',
 'src/experiences-foundation-review.css':'50194f28a914e526bd34e2b3f174869b12bec778',
 'tests/foundation-review.test.mjs':'e4a357db077ad2d361c465474d5e2622e86feacb',
 'tests/foundation-review-browser.mjs':'df258c208f688daff2f117036618f17858920d35'
}
for path, sha in blobs.items():
 if Path(path).exists():
  raise RuntimeError('New file already exists: '+path)
 req = urllib.request.Request('https://api.github.com/repos/Lye-0/visual-cs-lab/git/blobs/'+sha,
  headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json'})
 with urllib.request.urlopen(req, timeout=30) as response:
  obj = json.load(response)
 if obj['encoding'] != 'base64' or obj['sha'] != sha:
  raise RuntimeError('Unexpected blob response: '+path)
 data = base64.b64decode(obj['content'])
 if hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest() != sha:
  raise RuntimeError('Blob content hash mismatch: '+path)
 Path(path).write_bytes(data)

def replace(path, old, new):
 p=Path(path); s=p.read_text()
 if s.count(old)!=1:
  raise RuntimeError('Expected exactly one replacement in '+path+': '+old)
 p.write_text(s.replace(old,new,1))
def lesson(path, id, new):
 p=Path(path); s=p.read_text()
 lines=[line for line in s.splitlines() if line.startswith("d('"+id+"',")]
 if len(lines)!=1:
  raise RuntimeError('Expected one lesson: '+id)
 p.write_text(s.replace(lines[0],new,1))

replace('scripts/modules.mjs','"experiences-results"];','"experiences-results","experiences-foundation-review"];')
replace('scripts/modules.mjs','"experiences-math-workbooks"];','"experiences-math-workbooks","experiences-foundation-review-widgets"];')
replace('scripts/modules.mjs','"experiences-math-evidence","scrollbars"];','"experiences-math-evidence","experiences-foundation-review","scrollbars"];')
lesson('src/experiences-foundations.js','c01-hamming',"""X.define('c01-hamming','反転した場所を知る実験者と、届いたbitしか知らない受信側を分けます。',[
 C('meaning','受信側は、どの情報で誤りを探すか','受信した1bitが違う。その位置をどう知るのでしょうか。','まず情報4bitを符号化し、通信路の位置3を一つ反転してから届けてください。受信側で検査1・2・4を選び、各検査が読む位置とXORの結果を対応させます。単一誤りの規則を適用した後に、送信列との答え合わせを表示します。',[A('hamming-roles','送信・通信路・受信検査を自分で操作する')],['位置1・2・4は検査bit、3・5・6・7は情報bitです。保証は高々1bit誤り。複数bitを反転すると別の符号語へ誤って直してしまう例も比較できます。']),
 C('calculation','固定した条件の計算記録','同じ入力の符号化・受信検査・訂正を並べて読むには？','ここでは条件を先に固定して、三つの段階の記録を読みます。通信を自分で進める操作は最初の章で行います。',[A('timeline','符号化・反転・受信検査',['text','flip'],{},{advance:'次の役割の処理を確認する'})],['この章の反転は0または1bitに限定した計算です。'])
]);""")
lesson('src/experiences-foundations.js','c03-integral',"""X.define('c03-integral','図の一つの台形と、和の一項を同じ区間へ対応させます。',[
 C('meaning','一つの台形から全体の和へ','選んだ台形の幅と高さは、式のどの項に入るのでしょうか。','f(x)=x²を0から2まで、まず4区間に分けます。台形か区間ボタンを選び、その幅と両端の高さから一項を計算してください。端点や分割数を変えても、選んだ項と合計は同じ条件から計算します。',[A('trapezoid-select','台形を選び、幅・高さ・式へ戻る')],['逆向きの区間では符号付きの幅が負になります。図の幾何学的面積と積分の符号は区別します。表示の丸めと台形則の近似も別です。']),
 C('calculation','分割数を増やした計算記録','項数を増やしたときの部分和と誤差を読むには？','最初の章で一項を読んだ後、より多い区間の計算を記録として調べます。前の計算を消さずに続きの項を追加できます。',[A('ledger','各台形の計算を残す',['n','start','end'])])
]);""")
lesson('src/experiences-foundations.js','c06-dp',"d('c06-dp','一つのセルに、二つの選択を対応させる','入れない場合と1個入れる場合を、既に解いた小さな問題へ結び付けます。','品物A・B・C・Dをそれぞれ1個まで使います。まずDまで・容量7のセルを選び、二つの参照元と比較する値を確認してください。容量だけでなく、品物の重さと価値も変えて試せます。',[A('knapsack-cells','表のセルから二つの候補と参照元を読む')],['行は使ってよい品物の範囲、列は容量の上限です。両候補は一つ上の行を参照するため、今の品物を繰り返し使いません。同値の最適解は一つとは限りません。']);")
replace('src/experiences-foundations.js',"A('inspect','成功の割合を自分で調べる',['probability','n'],{},{showDerivation:true})","A('inspect','成功の割合を自分で調べる',['probability','n',{key:'seed',label:'試行列の番号（seed）',help:'同じ番号なら同じ試行列を再現します。確率と回数を固定して番号だけ変えると、別の試行列を比べられます。'}],{},{showDerivation:true})")
replace('src/experiences-foundations.js',"advance:'親子の条件を一つ確認する'","advance:'次の値の挿入結果を見る'")
replace('src/experiences-foundations.js','子より大きな親があれば入れ替えます。木と配列の位置がどう対応するかも見てください。','子より大きな親があれば入れ替えます。この画面の一段階は一つの値を挿入し終えた結果です。内部では複数の親子比較が必要な場合があります。木と配列の位置も対応させてください。')
replace('src/experiences-systems.js',"advance:'次のサイクルを見る'","advance:'次の命令の投入結果を見る'")
replace('src/experiences-systems.js','一つの命令は必要な工程を全て通ります。工程を省いて速くするのではなく、別々の命令の違う工程を同時に行います。','一つの命令は必要な工程を全て通ります。別々の命令の違う工程を同時に行います。この画面の一段階は命令を一つ加えたスケジュールであり、一サイクルだけ時間を進めた状態ではありません。')
lesson('src/experiences-systems.js','c12-race',"X.define('c12-race','足し算を二つ実行しても、両方の増分が残るとは限りません。',[C('objects','誰の古い値で上書きしたか','100に10と20を足す二つの処理を終えても、130にならないのはなぜでしょうか。','Aが10、Bが20を共有値100へ加えます。ロックなしでは両者を先に読むまで進め、古い値で上書きする結果を確かめます。次にロック付きで、もう一方が読む前に待つことを比較してください。',[A('race','読取り・計算・書込みを別々に実行')])]);")
replace('src/experiences-objects.js',"Array.from({length:8},(_,i)=>((value>>(7-i))&1)?2**(7-i):null).filter(x=>x!==null).join(' + ')","(Array.from({length:8},(_,i)=>((value>>(7-i))&1)?2**(7-i):null).filter(x=>x!==null).join(' + ')||'0')")
replace('src/experiences-objects.js','value=0;other=0;paint();','value=0;other=0;paint();root.querySelector(\'[data-bit-zero]\')?.focus({preventScroll:true});')
replace('src/experiences-objects.js','value=255;paint();','value=255;paint();root.querySelector(\'[data-bit-all]\')?.focus({preventScroll:true});')
p=Path('src/experiences-objects.js'); s=p.read_text(); start=s.index("X.registerWidget('race',"); end=s.index("X.registerWidget('objects',",start); part=s[start:end]
old='<p class="ex-counterexample">AとBを両方「読む」まで進めると、二人とも100を覚えます。その後の書込みは加算ではなく、自分の作業用の値による置換です。</p>'
new='<p class="ex-counterexample" data-race-mode-note>${state.lock?\'ロックは読取り・計算・書込みの全体を守ります。保持者でない処理は読む前に待機し、解放された後に更新済みの共有値を読みます。\':\'AとBを両方「読む」まで進めると、二人とも100を覚えます。その後の書込みは加算ではなく、自分の作業用の値による置換です。\'}</p>'
assert part.count(old)==1; part=part.replace(old,new)
assert part.count('c.completed.add(s.id);')==1
part=part.replace('c.completed.add(s.id);','root.dataset.raceState=JSON.stringify(state);c.completed.add(s.id);')
old="s.on(root,'click',e=>{const actor=e.target.closest('[data-race-actor]'),r=e.target.closest('[data-race-reset]');if(actor){state=X.models.race(state,actor.dataset.raceActor);paint();}if(r)reset(r.dataset.raceReset==='true');});reset(false);"
new="""s.on(root,'click',e=>{
 const actor=e.target.closest('[data-race-actor]'),r=e.target.closest('[data-race-reset]');let selector;
 if(actor){const name=actor.dataset.raceActor;state=X.models.race(state,name);paint();selector='[data-race-actor="'+name+'"]';}
 else if(r){const mode=r.dataset.raceReset;reset(mode==='true');selector='[data-race-reset="'+mode+'"]';}
 if(selector){let target=root.querySelector(selector);if(target?.disabled)target=root.querySelector('[data-race-actor]:not(:disabled)')||root.querySelector('[data-race-reset="'+state.lock+'"]');target?.focus({preventScroll:true});}
});reset(false);"""
assert part.count(old)==1; part=part.replace(old,new); p.write_text(s[:start]+part+s[end:])
replace('src/experiences-foundation-review-widgets.js',' class="ex-fr-bit-button"','')
replace('tests/foundation-review-browser.mjs',"assert.match(await page.locator('[data-ex-frame]').textContent(),/命令 2 を投入/)","assert.match(await page.locator('[data-ex-kind=timeline] [data-ex-frame]').textContent(),/命令 2 を投入/)")
replace('tests/authored-result-values-browser.mjs',"async function open(page,id){await page.goto(base+'#/lab/'+id);await ready(page,id);}","async function open(page,id,chapter=''){await page.goto(base+'#/lab/'+id+(chapter?'?chapter='+chapter:''));await ready(page,id);}")
replace('tests/authored-result-values-browser.mjs',"await open(page,'c03-integral');","await open(page,'c03-integral','calculation');")
replace('tests/authored-result-values-browser.mjs',"await open(page,'c01-hamming');","await open(page,'c01-hamming','calculation');")
print('Prepared eight reviewed fixes; no commit or remote ref changed by this script.')
