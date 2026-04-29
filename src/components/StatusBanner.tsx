import type { MatchStatus, Team } from '../lib/types'
import { TEAM_COLORS } from '../lib/constants'

interface Props {
  status: MatchStatus
  team1: Team
  team2: Team
}

export function StatusBanner({ status, team1, team2 }: Props) {
  let bg = '#006747'
  let winnerText = ''
  let resultText = ''

  if (status.holesPlayed === 0) {
    return (
      <div
        className="px-4 py-3 text-center font-serif font-semibold text-white text-sm tracking-wide"
        style={{ background: '#888' }}
      >
        Not started
      </div>
    )
  }

  if (status.isComplete && status.result) {
    if (status.result.winner === 'team1') {
      bg = TEAM_COLORS.team1
      winnerText = `${team1.name} wins`
      resultText = status.result.text
    } else if (status.result.winner === 'team2') {
      bg = TEAM_COLORS.team2
      winnerText = `${team2.name} wins`
      resultText = status.result.text
    } else {
      bg = '#4b5563'
      winnerText = 'Match Halved'
      resultText = ''
    }

    return (
      <div
        className="px-4 py-4 text-center font-serif text-white relative overflow-hidden"
        style={{ background: bg }}
      >
        {/* Shimmer sweep */}
        <div className="shimmer-sweep absolute inset-0 pointer-events-none" />
        <div
          className="text-xs font-body tracking-widest uppercase mb-1"
          style={{ opacity: 0.75, letterSpacing: '0.12em' }}
        >
          Match Complete
        </div>
        <div className="text-xl font-bold tracking-wide leading-tight">
          {winnerText}
        </div>
        {resultText && (
          <div
            className="text-sm font-body mt-0.5"
            style={{ opacity: 0.85 }}
          >
            {resultText}
          </div>
        )}
      </div>
    )
  }

  // In progress
  let text: string
  if (status.t1Up === 0) {
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
