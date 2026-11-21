// Loads the real search engine out of index.html and runs it in Node.
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const a=html.indexOf('/* ============ helpers'), b=html.indexOf('/* ============ UI state');
const code=html.slice(a,b);
const GLo={docs:[],meta:{}};const sandbox={GL:GLo,window:{GL:GLo},localStorage:{getItem(){return null},setItem(){}},performance,console,atob};
vm.createContext(sandbox);
for(const f of ['fannie','fha','curated','semantic'].filter(f=>fs.existsSync(path.join(root,'data',f+'.js')))) vm.runInContext(fs.readFileSync(path.join(root,'data',f+'.js'),'utf8'),sandbox);
let t0=performance.now();
vm.runInContext('"use strict";'+code+';this.__api={run,build,D,N,suggestWord,tok,bestAnswer,terms,post,vocab:()=>vocab,setSemW:(w)=>{SEM_W=w},semLoad};build();',sandbox);
module.exports=Object.assign({buildMs:performance.now()-t0},sandbox.__api);
