# captura-rapida

Branches: one per PR, each created from `master` after the previous PR is merged. No chain (lesson from `ui-redesign`: stacked PRs stranded work).

## Objective
Make logging household expenses so cheap that a couple keeps the books up to date without thinking about it.

## Why
The user and their wife track expenses in an Excel sheet today and forget to update it. They want the books at hand and exact. The pain is forgetting, not the form: capture must be automatic where possible, one tap where not, and never repeat work (the same merchant must not be classified twice).

## Scope and my calls (the user delegated the choices)
- Usable over profitable: fewer taps, fewer repeated decisions, installable on the phone, reliable automatic capture.
- No bank connection, no AI categorization, no gamification, no new dependencies unless a task says so.
- Out of scope for now: per-person views and filters, accounts/transfers, goals, CSV import from the Excel sheet (needs the sheet's columns; ask later).

## Constraints
- Stack: React 19, Vite, TypeScript, Tailwind v4, framer-motion, Supabase. UI copy in Spanish; identifiers and comments in English; conventional commits in Spanish, no AI attribution.
- Schema changes go in `supabase/migrations/000N_*.sql`, applied manually in the SQL Editor; Edge Function deploys are manual (`supabase functions deploy applepay-webhook --no-verify-jwt`). Prefer no schema change when it works.
- Historical figures keep each transaction's frozen `fx_rate`.
- Respect `prefers-reduced-motion`, touch targets >= 44px, no hover-only actions.

## Resolved mode
- TDD: disabled for UI work (source: CLAUDE.md, no test runner). Pure logic and the Edge Function get real tests: `deno test` is installed (webhook helpers), and pure helpers are verified with scratch asserts or the Playwright harness.
- Checks per task: `npm run lint` and `npm run build` exit 0. UI tasks also run the Playwright + mocked-Supabase harness (outside the repo, session scratchpad; recreate if cleared).
- Native review: enabled by the repository hook; after each work-unit commit run `gentle-ai review assess` and follow `review_due`.

## Tasks
Each task closes with one work-unit commit. Authored-line heuristic ~400 per PR (advisory).

PR 1 `feat/captura-s1-reglas-aprendidas`
- [x] C1 (commits 4b689ef, 1579389; route: delegated writer + 2 inline fixes by the parent) Learn rules from classification: confirming a pending item offers "Recordar este comercio" (on by default, editable pattern); normalizes the merchant into a pattern (uppercase, trimmed, cut at `*`, `#` and trailing codes, min 3 chars), skips duplicates (check-then-insert, no migration), and retroactively classifies other pending items that contain the pattern. Shared confirm component used by the dashboard tile.

PR 2 `feat/captura-s2-pendientes-y-recientes`
- [ ] C2 Pending inbox: "Por clasificar (N)" section at the top of `/movimientos` across all months (not only the month in view), badge with the count on the Movimientos tab and sidebar item, reusing C1's confirm component; realtime like `useTransactions`.
- [ ] C3 QuickAdd memory: category chips ordered by recent use, remembers the last currency; no schema change.

PR 3 `feat/captura-s3-instalable`
- [ ] C4 Installable PWA: web manifest, PNG icons (180/192/512 + maskable) rendered from `favicon.svg`, iOS meta tags, `theme-color`, `vercel.json` SPA rewrite. No service worker (not needed to install, avoids stale-cache bugs).
- [ ] C5 In-app "Configurar captura" guide in Settings: add to Home Screen, Apple Pay Shortcut setup, and a daily reminder via an iOS Personal Automation.

PR 4 `feat/captura-s4-webhook-confiable`
- [ ] C6 Reliable webhook: dedupe window for retries, optional `date` (fixes UTC mis-dating late evening), optional `who` mapped to a household member (`user_id`) so a partner's Shortcut is attributed, robust amount parsing ("45.000" COP, "1.234,50" EUR), helpers covered by `deno test`, README Shortcut section updated.

## Delivery
- Strategy: `ask-on-risk`. Forecast ~900 authored lines across 4 PRs, each planned under ~400; no chain strategy needed because each PR starts from `master` after the previous one is merged. Push, PR creation and merge stay the user's decision.

## Progress
- Branch `feat/captura-s1-reglas-aprendidas` created from `master` (909eb26). Tasks: 1/6 done.
- C1 delivered: pure helpers in `src/lib/merchantRules.ts`, `classifyPending` in `src/features/transactions/`, pending tile with category chips + "Otra…" select, undo toast hosted in `Dashboard`. UX: one tap classifies, learns the rule and reclassifies other matching pending items; "Deshacer" reverts all of it.
- Parent review of the writer's code found and fixed two issues in commit 1579389: (1) a `*` merchant like "UBER *TRIP" produced the bare pattern "TRIP", which would silently match unrelated merchants in the webhook's "contains" matching; the pattern now keeps the prefix ("UBER *TRIP"); (2) the retroactive bulk update now only touches rows still in `pending_review`, so a partner's concurrent classification is not overwritten.
- Known limits: the pending tile only shows the month in view (C2 fixes it); the Settings rules list refreshes on page open, not live; a rule created from a merchant with several internal spaces is normalized to single spaces while the webhook compares the raw text, so such a rule may never match; the "Otra…" select path is covered by a screenshot, not by an assertion.
- Native review: `gentle-ai review assess` on 909eb26..1579389 gave medium, 253 lines, `review_due: false` (`under_budget`); pending in the slice until it reaches the budget.

## Verification evidence
- Base: `master` 909eb26, lint and build green, Vercel status success.
- C1 (parent re-run): `npm run lint` exit 0; `npm run build` exit 0 (663.28 kB); 12 scratch asserts of `suggestPattern`/`matchesPattern`/`hasRuleFor` pass; Playwright + mocked Supabase `verify-c1.mjs` 21 PASS, 0 FAIL (PATCH/POST payloads, existing-rule no-POST, no pattern for "AB", undo reverts PATCH + DELETE, forced 500 shows an error toast and creates no rule, 44px targets, no overflow at 390 and 1280). Zero requests to the real backend.
- Not proven by the mock: RLS, realtime, real Apple Pay merchant strings.

## Next step
C2 and C3 go in PR 2 after PR 1 is merged. For PR 1, the user decides push and merge.
