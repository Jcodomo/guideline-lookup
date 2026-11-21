// Runs the 500+ searches in cases500.json through the real engine (loaded out of index.html) and reports, per kind of
// search: found in the top results, found in the top 3, mean reciprocal rank (1 = always first), and time per search.
// Run: node test/run500.js [path to another index.html to compare]   (--fails lists what was missed)
const path = require('path'), fs = require('fs');
const harnessFor = (dir) => { const h = path.join(dir, 'test', 'harness.js'); delete require.cache[require.resolve(h)]; return require(h); };
const all = new Set(['Fannie', 'Freddie', 'FHA', 'VA', 'Other']);
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases500.json'), 'utf8'));
const norm = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
function score(E, label) {
  const kinds = {}, times = [], fails = [];
  for (const c of cases) {
    const t = performance.now(), r = E.run(c.q, all, { prefix: true }), ms = performance.now() - t; times.push(ms);
    const top = r.res.slice(0, 10).map(([i]) => E.D[i]);
    let rank = 0;
    for (let k = 0; k < top.length && !rank; k++) {
      const d = top[k];
      if (c.title) { if (norm(d.t).includes(norm(c.title))) rank = k + 1; }
      else { const h = ((d.s || '') + ' ' + d.t + ' ' + (d.x || '').slice(0, 4000)).toLowerCase(); if (c.any.some((m) => h.includes(m.toLowerCase()))) rank = k + 1; }
    }
    const want = c.n || 5, ok = rank && rank <= want;
    const K = kinds[c.kind] || (kinds[c.kind] = { n: 0, ok: 0, top3: 0, rr: 0 });
    K.n++; if (ok) K.ok++; if (rank && rank <= 3) K.top3++; if (rank) K.rr += 1 / rank;
    if (!ok) fails.push({ kind: c.kind, q: c.q, want: c.title || c.any.join(' | '), got: top.slice(0, 3).map((d) => (d.a + ' ' + (d.s || '') + ' ' + d.t).slice(0, 70)) });
  }
  times.sort((a, b) => a - b);
  const tot = Object.values(kinds).reduce((s, k) => ({ n: s.n + k.n, ok: s.ok + k.ok, top3: s.top3 + k.top3, rr: s.rr + k.rr }), { n: 0, ok: 0, top3: 0, rr: 0 });
  console.log(`\n${label}: build ${E.buildMs.toFixed(0)} ms`);
  for (const [k, v] of Object.entries(kinds)) console.log(`  ${k.padEnd(20)} ${String(v.ok).padStart(3)}/${String(v.n).padEnd(3)} found   top3 ${String(v.top3).padStart(3)}   MRR ${(v.rr / v.n).toFixed(3)}`);
  console.log(`  ${'ALL'.padEnd(20)} ${tot.ok}/${tot.n} found (${(100 * tot.ok / tot.n).toFixed(1)}%)   top3 ${tot.top3}   MRR ${(tot.rr / tot.n).toFixed(3)}   p50 ${times[times.length >> 1].toFixed(1)} ms   p95 ${times[Math.floor(times.length * 0.95)].toFixed(1)} ms   max ${times[times.length - 1].toFixed(1)} ms`);
  return { tot, fails };
}
const other = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (other) score(harnessFor(path.dirname(path.resolve(other))), 'BEFORE (' + other + ')');
const now = score(harnessFor(path.join(__dirname, '..')), 'NOW');
if (process.argv.includes('--fails')) for (const f of now.fails) console.log(`\nMISS [${f.kind}] ${f.q}\n  want ${f.want}\n  got  ${f.got.join('\n       ')}`);
module.exports = { score };
