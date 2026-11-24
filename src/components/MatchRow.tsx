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

  const teeTime = formatTeeTime(match.teeTime)
  const progress = status.isComplete ? 'Final' : status.holesPlayed ? `Thru ${status.holesPlayed}` : teeTime || 'Upcoming'
  const tied = !isTotal && status.holesPlayed > 0 && (status.isComplete ? status.result?.winner === 'halved' : status.t1Up === 0)

  return (
    <button type="button" onClick={() => navigate(`${base}/match/${match.id}`)}
      className="grid min-h-16 w-full grid-cols-[minmax(0,1fr)_4rem_minmax(0,1fr)] items-center gap-2 border-b border-[#dce5df] bg-white px-3 py-3 text-left last:border-b-0 active:bg-[#eff5f1]">
      {(['team1', 'team2'] as const).map(side => {
        const first = side === 'team1'
        const names = first ? match.team1Players : match.team2Players
        const score = first ? leftScore : rightScore
        return <div key={side} className={first ? 'col-start-1 row-start-1' : 'col-start-3 row-start-1 text-right'}>
          {names.map(name => <p key={name} className="break-words text-sm font-semibold leading-snug" style={{ color: TEAM_COLORS[side] }}>{name}</p>)}
          {score && <p className="mt-1 text-sm font-bold tabular-nums">{score}</p>}
        </div>
      })}
      <div className="col-start-2 row-start-1 text-center text-xs font-semibold text-[#495c52]">
        {tied && <p className="text-[#173a2b]">Tied</p>}
        <p>{progress}</p>
        {teeTime && (status.isComplete || status.holesPlayed > 0) && <p className="font-normal">{teeTime}</p>}
      </div>
    </button>
  )
}
