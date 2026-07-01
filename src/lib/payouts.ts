/**
 * payouts.ts
 * Live wager payouts derived from the leaderboard. Pure functions, no side
 * effects. All amounts are GROSS winnings (what a player collects), matching
 * how the pots are described on the Wagers tab.
 *
 * The four pools:
 *  - Matchups ($10/round head-to-head): win a settled match → +$20,
 *    halve → +$10 (stake back), loss → $0.
 *  - The Cup ($150 buy-in): every member of the team currently leading the
 *    overall points race collects +$300 if the weekend ended now.
 *  - Golfer of the Weekend ($5 buy-in): the current Best Golfer leader
 *    takes the whole $100 pot.
 *  - Skills ($10 Long Drive + $10 Closest to the Pin): a teammate winning a
 *    skill means everyone on that team collects +$20 for it. Set by the
 *    organizer via the toggle.
 */

import type { TournamentData } from './types'
import { calcMatchStatus, totalPoints } from './matchPlay'
import { rankBestGolfers } from './bestGolfer'

export const WAGER = {
  matchupWin: 20,
  matchupTie: 10,
  cup: 300,
  golfer: 100,
  skill: 20,
} as const

export type SkillWinner = 1 | 2 | null

export interface SkillsState {
  longDrive: SkillWinner
  closestToPin: SkillWinner
}

export interface PlayerPayout {
  name: string
  team: 1 | 2
  wins: number
  ties: number
  matchups: number
  cup: number
  golfer: number
  skills: number
  total: number
}

export interface PayoutResult {
  players: PlayerPayout[]
  /** 1 or 2 = that team currently leads; 0 = tied (no Cup payout yet). */
  winningTeam: 0 | 1 | 2
  teamPoints: { team1: number; team2: number }
  bestGolfer: string | null
}

export function computePayouts(data: TournamentData, skills: SkillsState): PayoutResult {
  const { sessions, players, courses } = data

  const teamPoints = totalPoints(sessions, players, courses)
  const winningTeam: 0 | 1 | 2 =
    teamPoints.team1 > teamPoints.team2 ? 1 : teamPoints.team2 > teamPoints.team1 ? 2 : 0

  const bestGolfer = rankBestGolfers(sessions, players, courses)[0]?.name ?? null

  const byName: Record<string, PlayerPayout> = {}
  for (const p of players) {
    byName[p.name] = { name: p.name, team: p.team, wins: 0, ties: 0, matchups: 0, cup: 0, golfer: 0, skills: 0, total: 0 }
  }
  const byLower = new Map(Object.entries(byName).map(([k, v]) => [k.toLowerCase(), v]))
  const lookup = (name: string) => byLower.get(name.toLowerCase())

  // --- Matchups: settled head-to-head results only ---
  for (const session of sessions) {
    const course = courses.find((c) => c.name === session.courseName) ?? courses[0]
    if (!course) continue
    for (const match of session.matches) {
      const status = calcMatchStatus(match, session.format, players, course, session.scoring ?? 'Match Play')
      if (!status.isComplete || !status.result) continue

      const award = (names: string[], outcome: 'win' | 'tie') => {
        for (const name of names) {
          const s = lookup(name); if (!s) continue
          if (outcome === 'win') { s.wins++; s.matchups += WAGER.matchupWin }
          else { s.ties++; s.matchups += WAGER.matchupTie }
        }
      }

      if (status.result.winner === 'team1') award(match.team1Players, 'win')
      else if (status.result.winner === 'team2') award(match.team2Players, 'win')
      else { award(match.team1Players, 'tie'); award(match.team2Players, 'tie') }
    }
  }

  // --- Cup, Golfer of the Weekend, Skills ---
  for (const p of players) {
    const s = byName[p.name]
    if (winningTeam !== 0 && p.team === winningTeam) s.cup = WAGER.cup
    if (bestGolfer && p.name.toLowerCase() === bestGolfer.toLowerCase()) s.golfer = WAGER.golfer
    if (skills.longDrive === p.team) s.skills += WAGER.skill
    if (skills.closestToPin === p.team) s.skills += WAGER.skill
    s.total = s.matchups + s.cup + s.golfer + s.skills
  }

  return { players: Object.values(byName), winningTeam, teamPoints, bestGolfer }
}
