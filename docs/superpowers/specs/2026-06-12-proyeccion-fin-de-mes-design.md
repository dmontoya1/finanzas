# Diseño: Proyección fin de mes

**Fecha:** 2026-06-12
**Estado:** Aprobado por Daniel

## Objetivo

El Dashboard estima cómo cierras el mes con el ritmo de gasto actual. Solo frontend, sin migración.

## Decisiones

| Decisión | Elección | Razón |
|---|---|---|
| Cálculo | Ritmo diario = gasto acumulado / día actual; `projectedExpense = ritmo × días del mes` | Simple, entendible |
| Ingresos | NO se extrapolan; `projectedBalance = ingresos actuales − gasto proyectado` | Son puntuales (nómina); extrapolar miente |
| Visibilidad | Solo mes actual; desde el día 1 (ruido temprano aceptado por el usuario) | Meses pasados están cerrados; futuros sin datos |
| Sin gastos aún | No se muestra (`null`) | Proyección de 0 no aporta |

## Implementación

- `src/lib/money.ts`: `projectMonth(monthTxs, view, dayOfMonth, daysInMonth): { projectedExpense, projectedBalance } | null` — pura, fecha inyectada, reutiliza `sumIn`.
- `src/features/dashboard/Dashboard.tsx`: si el mes seleccionado es el actual, calcula proyección y añade sublínea a las tarjetas:
  - Gastos: `→ ~1.850 € a fin de mes` (text-cream-faint).
  - Balance: `proyección: ~+320 €` (mint si ≥ 0, coral si < 0).
  - Moneda de vista (toggle global), como el resto de tarjetas.

## Fuera de alcance

Suavizado del ruido inicial, exclusión de gastos atípicos, proyección de ingresos.
