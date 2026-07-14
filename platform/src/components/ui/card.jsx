export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-white/80 bg-white/70 shadow-[0_20px_70px_rgba(24,24,27,.07)] backdrop-blur-xl ${className}`}>
      {children}
    </div>
  )
}
