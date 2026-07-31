/**
 * handicap.ts
 * Pure USGA handicap math. No side effects.
 * Source: USGA Rules of Handicapping, Appendix C.
 */

import type { Course, Player, SessionCourse } from './types'
import {
  BEST_BALL_ALLOWANCE,
  SCRAMBLE_ALLOWANCES,
  SINGLES_ALLOWANCE,
  TWO_V_ONE_PAIR_ALLOWANCE,
  TWO_V_ONE_SOLO_ALLOWANCE,
} from './constants'

/** Per-player formats (each player receives their own strokes). */
type PerPlayerFormat = 'Singles' | 'Best Ball' | '2v1'

/**
 * Step 1: Handicap Index → Course Handicap
 * CH = round((index × slope / 113) + (rating − par))
 */
export function courseHandicap(
  handicapIndex: number,
  slope: number,
  rating: number,
  par: number,
): number {
  return Math.round((handicapIndex * slope) / 113 + (rating - par))
}

/**
 * Course Handicap for the holes a session actually plays. On a nine, half the
 * index is in play against the halved rating (see holes.ts); on a full round
 * this is plain `courseHandicap`.
 */
export function sessionCourseHandicap(handicapIndex: number, course: SessionCourse): number {
  return courseHandicap(handicapIndex * course.indexFactor, course.slope, course.rating, course.par)
}

/**
 * Step 2a: Singles — apply 100% allowance.
 * Returns raw CH; caller applies the "lowest plays off 0" offset.
 */
export function singlesPlayingHandicap(ch: number): number {
  return Math.round(ch * SINGLES_ALLOWANCE)
}

/**
 * Step 2b: Best Ball — apply 90% allowance per player.
 */
export function bestBallPlayingHandicap(ch: number): number {
  return Math.round(ch * BEST_BALL_ALLOWANCE)
}

/**
 * Step 2d: 2 v 1 — side-aware allowance.
 * Each member of the two-player side plays at TWO_V_ONE_PAIR_ALLOWANCE (90%);
 * the solo plays at TWO_V_ONE_SOLO_ALLOWANCE (100%). Each player still
 * receives their own strokes; the pair's two nets are averaged downstream.
 */
export function twoVOnePlayingHandicap(ch: number, sideSize: number): number {
  const allowance = sideSize > 1 ? TWO_V_ONE_PAIR_ALLOWANCE : TWO_V_ONE_SOLO_ALLOWANCE
  return Math.round(ch * allowance)
}

/**
 * Per-player playing handicap for the per-player formats (Singles, Best Ball,
 * 2v1), before the "lowest plays off 0" offset. sideSize (how many players on
 * this player's side) only matters for 2v1, where the pair is discounted.
 */
export function perPlayerPlayingHandicap(
  ch: number,
  format: PerPlayerFormat,
  sideSize = 1,
): number {
  if (format === 'Best Ball') return bestBallPlayingHandicap(ch)
  if (format === '2v1') return twoVOnePlayingHandicap(ch, sideSize)
  return singlesPlayingHandicap(ch)
}

/**
 * Step 2c: Scramble team playing handicap.
 * Accepts the Course Handicaps for all players on one side, sorted ascending.
 * Returns the team's combined playing handicap (before "lowest plays off 0" offset).
 */
export function scrambleTeamHandicap(courseHandicaps: number[]): number {
  const n = courseHandicaps.length
  const allowances = SCRAMBLE_ALLOWANCES[n]
  if (!allowances) throw new Error(`No scramble allowance for ${n}-player team`)
  const sorted = [...courseHandicaps].sort((a, b) => a - b)
  const sum = sorted.reduce((acc, ch, i) => acc + ch * allowances[i], 0)
  return Math.round(sum)
}

/**
 * For a set of playing handicaps on one side, returns the per-player stroke
 * offset so that the lowest plays off 0.
 * Returns an array in the same order as the input.
 */
export function offsetToZero(playingHandicaps: number[]): number[] {
  const min = Math.min(...playingHandicaps)
  return playingHandicaps.map((ph) => ph - min)
}

/**
 * Step 3: How many strokes does a player receive on a given hole?
 * playingHandicap: strokes the player gets (after offset)
 * strokeIndex:     1-18, the hole's difficulty index
 *
 * Handles plus handicaps (negative PH → gives strokes back starting at SI 18).
 */
export function strokesOnHole(playingHandicap: number, strokeIndex: number): number {
  if (playingHandicap >= 0) {
    // Full strokes: every stroke index ≤ playingHandicap gets 1 stroke
    // Wrap-around: if PH > 18, also count a second stroke
    let strokes = 0
    if (strokeIndex <= playingHandicap) strokes++
    if (playingHandicap > 18 && strokeIndex <= playingHandicap - 18) strokes++
    return strokes
  } else {
    // Plus handicap: gives strokes back starting at SI 18 (highest SI first)
    // Negative means the player gives |PH| strokes. A hole gets a stroke taken
    // away when its strokeIndex >= (19 + playingHandicap), i.e. among the highest SIs.
    // strokeIndex 18 = first stroke given back at PH = -1
    // strokeIndex 17 = second stroke given back at PH = -2, etc.
    const giveback = Math.abs(playingHandicap)
    if (strokeIndex >= 19 - giveback) return -1
    return 0
  }
}

/**
 * Compute team playing handicaps (after offset) for a Scramble match.
 * Returns { team1Ph, team2Ph } — each is the offset applied team handicap.
 */
export function scrambleSideHandicaps(
  team1Players: string[],
  team2Players: string[],
  allPlayers: Player[],
  course: SessionCourse,
): { team1Ph: number; team2Ph: number } {
  const playerMap = new Map(allPlayers.map((p) => [p.name.toLowerCase(), p]))

  const teamChs = (names: string[]) =>
    names.map((name) => {
      const p = playerMap.get(name.toLowerCase())
      if (!p) return 0
      return sessionCourseHandicap(p.handicapIndex, course)
    })

  const t1Ph = scrambleTeamHandicap(teamChs(team1Players))
  const t2Ph = scrambleTeamHandicap(teamChs(team2Players))
  const min = Math.min(t1Ph, t2Ph)

  return { team1Ph: t1Ph - min, team2Ph: t2Ph - min }
}

/**
 * Compute per-player playing handicaps (after offset) for both sides of a
 * Singles or Best Ball match.  The lowest PH across all players in the match
 * plays at scratch; everyone else receives the difference.  This follows
 * USGA Rules of Handicapping Section 9-4b (Four-Ball) and Section 9-3 (Singles).
 */
export function matchPlayingHandicaps(
  team1Players: string[],
  team2Players: string[],
  allPlayers: Player[],
  course: SessionCourse,
  format: PerPlayerFormat,
): { t1Phs: number[]; t2Phs: number[] } {
  const playerMap = new Map(allPlayers.map((p) => [p.name.toLowerCase(), p]))

  const toPhs = (names: string[]) =>
    names.map((name) => {
      const p = playerMap.get(name.toLowerCase())
      const ch = p ? sessionCourseHandicap(p.handicapIndex, course) : 0
      return perPlayerPlayingHandicap(ch, format, names.length)
    })

  const t1RawPhs = toPhs(team1Players)
  const t2RawPhs = toPhs(team2Players)

  const foursomeMin = Math.min(...t1RawPhs, ...t2RawPhs)

  return {
    t1Phs: t1RawPhs.map((ph) => ph - foursomeMin),
    t2Phs: t2RawPhs.map((ph) => ph - foursomeMin),
  }
}

/**
 * Per-hole strokes for each player on a side, keyed by player name then hole number.
 * Used for rendering stroke dots in the scorecard.
 */
export function perPlayerHoleStrokes(
  playerNames: string[],
  playingHandicaps: number[],
  course: Course,
): Record<string, Record<number, number>> {
  const result: Record<string, Record<number, number>> = {}
  playerNames.forEach((name, i) => {
    const ph = playingHandicaps[i]
    result[name] = {}
    for (const hole of course.holes) {
      result[name][hole.number] = strokesOnHole(ph, hole.strokeIndex)
    }
  })
  return result
}
