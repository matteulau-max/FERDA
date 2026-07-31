import { useState } from 'react'
import type { Player, SessionCourse, Session, Team } from '../lib/types'
import { MatchRow } from './MatchRow'
import { calcMatchStatus, calcSessionTotals, matchPoints } from '../lib/matchPlay'
import { sessionRules } from '../lib/holes'
import { TEAM_COLORS, FORMAT_LABELS, SCORING_SHORT_LABELS } from '../lib/constants'

interface Props {
  session: Session
  players: Player[]
  /** Already scoped to the session's holes — see courseForSession. */
  course: SessionCourse
  /** Every course, so the session roll-up can resolve its own. */
  courses: import('../lib/types').Course[]
  team1: Team
  team2: Team
}

const FORMAT_COLORS: Record<string, string> = {
  Singles: '#006747',
  'Best Ball': '#8B6914',
  Scramble: '#1a4f7a',
  '2v1': '#7a1a5f',
}

const fmtPts = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(1))
const fmtScore = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export function SessionCard({ session, players, course, courses, team1, team2 }: Props) {
  const rules = sessionRules(session)
  const badgeColor = FORMAT_COLORS[session.format] ?? '#555'
  const isTotal = rules.scoring === 'Total Stroke Play'

  // Total Stroke Play is decided by the pooled team totals, so its roll-up
  // comes from the session rather than from counting match wins.
  const totals = isTotal ? calcSessionTotals(session, players, courses) : null

  let t1Pts = 0
  let t2Pts = 0
  let done = 0
  for (const match of session.matches) {
    const status = calcMatchStatus(match, rules, players, course)
    if (status.isComplete) done++
    if (!isTotal) {
      const pts = matchPoints(status)
      t1Pts += pts.team1
      t2Pts += pts.team2
    }
  }
  if (totals) {
    t1Pts = totals.points.team1
    t2Pts = totals.points.team2
  }

  const total = session.matches.length
  const allComplete = total > 0 && done === total

  // Default: completed rounds start collapsed, the live round stays open.
  const [open, setOpen] = useState(!allComplete)

  const subtitle = [
    session.courseName,
    rules.holeSet !== 'All 18' ? rules.holeSet : null,
    rules.useHandicap ? null : 'Gross',
  ].filter(Boolean).join(' · ')

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
            {subtitle}
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
              {FORMAT_LABELS[session.format] ?? session.format}
            </span>
            <span className="font-body text-xs leading-tight" style={{ color: '#777' }}>
              {SCORING_SHORT_LABELS[rules.scoring]}
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

      {/* The pooled scoreboard — this is the actual result of the session, so
          it sits above the matches that feed it. */}
      {open && totals && (
        <TotalStrokeBanner
          totals={totals}
          team1={team1}
          team2={team2}
          pointsPerStroke={rules.pointsPerStroke}
        />
      )}

      {/* Matches */}
      {open && (
        <div className="p-3 flex flex-col gap-2">
          {session.matches.map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              rules={rules}
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

function TotalStrokeBanner({
  totals, team1, team2, pointsPerStroke,
}: {
  totals: import('../lib/types').SessionTotals
  team1: Team
  team2: Team
  pointsPerStroke: number
}) {
  const leaderName = totals.leader === 'team1' ? team1.name : totals.leader === 'team2' ? team2.name : null
  const leaderColor = totals.leader === 'team1' ? TEAM_COLORS.team1 : TEAM_COLORS.team2
  const award = totals.points.team1 + totals.points.team2

  return (
    <div className="px-4 py-3" style={{ background: '#fbf9f3', borderBottom: '1px solid #e8e5d8' }}>
      <div className="flex items-center justify-center gap-4">
        <TeamTotal name={team1.name} score={totals.team1} color={TEAM_COLORS.team1} lead={totals.leader === 'team1'} />
        <span className="font-body text-xs" style={{ color: '#bbb' }}>vs</span>
        <TeamTotal name={team2.name} score={totals.team2} color={TEAM_COLORS.team2} lead={totals.leader === 'team2'} />
      </div>
      <p className="text-center font-body text-xs mt-2" style={{ color: '#666' }}>
        {leaderName === null ? (
          <>Level — no points{totals.isComplete ? '' : ' yet'}</>
        ) : (
          <>
            <span style={{ color: leaderColor, fontWeight: 600 }}>{leaderName}</span>
            {` by ${fmtScore(totals.margin)} ${totals.margin === 1 ? 'stroke' : 'strokes'} · `}
            <span style={{ color: leaderColor, fontWeight: 600 }}>
              {fmtPts(award)} {award === 1 ? 'pt' : 'pts'}
            </span>
            {totals.isComplete ? '' : ' so far'}
          </>
        )}
      </p>
      <p className="text-center font-body mt-0.5" style={{ color: '#aaa', fontSize: 10 }}>
        {pointsPerStroke} pt{pointsPerStroke === 1 ? '' : 's'} per stroke
      </p>
    </div>
  )
}

function TeamTotal({ name, score, color, lead }: { name: string; score: number; color: string; lead: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="font-serif font-bold tabular-nums leading-none"
        style={{ color: lead ? color : '#999', fontSize: 26 }}
      >
        {score > 0 ? fmtScore(score) : '–'}
      </span>
      <span className="font-body text-xs mt-1" style={{ color: '#888' }}>{name}</span>
    </div>
  )
}
