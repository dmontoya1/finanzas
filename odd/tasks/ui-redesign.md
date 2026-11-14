# ui-redesign

Branch: `feat/ui-redesign` (from master, after 3 signed commits: docs, lint fix, lockfile)

## Objective
Redesign the finanzas UI: expressive direction, strong color, bold animation, more usable.

## Direction (decided)
LIGHT base (user decision, replaces the previous dark "Ledger nocturno" theme). Warm off-white surface with strong, saturated accents; expressive color and bold motion: per-category colors, gradient hero balance, count-up numbers, staggered page transitions and spring micro-interactions. Keep Fraunces/Albert Sans/JetBrains Mono unless contrast or legibility demands a change. Memorable detail: the balance as a large animated hero number with a gradient wash that shifts green (positive) to coral (negative). Contrast: text and accents must meet WCAG AA on the light surface (mint #7fd8a4 and amber #e8b454 fail as text on light; derive deeper accent shades for text, keep bright ones for fills and charts). Remove the dark-only effects (grain overlay at z-50, mint/amber body glows) or re-tune them for light.

## Constraints
- Stack: React 19, Tailwind v4 (`@theme` in `src/index.css`), framer-motion ^12 (already installed), Recharts 3. No new UI dependency except `lucide-react` for icons (replaces emoji icons; needed for accessible icon buttons). Decision recorded; revisit if the user objects.
- Honor `prefers-reduced-motion` everywhere.
- No business-logic changes. `lib/`, `context/`, hooks stay untouched except `useTransactions` consumers.
- UI copy in Spanish (project is Spanish); code identifiers English; commits conventional, no AI attribution.

## Resolved mode
- TDD: disabled. Source: CLAUDE.md ("No test suite exists yet"). Runner: none.
- Checks per task: `npm run lint` and `npm run build` must pass. Visual verification is manual by the user (Playwright extension not installed).
- Native review (RDD): not enabled by the user; not run.

## Usability gaps to close (from mapping)
No skeleton/loading states; native `confirm()` for deletes, no undo; icon buttons without aria-label; modal without role=dialog/Escape/focus trap/label association; no `focus-visible` on buttons/links; hover-only row actions not keyboard reachable; tiny touch targets; no mobile bottom nav or FAB; no reduced-motion handling; chart colors are raw hex duplicating tokens; ~12 repeated `card p-5`, ~13 repeated label classes, ~8 btn-primary, ~10 select overrides.

## Tasks
Each task closes with one work-unit commit on this branch. Authored-line heuristic ~400 per task (advisory).

- [x] T1 (commit edc01fd, route: delegated writer) Foundation: tokens (saturated palette, per-category palette, semantic colors, gradients, motion tokens), global focus-visible, reduced-motion, 16px inputs; shared primitives `Button`, `Field`, `Card`, `Modal` (dialog a11y: role, Escape, focus trap, labels), `Skeleton`, `AnimatedNumber`; add `lucide-react`. Route: delegated writer (2+ non-trivial files).
- [x] T2 (commits e87e196, 1c6b913, 8d6b63b, d955111, 9c4447b on `feat/ui-redesign-s2-shell`; route: delegated writers) Shell: emerald tokens, hero/upcoming logic in `money.ts`, shared `saveTransaction`, `QuickAdd`, sidebar + bottom tabs + FAB + `n` shortcut. Done per `docs/superpowers/plans/2026-11-13-dashboard-redesign.md` Tasks 1-5. Page transitions per plan; themed loading screen in `App.tsx` not done.
- [x] T3 (commits bf61fec, bf556dd on `feat/ui-redesign-s2b-dashboard`; route: delegated writers) Dashboard: `Hero` with budget-remaining summary, `useRecurringRules`, bento tiles (income/expense, top spending, upcoming, pending, recent). Recharts removed from `src`. `BudgetSection` untouched (animated fill and threshold colors not done; carry to T7).
- [x] T4 (commit 079a454 on `feat/ui-redesign-s3-transactions-settings`; route: delegated writer) Transactions: category chips, visible 44px actions, deferred-delete undo toast (new `ui/Toast.tsx`, 5s, flush on unmount), mutation errors surfaced, `TransactionModal` on shared primitives with `inputMode="decimal"`. +206/-112.
- [x] T5 (commits 60a662a, d43323b, same branch; route: delegated writer) Categories: card grid with derived color, undo-toast delete, budget fields on primitives (no skeleton: `AppContext` has no per-list loading flag). Settings: `ui/CopyField.tsx` (clipboard failure path), webhook secret now masked by default, recurring-rule delete via Modal (deferred undo unsafe: monthly generator), merchant/recurring forms on primitives. Larger than the ~400 heuristic: two inline-markup pages rewritten.
- [ ] T6 Auth + Onboarding: labeled fields on shared primitives, expressive entrance animation. Files: `AuthPage.tsx`, `Onboarding.tsx`.
- [ ] T7 Polish and perf: lazy-load Recharts routes (bundle is 1.05 MB), reduced-motion audit, contrast pass, `theme-color` fix in `index.html`, font preload.

## Delivery
- Forecast: ~1500 authored changed lines (exceeds the ~400 budget). Strategy: `ask-on-risk`. Chain strategy: `feature-branch-chain` (user choice): slice PRs target the integration branch `feat/ui-redesign`, which merges to `master` once at the end. Push, PR creation and merge stay the user's decision.
- Slice branches (each branches off `feat/ui-redesign`, PR back into it):
  - S1 `feat/ui-redesign-s1-foundation`: T1
  - S2 split in two (chain): A `feat/ui-redesign-s2-shell` (T2) then B `feat/ui-redesign-s2b-dashboard` (T3, branched from A's tip)
  - S3 `feat/ui-redesign-s3-transactions-settings`: T4, T5
  - S4 `feat/ui-redesign-s4-auth-polish`: T6, T7
- Commits per slice: filled in as tasks close.

## Progress
- Branch created; lint/build green at base. Tasks: 1/7 done (T1 on `feat/ui-redesign-s1-foundation`, commit edc01fd, +304/-41).
- T1 delivered: light tokens with legacy aliases (removed in T7), `src/lib/theme.ts` (chart palette), `src/lib/categoryColor.ts` (hash-derived, no schema change), primitives in `src/components/ui/` (Button, Field, Card, Modal, Skeleton, AnimatedNumber), `lucide-react@1.72.0`. Primitives are unused until T2-T6.
- Known T1 risks (unverified in a browser): `bg-ink-950/80` modal backdrops are now light overlays; inputs on `bg-ink-950/60` rows may lose contrast; chart fills `income` #1fb86b and `expense` #ff6b4a are below 3:1 on white and need adjacent labels or deeper shades.

## Verification evidence
- Base (before T1): `npm run lint` clean, `npm run build` ok (bundle 1,048.61 kB).
- After T1 (parent re-run): `npm run lint` exit 0; `npm run build` ok, bundle 1,048.61 kB (unchanged, primitives unused), CSS 24.85 kB. Commit signed (`Good signature`).
- Contrast (writer-reported, WCAG, on page #faf7f0): text 15.59, text-soft 7.25, text-faint 5.31, positive 5.05, negative 5.11, warning 5.92, brand 5.72.

- After T2/T3 (parent re-run): `npm run lint` exit 0; `npm run build` ok, JS bundle 688.98 kB (was 1,048.61 kB), CSS 28.95 kB; `rg recharts src` no matches (dependency stays in `package.json` until T7). Dashboard slice: +285/-150 over bf61fec and bf556dd.
- Unverified in a browser: tabs/sidebar active state, FAB and `n` shortcut, realtime refresh after quick-add, Hero modes (remaining/over/balance/closed), over-budget gradient and warning tone, bento layouts (2 vs 4 cols), empty month message, pending-tile confirm, reduced motion, signed amounts in EUR and COP.
- Known gaps: Hero shows a dummy-summary placeholder until the FX rate resolves; empty-month message cannot open quick-add (state lives in `Layout`); `.atl/` untracked, not committed.

- After T4/T5 (parent re-run): `npm run lint` exit 0; `npm run build` ok, JS 695.33 kB, CSS 27.73 kB.
- Unverified in a browser (S3): undo toast flows (undo, 5s expiry, navigate away, forced error), modal bottom sheet and focus, fx_rate preserved on edit, categories stagger/delete/budget blur-save/duplicate error, CopyField on HTTPS vs insecure context, secret mask toggle, recurring-delete modal, toast vs bottom tab bar/FAB overlap, reduced motion.

## Next step
User checks S1-S3 in the browser (:5173); then S4 (T6 auth/onboarding, T7 polish: lazy-load routes, `BudgetSection` animated bars, themed loading screen, remove legacy aliases and `recharts` dependency, contrast pass, `theme-color`, font preload). Push, PRs and merges stay the user's decision.
