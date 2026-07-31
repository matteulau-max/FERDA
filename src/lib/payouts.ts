/**
 * payouts.ts
 * Live wager payouts derived from the leaderboard. Pure functions, no side
 * effects. All amounts are NET (up or down from your buy-ins), so every pool
 * — and the whole board — always sums to zero.
 *
 * The four pools:
 *  - Matchups ($10/player/round head-to-head): each settled match pays out
 *    its own pot ($10 × players in the match). Winning side splits the pot
 *    (net = share − stake), losers −$10, halve = push ($0). 1v1: +$10/−$10.
 *    2v1: pair wins +$5 each, solo wins +$20, losers −$10 each.
 *  - The Cup ($150 buy-in): members of the team currently leading the
 *    overall points race are +$150, the trailing team −$150; tied = $0.
 *  - Golfer of the Weekend ($5 from all 20 golfers = $100 pot): the current
 *    Best Golfer leader is +$95, everyone else −$5.
 *  - Skills ($10 Long Drive + $10 Closest to the Pin): per skill, the winning
 *    team is +$10 each and the losing team −$10 each. Set by the organizer
 *    via the toggle.
 */

import type { TournamentData } from './types'
import { calcMatchStatus, totalPoints } from './matchPlay'
import { courseForSession, sessionRules } from './holes'
import { rankBestGolfers } from './bestGolfer'

export const WAGER = {
  /** Per-player stake in each matchup */
  matchupStake: 10,
  /** Net swing for being on the winning/losing Cup team */
  cup: 150,
  /** Net for the Best Golfer leader ($100 pot − $5 buy-in) */
  golferWin: 95,
  /** Net for everyone else in the Golfer pool */
  golferLoss: -5,
  /** Net swing per skill (Long Drive / Closest to the Pin) */
  skill: 10,
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
  losses: number
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
    byName[p.name] = { name: p.name, team: p.team, wins: 0, ties: 0, losses: 0, matchups: 0, cup: 0, golfer: 0, skills: 0, total: 0 }
  }
  const byLower = new Map(Object.entries(byName).map(([k, v]) => [k.toLowerCase(), v]))
  const lookup = (name: string) => byLower.get(name.toLowerCase())

  // --- Matchups: settled head-to-head results only, each match zero-sum ---
  for (const session of sessions) {
    const rules = sessionRules(session)
    const course = courseForSession(courses, session)
    if (!course) continue
    for (const match of session.matches) {
      // The side wager settles pairing against pairing regardless of how the
      // session pays team points, so Total Stroke Play matches count here too.
      const status = calcMatchStatus(match, rules, players, course)
      if (!status.isComplete || !status.result) continue

      if (status.result.winner === 'halved') {
        // Push — stakes come back, no money moves
        for (const name of [...match.team1Players, ...match.team2Players]) {
          const s = lookup(name); if (s) s.ties++
        }
        continue
      }

      const winners = status.result.winner === 'team1' ? match.team1Players : match.team2Players
      const losers = status.result.winner === 'team1' ? match.team2Players : match.team1Players

      // Pot = every player's stake; winners split it (net = share − stake).
      // 1v1: +$10/−$10. 2v1: pair +$5 each / solo +$20, losers −$10 each.
      const pot = WAGER.matchupStake * (winners.length + losers.length)
      const winnerNet = pot / winners.length - WAGER.matchupStake

      for (const name of winners) {
        const s = lookup(name); if (!s) continue
        s.wins++; s.matchups += winnerNet
      }
      for (const name of losers) {
        const s = lookup(name); if (!s) continue
        s.losses++; s.matchups -= WAGER.matchupStake
      }
    }
  }

  // --- Cup, Golfer of the Weekend, Skills (all net, all zero-sum) ---
  for (const p of players) {
    const s = byName[p.name]
    if (winningTeam !== 0) s.cup = p.team === winningTeam ? WAGER.cup : -WAGER.cup
    if (bestGolfer) {
      s.golfer = p.name.toLowerCase() === bestGolfer.toLowerCase() ? WAGER.golferWin : WAGER.golferLoss
    }
    if (skills.longDrive !== null) s.skills += skills.longDrive === p.team ? WAGER.skill : -WAGER.skill
    if (skills.closestToPin !== null) s.skills += skills.closestToPin === p.team ? WAGER.skill : -WAGER.skill
    s.total = s.matchups + s.cup + s.golfer + s.skills
  }

  return { players: Object.values(byName), winningTeam, teamPoints, bestGolfer }
}
