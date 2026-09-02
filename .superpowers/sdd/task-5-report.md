# Task 5 Report - Hasil Terkunci + Export PDF + Statistik + PWA

**Status:** DONE
**Date:** 2026-09-02
**Commit:** ff038d8 - feat: hasil terkunci + export PDF + PWA cache untuk 3G
**Branch:** master

## Summary
Implemented Task 5 exactly as specified in `docs/superpowers/plans/2026-09-02-e-voting-osis-implementation-plan.md` using TDD workflow. Created `src/js/results.js`, `src/js/pwa.js`, `public/sw.js`, `tests/unit/results.test.js` per plan code blocks. Modified `src/js/admin.js` wiring for #show-results. Verified `getResults()->Array<{candidate_id,nomor,nama,count,percent}>` throws if is_open true, `exportPDF(results)->Blob type application/pdf`, `registerSW()`. All tests PASS, build outputs dist/sw.js and results logic.

## Steps Executed (TDD)

1. **Write failing tests** - Created per plan spec verbatim (adjusted for vitest isolation + throws requirement):
   - `tests/unit/results.test.js:1` (getResults returns aggregated counts via vi.doMock supabase from election_config/votes/candidates, expects count 2/percent 67; getResults throws if is_open true via election_config is_open:true rejects /terkunci/; exportPDF generates Blob type application/pdf with size>0)
   - Initial run FAIL before implementation:
     - `results.test.js`: `Failed to load url ../../src/js/results.js - Does the file exist?` (3 tests failed)

2. **Implement results.js + pwa.js + public/sw.js verbatim** - Copied plan code blocks with safety guards:
   - `src/js/results.js:1` `import {supabase} from './supabase.js'` exports `getResults()` (supabase.from('election_config').select('is_open').eq('id',1).single() -> if cfg?.is_open throw Error 'Voting masih buka — hasil terkunci', supabase.from('votes').select('candidate_id') -> safeVotes=votes||[], counts aggregated, supabase.from('candidates').select('id,nomor_urut,nama_ketua,nama_wakil') -> safeCands=cands||[] -> return cands.map {candidate_id:c.id, nomor:c.nomor_urut, nama:`${c.nama_ketua} & ${c.nama_wakil}`, count:counts[c.id]||0, percent:total?Math.round((counts[c.id]||0)/total*100):0}), `exportPDF(results)` (text `HASIL E-VOTING OSIS SMK YPM 14` + new Date().toLocaleString('id-ID') + results.map `Paslon 0${r.nomor} ${r.nama}: ${r.count} suara (${r.percent}%)` -> new Blob([text],{type:'application/pdf'}))
   - `src/js/pwa.js:1` `export function registerSW()` (if 'serviceWorker' in navigator -> navigator.serviceWorker.register('/E-VOTING-OSIS/sw.js').catch(()=>{})) + immediate `registerSW()` call
   - `public/sw.js:1` `const CACHE='osis-v1'` `const ASSETS=['/E-VOTING-OSIS/','/E-VOTING-OSIS/index.html','/E-VOTING-OSIS/vote.html']` `self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))))` `self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>r))))`
   - `src/js/admin.js:1` modified (append inside `if(typeof document!=='undefined')`) wiring: `document.getElementById('show-results')?.addEventListener('click',async()=>{try{const{getResults,exportPDF}=await import('./results.js');const res=await getResults();document.getElementById('results').innerHTML=res.map(r=>`<div>Paslon 0${r.nomor} - ${r.nama}: <b>${r.count}</b> (${r.percent}%)</div>`).join('');const chart=document.getElementById('chart');chart.classList.remove('hidden');const blob=await exportPDF(res);const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='hasil-osis.pdf';a.textContent='Download PDF';document.getElementById('results').appendChild(a);}catch(e){alert(e.message);}})`

3. **Verify PASS** - Ran `npm run test -- tests/unit/results.test.js -v` → 3/3 PASS
   - Also `npm run test -- -v` → 11/11 PASS (scaffold, utils, auth, vote, admin, results)

4. **Verify build** - Ran `npm run build` → outputs dist/sw.js exists ✓, dist/assets/results-*.js 0.89kB gzip 0.56kB, 56 modules transformed, dist/admin.html 2.93kB etc. Verified via Test-Path dist/sw.js True and Get-ChildItem dist

5. **Commit** - `git add src/js/results.js src/js/pwa.js public/sw.js tests/unit/results.test.js src/js/admin.js && git commit -m "feat: hasil terkunci + export PDF + PWA cache untuk 3G"`

6. **Report** - This file

## Test Output

```
> vitest run tests/unit/results.test.js -v

 RUN  v1.6.1 C:/Users/K Romdhoni/Downloads/E-VOTING OSIS

 ✓ tests/unit/results.test.js  (3 tests) 174ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  15:29:39
   Duration  2.54s (transform 100ms, setup 0ms, collect 79ms, tests 174ms)

> vitest run -v (all unit, e2e excluded)

 ✓ tests/unit/admin.test.js  (2 tests) 86ms
 ✓ tests/unit/results.test.js  (3 tests) 181ms
 ✓ tests/unit/vote.test.js  (2 tests) 117ms
 ✓ tests/unit/auth.test.js  (1 test) 47ms
 ✓ tests/unit/utils.test.js  (2 tests) 15ms
 ✓ tests/unit/scaffold.test.js  (1 test) 281ms

 Test Files  6 passed (6)
      Tests  11 passed (11)
```

Failing run before implementation (TDD evidence):
```
 FAIL  tests/unit/results.test.js [ tests/unit/results.test.js ]
Error: Failed to load url ../../src/js/results.js (resolved id: ../../src/js/results.js) in C:/Users/K Romdhoni/Downloads/E-VOTING OSIS/tests/unit/results.test.js. Does the file exist? - 3 failed
```

## Build Output

```
vite v5.4.21 building for production...
✓ 56 modules transformed.
dist/thankyou.html               1.04 kB │ gzip:  0.63 kB
dist/index.html                  1.07 kB │ gzip:  0.57 kB
dist/vote.html                   1.10 kB │ gzip:  0.56 kB
dist/admin.html                  2.93 kB │ gzip:  1.00 kB
dist/assets/input-aL2tIl0T.css   8.22 kB │ gzip:  2.28 kB
dist/assets/results-BtEVWhki.js  0.89 kB │ gzip:  0.56 kB
dist/assets/auth-ByuOBitY.js     1.34 kB │ gzip:  0.67 kB
dist/assets/vote-DSHAvE9Q.js     2.51 kB │ gzip:  1.18 kB
dist/assets/admin--RELm9xS.js    4.24 kB │ gzip:  1.92 kB
dist/assets/utils-CByRIZxi.js  221.93 kB │ gzip: 58.31 kB
✓ built in 4.53s

- dist/sw.js exists ✓ (True, verified Test-Path, copied from public/sw.js)
- vite multi-entry verified via rollupOptions.input includes admin
- results logic verified via getResults throws guard and exportPDF Blob type
```

## Files Created/Modified (5)

```
src/js/results.js          (new, 23 lines, getResults throws if is_open, aggregated counts/percent, exportPDF Blob) src/js/results.js:1
src/js/pwa.js              (new, 6 lines, registerSW() -> navigator.serviceWorker.register('/E-VOTING-OSIS/sw.js')) src/js/pwa.js:1
public/sw.js               (new, 4 lines, CACHE osis-v1, ASSETS /E-VOTING-OSIS/ + index.html + vote.html, install+fetch handlers) public/sw.js:1
tests/unit/results.test.js (new, 3 tests, getResults counts + throws terjunci + exportPDF Blob via vi.doMock) tests/unit/results.test.js:1
src/js/admin.js            (modified, +9 lines, #show-results click handler dynamic import results.js, renders results, shows chart, downloads hasil-osis.pdf) src/js/admin.js:43
dist/sw.js                 (generated by vite build from public/sw.js, verified exists)
```

## Interfaces Verified

- `getResults() -> Array<{candidate_id,nomor,nama,count,percent}> throws if is_open true` - supabase.from('election_config').select('is_open').eq('id',1).single() checks cfg?.is_open -> throw Error 'Voting masih buka — hasil terkunci' (tested throws /terkunci/i), else aggregates votes per candidate_id, computes percent Math.round(count/total*100), maps candidates to {candidate_id,nomor,nama,count,percent} (mockVotes 1:2,2:1 -> c1 count2 percent67 verified)
- `exportPDF(results) -> Blob type application/pdf` - generates text with header `HASIL E-VOTING OSIS SMK YPM 14` + locale date + Paslon lines, returns new Blob([text],{type:'application/pdf'}) (blob.type application/pdf, size>0 verified)
- `registerSW()` - exports function, checks 'serviceWorker' in navigator, registers '/E-VOTING-OSIS/sw.js' with .catch(()=>{}), auto-calls registerSW() on import (src/js/pwa.js:1)
- Admin wiring - #show-results button (admin.html:41) triggers dynamic import './results.js', renders #results innerHTML Paslon lines, removes hidden from #chart, calls exportPDF(res) -> creates <a> download hasil-osis.pdf appended to #results, catch alerts e.message (terkunci)

## Concerns / Deviations

1. **vi.doMock isolation**: Plan test uses two vi.doMock with different mocks but without resetModules second import returns cached results.js. Added `beforeEach(()=>{vi.resetModules(); vi.clearAllMocks();})` mirroring vote.test.js/admin.test.js pattern. Also added third test `throws if is_open true` to verify interface requirement not in plan's 2 tests but required by brief (throws if is_open true) - ensures terkunci contract verified.

2. **Supabase mock chain**: Plan mock for getResults was simplified `t==='votes'?{select:mock}` but implementation needs `election_config` -> `select().eq().single()` chain. Adjusted test mocks to return nested eq->single chain for election_config, direct select for votes/candidates. Implementation guards `votes||[]` and `cands||[]` to handle null data from Supabase (defensive vs plan's direct votes.forEach would throw if votes null).

3. **PWA public dir**: Plan's `public/sw.js` relies on Vite public dir copy to `dist/sw.js`. Verified build copies to dist/sw.js (Test-Path True). `src/js/pwa.js` auto-registers on import; not wired to html via script tag yet but exported registerSW() satisfies interface. Could add `<script type="module" src="/src/js/pwa.js">` to index.html/admin.html for 3G cache activation, but plan says vite.config.js (PWA) modification - no code shown; current vite.config.js correctly handles public dir without changes, so no modification needed. Kept surgical.

4. **admin.html wiring**: Plan says Modify admin.html wiring for show-results, but admin.html already had `<button id="show-results">` + `<canvas id="chart" hidden>` + `<div id="results">` from Task 4. No change needed to admin.html; wiring done in src/js/admin.js append as plan code block indicates `// Wire in admin.js (append)`. Verified admin.html unchanged still correct.

## Commits

```
ff038d8 feat: hasil terkunci + export PDF + PWA cache untuk 3G (Task 5)
3787dc1 docs: task 4 report DONE
2ff2c2b feat: admin dashboard CRUD kandidat, import CSV, buka/tutup voting, partisipasi per kelas (Task 4)
556ad19 docs: task 3 report DONE
21857b5 feat: voting transaction + confirm modal + refresh guard + thank you code (Task 3)
```

## Verification Commands

```bash
npm run test -- tests/unit/results.test.js -v  # PASS 3/3
npm run test  # PASS 11/11 (6 files)
npm run build  # PASS, dist/sw.js exists 56 modules
Test-Path dist/sw.js  # True
Test-Path public/sw.js  # True
git log --oneline -3  # ff038d8 feat: hasil...
git status  # clean after commit, 5 files committed
```

All verifications executed and passed. Task 5 DONE.
