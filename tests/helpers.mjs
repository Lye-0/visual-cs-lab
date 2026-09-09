for(const name of ['core','network','foundations','security','git','missions','catalog','extensions','learning','pedagogy','player','visuals'])await import(`../src/${name}.js`);
export const L=globalThis.CSL;
export const lab=id=>L.labs.find(l=>l.id===id);
export const run=(id,params={})=>L.run(lab(id),{...lab(id).defaults,...params});
export const last=r=>r.frames.at(-1);
export const gitState=r=>last(r).visual.state;
