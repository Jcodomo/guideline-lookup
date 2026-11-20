# Guideline Lookup

Standalone, offline-first guideline search for Fannie Mae, Freddie Mac, FHA and VA. Same look as Mortgage Suite, but a separate app (nothing is added to mtgcalc).

## Use it
Double-click `index.html` (works from a folder, no server, no install). Press `/` to search.

- **Local · free** (default): searches the built-in copies. No network, no tokens. Instant.
- **+ Web · free**: also shows one-click site-restricted searches (Fannie, Freddie, HUD, VA, CFPB/FHFA/USDA) that open in a new tab. No tokens.
- **+ AI · tokens**: also shows an **Ask AI** button. Tokens are used only when you press it (or, if you choose it in Settings, automatically when local search finds nothing). Add your Anthropic API key in Settings. Models: Haiku 5.5 (cheapest), Sonnet 5.5, Opus 5.5; optional web search for Claude.

Search tips: type a topic, a question, or a section code (`B3-3.4-01`). Autocomplete suggests popular questions, completions and sections. Results show an extractive answer from the guide first. Click **Read here** to read the text in the page; click **View in Selling Guide** (or HUD / Freddie / VA) to open the official source.

## What is inside (the guide copies)
| Source | What is stored | Link target |
|---|---|---|
| Fannie Mae Selling Guide | full text of 390 sections/topics (`data/fannie.json`) | selling-guide.fanniemae.com section page |
| HUD Handbook 4000.1 (FHA) | full text, page by page (`guides/hud-4000.1.pdf`) | the PDF at that page |
| Freddie Mac Guide | pointers only. Freddie's site is JavaScript-only, so its text cannot be copied offline. Use + Web or open the Guide. | guide.freddiemac.com |
| VA | plain-language summaries + links (VA Lenders Handbook is on KnowVA, JavaScript-only) | va.gov / KnowVA |
| CFPB, FHFA, USDA | pointers | official sites |

The curated Freddie/VA entries are orientation notes, not guideline text. Confirm on the official page (items marked "verify" are time-sensitive).

## Refresh the copies
Run `refresh.bat` (needs Python 3 and, for the HUD PDF text, `pdftotext` from poppler). It re-crawls the Fannie Selling Guide, re-downloads HUD 4000.1 (set the newest PDF URL in `build_index.py` / `refresh.bat` when HUD publishes an update) and rebuilds `data/*.js`.

## Files
- `index.html` the app (the only file you need to run it, plus `data/`)
- `data/*.js` search index loaded by the page; `data/fannie.json` raw Fannie text
- `crawl_fannie.py`, `build_index.py`, `data_curated.py` the builders; edit `data_curated.py` to add your own pointers or notes

## Privacy
Searching is entirely local. The API key (if you add one) is stored only in this browser's local storage and is sent only to api.anthropic.com. Do not use AI mode on a shared computer.

The guides are public documents from Fannie Mae, HUD and the VA, included for your own reference; they are updated often, so refresh them and always confirm against the official source.

## Testing and stress testing

The search engine is the same code that runs in the page; the Node scripts load it straight out of `index.html`.

```
node test/stress.js   # 116 direct + indirect + typo queries: pass rate, top-3 hit rate, MRR, p50/p95 latency
node test/ac.js       # per-keystroke timing while typing six realistic queries
node test/fuzz.js     # odd inputs: empty, huge, symbols, emoji, HTML, regex characters
node test/q.js "your query"   # see ranked results with and without feedback expansion
```

Add your own cases to `test/cases.json` (`{"q": "...", "any": ["words expected in the top 5"]}`).

How it finds indirect questions: synonym map, phrase-intent map (a question is mapped to the wording the guides use), typo correction, prefix expansion, adjacent-word proximity boost, and a light pseudo-relevance feedback pass that borrows distinctive words from the best hits.
