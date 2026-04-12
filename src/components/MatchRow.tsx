import { useNavigate } from 'react-router-dom'
import type { Course, Format, Match, Player, Team } from '../lib/types'
import { calcMatchStatus, matchStatusTextWithNames } from '../lib/matchPlay'
import { TEAM_COLORS } from '../lib/constants'

interface Props {
  match: Match
  format: Format
  players: Player[]
  course: Course
  team1: Team
  team2: Team
}

export function MatchRow({ match, format, players, course, team1, team2 }: Props) {
  const navigate = useNavigate()
  const status = calcMatchStatus(match, format, players, course)

  const statusText = matchStatusTextWithNames(status, team1.name, team2.name)

  let borderColor = '#e8e5d8'
  let badgeBg = '#f5f5f5'
  let badgeText = '#666'

  if (status.isComplete && status.result) {
    if (status.result.winner === 'team1') {
      borderColor = TEAM_COLORS.team1
      badgeBg = TEAM_COLORS.team1
      badgeText = '#fff'
    } else if (status.result.winner === 'team2') {
      borderColor = TEAM_COLORS.team2
      badgeBg = TEAM_COLORS.team2
      badgeText = '#fff'
    }
  } else if (status.holesPlayed > 0) {
    if (status.t1Up > 0) {
      borderColor = TEAM_COLORS.team1
    } else if (status.t1Up < 0) {
      borderColor = TEAM_COLORS.team2
    }
  }

  return (
    <button
      onClick={() => navigate(`/match/${match.id}`)}
      className="w-full text-left bg-white rounded-lg px-3 py-3 border-l-4 shadow-sm active:opacity-80 transition-opacity"
      style={{ borderLeftColor: borderColor, borderTopColor: '#e8e5d8', borderRightColor: '#e8e5d8', borderBottomColor: '#e8e5d8', borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1 }}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Players */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="font-body text-sm font-medium" style={{ color: TEAM_COLORS.team1 }}>
              {match.team1Players.join(' / ')}
            </span>
            <span className="text-gray-400 text-xs">vs</span>
            <span className="font-body text-sm font-medium" style={{ color: TEAM_COLORS.team2 }}>
              {match.team2Players.join(' / ')}
            </span>
          </div>
        </div>

        {/* Status badge */}
        <div
          className="text-xs font-body font-semibold px-2 py-1 rounded whitespace-nowrap flex-shrink-0"
          style={{ background: badgeBg, color: badgeText }}
        >
          {statusText}
        </div>
      </div>
    </button>
  )
}
