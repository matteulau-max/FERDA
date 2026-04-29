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
  let leftBg = 'transparent'
  let rightBg = 'transparent'
  let leftTextColor: string | undefined = undefined
  let rightTextColor: string | undefined = undefined

  if (status.isComplete && status.result) {
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
      <div className="grid grid-cols-[2.5rem_1fr_auto_1fr_2.5rem]">

        {/* Col 1 — team1 score, white area outside colored section */}
        <div className="flex items-center justify-center py-3">
          {leftScore && (
            <span className="font-body text-xs font-bold whitespace-nowrap" style={{ color: TEAM_COLORS.team1 }}>
              {leftScore}
            </span>
          )}
        </div>

        {/* Col 2 — team1 player name */}
        <div
          className="flex flex-col items-end justify-center min-w-0 px-2 py-3"
          style={{ background: leftBg }}
        >
          <span className="font-body text-sm font-medium text-right leading-snug" style={{ color: leftTextColor ?? TEAM_COLORS.team1 }}>
            {match.team1Players.join(' / ')}
          </span>
        </div>

        {/* Col 3 — center status */}
        <div className="flex items-center justify-center flex-shrink-0 px-2 py-3">
          <span className="font-body text-xs font-semibold whitespace-nowrap" style={{ color: '#555' }}>
            {centerText}
          </span>
        </div>

        {/* Col 4 — team2 player name */}
        <div
          className="flex flex-col items-start justify-center min-w-0 px-2 py-3"
          style={{ background: rightBg }}
        >
          <span className="font-body text-sm font-medium leading-snug" style={{ color: rightTextColor ?? TEAM_COLORS.team2 }}>
            {match.team2Players.join(' / ')}
          </span>
        </div>

        {/* Col 5 — team2 score, white area outside colored section */}
        <div className="flex items-center justify-center py-3">
          {rightScore && (
            <span className="font-body text-xs font-bold whitespace-nowrap" style={{ color: TEAM_COLORS.team2 }}>
              {rightScore}
            </span>
          )}
        </div>

      </div>
    </button>
  )
}
