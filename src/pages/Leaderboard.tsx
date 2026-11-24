import { useEffect, useState } from 'react'
import { useFerdaSession } from '../lib/ferdaAuth'
import { calcMatchStatus } from '../lib/matchPlay'
import { Link } from 'react-router-dom'
import { useTournament } from '../hooks/useTournament'
import { useTournamentRoute } from '../lib/paths'
import { courseForSession, sessionRules } from '../lib/holes'
import { HeroScoreboard } from '../components/HeroScoreboard'
import { SessionCard } from '../components/SessionCard'
import { PlayerLeaderboard } from '../components/PlayerLeaderboard'
import { TabNav } from '../components/TabNav'
import { OverflowMenu } from '../components/OverflowMenu'

const API_URL = import.meta.env.VITE_API_URL as string

export function Leaderboard() {
  const { slug, base } = useTournamentRoute()
  const { data, loading, error } = useTournament(API_URL, slug)

  const account = useFerdaSession()
  const token = account?.access_token
  const [identity, setIdentity] = useState<{ token: string; name: string; phone: string } | null>(null)
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    void fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async response => response.ok ? response.json() : null)
      .then(result => {
        if (!controller.signal.aborted && result?.profile) {
          setIdentity({ token, name: result.profile.full_name || '', phone: result.profile.phone || '' })
        }
      }).catch(() => {})
    return () => controller.abort()
  }, [token])

  if (loading) return <LoadingSkeleton />

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center" style={{ background: '#FDF8E8' }}>
        {/* Header even in error state */}
        <div
          className="fixed top-0 left-0 right-0 text-white text-center"
          style={{ background: 'linear-gradient(135deg, #004d34 0%, #006747 100%)' }}
        >
          <div className="relative py-4">
            <div className="absolute right-2 top-3">
              <OverflowMenu />
            </div>
            <p className="text-xs uppercase tracking-widest font-body" style={{ color: '#FFF200', opacity: 0.85 }}>
              A Tradition Unlike Any Other
            </p>
            <h1 className="font-serif italic text-xl font-bold px-10" style={{ color: '#FFF200' }}>
              Ferda Invitational
            </h1>
          </div>
          <TabNav />
        </div>
        <div className="mt-24">
          <p className="font-serif text-lg text-gray-600 mb-2">Unable to load tournament</p>
          {!API_URL && (
            <p className="text-sm text-gray-400 font-body">
              Set <code className="bg-gray-100 px-1 rounded">VITE_API_URL</code> in <code className="bg-gray-100 px-1 rounded">.env</code> to connect your tournament backend.
            </p>
          )}
          {error && <p className="text-xs text-red-400 font-body mt-1">{error}</p>}
          <Link to="/" className="inline-block mt-4 font-body text-sm underline" style={{ color: '#006747' }}>
            See all tournaments
          </Link>
        </div>
      </div>
    )
  }

  const { teams, players, courses, sessions } = data
  const profile = identity && identity.token === token ? identity : null
  const normalizePhone = (value = '') => value.replace(/\D/g, '')
  const byPhone = profile?.phone ? players.filter(p => normalizePhone(p.phone) === normalizePhone(profile.phone)) : []
  const candidates = byPhone.length ? byPhone : players.filter(p => profile?.name && p.name.trim().toLowerCase() === profile.name.trim().toLowerCase())
  const player = candidates.length === 1 ? candidates[0] : null
  const matches = player ? [...sessions].sort((a, b) => a.sortOrder - b.sortOrder).flatMap(session => {
    const course = courseForSession(courses, session)
    if (!course) return []
    const rules = sessionRules(session)
    return session.matches.filter(m => [...m.team1Players, ...m.team2Players].includes(player.name)).flatMap(match => {
      const status = calcMatchStatus(match, rules, players, course)
      if (status.isComplete) return []
      const hole = [...course.holes].sort((a, b) => a.number - b.number).find(h =>
        (['team1', 'team2'] as const).some(side => {
          const names = side === 'team1' ? match.team1Players : match.team2Players
          return (rules.format === 'Scramble' ? names.slice(0, 1) : names).some(name => !match.scores[h.number]?.[side]?.[name])
        }))
      return hole ? [{ match, hole, started: Object.keys(match.scores).length > 0 }] : []
    })
  }) : []
  const current = matches.find(m => m.started) ?? matches[0]

  return (
    <div className="min-h-screen" style={{ background: '#FDF8E8' }}>
      <div className="sticky top-0 z-10">
        <HeroScoreboard tournament={data} />
        <TabNav />
      </div>

      <div className="px-3 py-4 flex flex-col gap-4">
        {current && <Link to={`${base}/match/${encodeURIComponent(current.match.id)}?hole=${current.hole.number}`} className="flex min-h-12 items-center justify-between rounded-xl bg-[#123d31] px-4 py-3 font-bold text-white">
          <span>My match</span><span>Hole {current.hole.number} →</span>
        </Link>}
        {[...sessions]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((session) => {
            const course = courseForSession(courses, session)
            if (!course) return null
            return (
              <SessionCard
                key={session.name}
                session={session}
                players={players}
                course={course}
                courses={courses}
                team1={teams.team1}
                team2={teams.team2}
              />
            )
          })}
        <PlayerLeaderboard sessions={sessions} players={players} courses={courses} />
      </div>

      <footer className="text-center text-xs font-body text-gray-400 py-6">
        Updates every 15s · Ferda Invitational 2025
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
