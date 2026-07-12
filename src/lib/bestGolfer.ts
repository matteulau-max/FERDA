/**
 * bestGolfer.ts
 * Shared "Best Golfer" ranking — the single source of truth for who is
 * leading the individual (Golfer of the Weekend) race. Used by both the
 * Leaderboard's Best Golfer card and the Wagers payout calculator.
 */

import type { Course, Player, Session } from './types'
import { calcMatchStatus } from './matchPlay'
import { courseHandicap, perPlayerHoleStrokes } from './handicap'

export interface GolferStat {
  name: string
  team: 1 | 2
  points: number
  birdies: number
  pars: number
  netToPar: number
  netHoles: number
}

export interface RankedGolfer extends GolferStat {
  composite: number
}

/** Accumulate per-player scoring stats across every session. */
export function computeGolferStats(
  sessions: Session[],
  players: Player[],
  courses: Course[],
): Record<string, GolferStat> {
  const stats: Record<string, GolferStat> = {}
  for (const player of players) {
    stats[player.name] = { name: player.name, team: player.team, points: 0, birdies: 0, pars: 0, netToPar: 0, netHoles: 0 }
  }

  // Case-insensitive lookup — mirrors the pattern used in handicap.ts
  const statsByLower = new Map(Object.entries(stats).map(([k, v]) => [k.toLowerCase(), v]))

  for (const session of sessions) {
    const course = courses.find((c) => c.name === session.courseName) ?? courses[0]
    if (!course) continue

    for (const match of session.matches) {
      const status = calcMatchStatus(match, session.format, players, course, session.scoring ?? 'Match Play')

      const lookup = (name: string) => statsByLower.get(name.toLowerCase())

      // Points: all formats
      if (status.isComplete && status.result) {
        for (const name of match.team1Players) {
          const s = lookup(name); if (!s) continue
          if (status.result.winner === 'team1') s.points += 1
          else if (status.result.winner === 'halved') s.points += 0.5
        }
        for (const name of match.team2Players) {
          const s = lookup(name); if (!s) continue
          if (status.result.winner === 'team2') s.points += 1
          else if (status.result.winner === 'halved') s.points += 0.5
        }
      }

      // Birdies, pars, net: formats where each player holds their own score
      // (Singles, Best Ball, 2v1 — everything but Scramble's shared team
      // ball). Net uses each player's OWN full course handicap (not the
      // match's allowances or "lowest plays off 0" offset) so the Best
      // Golfer net is comparable across foursomes and formats — the best
      // player in a group still gets their strokes.
      if (session.format !== 'Scramble') {
        const chFor = (name: string) => {
          const p = players.find((pl) => pl.name.toLowerCase() === name.toLowerCase())
          return p ? courseHandicap(p.handicapIndex, course.slope, course.rating, course.par) : 0
        }
        const t1Phs = match.team1Players.map(chFor)
        const t2Phs = match.team2Players.map(chFor)
        const t1Strokes = perPlayerHoleStrokes(match.team1Players, t1Phs, course)
        const t2Strokes = perPlayerHoleStrokes(match.team2Players, t2Phs, course)

        for (const [holeStr, holeScores] of Object.entries(match.scores)) {
          const holeNum = parseInt(holeStr)
          const hole = course.holes.find((h) => h.number === holeNum)
          if (!hole) continue
          for (const [name, gross] of Object.entries(holeScores.team1)) {
            const s = lookup(name); if (!s || !gross) continue
            const net = gross - (t1Strokes[name]?.[holeNum] ?? 0)
            s.netHoles++; s.netToPar += net - hole.par
            if (gross <= hole.par - 1) s.birdies++
            else if (gross === hole.par) s.pars++
          }
          for (const [name, gross] of Object.entries(holeScores.team2)) {
            const s = lookup(name); if (!s || !gross) continue
            const net = gross - (t2Strokes[name]?.[holeNum] ?? 0)
            s.netHoles++; s.netToPar += net - hole.par
            if (gross <= hole.par - 1) s.birdies++
            else if (gross === hole.par) s.pars++
          }
        }
      }
    }
  }

  return stats
}

/**
 * Rank every golfer by the composite formula:
 *   (team points × 0.50) + (−net × 0.35) + (birdies × 0.15)
 * Net is negative when under par, so negating it makes under-par positive.
 * Returns all players sorted by composite descending (ties broken by
 * points, then birdies, then name). ranked[0] is the current "Golfer of
 * the Weekend" leader. Returns [] until any scoring exists, so the
 * leaderboard stays hidden before the tournament starts.
 */
export function rankBestGolfers(
  sessions: Session[],
  players: Player[],
  courses: Course[],
): RankedGolfer[] {
  const stats = computeGolferStats(sessions, players, courses)
  const all = Object.values(stats)

  if (!all.some((s) => s.points > 0 || s.netHoles > 0)) return []

  return all
    .map((s) => ({ ...s, composite: s.points * 0.5 + -s.netToPar * 0.35 + s.birdies * 0.15 }))
    .sort(
      (a, b) =>
        b.composite - a.composite ||
        b.points - a.points ||
        b.birdies - a.birdies ||
        a.name.localeCompare(b.name),
    )
}
