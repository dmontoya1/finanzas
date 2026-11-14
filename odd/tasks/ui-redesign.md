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
- [ ] T2 Shell: mobile bottom tab bar with icons + FAB for "Nuevo", desktop header/nav refresh, page transitions, themed loading screen (`App.tsx`). Files: `Layout.tsx`, `MonthPicker.tsx`, `App.tsx`.
- [ ] T3 Dashboard: hero balance with gradient glow and count-up, stat cards, skeletons, chart restyle using tokens (donut with category colors, area chart), budget bars with animated fill and threshold colors, empty states. Files: `Dashboard.tsx`, `BudgetSection.tsx`.
- [ ] T4 Transactions: list rows with category color chips, always-reachable actions, bottom-sheet modal on mobile, undo toast instead of `confirm()`, error handling on mutations. Files: `TransactionsPage.tsx`, `TransactionModal.tsx`.
- [ ] T5 Categories + Settings: color per category UI, card grids with motion, copy-field component with clipboard failure path, recurring/merchant forms on shared primitives. Files: `CategoriesPage.tsx`, `SettingsPage.tsx`.
- [ ] T6 Auth + Onboarding: labeled fields on shared primitives, expressive entrance animation. Files: `AuthPage.tsx`, `Onboarding.tsx`.
- [ ] T7 Polish and perf: lazy-load Recharts routes (bundle is 1.05 MB), reduced-motion audit, contrast pass, `theme-color` fix in `index.html`, font preload.

## Delivery
- Forecast: ~1500 authored changed lines (exceeds the ~400 budget). Strategy: `ask-on-risk`. Chain strategy: `feature-branch-chain` (user choice): slice PRs target the integration branch `feat/ui-redesign`, which merges to `master` once at the end. Push, PR creation and merge stay the user's decision.
- Slice branches (each branches off `feat/ui-redesign`, PR back into it):
  - S1 `feat/ui-redesign-s1-foundation`: T1
  - S2 `feat/ui-redesign-s2-shell-dashboard`: T2, T3
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

## Next step
User checks the light theme in the browser (dev server on :5173); then T2 (shell) per the slice plan.
