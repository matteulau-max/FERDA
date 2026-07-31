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

/**
 * Field's twin for controls that aren't a single input — the segmented
 * pickers below. A <label> would be wrong here twice over: tapping its text
 * would fire the first button in the group, and a screen reader would read
 * every option out as part of one control's name.
 */
export function Fieldset({
  label, hint, children,
}: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="block mb-3">
      <span className="block font-body text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">
        {label}
      </span>
      {children}
      {hint && <span className="block text-xs text-gray-500 font-body mt-1">{hint}</span>}
    </div>
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

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={`${inputClass} ${props.className ?? ''}`} />
}

/**
 * A segmented picker for the handful of two- and three-way rule choices.
 * Cheaper to answer than a dropdown on a phone, and it shows every option at
 * once — which matters when the options are the rule itself.
 */
export function Choice<T extends string | number | boolean>({
  value, options, onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            className="px-3 py-2 rounded-lg font-body text-sm border"
            style={
              on
                ? { background: '#006747', color: '#fff', borderColor: '#006747', fontWeight: 600 }
                : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** The yes/no case of Choice, which is most of them. */
export function YesNo({
  value, onChange, yes = 'Yes', no = 'No',
}: { value: boolean; onChange: (v: boolean) => void; yes?: string; no?: string }) {
  return (
    <Choice
      value={value}
      onChange={onChange}
      options={[{ value: true, label: yes }, { value: false, label: no }]}
    />
  )
}

/** Marks the option we'd suggest, so the recommended answer reads as advice. */
export function Recommended({ children }: { children: ReactNode }) {
  return <span className="text-xs text-gray-500 font-body">{children}</span>
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
