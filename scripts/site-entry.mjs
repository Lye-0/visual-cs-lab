// Static publishing entry. Keep the source files themselves as the public assets.
// No bundling, remote CDNs, eval, dynamic imports or runtime dependency resolution.
import {browserModules,styles} from './modules.mjs';
export const publishedAssets=[...styles.map(n=>`src/${n}.css`),...browserModules.map(n=>`src/${n}.js`),'assets/favicon.svg'];
export const contentSecurityPolicy="default-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
// Git on Windows may check text out as CRLF. Ignore only that transport-level
// difference, not text, markup, attributes or asset order; --check never writes.
export function indexMatches(actual,expected=renderIndex()){
 return actual.replace(/\r\n/g,'\n')===expected.replace(/\r\n/g,'\n');
}
export function renderIndex(){
 for(const name of [...styles,...browserModules])if(!/^[a-z0-9-]+$/.test(name))throw Error('Invalid asset name: '+name);
 return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0b0e13">
  <meta name="color-scheme" content="dark">
  <meta name="description" content="小さな例を読み、図で確かめ、条件を変えて理解する。情報科学・ネットワーク・セキュリティのインタラクティブ解説。">
  <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}">
  <title>Visual CS Lab</title>
  <link rel="icon" href="./assets/favicon.svg" type="image/svg+xml">
  <!-- Ordered styles: the same files are edited, tested and published. -->
${styles.map(n=>`  <link rel="stylesheet" href="./src/${n}.css">`).join('\n')}
  <!-- Classic defer scripts execute in this order, before DOMContentLoaded. -->
${browserModules.map(n=>`  <script defer src="./src/${n}.js"></script>`).join('\n')}
</head>
<body>
  <div id="app"></div>
  <noscript>この実験室にはJavaScriptが必要です。ブラウザのJavaScriptを有効にしてください。</noscript>
</body>
</html>
`;
}
