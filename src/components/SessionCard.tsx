import type { Course, Player, Session, Team } from '../lib/types'
import { calcMatchStatus } from '../lib/matchPlay'
import { TEAM_COLORS } from '../lib/constants'
import { MatchRow } from './MatchRow'

interface Props {
  session: Session
  players: Player[]
  course: Course
  team1: Team
  team2: Team
}

const FORMAT_COLORS: Record<string, string> = {
  Singles: '#006747',
  'Best Ball': '#8B6914',
  Scramble: '#1a4f7a',
}

const fmt = (n: number) => n % 1 === 0 ? String(n) : n.toFixed(1)

export function SessionCard({ session, players, course, team1, team2 }: Props) {
  const badgeColor = FORMAT_COLORS[session.format] ?? '#555'

  let team1Proj = 0
  let team2Proj = 0
  let anyStarted = false

  for (const match of session.matches) {
    const status = calcMatchStatus(match, session.format, players, course)
    if (status.isComplete && status.result) {
      anyStarted = true
      if (status.result.winner === 'team1') team1Proj += 1
      else if (status.result.winner === 'team2') team2Proj += 1
      else { team1Proj += 0.5; team2Proj += 0.5 }
    } else if (status.holesPlayed > 0) {
      anyStarted = true
      if (status.t1Up > 0) team1Proj += 1
      else if (status.t1Up < 0) team2Proj += 1
      else { team1Proj += 0.5; team2Proj += 0.5 }
    } else {
      team1Proj += 0.5
      team2Proj += 0.5
    }
  }

  const total = team1Proj + team2Proj
  const team1Pct = total > 0 ? (team1Proj / total) * 100 : 50

  return (
    <div
      className="rounded-xl overflow-hidden shadow-sm"
      style={{ background: '#fff', border: '1px solid #e8e5d8' }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#f9f7f1', borderBottom: anyStarted ? 'none' : '1px solid #e8e5d8' }}>
        <h2 className="font-serif font-semibold text-base" style={{ color: '#333' }}>
          {session.name}
        </h2>
        <span
          className="text-xs font-body font-semibold px-2 py-0.5 rounded-full text-white"
          style={{ background: badgeColor }}
        >
          {session.format}
        </span>
      </div>

      {/* Tug-of-war bar */}
      {anyStarted && session.matches.length > 0 && (
        <div className="px-4 pb-3 pt-2 flex items-center gap-2" style={{ background: '#f9f7f1', borderBottom: '1px solid #e8e5d8' }}>
          <span className="font-body text-xs font-bold w-6 text-right tabular-nums" style={{ color: TEAM_COLORS.team1 }}>
            {fmt(team1Proj)}
          </span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: TEAM_COLORS.team2 }}>
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${team1Pct}%`, background: TEAM_COLORS.team1 }}
            />
          </div>
          <span className="font-body text-xs font-bold w-6 text-left tabular-nums" style={{ color: TEAM_COLORS.team2 }}>
            {fmt(team2Proj)}
          </span>
        </div>
      )}

      {/* Matches */}
      <div className="p-3 flex flex-col gap-2">
        {session.matches.map((match) => (
          <MatchRow
            key={match.id}
            match={match}
            format={session.format}
            players={players}
            course={course}
            team1={team1}
            team2={team2}
          />
        ))}
        {session.matches.length === 0 && (
          <p className="text-xs text-gray-400 font-body py-2 text-center">No matches configured</p>
        )}
      </div>
    </div>
  )
}
