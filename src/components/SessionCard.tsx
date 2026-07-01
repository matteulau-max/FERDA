import { useState } from 'react'
import type { Course, Player, Session, Team } from '../lib/types'
import { MatchRow } from './MatchRow'
import { calcMatchStatus } from '../lib/matchPlay'
import { TEAM_COLORS } from '../lib/constants'

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

const fmtPts = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(1))

export function SessionCard({ session, players, course, team1, team2 }: Props) {
  const badgeColor = FORMAT_COLORS[session.format] ?? '#555'

  // Roll up the session result so we can summarize it when collapsed and
  // decide whether to auto-collapse (a finished round doesn't need to stay open).
  let t1Pts = 0
  let t2Pts = 0
  let done = 0
  for (const match of session.matches) {
    const status = calcMatchStatus(match, session.format, players, course, session.scoring ?? 'Match Play')
    if (status.isComplete && status.result) {
      done++
      if (status.result.winner === 'team1') t1Pts += 1
      else if (status.result.winner === 'team2') t2Pts += 1
      else { t1Pts += 0.5; t2Pts += 0.5 }
    }
  }
  const total = session.matches.length
  const allComplete = total > 0 && done === total

  // Default: completed rounds start collapsed, the live round stays open.
  const [open, setOpen] = useState(!allComplete)

  return (
    <div
      className="rounded-xl overflow-hidden shadow-sm"
      style={{ background: '#fff', border: '1px solid #e8e5d8' }}
    >
      {/* Header — tap to collapse/expand */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
        style={{ background: '#f9f7f1', borderBottom: open ? '1px solid #e8e5d8' : 'none' }}
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2 className="font-serif font-semibold text-base leading-tight" style={{ color: '#333' }}>
            {session.name}
          </h2>
          <span className="font-body text-xs leading-tight" style={{ color: '#777' }}>
            {session.courseName}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* When collapsed, surface the result/progress so you don't have to expand */}
          {!open && (done > 0 || allComplete) && (
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-body text-sm font-bold leading-tight tabular-nums">
                <span style={{ color: TEAM_COLORS.team1 }}>{fmtPts(t1Pts)}</span>
                <span style={{ color: '#bbb' }}> – </span>
                <span style={{ color: TEAM_COLORS.team2 }}>{fmtPts(t2Pts)}</span>
              </span>
              <span className="font-body text-xs leading-tight" style={{ color: '#999' }}>
                {allComplete ? 'Final' : `${done}/${total} done`}
              </span>
            </div>
          )}

          <div className="flex flex-col items-end gap-0.5">
            <span className="font-body text-xs font-semibold leading-tight" style={{ color: badgeColor }}>
              {session.format}
            </span>
            <span className="font-body text-xs leading-tight" style={{ color: '#777' }}>
              {session.scoring === 'Stroke Play' ? 'Stroke' : 'Match'}
            </span>
          </div>

          {/* Chevron */}
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#999" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Matches */}
      {open && (
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
      )}
    </div>
  )
}
