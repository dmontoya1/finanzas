import { motion, type HTMLMotionProps } from 'framer-motion'

type Props = HTMLMotionProps<'div'> & { animate?: boolean }

export function Card({ animate = false, className = '', ...rest }: Props) {
  const entrance = animate
    ? { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring' as const, stiffness: 260, damping: 26 } }
    : {}
  return <motion.div className={`card p-5 ${className}`} {...entrance} {...rest} />
}
