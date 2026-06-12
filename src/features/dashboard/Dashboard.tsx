import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { endOfMonth, format, getDaysInMonth, startOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useApp } from '../../context/AppContext'
import { useTransactions } from '../transactions/useTransactions'
import MonthPicker from '../../components/MonthPicker'
import { convert, formatMoney, projectMonth, sumIn } from '../../lib/money'
import BudgetSection from './BudgetSection'
import { supabase } from '../../lib/supabase'
import type { Transaction } from '../../types'

const DONUT_COLORS = ['#7fd8a4', '#e8b454', '#ff8d6b', '#8db4e8', '#c79be8', '#e89bb4', '#9be8d8', '#d8c47f']

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' as const } }),
}

export default function Dashboard() {
  const { viewCurrency, categories } = useApp()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))

  // Traemos 6 meses para la tendencia; el mes activo se filtra en memoria
  const from = format(startOfMonth(subMonths(month, 5)), 'yyyy-MM-dd')
  const to = format(endOfMonth(month), 'yyyy-MM-dd')
  const { transactions, loading, refresh } = useTransactions(from, to)

  const monthKey = format(month, 'yyyy-MM')
  const monthTxs = useMemo(
    () => transactions.filter((t) => t.occurred_at.startsWith(monthKey)),
    [transactions, monthKey],
  )

  const income = sumIn(monthTxs.filter((t) => t.type === 'income'), viewCurrency)
  const expense = sumIn(monthTxs.filter((t) => t.type === 'expense'), viewCurrency)
  const balance = income - expense
  const pending = transactions.filter((t) => t.status === 'pending_review')

  // Proyección: solo el mes en curso tiene futuro que estimar
  const today = new Date()
  const projection = monthKey === format(today, 'yyyy-MM')
    ? projectMonth(monthTxs, viewCurrency, today.getDate(), getDaysInMonth(today))
    : null

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of monthTxs.filter((x) => x.type === 'expense')) {
      const cat = categories.find((c) => c.id === t.category_id)
      const key = cat ? `${cat.emoji} ${cat.name}` : '❓ Sin categoría'
      map.set(key, (map.get(key) ?? 0) + convert(t, viewCurrency))
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
  }, [monthTxs, categories, viewCurrency])

  const trend = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(month, 5 - i)
      const key = format(m, 'yyyy-MM')
      const txs = transactions.filter((t) => t.occurred_at.startsWith(key))
      return {
        mes: format(m, 'MMM', { locale: es }),
        Ingresos: Math.round(sumIn(txs.filter((t) => t.type === 'income'), viewCurrency)),
        Gastos: Math.round(sumIn(txs.filter((t) => t.type === 'expense'), viewCurrency)),
      }
    })
  }, [transactions, month, viewCurrency])

  async function confirmTx(t: Transaction, categoryId: string) {
    await supabase.from('transactions')
      .update({ category_id: categoryId, status: 'confirmed' })
      .eq('id', t.id)
    refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="display text-2xl font-semibold">Resumen</h2>
        <MonthPicker month={month} onChange={(d) => setMonth(startOfMonth(d))} />
      </div>

      {/* Pendientes de Apple Pay */}
      {pending.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card border-amber/40 p-5">
          <h3 className="mb-3 font-semibold text-amber">⏳ {pending.length} pago(s) de Apple Pay por clasificar</h3>
          <ul className="space-y-2">
            {pending.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ink-950/60 px-4 py-2.5">
                <div>
                  <p className="font-medium">{t.merchant || 'Comercio desconocido'}</p>
                  <p className="num text-sm text-cream-dim">{formatMoney(t.amount, t.currency)} · {t.occurred_at}</p>
                </div>
                <select defaultValue="" onChange={(e) => e.target.value && confirmTx(t, e.target.value)} className="w-auto text-sm">
                  <option value="" disabled>Categoría…</option>
                  {categories.filter((c) => c.kind === 'expense').map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Tarjetas resumen */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Ingresos', value: income, color: 'text-mint', sub: null as string | null, subColor: '' },
          {
            label: 'Gastos', value: expense, color: 'text-coral',
            sub: projection ? `→ ~${formatMoney(projection.projectedExpense, viewCurrency)} a fin de mes` : null,
            subColor: 'text-cream-faint',
          },
          {
            label: 'Balance', value: balance, color: balance >= 0 ? 'text-mint' : 'text-coral',
            sub: projection ? `proyección: ~${formatMoney(projection.projectedBalance, viewCurrency)}` : null,
            subColor: projection && projection.projectedBalance >= 0 ? 'text-mint/70' : 'text-coral/70',
          },
        ].map((c, i) => (
          <motion.div key={c.label} custom={i} variants={cardVariants} initial="hidden" animate="show" className="card p-5">
            <p className="text-sm uppercase tracking-widest text-cream-faint">{c.label}</p>
            <p className={`num mt-2 text-2xl font-semibold sm:text-3xl ${c.color}`}>
              {loading ? '—' : formatMoney(c.value, viewCurrency)}
            </p>
            {!loading && c.sub && <p className={`num mt-1 text-xs ${c.subColor}`}>{c.sub}</p>}
          </motion.div>
        ))}
      </div>

      {/* Presupuestos del mes */}
      <motion.div custom={2.5} variants={cardVariants} initial="hidden" animate="show">
        <BudgetSection categories={categories} monthTxs={monthTxs} />
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Donut por categoría */}
        <motion.div custom={3} variants={cardVariants} initial="hidden" animate="show" className="card p-5">
          <h3 className="mb-2 font-semibold">Gastos por categoría</h3>
          {byCategory.length === 0 ? (
            <p className="py-16 text-center text-cream-faint">Sin gastos este mes</p>
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={62} outerRadius={95} paddingAngle={3} strokeWidth={0}>
                    {byCategory.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatMoney(Number(v), viewCurrency)}
                    contentStyle={{ background: '#101713', border: '1px solid rgba(242,236,221,.15)', borderRadius: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="w-full space-y-1.5 text-sm sm:max-w-52">
                {byCategory.slice(0, 6).map((c, i) => (
                  <li key={c.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 truncate">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      {c.name}
                    </span>
                    <span className="num text-cream-dim">{formatMoney(c.value, viewCurrency)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>

        {/* Tendencia 6 meses */}
        <motion.div custom={4} variants={cardVariants} initial="hidden" animate="show" className="card p-5">
          <h3 className="mb-4 font-semibold">Últimos 6 meses</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7fd8a4" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#7fd8a4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff8d6b" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#ff8d6b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(242,236,221,.07)" vertical={false} />
              <XAxis dataKey="mes" stroke="#7d796c" tickLine={false} axisLine={false} />
              <YAxis stroke="#7d796c" tickLine={false} axisLine={false} width={70}
                tickFormatter={(v: number) => Intl.NumberFormat('es', { notation: 'compact' }).format(v)} />
              <Tooltip
                formatter={(v) => formatMoney(Number(v), viewCurrency)}
                contentStyle={{ background: '#101713', border: '1px solid rgba(242,236,221,.15)', borderRadius: 12 }}
              />
              <Area type="monotone" dataKey="Ingresos" stroke="#7fd8a4" fill="url(#gIn)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="Gastos" stroke="#ff8d6b" fill="url(#gOut)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  )
}
