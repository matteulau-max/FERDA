import type { Course, Player, Session } from '../lib/types'
import { calcMatchStatus } from '../lib/matchPlay'
import { matchPlayingHandicaps, perPlayerHoleStrokes } from '../lib/handicap'
import { TEAM_COLORS } from '../lib/constants'

interface Props {
  sessions: Session[]
  players: Player[]
  courses: Course[]
}

interface PlayerStat {
  name: string
  team: 1 | 2
  points: number
  birdies: number   // Best Ball only
  pars: number      // Best Ball only
  netToPar: number  // Best Ball only (sum of net - par across holes played)
  bbHoles: number   // Best Ball holes played
}

const fmtPts = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(1))

const fmtNet = (net: number, holes: number) => {
  if (holes === 0) return '—'
  if (net === 0) return 'E'
  return net > 0 ? `+${net}` : String(net)
}

export function PlayerLeaderboard({ sessions, players, courses }: Props) {
  const stats: Record<string, PlayerStat> = {}
  for (const player of players) {
    stats[player.name] = { name: player.name, team: player.team, points: 0, birdies: 0, pars: 0, netToPar: 0, bbHoles: 0 }
  }

  for (const session of sessions) {
    const course = courses.find((c) => c.name === session.courseName) ?? courses[0]
    if (!course) continue

    for (const match of session.matches) {
      const status = calcMatchStatus(match, session.format, players, course, session.scoring ?? 'Match Play')

      // Points: credit all players on the winning/halving side (all formats)
      if (status.isComplete && status.result) {
        for (const name of match.team1Players) {
          if (!stats[name]) continue
          if (status.result.winner === 'team1') stats[name].points += 1
          else if (status.result.winner === 'halved') stats[name].points += 0.5
        }
        for (const name of match.team2Players) {
          if (!stats[name]) continue
          if (status.result.winner === 'team2') stats[name].points += 1
          else if (status.result.winner === 'halved') stats[name].points += 0.5
        }
      }

      // Birdies, pars, and net score: Best Ball only (individual scores are meaningful)
      if (session.format === 'Best Ball') {
        const { t1Phs, t2Phs } = matchPlayingHandicaps(
          match.team1Players, match.team2Players, players, course, 'Best Ball',
        )
        const t1Strokes = perPlayerHoleStrokes(match.team1Players, t1Phs, course)
        const t2Strokes = perPlayerHoleStrokes(match.team2Players, t2Phs, course)

        for (const [holeStr, holeScores] of Object.entries(match.scores)) {
          const holeNum = parseInt(holeStr)
          const hole = course.holes.find((h) => h.number === holeNum)
          if (!hole) continue

          for (const [name, gross] of Object.entries(holeScores.team1)) {
            if (!stats[name] || !gross) continue
            const net = gross - (t1Strokes[name]?.[holeNum] ?? 0)
            stats[name].bbHoles++
            stats[name].netToPar += net - hole.par
            if (gross <= hole.par - 1) stats[name].birdies++
            else if (gross === hole.par) stats[name].pars++
          }
          for (const [name, gross] of Object.entries(holeScores.team2)) {
            if (!stats[name] || !gross) continue
            const net = gross - (t2Strokes[name]?.[holeNum] ?? 0)
            stats[name].bbHoles++
            stats[name].netToPar += net - hole.par
            if (gross <= hole.par - 1) stats[name].birdies++
            else if (gross === hole.par) stats[name].pars++
          }
        }
      }
    }
  }

  const sorted = Object.values(stats)
    .filter((s) => s.points > 0)
    .sort((a, b) => b.points - a.points || a.netToPar - b.netToPar || b.birdies - a.birdies)

  if (sorted.length === 0) return null

  const netColor = (net: number, holes: number) => {
    if (holes === 0) return '#ccc'
    if (net < 0) return '#DC2626'
    if (net === 0) return '#666'
    return '#1f2937'
  }

  return (
    <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: '#fff', border: '1px solid #e8e5d8' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#f9f7f1', borderBottom: '1px solid #e8e5d8' }}>
        <h2 className="font-serif font-semibold text-base" style={{ color: '#333' }}>Individual Standings</h2>
        <div className="flex gap-3 pr-1">
          <span className="font-body text-xs w-8 text-center" style={{ color: '#aaa' }}>Pts</span>
          <span className="font-body text-xs w-8 text-center" style={{ color: '#aaa' }}>Net</span>
          <span className="font-body text-xs w-8 text-center" style={{ color: '#aaa' }}>Brd</span>
          <span className="font-body text-xs w-8 text-center" style={{ color: '#aaa' }}>Par</span>
        </div>
      </div>

      <div>
        {sorted.map((stat, i) => {
          const teamColor = stat.team === 1 ? TEAM_COLORS.team1 : TEAM_COLORS.team2
          return (
            <div
              key={stat.name}
              className="px-4 py-2.5 flex items-center gap-3"
              style={{ borderBottom: i < sorted.length - 1 ? '1px solid #f0ece0' : 'none' }}
            >
              <span className="font-body text-xs w-4 text-center tabular-nums" style={{ color: '#bbb' }}>
                {i + 1}
              </span>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: teamColor }} />
                <span className="font-body text-sm font-medium truncate" style={{ color: '#333' }}>
                  {stat.name}
                </span>
              </div>
              <div className="flex gap-3 pr-1">
                <span className="font-body text-sm font-bold w-8 text-center tabular-nums" style={{ color: teamColor }}>
                  {fmtPts(stat.points)}
                </span>
                <span className="font-body text-sm font-bold w-8 text-center tabular-nums" style={{ color: netColor(stat.netToPar, stat.bbHoles) }}>
                  {fmtNet(stat.netToPar, stat.bbHoles)}
                </span>
                <span className="font-body text-sm w-8 text-center tabular-nums" style={{ color: stat.birdies > 0 ? '#DC2626' : '#ccc' }}>
                  {stat.birdies > 0 ? stat.birdies : '—'}
                </span>
                <span className="font-body text-sm w-8 text-center tabular-nums" style={{ color: stat.pars > 0 ? '#555' : '#ccc' }}>
                  {stat.pars > 0 ? stat.pars : '—'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
