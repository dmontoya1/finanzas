import { useEffect, useId, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string }

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function Modal({ open, onClose, title, children, className = '' }: Props) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const reduce = useReducedMotion()

  const lastOutside = useRef<HTMLElement | null>(null)

  useEffect(() => { onCloseRef.current = onClose })

  // Child autoFocus runs before this component's effects, so activeElement is already the new
  // input when `open` flips. Track the last focused element outside any dialog instead.
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target
      if (t instanceof HTMLElement && !t.closest('[role="dialog"]')) lastOutside.current = t
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [])

  useEffect(() => {
    if (!open) return
    const previous = lastOutside.current
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const el = panel.current
    ;(el?.querySelector<HTMLElement>(FOCUSABLE) ?? el)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onCloseRef.current()
      if (e.key !== 'Tab' || !el) return
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (!items.length) return e.preventDefault()
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      if (previous?.isConnected) previous.focus()
    }
  }, [open])

  const t = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 34 }
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-text/40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={reduce ? { duration: 0 } : undefined}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
            className={`card relative w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-b-none sm:rounded-b-[1.25rem] p-5 ${className}`}
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            transition={t}
          >
            <h2 id={titleId} className="display mb-4 text-xl font-semibold">{title}</h2>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
