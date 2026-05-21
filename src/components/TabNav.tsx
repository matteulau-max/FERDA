import { useLocation, useNavigate } from 'react-router-dom'

const TABS = [
  { label: 'Leaderboard', path: '/' },
  { label: 'Rules', path: '/rules' },
]

export function TabNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="flex" style={{ background: '#003d26', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      {TABS.map(({ label, path }) => {
        const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
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
