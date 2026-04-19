import type { MatchStatus, Team } from '../lib/types'
import { TEAM_COLORS } from '../lib/constants'

interface Props {
  status: MatchStatus
  team1: Team
  team2: Team
}

export function StatusBanner({ status, team1, team2 }: Props) {
  let bg = '#006747'
  let text = 'Not started'

  if (status.holesPlayed === 0) {
    bg = '#888'
    text = 'Not started'
  } else if (status.isComplete && status.result) {
    if (status.result.winner === 'team1') {
      bg = TEAM_COLORS.team1
      text = `${team1.name} wins ${status.result.text}`
    } else if (status.result.winner === 'team2') {
      bg = TEAM_COLORS.team2
      text = `${team2.name} wins ${status.result.text}`
    } else {
      bg = '#555'
      text = 'Match Halved'
    }
  } else if (status.t1Up === 0) {
    bg = '#555'
    text = `All Square thru ${status.holesPlayed}`
  } else {
    const lead = Math.abs(status.t1Up)
    if (status.t1Up > 0) {
      bg = TEAM_COLORS.team1
      text = `${team1.name} ${lead} UP thru ${status.holesPlayed}`
    } else {
      bg = TEAM_COLORS.team2
      text = `${team2.name} ${lead} UP thru ${status.holesPlayed}`
    }
  }

  return (
    <div
      className="px-4 py-3 text-center font-serif font-semibold text-white text-sm tracking-wide"
      style={{ background: bg }}
    >
      {text}
    </div>
  )
}
