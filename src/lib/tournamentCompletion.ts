import { calcMatchStatus, calcSessionTotals } from './matchPlay'
import { courseForSession, sessionRules } from './holes'
import type { TournamentData } from './types'

/** A tournament is final only when every scheduled match is complete. */
export function isTournamentComplete(data: TournamentData): boolean {
  if (!data.sessions.length) return false
  return data.sessions.every(session => {
    if (!session.matches.length) return false
    const course = courseForSession(data.courses, session)
    if (!course) return false
    const rules = sessionRules(session)
    if (rules.scoring === 'Total Stroke Play')
      return calcSessionTotals(session, data.players, data.courses).isComplete
    return session.matches.every(match => calcMatchStatus(match, rules, data.players, course).isComplete)
  })
}

/** The imported July 2026 results are historical even without match-by-match completion flags. */
export function isHistoricalTournament(slug: string, data: TournamentData): boolean {
  return slug === 'ferda-invitational-2026' || isTournamentComplete(data)
}
