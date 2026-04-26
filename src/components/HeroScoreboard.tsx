import type { TournamentData } from '../lib/types'
import { totalPoints } from '../lib/matchPlay'

interface Props {
  tournament: TournamentData
}

export function HeroScoreboard({ tournament }: Props) {
  const { courses, teams, players, sessions } = tournament
  const pts = totalPoints(sessions, players, courses)

  return (
    <div
      className="text-white px-4 py-6"
      style={{ background: 'linear-gradient(135deg, #004d34 0%, #006747 60%, #004d34 100%)' }}
    >
      <div className="text-center mb-1">
        <p
          className="text-xs uppercase tracking-widest mb-1 font-body"
          style={{ color: '#FFF200', opacity: 0.85 }}
        >
          A Tradition Unlike Any Other
        </p>
        <h1 className="font-serif italic text-2xl font-bold tracking-wide" style={{ color: '#FFF200' }}>
          Ferda Invitational
        </h1>
      </div>

      <div className="mt-4 flex items-center justify-center gap-4">
        {/* Team 1 */}
        <div className="flex-1 text-right">
          <p className="font-serif font-semibold text-base leading-tight">{teams.team1.name}</p>
        </div>

        {/* Score */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.25)' }}
        >
          <span className="font-serif text-4xl font-bold" style={{ color: '#FFF200', minWidth: '2.5rem', textAlign: 'right' }}>
            {formatPts(pts.team1)}
          </span>
          <span className="text-white opacity-60 font-body text-xl">–</span>
          <span className="font-serif text-4xl font-bold" style={{ color: '#FFF200', minWidth: '2.5rem', textAlign: 'left' }}>
            {formatPts(pts.team2)}
          </span>
        </div>

        {/* Team 2 */}
        <div className="flex-1 text-left">
          <p className="font-serif font-semibold text-base leading-tight">{teams.team2.name}</p>
        </div>
      </div>

      <p className="text-center text-xs mt-3 font-body opacity-60">{courses.map((c) => c.name).join(' · ')}</p>
    </div>
  )
}

function formatPts(n: number): string {
  return n % 1 === 0 ? String(n) : String(n)
}
