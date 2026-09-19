# ReddViz — Improvement Plan

Working list of fixes and additions, tiered by size and risk, doubling as the
progress tracker. Source: full-repo review at commit `3bb1586`.

## How to use this file

- Tick a box when the item is done **and** its `Done when` check passes.
- Keep the summary table below in sync (manual counters — update on every tick).
- One commit per item where practical; mention the item id in the commit body
  (e.g. `fix: validate subreddit param (1.3)`).
- Tiers are execution order. **Do not start Tier 4 without a decision first** —
  each item there names the question to settle.

### Tier definitions

| Tier | Meaning                                                                         | Typical shape         |
| ---- | ------------------------------------------------------------------------------- | --------------------- |
| 1    | Mechanical or single-concern fix. No decision, no ambiguity.                    | 1 file, <20 lines     |
| 2    | Small fix or config change with one defined answer. Touches shared paths or CI. | 1-2 files             |
| 3    | Feature work. Multi-file, but the approach is already obvious.                  | 2-4 files             |
| 4    | Needs a decision before any code exists.                                        | unknown until decided |

### Progress

| Tier                 | Items  | Done  |
| -------------------- | ------ | ----- |
| 1 — Quick wins       | 8      | 7     |
| 2 — Small fixes & CI | 5      | 0     |
| 3 — Features         | 6      | 0     |
| 4 — Decide first     | 3      | 0     |
| **Total**            | **22** | **7** |

Base gates are green today (`nub run lint`, `nub run format:check`, and
`./node_modules/.bin/tsc --noEmit` all exit 0), so nothing below has to work
around pre-existing debt.

---

## Tier 1 — Quick wins

No decisions required. Each is a single file.

- [x] **1.1 — Add a `typecheck` script**
      `package.json`. TypeScript is currently only checked by the editor; `oxlint`
      does not typecheck. Add `"typecheck": "tsc --noEmit"`.
      Done when: `nub run typecheck` exits 0 (it already does, unscripted).

- [x] **1.2 — Log unexpected errors in `onError`**
      `src/index.ts:20-31`. Non-`HTTPError` becomes a bare 500 with no log line, so
      production 500s are undebuggable despite `observability.logs.enabled: true`.
      Add `console.error(err)` in that branch.
      Done when: a thrown non-`HTTPError` still returns the same JSON body and a log
      line is visible in `wrangler dev`.

- [x] **1.3 — Validate the `:subreddit` param**
      `src/gimme.ts:20`, interpolated at `src/reddit.ts:67`. Hono decodes `%2F`, and
      `new URL()` collapses `..`, so `GET /gimme/..%2F..%2Fapi%2Fv1%2Fme` sends an
      authenticated GET to `https://oauth.reddit.com/api/v1/me/top` (reproduced
      locally). Also bounds the KV key space, since `subreddit;${subreddit}`
      (`gimme.ts:69`) is written from the raw param. Reject anything not matching
      `^[a-z0-9_]{2,21}$` with a 400 after lowercasing.
      Done when: `/gimme/..%2F..%2Fapi%2Fv1%2Fme` returns 400 and `/gimme/memes`
      still works.

- [x] **1.4 — Guard `hasImage` against a throwing `new URL()`**
      `src/gimme.ts:86-92`. `new URL()` throws on a relative or malformed value
      (verified), and one bad post fails the whole response. Wrap in `try/catch`
      returning `false`. Unconfirmed whether reddit ever emits a relative `url` —
      this is hardening, not a reproduced failure.
      Done when: a post with `image: "/r/x/comments/a/"` is skipped instead of
      producing a 500.

- [x] **1.5 — Document local secrets in the README**
      `README.md:19-26` documents `wrangler secret put` (the production path) but not
      `.dev.vars`, which is what `nub run dev` needs.
      Done when: the README has a local-dev secrets step naming `.dev.vars` and its
      two keys.

- [x] **1.6 — Stop duplicating the API table on the homepage**
      `src/home.ts:69-98` vs `README.md:44-101` — two copies of one contract that
      will drift. Trim the landing page to a one-line usage summary plus a link.
      Done when: the query-param table exists in exactly one place.

- [x] **1.7 — Send an honest Reddit User-Agent**
      `src/constants.ts:18-20` sent a spoofed Firefox UA. Reddit's API rules ask for a
      unique, descriptive UA. **Decided 2026-09-19:** project-URL form,
      `reddviz/<version> (+https://noz.one/ujol/reddviz)`, with `<version>` read from
      `package.json` so it tracks releases (needs `resolveJsonModule` in
      `tsconfig.json`).
      Done when: `FETCH_HEADERS` carries an app-specific UA and a live request still
      returns 200. Verified locally that both outbound calls carry the new UA; the
      live reddit check is deploy-time, since this environment is 403'd by reddit.

- [ ] **1.8 — Early-exit `pickRandom`**
      `src/gimme.ts:94-101` shuffles all 100 items to return ≤50. Stop the loop at
      `n`. Pure refactor, no behavior change.
      Done when: output distribution is unchanged and the loop runs at most `n`
      times.

---

## Tier 2 — Small fixes & CI

One defined answer each, but they touch shared paths or CI config.

- [ ] **2.1 — Handle 401, 429, and token-fetch failure**
      `src/reddit.ts:27`, `40-60`. `fetchToken` returns `""` on any non-2xx, the
      request goes out as `Bearer ` empty, returns 401, and lands in `default:` →
      `500 "unexpected error from reddit (status 401)"`. There is no 429 case, so
      rate-limiting also reads as a generic 500. Map both explicitly; consider
      throwing instead of continuing with an empty token.
      Done when: 401, 429 and a failed token fetch each produce a distinct,
      accurate status and message.

- [ ] **2.2 — Make invalid counts actually return 400**
      `src/gimme.ts:52-53` vs `README.md:98` and `src/home.ts:75-80`. `?c=abc`
      silently serves one random post while the docs promise 400. Reject non-numeric
      with 400; use `Number.isInteger` to also drop `5.5` (coerced to 5 by `slice`)
      and `0x10` (= 16).
      Done when: `?c=abc`, `?c=5.5` and `?c=0x10` all return 400; `?c=5` still
      returns 5 posts.

- [ ] **2.3 — Gate CI on lint, format and typecheck**
      `.forgejo/workflows/deploy.yml` runs `nub ci` → `nub run deploy` with no
      checks. Add `nub run lint`, `nub run format:check`, `nub run typecheck` (after
      1.1) either as a `ci.yml` on push/PR or as steps before deploy. Safe to grade
      absolutely: all three are green at base.
      Done when: a commit touching only `src/` fails CI when lint or typecheck fails.

- [ ] **2.4 — Drop `nodejs_compat` if nothing needs it**
      `wrangler.jsonc`. No file under `src/` imports a node builtin, but `btoa` and
      friends come from the Workers runtime, not from compat flags — verify by
      deploy, do not assume.
      Done when: the flag is removed, the Worker deploys, and `/gimme/memes` returns
      200 in production.

- [ ] **2.5 — Add a staging environment with its own KV**
      `wrangler.jsonc` has one namespace (prod) and one binding. A second env plus
      its own KV namespace keeps experiments and test data out of production cache.
      Done when: `wrangler dev --env staging` reads and writes the staging namespace.

---

## Tier 3 — Features

Multi-file, but the approach is already clear.

- [ ] **3.1 — Negative caching for empty results**
      `src/gimme.ts:77` deliberately skips caching empty results. Right for
      poisoning, but a nonexistent or image-less subreddit re-hits reddit on every
      request. Write a short-lived marker (30-60s, separate key prefix) on empty
      results.
      Done when: a second request for a known-empty subreddit makes no reddit call,
      and a bad response still cannot poison the 4h positive cache.

- [ ] **3.2 — Refresh the cache in the background near expiry**
      Cache hits near TTL still pay a full reddit round trip. Use
      `c.executionCtx.waitUntil()` to refresh when the entry is close to expiring,
      and serve the stale value.
      Done when: a request against a near-expiry entry returns immediately and a
      fresh value is present afterwards.

- [ ] **3.3 — Add a `/health` endpoint**
      Separates "worker down" from "reddit down" for uptime checks. Keep it
      dependency-free (no reddit call) unless you want a deeper probe.
      Done when: `GET /health` returns 200 with a small JSON body.

- [ ] **3.4 — Add CORS if the JSON is consumed from a browser**
      Only needed if a separate frontend fetches `/gimme`. `hono/cors` with an
      explicit origin is enough; skip this item entirely if not.
      Done when: a browser page on an allowed origin can read the response, and a
      disallowed origin cannot.

- [ ] **3.5 — Support `?nsfw=only`**
      `nonsfw` is a presence flag, so absence means NSFW _included_ and there is no
      way to request NSFW-only. Check D3vd's `nsfw` param semantics first if
      compatibility with the API credited in the README matters.
      Done when: the three states (default / `nonsfw` / nsfo-only) are each
      reachable and documented.

- [ ] **3.6 — Rate-limit `/gimme`**
      Nothing bounds request volume; each request can cost a reddit fetch plus a KV
      write. The Workers rate-limiting binding fits. Confirm the current wrangler
      config key against the docs before writing it.
      Done when: bursts past the configured limit return 429 without reaching
      reddit or KV.

---

## Tier 4 — Decide first

Do not write code for these until the question is answered. Decisions belong in
this file (or the README) so the next session does not relitigate them.

- [ ] **4.1 — Test harness, then first tests**
      Nothing in the repo is tested. `parseCount`, `pickRandom`, `hasImage`,
      `toPost`, `decode` and the routes are all untested. **Question:** vitest with
      `@cloudflare/vitest-pool-workers` (real KV, `app.request()`, no network) versus
      plain unit tests over the pure helpers only. Constraint: the anti-slop rule
      `no-module-mocking` (`tools/oxlint/anti-slop/rules/no-module-mocking.ts`)
      limits how `fetch` and KV can be faked — `getPosts(c, ...)` already takes
      context, so that is the natural seam.
      Done when: the decision is recorded here, a `test` script exists, and the
      pure helpers are covered.

- [ ] **4.2 — Response envelope: keep or unify?**
      Three shapes today: bare post object for a single post, `{count, posts}` for
      count mode, `{success: false, message}` for errors. **Question:** keep as-is,
      or move to `{success: true, data}` for success and mirror errors — matching the
      D3vd API credited in the README. Breaking change; cheapest now, while there
      are no clients.
      Done when: the decision is recorded and, if changed, README + homepage +
      handlers agree.

- [ ] **4.3 — Observability: turn traces on?**
      `wrangler.jsonc` has `traces.enabled: false` while logs are enabled.
      **Question:** is it worth the ingest cost to answer "reddit or KV dominates
      latency?" — or is timing the two calls manually once enough?
      Done when: the decision is recorded, with the sample rate if enabled.

---

## Deferred / do not do

- **`TIMES` is not in the KV cache key** (`src/reddit.ts:66`, `src/gimme.ts:69`).
  Harmless today because `t` is server-chosen and invisible to clients. Becomes a
  bug the moment `?t=` is exposed — add both the param and the key component in
  the same change.
- **`compatibility_date` / dependency bumps.** Covered by Dependabot-style
  commits already in history; not tracked here.
- **Rewriting the vendored anti-slop plugin.** Untouched by this plan.

---

## Notes

- Tier 1 items are independent of each other and of everything else — they can
  land in any order, including as separate commits in one session.
- 1.1 must land before 2.3 references `nub run typecheck`.
- 3.1 and 3.2 both touch the cache read/write path in `src/gimme.ts:64-84`;
  doing them together avoids editing the same block twice.
- 4.1 is the only item that needs real design work. If only one thing gets a
  dedicated design pass, it should be that one.
