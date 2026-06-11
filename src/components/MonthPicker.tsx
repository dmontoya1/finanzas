import { addMonths, format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props { month: Date; onChange: (d: Date) => void }

export default function MonthPicker({ month, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button className="btn btn-ghost px-3" onClick={() => onChange(addMonths(month, -1))} aria-label="Mes anterior">←</button>
      <span className="display min-w-36 text-center text-lg font-semibold capitalize">
        {format(month, 'MMMM yyyy', { locale: es })}
      </span>
      <button className="btn btn-ghost px-3" onClick={() => onChange(addMonths(month, 1))} aria-label="Mes siguiente">→</button>
    </div>
  )
}
