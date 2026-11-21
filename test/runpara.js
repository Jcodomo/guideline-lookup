// Everyday questions that mostly avoid the guide's own words (test/paraphrase.json): where meaning search earns its keep.
// Each is run three ways: words only, words + the meaning search learned from the guides (LSA), and words + MiniLM.
// A search passes when a section whose title has one of the expected words is in the top 5.  Run: node test/runpara.js [--fails]
const path = require('path'), fs = require('fs');
const E = require('./harness.js');
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'paraphrase.json'), 'utf8'));
const all = new Set(['Fannie', 'Freddie', 'FHA', 'VA', 'Other']);
const norm = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const saved = new Map(E.QV);
function pass(label, opts, mini) {
  E.QV.clear(); if (mini) for (const [k, v] of saved) E.QV.set(k, v);
  let ok = 0, top3 = 0, rr = 0; const fails = [], times = [];
  for (const c of cases) {
    const t = performance.now(), r = E.run(c.q, all, Object.assign({ prefix: true }, opts)); times.push(performance.now() - t);
    const top = r.res.slice(0, 10).map(([i]) => E.D[i]); let rank = 0;
    for (let k = 0; k < top.length && !rank; k++) if (c.titles.some((w) => (' ' + norm(top[k].t) + ' ').includes(' ' + norm(w)))) rank = k + 1;
    if (rank && rank <= 5) ok++; else fails.push(`"${c.q}" wants ${c.titles.join(' | ')}\n     got ${top.slice(0, 3).map((d) => d.t.slice(0, 60)).join(' | ')}`);
    if (rank && rank <= 3) top3++; if (rank) rr += 1 / rank;
  }
  times.sort((a, b) => a - b);
  console.log(`  ${label.padEnd(26)} ${String(ok).padStart(2)}/${cases.length} in the top 5   top3 ${String(top3).padStart(2)}   MRR ${(rr / cases.length).toFixed(3)}   p50 ${times[times.length >> 1].toFixed(1)} ms`);
  return fails;
}
console.log(`everyday questions (${cases.length}):`);
pass('words only', { sem: false }, false);
pass('words + meaning (LSA)', {}, false);
const f = pass('words + MiniLM', {}, true);
if (process.argv.includes('--fails')) f.forEach((x) => console.log('MISS ' + x));
E.QV.clear(); for (const [k, v] of saved) E.QV.set(k, v);
