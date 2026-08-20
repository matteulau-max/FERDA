import { useNavigate } from 'react-router-dom'
import type { Match, Player, SessionCourse, SessionRules, Team } from '../lib/types'
import { calcMatchStatus, isStrokePlay } from '../lib/matchPlay'
import { TEAM_COLORS } from '../lib/constants'
import { useTournamentRoute } from '../lib/paths'
import { formatTeeTime } from '../lib/time'

interface Props {
  match: Match
  rules: SessionRules
  players: Player[]
  course: SessionCourse
  team1: Team
  team2: Team
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export function MatchRow({ match, rules, players, course }: Props) {
  const navigate = useNavigate()
  const { base } = useTournamentRoute()
  const status = calcMatchStatus(match, rules, players, course)

  // In Total Stroke Play a single match wins nothing — it feeds its total into
  // the session pool — so the row shows both totals rather than a winner, and
  // skips the win/loss colouring that would imply otherwise.
  const isTotal = rules.scoring === 'Total Stroke Play'

  let borderColor = '#e8e5d8'
  let leftBg = 'transparent'
  let rightBg = 'transparent'
  let leftTextColor: string | undefined = undefined
  let rightTextColor: string | undefined = undefined

  if (isTotal) {
    // Tint only to show who is currently lower, never a "win".
    if (status.holesPlayed > 0 && status.t1Up > 0) {
      borderColor = TEAM_COLORS.team1
      leftBg = 'rgba(0, 103, 71, 0.10)'
    } else if (status.holesPlayed > 0 && status.t1Up < 0) {
      borderColor = TEAM_COLORS.team2
      rightBg = 'rgba(196, 30, 58, 0.10)'
    }
  } else if (status.isComplete && status.result) {
    if (status.result.winner === 'team1') {
      borderColor = TEAM_COLORS.team1
      leftBg = TEAM_COLORS.team1
      leftTextColor = '#fff'
    } else if (status.result.winner === 'team2') {
      borderColor = TEAM_COLORS.team2
      rightBg = TEAM_COLORS.team2
      rightTextColor = '#fff'
    } else {
      borderColor = TEAM_COLORS.team1
      leftBg = TEAM_COLORS.team1
      rightBg = TEAM_COLORS.team2
      leftTextColor = '#fff'
      rightTextColor = '#fff'
    }
  } else if (status.holesPlayed > 0) {
    if (status.t1Up > 0) {
      borderColor = TEAM_COLORS.team1
      leftBg = 'rgba(0, 103, 71, 0.10)'
    } else if (status.t1Up < 0) {
      borderColor = TEAM_COLORS.team2
      rightBg = 'rgba(196, 30, 58, 0.10)'
    }
  }

  const inProgressLabel = (lead: number) =>
    isStrokePlay(status.scoring) ? `by ${fmt(lead)}` : `${fmt(lead)} UP`

  // Total Stroke Play: each side's running total is the number that matters.
  const leftScore: string | null = isTotal
    ? (status.holesPlayed > 0 ? fmt(status.t1Total) : null)
    : status.isComplete && status.result?.winner === 'team1'
      ? status.result.text
      : !status.isComplete && status.t1Up > 0
      ? inProgressLabel(status.t1Up)
      : null

  const rightScore: string | null = isTotal
    ? (status.holesPlayed > 0 ? fmt(status.t2Total) : null)
    : status.isComplete && status.result?.winner === 'team2'
      ? status.result.text
      : !status.isComplete && status.t1Up < 0
      ? inProgressLabel(Math.abs(status.t1Up))
      : null

  const centerText: string =
    status.holesPlayed === 0
      ? '•'
      : isTotal
      ? (status.isComplete ? 'F' : `thru ${status.holesPlayed}`)
      : status.isComplete
      ? (status.result?.winner === 'halved' ? 'A/S' : 'F')
      : status.t1Up === 0
      ? 'A/S'
      : `thru ${status.holesPlayed}`

  const teeTime = formatTeeTime(match.teeTime)

  return (
    <button
      onClick={() => navigate(`${base}/match/${match.id}`)}
      className="w-full text-left rounded-lg border-l-4 shadow-sm active:opacity-80 transition-opacity overflow-hidden"
      style={{
        background: '#fff',
        borderLeftColor: borderColor,
        borderTopColor: '#e8e5d8',
        borderRightColor: '#e8e5d8',
        borderBottomColor: '#e8e5d8',
        borderTopWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
      }}
    >
      {/* The centre column is a fixed width rather than `auto`, so a tee time
          can't widen it and squeeze the names either side — and so every row
          lines up with its neighbours instead of each sizing to its own text.

          3.25rem is set by the widest thing that has to fit: "thru 12" at 12px
          (38px) and a two-digit tee time at 10px (41px). It needs no padding
          of its own — the name columns either side already carry px-2 — which
          is what keeps it within the ~48px `auto` was already handing the
          widest rows. */}
      <div className="grid grid-cols-[2.5rem_1fr_3.25rem_1fr_2.5rem]">

        {/* Col 1 — team1 score, fills same bg as team1 column */}
        <div className="flex items-center justify-center py-3" style={{ background: leftBg }}>
          {leftScore && (
            <span className="font-body text-xs font-bold whitespace-nowrap" style={{ color: leftTextColor ?? TEAM_COLORS.team1 }}>
              {leftScore}
            </span>
          )}
        </div>

        {/* Col 2 — team1 player names */}
        <div
          className="flex flex-col items-end justify-center min-w-0 px-2 py-3"
          style={{ background: leftBg }}
        >
          {match.team1Players.map((name, i) => (
            <div
              key={i}
              className="font-body font-medium text-right"
              style={{
                color: leftTextColor ?? TEAM_COLORS.team1,
                fontSize: 'clamp(10px, 3.5vw, 13px)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Col 3 — tee time over the match status */}
        <div className="flex flex-col items-center justify-center flex-shrink-0 min-w-0 overflow-hidden py-3">
          {teeTime && (
            <span
              className="font-body tabular-nums whitespace-nowrap max-w-full overflow-hidden leading-none mb-0.5"
              style={{ color: '#999', fontSize: 'clamp(8px, 2.6vw, 10px)' }}
            >
              {teeTime}
            </span>
          )}
          <span
            className="font-body text-xs font-semibold whitespace-nowrap max-w-full overflow-hidden leading-tight"
            style={{ color: '#555' }}
          >
            {centerText}
          </span>
        </div>

        {/* Col 4 — team2 player names */}
        <div
          className="flex flex-col items-start justify-center min-w-0 px-2 py-3"
          style={{ background: rightBg }}
        >
          {match.team2Players.map((name, i) => (
            <div
              key={i}
              className="font-body font-medium"
              style={{
                color: rightTextColor ?? TEAM_COLORS.team2,
                fontSize: 'clamp(10px, 3.5vw, 13px)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Col 5 — team2 score, fills same bg as team2 column */}
        <div className="flex items-center justify-center py-3" style={{ background: rightBg }}>
          {rightScore && (
            <span className="font-body text-xs font-bold whitespace-nowrap" style={{ color: rightTextColor ?? TEAM_COLORS.team2 }}>
              {rightScore}
            </span>
          )}
        </div>

      </div>
    </button>
  )
}
