import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTournament } from '../hooks/useTournament'
import { useScoreSave } from '../hooks/useScoreSave'
import { useTournamentRoute, href } from '../lib/paths'
import { StatusBanner } from '../components/StatusBanner'
import { ScoreTable } from '../components/ScoreTable'
import { HoleScoreView } from '../components/HoleScoreView'
import { HandicapInfo } from '../components/HandicapInfo'
import { MatchWormChart } from '../components/MatchWormChart'
import { OverflowMenu } from '../components/OverflowMenu'
import { RangefinderDialog } from '../components/rangefinder/Rangefinder'
import { calcMatchStatus, totalPoints, calcSessionTotals } from '../lib/matchPlay'
import { tournamentHighlights } from '../lib/teamPulseHighlights'
import { courseForSession, sessionRules } from '../lib/holes'
import { SCORING_LABELS } from '../lib/constants'
import type { Match, MatchScores } from '../lib/types'

const API_URL = import.meta.env.VITE_API_URL as string
export function Scorecard() {
  const { slug, matchId } = useParams()
  return <MatchScorecard key={JSON.stringify([slug, matchId])} />
}

function MatchScorecard() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { slug, base } = useTournamentRoute()
  const { data, loading, refetch } = useTournament(API_URL, slug)
  const { save } = useScoreSave(API_URL, slug)
  const [showRangefinder, setShowRangefinder] = useState(false)
  const [showTeamPulse, setShowTeamPulse] = useState(false)
  const [scoreView, setScoreView] = useState<'hole' | 'table'>('hole')
  const [selectedHole, setSelectedHole] = useState<number | null>(() => Number(new URLSearchParams(window.location.search).get('hole')) || null)

  const prefix = 'ferda-score-v1:' + JSON.stringify([API_URL, slug ?? null, matchId]) + ':'
  const [pending, setPending] = useState<Record<string, number>>({})
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'waiting' | 'error'>('idle')
  const busy = useRef(false)
  const mounted = useRef(true)
  const session = data?.sessions.find(s => s.matches.some(m => m.id === matchId))
  const match = session?.matches.find(m => m.id === matchId)
  const localScores = mergePendingScores(match?.scores ?? {}, pending)

  const sync = useCallback(async () => {
    if (busy.current || !matchId) return
    busy.current = true
    async function drain() {
      let wrote = false
      while (mounted.current) {
        const entries = Object.keys(localStorage).filter(key => key.startsWith(prefix))
        const edits: Record<string, number> = {}
        for (const entry of entries) {
          edits[entry.slice(prefix.length)] = Number(localStorage.getItem(entry))
        }
        setPending(edits)
        if (!entries.length) {
          if (wrote) setSaveStatus('saved')
          return
        }
        if (!navigator.onLine) { setSaveStatus('waiting'); return }
        setSaveStatus('saving')
        const entry = entries[0]
        const raw = localStorage.getItem(entry)
        if (raw === null) continue
        const [hole, side, player] = JSON.parse(entry.slice(prefix.length)) as [number, 'team1' | 'team2', string]
        if (!API_URL) throw new Error('Missing score service')
        await save({ matchId: matchId!, hole, side, player, grossScore: Number(raw) })
        if (localStorage.getItem(entry) === raw) localStorage.removeItem(entry)
        wrote = true
        await refetch()
      }
    }
    try {
      if (navigator.locks) await navigator.locks.request(prefix, drain)
      else await drain()
    } catch (err) {
      if (mounted.current) setSaveStatus(err instanceof TypeError || !navigator.onLine ? 'waiting' : 'error')
    } finally {
      busy.current = false
    }
  }, [prefix, matchId, save, refetch])

  useEffect(() => {
    mounted.current = true
    void sync()
    const retry = window.setInterval(sync, 15000)
    window.addEventListener('online', sync)
    window.addEventListener('storage', sync)
    return () => {
      mounted.current = false
      window.clearInterval(retry)
      window.removeEventListener('online', sync)
      window.removeEventListener('storage', sync)
    }
  }, [sync])

  const handleScoreChange = (hole: number, side: 'team1' | 'team2', player: string, gross: number | '') => {
    if (!gross) { setSaveStatus('error'); return }
    const key = scoreKey(hole, side, player)
    try {
      localStorage.setItem(prefix + key, String(gross))
      setPending(previous => ({ ...previous, [key]: gross }))
      setSaveStatus(navigator.onLine ? 'saving' : 'waiting')
      void sync()
    } catch {
      setSaveStatus('error')
    }
  }

  if (loading) return <ScorecardSkeleton />

  if (!data || !match || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#FDF8E8' }}>
        <p className="font-serif text-lg text-gray-600">Match not found</p>
        <button onClick={() => navigate(href(base))} className="mt-4 text-sm font-body underline" style={{ color: '#006747' }}>
          Back to leaderboard
        </button>
      </div>
    )
  }

  const rules = sessionRules(session)
  const course = courseForSession(data.courses, session)

  const status = calcMatchStatus({ ...match, scores: localScores }, rules, data.players, course)

  const matchWithLocal: Match = { ...match, scores: localScores }

  // A nine only fills one of the two tables, so skip the empty one entirely.
  const showFront = !!course?.holes.some((h) => h.number <= 9)
  const showBack = !!course?.holes.some((h) => h.number > 9)
  const holeNumbers = [...(course?.holes ?? [])].map(h => h.number).sort((a, b) => a - b)
  const activeHole = selectedHole !== null && holeNumbers.includes(selectedHole) ? selectedHole : holeNumbers[0]
  const moveHole = (delta: number) => {
    const index = holeNumbers.indexOf(activeHole)
    setSelectedHole(holeNumbers[Math.max(0, Math.min(holeNumbers.length - 1, index + delta))])
  }

  const subtitle = [
    session.name,
    session.format,
    rules.holeSet !== 'All 18' ? rules.holeSet : null,
    rules.scoring !== 'Match Play' ? SCORING_LABELS[rules.scoring] : null,
    rules.useHandicap ? null : 'Gross (no handicaps)',
  ].filter(Boolean).join(' · ')

  return (
    <div className="min-h-screen" style={{ background: '#FDF8E8' }}>
      {/* Back nav */}
      <div style={{ background: '#006747' }} className="px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(href(base))} className="text-white opacity-75 active:opacity-50 text-lg leading-none">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-serif font-semibold text-sm leading-tight">
            {match.team1Players.join(' / ')} vs {match.team2Players.join(' / ')}
          </p>
          <p className="text-white/60 font-body text-xs">{subtitle}</p>
        </div>
        <OverflowMenu />
      </div>

      <div className="sticky top-0 z-20 shadow-sm">
        <StatusBanner status={status} team1={data.teams.team1} team2={data.teams.team2} />
      </div>
      <div className="mx-auto flex max-w-xl gap-2 px-3 pt-3" role="tablist" aria-label="Scoring display">
        <button type="button" role="tab" aria-selected={scoreView === 'hole'} onClick={() => setScoreView('hole')} className={`min-h-12 flex-1 rounded-xl px-3 text-sm font-bold ${scoreView === 'hole' ? 'bg-[#006747] text-white' : 'bg-white text-[#006747] border border-[#c5dacc]'}`}>Hole view</button>
        <button type="button" role="tab" aria-selected={scoreView === 'table'} onClick={() => setScoreView('table')} className={`min-h-12 flex-1 rounded-xl px-3 text-sm font-bold ${scoreView === 'table' ? 'bg-[#006747] text-white' : 'bg-white text-[#006747] border border-[#c5dacc]'}`}>Full scorecard</button>
      </div>
      {showRangefinder && <RangefinderDialog onClose={() => setShowRangefinder(false)} context={course?.name} />}

      {saveStatus !== 'idle' && (
        <div
          className="px-4 py-1.5 text-xs font-body flex items-center gap-1.5"
          style={{
            background: saveStatus === 'error' ? '#fef3f2' : '#e8f5ef',
            color: saveStatus === 'error' ? '#c41e3a' : '#006747',
            borderBottom: '1px solid',
            borderColor: saveStatus === 'error' ? '#fcd5d0' : '#c3e6d5',
          }}
        >
          {saveStatus === 'waiting' && 'Saved on this device · waiting to sync'}
          {saveStatus === 'saving' && 'Saving...'}
          {saveStatus === 'saved' && 'Saved'}
          {saveStatus === 'error' && 'Score not confirmed · check your connection and score'}
        </div>
      )}

      {scoreView === 'hole' && course && activeHole !== undefined && <HoleScoreView
        match={matchWithLocal}
        players={data.players}
        rules={rules}
        course={course}
        holeNumber={activeHole}
        onHoleChange={moveHole}
        onScoreChange={handleScoreChange}
        team1Name={data.teams.team1.name}
        team2Name={data.teams.team2.name}
      />}

      {scoreView === 'hole' && <div className="mx-auto flex max-w-xl justify-end px-3 pt-2">
        <button type="button" onClick={() => setShowRangefinder(true)} className="rounded-lg border border-[#c5dacc] bg-white px-4 py-2 text-sm font-semibold text-[#006747]">Camera slope tool ↗</button>
      </div>}
      <TeamPulse data={data} expanded={showTeamPulse} onToggle={() => setShowTeamPulse(v => !v)} />

      {/* Traditional table remains available as a secondary view. */}
      {scoreView === 'table' && course && (
        <div className="px-0 py-3 flex flex-col gap-4">
          {showFront && (
            <div className="bg-white rounded-xl mx-3 overflow-hidden shadow-sm" style={{ border: '1px solid #e8e5d8' }}>
              <ScoreTable
                match={matchWithLocal}
                rules={rules}
                players={data.players}
                course={course}
                side="front"
                localScores={localScores}
                onScoreChange={handleScoreChange}
              />
            </div>
          )}
          {showBack && (
            <div className="bg-white rounded-xl mx-3 overflow-hidden shadow-sm" style={{ border: '1px solid #e8e5d8' }}>
              <ScoreTable
                match={matchWithLocal}
                rules={rules}
                players={data.players}
                course={course}
                side="back"
                localScores={localScores}
                onScoreChange={handleScoreChange}
              />
            </div>
          )}
        </div>
      )}

      {/* Worm chart — only shown once at least 1 hole is scored */}
      {scoreView === 'table' && status.holesPlayed > 0 && course && (
        <div className="mx-3 mb-1">
          <MatchWormChart
            match={matchWithLocal}
            rules={rules}
            players={data.players}
            course={course}
            team1={data.teams.team1}
            team2={data.teams.team2}
          />
        </div>
      )}

      {scoreView === 'table' && course && (
        <div className="mx-3">
          <HandicapInfo match={match} rules={rules} players={data.players} course={course} />
        </div>
      )}

      <footer className="text-center text-xs font-body text-gray-400 py-6">
        Scores auto-saved · Updates every 10s
      </footer>
    </div>
  )
}

/** A stable key for one golfer's score on one hole. */
function scoreKey(hole: number, side: string, player: string): string {
  return JSON.stringify([hole, side, player])
}

/** Server scores win except while an optimistic edit has not yet appeared on the server. */
function mergePendingScores(server: MatchScores, pending: Record<string, number>): MatchScores {
  const result: MatchScores = structuredClone(server)
  for (const [key, value] of Object.entries(pending)) {
    const [hole, side, player] = JSON.parse(key) as [number, 'team1' | 'team2', string]
    if (!result[hole]) result[hole] = { team1: {}, team2: {} }
    result[hole][side][player] = value
  }
  return result
}

function TeamPulse({ data, expanded, onToggle }: {
  data: import('../lib/types').TournamentData
  expanded: boolean
  onToggle: () => void
}) {
  const locked = totalPoints(data.sessions, data.players, data.courses)
  let projected1 = locked.team1, projected2 = locked.team2, live = 0
  const matches: { id: string; label: string; status: string }[] = []
  for (const session of data.sessions) {
    const rules = sessionRules(session)
    const course = courseForSession(data.courses, session)
    if (!course) continue
    if (rules.scoring === 'Total Stroke Play') {
      const totals = calcSessionTotals(session, data.players, data.courses)
      if (!totals.isComplete) {
        projected1 += totals.points.team1
        projected2 += totals.points.team2
      }
    }
    for (const match of session.matches) {
      const status = calcMatchStatus(match, rules, data.players, course)
      if (!status.isComplete && status.holesPlayed > 0) {
        live++
        if (rules.scoring !== 'Total Stroke Play') {
          if (status.t1Up > 0) projected1 += 1
          else if (status.t1Up < 0) projected2 += 1
          else { projected1 += 0.5; projected2 += 0.5 }
        }
        const lead = status.t1Up === 0 ? 'All square'
          : `${status.t1Up > 0 ? data.teams.team1.name : data.teams.team2.name} ${Math.abs(status.t1Up)} ${rules.scoring === 'Match Play' ? 'UP' : 'strokes ahead'}`
        matches.push({
          id: match.id,
          label: `${match.team1Players.join(' / ')} vs ${match.team2Players.join(' / ')}`,
          status: `${lead} · thru ${status.holesPlayed}`,
        })
      }
    }
  }
  const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1)
  const team1 = data.teams.team1.name
  const team2 = data.teams.team2.name
  const highlights = tournamentHighlights(data)
  return (
    <section className="overflow-hidden border-b border-emerald-900/20 bg-white" aria-label="Team Pulse">
      <button type="button" onClick={onToggle} aria-expanded={expanded}
        className="w-full bg-[#063d2c] px-4 py-2 text-left text-white">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[.16em]">Ferda Open · Team Pulse</span>
          <span className="text-xs text-emerald-100">{expanded ? 'Collapse ▲' : 'Matches ▼'}</span>
        </div>
        <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          <div><p className="truncate text-xs text-emerald-100">{team1}</p><p className="text-2xl font-black tabular-nums">{fmt(projected1)}</p></div>
          <div className="text-[10px] font-semibold uppercase leading-tight text-emerald-100">Projected<br />points</div>
          <div><p className="truncate text-xs text-emerald-100">{team2}</p><p className="text-2xl font-black tabular-nums">{fmt(projected2)}</p></div>
        </div>
        <p className="mt-1 text-center text-[11px] text-emerald-100">Secured {fmt(locked.team1)} – {fmt(locked.team2)} · {live} live {live === 1 ? 'match' : 'matches'}</p>
      </button>
      {expanded && <div className="space-y-3 px-4 py-3 font-body text-sm">
        <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-950" role="status">
          <p className="text-xs font-bold uppercase tracking-wide">Tournament highlights</p>
          {highlights.length > 0 ? <ul className="mt-2 space-y-2">
            {highlights.map(event => <li key={event.id} className="text-xs">{event.text}</li>)}
          </ul> : <p className="mt-1 text-xs">No notable match swings yet. Highlights appear as holes are scored.</p>}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Live match tracker</p>
        {matches.map(m => <div key={m.id} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2">
          <span className="min-w-0 text-xs text-gray-600">{m.label}</span>
          <span className="shrink-0 text-right text-xs font-bold text-emerald-900">{m.status}</span>
        </div>)}
        {live === 0 && <p className="text-xs text-gray-500">No matches currently underway.</p>}
        <p className="text-[11px] text-gray-500">Secured points reflect completed results. Projections include current live leaders and may change.</p>
      </div>}
    </section>
  )
}

function ScorecardSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: '#FDF8E8' }}>
      <div className="h-14 animate-pulse" style={{ background: '#006747' }} />
      <div className="h-10 animate-pulse" style={{ background: '#e8f5ef' }} />
      <div className="mx-3 mt-3 h-64 rounded-xl animate-pulse" style={{ background: '#f0ece0' }} />
      <div className="mx-3 mt-3 h-64 rounded-xl animate-pulse" style={{ background: '#f0ece0' }} />
    </div>
  )
}
