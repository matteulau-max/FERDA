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
  birdies: number
  pars: number
  netToPar: number
  bbHoles: number
}

const fmtPts = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(1))

const fmtNet = (net: number, holes: number) => {
  if (holes === 0) return '—'
  if (net === 0) return 'E'
  return net > 0 ? `+${net}` : String(net)
}

// Z-score normalize an array; returns 0 for all-same values
function zScores(values: number[]): number[] {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length) || 1
  return values.map((v) => (v - mean) / sd)
}

export function PlayerLeaderboard({ sessions, players, courses }: Props) {
  const stats: Record<string, PlayerStat> = {}
  for (const player of players) {
    stats[player.name] = { name: player.name, team: player.team, points: 0, birdies: 0, pars: 0, netToPar: 0, bbHoles: 0 }
  }

  // Case-insensitive lookup — mirrors the pattern used in handicap.ts
  const statsByLower = new Map(Object.entries(stats).map(([k, v]) => [k.toLowerCase(), v]))

  for (const session of sessions) {
    const course = courses.find((c) => c.name === session.courseName) ?? courses[0]
    if (!course) continue

    for (const match of session.matches) {
      const status = calcMatchStatus(match, session.format, players, course, session.scoring ?? 'Match Play')

      const lookup = (name: string) => statsByLower.get(name.toLowerCase())

      // Points: all formats
      if (status.isComplete && status.result) {
        for (const name of match.team1Players) {
          const s = lookup(name); if (!s) continue
          if (status.result.winner === 'team1') s.points += 1
          else if (status.result.winner === 'halved') s.points += 0.5
        }
        for (const name of match.team2Players) {
          const s = lookup(name); if (!s) continue
          if (status.result.winner === 'team2') s.points += 1
          else if (status.result.winner === 'halved') s.points += 0.5
        }
      }

      // Birdies, pars, net: Best Ball only
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
            const s = lookup(name); if (!s || !gross) continue
            const net = gross - (t1Strokes[name]?.[holeNum] ?? 0)
            s.bbHoles++; s.netToPar += net - hole.par
            if (gross <= hole.par - 1) s.birdies++
            else if (gross === hole.par) s.pars++
          }
          for (const [name, gross] of Object.entries(holeScores.team2)) {
            const s = lookup(name); if (!s || !gross) continue
            const net = gross - (t2Strokes[name]?.[holeNum] ?? 0)
            s.bbHoles++; s.netToPar += net - hole.par
            if (gross <= hole.par - 1) s.birdies++
            else if (gross === hole.par) s.pars++
          }
        }
      }
    }
  }

  // Top 5 by total points; include anyone with Best Ball holes so birdies
  // accumulate live even before a match is finished
  const top5 = Object.values(stats)
    .filter((s) => s.points > 0 || s.bbHoles > 0)
    .sort((a, b) => b.points - a.points || b.birdies - a.birdies)
    .slice(0, 5)

  if (top5.length === 0) return null

  // Composite score: z-score normalize each metric then weight
  // Net per hole: lower is better → negate z-score
  // Points: higher is better
  // Birdies: higher is better
  const netPerHole = top5.map((s) => (s.bbHoles > 0 ? s.netToPar / s.bbHoles : 0))
  const pointsRaw  = top5.map((s) => s.points)
  const birdiesRaw = top5.map((s) => s.birdies)

  const zNet     = zScores(netPerHole)
  const zPoints  = zScores(pointsRaw)
  const zBirdies = zScores(birdiesRaw)

  // Raw composite z-score: -net×0.50 + points×0.35 + birdies×0.15
  const rawComps = top5.map((_, i) => -zNet[i] * 0.50 + zPoints[i] * 0.35 + zBirdies[i] * 0.15)

  // Scale to 0–10 within this group
  const minC = Math.min(...rawComps)
  const maxC = Math.max(...rawComps)
  const range = maxC - minC || 1
  const composites = rawComps.map((c) => ((c - minC) / range) * 10)

  // Sort by composite descending
  const ranked = top5
    .map((s, i) => ({ ...s, composite: composites[i] }))
    .sort((a, b) => b.composite - a.composite)

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
          <p className="font-body text-xs leading-tight" style={{ color: '#999' }}>50% net · 35% pts · 15% birdies</p>
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
                <span className="font-body text-sm font-bold w-8 text-center tabular-nums" style={{ color: netColor(stat.netToPar, stat.bbHoles) }}>
                  {fmtNet(stat.netToPar, stat.bbHoles)}
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
