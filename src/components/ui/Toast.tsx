import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'

export type ToastData = {
  message: string
  tone?: 'default' | 'error'
  actionLabel?: string
  onAction?: () => void
  onClose?: () => void
}

// The live region stays mounted so screen readers announce content changes.
export function Toast({ toast }: { toast: ToastData | null }) {
  const reduce = useReducedMotion()
  return (
    <div
      role="status" aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center pl-4 pr-24 sm:bottom-6 sm:px-4"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.message}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: 16 }}
            className={`pointer-events-auto flex min-h-11 max-w-md items-center gap-3 rounded-xl py-1 pl-4 pr-1 text-sm font-medium text-white shadow-lg ${toast.tone === 'error' ? 'bg-negative' : 'bg-text'}`}
          >
            <span className="py-2">{toast.message}</span>
            {toast.actionLabel && (
              <button type="button" onClick={toast.onAction}
                className="min-h-11 cursor-pointer rounded-lg px-3 font-semibold underline underline-offset-2 hover:bg-white/10">
                {toast.actionLabel}
              </button>
            )}
            {toast.onClose && (
              <button type="button" onClick={toast.onClose} aria-label="Cerrar aviso"
                className="grid size-11 cursor-pointer place-items-center rounded-lg hover:bg-white/10">
                <X className="size-4" aria-hidden />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
