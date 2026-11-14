import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

type Props = { value: number; format: (n: number) => string; className?: string }

export function AnimatedNumber({ value, format, className }: Props) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(value)
  const from = useRef(value)

  useEffect(() => {
    if (reduce) return
    const controls = animate(from.current, value, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (n) => { from.current = n; setShown(n) },
    })
    return () => controls.stop()
  }, [value, reduce])

  return <span className={className}>{format(reduce ? value : shown)}</span>
}
