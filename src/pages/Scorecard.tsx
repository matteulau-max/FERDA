import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTournament } from '../hooks/useTournament'
import { useScoreSave } from '../hooks/useScoreSave'
import { useTournamentRoute, href } from '../lib/paths'
import { StatusBanner } from '../components/StatusBanner'
import { ScoreTable } from '../components/ScoreTable'
import { HandicapInfo } from '../components/HandicapInfo'
import { MatchWormChart } from '../components/MatchWormChart'
import { OverflowMenu } from '../components/OverflowMenu'
import { RangefinderDialog } from '../components/rangefinder/Rangefinder'
import { calcMatchStatus, totalPoints, calcSessionTotals } from '../lib/matchPlay'
import { courseForSession, sessionRules } from '../lib/holes'
import { SCORING_LABELS } from '../lib/constants'
import type { Match, MatchScores } from '../lib/types'

const API_URL = import.meta.env.VITE_API_URL as string
export function Scorecard() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { slug, base } = useTournamentRoute()
  const { data, loading } = useTournament(API_URL, slug)
  const { save } = useScoreSave(API_URL, slug)
  const [showRangefinder, setShowRangefinder] = useState(false)
  const [showTeamPulse, setShowTeamPulse] = useState(false)

  // Local optimistic scores state
  const [localScores, setLocalScores] = useState<MatchScores>({})

  // Save status indicator
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const inFlightRef = useRef(0)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Find the match + session
  const session = data?.sessions.find((s) => s.matches.some((m) => m.id === matchId))
  const match = session?.matches.find((m) => m.id === matchId)

  // Sync local scores with fetched scores (merge — local optimistic wins if same hole)
  useEffect(() => {
    if (match) {
      setLocalScores((prev) => mergeScores(match.scores, prev))
    }
  }, [match?.scores]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScoreChange = useCallback(
    async (hole: number, side: 'team1' | 'team2', player: string, gross: number | '') => {
      if (gross === 0) return
      if (gross === '') {
        setLocalScores((prev) => {
          const updated = { ...prev }
          if (!updated[hole]) return prev
          const side_ = { ...updated[hole][side] }
          delete side_[player]
          updated[hole] = { ...updated[hole], [side]: side_ }
          return updated
        })
        return
      }

      // Optimistic update
      setLocalScores((prev) => {
        const updated = { ...prev }
        if (!updated[hole]) updated[hole] = { team1: {}, team2: {} }
        updated[hole] = {
          ...updated[hole],
          [side]: { ...updated[hole][side], [player]: gross },
        }
        return updated
      })

      inFlightRef.current++
      setSaveStatus('saving')
      clearTimeout(savedTimerRef.current)

      try {
        await save({ matchId: matchId!, hole, side, player, grossScore: gross as number })
      } catch {
        inFlightRef.current--
        setSaveStatus('error')
        return
      }

      inFlightRef.current--
      if (inFlightRef.current === 0) {
        setSaveStatus('saved')
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      }
    },
    [matchId, save],
  )

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

      <TeamPulse data={data} expanded={showTeamPulse} onToggle={() => setShowTeamPulse(v => !v)} />

      <div className="px-4 py-2 flex justify-end" style={{ borderBottom: '1px solid #e8e5d8' }}>
        <button onClick={() => setShowRangefinder(true)} className="font-body text-sm font-semibold px-3 py-2 rounded-lg" style={{ color: '#006747', border: '1px solid #c5dacc' }}>
          Rangefinder
        </button>
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
          {saveStatus === 'saving' && 'Saving...'}
          {saveStatus === 'saved' && 'Saved'}
          {saveStatus === 'error' && 'Save failed — check your connection'}
        </div>
      )}

      <StatusBanner status={status} team1={data.teams.team1} team2={data.teams.team2} />

      {/* Score tables */}
      {course && (
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
      {status.holesPlayed > 0 && course && (
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

      {course && (
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

/** Merge fetched scores with local optimistic scores. Local wins on conflict. */
function mergeScores(fetched: MatchScores, local: MatchScores): MatchScores {
  const result: MatchScores = { ...fetched }
  for (const [holeStr, holeScores] of Object.entries(local)) {
    const hole = Number(holeStr)
    if (!result[hole]) {
      result[hole] = holeScores
    } else {
      result[hole] = {
        team1: { ...result[hole].team1, ...holeScores.team1 },
        team2: { ...result[hole].team2, ...holeScores.team2 },
      }
    }
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
  return <section className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
    <button type="button" onClick={onToggle} aria-expanded={expanded}
      className="w-full px-4 py-2 text-left flex justify-between items-center gap-2">
      <span className="text-xs font-bold" style={{ color: '#006747' }}>TEAM PULSE</span>
      <span className="text-sm font-bold tabular-nums">{data.teams.team1.name} {fmt(locked.team1)} – {fmt(locked.team2)} {data.teams.team2.name}</span>
      <span className="text-xs text-gray-500">{expanded ? '▲' : '▼'}</span>
    </button>
    {expanded && <div className="px-4 pb-3 text-xs font-body space-y-2">
      <p className="text-gray-600">Secured points above · Live projection: {fmt(projected1)} – {fmt(projected2)} · {live} matches in progress</p>
      {matches.map(m => <div key={m.id} className="flex justify-between gap-3 border-t pt-2">
        <span className="min-w-0">{m.label}</span><span className="shrink-0 font-semibold">{m.status}</span>
      </div>)}
      {live === 0 && <p className="text-gray-500">No matches currently underway.</p>}
    </div>}
  </section>
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
