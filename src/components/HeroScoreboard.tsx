import type { TournamentData } from '../lib/types'
import { totalPoints, calcMatchStatus } from '../lib/matchPlay'

interface Props {
  tournament: TournamentData
}

export function HeroScoreboard({ tournament }: Props) {
  const { courses, teams, players, sessions } = tournament
  const pts = totalPoints(sessions, players, courses)

  // Compute converging bar totals across all sessions
  let t1Locked = 0, t2Locked = 0, t1Proj = 0, t2Proj = 0, startedCount = 0
  let totalMatches = 0
  for (const session of sessions) {
    const course = courses.find((c) => c.name === session.courseName) ?? courses[0]
    if (!course) continue
    totalMatches += session.matches.length
    for (const match of session.matches) {
      const status = calcMatchStatus(match, session.format, players, course, session.scoring ?? 'Match Play')
      if (status.isComplete && status.result) {
        startedCount++
        if (status.result.winner === 'team1')      { t1Locked += 1; t1Proj += 1 }
        else if (status.result.winner === 'team2') { t2Locked += 1; t2Proj += 1 }
        else { t1Locked += 0.5; t2Locked += 0.5; t1Proj += 0.5; t2Proj += 0.5 }
      } else if (status.holesPlayed > 0) {
        startedCount++
        if (status.t1Up > 0) t1Proj += 1
        else if (status.t1Up < 0) t2Proj += 1
        else { t1Proj += 0.5; t2Proj += 0.5 }
      }
    }
  }

  const scale = totalMatches > 0 ? 100 / totalMatches : 0
  const t1LockedPct = t1Locked * scale
  const t1ProjPct   = (t1Proj - t1Locked) * scale
  const t2ProjPct   = (t2Proj - t2Locked) * scale
  const t2LockedPct = t2Locked * scale

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

      {/* Converging progress bar — shown once any match has started */}
      {startedCount > 0 && (
        <div className="mt-4 rounded-2xl px-3 py-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="flex items-center gap-2">
            {/* T1 total outside */}
            <span className="font-body text-xs font-bold w-6 text-right tabular-nums" style={{ color: '#4ade80' }}>
              {fmt(t1Proj)}
            </span>
            <div className="flex-1 relative h-7 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.08)' }}>
              {/* T1 locked — number centered inside */}
              <div className="h-full transition-all duration-500 flex items-center justify-center overflow-hidden" style={{ width: `${t1LockedPct}%`, background: '#4ade80', minWidth: t1Locked > 0 ? 1 : 0 }}>
                {t1Locked > 0 && <span className="text-xs font-bold font-body leading-none tabular-nums" style={{ color: '#004d34' }}>{fmt(t1Locked)}</span>}
              </div>
              {/* T1 proj lead — number centered inside */}
              <div className="h-full transition-all duration-500 flex items-center justify-center overflow-hidden" style={{ width: `${t1ProjPct}%`, background: 'rgba(77,222,128,0.35)', minWidth: (t1Proj - t1Locked) > 0 ? 1 : 0 }}>
                {(t1Proj - t1Locked) > 0 && <span className="text-xs font-bold font-body leading-none tabular-nums" style={{ color: '#4ade80' }}>{fmt(t1Proj - t1Locked)}</span>}
              </div>
              {/* empty gap */}
              <div className="flex-1" />
              {/* T2 proj lead — number centered inside */}
              <div className="h-full transition-all duration-500 flex items-center justify-center overflow-hidden" style={{ width: `${t2ProjPct}%`, background: 'rgba(196,30,58,0.5)', minWidth: (t2Proj - t2Locked) > 0 ? 1 : 0 }}>
                {(t2Proj - t2Locked) > 0 && <span className="text-xs font-bold font-body leading-none tabular-nums" style={{ color: '#ffb3b3' }}>{fmt(t2Proj - t2Locked)}</span>}
              </div>
              {/* T2 locked — number centered inside */}
              <div className="h-full transition-all duration-500 flex items-center justify-center overflow-hidden" style={{ width: `${t2LockedPct}%`, background: '#C41E3A', minWidth: t2Locked > 0 ? 1 : 0 }}>
                {t2Locked > 0 && <span className="text-xs font-bold font-body leading-none tabular-nums" style={{ color: '#fff' }}>{fmt(t2Locked)}</span>}
              </div>
              {/* center line = winning threshold */}
              <div className="absolute top-0 bottom-0" style={{ left: '50%', width: 1.5, background: '#fff', opacity: 0.3, transform: 'translateX(-50%)' }} />
            </div>
            {/* T2 total outside */}
            <span className="font-body text-xs font-bold w-6 text-left tabular-nums" style={{ color: '#C41E3A' }}>
              {fmt(t2Proj)}
            </span>
          </div>
        </div>
      )}

      <p className="text-center text-xs mt-3 font-body opacity-60">{courses.map((c) => c.name).join(' · ')}</p>
    </div>
  )
}

function formatPts(n: number): string {
  return n % 1 === 0 ? String(n) : String(n)
}

const fmt = (n: number) => n % 1 === 0 ? String(n) : n.toFixed(1)
