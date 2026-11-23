import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTournament, fetchTournaments } from '../lib/api'
import { totalPoints } from '../lib/matchPlay'
import { isHistoricalTournament } from '../lib/tournamentCompletion'

const API_URL = import.meta.env.VITE_API_URL as string

interface CompletedEvent {
  slug: string
  name: string
  createdAt: string
  team1: string
  team2: string
  points1: number | null
  points2: number | null
  matches: number
}

export function History() {
  const [events, setEvents] = useState<CompletedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const summaries = await fetchTournaments(API_URL)
        // A tournament is archived only after every scheduled match is finished.
        // The summary endpoint does not expose completion, so inspect each event.
        const results = await Promise.allSettled(summaries.map(async summary => {
          const data = await fetchTournament(API_URL, summary.slug)
          if (!isHistoricalTournament(summary.slug, data)) return null
          const isArchive = summary.slug === 'ferda-invitational-2026'
          const points = isArchive ? null : totalPoints(data.sessions, data.players, data.courses)
          return {
            slug: summary.slug,
            name: summary.name,
            createdAt: summary.createdAt,
            team1: data.teams.team1.name,
            team2: data.teams.team2.name,
            points1: points?.team1 ?? null,
            points2: points?.team2 ?? null,
            matches: summary.matchCount,
          } satisfies CompletedEvent
        }))
        if (cancelled) return
        const failures = results.filter(r => r.status === 'rejected')
        if (failures.length) throw new Error('Some tournament records could not be loaded. Please try again.')
        setEvents(results.flatMap(r => r.status === 'fulfilled' && r.value ? [r.value] : []))
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load history')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen" style={{ background: '#FDF8E8' }}>
      <header className="px-4 py-8 text-center text-white" style={{ background: '#004d34' }}>
        <Link to="/" className="block text-xs uppercase tracking-widest mb-4" style={{ color: '#FFF200' }}>← All tournaments</Link>
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#FFF200' }}>The record books</p>
        <h1 className="font-serif italic text-3xl font-bold" style={{ color: '#FFF200' }}>Tournament History</h1>
        <p className="text-sm mt-2 text-white/70">Final results from completed events</p>
      </header>
      <main className="max-w-md mx-auto px-4 py-6 space-y-3">
        {loading && <p className="text-center text-sm text-gray-500">Loading completed events…</p>}
        {error && <p role="alert" className="text-center text-sm text-red-700">{error}</p>}
        {!loading && !error && events.length === 0 && <p className="text-center text-sm text-gray-500">No completed tournaments yet. Events appear here automatically when every match is final.</p>}
        {events.map(event => {
          const isArchive = event.slug === 'ferda-invitational-2026'
          const winner = isArchive ? '' : event.points1 === event.points2 ? 'Tie' : (event.points1 ?? 0) > (event.points2 ?? 0) ? event.team1 : event.team2
          return (
            <Link key={event.slug} to={`/t/${event.slug}`} className="block rounded-xl bg-white p-5 shadow-sm active:bg-gray-50" style={{ border: '1px solid #e8e5d8' }}>
              <div className="flex justify-between items-start gap-2">
                <h2 className="font-serif italic text-xl font-bold" style={{ color: '#003d26' }}>{event.name}</h2>
                <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#006747' }}>{isArchive ? 'Read-only archive' : 'Final'}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{event.createdAt ? new Date(event.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''} · {event.matches} matches</p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mt-4 text-center">
                <div className="text-sm font-semibold">{event.team1}</div>
                <div className="font-serif font-bold text-xl tabular-nums">{isArchive ? 'Archived scores' : `${event.points1} – ${event.points2}`}</div>
                <div className="text-sm font-semibold">{event.team2}</div>
              </div>
              <p className="text-center text-sm mt-3" style={{ color: '#006747' }}>{isArchive ? 'Imported from the July 2026 Google Sheets scoring workbook' : winner === 'Tie' ? 'Tied event' : `${winner} wins`}</p>
              <p className="text-center text-xs uppercase tracking-widest mt-3 text-gray-500">View historical leaderboard and scorecards →</p>
            </Link>
          )
        })}
      </main>
    </div>
  )
}
