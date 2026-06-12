# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build
npm run lint      # ESLint
```

No test suite exists yet.

## Environment

Copy `.env.example` → `.env` and fill in:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Architecture

Personal/household bi-currency budget app (COP ⇄ EUR). Stack: React 19, Vite, TypeScript, Tailwind v4, Framer Motion, Recharts, Supabase (Auth + DB + Realtime + Edge Functions).

### App flow

`App.tsx` gates routes on three states in order: `loading` → `!session` → `!household` → main app. Global state lives in `src/context/AppContext.tsx` (`session`, `household`, `categories`, `viewCurrency`).

### Source layout

```
src/
  lib/            # supabase client, fx rate (12h cache + fallback), money conversion
  context/        # AppProvider: session, household, categories, view currency
  features/       # auth · onboarding · dashboard · transactions · categories · settings
  components/     # Layout, MonthPicker (shared UI)
  types.ts        # shared types: Household, Category, Transaction, Currency, TxType, TxStatus
```

### Multi-currency model

Every `Transaction` stores `fx_rate` (COP per 1 EUR at the time of the transaction). This freezes history — if the rate changes later, past figures stay correct. All conversion goes through `src/lib/money.ts`:

- `convert(tx, viewCurrency)` — single transaction to view currency using its own `fx_rate`
- `sumIn(txs, viewCurrency)` — aggregate totals
- Never convert using a live rate when displaying historical data.

### Supabase schema

Main tables: `households`, `household_members`, `categories`, `merchant_rules`, `transactions`. RLS is enabled on all tables. Membership is checked via a `security definer` function `is_member(uuid)` to avoid infinite recursion in policies.

Joining a household uses the `join_household(code, name)` RPC (security definer) — do not expose the `households` table directly for invite-code lookups.

### Apple Pay webhook

`supabase/functions/applepay-webhook/index.ts` — Deno edge function. iOS Shortcut POSTs `{ amount, merchant, card }` with `x-webhook-secret` header. The function:

1. Authenticates via `households.webhook_secret` (service role, bypasses RLS)
2. Parses European/Colombian amount formats (`parseAmount`)
3. Auto-categorizes via `merchant_rules` patterns; falls back to `status: 'pending_review'`
4. Inserts the transaction with the live EUR/COP rate from open.er-api.com

Deploy: `supabase functions deploy applepay-webhook --no-verify-jwt`

### Realtime

`useTransactions` (in `src/features/transactions/useTransactions.ts`) subscribes to `postgres_changes` on the `transactions` table so Apple Pay purchases appear on all household devices without a reload. The `transactions` table must be added to the `supabase_realtime` publication.

### FX rates

`src/lib/fx.ts` fetches from `open.er-api.com` (no API key needed), caches in `localStorage` for 12 hours, falls back to `FALLBACK_RATE = 4600` COP/EUR. The same fallback constant is duplicated in the Edge Function.
