export function Skeleton({ className = '' }: { className?: string }) {
  // Shimmer animation is neutralized by the global prefers-reduced-motion rule.
  return <div aria-hidden className={`skeleton rounded-lg ${className}`} />
}
