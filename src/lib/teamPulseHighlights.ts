import { calcMatchStatus, holeWinnerHighlights } from './matchPlay'
import { courseForSession, sessionRules } from './holes'
import type { TournamentData, Match, SessionCourse, SessionRules, Player } from './types'

export interface PulseHighlight {
  id: string
  matchId: string
  hole: number
  kind: 'comeback' | 'lead-change' | 'streak' | 'close-finish'
  text: string
  priority: number
}

/** Recompute the match after each completed hole, using the canonical scoring engine. */
function snapshots(match: Match, rules: SessionRules, players: Player[], course: SessionCourse) {
  const ordered = [...course.holes].sort((a, b) => a.number - b.number)
  const out: { hole: number; lead: number; played: number; remaining: number }[] = []
  const partial: Match = { ...match, scores: {} }
  for (const hole of ordered) {
    if (!match.scores[hole.number]) continue
    partial.scores = { ...partial.scores, [hole.number]: match.scores[hole.number] }
    const status = calcMatchStatus(partial, rules, players, course)
    if (status.holesPlayed > out.length) {
      out.push({ hole: hole.number, lead: status.t1Up, played: status.holesPlayed, remaining: status.holesRemaining })
      if (status.isComplete) break
    }
  }
  return out
}

/** Derived from recorded scores, not AI-generated guesses or inferred edit timestamps. */
export function tournamentHighlights(data: TournamentData): PulseHighlight[] {
  const highlights: PulseHighlight[] = []
  for (const session of data.sessions) {
    const rules = sessionRules(session)
    const course = courseForSession(data.courses, session)
    if (!course) continue
    for (const match of session.matches) {
      const states = snapshots(match, rules, data.players, course)
      if (states.length < 2) continue
      const label = match.team1Players.join(' / ') + ' vs ' + match.team2Players.join(' / ')
      const sideName = (lead: number) => lead > 0 ? data.teams.team1.name : data.teams.team2.name
      const last = states[states.length - 1]
      const previous = states[states.length - 2]
      const isMatchPlay = rules.scoring === 'Match Play'
      const marginUnit = isMatchPlay ? 'holes' : 'strokes'
      const margin = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1)
      const id = (kind: PulseHighlight['kind'], hole: number) => match.id + ':' + kind + ':' + hole
      // A genuine comeback requires a documented deficit of at least two, followed by recovery.
      const priorPeak = states.slice(0, -1).reduce((best, s) =>
        Math.abs(s.lead) > Math.abs(best.lead) ? s : best, states[0])
      if (Math.abs(priorPeak.lead) >= 2 && Math.sign(priorPeak.lead) !== 0 &&
          (last.lead === 0 || Math.sign(last.lead) !== Math.sign(priorPeak.lead) ||
            Math.abs(last.lead) <= Math.abs(priorPeak.lead) - 2)) {
        const recovering = priorPeak.lead > 0 ? data.teams.team2.name : data.teams.team1.name
        highlights.push({ id: id('comeback', last.hole), matchId: match.id, hole: last.hole,
          kind: 'comeback', priority: 90,
          text: `${recovering} comeback watch: ${label} was down ${margin(Math.abs(priorPeak.lead))} ${marginUnit}, now ${last.lead === 0 ? 'all square' : sideName(last.lead) + ' leads by ' + margin(Math.abs(last.lead))} through ${last.played}.` })
      }
      if (previous.lead !== 0 && last.lead !== 0 && Math.sign(previous.lead) !== Math.sign(last.lead)) {
        highlights.push({ id: id('lead-change', last.hole), matchId: match.id, hole: last.hole,
          kind: 'lead-change', priority: 100,
          text: `Lead change: ${sideName(last.lead)} takes the lead in ${label} through ${last.played}.` })
      } else if (previous.lead !== 0 && last.lead === 0) {
        highlights.push({ id: id('lead-change', last.hole), matchId: match.id, hole: last.hole,
          kind: 'lead-change', priority: 85,
          text: `Back to all square: ${label} is tied through ${last.played}.` })
      }
      if (isMatchPlay) {
        const winners = holeWinnerHighlights(match, rules, data.players, course)
        let side: 'team1' | 'team2' | null = null
        let streak = 0
        // Only contiguous completed holes count; ties and missing scores break a streak.
        const holeNumbers = [...course.holes].sort((a, b) => a.number - b.number).map(h => h.number)
        for (const hole of holeNumbers) {
          if (hole > last.hole) break
          const winner = winners[hole]?.side
          if (!winner) { side = null; streak = 0; continue }
          streak = winner === side ? streak + 1 : 1
          side = winner
        }
        if (side && streak >= 3) highlights.push({
          id: id('streak', last.hole), matchId: match.id, hole: last.hole,
          kind: 'streak', priority: 75,
          text: `${side === 'team1' ? data.teams.team1.name : data.teams.team2.name} has won ${streak} straight holes in ${label}.`,
        })
      }
      const status = calcMatchStatus(match, rules, data.players, course)
      if (!status.isComplete && last.remaining <= 3 && Math.abs(last.lead) <= (isMatchPlay ? 1 : 2)) {
        highlights.push({ id: id('close-finish', last.hole), matchId: match.id, hole: last.hole,
          kind: 'close-finish', priority: 70,
          text: `Close finish: ${label} has ${last.remaining} ${last.remaining === 1 ? 'hole' : 'holes'} remaining, ${last.lead === 0 ? 'all square' : sideName(last.lead) + ' ahead by ' + margin(Math.abs(last.lead)) + ' ' + marginUnit}.` })
      }
    }
  }
  return highlights.sort((a, b) => b.priority - a.priority || b.hole - a.hole).slice(0, 5)
}
