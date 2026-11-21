// Search operators: "exact words", -word, in:agency, and that plain searches are unchanged by them.
const E=require('./harness.js'); const all=new Set(['Fannie','Freddie','FHA','VA','Other']);
let n=0,pass=0; const ok=(name,c,info)=>{n++; if(c) pass++; else console.log('FAIL',name,info||'');};
const top=(q,k=10)=>E.run(q,all,{prefix:true}).res.slice(0,k).map(([i])=>E.D[i]);
const text=d=>((d.t||'')+' '+(d.s||'')+' '+(d.x||'')).toLowerCase().replace(/\s+/g,' ');
let r=top('"non-occupant co-borrower"',20); ok('phrase: every result has the exact words', r.length&&r.every(d=>text(d).includes('non-occupant co-borrower')), r.length);
r=top('gift funds in:fha',20); ok('in:fha: only FHA', r.length&&r.every(d=>d.a==='FHA'), r.map(d=>d.a).join());
r=top('gift funds in:fannie',20); ok('in:fannie: only Fannie Mae', r.length&&r.every(d=>d.a==='Fannie'), r.map(d=>d.a).join());
r=top('bankruptcy -chapter',20); ok('-chapter: no result mentions chapter', r.every(d=>!/(^|[^a-z0-9])chapter([^a-z0-9]|$)/.test(text(d))), r.length);
const a=top('self-employed income',5).map(d=>d.t).join('|'), b=top('self-employed income',5).map(d=>d.t).join('|'); ok('plain search is stable', a===b);
r=top('B3-3.1-01',1); ok('section code still opens first', r[0]&&/b3-3\.1-01/i.test(r[0].s||''), r[0]&&r[0].s);
r=top('"this phrase is in no guide at all"',5); ok('unknown phrase finds nothing', r.length===0, r.length);
const t=performance.now(); for(let k=0;k<50;k++) E.run('"gift" funds -letter in:fannie',all,{prefix:true}); const ms=(performance.now()-t)/50;
ok('operators stay fast', ms<40, ms.toFixed(1)+' ms');
console.log(`operators: ${pass}/${n} pass, ${ms.toFixed(1)} ms per search with all three`);
