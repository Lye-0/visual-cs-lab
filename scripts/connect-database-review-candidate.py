# One bounded authoring step. This script is not part of tests or the site.
from pathlib import Path
import subprocess
expected={'scripts/modules.mjs':'37d33405b6c93750d601a7dd9efea6126a3b6e9e','src/experiences-systems.js':'0ed3ac848df696b68ad4425c5cb9026eea9ed569','src/foundations.js':'1152c238a709ac27375b7680df8a946efa92292b'}
for path,sha in expected.items():
    actual=subprocess.check_output(['git','hash-object',path],text=True).strip()
    assert actual==sha,('reviewed source changed',path,actual)
def replace(path,old,new):
    p=Path(path);s=p.read_text();assert s.count(old)==1,(path,old);p.write_text(s.replace(old,new,1))
replace('scripts/modules.mjs','"experiences-multivariable-models"];','"experiences-multivariable-models","experiences-database-review"];')
replace('scripts/modules.mjs','"experiences-multivariable-widgets"];','"experiences-multivariable-widgets","experiences-database-review-widgets"];')
replace('scripts/modules.mjs','"experiences-multivariable","scrollbars"];','"experiences-multivariable","experiences-database-review","scrollbars"];')
p=Path('src/experiences-systems.js');s=p.read_text()
lessons=[
('c14-index','同じ行への二つの道','索引項目と元の行を対応させ、開始位置を探す費用も分けて読みます。','索引は元の表のどの行を指しているのでしょうか。','ageが21以上の行を、索引から探す場合と全表を走査する場合で比較します。未確認の行を先に結果へ出さず、いま調べた場所と得られた行を対応させてください。','index-correspondence','索引項目と元の行を選んで調べる'),
('c14-join','出力行は、どの組からできたか','元の二表・結合条件・出力の出所を同時に読みます。','一つの左行から、0行・1行・2行の出力ができるのはなぜでしょうか。','左の行を選び、右のどの行と一致するかを見ます。INNERとLEFTを切り替え、出力行から元の二行へ戻ってください。NULLの比較例では、元からあるNULLと相手がなく補われたNULLも分けます。','join-provenance','元の行と出力の出所を対応させる'),
('c14-bplus','親の案内と葉のデータを分ける','同じ数字が二か所にあっても、その二つの役割は同じとは限りません。','葉を分けた後、キー10はなぜ根と葉の両方にあるのでしょうか。','分割例を作り、木のキーを選んで探索の道と葉のデータを対応させます。一回の操作は一回の挿入後の状態です。過去の記録を選んで、分割前後を比較できます。','bplus-routing','木のキーと探索の道を選んで読む'),
('c14-transaction','読む・計算する・書く・確定する','未確定の書込みと確定残高、まだ読んでいない値を分けます。','100に20を入金し10を出金したのに、確定残高が110にならないのはなぜでしょうか。','AとBのSELECT・アプリ側の計算・UPDATE・COMMITを別々に進めてください。読み始める前からロックした場合と比べ、相手がいつ読めるかを調べます。','transaction-order','処理順を選び、確定値と未確定値を追う')]
for id,title,lead,question,body,kind,activity in lessons:
    lines=[line for line in s.splitlines() if line.startswith("d('"+id+"',")];assert len(lines)==1,id
    old=lines[0];at=old.index('[A(');end=old.rfind(']);');acts=old[at:end+1]
    new="X.define('%s','%s',[C('objects','%s','%s','%s',[A('%s','%s')]),C('calculation','従来の計算記録','固定した条件で結果を比較するには？','最初の章で元の行や処理を選んだ後、条件を固定した計算記録も確認します。',%s)]);"%(id,lead,title,question,body,kind,activity,acts)
    s=s.replace(old,new,1)
p.write_text(s)
replace('src/experiences-database-review.js','s.committed=actor.pending;s.owner=null;','s.committed=actor.pending;actor.pending=null;s.owner=null;')
p=Path('src/foundations.js');s=p.read_text();start=s.index("R('transaction',");end=s.index("R('btree',",start)
s=s[:start]+"""R('transaction',(p)=>{
 const actors={A:{read:null,local:null,pending:null},B:{read:null,local:null,pending:null}},frames=[];let committed=100;
 const events=p.serial?[['A','read'],['A','calculate'],['A','update'],['A','commit'],['B','read'],['B','calculate'],['B','update'],['B','commit']]:[['A','read'],['B','read'],['A','calculate'],['B','calculate'],['A','update'],['A','commit'],['B','update'],['B','commit']];
 for(const [id,kind] of events){const actor=actors[id],delta=id==='A'?20:-10;let explanation;
  if(kind==='read'){actor.read=committed;explanation=id+'が確定済みの'+committed+'を読みました。まだ読んでいない側は未読です。';}
  if(kind==='calculate'){actor.local=actor.read+delta;explanation='アプリ側で'+actor.read+' + ('+delta+') = '+actor.local+'を計算。確定残高は変わりません。';}
  if(kind==='update'){actor.pending=actor.local;explanation='UPDATEは未確定の値'+actor.pending+'を作ります。この固定例では書込み同士を重ねていません。';}
  if(kind==='commit'){committed=actor.pending;actor.pending=null;explanation=id+'がCOMMITし、確定残高を'+committed+'へ変えました。';}
  const fields=[{label:'balance',values:[committed]},{label:'Aの読取り',values:[actors.A.read===null?'未読':actors.A.read]},{label:'Bの読取り',values:[actors.B.read===null?'未読':actors.B.read]},{label:'Aの未確定書込み',values:[actors.A.pending===null?'なし':actors.A.pending]},{label:'Bの未確定書込み',values:[actors.B.pending===null?'なし':actors.B.pending]}];
  frames.push(F(id+' '+({read:'reads',calculate:'calculates',update:'updates (uncommitted)',commit:'commits'}[kind]),explanation,{type:'cells',rows:fields},{balance:committed}));
 }
 return out(frames,{'最終残高':committed,'意図した残高':110,'更新消失':committed===110?'なし':'あり'},'アプリで読んだ値から計算した定数を書き戻す例です。未読・計算結果・未確定書込み・確定残高を区別します。');
});
"""+s[end:];p.write_text(s)
# The old captured GAP-006 screen shows identical names for different chapters.
replace('src/experiences-math.js',"m('jacobian-calculation','小さな変位をどう写すか'","m('jacobian-calculation','ヤコビ行列の計算記録'")
replace('src/experiences-math.js',"m('area-calculation','領域を小さな区画へ分ける'","m('area-calculation','重積分の計算記録'")
# Add a genuine hierarchy alongside the numeric path table, not another flat table only.
p=Path('src/experiences-database-review-widgets.js');s=p.read_text()
old="  const v=D.bplusView(s);\n  const nodes="
new="""  const v=D.bplusView(s);
  const treeNode=(n,path)=>'<li><div class="ex-db-tree-node" data-leaf="'+n.leaf+'" data-on-route="'+v.route.some(r=>r.path===path)+'"><small>'+h(n.leaf?'葉：データ':'内部：案内')+'</small>'+n.label.split('|').map(t=>Number(t.trim())).map(k=>b(String(k),'key:'+k,'aria-label="'+h(nodeName(path))+'のキー'+k+'" aria-pressed="'+(s.key===k)+'"')).join('')+'</div>'+(n.children?'<ul>'+n.children.map((child,i)=>treeNode(child,path+'-'+i)).join('')+'</ul>':'')+'</li>';
  const tree=v.root?'<div class="ex-db-tree" data-sec-view="bplus-tree" role="region" tabindex="0" aria-label="B+木の階層図。内部の案内と葉のデータ"><ul>'+treeNode(v.root,'root')+'</ul></div>':p('まだ木は空です。');
  const nodes="""
assert s.count(old)==1;s=s.replace(old,new)
s=s.replace("   nodes+box('キー'+s.key+'を探す道'","   box('木を選んで、同じ数字の役割を比べる',tree)+nodes+box('キー'+s.key+'を探す道'")
p.write_text(s)
print('Connected four database workspaces and clarified two chapter labels.')
