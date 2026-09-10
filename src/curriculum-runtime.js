/* A small teaching language, not JavaScript execution.
 * Inputs are parsed to our AST. No eval, Function, filesystem, network or DOM.
 * Every run has fresh environments, heap IDs, input and output; all loops/calls
 * have explicit work limits. The same AST is reused in compiler lessons.
 */
(() => {
'use strict';
const L=CSL,K=L.curriculum;
function parse(source){
 const parser=K.expressionParser(K.lex(source)),peek=parser.peek,take=parser.take,expect=parser.expect;
 const identifier=()=>{const token=take();if(token.type!=='id'||['let','const','fn','function','if','else','while','for','return','break','continue','throw','try','catch','finally','true','false','null'].includes(token.value))throw Error(`行${token.line}: 名前が必要です。`);return token.value;};
 const optionalType=()=>{if(peek().value!==':')return null;take();let name=identifier();if(peek().value==='['){take();expect(']');name+='[]';}return name;};
 function block(){expect('{');const statements=[];while(peek().value!=='}'){if(peek().type==='eof')throw Error('ブロックの } が必要です。');statements.push(statement());}expect('}');return {type:'block',statements,line:statements[0]?.line||peek().line};}
 function simple(semicolon=true){
  const start=peek();let node;
  if(['let','const'].includes(start.value)){take();const name=identifier(),declaredType=optionalType();expect('=');node={type:'declare',name,declaredType,constant:start.value==='const',value:parser.parse(),line:start.line};}
  else{
   const left=parser.parse(),op=peek().value;
   if(['=','+=','-=','++','--'].includes(op)){take();if(!['variable','index'].includes(left.type))throw Error(`行${start.line}: 代入先は変数か配列要素です。`);node={type:'assign',target:left,op,value:['++','--'].includes(op)?{type:'literal',value:1,line:start.line}:parser.parse(),line:start.line};}
   else node={type:'expression',expression:left,line:start.line};
  }
  if(semicolon)expect(';');return node;
 }
 function statement(){
  const token=peek(),line=token.line;
  if(token.value==='{')return block();
  if(['fn','function'].includes(token.value)){take();const name=identifier(),params=[],types=[];expect('(');if(peek().value!==')')do{params.push(identifier());types.push(optionalType());if(peek().value!==',')break;take();}while(true);expect(')');const returnType=optionalType(),body=block();if(new Set(params).size!==params.length)throw Error('仮引数名が重複しています。');return {type:'function',name,params,types,returnType,body,line};}
  if(token.value==='if'){take();expect('(');const condition=parser.parse();expect(')');const yes=statement();let no=null;if(peek().value==='else'){take();no=statement();}return {type:'if',condition,yes,no,line};}
  if(token.value==='while'){take();expect('(');const condition=parser.parse();expect(')');return {type:'while',condition,body:statement(),line};}
  if(token.value==='for'){take();expect('(');let init=null;if(peek().value!==';')init=simple(false);expect(';');const condition=peek().value===';'?{type:'literal',value:true,line}:parser.parse();expect(';');let update=null;if(peek().value!==')')update=simple(false);expect(')');return {type:'for',init,condition,update,body:statement(),line};}
  if(['return','throw'].includes(token.value)){take();const value=peek().value===';'?{type:'literal',value:null,line}:parser.parse();expect(';');return {type:token.value,value,line};}
  if(['break','continue'].includes(token.value)){take();expect(';');return {type:token.value,line};}
  if(token.value==='try'){take();const body=block();let handler=null,finallyBlock=null,name='error';if(peek().value==='catch'){take();expect('(');name=identifier();expect(')');handler=block();}if(peek().value==='finally'){take();finallyBlock=block();}if(!handler&&!finallyBlock)throw Error('tryにはcatchまたはfinallyを付けてください。');return {type:'try',body,handler,finallyBlock,name,line};}
  return simple();
 }
 const statements=[];while(peek().type!=='eof')statements.push(statement());return {type:'program',statements,source:String(source)};
}
function execute(source,{inputs=[],maxSteps=400,maxDepth=12,checkTypes=false}={}){
 const program=typeof source==='string'?parse(source):source,lines=program.source.split('\n'),frames=[],events=[],output=[],input=inputs.slice(),budget={left:5000};
 let steps=0,envID=0,heapID=0,depth=0,error=null,returnValue=null;
 const allEnvs=[],active=[],heapIds=new WeakMap(),heapObjects=new Map();
 const newEnv=(parent,label)=>{const env={id:++envID,label,parent,vars:Object.create(null),constants:new Set(),types:Object.create(null)};allEnvs.push(env);return env;};
 const global=newEnv(null,'main');global.vars.null=null;active.push(global);
 const locate=(env,name)=>{for(let e=env;e;e=e.parent)if(Object.hasOwn(e.vars,name))return e;return null;};
 const flatten=env=>{const chain=[];for(let e=env;e;e=e.parent)chain.unshift(e);return Object.assign(Object.create(null),...chain.map(e=>e.vars));};
 function describe(value){
  if(Array.isArray(value)){if(!heapIds.has(value)){const id='A'+(++heapID);heapIds.set(value,id);heapObjects.set(id,value);}return '@'+heapIds.get(value);}
  if(value&&value.kind==='closure')return `関数 ${value.name}（環境${value.environment.id}を参照）`;
  if(value===null)return 'null';return value;
 }
 const actualType=value=>value===null?'null':Array.isArray(value)?'array':value?.kind==='closure'?'function':typeof value;
 function matches(value,type){if(!type||type==='any')return true;if(type.endsWith('[]'))return Array.isArray(value)&&value.every(x=>matches(x,type.slice(0,-2)));return actualType(value)===type;}
 function emit(title,explain,line,env,extra={}){
  const locals=Object.fromEntries(Object.entries(flatten(env)).filter(([name])=>name!=='null').map(([name,value])=>[name,describe(value)]));
  const scopes=active.map(e=>({label:`${e.label} / 環境${e.id}`,values:Object.entries(e.vars).filter(([name])=>name!=='null').map(([name,value])=>`${name} = ${describe(value)}`)}));
  const heap=[...heapObjects].map(([id,array])=>({label:'@'+id,values:array.map(describe)}));
  frames.push(K.f(title,explain,K.code(lines,Math.max(0,(line||1)-1),locals,{scopes,heap,output:output.slice(),...extra}),{'実行した文':steps,'呼出し深さ':depth}));
 }
 const tick=()=>{if(++steps>maxSteps){const e=Error(`実行を${maxSteps}ステップで中断しました。無限ループと断定した結果ではありません。`);e.fatal=true;throw e;}};
 const signal=(flow,value,line)=>({flow,value,line});
 function invoke(fn,args,callEnv,line){
  if(args.length!==fn.params.length)throw Error(`関数${fn.name}は引数${fn.params.length}個です。`);
  if(++depth>maxDepth){depth--;const e=Error(`呼出しの深さが${maxDepth}を超えました。`);e.fatal=true;throw e;}
  const local=newEnv(fn.environment,fn.name+'()');active.push(local);
  fn.params.forEach((name,i)=>{if(checkTypes&&!matches(args[i],fn.types[i]))throw Error(`引数${name}の型が一致しません。`);local.vars[name]=args[i];local.types[name]=fn.types[i];});
  emit(`${fn.name}へ引数を渡す`,'値を仮引数へ渡します。配列の値は参照なので、同じ配列を共有します。',line,local);
  let result=null;
  try{run(fn.body,local,false);}catch(e){if(e.flow==='return')result=e.value;else throw e;}
  finally{active.pop();depth--;}
  if(checkTypes&&!matches(result,fn.returnType))throw Error(`関数${fn.name}の戻り値の型が一致しません。`);
  emit(`${fn.name}から戻る`,'呼出し元の環境と実行位置へ戻ります。戻った環境を参照するクロージャがあれば、その変数は引き続き参照されます。',line,callEnv);
  return result;
 }
 function evaluate(ast,env){
  const values=flatten(env),functions=Object.create(null);
  for(const [name,value]of Object.entries(values))if(value?.kind==='closure')functions[name]=(...args)=>invoke(value,args,env,ast.line);
  const requireArray=a=>{if(!Array.isArray(a))throw Error('配列を指定してください。');return a;};
  Object.assign(functions,{
   print:(...args)=>{output.push(args.map(x=>Array.isArray(x)?JSON.stringify(x):String(x)).join(' '));if(output.length>100)throw Error('出力は100行以内です。');return null;},
   input:()=>{if(!input.length)throw Error('用意した入力が足りません。');return input.shift();},
   push:(array,value)=>{requireArray(array);if(array.length>=128)throw Error('配列は128要素以内です。');array.push(value);return array.length;},
   pop:array=>{requireArray(array);if(!array.length)throw Error('空の配列から取り出せません。');return array.pop();},
   copy:array=>requireArray(array).slice(),
   range:count=>{if(!Number.isInteger(count)||count<0||count>128)throw Error('rangeは0〜128の整数です。');return Array.from({length:count},(_,i)=>i);},
   number:value=>{const n=Number(value);if(!Number.isFinite(n))throw Error('数値へ変換できません。');return n;},
   string:value=>String(value),
   assert:(condition,message='条件を満たしません')=>{if(!condition)throw signal('throw',String(message),ast.line);return true;},
   map:(array,fn)=>{requireArray(array);if(fn?.kind!=='closure')throw Error('mapの第2引数は関数です。');return array.map(value=>invoke(fn,[value],env,ast.line));},
   filter:(array,fn)=>{requireArray(array);if(fn?.kind!=='closure')throw Error('filterの第2引数は関数です。');return array.filter(value=>Boolean(invoke(fn,[value],env,ast.line)));},
   reduce:(array,fn,initial)=>{requireArray(array);if(fn?.kind!=='closure')throw Error('reduceの第2引数は関数です。');return array.reduce((acc,value)=>invoke(fn,[acc,value],env,ast.line),initial);}
  });
  return K.evalExpr(ast,values,functions,budget);
 }
 function assign(target,value,env){
  if(target.type==='variable'){const owner=locate(env,target.name);if(!owner)throw Error('未宣言の変数へ代入できません: '+target.name);if(owner.constants.has(target.name))throw Error('constの変数へ再代入できません: '+target.name);if(checkTypes&&!matches(value,owner.types[target.name]))throw Error('代入する型が一致しません: '+target.name);owner.vars[target.name]=value;return;}
  const array=evaluate(target.object,env),index=evaluate(target.index,env);if(!Array.isArray(array)||!Number.isInteger(index)||index<0||index>=array.length)throw Error('代入する配列の添字が範囲外です。');array[index]=value;
 }
 function run(node,env,scoped=true){
  tick();
  if(node.type==='program'||node.type==='block'){
   const current=node.type==='block'&&scoped?newEnv(env,'block'):env;if(current!==env)active.push(current);
   try{for(const statement of node.statements)run(statement,current);}finally{if(current!==env)active.pop();}return;
  }
  events.push({type:node.type,line:node.line,environment:env.id});
  if(node.type==='function'){if(Object.hasOwn(env.vars,node.name))throw Error('同じ環境に名前が重複しています: '+node.name);env.vars[node.name]={kind:'closure',...node,environment:env};emit(`関数${node.name}を定義`,'本体はまだ実行せず、定義した環境への参照を持つ関数を作ります。',node.line,env);return;}
  if(node.type==='declare'){if(Object.hasOwn(env.vars,node.name))throw Error('同じ環境に変数が重複しています: '+node.name);const value=evaluate(node.value,env);if(checkTypes&&!matches(value,node.declaredType))throw Error(`変数${node.name}の宣言型と値が一致しません。`);env.vars[node.name]=value;env.types[node.name]=node.declaredType;if(node.constant)env.constants.add(node.name);emit(`${node.name}を用意する`,'右辺を計算してから、新しい名前へ値を結び付けます。@付きは配列への参照です。',node.line,env);return;}
  if(node.type==='assign'){let value=evaluate(node.value,env);if(node.op!=='='){const before=evaluate(node.target,env);value=['+=','++'].includes(node.op)?before+value:before-value;if(typeof value==='number'&&!Number.isFinite(value))throw Error('計算値が範囲を超えました。');}assign(node.target,value,env);emit('値を更新する','代入先の環境または配列要素だけを変更します。別名が同じ配列を指す場合は同じ変更が見えます。',node.line,env);return;}
  if(node.type==='expression'){evaluate(node.expression,env);emit('式・呼出しを実行する','式を評価した後の出力と変数を表示しています。',node.line,env);return;}
  if(node.type==='if'){const condition=Boolean(evaluate(node.condition,env));emit(`条件は${condition?'真':'偽'}`,'今回の値によって進む枝を選びます。選ばれなかった枝は実行しません。',node.line,env);if(condition)run(node.yes,env);else if(node.no)run(node.no,env);return;}
  if(node.type==='for'||node.type==='while'){
   const loop=node.type==='for'?newEnv(env,'for'):env;if(loop!==env)active.push(loop);
   try{if(node.init)run(node.init,loop);while(true){tick();const condition=Boolean(evaluate(node.condition,loop));emit(`繰り返しの条件は${condition?'真':'偽'}`,'条件が偽ならループを終了し、その後の処理へ進みます。',node.line,loop);if(!condition)break;let shouldBreak=false;try{run(node.body,loop);}catch(e){if(e.flow==='break')shouldBreak=true;else if(e.flow!=='continue')throw e;}if(shouldBreak)break;if(node.update)run(node.update,loop);}}finally{if(loop!==env)active.pop();}return;
  }
  if(node.type==='return'||node.type==='throw'){const value=evaluate(node.value,env);emit(node.type==='return'?'戻り値を渡す':'例外を送る','通常の次の文へは進まず、呼出し元または対応する処理へ制御を移します。',node.line,env);throw signal(node.type,value,node.line);}
  if(node.type==='break'||node.type==='continue')throw signal(node.type,null,node.line);
  if(node.type==='try'){
   try{run(node.body,env);}catch(e){if(e.fatal||['return','break','continue'].includes(e.flow)||!node.handler)throw e;const handler=newEnv(env,'catch');handler.vars[node.name]=e.flow==='throw'?e.value:e.message;active.push(handler);try{emit('例外を受け取る','対応するcatchで例外を受け取り、通常の処理をここから再開します。',node.line,handler);run(node.handler,handler,false);}finally{active.pop();}}
   finally{if(node.finallyBlock){emit('finallyで後始末する','通常終了・戻り・例外のいずれでも、ここを通ります。実行予算の枯渇時は安全のため中断します。',node.line,env);run(node.finallyBlock,env);}}return;
  }
  throw Error('未対応の文です: '+node.type);
 }
 try{emit('入力と初期環境を準備する','これはブラウザのJavaScriptを実行する機能ではなく、教材用言語のASTを逐次解釈する環境です。',1,global);run(program,global,false);}
 catch(e){if(e.flow==='return')returnValue=e.value;else{error=e.flow==='throw'?String(e.value):e.message||`${e.flow}を置ける範囲を確認してください。`;emit('ここで実行を止めた理由',error,e.line||events.at(-1)?.line||1,active.at(-1)||global,{failed:true});}}
 if(!error)emit('プログラムが終了する','最終的な出力と変数を確認し、入力やコードを変えてもう一度追えます。',lines.length,global);
 return {program,frames,events,output,error,steps,returnValue,variables:Object.fromEntries(Object.entries(global.vars).filter(([name])=>name!=='null').map(([name,value])=>[name,describe(value)])),heap:[...heapObjects].map(([id,array])=>({id,values:array.map(describe)}))};
}
K.runtime={parse,execute};
})();
