export function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-orange-500 text-white shadow-[0_10px_30px_rgba(249,115,22,.28)] hover:bg-orange-600 hover:-translate-y-0.5',
    secondary: 'border border-zinc-200 bg-white/75 text-zinc-900 shadow-sm hover:border-orange-200 hover:bg-orange-50',
    ghost: 'text-zinc-700 hover:bg-zinc-100',
  }

  return (
    <button
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/20 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
