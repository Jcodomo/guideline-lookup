// Loads the real search engine out of index.html and runs it in Node.
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const a=html.indexOf('/* ============ helpers'), b=html.indexOf('/* ============ UI state');
const code=html.slice(a,b);
const GLo={docs:[],meta:{}};const sandbox={GL:GLo,window:{GL:GLo},localStorage:{getItem(){return null},setItem(){}},performance,console,atob};
vm.createContext(sandbox);
const MINI_ON=process.env.GL_MINI!=='0';
for(const f of ['fannie','fha','curated','semantic'].concat(MINI_ON?['minilm'+(process.env.GL_MINI_SUFFIX||'')]:[]).filter(f=>fs.existsSync(path.join(root,'data',f+'.js')))) vm.runInContext(fs.readFileSync(path.join(root,'data',f+'.js'),'utf8'),sandbox);
let t0=performance.now();
vm.runInContext('"use strict";'+code+';this.__api={run,build,D,N,suggestWord,tok,bestAnswer,terms,post,vocab:()=>vocab,setSemW:(w)=>{SEM_W=w},semLoad,setMini:(o)=>{if(o.w!=null)MINI_W=o.w;if(o.w2!=null)MINI_W2=o.w2;if(o.only!=null)MINI_ONLY=o.only;if(o.fl!=null)MINI_FL=o.fl;},QV,qkey,miniText};build();',sandbox);
module.exports=Object.assign({buildMs:performance.now()-t0},sandbox.__api);

// the test searches as the MiniLM model read them (build_minilm.mjs --queries), so Node needs no model
const qf=path.join(root,'data','minilm-queries'+(process.env.GL_MINI_SUFFIX||'')+'.json');
if(MINI_ON&&fs.existsSync(qf)){ const Q=JSON.parse(fs.readFileSync(qf,'utf8')); for(const k in Q) module.exports.QV.set(module.exports.qkey(k),Int8Array.from(Q[k])); }
