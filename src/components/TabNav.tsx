import { useLocation, useNavigate } from 'react-router-dom'
import { href, useTournamentRoute } from '../lib/paths'

// Setup lives in the "..." menu rather than here — it's an organiser task,
// not something to put in front of everyone watching the scores.
const TABS = [
  { label: 'Leaderboard', path: '' },
  { label: 'Manual', path: '/manual' },
]

export function TabNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { base } = useTournamentRoute()

  return (
    <div className="flex" style={{ background: '#003d26', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      {TABS.map(({ label, path }) => {
        const to = href(base, path)
        const active = path === '' ? location.pathname === to : location.pathname.startsWith(to)
        return (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="flex-1 py-2.5 text-xs font-body tracking-widest uppercase transition-colors"
            style={
              active
                ? { color: '#FFF200', borderBottom: '2px solid #FFF200' }
                : { color: 'rgba(255,255,255,0.45)', borderBottom: '2px solid transparent' }
            }
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
