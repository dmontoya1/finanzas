import { cloneElement, useId, type ReactElement } from 'react'

type Props = {
  label: string
  hint?: string
  error?: string
  className?: string
  children: ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>
}

// children: a single <input>, <select> or <textarea>; Field injects id and aria wiring.
export function Field({ label, hint, error, className = '', children }: Props) {
  const id = useId()
  const descId = `${id}-desc`
  const text = error ?? hint
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-text-soft">{label}</label>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': text ? descId : undefined,
      })}
      {text && (
        <p id={descId} className={`mt-1 text-sm ${error ? 'text-negative' : 'text-text-faint'}`}>{text}</p>
      )}
    </div>
  )
}
