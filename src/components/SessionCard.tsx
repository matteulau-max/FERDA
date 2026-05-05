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
  const totalMatches = session.matches.length

  for (const match of session.matches) {
    const status = calcMatchStatus(match, session.format, players, course, session.scoring ?? 'Match Play')
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
  }

  // Converging bar: each team fills inward from their side toward the center (50% = win threshold).
  // Denominator is totalMatches so unplayed matches appear as empty space in the middle.
  const scale = totalMatches > 0 ? 100 / totalMatches : 0
  const t1LockedPct = team1Locked * scale
  const t1ProjPct   = (team1Proj - team1Locked) * scale
  const t2ProjPct   = (team2Proj - team2Locked) * scale
  const t2LockedPct = team2Locked * scale

  return (
    <div
      className="rounded-xl overflow-hidden shadow-sm"
      style={{ background: '#fff', border: '1px solid #e8e5d8' }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#f9f7f1', borderBottom: startedCount > 0 ? 'none' : '1px solid #e8e5d8' }}>
        <div className="flex flex-col gap-0.5">
          <h2 className="font-serif font-semibold text-base leading-tight" style={{ color: '#333' }}>
            {session.name}
          </h2>
          <span className="font-body text-xs leading-tight" style={{ color: '#777' }}>
            {session.courseName}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-body text-xs font-semibold leading-tight" style={{ color: badgeColor }}>
            {session.format}
          </span>
          <span className="font-body text-xs leading-tight" style={{ color: '#777' }}>
            {session.scoring === 'Stroke Play' ? 'Stroke' : 'Match'}
          </span>
        </div>
      </div>

      {/* Converging progress bar — only shown once play has begun */}
      {startedCount > 0 && (
        <div className="px-4 pb-3 pt-2 flex items-center gap-2" style={{ background: '#f9f7f1', borderBottom: '1px solid #e8e5d8' }}>
          <span className="font-body text-xs font-bold w-6 text-right tabular-nums" style={{ color: TEAM_COLORS.team1 }}>
            {fmt(team1Proj)}
          </span>
          {/* Converging bar: T1 fills from left, T2 fills from right; center line = win threshold */}
          <div className="flex-1 relative h-2 rounded-full overflow-hidden flex" style={{ background: '#e8e5d8' }}>
            {/* T1: left edge → inward */}
            <div className="h-full transition-all duration-500" style={{ width: `${t1LockedPct}%`, background: TEAM_COLORS.team1 }} />
            <div className="h-full transition-all duration-500" style={{ width: `${t1ProjPct}%`,   background: 'rgba(0, 103, 71, 0.35)' }} />
            {/* empty gap (unplayed / undecided) fills the middle */}
            <div className="flex-1" />
            {/* T2: right edge → inward */}
            <div className="h-full transition-all duration-500" style={{ width: `${t2ProjPct}%`,   background: 'rgba(196, 30, 58, 0.35)' }} />
            <div className="h-full transition-all duration-500" style={{ width: `${t2LockedPct}%`, background: TEAM_COLORS.team2 }} />
            {/* center line = winning threshold */}
            <div className="absolute top-0 bottom-0" style={{ left: '50%', width: 1.5, background: '#fff', opacity: 0.7, transform: 'translateX(-50%)' }} />
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
            scoring={session.scoring}
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
