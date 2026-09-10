/* Shared bounded algorithms. Deliberately no eval, Function, network or storage. */
(() => {
'use strict';
const K=CSL.curriculum;
K.lex=source=>{
 const text=String(source);if(text.length>8000)throw Error('教材の入力は8000文字以内にしてください。');
 const tokens=[];let i=0,line=1;
 while(i<text.length){const c=text[i];if(/\s/.test(c)){if(c==='\n')line++;i++;continue;}if(text.startsWith('//',i)){while(i<text.length&&text[i]!=='\n')i++;continue;}
  const start=i,ln=line;
  if(/[0-9]/.test(c)||c==='.'&&/[0-9]/.test(text[i+1]||'')){const m=text.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);tokens.push({type:'number',value:Number(m[0]),raw:m[0],line:ln,pos:start});i+=m[0].length;continue;}
  if(/[A-Za-z_]/.test(c)){const m=text.slice(i).match(/^[A-Za-z_][A-Za-z_0-9]*/)[0];tokens.push({type:'id',value:m,raw:m,line:ln,pos:start});i+=m.length;continue;}
  if(c==='"'||c==="'"){const quote=c;let value='',closed=false;i++;while(i<text.length){let ch=text[i++];if(ch===quote){closed=true;break;}if(ch==='\\'){if(i>=text.length)break;const esc=text[i++];ch=({n:'\n',r:'\r',t:'\t','\\':'\\','"':'"',"'":"'"})[esc];if(ch===undefined)throw Error(`行${line}: 対応していないエスケープです。`);}if(ch==='\n')line++;value+=ch;}if(!closed)throw Error(`行${ln}: 文字列を閉じてください。`);tokens.push({type:'string',value,raw:text.slice(start,i),line:ln,pos:start});continue;}
  const op=['<->','===','!==','=>','->','<=','>=','==','!=','&&','||','**','+=','-=','++','--'].find(op=>text.startsWith(op,i))||c;
  if(!['<->','===','!==','=>','->','<=','>=','==','!=','&&','||','**','+=','-=','++','--','+','-','*','/','%','^','!','<','>','=','(',')','[',']','{','}',',',';',':','?','.'].includes(op))throw Error(`行${line}: 「${c}」は対応していない記号です。`);
  tokens.push({type:'op',value:op,raw:op,line:ln,pos:start});i+=op.length;
 }
 tokens.push({type:'eof',value:'EOF',raw:'',line,pos:i});return tokens;
};
const precedence={'<->':1,'->':2,'||':3,'&&':4,'==':5,'!=':5,'===':5,'!==':5,'<':6,'>':6,'<=':6,'>=':6,'+':7,'-':7,'*':8,'/':8,'%':8,'^':9,'**':9};
K.expressionParser=tokens=>{
 let at=0,depth=0;const peek=()=>tokens[at],take=()=>tokens[at++];
 const expect=value=>{const tok=take();if(tok?.value!==value)throw Error(`行${tok?.line||1}: 「${value}」が必要です。`);return tok;};
 function expr(min=0){if(++depth>80)throw Error('式の入れ子が深すぎます。');let tok=take(),node;
  if(tok.type==='number'||tok.type==='string')node={type:'literal',value:tok.value,line:tok.line};
  else if(tok.type==='id'){node=['true','false'].includes(tok.value)?{type:'literal',value:tok.value==='true',line:tok.line}:{type:'variable',name:tok.value,line:tok.line};}
  else if(['!','-','+'].includes(tok.value))node={type:'unary',op:tok.value,arg:expr(9),line:tok.line};
  else if(tok.value==='('){node=expr();expect(')');}
  else if(tok.value==='['){const values=[];if(peek().value!==']'){do{values.push(expr());if(peek().value!==',')break;take();}while(true);}expect(']');node={type:'array',values,line:tok.line};}
  else throw Error(`行${tok.line}: 値または式が必要です（${tok.value}）。`);
  while(true){if(peek().value==='('){take();const args=[];if(peek().value!==')'){do{args.push(expr());if(peek().value!==',')break;take();}while(true);}expect(')');if(node.type!=='variable')throw Error('呼出し先は関数名で指定してください。');node={type:'call',name:node.name,args,line:node.line};continue;}
   if(peek().value==='['){take();const index=expr();expect(']');node={type:'index',object:node,index,line:node.line};continue;}
   const op=peek().value,p=precedence[op];if(p===undefined||p<min)break;take();const right=expr(p+(['^','**','->'].includes(op)?0:1));node={type:'binary',op,left:node,right,line:node.line};
  }depth--;return node;
 }
 return {parse:expr,peek,take,expect,get index(){return at;},set index(value){at=value;}};
};
K.parseExpr=source=>{const tokens=K.lex(String(source).replace(/¬/g,'!').replace(/∧/g,'&&').replace(/∨/g,'||').replace(/→/g,'->').replace(/↔/g,'<->')),p=K.expressionParser(tokens),ast=p.parse();if(p.peek().type!=='eof')throw Error(`式の後に余分な記号があります: ${p.peek().value}`);return {ast,tokens};};
K.evalExpr=(ast,env=Object.create(null),functions=Object.create(null),budget={left:5000})=>{
 if(--budget.left<0)throw Error('式の計算回数が教材の上限を超えました。');const ev=node=>K.evalExpr(node,env,functions,budget);
 if(ast.type==='literal')return ast.value;
 if(ast.type==='variable'){if(!Object.hasOwn(env,ast.name))throw Error('未定義の変数: '+ast.name);return env[ast.name];}
 if(ast.type==='array')return ast.values.map(ev);
 if(ast.type==='index'){const a=ev(ast.object),i=ev(ast.index);if(!Array.isArray(a)&&typeof a!=='string')throw Error('配列または文字列を指定してください。');if(!Number.isInteger(i)||i<0||i>=a.length)throw Error('添字が配列・文字列の範囲外です。');return a[i];}
 if(ast.type==='call'){const builtins={abs:Math.abs,sqrt:Math.sqrt,sin:Math.sin,cos:Math.cos,exp:Math.exp,log:Math.log,min:Math.min,max:Math.max,pow:Math.pow,len:x=>x.length};const args=ast.args.map(ev);if(Object.hasOwn(functions,ast.name))return functions[ast.name](...args);if(Object.hasOwn(builtins,ast.name)){const value=builtins[ast.name](...args);if(typeof value==='number'&&!Number.isFinite(value))throw Error('関数の入力が定義域を外れています。');return value;}throw Error('この教材で未定義の関数: '+ast.name);}
 if(ast.type==='unary'){const value=ev(ast.arg);if(ast.op==='!')return !value;if(typeof value!=='number')throw Error('符号の操作には数値が必要です。');return ast.op==='-'?-value:value;}
 const a=ev(ast.left);if(ast.op==='&&')return Boolean(a)&&Boolean(ev(ast.right));if(ast.op==='||')return Boolean(a)||Boolean(ev(ast.right));if(ast.op==='->')return !a||Boolean(ev(ast.right));const z=ev(ast.right);
 if(ast.op==='<->')return Boolean(a)===Boolean(z);if(['==','==='].includes(ast.op))return a===z;if(['!=','!=='].includes(ast.op))return a!==z;
 if(['<','<=','>','>='].includes(ast.op)){if(typeof a!==typeof z)throw Error('比較する型をそろえてください。');return ast.op==='<'?a<z:ast.op==='<='?a<=z:ast.op==='>'?a>z:a>=z;}
 if(ast.op==='+'&&typeof a==='string'&&typeof z==='string')return a+z;
 if(typeof a!=='number'||typeof z!=='number')throw Error('数値演算の型が一致しません。');
 let value=ast.op==='+'?a+z:ast.op==='-'?a-z:ast.op==='*'?a*z:ast.op==='/'?a/z:ast.op==='%'?a%z:a**z;
 if(!Number.isFinite(value))throw Error('0除算または数値の表現範囲を超えました。');return value;
};
K.exprVariables=ast=>{const names=new Set();function visit(n){if(n.type==='variable')names.add(n.name);for(const value of Object.values(n)){if(Array.isArray(value))value.forEach(v=>{if(v&&typeof v==='object')visit(v);});else if(value&&typeof value==='object')visit(value);}}visit(ast);return [...names].sort();};
K.astTree=ast=>({label:ast.type==='binary'||ast.type==='unary'?ast.op:ast.type==='literal'?JSON.stringify(ast.value):ast.name||ast.type,children:ast.type==='binary'?[K.astTree(ast.left),K.astTree(ast.right)]:ast.type==='unary'?[K.astTree(ast.arg)]:ast.type==='call'?ast.args.map(K.astTree):ast.type==='array'?ast.values.map(K.astTree):ast.type==='index'?[K.astTree(ast.object),K.astTree(ast.index)]:[]});
K.graphInput=(source,directed=false)=>{const lines=String(source).trim().split(/[;\n]+/).filter(x=>x.trim());if(lines.length>40)throw Error('辺は40本以内にしてください。');const edges=[],names=new Set();for(const line of lines){const parts=line.trim().split(/[\s,]+/);if(parts.length<1||parts.length>3||parts.some((x,i)=>i<2&&!/^[A-Za-z0-9_]{1,12}$/.test(x)))throw Error('辺は A B 3 のように記述してください。単独の頂点も1行で指定できます。');names.add(parts[0]);if(parts.length===1)continue;names.add(parts[1]);const w=parts.length===3?Number(parts[2]):1;if(!Number.isFinite(w)||Math.abs(w)>100)throw Error('辺の重みは−100〜100です。');edges.push({a:parts[0],b:parts[1],cost:w});}if(names.size<1||names.size>12)throw Error('頂点数は1〜12個です。');return {nodes:[...names],edges,directed};};
K.graphVisual=(graph,extra={})=>K.graph(graph.nodes.map(id=>({id,label:id})),graph.edges.map((e,i)=>({from:e.a,to:e.b,label:e.cost,id:String(i)})),{directed:graph.directed,...extra});
K.uf=n=>{const parent=Array.from({length:n},(_,i)=>i),rank=Array(n).fill(0);function find(x){if(parent[x]!==x)parent[x]=find(parent[x]);return parent[x];}return {parent,rank,find,union(a,b){let x=find(a),y=find(b);if(x===y)return false;if(rank[x]<rank[y])[x,y]=[y,x];parent[y]=x;if(rank[x]===rank[y])rank[x]++;return true;}};};
K.topological=graph=>{const degree=Object.fromEntries(graph.nodes.map(id=>[id,0]));for(const e of graph.edges)degree[e.b]++;const queue=graph.nodes.filter(id=>degree[id]===0).sort(),order=[],trace=[];while(queue.length){const u=queue.shift();order.push(u);for(const e of graph.edges.filter(e=>e.a===u))if(--degree[e.b]===0)queue.push(e.b);queue.sort();trace.push({u,order:order.slice(),queue:queue.slice(),degree:{...degree}});}return {order,trace,cycle:order.length!==graph.nodes.length};};
K.scc=graph=>{let clock=0;const index={},low={},stack=[],inStack=new Set(),components=[];function visit(v){index[v]=low[v]=clock++;stack.push(v);inStack.add(v);for(const e of graph.edges.filter(e=>e.a===v)){const w=e.b;if(index[w]===undefined){visit(w);low[v]=Math.min(low[v],low[w]);}else if(inStack.has(w))low[v]=Math.min(low[v],index[w]);}if(low[v]===index[v]){const c=[];let w;do{w=stack.pop();inStack.delete(w);c.push(w);}while(w!==v);components.push(c);}}for(const v of graph.nodes)if(index[v]===undefined)visit(v);return components;};
})();
