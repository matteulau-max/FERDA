import { useState } from 'react'

/**
 * Visual prototype only. Illustrative data; not connected to tournament scoring.
 * Intended to guide the production TeamPulse redesign without altering live results.
 */
export function TeamPulseBroadcastPreview() {
  const [expanded, setExpanded] = useState(true)
  const matches = [
    { name: 'Match 1', score: 'Green 2 UP', thru: '14', leader: 'green' },
    { name: 'Match 2', score: 'Purple 1 UP', thru: '12', leader: 'purple' },
    { name: 'Match 3', score: 'All square', thru: '16', leader: 'neutral' },
  ]
  return (
    <section className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-emerald-900/20 bg-white shadow-lg font-body" aria-label="Team Pulse design preview">
      <div className="bg-[#063d2c] px-4 py-3 text-white">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold tracking-[.18em] uppercase">Ferda Open · Live</span>
          <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold">DESIGN PREVIEW</span>
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          <div><p className="text-xs text-emerald-100">Team Green</p><p className="text-4xl font-black tabular-nums">8.5</p></div>
          <div className="text-xs text-emerald-100">SECURED<br />POINTS</div>
          <div><p className="text-xs text-emerald-100">Team Purple</p><p className="text-4xl font-black tabular-nums">7.5</p></div>
        </div>
        <div className="mt-3 flex justify-between rounded-lg bg-white/10 px-3 py-2 text-xs">
          <span>Projected: Green 10 – Purple 9</span><span>3 live matches</span>
        </div>
      </div>
      <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-[#063d2c]">
        <span>Match tracker & momentum</span><span aria-hidden>{expanded ? '−' : '+'}</span>
      </button>
      {expanded && <div className="space-y-3 border-t border-gray-100 px-4 pb-4 pt-3">
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
          <span className="font-bold">Momentum watch</span>
          <p className="mt-1 text-xs">Example: Green has won three consecutive holes in Match 1.</p>
        </div>
        {matches.map(m => <div key={m.name} className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2 text-sm">
          <span className="text-gray-600">{m.name} <span className="text-xs">· thru {m.thru}</span></span>
          <span className={`font-bold ${m.leader === 'green' ? 'text-emerald-800' : m.leader === 'purple' ? 'text-violet-700' : 'text-gray-600'}`}>{m.score}</span>
        </div>)}
        <p className="text-xs text-gray-500">All values are sample data. Production commentary must be generated from verified completed-hole events.</p>
      </div>}
    </section>
  )
}
