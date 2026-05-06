import type { Course, Player, Session } from '../lib/types'
import { calcMatchStatus } from '../lib/matchPlay'
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
  holesPlayed: number
}

const fmt = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(1))

export function PlayerLeaderboard({ sessions, players, courses }: Props) {
  const stats: Record<string, PlayerStat> = {}
  for (const player of players) {
    stats[player.name] = { name: player.name, team: player.team, points: 0, birdies: 0, holesPlayed: 0 }
  }

  for (const session of sessions) {
    const course = courses.find((c) => c.name === session.courseName) ?? courses[0]
    if (!course) continue

    for (const match of session.matches) {
      const status = calcMatchStatus(match, session.format, players, course, session.scoring ?? 'Match Play')

      // Award match points to all players on the winning/halving side
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

      // Birdies and holes played from individual scores
      for (const [holeStr, holeScores] of Object.entries(match.scores)) {
        const holeNum = parseInt(holeStr)
        const hole = course.holes.find((h) => h.number === holeNum)
        if (!hole) continue
        for (const [name, gross] of Object.entries(holeScores.team1)) {
          if (!stats[name] || !gross) continue
          stats[name].holesPlayed++
          if (gross <= hole.par - 1) stats[name].birdies++
        }
        for (const [name, gross] of Object.entries(holeScores.team2)) {
          if (!stats[name] || !gross) continue
          stats[name].holesPlayed++
          if (gross <= hole.par - 1) stats[name].birdies++
        }
      }
    }
  }

  const sorted = Object.values(stats)
    .filter((s) => s.holesPlayed > 0 || s.points > 0)
    .sort((a, b) => b.points - a.points || b.birdies - a.birdies)

  if (sorted.length === 0) return null

  return (
    <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: '#fff', border: '1px solid #e8e5d8' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#f9f7f1', borderBottom: '1px solid #e8e5d8' }}>
        <h2 className="font-serif font-semibold text-base" style={{ color: '#333' }}>Individual Standings</h2>
        <div className="flex gap-4 pr-1">
          <span className="font-body text-xs w-8 text-center" style={{ color: '#aaa' }}>Pts</span>
          <span className="font-body text-xs w-8 text-center" style={{ color: '#aaa' }}>Brd</span>
          <span className="font-body text-xs w-8 text-center" style={{ color: '#aaa' }}>Holes</span>
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
              <div className="flex gap-4 pr-1">
                <span className="font-body text-sm font-bold w-8 text-center tabular-nums" style={{ color: teamColor }}>
                  {fmt(stat.points)}
                </span>
                <span
                  className="font-body text-sm font-bold w-8 text-center tabular-nums"
                  style={{ color: stat.birdies > 0 ? '#DC2626' : '#ccc' }}
                >
                  {stat.birdies > 0 ? stat.birdies : '—'}
                </span>
                <span className="font-body text-sm w-8 text-center tabular-nums" style={{ color: '#999' }}>
                  {stat.holesPlayed}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
