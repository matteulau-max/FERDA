import type { Match, Player, SessionCourse, SessionRules } from '../lib/types'
import { sessionCourseHandicap, matchPlayingHandicaps } from '../lib/handicap'
import {
  TEAM_COLORS,
  SCRAMBLE_ALLOWANCES,
  BEST_BALL_ALLOWANCE,
  TWO_V_ONE_PAIR_ALLOWANCE,
  TWO_V_ONE_SOLO_ALLOWANCE,
} from '../lib/constants'

interface Props {
  match: Match
  rules: SessionRules
  players: Player[]
  course: SessionCourse
}

export function HandicapInfo({ match, rules, players, course }: Props) {
  const { format } = rules
  const playerMap = new Map(players.map((p) => [p.name.toLowerCase(), p]))

  const getPlayer = (name: string) => playerMap.get(name.toLowerCase())

  // Nothing to explain when the session is played gross.
  if (!rules.useHandicap) {
    return (
      <div className="mt-4 rounded-xl p-4 font-body" style={{ background: '#f9f7f1', border: '1px solid #e8e5d8' }}>
        <h3 className="font-serif text-sm font-semibold mb-1" style={{ color: '#333' }}>Handicap Info</h3>
        <p className="text-xs text-gray-500">
          This session is played <span className="font-semibold">gross</span> — no strokes are given.
        </p>
      </div>
    )
  }

  const { t1Phs, t2Phs } = format !== 'Scramble'
    ? matchPlayingHandicaps(match.team1Players, match.team2Players, players, course, format)
    : { t1Phs: [] as number[], t2Phs: [] as number[] }

  const renderSide = (names: string[], teamSide: 'team1' | 'team2') => {
    const phs = teamSide === 'team1' ? t1Phs : t2Phs
    const color = TEAM_COLORS[teamSide]

    if (format === 'Scramble') {
      const chs = names.map((n) => {
        const p = getPlayer(n)
        return p ? sessionCourseHandicap(p.handicapIndex, course) : 0
      })
      const sorted = [...chs].sort((a, b) => a - b)
      const n = names.length
      const allowances = SCRAMBLE_ALLOWANCES[n] ?? SCRAMBLE_ALLOWANCES[2]
      const teamPh = Math.round(sorted.reduce((acc, ch, i) => acc + ch * allowances[i], 0))

      return (
        <div>
          <div className="flex items-center gap-1 mb-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
            <span className="font-body text-xs font-semibold" style={{ color }}>{names.join(' / ')}</span>
          </div>
          <div className="text-xs font-body text-gray-500 pl-3">
            {names.map((name) => {
              const p = getPlayer(name)
              if (!p) return null
              const ch = sessionCourseHandicap(p.handicapIndex, course)
              return (
                <div key={name}>
                  {name}: HI {p.handicapIndex} → CH {ch}
                </div>
              )
            })}
            <div className="mt-0.5 font-semibold" style={{ color }}>
              Team PH: {teamPh} ({allowances.map((a) => `${Math.round(a * 100)}%`).join('/')} of sorted CHs)
            </div>
          </div>
        </div>
      )
    }

    // Singles, Best Ball, or 2 v 1 (pair discounted, solo at full allowance)
    const allowancePct =
      format === 'Best Ball'
        ? Math.round(BEST_BALL_ALLOWANCE * 100)
        : format === '2v1'
        ? Math.round((names.length > 1 ? TWO_V_ONE_PAIR_ALLOWANCE : TWO_V_ONE_SOLO_ALLOWANCE) * 100)
        : 100

    return (
      <div>
        <div className="flex items-center gap-1 mb-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
          <span className="font-body text-xs font-semibold" style={{ color }}>{names.join(' / ')}</span>
        </div>
        <div className="text-xs font-body text-gray-500 pl-3">
          {names.map((name, i) => {
            const p = getPlayer(name)
            if (!p) return null
            const ch = sessionCourseHandicap(p.handicapIndex, course)
            return (
              <div key={name}>
                {name}: HI {p.handicapIndex} → CH {ch} → PH {phs[i]} ({allowancePct}%)
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-xl p-4 font-body" style={{ background: '#f9f7f1', border: '1px solid #e8e5d8' }}>
      <h3 className="font-serif text-sm font-semibold mb-3" style={{ color: '#333' }}>
        Handicap Info
      </h3>

      <div className="text-xs text-gray-500 mb-3">
        <span className="font-semibold">{course.name}</span>
        {rules.holeSet !== 'All 18' && <> · <span className="font-semibold">{rules.holeSet}</span></>}
        {' · '}Rating {course.rating} / Slope {course.slope} / Par {course.par}
        {' · '}Format: <span className="font-semibold">{format}</span>
      </div>
      {rules.holeSet !== 'All 18' && (
        <p className="text-xs text-gray-400 mb-3">
          Nine-hole handicaps: half the index against half the rating, with the
          nine's stroke indexes re-ranked 1–9.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {renderSide(match.team1Players, 'team1')}
        {renderSide(match.team2Players, 'team2')}
      </div>
    </div>
  )
}
