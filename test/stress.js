const E=require('./harness.js'); const all=new Set(['Fannie','Freddie','FHA','VA','Other']);
console.log('docs',E.N,'vocab',E.vocab().length,'index build ms',E.buildMs.toFixed(0));
const cases=JSON.parse(require('fs').readFileSync(__dirname+'/cases.json','utf8'));
let pass=0,fail=0,times=[],t3=0,mrr=0; const fails=[];
for(const c of cases){
  const t=performance.now(); const r=E.run(c.q,all,{prefix:true}); const ms=performance.now()-t; times.push(ms);
  const top=r.res.slice(0,c.n||5).map(([i,s])=>E.D[i]);
  const hay=top.map(d=>((d.s||'')+' '+d.t+' '+(d.x||'').slice(0,4000)).toLowerCase());
  const ok=c.any.some(m=>{const mm=m.toLowerCase(); return c.field==='title'? top.some(d=>((d.s||'')+' '+d.t).toLowerCase().includes(mm)) : hay.some(h=>h.includes(mm));});
  // strict: body-text match within first 1500 chars of a top-3 doc, rank-weighted
  let rk=0; for(let k=0;k<Math.min(5,top.length);k++){const h=((top[k].s||'')+' '+top[k].t+' '+(top[k].x||'').slice(0,1500)).toLowerCase(); if(c.any.some(m=>h.includes(m.toLowerCase()))){rk=k+1;break;}}
  if(rk&&rk<=3) t3++; if(rk) mrr+=1/rk;
  if(ok) pass++; else {fail++; fails.push({q:c.q,want:c.any,got:top.map(d=>(d.a+' '+(d.s||'')+' '+d.t).slice(0,70))});}
}
times.sort((a,b)=>a-b);
console.log(`pass ${pass}/${cases.length}  p50 ${times[times.length>>1].toFixed(1)}ms  p95 ${times[Math.floor(times.length*.95)].toFixed(1)}ms  max ${times[times.length-1].toFixed(1)}ms`);
console.log(`strict top3 ${t3}/${cases.length}  MRR ${(mrr/cases.length).toFixed(3)}`);
for(const f of fails) console.log('\nFAIL',f.q,'\n  want',f.want.join(' | '),'\n  got ',f.got.join('\n       '));
