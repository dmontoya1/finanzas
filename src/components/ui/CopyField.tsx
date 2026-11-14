import { useEffect, useId, useRef, useState } from 'react'
import { Check, Copy, Eye, EyeOff } from 'lucide-react'

type Props = { label: string; value: string; secret?: boolean }

// Read-only field with a copy button. If the Clipboard API is missing or rejects,
// the text is revealed and selected so the user can copy it manually.
export function CopyField({ label, value, secret = false }: Props) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const timer = useRef<number>(0)
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const [revealed, setRevealed] = useState(!secret)

  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => { if (failed) input.current?.select() }, [failed, revealed])

  async function copy() {
    window.clearTimeout(timer.current)
    try {
      await navigator.clipboard.writeText(value)
      setFailed(false)
      setCopied(true)
      timer.current = window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
      setRevealed(true)
      setFailed(true)
    }
  }

  const iconBtn = 'grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-line text-text-soft hover:bg-text/5 hover:text-text'

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-text-soft">{label}</label>
      <div className="flex gap-2">
        <input
          ref={input} id={id} readOnly value={value}
          type={revealed ? 'text' : 'password'} autoComplete="off" spellCheck={false}
          onFocus={(e) => e.currentTarget.select()}
          className="num min-w-0 flex-1 truncate"
        />
        {secret && (
          <button type="button" onClick={() => setRevealed((r) => !r)} className={iconBtn}
            aria-label={revealed ? `Ocultar ${label}` : `Mostrar ${label}`} aria-pressed={revealed}>
            {revealed ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        )}
        <button type="button" onClick={copy} className={iconBtn} aria-label={`Copiar ${label}`}>
          {copied ? <Check className="size-4 text-positive" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        </button>
      </div>
      <p role="status" className={`mt-1 min-h-5 text-sm ${failed ? 'text-negative' : 'text-positive'}`}>
        {copied && '¡Copiado!'}
        {failed && 'No se pudo copiar automáticamente. El texto está seleccionado: cópialo a mano.'}
      </p>
    </div>
  )
}
