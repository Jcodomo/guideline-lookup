// Meaning search for Guideline Lookup, learned from the guides themselves (no model download, nothing sent anywhere).
// Every section is cut into passages of about 150 words; a term x passage matrix (log tf x idf) is reduced with a
// randomized SVD (latent semantic analysis) to K dimensions. Words that keep the same company in the guides end up
// close together ("donor", "relative", "gift"; "continuance", "three years", "expire"), so a question can find a
// passage that does not use its words. Output: data/semantic.js (word vectors and passage vectors, 8-bit), loaded by
// the page only when it is first needed.  Run: node build_semantic.js   (after build_index.py)
const fs = require('fs'), path = require('path'), vm = require('vm');
const K = 96, OVER = 16, POWER = 3, WIN = 150, STEP = 110, MAX_TERMS = 12000;
const root = __dirname;
// the page's own tokenizer and stopwords
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ctx = { console }; vm.createContext(ctx);
const grab = (re) => { const m = html.match(re); if (!m) throw new Error('not found ' + re); return m[0]; };
vm.runInContext(grab(/const STOP=new Set\([^\n]+/) + '\n' + grab(/function tok\(s\)\{[^\n]+/) + '\nthis.tok=tok;this.STOP=STOP;', ctx);
const GLo = { docs: [], meta: {} }; const sb = { GL: GLo, window: { GL: GLo } }; vm.createContext(sb);
for (const f of ['fannie', 'fha', 'curated']) vm.runInContext(fs.readFileSync(path.join(root, 'data', f + '.js'), 'utf8'), sb);
const D = GLo.docs;
const t0 = Date.now();
// 1. passages
const chunks = [];   // [doc index, start word]
const chunkToks = [];
D.forEach((d, i) => {
  const head = ctx.tok((d.t || '') + ' ' + (d.h || ''));
  const words = ctx.tok(d.x || '');
  if (words.length <= WIN) { chunks.push([i, 0]); chunkToks.push(head.concat(words)); return; }
  for (let s = 0; s < words.length; s += STEP) { chunks.push([i, s]); chunkToks.push(head.concat(words.slice(s, s + WIN))); if (s + WIN >= words.length) break; }
});
const n = chunks.length;
// 2. vocabulary: words in 3+ passages and at most 30% of them, not stopwords, not plain numbers
const df = new Map();
for (const ws of chunkToks) for (const w of new Set(ws)) df.set(w, (df.get(w) || 0) + 1);
const terms = [...df].filter(([w, c]) => c >= 3 && c <= n * 0.3 && !ctx.STOP.has(w) && w.length >= 3 && !/^[\d.\-]+$/.test(w)).sort((a, b) => b[1] - a[1]).slice(0, MAX_TERMS).map(([w]) => w);
const tix = new Map(terms.map((w, i) => [w, i])), m = terms.length;
const idf = terms.map((w) => Math.log(n / df.get(w)));
// 3. sparse matrix, one column per passage
const cols = chunkToks.map((ws) => { const tf = new Map(); for (const w of ws) { const t = tix.get(w); if (t != null) tf.set(t, (tf.get(t) || 0) + 1); } return [...tf].map(([t, c]) => [t, (1 + Math.log(c)) * idf[t]]); });
// 4. randomized SVD
const L = K + OVER;
let s32 = 12345; const gauss = () => { s32 = (s32 * 1103515245 + 12345) % 2147483648; const u = (s32 + 1) / 2147483649; s32 = (s32 * 1103515245 + 12345) % 2147483648; const v = (s32 + 1) / 2147483649; return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const mat = (r, c) => Array.from({ length: r }, () => new Float64Array(c));
function orth(M) {   // modified Gram-Schmidt on the columns of M (rows x L)
  const r = M.length;
  for (let j = 0; j < L; j++) {
    for (let k = 0; k < j; k++) { let d = 0; for (let i = 0; i < r; i++) d += M[i][j] * M[i][k]; for (let i = 0; i < r; i++) M[i][j] -= d * M[i][k]; }
    let nn = 0; for (let i = 0; i < r; i++) nn += M[i][j] * M[i][j]; nn = Math.sqrt(nn) || 1; for (let i = 0; i < r; i++) M[i][j] /= nn;
  }
  return M;
}
const AX = (X) => { const Y = mat(m, L); cols.forEach((c, j) => { const x = X[j]; for (const [t, v] of c) { const y = Y[t]; for (let l = 0; l < L; l++) y[l] += v * x[l]; } }); return Y; };   // A X (X: n x L)
const ATQ = (Q) => cols.map((c) => { const z = new Float64Array(L); for (const [t, v] of c) { const q = Q[t]; for (let l = 0; l < L; l++) z[l] += v * q[l]; } return z; });   // A^T Q (n x L)
let Om = mat(n, L); for (const r of Om) for (let l = 0; l < L; l++) r[l] = gauss();
let Q = orth(AX(Om));
for (let p = 0; p < POWER; p++) { const Z = orth(ATQ(Q)); Q = orth(AX(Z)); }
const Bt = ATQ(Q);   // n x L, = (Q^T A)^T
// eigen of B B^T (L x L) by Jacobi
const M2 = mat(L, L); for (const r of Bt) for (let a = 0; a < L; a++) { const ra = r[a]; if (!ra) continue; for (let b = 0; b < L; b++) M2[a][b] += ra * r[b]; }
const V = mat(L, L); for (let i = 0; i < L; i++) V[i][i] = 1;
for (let sweep = 0; sweep < 60; sweep++) {
  let off = 0;
  for (let p = 0; p < L; p++) for (let q = p + 1; q < L; q++) {
    const apq = M2[p][q]; off += apq * apq; if (Math.abs(apq) < 1e-12) continue;
    const th = (M2[q][q] - M2[p][p]) / (2 * apq), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
    for (let k = 0; k < L; k++) { const a = M2[k][p], b = M2[k][q]; M2[k][p] = c * a - s * b; M2[k][q] = s * a + c * b; }
    for (let k = 0; k < L; k++) { const a = M2[p][k], b = M2[q][k]; M2[p][k] = c * a - s * b; M2[q][k] = s * a + c * b; }
    for (let k = 0; k < L; k++) { const a = V[k][p], b = V[k][q]; V[k][p] = c * a - s * b; V[k][q] = s * a + c * b; }
  }
  if (off < 1e-14) break;
}
const order = [...Array(L).keys()].sort((a, b) => M2[b][b] - M2[a][a]).slice(0, K);
// term vectors U_k = Q Ub_k  (m x K); passage vectors V_k S_k = B^T Ub_k (n x K), unit length
const U = Q.map((q) => order.map((e) => { let s = 0; for (let l = 0; l < L; l++) s += q[l] * V[l][e]; return s; }));
const P = Bt.map((b) => { const v = order.map((e) => { let s = 0; for (let l = 0; l < L; l++) s += b[l] * V[l][e]; return s; }); const nn = Math.hypot(...v) || 1; return v.map((x) => x / nn); });
// 5. 8-bit storage: words with a scale each, passages as unit vectors x 127
const q8 = (rows, scaled) => { const out = new Int8Array(rows.length * K), sc = new Float32Array(rows.length); rows.forEach((r, i) => { const mx = scaled ? Math.max(...r.map(Math.abs)) || 1 : 1; sc[i] = mx / 127; r.forEach((v, k) => out[i * K + k] = Math.max(-127, Math.min(127, Math.round(v / mx * 127)))); }); return { out, sc }; };
const Wq = q8(U, true), Pq = q8(P, false);
const b64 = (u8) => Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength).toString('base64');
const doc = Int32Array.from(chunks.map((c) => c[0])), at = Int32Array.from(chunks.map((c) => c[1]));
const js = `/* Built by build_semantic.js: ${m} words, ${n} passages, ${K} dimensions (latent semantic analysis of the guides). */\n` +
  `window.GL=window.GL||{docs:[],meta:{}};GL.sem={K:${K},win:${WIN},terms:${JSON.stringify(terms)},idf:${JSON.stringify(idf.map((x) => +x.toFixed(3)))},` +
  `W:"${b64(Wq.out)}",Ws:"${b64(new Uint8Array(Wq.sc.buffer))}",P:"${b64(Pq.out)}",doc:"${b64(new Uint8Array(doc.buffer))}",at:"${b64(new Uint8Array(at.buffer))}"};\n`;
fs.writeFileSync(path.join(root, 'data', 'semantic.js'), js);
console.log(`semantic: ${m} words x ${n} passages -> ${K} dims in ${((Date.now() - t0) / 1000).toFixed(1)} s, ${(js.length / 1048576).toFixed(2)} MB`);
