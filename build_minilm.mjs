// Meaning search with a real language model: every guideline passage is read once by MiniLM (all-MiniLM-L6-v2, the
// small sentence model qdrant's page search uses) and stored as a 384-number vector in data/minilm.js. In the page,
// the same model (23 MB, downloaded once and kept by the browser) reads the question, and the passages closest in
// meaning are found, even when they share no words with it. Nothing is sent anywhere: the model runs on the computer.
//
// Run once after build_index.py (about a minute):
//   npm install --no-save @huggingface/transformers@4.3.2
//   node build_minilm.mjs            (or: node build_minilm.mjs --lib <folder that has node_modules/@huggingface/transformers>)
// Also writes data/minilm-queries.json when --queries <file.json> is given (more than one may be given) (the test searches, read by the model, for
// test/run500.js, which runs in Node without the model).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const MODEL = arg('--model') || 'Xenova/all-MiniLM-L6-v2', WIN = 110, STEP = 80, BATCH = 32, OUT = arg('--out') || '';

const lib = arg('--lib');
const entry = lib ? createRequire(path.join(path.resolve(lib), 'x.js')).resolve('@huggingface/transformers') : null;
const { pipeline, env } = await import(entry ? pathToFileURL(entry).href : '@huggingface/transformers');
env.cacheDir = path.join(lib ? path.resolve(lib) : root, '.model-cache');
const fe = await pipeline('feature-extraction', MODEL, { dtype: 'q8' });
const embed = async (texts) => (await fe(texts, { pooling: 'mean', normalize: true })).tolist();
const q8 = (v) => v.map((x) => Math.max(-127, Math.min(127, Math.round(x * 127))));

const qfile = arg('--queries');
if (qfile) {   // only the test searches
  const of = path.join(root, 'data', 'minilm-queries' + OUT + '.json'), out = {};   // every --queries file (cases500.json, paraphrase.json ...) goes into one
  const E = createRequire(import.meta.url)(path.join(root, 'test', 'harness.js'));   // the page's engine, for its spelling corrections
  const qs = [...new Set(process.argv.flatMap((a, i) => process.argv[i - 1] === '--queries' ? JSON.parse(fs.readFileSync(a, 'utf8')).map((c) => c.q) : []))];
  for (let i = 0; i < qs.length; i += BATCH) { const b = qs.slice(i, i + BATCH), e = await embed(b.map((q) => E.miniText(q))); b.forEach((q, k) => { out[q] = q8(e[k]); }); }
  fs.writeFileSync(of, JSON.stringify(out));
  console.log('queries:', qs.length);
  process.exit(0);
}

const GLo = { docs: [], meta: {} }; const sb = { GL: GLo, window: { GL: GLo } }; vm.createContext(sb);
for (const f of ['fannie', 'fha', 'curated']) vm.runInContext(fs.readFileSync(path.join(root, 'data', f + '.js'), 'utf8'), sb);
const D = GLo.docs;
const t0 = Date.now();
// passages of about 110 words (the model reads up to 256 word pieces), overlapping by 30, each led by its section title
const texts = [], doc = [], at = [];
D.forEach((d, i) => {
  const x = d.x || '', starts = []; const re = /[A-Za-z0-9]+/g; let m; while ((m = re.exec(x))) starts.push(m.index);
  const head = (d.s ? d.s + ' ' : '') + (d.t || '').replace(/\s*\(\d\d\/\d\d\/\d{4}\)\s*$/, '') + '. ';
  for (let s = 0; ; s += STEP) {
    const a = starts[s] ?? 0, b = s + WIN < starts.length ? starts[s + WIN] : x.length;
    texts.push((head + x.slice(a, b)).replace(/\s+/g, ' ').trim()); doc.push(i); at.push(s);
    if (s + WIN >= starts.length) break;
  }
});
const n = texts.length, dim = 384, P = new Int8Array(n * dim);
for (let i = 0; i < n; i += BATCH) {
  const e = await embed(texts.slice(i, i + BATCH));
  e.forEach((v, k) => P.set(q8(v), (i + k) * dim));
  if ((i / BATCH) % 40 === 0) process.stdout.write(`\r${i}/${n} passages, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
// each section title on its own, as a short label of what the section is about
const tt = D.map((d) => (d.t || '').replace(/\s*\(\d\d\/\d\d\/\d{4}\)/g, '').replace(/^\d+\.\s*/, '').replace(/\.{3,}.*/, '')), T = new Int8Array(D.length * dim);
for (let i = 0; i < tt.length; i += 64) (await embed(tt.slice(i, i + 64))).forEach((v, k) => T.set(q8(v), (i + k) * dim));
// the model's whole English words (lower case, 2+ letters), so the page can tell a real word from a typing mistake
const tj = JSON.parse(fs.readFileSync(path.join(env.cacheDir, MODEL, 'tokenizer.json'), 'utf8'));
const words = Object.keys(tj.model.vocab).filter((w) => /^[a-z]{2,}$/.test(w)).join(' ');
// which guide copy these vectors belong to: the page ignores them after a refresh until this is run again
const sig = (docs) => { let h = 5381; for (const d of docs) { const s = d.t || ''; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; } return h; };
const b64 = (u8) => Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength).toString('base64');
const js = `/* Built by build_minilm.mjs: ${n} passages read by ${MODEL} (${dim} numbers each, 8-bit). */\n` +
  `window.GL=window.GL||{docs:[],meta:{}};GL.mini={model:${JSON.stringify(MODEL)},dim:${dim},n:${D.length},sig:${sig(D)},words:${JSON.stringify(words)},` +
  `P:"${b64(new Uint8Array(P.buffer))}",T:"${b64(new Uint8Array(T.buffer))}",doc:"${b64(new Uint8Array(Int32Array.from(doc).buffer))}",at:"${b64(new Uint8Array(Int32Array.from(at).buffer))}"};\n`;
fs.writeFileSync(path.join(root, 'data', 'minilm' + OUT + '.js'), js);
console.log(`\nminilm: ${n} passages in ${((Date.now() - t0) / 1000).toFixed(0)} s, ${(js.length / 1048576).toFixed(2)} MB`);
