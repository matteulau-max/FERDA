import type { Course, Player, Session } from '../lib/types'
import { rankBestGolfers } from '../lib/bestGolfer'
import { TEAM_COLORS } from '../lib/constants'

interface Props {
  sessions: Session[]
  players: Player[]
  courses: Course[]
}

const fmtPts = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(1))

const fmtNet = (net: number, holes: number) => {
  if (holes === 0) return '—'
  if (net === 0) return 'E'
  return net > 0 ? `+${net}` : String(net)
}

export function PlayerLeaderboard({ sessions, players, courses }: Props) {
  const ranked = rankBestGolfers(sessions, players, courses)

  if (ranked.length === 0) return null

  const netColor = (net: number, holes: number) => {
    if (holes === 0) return '#ccc'
    if (net < 0) return '#DC2626'
    if (net === 0) return '#666'
    return '#1f2937'
  }

  return (
    <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: '#fff', border: '1px solid #e8e5d8' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#f9f7f1', borderBottom: '1px solid #e8e5d8' }}>
        <div>
          <h2 className="font-serif font-semibold text-base leading-tight" style={{ color: '#333' }}>Best Golfer</h2>
          <p className="font-body text-xs leading-tight" style={{ color: '#999' }}>50% net · 35% pts · 15% net birdies</p>
        </div>
        <div className="flex gap-3 pr-1">
          <span className="font-body text-xs w-8 text-center" style={{ color: '#aaa' }}>Rtg</span>
          <span className="font-body text-xs w-8 text-center" style={{ color: '#aaa' }}>Pts</span>
          <span className="font-body text-xs w-8 text-center" style={{ color: '#aaa' }}>Net</span>
          <span className="font-body text-xs w-8 text-center" style={{ color: '#aaa' }}>Brd</span>
        </div>
      </div>

      <div>
        {ranked.map((stat, i) => {
          const teamColor = stat.team === 1 ? TEAM_COLORS.team1 : TEAM_COLORS.team2
          const isWinner = i === 0
          return (
            <div
              key={stat.name}
              className="px-4 py-2.5 flex items-center gap-3"
              style={{
                borderBottom: i < ranked.length - 1 ? '1px solid #f0ece0' : 'none',
                background: isWinner ? 'rgba(251,191,36,0.06)' : 'transparent',
              }}
            >
              <span className="font-body text-xs w-4 text-center" style={{ color: isWinner ? '#D97706' : '#bbb' }}>
                {isWinner ? '#' : i + 1}
              </span>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: teamColor }} />
                <span
                  className="font-body text-sm font-medium truncate"
                  style={{ color: isWinner ? '#D97706' : '#333' }}
                >
                  {stat.name}
                </span>
              </div>
              <div className="flex gap-3 pr-1">
                <span
                  className="font-body text-sm font-bold w-8 text-center tabular-nums"
                  style={{ color: isWinner ? '#D97706' : '#555' }}
                >
                  {stat.composite.toFixed(1)}
                </span>
                <span className="font-body text-sm font-bold w-8 text-center tabular-nums" style={{ color: teamColor }}>
                  {fmtPts(stat.points)}
                </span>
                <span className="font-body text-sm font-bold w-8 text-center tabular-nums" style={{ color: netColor(stat.netToPar, stat.netHoles) }}>
                  {fmtNet(stat.netToPar, stat.netHoles)}
                </span>
                <span className="font-body text-sm w-8 text-center tabular-nums" style={{ color: stat.birdies > 0 ? '#DC2626' : '#ccc' }}>
                  {stat.birdies > 0 ? stat.birdies : '—'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
