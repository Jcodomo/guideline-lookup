// autocomplete-style timing: prefix-search on every keystroke of realistic queries
const E=require('./harness.js'); const all=new Set(['Fannie','Freddie','FHA','VA','Other']);
const qs=["self employed income two years","borrower just started a new job","fha second loan","va funding fee exempt","large deposit sourcing","manufactured home foundation"];
let worst=0,tot=0,n=0;
for(const q of qs){ for(let i=1;i<=q.length;i++){ const t=performance.now(); E.run(q.slice(0,i),all,{prefix:true}); const ms=performance.now()-t; worst=Math.max(worst,ms); tot+=ms; n++; } }
console.log(`per-keystroke search: ${n} keystrokes, avg ${(tot/n).toFixed(2)}ms, worst ${worst.toFixed(1)}ms`);
