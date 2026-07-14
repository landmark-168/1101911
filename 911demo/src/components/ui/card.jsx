export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-line bg-white shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}>
      {children}
    </div>
  )
}
