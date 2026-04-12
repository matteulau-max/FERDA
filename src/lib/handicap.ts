/**
 * handicap.ts
 * Pure USGA handicap math. No side effects.
 * Source: USGA Rules of Handicapping, Appendix C.
 */

import type { Course, Format, Player } from './types'
import { BEST_BALL_ALLOWANCE, SCRAMBLE_ALLOWANCES, SINGLES_ALLOWANCE } from './constants'

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
 * Build a map of strokeIndex → strokes for all 18 holes, for one player.
 */
export function strokeMap(
  player: Player,
  course: Course,
  format: Format,
  allPlayingHandicaps: number[],
  playerIndex: number,
): Map<number, number> {
  const ch = courseHandicap(player.handicapIndex, course.slope, course.rating, course.par)
  let ph: number
  if (format === 'Singles') {
    ph = singlesPlayingHandicap(ch)
  } else if (format === 'Best Ball') {
    ph = bestBallPlayingHandicap(ch)
  } else {
    // Scramble: team PH is computed separately; per-player not used directly
    ph = ch
  }
  const offset = ph - allPlayingHandicaps[playerIndex]
  const offsetPh = ph - offset // = allPlayingHandicaps[playerIndex] after offset applied

  const map = new Map<number, number>()
  for (const hole of course.holes) {
    map.set(hole.number, strokesOnHole(offsetPh, hole.strokeIndex))
  }
  return map
}

/**
 * Compute per-player playing handicaps (after offset) for a Singles or Best Ball match side.
 * Returns array in same order as playerNames.
 */
export function sidePlayingHandicaps(
  playerNames: string[],
  allPlayers: Player[],
  course: Course,
  format: 'Singles' | 'Best Ball',
): number[] {
  const playerMap = new Map(allPlayers.map((p) => [p.name.toLowerCase(), p]))

  const chs = playerNames.map((name) => {
    const p = playerMap.get(name.toLowerCase())
    if (!p) return 0
    return courseHandicap(p.handicapIndex, course.slope, course.rating, course.par)
  })

  const phs = chs.map((ch) =>
    format === 'Singles' ? singlesPlayingHandicap(ch) : bestBallPlayingHandicap(ch),
  )

  const min = Math.min(...phs)
  return phs.map((ph) => ph - min)
}

/**
 * Compute team playing handicaps (after offset) for a Scramble match.
 * Returns { team1Ph, team2Ph } — each is the offset applied team handicap.
 */
export function scrambleSideHandicaps(
  team1Players: string[],
  team2Players: string[],
  allPlayers: Player[],
  course: Course,
): { team1Ph: number; team2Ph: number } {
  const playerMap = new Map(allPlayers.map((p) => [p.name.toLowerCase(), p]))

  const teamChs = (names: string[]) =>
    names.map((name) => {
      const p = playerMap.get(name.toLowerCase())
      if (!p) return 0
      return courseHandicap(p.handicapIndex, course.slope, course.rating, course.par)
    })

  const t1Ph = scrambleTeamHandicap(teamChs(team1Players))
  const t2Ph = scrambleTeamHandicap(teamChs(team2Players))
  const min = Math.min(t1Ph, t2Ph)

  return { team1Ph: t1Ph - min, team2Ph: t2Ph - min }
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
