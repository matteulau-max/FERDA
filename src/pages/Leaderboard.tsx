import { useTournament } from '../hooks/useTournament'
import { HeroScoreboard } from '../components/HeroScoreboard'
import { SessionCard } from '../components/SessionCard'

const API_URL = import.meta.env.VITE_API_URL as string

export function Leaderboard() {
  const { data, loading, error } = useTournament(API_URL)

  if (loading) return <LoadingSkeleton />

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center" style={{ background: '#FDF8E8' }}>
        {/* Header even in error state */}
        <div
          className="fixed top-0 left-0 right-0 text-white text-center py-4"
          style={{ background: 'linear-gradient(135deg, #004d34 0%, #006747 100%)' }}
        >
          <p className="text-xs uppercase tracking-widest font-body" style={{ color: '#FFF200', opacity: 0.85 }}>
            A Tradition Unlike Any Other
          </p>
          <h1 className="font-serif italic text-xl font-bold" style={{ color: '#FFF200' }}>
            Ferda Invitational
          </h1>
        </div>
        <div className="mt-24">
          <p className="font-serif text-lg text-gray-600 mb-2">Unable to load tournament</p>
          {!API_URL && (
            <p className="text-sm text-gray-400 font-body">
              Set <code className="bg-gray-100 px-1 rounded">VITE_API_URL</code> in <code className="bg-gray-100 px-1 rounded">.env</code> to connect your Google Sheet.
            </p>
          )}
          {error && <p className="text-xs text-red-400 font-body mt-1">{error}</p>}
        </div>
      </div>
    )
  }

  const { teams, players, courses, sessions } = data

  return (
    <div className="min-h-screen" style={{ background: '#FDF8E8' }}>
      <HeroScoreboard tournament={data} />

      <div className="px-3 py-4 flex flex-col gap-4">
        {[...sessions]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((session) => {
            const course = courses.find((c) => c.name === session.courseName) ?? courses[0]
            return (
              <SessionCard
                key={session.name}
                session={session}
                players={players}
                course={course}
                team1={teams.team1}
                team2={teams.team2}
              />
            )
          })}
      </div>

      <footer className="text-center text-xs font-body text-gray-400 py-6">
        Updates every 15s · Ferda Invitational 2026
      </footer>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: '#FDF8E8' }}>
      {/* Hero skeleton */}
      <div
        className="px-4 py-8 text-center"
        style={{ background: 'linear-gradient(135deg, #004d34 0%, #006747 100%)' }}
      >
        <div className="h-3 w-40 bg-white/20 rounded mx-auto mb-3 animate-pulse" />
        <div className="h-7 w-56 bg-white/20 rounded mx-auto mb-4 animate-pulse" />
        <div className="h-12 w-48 bg-white/20 rounded mx-auto animate-pulse" />
      </div>

      <div className="px-3 py-4 flex flex-col gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl overflow-hidden shadow-sm" style={{ border: '1px solid #e8e5d8', background: '#fff' }}>
            <div className="h-12 animate-pulse" style={{ background: '#f0ece0' }} />
            <div className="p-3 flex flex-col gap-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-12 rounded-lg animate-pulse" style={{ background: '#f5f3ec' }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
