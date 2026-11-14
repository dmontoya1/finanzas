# Dashboard redesign (home) — design

Date: 2026-11-13 · Status: draft for approval · Part of ODD feature `ui-redesign` (`odd/tasks/ui-redesign.md`)

## Intent and why

The current home is the generic "three total cards + two charts" template. The user wants a home that is striking, gives value at a glance, and works on mobile and on the web. What they want to see when they open the app, in their words: how the current budget is doing, expenses, income, where most of the money goes, and a button to register an expense quickly. It should feel expressive (strong color, bold motion) and not be bound to the existing structure.

## Decided by the user

- Concept C from the mockups: a bento layout whose centerpiece is a large "how much is left" number on a gradient.
- Palette: emerald → teal → blue gradient, light base (no dark mode in this feature).
- Quick-add is a floating "+" button (as in concept A). The top quick-add bar from concept C is dropped.
- Both mobile and desktop/web matter. The user liked all three desktop mockups and did not pick one.
- Expressive direction: strong color, bold animation.
- The 6-month trend chart is removed from the home ("not necessary").
- In its place: an "Upcoming payments" tile (user picked it from a list of suggestions).

## My calls (not yet approved; flagged so they can be changed)

1. **One responsive structure**, not two layouts. Mobile: hero, rhythm sentence, 2-column bento, bottom tab bar, FAB. Desktop (>= `lg`): left sidebar (concept D1), the same hero and bento in a 4-column grid, the same FAB at bottom-right. A keyboard shortcut (`n`, only when no input is focused) also opens quick-add.
2. **Hero metric.** "Te quedan" = total of monthly budget limits minus this month's expenses in budgeted categories, shown in the view currency. Per-day figure = remaining / days left in the month (today included). Budget limits are converted at the current FX rate (they are not historical); spent amounts use `sumIn` with each transaction's frozen `fx_rate`, as `CLAUDE.md` requires.
   - Over budget: the hero shows "Te pasaste €X" in a warm state (coral-leaning gradient), never a negative-looking "remaining".
   - No budgets defined: the hero shows the month balance (income − expenses) with a CTA to define budgets.
3. **Rhythm sentence** under the hero, reusing `projectMonth()`: "At this pace you will close at €X of €Y" with a positive or warning tone.
4. **Gradient darkened for contrast.** The mockup gradient had a mid stop at 3.38:1 against white, which fails small text. Use `#0a6b45 → #0b8574 → #1a78ad` (white text ratios 6.56 / 4.54 / 4.85). Accent `#0f7a55` is 4.99:1 on the page surface and 5.34:1 on white.
5. **Brand = emerald.** T1's violet `brand` token and `.btn-primary` become emerald. Income/expense amounts keep `positive`/`negative` and always carry a `+`/`−` sign, so meaning never relies on color alone (brand emerald and income green are close).
6. **Quick-add** opens the T1 `Modal` primitive (bottom sheet on mobile, dialog on desktop): amount (autofocus, decimal keypad), type toggle (expense default), category chips, optional note, date (today), FX rate handled as today. Enter submits.
7. **Hero ignores unbudgeted spend**, but when there is spend in categories without a budget the hero shows a small line "€X sin presupuesto", so it never silently disagrees with the Expenses tile.
8. **Past months.** The hero shows "Cerró con €X de margen" and hides the per-day figure and the rhythm sentence. Budget limits are converted at the current FX rate (a limit is not a historical transaction); this is an approximation and must be labeled as such in code comments.
9. **Per-day figure:** hidden when over budget; shown on the last day; "days left" counts today.
10. **Quick-add currency:** defaults to the current view currency, with an always-visible EUR/COP selector, so an amount is never silently recorded in the wrong currency.
11. **Shell scope (T2):** same four sections (Resumen, Movimientos, Categorías, Ajustes). Quick-add is a new component that shares insert logic with `TransactionModal` (no duplicated FX handling); T4 reuses it for editing.
12. **Bento content:** the ring shows total budget used; top spending shows 4 categories; last movements shows 5. Existing `BudgetSection` (per-category bars) stays below the bento. The pending Apple Pay tile shows only when there are pending items. The no-budgets CTA links to `/categorias`.
13. **Category colors** are stable per category (hash of id) from a palette that excludes emerald, the income green and the coral warning color; two top categories may occasionally collide, labels disambiguate.
14. **Upcoming payments tile.** Source: active `recurring_rules` whose `day_of_month` is later than today and that have no transaction yet for the current `recurring_month`. Shows the next 3 by date (name, amount in view currency, "in N days") and a total. It also feeds a second line in the hero: "libre de verdad" = remaining minus upcoming recurring this month, shown only when there is at least one upcoming item. No upcoming rules: the tile is hidden (or shows a CTA to create a recurring payment when none exist at all). Upcoming amounts are converted at the current rate (they are forecasts, not history).

## Goals

- At a glance: remaining budget, "free after upcoming payments", income, expenses, top-spending categories, upcoming recurring payments, last movements, pending Apple Pay items.
- Register an expense in under 5 seconds from the home screen, on mobile and desktop.
- Bold but meaningful motion: hero count-up, staggered bento entrance, progress ring fill, FAB and sheet springs. All of it respects `prefers-reduced-motion`.
- WCAG AA contrast for text; touch targets >= 44px; keyboard reachable; no hover-only actions.
- Loading skeletons and real empty states (no budgets, no transactions).

## Non-goals

- No schema changes and no new data sources. Category colors are derived (hash), not stored.
- No daily-spending chart (concept B) in this feature; it can come later.
- No budget editing from the dashboard (stays in Categories).
- No dark mode.
- No 6-month trend chart on the home (user decision); Recharts should no longer be loaded on the home route.
- No bank connection (Revolut or others). Researched: not viable for an individual project (see below). Fixed payments come from `recurring_rules`; card payments come from the existing Apple Pay webhook.

## Research notes (bank connection)

- Revolut's Open Banking API targets regulated third-party providers: registration needs an eIDAS or OBIE certificate, and Revolut advises seeking legal advice on whether regulation is required. Non-regulated parties may contact Revolut to ask about access. Source: https://developer.revolut.com/docs/guides/build-banking-apps/introduction-to-the-open-banking-api/who-can-access-the-api
- The usual workaround is an aggregator (Plaid, Tink, TrueLayer). A secondary source reports that GoCardless Bank Account Data (ex-Nordigen), the former free option, is closed to new signups; Enable Banking is named as the main self-serve alternative. Secondary sources, not verified against vendor docs. https://www.openbankingtracker.com/guides/free-open-banking-apis
- Not verified: whether any of these supports Revolut for a hobbyist, pricing, and consent renewal cadence. Decision: out of scope.

## Anti-goals (would make this a failure even if it works)

- Two separately maintained layouts for mobile and desktop.
- A home that looks empty or broken when no budgets exist.
- Any historical figure converted with the live FX rate.
- Text that fails contrast, or meaning carried by color alone.

## Approaches considered

1. **Single responsive hero-first bento (chosen).** One component tree, breakpoints change navigation and grid. Least code, consistent behavior. Trade-off: desktop gets no dedicated always-open entry form.
2. **Two layouts: mobile concept C, desktop concept D2 with a fixed "Register expense" side panel.** Best desktop entry ergonomics. Trade-off: roughly double the layout code and two things to keep in sync.
3. **Keep the current structure and only restyle.** Cheapest. Trade-off: does not deliver "something different"; rejected by the user's request.

## Effect on the ODD plan

- T1 tokens: `brand` and `.btn-primary` switch from violet to emerald (done as part of T2); chart palette must keep category colors distinguishable from the emerald brand and income green.
- T2 (shell): bottom tab bar (mobile) + sidebar (desktop) + FAB host + quick-add sheet. Currently on hold for this design's approval.
- T3 (dashboard): implemented per this document.
- T4 (transactions): reuses the same sheet component for edit.

## Left to the builder

- Component split, file names, breakpoints beyond `lg`, bento tile order at `md`.
- Easing and duration values, skeleton shapes.
- How to order quick-add category chips (for example by recent frequency) and how many to show before "+".
- Whether quick-add refactors `TransactionModal` or wraps its insert logic, as long as FX handling is not duplicated.
- Where the pure hero-metric function lives (suggested: `src/lib/money.ts`, next to `budgetProgress` and `projectMonth`).

## Verification

- No test suite exists (TDD disabled for this feature). Per task: `npm run lint` and `npm run build`.
- Visual and interaction checks are manual by the user in the browser (Playwright extension not installed).
