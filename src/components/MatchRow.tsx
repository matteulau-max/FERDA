import { useNavigate } from 'react-router-dom'
import type { Course, Format, Match, Player, Team } from '../lib/types'
import { calcMatchStatus } from '../lib/matchPlay'
import { TEAM_COLORS } from '../lib/constants'

interface Props {
  match: Match
  format: Format
  players: Player[]
  course: Course
  team1: Team
  team2: Team
}

export function MatchRow({ match, format, players, course }: Props) {
  const navigate = useNavigate()
  const status = calcMatchStatus(match, format, players, course)

  let borderColor = '#e8e5d8'
  let cardBg = '#fff'
  let cardTextColor: string | undefined = undefined

  if (status.isComplete && status.result) {
    if (status.result.winner === 'team1') {
      borderColor = TEAM_COLORS.team1
      cardBg = TEAM_COLORS.team1
      cardTextColor = '#fff'
    } else if (status.result.winner === 'team2') {
      borderColor = TEAM_COLORS.team2
      cardBg = TEAM_COLORS.team2
      cardTextColor = '#fff'
    } else {
      borderColor = TEAM_COLORS.team1
      cardBg = `linear-gradient(to right, ${TEAM_COLORS.team1} 50%, ${TEAM_COLORS.team2} 50%)`
      cardTextColor = '#fff'
    }
  } else if (status.holesPlayed > 0) {
    if (status.t1Up > 0) {
      borderColor = TEAM_COLORS.team1
      cardBg = 'rgba(0, 103, 71, 0.08)'
    } else if (status.t1Up < 0) {
      borderColor = TEAM_COLORS.team2
      cardBg = 'rgba(196, 30, 58, 0.08)'
    }
  }

  const leftScore: string | null =
    status.isComplete && status.result?.winner === 'team1'
      ? status.result.text
      : !status.isComplete && status.t1Up > 0
      ? `${status.t1Up} UP`
      : null

  const rightScore: string | null =
    status.isComplete && status.result?.winner === 'team2'
      ? status.result.text
      : !status.isComplete && status.t1Up < 0
      ? `${Math.abs(status.t1Up)} UP`
      : null

  const centerText: string =
    status.holesPlayed === 0
      ? '•'
      : status.isComplete
      ? (status.result?.winner === 'halved' ? 'A/S' : 'F')
      : status.t1Up === 0
      ? 'A/S'
      : `thru ${status.holesPlayed}`

  return (
    <button
      onClick={() => navigate(`/match/${match.id}`)}
      className="w-full text-left rounded-lg border-l-4 shadow-sm active:opacity-80 transition-opacity overflow-hidden"
      style={{
        background: cardBg,
        borderLeftColor: borderColor,
        borderTopColor: '#e8e5d8',
        borderRightColor: '#e8e5d8',
        borderBottomColor: '#e8e5d8',
        borderTopWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
      }}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 px-3 py-3">

        {/* LEFT — team1 side, right-aligned */}
        <div className="flex flex-col items-end min-w-0">
          {leftScore && (
            <span className="font-body text-sm font-bold mb-0.5" style={{ color: cardTextColor ?? '#111' }}>
              {leftScore}
            </span>
          )}
          <span className="font-body text-sm font-medium text-right leading-snug" style={{ color: cardTextColor ?? TEAM_COLORS.team1 }}>
            {match.team1Players.join(' / ')}
          </span>
        </div>

        {/* CENTER — narrow status */}
        <div className="flex flex-col items-center flex-shrink-0 px-1">
          <span className="font-body text-xs font-semibold whitespace-nowrap" style={{ color: cardTextColor ? 'rgba(255,255,255,0.85)' : '#555' }}>
            {centerText}
          </span>
        </div>

        {/* RIGHT — team2 side, left-aligned */}
        <div className="flex flex-col items-start min-w-0">
          {rightScore && (
            <span className="font-body text-sm font-bold mb-0.5" style={{ color: cardTextColor ?? '#111' }}>
              {rightScore}
            </span>
          )}
          <span className="font-body text-sm font-medium leading-snug" style={{ color: cardTextColor ?? TEAM_COLORS.team2 }}>
            {match.team2Players.join(' / ')}
          </span>
        </div>

      </div>
    </button>
  )
}
