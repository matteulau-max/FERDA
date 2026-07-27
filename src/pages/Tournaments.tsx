import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTournaments, type TournamentSummary } from '../lib/api'

const API_URL = import.meta.env.VITE_API_URL as string

/**
 * The landing page: every tournament in the database, newest first.
 * There's no sign-in yet, so this is deliberately a public index — anyone
 * with the site URL can find and open any event.
 */
export function Tournaments() {
  const [tournaments, setTournaments] = useState<TournamentSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchTournaments(API_URL)
      .then((list) => { if (!cancelled) setTournaments(list) })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load tournaments') })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen" style={{ background: '#FDF8E8' }}>
      <div
        className="text-white text-center py-8 px-4"
        style={{ background: 'linear-gradient(135deg, #004d34 0%, #006747 60%, #004d34 100%)' }}
      >
        <p className="text-xs uppercase tracking-widest font-body mb-1" style={{ color: '#FFF200', opacity: 0.85 }}>
          A Tradition Unlike Any Other
        </p>
        <h1 className="font-serif italic text-2xl font-bold" style={{ color: '#FFF200' }}>
          Tournaments
        </h1>
      </div>

      <div className="px-4 py-6 max-w-md w-full mx-auto flex flex-col gap-3">
        <Link
          to="/new"
          className="block text-center py-3 rounded-lg font-body font-semibold text-white"
          style={{ background: '#006747' }}
        >
          Start a tournament
        </Link>

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

        {tournaments?.length === 0 && (
          <p className="text-center font-body text-sm text-gray-500 py-8">
            No tournaments yet. Start one above.
          </p>
        )}

        {tournaments?.map((t) => <TournamentCard key={t.slug} tournament={t} />)}
      </div>
    </div>
  )
}

function TournamentCard({ tournament: t }: { tournament: TournamentSummary }) {
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
        <Link
          to={`/t/${t.slug}/setup`}
          className="flex-1 text-center py-2.5 font-body text-xs uppercase tracking-widest active:bg-gray-100"
          style={{ color: '#006747', borderLeft: '1px solid #f0ece0' }}
        >
          Setup
        </Link>
      </div>
    </div>
  )
}

function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`
}
