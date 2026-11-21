// Builds test/cases500.json: 500+ searches with what each must find.
//  - the 116 hand-written cases in cases.json
//  - about 120 more everyday loan-officer questions (below), checked by words that must appear in a top-5 result
//  - 150 Fannie Mae sections and 50 FHA pages found by their own title, reworded (known-item: the page must be top 3)
//  - 80 of the above with typing mistakes (a dropped, swapped or doubled letter)
// Fixed seed, so the set is the same every run. Run: node test/make500.js
const fs = require('fs'), path = require('path');
const E = require('./harness.js');
let seed = 500500; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (a) => a[Math.floor(rnd() * a.length)];

const MORE = [
  ["how many months of bank statements do I need", ["bank statement", "two months", "most recent"]],
  ["can a borrower use crypto for the down payment", ["virtual currency", "cryptocurrency"]],
  ["borrower is on maternity leave", ["temporary leave", "leave"]],
  ["income from a second job", ["secondary employment", "second job", "multiple jobs"]],
  ["how to calculate overtime income", ["overtime"]],
  ["bonus income less than two years", ["bonus"]],
  ["commission income documentation", ["commission"]],
  ["using retirement account for reserves", ["retirement", "reserves"]],
  ["401k loan payment does it count in dti", ["retirement", "401", "loan"]],
  ["child support income how long must it continue", ["child support", "three years", "continuance"]],
  ["alimony as income", ["alimony"]],
  ["social security income gross up", ["social security", "gross", "non-taxable"]],
  ["disability income requirements", ["disability"]],
  ["pension income documentation", ["pension", "retirement income"]],
  ["rental income from the subject property two to four units", ["rental income", "two- to four-unit", "units"]],
  ["using lease agreement for rental income", ["lease"]],
  ["vacancy factor rental income 75 percent", ["75%", "vacancy"]],
  ["foreclosure waiting period", ["foreclosure", "waiting period"]],
  ["short sale waiting period", ["short sale", "preforeclosure"]],
  ["deed in lieu of foreclosure", ["deed-in-lieu", "deed in lieu"]],
  ["chapter 13 bankruptcy still paying", ["chapter 13"]],
  ["collections and charge offs must they be paid", ["collection", "charge-off"]],
  ["judgments and liens", ["judgment", "lien"]],
  ["authorized user tradelines", ["authorized user"]],
  ["borrower has no credit score", ["nontraditional credit", "no credit score", "credit score"]],
  ["minimum credit score fha", ["credit score", "minimum"]],
  ["disputed accounts on the credit report", ["disputed"]],
  ["student loan in deferment payment", ["deferred", "student loan"]],
  ["installment debt with less than ten months left", ["ten months", "10 months"]],
  ["co-signed debt paid by someone else", ["contingent liabilit", "co-signed", "cosigned"]],
  ["business debt in borrower's name", ["business debt"]],
  ["timeshare loan", ["timeshare"]],
  ["solar panel lease", ["solar"]],
  ["condo questionnaire requirements", ["condo", "questionnaire", "project"]],
  ["non-warrantable condo", ["condo", "project"]],
  ["cooperative share loan", ["co-op", "cooperative"]],
  ["manufactured home on a permanent foundation", ["manufactured", "foundation"]],
  ["accessory dwelling unit income", ["accessory dwelling", "adu"]],
  ["property in a flood zone insurance", ["flood"]],
  ["hazard insurance deductible", ["deductible", "insurance"]],
  ["appraisal is older than 120 days", ["appraisal", "120 days", "age"]],
  ["appraisal update form 1004d", ["1004d", "update"]],
  ["desktop appraisal", ["desktop"]],
  ["appraisal waiver", ["waiver", "value acceptance"]],
  ["subject to repairs appraisal completion", ["completion", "repairs"]],
  ["property with peeling paint", ["paint", "lead"]],
  ["well and septic requirements", ["well", "septic"]],
  ["private road maintenance agreement", ["private road", "road"]],
  ["cash out refinance seasoning", ["cash-out", "seasoning"]],
  ["delayed financing after cash purchase", ["delayed financing"]],
  ["rate and term refinance", ["limited cash-out", "rate and term", "no cash-out"]],
  ["streamline refinance fha", ["streamline"]],
  ["buying out a co-owner", ["buyout", "co-owner", "co-owned"]],
  ["interested party contributions limit", ["interested party", "contribution"]],
  ["seller concessions over the limit", ["interested party", "concession"]],
  ["earnest money deposit verification", ["earnest money", "deposit"]],
  ["borrowed funds for down payment", ["borrowed", "secured"]],
  ["sale of current home proceeds", ["sale", "proceeds"]],
  ["business assets for down payment", ["business assets", "business account"]],
  ["employer assistance with down payment", ["employer assistance", "employer"]],
  ["down payment assistance program", ["community seconds", "assistance", "secondary financing"]],
  ["gift of equity from a family member", ["gift of equity"]],
  ["who can give a gift", ["relative", "donor", "gift"]],
  ["gift letter requirements", ["gift letter"]],
  ["reserves for multiple financed properties", ["financed properties", "reserves"]],
  ["investment property minimum down payment", ["investment property", "ltv"]],
  ["second home occupancy rules", ["second home"]],
  ["non-occupant co-borrower ltv", ["non-occupant"]],
  ["non permanent resident alien", ["non-permanent resident", "resident alien"]],
  ["daca borrower eligibility", ["daca", "deferred action"]],
  ["power of attorney at closing", ["power of attorney"]],
  ["borrower living in a trust", ["trust", "inter vivos"]],
  ["ltv limits for a two unit property", ["two-unit", "2-unit", "ltv"]],
  ["high balance loan limits", ["high-balance", "loan limit"]],
  ["mortgage insurance cancellation", ["mortgage insurance", "termination", "cancel"]],
  ["fha upfront mortgage insurance premium", ["upfront", "ufmip", "premium"]],
  ["annual mip duration", ["annual", "mip"]],
  ["203k limited repairs", ["203(k)", "limited"]],
  ["homestyle renovation contingency reserve", ["contingency", "homestyle"]],
  ["renovation draws and inspections", ["draw", "inspection"]],
  ["energy efficient mortgage", ["energy efficient"]],
  ["temporary buydown", ["buydown", "temporary"]],
  ["adjustable rate mortgage qualifying rate", ["adjustable", "arm", "qualifying rate"]],
  ["interest only loans", ["interest-only", "interest only"]],
  ["balloon mortgage", ["balloon"]],
  ["self employed less than two years", ["self-employ", "less than two years", "12 months"]],
  ["k-1 income distributions", ["k-1", "distribution"]],
  ["schedule c depreciation add back", ["depreciation", "schedule c"]],
  ["s corporation income", ["s corporation", "1120s", "1120-s"]],
  ["partnership income 1065", ["partnership", "1065"]],
  ["profit and loss statement required", ["profit and loss", "p&l"]],
  ["declining income self employed", ["declin"]],
  ["tax transcripts 4506-c", ["4506", "transcript"]],
  ["verbal verification of employment timing", ["verbal verification", "verification of employment"]],
  ["gap in employment explanation", ["gap"]],
  ["job offer start date after closing", ["offer", "start"]],
  ["seasonal employment", ["seasonal"]],
  ["military income bah", ["military", "allowance"]],
  ["foreign income", ["foreign income", "foreign"]],
  ["tip income", ["tip"]],
  ["boarder income fha", ["boarder"]],
  ["housing expense ratio", ["housing expense", "ratio"]],
  ["maximum dti with compensating factors", ["compensating factor", "debt-to-income"]],
  ["residual income va", ["residual income"]],
  ["va funding fee exemption", ["funding fee", "exempt"]],
  ["va entitlement restoration", ["entitlement", "restor"]],
  ["va minimum property requirements", ["minimum property", "mpr"]],
  ["va irrrl seasoning", ["irrrl"]],
  ["usda income limits", ["usda", "income"]],
  ["hud repo property", ["hud", "real estate owned", "reo"]],
  ["identity of interest transaction", ["identity of interest", "identity-of-interest"]],
  ["non arms length purchase", ["arm's length", "arms length", "non-arm"]],
  ["property flipping 90 day rule", ["flip", "90 days", "resale"]],
  ["escrow for taxes and insurance", ["escrow"]],
  ["closing cost financing", ["closing cost"]],
  ["title insurance requirements", ["title insurance"]],
  ["survey requirements", ["survey"]],
  ["eligible property types", ["property type", "eligible"]],
  ["mixed use property", ["mixed-use", "mixed use"]],
  // indirect questions, in the words a borrower would use
  ["can my parents help with the down payment", ["gift"]],
  ["grandma wants to pay closing costs", ["gift"]],
  ["my brother is giving me money for the house", ["gift"]],
  ["income that is going to end soon", ["continuance", "continue"]],
  ["how long must income continue", ["continuance", "three years", "continue"]],
  ["my alimony stops next year", ["alimony"]],
  ["what if the appraisal comes in low", ["appraisal", "value"]],
  ["can I buy a house with a roommate paying rent", ["boarder", "rent"]],
  ["borrower got a raise last month", ["increase", "pay raise", "current"]],
  ["i was fired two years ago", ["gap", "employment history", "employment"]],
  ["house has a big crack in the foundation", ["foundation", "structural"]],
  ["seller is paying my closing costs", ["interested party", "seller"]],
];

const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8')).map((c) => ({ ...c, kind: 'hand' }));
for (const [q, any] of MORE) cases.push({ q, any, n: 5, kind: 'question' });

// known items: a section's title, lightly reworded (lower case, no date, sometimes only its distinctive words)
const STOPW = new Set('a an and are as at be by for from in is it of on or the to with'.split(' '));
const clean = (t) => t.replace(/\(\d\d\/\d\d\/\d{4}\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/^\s*[\w().]+\s+(?=[A-Z])/, '').split('>').pop().replace(/[^A-Za-z0-9\-' ]+/g, ' ').replace(/\s+/g, ' ').trim();
// a known-item search must point at one page: titles shared by several pages (FHA headings such as "(D) FHA Review"
// repeat on many pages) are left out, and a title is shortened only when the shorter words still name one page
const low = (t) => clean(t).toLowerCase().replace(/^[a-z]\s+/, '');
const titleCount = {}; E.D.forEach((d) => { const k = low(d.t); titleCount[k] = (titleCount[k] || 0) + 1; });
const words = (t) => low(t).split(' ').filter((x) => x && !STOPW.has(x));
const reword = (t) => { const w = words(t); if (w.length > 5 && rnd() < 0.5) { const s = w.slice(0, 5).join(' '); if (E.D.filter((d) => words(d.t).join(' ').startsWith(s)).length === 1) return s; } return w.join(' '); };
const fannie = E.D.map((d, i) => [d, i]).filter(([d]) => d.a === 'Fannie' && words(d.t).length >= 2 && titleCount[low(d.t)] === 1);
const fha = E.D.map((d, i) => [d, i]).filter(([d]) => d.a === 'FHA' && words(d.t).length >= 3 && !/deleted/i.test(d.t) && titleCount[low(d.t)] === 1);
const take = (list, n) => { const out = [], used = new Set(); while (out.length < n && used.size < list.length) { const k = Math.floor(rnd() * list.length); if (used.has(k)) continue; used.add(k); out.push(list[k]); } return out; };
const known = [];
for (const [d] of take(fannie, 150)) known.push({ q: reword(d.t), title: clean(d.t), kind: 'known-fannie', n: 3 });
for (const [d] of take(fha, 50)) known.push({ q: reword(d.t), title: clean(d.t), kind: 'known-fha', n: 5 });
for (const k of known) cases.push(k);

// typing mistakes
const typo = (q) => q.split(' ').map((w) => {
  if (w.length < 6 || rnd() < 0.5) return w;
  const i = 1 + Math.floor(rnd() * (w.length - 2)), t = rnd();
  return t < 0.34 ? w.slice(0, i) + w.slice(i + 1) : t < 0.67 ? w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2) : w.slice(0, i) + w[i] + w.slice(i);
}).join(' ');
const pool = cases.filter((c) => c.kind === 'question' || c.kind === 'known-fannie');
let made = 0;
while (made < 80) { const c = pick(pool); const q = typo(c.q); if (q === c.q) continue; cases.push({ ...c, q, kind: 'typo-' + c.kind }); made++; }

fs.writeFileSync(path.join(__dirname, 'cases500.json'), JSON.stringify(cases, null, 1));
const by = {}; cases.forEach((c) => by[c.kind] = (by[c.kind] || 0) + 1);
console.log('wrote', cases.length, 'cases', by);
