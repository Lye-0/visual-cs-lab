# Explicit one-time source repair, never imported by tests or the application.
from pathlib import Path
import subprocess
p=Path('src/experiences-git-review-widgets.js')
assert subprocess.check_output(['git','hash-object',str(p)],text=True).strip()=='9cc9821280607767896f8a0949cd0a8cf351beb3'
s=p.read_text()
def change(old,new):
 global s
 assert s.count(old)==1,old
 s=s.replace(old,new,1)
change('<circle cx="${x}" cy="${y}" r="10"/><text x="234"','<rect class="ex-git-hit" x="20" y="${y-22}" width="550" height="44" rx="7"/><circle cx="${x}" cy="${y}" r="10"/><text x="${x+24}"')
change("</svg></div>`+p('線の矢印", "</svg></div><p class=\"ex-git-scroll-help\">図が入りきらない場合は、枠の中を横へスクロールできます。</p>`+p('線の矢印")
change("box('作業ファイルを編集',field('content'", "box('1　作業ファイル / worktree',files(s.repo.work)+field('content'")
change("b('作業内容だけを変更','edit'))", "b('作業内容だけを変更','edit')+p('入力欄は下書きです。ボタンを押すと上の作業内容へ反映します。'))")
change("box('次のコミットへ選ぶ',p('対象：'+s.file)","box('2　次に保存する内容 / index',files(s.repo.index)+p('対象：'+s.file)")
change("box('ステージをコミット',field('message'", "box('3　保存済み / HEAD',p('HEAD → '+(s.repo.head||'detached')+' → '+G.oid(s.repo))+files(s.repo.objects[G.oid(s.repo)].tree)+field('message'")
change(' triple(s.repo)+`<div class="ex-git-two">',' `<div class="ex-git-two">')
change('右の観測用パネルは実験者向けで','「相手側の実際のmain」パネルは実験者向けで')
change('reduce:Q.reduce,instruction:scopes,',"reduce:Q.reduce,instruction:'教材内の仮想Gitです。実ファイルやGitHubは変更しません。',")
change('renderers[lesson](s,field,token)});','renderers[lesson](s,field,token)+`<details class="ex-git-details" data-sec-view="git-scope"><summary>この仮想Gitで扱う範囲</summary>${p(scopes)}</details>`});')
p.write_text(s)
p=Path('src/experiences-git-review.css')
assert subprocess.check_output(['git','hash-object',str(p)],text=True).strip()=='0b27b714ccfe8a2d54eff31831f131837dc0577d'
p.write_text(p.read_text()+'''
/* The whole visible commit row is a target; blank space inside g must work. */
.ex-git-node .ex-git-hit{fill:transparent;stroke:none;pointer-events:all}
.ex-git-node:hover .ex-git-hit,.ex-git-node:focus .ex-git-hit{fill:#20333f;fill-opacity:.6}
.ex-git-scroll-help{display:none}
@media(max-width:760px){.ex-git-scroll-help{display:block;color:#b7cbd9;font-size:.8rem;line-height:1.7}}
''')
