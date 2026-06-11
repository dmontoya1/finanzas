# Cuentas · Presupuesto COP ⇄ EUR

App de control de presupuesto bi-moneda (pesos colombianos y euros) para uso personal/familiar.
Stack: **React 19 + Vite + TypeScript + Tailwind v4 + Framer Motion + Recharts + Supabase**.

## Características

- Ingresos y gastos en **COP y EUR**, cada transacción guarda la **tasa histórica** del día (COP por EUR), así el dashboard puede consolidarse en cualquier moneda sin reescribir historia.
- **Toggle EUR/COP** global en el dashboard.
- Dashboard: ingresos, gastos, balance del mes, donut por categoría, tendencia de 6 meses.
- **Hogar compartido**: tu pareja se une con un código de invitación. Realtime: lo que registra una persona aparece al instante en el dispositivo de la otra.
- **Apple Pay → registro automático** vía Atajo de iOS + Edge Function, con reglas de categorización por comercio y bandeja de "pendientes de clasificar".
- Todo en free tier: Supabase (DB + Auth + Edge Functions) + Vercel (hosting) + GitHub (repo + keep-alive).

## 1. Crear el proyecto en Supabase (gratis)

1. [supabase.com](https://supabase.com) → New project (región: `eu-west` por latencia desde España).
2. **SQL Editor** → pega y ejecuta `supabase/migrations/0001_schema.sql`.
3. **Authentication → Providers → Email**: déjalo activo. Opcional: desactiva "Confirm email" para entrar sin verificación.
4. **Database → Replication**: activa realtime para la tabla `transactions` (o en SQL: `alter publication supabase_realtime add table transactions;`).
5. Copia de **Settings → API**: `Project URL` y `anon public key`.

## 2. Correr en local

```bash
cp .env.example .env   # pega tu URL y anon key
npm install
npm run dev
```

## 3. Subir a GitHub y desplegar en Vercel (gratis)

```bash
git init && git add -A && git commit -m "feat: app de presupuesto bi-moneda"
gh repo create cuentas --private --source=. --push   # o créalo manual en github.com
```

En [vercel.com](https://vercel.com): **Import** el repo → framework Vite (lo detecta solo) → añade las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` → Deploy.

> **Importante (free tier):** Supabase pausa proyectos tras ~1 semana sin actividad. Este repo incluye
> `.github/workflows/keepalive.yml` que hace ping cada 3 días. Configura en GitHub →
> Settings → Secrets and variables → Actions los secrets `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

## 4. Desplegar la Edge Function del webhook

```bash
npm i -g supabase
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy applepay-webhook --no-verify-jwt
```

`--no-verify-jwt` es necesario porque el Atajo de iOS no envía JWT; la función se protege con el
`webhook_secret` único de tu hogar (visible en la app → Ajustes).

## 5. Atajo de iOS: registrar pagos de Apple Pay automáticamente

Requiere **iOS 17+**. El trigger "Transacción" se dispara al pagar con una tarjeta de Apple Wallet.

### Paso A — Crear la automatización

App **Atajos** → pestaña **Automatización** → `+` → **Transacción**:

- Tarjetas: selecciona tus tarjetas de Apple Pay
- Categoría/Comercio: cualquiera
- **Ejecutar inmediatamente** (sin preguntar)
- Acción: **Crear nueva automatización en blanco**

### Paso B — Acciones de la automatización

1. **Diccionario** con 3 claves de tipo texto, usando las variables mágicas del evento de transacción:
   - `amount` → variable **Importe**
   - `merchant` → variable **Comercio**
   - `card` → variable **Tarjeta o pase**
2. **Obtener contenido de URL**:
   - URL: `https://TU-PROYECTO.supabase.co/functions/v1/applepay-webhook` (cópiala de la app → Ajustes)
   - Método: `POST`
   - Cabeceras: `x-webhook-secret` = tu secreto (app → Ajustes)
   - Cuerpo de la solicitud: `JSON` → el **Diccionario** del paso 1

### Limitaciones conocidas (para que no te sorprendan)

- El nombre del comercio llega "sucio" (`BAR LOLA S.L. MADRID`). Crea **reglas** en Ajustes
  (patrón → categoría) y los pagos recurrentes se clasificarán solos; el resto cae en
  "pendientes de clasificar" en el dashboard.
- Si pagas en COP con una tarjeta europea, Wallet reporta el importe ya convertido a EUR: el
  registro será en EUR (correcto para tu contabilidad, pues eso es lo que pagaste).
- La automatización corre en tu iPhone: si está apagado o sin red, ese pago no se registra
  (regístralo manual).

## Arquitectura y decisiones

```
src/
  lib/          # supabase client, tasas de cambio (caché 12h + fallback), formateo/conversión de dinero
  context/      # estado global: sesión, hogar, categorías, moneda de vista
  features/     # módulos por dominio: auth, onboarding, dashboard, transactions, categories, settings
  components/   # UI compartida (Layout, MonthPicker, CurrencyToggle)
```

- **Modelo multi-moneda**: `transactions.fx_rate` congela la tasa COP/EUR del día de la transacción.
  Conversión centralizada en `lib/money.ts` (`convert`, `sumIn`); única fuente de verdad.
- **Seguridad**: RLS en todas las tablas; pertenencia validada con función `security definer`
  (`is_member`) para evitar recursión de políticas. El webhook usa service role **solo** dentro de
  la Edge Function, autenticado por secreto por-hogar.
- **Tasas**: open.er-api.com (gratis, sin API key), caché en localStorage 12 h, fallback editable
  manualmente en el formulario.
- **Sin sobre-ingeniería deliberada**: módulos por feature en lugar de capas hexagonales; SOLID
  aplicado donde paga (conversión de moneda y acceso a datos aislados, componentes con una sola
  responsabilidad), no como ritual.
