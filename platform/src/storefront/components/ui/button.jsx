export function Button({ children, variant = 'primary', size = 'default', className = '', ...props }) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/20 active:scale-[0.98]'
  
  const variants = {
    primary: 'bg-gradient-to-b from-ember to-deep text-white shadow-md hover:brightness-105 active:brightness-95',
    secondary: 'border border-line bg-soft text-ink hover:bg-white',
    outline: 'border border-line bg-transparent text-ink hover:bg-soft',
    dark: 'bg-coal text-paper hover:bg-ink',
    ghost: 'text-smoke hover:bg-soft/50',
  }

  const sizes = {
    default: 'h-12 px-5 text-sm',
    small: 'h-9 px-3.5 text-xs rounded-lg',
    wide: 'h-12 w-full px-5 text-sm',
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
