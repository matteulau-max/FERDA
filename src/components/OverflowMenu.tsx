import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { href, useTournamentRoute } from '../lib/paths'

/**
 * The "..." menu shown in every page header. The scorecard in particular has
 * no tab bar, so without this there's no way out of a match except the back
 * arrow.
 */
export function OverflowMenu({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()
  const { slug, base } = useTournamentRoute()
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function go(path: string) {
    setOpen(false)
    navigate(href(base, path))
  }

  async function copyLink() {
    const url = slug ? `${window.location.origin}/t/${slug}` : window.location.origin
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => { setCopied(false); setOpen(false) }, 1200)
    } catch {
      setOpen(false)
    }
  }

  const dotColor = tone === 'dark' ? '#19271f' : '#FFF200'

  return (
    // z-index matters: the header text around this button is full-width and
    // would otherwise swallow the taps meant for it.
    <div ref={ref} className="relative z-30">
      <button
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1 rounded-lg leading-none active:opacity-60"
        style={{ color: dotColor, fontSize: 22, letterSpacing: 1 }}
      >
        ···
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 rounded-xl overflow-hidden shadow-lg z-50"
          style={{ background: '#fff', border: '1px solid #e5e7eb', minWidth: 200 }}
        >
          <MenuItem onClick={() => go('')}>Leaderboard</MenuItem>
          <MenuItem onClick={() => go('/setup')}>Event setup</MenuItem>
          <MenuItem onClick={() => go('/manual')}>Manual</MenuItem>
          <Divider />
          <MenuItem onClick={copyLink}>{copied ? 'Link copied' : 'Copy tournament link'}</MenuItem>
          <MenuItem onClick={() => { setOpen(false); navigate('/new') }}>Start new tournament</MenuItem>
        </div>
      )}
    </div>
  )
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="block w-full text-left px-4 py-3 font-body text-sm active:bg-gray-100"
      style={{ color: '#19271f' }}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div style={{ height: 1, background: '#e5e7eb' }} />
}
