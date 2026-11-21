// Tries meaning-search weights over the 515 searches: node test/sweep.js 0 0.3 0.5
const E = require('./harness.js'), fs = require('fs'), all = new Set(['Fannie', 'Freddie', 'FHA', 'VA', 'Other']);
const cases = JSON.parse(fs.readFileSync(__dirname + '/cases500.json', 'utf8'));
const norm = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
for (const w of process.argv.slice(2).map(Number)) {
  E.setSemW(w); let ok = 0, rr = 0; const kinds = {};
  for (const c of cases) {
    const r = E.run(c.q, all, { prefix: true }), top = r.res.slice(0, 10).map(([i]) => E.D[i]); let rank = 0;
    for (let k = 0; k < top.length && !rank; k++) { const d = top[k]; if (c.title) { if (norm(d.t).includes(norm(c.title))) rank = k + 1; } else { const h = ((d.s || '') + ' ' + d.t + ' ' + (d.x || '').slice(0, 4000)).toLowerCase(); if (c.any.some((m) => h.includes(m.toLowerCase()))) rank = k + 1; } }
    const K = kinds[c.kind] || (kinds[c.kind] = { ok: 0, n: 0, rr: 0 }); K.n++; if (rank) { K.rr += 1 / rank; rr += 1 / rank; } if (rank && rank <= (c.n || 5)) { K.ok++; ok++; }
  }
  console.log('weight', w, 'found', ok + '/' + cases.length, 'MRR', (rr / cases.length).toFixed(3), '|', Object.entries(kinds).map(([k, v]) => `${k} ${v.ok}/${v.n} ${(v.rr / v.n).toFixed(2)}`).join(', '));
}
