import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProfileMenu } from '../components/ProfileMenu'
import { consumeAuthCallback, useFerdaSession } from '../lib/ferdaAuth'
import { fetchTournament, fetchTournaments, type TournamentSummary } from '../lib/api'
import { totalPoints } from '../lib/matchPlay'
import { isHistoricalTournament } from '../lib/tournamentCompletion'

const API_URL = import.meta.env.VITE_API_URL as string

type TournamentWithStatus = {
  summary: TournamentSummary
  historical: boolean
  score: { team1: number; team2: number } | null
}


/** Public tournament hub with account controls in the header. */
export function Tournaments() {
  const session = useFerdaSession()
  useEffect(() => { consumeAuthCallback() }, [])
  const [tournaments, setTournaments] = useState<TournamentWithStatus[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const list = await fetchTournaments(API_URL)
        const entries = await Promise.all(list.map(async summary => {
          const data = await fetchTournament(API_URL, summary.slug)
          const historical = isHistoricalTournament(summary.slug, data)
          const points = historical && summary.slug !== 'ferda-invitational-2026'
            ? totalPoints(data.sessions, data.players, data.courses)
            : null
          return {
            summary,
            historical,
            score: points ? { team1: points.team1, team2: points.team2 } : null,
          } satisfies TournamentWithStatus
        }))
        if (!cancelled) setTournaments(entries)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load tournaments')
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen" style={{ background: '#FDF8E8' }}>
      <header
        className="relative px-4 py-5 text-white"
        style={{ background: 'linear-gradient(135deg, #004d34 0%, #006747 60%, #004d34 100%)' }}
      >
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-body" style={{ color: '#FFF200', opacity: 0.85 }}>
              A Tradition Unlike Any Other
            </p>
            <h1 className="font-serif italic text-2xl font-bold" style={{ color: '#FFF200' }}>Ferda Golf</h1>
          </div>
          <ProfileMenu />
        </div>
      </header>

      <div className="px-4 py-6 max-w-md w-full mx-auto flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-bold text-[#19271f]">Tournaments</h2>
          <Link to="/new" className="rounded-lg bg-[#006747] px-4 py-2.5 text-sm font-semibold text-white">+ New event</Link>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-6 text-center" style={{ background: '#fff', border: '1px solid #e8e5d8' }}>
            <p className="font-serif text-lg text-gray-600 mb-1">Unable to load tournaments</p>
            <p className="text-xs text-red-500 font-body">{error}</p>
          </div>
        )}

        {!error && tournaments === null && (
          <>
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: '#f0ece0' }} />
            ))}
          </>
        )}

        {tournaments && <>
          <section aria-labelledby="current-events-title" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 id="current-events-title" className="font-serif text-lg font-bold text-[#19271f]">Live & upcoming</h3>
              <span className="text-xs text-gray-500">{tournaments.filter(t => !t.historical).length} events</span>
            </div>
            {tournaments.filter(t => !t.historical).length === 0
              ? <p className="rounded-xl border bg-white p-4 text-sm text-gray-500">No current tournaments. Start a new one above.</p>
              : tournaments.filter(t => !t.historical).map(t =>
                <TournamentCard key={t.summary.slug} tournament={t.summary} accessToken={session?.access_token || null} />)}
          </section>
          <section id="past-tournaments" aria-labelledby="past-events-title" className="space-y-3 pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 id="past-events-title" className="font-serif text-lg font-bold text-[#19271f]">Past tournaments</h3>
              <span className="text-xs text-gray-500">{tournaments.filter(t => t.historical).length} events</span>
            </div>
            {tournaments.filter(t => t.historical).length === 0
              ? <p className="rounded-xl border bg-white p-4 text-sm text-gray-500">Completed tournaments will appear here.</p>
              : tournaments.filter(t => t.historical).map(t =>
                <PastTournamentCard key={t.summary.slug} event={t} />)}
          </section>
        </>}
      </div>
    </div>
  )
}

function TournamentCard({ tournament: t, accessToken }: { tournament: TournamentSummary; accessToken: string | null }) {
  const [organizer, setOrganizer] = useState(false)
  useEffect(() => {
    let alive = true
    setOrganizer(false)
    if (!accessToken) return
    fetch(`/api/organizer-access?t=${encodeURIComponent(t.slug)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store',
    }).then(async response => {
      if (!response.ok) throw new Error('Permission lookup failed')
      return response.json()
    }).then(body => { if (alive) setOrganizer(body.organizer === true) })
      .catch(() => { if (alive) setOrganizer(false) })
    return () => { alive = false }
  }, [accessToken, t.slug])
  return (
    <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: '#fff', border: '1px solid #e8e5d8' }}>
      <Link to={`/t/${t.slug}`} className="block px-4 pt-4 pb-3 active:bg-gray-50">
        <h2 className="font-serif italic text-lg font-bold" style={{ color: '#19271f' }}>{t.name}</h2>
        <p className="font-body text-sm text-gray-600 mt-0.5">
          {t.team1Name} <span className="text-gray-400">v</span> {t.team2Name}
        </p>
        <p className="font-body text-xs text-gray-400 mt-1">
          {count(t.playerCount, 'player')} · {count(t.sessionCount, 'session')} · {count(t.matchCount, 'match', 'matches')}
        </p>
      </Link>
      <div className="flex" style={{ borderTop: '1px solid #f0ece0' }}>
        <Link
          to={`/t/${t.slug}`}
          className="flex-1 text-center py-2.5 font-body text-xs uppercase tracking-widest active:bg-gray-100"
          style={{ color: '#006747' }}
        >
          Leaderboard
        </Link>
        <Link to={`/t/${t.slug}/register`}
          className="flex-1 text-center py-2.5 font-body text-xs uppercase tracking-widest active:bg-gray-100"
          style={{ color: '#006747', borderLeft: '1px solid #f0ece0' }}>
          RSVP
        </Link>
        {organizer && <Link to={`/t/${t.slug}/organizer`}
          className="flex-1 text-center py-2.5 font-body text-xs uppercase tracking-widest active:bg-gray-100"
          style={{ color: '#006747', borderLeft: '1px solid #f0ece0' }}>
          Manage Event
        </Link>}
      </div>
    </div>
  )
}

function PastTournamentCard({ event }: { event: TournamentWithStatus }) {
  const { summary, score } = event
  const isArchive = summary.slug === 'ferda-invitational-2026'
  const winner = !score ? null : score.team1 === score.team2 ? 'Tied event'
    : `${score.team1 > score.team2 ? summary.team1Name : summary.team2Name} wins`
  return <Link to={`/t/${summary.slug}`} className="block rounded-xl border border-[#e8e5d8] bg-white p-4 shadow-sm active:bg-gray-50">
    <div className="flex items-start justify-between gap-3">
      <h4 className="font-serif italic text-lg font-bold text-[#19271f]">{summary.name}</h4>
      <span className="shrink-0 rounded-full bg-[#e6f2ec] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#006747]">
        {isArchive ? 'Archive' : 'Final'}
      </span>
    </div>
    <p className="mt-1 text-xs text-gray-500">{summary.matchCount} matches</p>
    <div className="mt-3 flex items-center justify-between gap-3 text-sm">
      <span className="flex-1 font-semibold">{summary.team1Name}</span>
      <span className="shrink-0 font-serif text-lg font-bold tabular-nums">
        {score ? `${score.team1} – ${score.team2}` : 'Archived scores'}
      </span>
      <span className="flex-1 text-right font-semibold">{summary.team2Name}</span>
    </div>
    <p className="mt-2 text-center text-xs text-[#006747]">{winner || (isArchive ? 'Read-only July 2026 results' : 'View final results')}</p>
    <p className="mt-2 text-center text-xs font-semibold uppercase tracking-wide text-[#006747]">View results →</p>
  </Link>
}

function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`
}
