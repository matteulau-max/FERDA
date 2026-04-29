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

  let team1Locked = 0
  let team2Locked = 0
  let team1Proj = 0
  let team2Proj = 0
  let startedCount = 0

  for (const match of session.matches) {
    const status = calcMatchStatus(match, session.format, players, course)
    if (status.isComplete && status.result) {
      startedCount++
      if (status.result.winner === 'team1') {
        team1Locked += 1; team1Proj += 1
      } else if (status.result.winner === 'team2') {
        team2Locked += 1; team2Proj += 1
      } else {
        team1Locked += 0.5; team2Locked += 0.5
        team1Proj += 0.5; team2Proj += 0.5
      }
    } else if (status.holesPlayed > 0) {
      startedCount++
      if (status.t1Up > 0) team1Proj += 1
      else if (status.t1Up < 0) team2Proj += 1
      else { team1Proj += 0.5; team2Proj += 0.5 }
    }
    // not started: excluded entirely
  }

  const t1LockedPct  = startedCount > 0 ? (team1Locked / startedCount) * 100 : 0
  const t1ProjPct    = startedCount > 0 ? ((team1Proj - team1Locked) / startedCount) * 100 : 0
  const t2ProjPct    = startedCount > 0 ? ((team2Proj - team2Locked) / startedCount) * 100 : 0
  const t2LockedPct  = startedCount > 0 ? (team2Locked / startedCount) * 100 : 0

  return (
    <div
      className="rounded-xl overflow-hidden shadow-sm"
      style={{ background: '#fff', border: '1px solid #e8e5d8' }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#f9f7f1', borderBottom: startedCount > 0 ? 'none' : '1px solid #e8e5d8' }}>
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

      {/* Tug-of-war bar — only shown once play has begun */}
      {startedCount > 0 && (
        <div className="px-4 pb-3 pt-2 flex items-center gap-2" style={{ background: '#f9f7f1', borderBottom: '1px solid #e8e5d8' }}>
          <span className="font-body text-xs font-bold w-6 text-right tabular-nums" style={{ color: TEAM_COLORS.team1 }}>
            {fmt(team1Proj)}
          </span>
          {/* 4-segment bar: [T1 locked | T1 proj | T2 proj | T2 locked] */}
          <div className="flex-1 h-2 rounded-full overflow-hidden flex" style={{ background: '#e8e5d8' }}>
            <div className="h-full transition-all duration-500" style={{ width: `${t1LockedPct}%`, background: TEAM_COLORS.team1 }} />
            <div className="h-full transition-all duration-500" style={{ width: `${t1ProjPct}%`,   background: 'rgba(0, 103, 71, 0.35)' }} />
            <div className="h-full transition-all duration-500" style={{ width: `${t2ProjPct}%`,   background: 'rgba(196, 30, 58, 0.35)' }} />
            <div className="h-full transition-all duration-500" style={{ width: `${t2LockedPct}%`, background: TEAM_COLORS.team2 }} />
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
