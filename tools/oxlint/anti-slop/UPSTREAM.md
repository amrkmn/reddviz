# Provenance — anti-slop Oxlint plugin (vendored)

## Source

- **Incoming source:** the plugin bundle shipped with the `install-anti-slop`
  skill at `C:\Users\Amar\.pi\agent\skills\install-anti-slop` (its
  `scripts/install.mjs` payload), staged and applied on 2026-09-24.
- **Incoming identity:** the skill bundle carries no version or commit of its
  own, so the applied snapshot is identified by its file digest:
  SHA-256 `69fa217ad6262822167aeaa4b4cf9d10bddbba0bd9fcb7f83e1807f3707bdca3`
  over sorted `sha256sum` lines of all 38 files (paths relative to the vendored
  root, LF-normalized by sha256sum input). This is NOT a claim about upstream
  HEAD or any tagged release.
- **Base:** **unknown.** The installation (commit `18b87f3`) carried no
  provenance record, so no pristine pre-install snapshot is recoverable.
  `git log` shows the vendored tree was never modified between `18b87f3` and
  this update, which is why the two-way diff was treated as upstream
  evolution rather than local customization — but this remains a
  conservative port, not a three-way merge.
- **Vendor:** `vendor/eslint-stylistic/` retains its own `UPSTREAM.md`
  (ESLint Stylistic `435c3ea0fd26a5fef9042c4b36b6e165fbbf8d08`) and `LICENSE`.

## Installed plugin paths

- Generic entry point: `index.ts` (registered in `oxlint.config.ts` as
  `jsPlugins: [{ name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" }]`)
- Rules: `rules/` (18), shared helpers: `shared/` (7),
  opt-in Effect entry point: `effect/index.ts` (registered: **no**).

## Adopted changes (2026-09-24 update)

- New rules: `no-array-filter-map`, `no-reduce-accumulator-copy`,
  `require-readable-spacing` (+ `vendor/eslint-stylistic/` backing the last).
- New shared helpers: `array-method.ts`, `function-parameters.ts`,
  `scope.ts`, `type-alias-resolution.ts`.
- Updated files (14): `index.ts`, `effect/index.ts`, and refactors of
  `no-known-value-widening`, `no-module-mocking`, `no-object-parameters`,
  `no-runtime-typeof`, `no-shape-in-symbol-names`, `no-unknown-parameters`,
  `no-unknown-returns`, `no-unknown-type-aliases`, `no-unsafe-dictionary-type`,
  `require-safety-comment-for-type-assertion`, `shared/dictionary-types`,
  `shared/reflect-method` — helper logic extracted into the new `shared/` modules.
- New Effect rules vendored but **unregistered**: `no-manual-effect-error-tag`,
  `no-manual-tag-comparison`, `no-manual-tagged-construction`,
  `prefer-effect-match`. Registered only if `effect` becomes a direct
  package-manifest dependency or the user explicitly requests it.

## Local deviations / policy

- Vendored source is byte-identical to the incoming snapshot; no source
  customizations exist.
- Configuration policy (all generic rules at `"error"`, including
  `oxc/no-accumulating-spread`) lives in `oxlint.config.ts`, not here.
- No local deviations from the incoming bundle at this time.

## Dependencies

- Unchanged: `oxlint` and `@oxlint/plugins` both at `^1.83.0` (installed
  1.83.0; npm latest at update time: 1.85.0). The adopted source requires no
  newer API — no bump was needed, so repository version policy was preserved.

## Verification (2026-09-24)

- The skill bundle ships **no tests** (no `*.test.ts` present), and no upstream
  test suite was retrieved for this update — verification was CLI-probe based:
  each new rule was confirmed to fire (`no-array-filter-map`,
  `no-reduce-accumulator-copy`, `oxc/no-accumulating-spread`,
  `require-readable-spacing`) and pre-existing rules were re-confirmed on
  retained probe files.
- `tsc --noEmit`: pass. `oxlint src`: pass. `oxfmt --check src`: pass.
- Fix/format stability: a second `oxlint --fix` + `oxfmt` pass left the diff
  unchanged (51 blank-line insertions across `constants.ts`, `gimme.ts`,
  `index.ts`, `reddit.ts` from the authorized `require-readable-spacing` cleanup).
- Full-repo `npm run lint` still exits 1 solely from the untracked,
  pre-existing `.linttest/` probe scratch (intentional violations; not owned
  by this update).

## Baseline

- Whole-installation baseline advanced to the incoming snapshot digest above.
- Pending for future updates: a recoverable base (record the bundle digest at
  install time — now done, so the next update can three-way merge against
  this snapshot), and tests for adopted rule semantics.

## Pre-update backup

- Location: `C:\tmp\anti-slop-stage\backup-pre-update\` (full copy of the
  previous vendored tree + previous `oxlint.config.ts` + `git status` capture).
  Staging used for the merge: `C:\tmp\anti-slop-stage\incoming\`.
