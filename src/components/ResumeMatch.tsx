import { useEffect, useState } from 'react'
import { useFerdaSession } from '../lib/ferdaAuth'
import { calcMatchStatus } from '../lib/matchPlay'
import { Link } from 'react-router-dom'
import { useTournamentRoute } from '../lib/paths'
import { courseForSession, sessionRules } from '../lib/holes'
import type { TournamentData } from '../lib/types'
import { useTournament } from '../hooks/useTournament'

export function InviteMatch() {
  const { slug } = useTournamentRoute()
  const { data } = useTournament(import.meta.env.VITE_API_URL, slug)
  return data ? <ResumeMatch data={data} /> : null
}

export function ResumeMatch({ data }: { data: TournamentData }) {
  const { base } = useTournamentRoute()
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

  const { players, courses, sessions } = data
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

  return current ? <Link to={`${base}/match/${encodeURIComponent(current.match.id)}?hole=${current.hole.number}`} className="flex min-h-12 items-center justify-between rounded-xl bg-[#123d31] px-4 py-3 font-bold text-white">
          <span>{current.started ? 'Resume my match' : 'Open my match'}</span><span>Hole {current.hole.number} →</span>
        </Link> : null
}
