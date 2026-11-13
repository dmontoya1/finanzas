# Dashboard redesign + shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved emerald, hero-first dashboard with a floating quick-add button, a responsive shell (sidebar on desktop, bottom tabs on mobile) and an "upcoming payments" tile.

**Architecture:** One responsive component tree. Pure logic (hero metric, upcoming recurring) lives in `src/lib/money.ts` and is checked with a scratch assert script; UI is composed from the T1 primitives in `src/components/ui`. Quick-add and `TransactionModal` share one save function so FX handling is not duplicated.

**Tech Stack:** React 19, TypeScript, Tailwind v4 (`@theme` in `src/index.css`), framer-motion ^12, lucide-react ^1.72, date-fns ^4, Supabase JS. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-13-dashboard-redesign-design.md` · ODD document: `odd/tasks/ui-redesign.md` (TDD disabled, no test runner; per-task checks are `npm run lint` and `npm run build`).

## Global Constraints

- Gradient (white text >= 4.5:1): `#0a6b45 → #0b8574 → #1a78ad`. Brand accent `#0f7a55` (4.99:1 on `#faf7f0`, 5.34:1 on white). Brand 2 `#1a78ad`.
- Income/expense amounts always carry a `+`/`−` sign; meaning never relies on color alone.
- Historical figures use each transaction's frozen `fx_rate` via `sumIn`/`convert`. Budget limits and upcoming payments (forecasts) use the current rate from `getEurCopRate()` (COP per 1 EUR).
- UI copy in Spanish; identifiers and comments in English. Respect `prefers-reduced-motion` (T1 primitives already do). Touch targets >= 44px. No hover-only actions.
- Quick-add: amount autofocus with decimal keypad, type toggle (expense default), category chips, optional note, date (today), always-visible EUR/COP selector defaulting to the view currency, Enter submits.
- Routes stay `/`, `/movimientos`, `/categorias`, `/ajustes` with labels Resumen, Movimientos, Categorías, Ajustes. No-budgets CTA links to `/categorias`.
- No schema changes, no new dependencies, no dark mode, no 6-month trend chart on the home, no bank connection.
- Commits: conventional, in Spanish like the existing history, no AI attribution lines. Work-unit commit per task; push/PR/merge stay the user's decision.
- Branches (feature-branch-chain): slice A `feat/ui-redesign-s2-shell` (Tasks 1-5), created from the current tip of `feat/ui-redesign-s1-foundation`; slice B `feat/ui-redesign-s2b-dashboard` (Tasks 6-8), created from slice A's tip. Each slice PRs into `feat/ui-redesign`.
- Scratch scripts live in `/private/tmp/claude-501/-Users-daniel-projects-finanzas/afa5b1b8-1b82-4b5f-bbb7-0f3def398324/scratchpad` and are never committed.

## Review Focus

Failure modes the spec implies; each has a pinned check in the owning task.

1. COP budget viewed in EUR (and the reverse), including when the FX API falls back to `FALLBACK_RATE` — Task 2.
2. Spent exactly equal to the limit shows "remaining 0", not "over" — Task 2.
3. Month edges: rules on day 28, rules due today, the last day of the month, February (`daysInMonth` 28) — Task 2.
4. Comma decimals typed on a phone ("12,5", "1.234,50"), zero, negative and empty amounts in quick-add — Task 3.
5. Uncategorized expenses and expense categories without a budget must show in the "sin presupuesto" line and never inside "remaining" — Task 2.
6. The `n` shortcut must not fire while typing in an input, or with a modifier key held — Task 5.

## File Structure

- Modify: `src/index.css`, `src/lib/theme.ts`, `src/lib/money.ts`, `src/components/Layout.tsx`, `src/features/transactions/TransactionModal.tsx`, `src/features/dashboard/Dashboard.tsx`
- Create: `src/features/transactions/saveTransaction.ts`, `src/features/transactions/QuickAdd.tsx`, `src/features/dashboard/useRecurringRules.ts`, `src/features/dashboard/Hero.tsx`, `src/features/dashboard/BentoTiles.tsx`
- `BudgetSection.tsx` stays, rendered below the bento.

---

### Task 1: Emerald brand tokens and chart palette

**Files:** Modify `src/index.css`, `src/lib/theme.ts`

**Interfaces:**
- Produces: CSS tokens `--color-brand: #0f7a55`, `--color-brand-2: #1a78ad`; utility classes `.hero-gradient` (the three Global Constraints stops, 135deg) and `.hero-gradient-over` (warm over-budget gradient, white text >= 4.5:1 at every stop); `chartPalette` (10 hex strings, `as const`) in `theme.ts` with the same export name and shape as today.

- [ ] **Step 1:** In `src/index.css` set the two brand tokens, make `.btn-primary` use them (white text), and add `.hero-gradient` and `.hero-gradient-over`. For the warm gradient pick three red-orange stops and tune them until the contrast check in Step 3 passes.
- [ ] **Step 2:** In `src/lib/theme.ts` replace the palette so that no entry is in the green-teal hue range (about 120°-190°) nor coral-red (about 0°-20°), every entry has >= 3:1 against `#ffffff`, and all 10 are mutually distinguishable. Keep `chartColors` unchanged.
- [ ] **Step 3:** Write a scratch script `check-contrast.mjs` that prints the WCAG ratio of white against each gradient stop (both gradients) and of each `chartPalette` entry against white, and exits non-zero if a gradient stop is below 4.5 or a palette entry below 3.0. Run `node <scratchpad>/check-contrast.mjs`. Expected: exit 0, ratios printed.
- [ ] **Step 4:** Run `npm run lint && npm run build`. Expected: both exit 0.
- [ ] **Step 5:** Commit `feat(ui): tokens esmeralda, degradados del héroe y paleta de gráficos`.

---

### Task 2: Hero and upcoming-payments logic

**Files:** Modify `src/lib/money.ts`

**Interfaces:**
- Consumes: `Category`, `Transaction`, `RecurringRule`, `Currency` from `src/types.ts`; `sumIn`, `convert` from the same file.
- Produces:
```ts
export interface HeroSummary {
  mode: 'remaining' | 'over' | 'balance' | 'closed'
  /** remaining (>= 0) | overspent (> 0) | income - expenses | signed margin for a past month */
  amount: number
  limit: number               // total budgets in view currency; 0 when no category has a budget
  spent: number               // expenses in categories that have a budget
  usedRatio: number           // spent / limit, 0 when limit is 0
  perDay: number | null       // only current month and mode 'remaining'; amount / daysLeft
  projectedSpent: number | null // current month only: spent / dayOfMonth * daysInMonth
  unbudgetedSpent: number     // expenses in categories without a budget plus uncategorized
}
export function heroSummary(a: {
  categories: Category[]; monthTxs: Transaction[]; view: Currency; rate: number
  isCurrentMonth: boolean; dayOfMonth: number; daysInMonth: number
}): HeroSummary

export interface UpcomingPayment { rule: RecurringRule; dueDate: string; daysUntil: number; amountInView: number }
export function upcomingRecurring(a: {
  rules: RecurringRule[]; generatedRuleIds: ReadonlySet<string>; today: Date; view: Currency; rate: number
}): UpcomingPayment[]
```
- Behavior pinned by the spec: `daysLeft = daysInMonth - dayOfMonth + 1`; budget limits converted at `rate` (EUR to COP multiplies, COP to EUR divides); `over` when `spent > limit` in the current month (equal is `remaining` 0); no budgets means `mode: 'balance'`; past month with budgets means `mode: 'closed'`; `upcomingRecurring` keeps active rules with `day_of_month > today.getDate()` whose id is not in `generatedRuleIds`, sorted by day, `dueDate` as `yyyy-MM-dd` in today's month, `daysUntil = day_of_month - today.getDate()`.

- [ ] **Step 1:** Write the scratch script `check-money.ts` (imports `/Users/daniel/projects/finanzas/src/lib/money.ts`, run with `node`; if Node cannot strip the types of an import, report it instead of adding a dependency) asserting, with view EUR and rate 4600, dayOfMonth 14, daysInMonth 30:
  - Categories: A budget 500 EUR, B budget 920000 COP, C no budget. Expenses (fx_rate 4600): A 310 EUR, B 230000 COP, C 40 EUR, one uncategorized 0 amount ignored. Expect `limit` 700, `spent` 360, `amount` 340, `mode` 'remaining', `unbudgetedSpent` 40, `perDay` 20, `projectedSpent` ≈ 771.43.
  - Spent 800 in A: `mode` 'over', `amount` 100. Spent exactly 700: `mode` 'remaining', `amount` 0.
  - Same data with view COP: `limit` 3,220,000.
  - No budgets: `mode` 'balance', `amount` income minus expenses. Past month (`isCurrentMonth` false): `mode` 'closed', `amount` 340, `perDay` null, `projectedSpent` null.
  - `upcomingRecurring` with today 2026-11-14: rules day 20 (40 EUR), day 5, day 14, day 28 (4,600,000 COP), plus a generated id for the day-20 rule in a second call. Expect `[20, 28]` with `daysUntil` `[6, 14]`, `amountInView` 40 and 1000; second call returns only day 28. February case: `daysInMonth` 28, dayOfMonth 28 gives `daysLeft` 1.
  Run it. Expected: it fails because the functions do not exist.
- [ ] **Step 2:** Implement `heroSummary` and `upcomingRecurring` in `src/lib/money.ts` with the exact signatures above, doc comments in English, no new imports beyond date helpers already used in the project.
- [ ] **Step 3:** Run the scratch script. Expected: prints `ok`, exit 0. Run `npm run lint && npm run build`. Expected: exit 0.
- [ ] **Step 4:** Commit `feat(money): resumen del héroe y próximos pagos recurrentes`.

---

### Task 3: Shared save function

**Files:** Create `src/features/transactions/saveTransaction.ts`; Modify `src/features/transactions/TransactionModal.tsx`

**Interfaces:**
- Consumes: `supabase`, `getEurCopRate`.
- Produces:
```ts
export interface TransactionInput {
  householdId: string; userId: string; type: TxType; amount: number; currency: Currency
  fxRate: number | null            // null means fetch getEurCopRate()
  categoryId: string | null; description: string | null; date: string   // yyyy-MM-dd
}
export async function saveTransaction(input: TransactionInput, existingId?: string): Promise<{ error: string | null }>
export function parseAmountInput(raw: string): number | null   // "12,5" -> 12.5, "1.234,50" -> 1234.5, rejects <= 0, NaN, empty
```
- The payload object is the one `TransactionModal` builds today (`status: 'confirmed'`, `description: description || null`, `occurred_at: date`, no `merchant`/`source`/`recurring_*` fields); update when `existingId` is given, insert otherwise.

- [ ] **Step 1:** Write the scratch script `check-amount.ts` asserting `parseAmountInput` for `"12,5"`→12.5, `"1.234,50"`→1234.5, `"12.5"`→12.5, `"1,234.50"`→1234.5, `"0"`, `"-3"`, `""`, `"abc"` → null. Run it. Expected: fails.
- [ ] **Step 2:** Implement `saveTransaction.ts`. Treat the last `,` or `.` as the decimal separator when followed by 1-2 digits; otherwise strip separators.
- [ ] **Step 3:** Change `TransactionModal.tsx` to build a `TransactionInput` and call `saveTransaction`, keeping its behavior and UI identical (same error display, same `onSaved`).
- [ ] **Step 4:** Run the scratch script (expect `ok`), then `npm run lint && npm run build` (expect exit 0). Manually check in the browser at `/movimientos`: create, edit and delete a transaction still work.
- [ ] **Step 5:** Commit `refactor(transacciones): extraer saveTransaction y parseo de montos`.

---

### Task 4: Quick-add component

**Files:** Create `src/features/transactions/QuickAdd.tsx`

**Interfaces:**
- Consumes: `Modal`, `Field`, `Button` from `src/components/ui`; `useApp()` (`household`, `session`, `categories`, `viewCurrency`); `saveTransaction`, `parseAmountInput`; `categoryColor`.
- Produces: `export function QuickAdd(props: { open: boolean; onClose: () => void; onSaved: () => void }): JSX.Element`

- [ ] **Step 1:** Build the form inside `Modal` (title "Nuevo movimiento"): amount text input with `inputMode="decimal"` and autofocus, type toggle (gasto/ingreso, gasto default), EUR/COP segmented selector defaulting to `viewCurrency`, category chips for the selected type (colored dot from `categoryColor(category.id)`, emoji and name; the first 8 by name, more behind a "Más" toggle), optional note, date defaulting to today, inline error text, submit button with `loading`. Enter submits; success calls `onSaved()` then `onClose()` and resets the form.
- [ ] **Step 2:** Validate with `parseAmountInput`; show "Introduce un importe mayor que 0" for null. FX rate: always `null` (fetched at save).
- [ ] **Step 3:** Run `npm run lint && npm run build`. Expected: exit 0 (component is not mounted yet).
- [ ] **Step 4:** Commit `feat(transacciones): componente de gasto rápido`.

---

### Task 5: Shell (sidebar, bottom tabs, FAB, shortcut)

**Files:** Modify `src/components/Layout.tsx`

**Interfaces:**
- Consumes: `QuickAdd`; `useApp()`; `CurrencyToggle` stays exported from this file.
- Produces: `Layout({ children })` unchanged signature.

- [ ] **Step 1:** Replace the top pill nav. At `lg` and above: a left sidebar with the app name, the four items (icons `LayoutDashboard`, `ArrowLeftRight`, `Tags`, `Settings` from lucide-react plus label) and a sliding active pill (`layoutId`). Below `lg`: a fixed bottom tab bar with the same four items (icon + label, >= 44px targets) and safe-area padding.
- [ ] **Step 2:** Header keeps the household name and `CurrencyToggle`. Add a floating "+" `Button` (aria-label "Añadir movimiento", `Plus` icon, spring tap) fixed bottom-right (above the tab bar on mobile). It opens `<QuickAdd>`.
- [ ] **Step 3:** Keyboard shortcut: pressing `n` opens quick-add only when the focused element is not an `input`, `textarea`, `select` or contenteditable, no modifier key is held, and no dialog is open.
- [ ] **Step 4:** Add a page transition (fade + small rise keyed on the pathname) honoring reduced motion. Keep `max-w-6xl` content width and bottom padding so the tab bar never covers content.
- [ ] **Step 5:** Run `npm run lint && npm run build` (expect exit 0). Manual browser check: tabs and sidebar highlight the right route; FAB opens the sheet (bottom sheet on a narrow window, dialog on wide); `n` opens it from `/` and does not fire while typing in a field; saving shows the new movement on `/movimientos` without a reload (realtime). If it does not appear, report it — do not add polling.
- [ ] **Step 6:** Commit `feat(ui): shell con barra lateral, pestañas inferiores y botón flotante`.

---

### Task 6: Hero and dashboard data

**Files:** Create `src/features/dashboard/useRecurringRules.ts`, `src/features/dashboard/Hero.tsx`; Modify `src/features/dashboard/Dashboard.tsx`

**Interfaces:**
- Consumes: `heroSummary`, `upcomingRecurring`, `getEurCopRate`, `AnimatedNumber`, `Skeleton`, `formatMoney`, `useTransactions`.
- Produces:
```ts
export function useRecurringRules(householdId: string): { rules: RecurringRule[]; loading: boolean }   // active rules only; setState only inside .then callbacks
export function Hero(props: {
  summary: HeroSummary; view: Currency; monthLabel: string
  upcomingTotal: number | null   // sum of amountInView of upcoming payments, or null when none
  loading: boolean
}): JSX.Element
```

- [ ] **Step 1:** Implement `useRecurringRules` (select `*` from `recurring_rules` where `household_id` and `active`).
- [ ] **Step 2:** Implement `Hero`: gradient card (`.hero-gradient`, or `.hero-gradient-over` for mode `over`), large `AnimatedNumber` of `summary.amount` with the mode label ("Te quedan para gastar", "Te pasaste", "Balance del mes", "Cerró con … de margen"), the per-day line "≈ €X al día · N días", the rhythm sentence "Al ritmo actual cerrarás en €X de €Y" (warning tone when `projectedSpent > limit`), the "libre de verdad" line when `upcomingTotal` is not null (amount minus upcoming total), the "€X sin presupuesto" line when `unbudgetedSpent > 0`, a progress ring of `usedRatio`, and a CTA link to `/categorias` when `mode` is `balance`. `Skeleton` while `loading`.
- [ ] **Step 3:** In `Dashboard.tsx` keep the existing month state, `useTransactions` range and pending logic. Compute `rate` with `getEurCopRate()` (state set inside a `.then`), `summary = heroSummary({...})` for the selected month, `generatedRuleIds` from `monthTxs` where `recurring_month === monthKey`, and the upcoming list only for the current month. Render `MonthPicker`, `Hero`, then the existing sections unchanged for now. Remove the trend memo and the area chart.
- [ ] **Step 4:** Run `npm run lint && npm run build` (expect exit 0). Manual browser check: current month shows "Te quedan…"; a past month shows "Cerró con…" and no per-day line; a month without budgets shows the balance and the CTA.
- [ ] **Step 5:** Commit `feat(dashboard): héroe con presupuesto restante y próximos pagos`.

---

### Task 7: Bento tiles

**Files:** Create `src/features/dashboard/BentoTiles.tsx`; Modify `src/features/dashboard/Dashboard.tsx`

**Interfaces:**
- Produces: exported components `IncomeExpenseTiles(props: { income: number; expense: number; view: Currency })`, `TopSpending(props: { transactions: Transaction[]; categories: Category[]; view: Currency })` (top 4 by `convert`, colored with `categoryColor`, segmented bar plus list), `UpcomingTile(props: { items: UpcomingPayment[]; view: Currency })` (next 3 with name, amount, "en N días", total; renders nothing when empty), `PendingTile(props: { items: Transaction[]; categories: Category[]; onConfirm: (t: Transaction, categoryId: string) => void })` (renders nothing when empty; keeps today's confirm-with-select behavior), `RecentTransactions(props: { transactions: Transaction[]; categories: Category[]; view: Currency })` (last 5, signed amounts with +/−).

- [ ] **Step 1:** Implement the five components with `Card` and staggered entrance animation (`animate` prop), 2-column grid on mobile and 4-column on `lg`; amounts always signed.
- [ ] **Step 2:** In `Dashboard.tsx` replace the three summary cards, the donut and the pending list with these tiles; keep `<BudgetSection>` below the bento and keep `confirmTx` as is. Empty states: no transactions this month shows a friendly message with an "Añadir" prompt, not blank tiles.
- [ ] **Step 3:** Run `npm run lint && npm run build`. Expected: exit 0.
- [ ] **Step 4:** Commit `feat(dashboard): bento con ingresos, gastos, top de gastos y movimientos`.

---

### Task 8: Cleanup and verification

**Files:** Modify `src/features/dashboard/Dashboard.tsx` (only if dead code remains), `odd/tasks/ui-redesign.md`

- [ ] **Step 1:** Confirm no file under `src` imports `recharts` (`rg "recharts" src`). Expected: no matches. Do not remove the dependency from `package.json` in this task; note it for T7 of the ODD plan.
- [ ] **Step 2:** Run `npm run lint && npm run build`. Expected: exit 0 and a JS bundle clearly smaller than 1,048.61 kB (Recharts left the home route's imports); record the new size.
- [ ] **Step 3:** Check the Review Focus list manually or with the scratch scripts and record each result.
- [ ] **Step 4:** Update `odd/tasks/ui-redesign.md`: mark T2 and T3 as done with their commit hashes, record the new bundle size, the slice branches, and what remains unverified in the browser. Commit `docs: marcar T2 y T3 del rediseño`.
