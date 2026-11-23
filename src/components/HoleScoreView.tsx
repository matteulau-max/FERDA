import { useCallback, useState } from 'react'
import type { Match, SessionCourse, SessionRules } from '../lib/types'
import { GolfGps } from './rangefinder/GolfGps'

type Props = {
  match: Match
  rules: SessionRules
  course: SessionCourse
  holeNumber: number
  onHoleChange: (delta: number) => void
  onScoreChange: (hole: number, side: 'team1' | 'team2', player: string, gross: number | '') => void
  team1Name: string
  team2Name: string
}

export function HoleScoreView({ match, rules, course, holeNumber, onHoleChange, onScoreChange, team1Name, team2Name }: Props) {
  const [distance, setDistance] = useState<number | null>(null)
  const distanceChanged = useCallback((yards: number | null) => setDistance(yards), [])
  const hole = course.holes.find(h => h.number === holeNumber)
  if (!hole) return <p className="p-4 text-sm">This hole is not on the selected scorecard.</p>
  const sides = [
    { key: 'team1' as const, name: team1Name, players: rules.format === 'Scramble' ? match.team1Players.slice(0, 1) : match.team1Players },
    { key: 'team2' as const, name: team2Name, players: rules.format === 'Scramble' ? match.team2Players.slice(0, 1) : match.team2Players },
  ]
  const holes = [...course.holes].sort((a, b) => a.number - b.number)
  const index = holes.findIndex(h => h.number === holeNumber)

  return <div className="mx-auto max-w-xl space-y-3 px-3 pb-8 pt-3">
    <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
      <button className="min-h-11 rounded-lg px-3 text-2xl text-[#006747] disabled:opacity-30" disabled={index <= 0} onClick={() => onHoleChange(-1)} aria-label="Previous hole">‹</button>
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-gray-500">Hole {hole.number} of {holes.length}</p>
        <p className="font-serif text-xl font-bold text-[#19271f]">Par {hole.par} <span className="text-sm font-normal text-gray-500">· SI {hole.strokeIndex}</span></p>
        <p className="text-xs text-gray-500">{distance === null ? 'GPS distance unavailable' : `Middle · ${Math.round(distance)} yd GPS`}</p>
      </div>
      <button className="min-h-11 rounded-lg px-3 text-2xl text-[#006747] disabled:opacity-30" disabled={index >= holes.length - 1} onClick={() => onHoleChange(1)} aria-label="Next hole">›</button>
    </div>

    <div className="overflow-hidden rounded-xl border border-[#e8e5d8] bg-white">
      <GolfGps embeddedCourseName={course.name} selectedHole={hole.number} onEmbeddedHoleChange={onHoleChange} onDistanceChange={distanceChanged} />
    </div>

    <section className="space-y-3" aria-label={`Scores for hole ${hole.number}`}>
      <h2 className="px-1 font-serif text-lg font-bold text-[#19271f]">Enter scores</h2>
      {sides.map(side => <div key={side.key} className="overflow-hidden rounded-xl border border-[#e8e5d8] bg-white shadow-sm">
        <p className="bg-[#e8f5ef] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#006747]">{side.name}</p>
        {side.players.map(player => {
          const value = match.scores[hole.number]?.[side.key]?.[player]
          return <div key={player} className="flex min-h-20 items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#19271f]">{player}</span>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" aria-label={`Decrease ${player} score`} disabled={!value || value <= 1} onClick={() => onScoreChange(hole.number, side.key, player, value - 1)} className="h-12 w-12 rounded-xl border border-[#b8d1c2] bg-white text-2xl font-bold text-[#006747] disabled:opacity-30">−</button>
              <span aria-live="polite" className="w-10 text-center text-2xl font-bold tabular-nums text-[#19271f]">{value || '–'}</span>
              <button type="button" aria-label={`Increase ${player} score`} disabled={!!value && value >= 15} onClick={() => onScoreChange(hole.number, side.key, player, value ? value + 1 : hole.par)} className="h-12 w-12 rounded-xl bg-[#006747] text-2xl font-bold text-white">+</button>
            </div>
          </div>
        })}
      </div>)}
      <p className="px-1 text-xs text-gray-500">Tap + to enter par, then adjust. Scores save automatically. Handicap strokes and net scoring remain calculated by Ferda.</p>
    </section>

    <nav className="flex gap-3" aria-label="Hole navigation">
      <button type="button" disabled={index <= 0} onClick={() => onHoleChange(-1)} className="min-h-12 flex-1 rounded-xl border border-[#006747] bg-white px-3 font-semibold text-[#006747] disabled:opacity-30">← Previous</button>
      <button type="button" disabled={index >= holes.length - 1} onClick={() => onHoleChange(1)} className="min-h-12 flex-1 rounded-xl bg-[#006747] px-3 font-semibold text-white disabled:opacity-30">Next hole →</button>
    </nav>
  </div>
}
