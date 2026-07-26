import type { ReactNode } from 'react'

/** Shared form furniture for the setup screens. */

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-4 mb-3">
      {children}
    </div>
  )
}

export function Field({
  label, hint, children,
}: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block font-body text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">
        {label}
      </span>
      {children}
      {hint && <span className="block text-xs text-gray-500 font-body mt-1">{hint}</span>}
    </label>
  )
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-gray-300 font-body text-base bg-white focus:outline-none focus:ring-2'

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ''}`} />
}

export function Button({
  variant = 'primary', children, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: '#006747', color: '#fff' },
    ghost: { background: 'transparent', color: '#006747', border: '1px solid #006747' },
    danger: { background: 'transparent', color: '#C41E3A', border: '1px solid #C41E3A' },
  }
  return (
    <button
      {...props}
      className={`px-3 py-2 rounded-lg font-body text-sm font-semibold disabled:opacity-40 ${props.className ?? ''}`}
      style={{ ...styles[variant], ...props.style }}
    >
      {children}
    </button>
  )
}

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null
  return <p className="text-sm font-body mt-2" style={{ color: '#C41E3A' }}>{children}</p>
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-sm text-gray-500 font-body py-3">{children}</p>
}

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-serif text-lg font-bold" style={{ color: '#004d34' }}>{title}</h2>
      {action}
    </div>
  )
}
