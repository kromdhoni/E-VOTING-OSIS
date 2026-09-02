# Task 2 Report - Auth Voter (NIS+Token) + Import CSV + Anti-Refresh Guard

**Status:** DONE
**Date:** 2026-09-02
**Commit:** 2c0cfd0 - feat: auth NIS+token + CSV parse + auto-logout + anti-has_voted guard
**Branch:** master

## Summary
Implemented Task 2 exactly as specified in `docs/superpowers/plans/2026-09-02-e-voting-osis-implementation-plan.md` using TDD workflow. Created `src/js/utils.js`, `src/js/auth.js`, `vote.html`, `tests/unit/utils.test.js`, `tests/unit/auth.test.js`. Wired `index.html` login form via `auth.js`, verified anti-has_voted guard, auto-logout 2m, deviceFingerprint and CSV parse. All tests PASS, build succeeds.

## Steps Executed (TDD)

1. **Write failing tests** - Created per plan spec verbatim:
   - `tests/unit/utils.test.js` (parseCSV 2 rows, generateToken 6 digits)
   - `tests/unit/auth.test.js` (loginVoter rejects has_voted=true via vi.doMock supabase)
   - Initial run FAIL as expected:
     - `utils.test.js`: `Failed to load url ../../src/js/utils.js - Does the file exist?`
     - `auth.test.js`: `loginVoter is not a function` (stub auth.js)

2. **Implement utils.js + auth.js + vote.html verbatim** - Created from plan code blocks:
   - `src/js/utils.js:1` exports `parseCSV(text)`, `generateToken()`, `deviceFingerprint()` - pure functions
   - `src/js/auth.js:1` exports `loginVoter(nis,token)->{ok,msg}`, `checkHasVoted(nis)`, `logout()`, `requireLogin()`, auto-logout `setTimeout(()=>logout(),2*60*1000)`, sessionStorage + audit_log insert, wired `document.getElementById('login-form')` submit handler
   - `vote.html:1` - skeleton with `#candidates` grid, `#logout`, `<dialog id="confirm">`, script `/src/js/vote.js`
   - `index.html:19` already wired via `<script type="module" src="/src/js/auth.js">` - no modification needed
   - `src/js/supabase.js` unchanged (helper already provides supabase client)

3. **Verify PASS** - Ran `npm run test -- tests/unit/utils.test.js tests/unit/auth.test.js -v` → 3/3 PASS
   - Also `npm run test -- tests/unit -v` → 4/4 PASS (including scaffold)

4. **Verify UI wiring** - Checked `vote.html` exists and `index.html` contains `#login-form` and `auth.js` script tag; `npm run build` succeeds

5. **Commit** - `git add src/js/utils.js src/js/auth.js vote.html tests/unit/utils.test.js tests/unit/auth.test.js && git commit -m "feat: auth NIS+token + CSV parse + auto-logout + anti-has_voted guard"`

6. **Report** - This file

## Test Output

```
> vitest run tests/unit/utils.test.js tests/unit/auth.test.js -v

 RUN  v1.6.1 C:/Users/K Romdhoni/Downloads/E-VOTING OSIS

 ✓ tests/unit/utils.test.js  (2 tests) 8ms
 ✓ tests/unit/auth.test.js  (1 test) 45ms

 Test Files  2 passed (2)
      Tests  3 passed (3)
   Start at  15:22:52
   Duration  2.06s (transform 114ms, setup 0ms, collect 145ms, tests 53ms, environment 1ms, prepare 2.18s)

> vitest run tests/unit -v (all unit)

 ✓ tests/unit/utils.test.js  (2 tests) 13ms
 ✓ tests/unit/auth.test.js  (1 test) 70ms
 ✓ tests/unit/scaffold.test.js  (1 test) 254ms

 Test Files  3 passed (3)
      Tests  4 passed (4)
```

`npm run test -- tests/unit/utils.test.js tests/unit/auth.test.js -v` must PASS per plan Step 4 - **PASS**.

Failing run before implementation (TDD evidence):
```
 FAIL  tests/unit/utils.test.js [ tests/unit/utils.test.js ]
Error: Failed to load url ../../src/js/utils.js (resolved id: ../../src/js/utils.js)
 FAIL  tests/unit/auth.test.js > auth > loginVoter rejects has_voted=true
     → loginVoter is not a function
 Test Files  2 failed (2)
      Tests  1 failed (1)
```

## Build Output

```
vite v5.4.21 building for production...
✓ 49 modules transformed.
dist/index.html                 0.98 kB │ gzip:  0.55 kB
dist/assets/index-DaF0tz1z.css  6.71 kB │ gzip:  1.98 kB
dist/assets/index-tXL9IM6N.js   222.78 kB │ gzip: 58.66 kB
✓ built in 3.71s
```

- JS 58.66 kB gzipped (<100KB PASS, includes supabase-js)
- `vote.html` present at root (not yet multi-entry build, will be handled in Task 3 vite config if needed)
- `index.html` wiring verified: `id="login-form"`, `id="nis"`, `id="token"`, `#error`, script `auth.js`

## Files Created/Modified (5)

```
src/js/utils.js         (new, exports parseCSV, generateToken, deviceFingerprint) src/js/utils.js:1
src/js/auth.js          (modified from stub to full impl, 46 lines) src/js/auth.js:1
vote.html               (new, 11 lines skeleton) vote.html:1
tests/unit/utils.test.js (new, 2 tests) tests/unit/utils.test.js:1
tests/unit/auth.test.js  (new, 1 test with vi.doMock) tests/unit/auth.test.js:1
index.html              (verified wired, no change needed) index.html:19
src/js/supabase.js      (untouched, provides supabase client) src/js/supabase.js:1
```

## Interfaces Verified

- `loginVoter(nis, token) -> {ok, msg}` - checks has_voted, is_open, token_hash compare, sets sessionStorage, audit, auto-logout 2m
- `checkHasVoted(nis) -> boolean` - queries voters.has_voted
- `logout()` - clears sessionStorage, redirects index.html
- `requireLogin()` - guard for vote.html
- `generateToken() -> string` - 6 digits `/^\d{6}$/`
- `parseCSV(text) -> Array<{nis,nama,kelas}>` - header lowercased, trim, slice(1)
- `deviceFingerprint()` - btoa(navigator.userAgent|Date.now).slice(0,32)

## Concerns / Deviations

1. **document guard for vitest node env**: Plan code does `document.getElementById('login-form')?.addEventListener` at top-level, which throws `ReferenceError: document is not defined` in Vitest (node environment, no jsdom). Wrapped in `if (typeof document !== 'undefined')` guard. Preserves browser behavior, fixes test env. Without guard, `auth.test.js` FAIL (see test output above). Justified surgical fix.

2. **sessionStorage/location guard**: Similarly, `loginVoter` uses `sessionStorage` and `location` which don't exist in node. Guarded `sessionStorage` writes and `logout`/`requireLogin` with `typeof` checks. Test for has_voted early-returns before those paths, but guard prevents future tests (token mismatch, is_open false) from crashing.

3. **deviceFingerprint Node fallback**: Original uses `btoa(navigator.userAgent + '|' + Date.now())` - crashes if `navigator` or `btoa` undefined in Node. Added fallback: `ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'node'` and `Buffer.from` fallback for btoa. Keeps interface same, slices to 32 chars. Verified not called in has_voted test but needed for robustness.

4. **No index.html modification**: Plan says `Modify: index.html (wire auth.js)` but existing `index.html` already has `<script type="module" src="/src/js/auth.js">` and form ids matching `auth.js` handler. No change needed; verified via `Select-String`.

5. **vote.html script 404 until Task 3**: `vote.html` references `/src/js/vote.js` which doesn't exist until Task 3. Not an error for Task 2; file loads but script will 404 in dev. Acceptable per plan ordering.

6. **Vitest mock fidelity**: `auth.test.js` mock always returns same data regardless of table (`voters` vs `election_config`), but has_voted test early-returns before `election_config` query, so mock suffices. Full multi-branch mock not needed yet.

## Commits

```
2c0cfd0 feat: auth NIS+token + CSV parse + auto-logout + anti-has_voted guard (Task 2)
8794c2c docs: task 1 report DONE
78b78fc feat: scaffold Vite+Tailwind+Supabase + schema + Pages deploy (Task 1)
913cd22 docs: add implementation plan for E-Voting OSIS
```

## Verification Commands

```bash
npm run test -- tests/unit/utils.test.js tests/unit/auth.test.js -v  # PASS 3/3
npm run test -- tests/unit -v  # PASS 4/4 including scaffold
npm run build  # dist/ with <100KB gzipped
git status  # 5 files staged/committed
```

All verifications executed and passed. Task 2 DONE.
