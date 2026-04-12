/**
 * matchPlay.ts
 * Match status calculation — pure functions, no side effects.
 */

import type { Course, Format, Match, MatchScores, MatchStatus, Player } from './types'
import {
  perPlayerHoleStrokes,
  scrambleSideHandicaps,
  sidePlayingHandicaps,
  strokesOnHole,
} from './handicap'
import { scrambleTeamHandicap, courseHandicap } from './handicap'

// ---------------------------------------------------------------------------
// Net score helpers
// ---------------------------------------------------------------------------

export function netScore(gross: number, strokes: number): number {
  return gross - strokes
}

/**
 * Compare two net scores. Returns 1 if t1 wins, 0.5 if halved, 0 if t2 wins.
 * Treats 0 or NaN gross as "not yet scored" (returns null).
 */
export function holeResult(t1Net: number, t2Net: number): 1 | 0.5 | 0 {
  if (t1Net < t2Net) return 1
  if (t1Net > t2Net) return 0
  return 0.5
}

// ---------------------------------------------------------------------------
// Best net per team (Best Ball / Four-Ball)
// ---------------------------------------------------------------------------

function bestNetForSide(
  holeScores: Record<string, number>,
  playerStrokes: Record<string, Record<number, number>>,
  hole: number,
): number | null {
  let best: number | null = null
  for (const [player, gross] of Object.entries(holeScores)) {
    if (!gross || gross === 0) continue
    const strokes = playerStrokes[player]?.[hole] ?? 0
    const net = gross - strokes
    if (best === null || net < best) best = net
  }
  return best
}

// ---------------------------------------------------------------------------
// Main match status calculator
// ---------------------------------------------------------------------------

export function calcMatchStatus(
  match: Match,
  format: Format,
  players: Player[],
  course: Course,
): MatchStatus {
  const totalHoles = course.holes.length // 18

  // --- Compute playing handicap strokes per player / team ---
  let t1PlayerStrokes: Record<string, Record<number, number>> = {}
  let t2PlayerStrokes: Record<string, Record<number, number>> = {}
  let t1TeamStrokesPerHole: Record<number, number> = {}
  let t2TeamStrokesPerHole: Record<number, number> = {}

  if (format === 'Scramble') {
    const { team1Ph, team2Ph } = scrambleSideHandicaps(
      match.team1Players,
      match.team2Players,
      players,
      course,
    )
    for (const hole of course.holes) {
      t1TeamStrokesPerHole[hole.number] = strokesOnHole(team1Ph, hole.strokeIndex)
      t2TeamStrokesPerHole[hole.number] = strokesOnHole(team2Ph, hole.strokeIndex)
    }
  } else {
    const t1Phs = sidePlayingHandicaps(match.team1Players, players, course, format)
    const t2Phs = sidePlayingHandicaps(match.team2Players, players, course, format)
    t1PlayerStrokes = perPlayerHoleStrokes(match.team1Players, t1Phs, course)
    t2PlayerStrokes = perPlayerHoleStrokes(match.team2Players, t2Phs, course)
  }

  // --- Walk holes and compute running match status ---
  let t1Up = 0
  let holesPlayed = 0
  let isComplete = false
  let result: MatchStatus['result'] = null

  // Sort holes by number to ensure order
  const sortedHoles = [...course.holes].sort((a, b) => a.number - b.number)

  for (const hole of sortedHoles) {
    const holeScores = match.scores[hole.number]
    if (!holeScores) continue

    let t1Net: number | null = null
    let t2Net: number | null = null

    if (format === 'Scramble') {
      // Use first player name as key, or any non-zero value
      const t1Gross = firstNonZeroValue(holeScores.team1)
      const t2Gross = firstNonZeroValue(holeScores.team2)
      if (t1Gross === null || t2Gross === null) continue
      t1Net = t1Gross - (t1TeamStrokesPerHole[hole.number] ?? 0)
      t2Net = t2Gross - (t2TeamStrokesPerHole[hole.number] ?? 0)
    } else if (format === 'Best Ball') {
      t1Net = bestNetForSide(holeScores.team1, t1PlayerStrokes, hole.number)
      t2Net = bestNetForSide(holeScores.team2, t2PlayerStrokes, hole.number)
      if (t1Net === null || t2Net === null) continue
    } else {
      // Singles — one player per side
      const t1Player = match.team1Players[0]
      const t2Player = match.team2Players[0]
      const t1Gross = holeScores.team1[t1Player]
      const t2Gross = holeScores.team2[t2Player]
      if (!t1Gross || !t2Gross) continue
      const t1Strokes = t1PlayerStrokes[t1Player]?.[hole.number] ?? 0
      const t2Strokes = t2PlayerStrokes[t2Player]?.[hole.number] ?? 0
      t1Net = t1Gross - t1Strokes
      t2Net = t2Gross - t2Strokes
    }

    holesPlayed++
    const hr = holeResult(t1Net, t2Net)
    if (hr === 1) t1Up++
    else if (hr === 0) t1Up--
    // 0.5 = halved, no change

    const holesRemaining = totalHoles - holesPlayed
    const lead = Math.abs(t1Up)

    // Auto-close check
    if (lead > holesRemaining) {
      isComplete = true
      const winner = t1Up > 0 ? 'team1' : 'team2'
      // e.g. "4&3" means 4 up with 3 to play
      result = { winner, text: `${lead}&${holesRemaining}` }
      break
    }
  }

  // Check if all 18 holes played without auto-close
  if (!isComplete && holesPlayed === totalHoles) {
    isComplete = true
    if (t1Up > 0) {
      result = { winner: 'team1', text: '1 UP' }
    } else if (t1Up < 0) {
      result = { winner: 'team2', text: '1 UP' }
    } else {
      result = { winner: 'halved', text: 'HALVED' }
    }
  }

  return {
    t1Up,
    holesPlayed,
    holesRemaining: totalHoles - holesPlayed,
    isComplete,
    result,
  }
}

function firstNonZeroValue(obj: Record<string, number>): number | null {
  for (const v of Object.values(obj)) {
    if (v && v !== 0) return v
  }
  return null
}

// ---------------------------------------------------------------------------
// Status display text helpers
// ---------------------------------------------------------------------------

export function matchStatusText(status: MatchStatus): string {
  if (status.holesPlayed === 0) return 'Not started'
  if (status.isComplete && status.result) {
    return `FINAL: ${status.result.text}`
  }
  if (status.t1Up === 0) return `AS thru ${status.holesPlayed}`
  const lead = Math.abs(status.t1Up)
  const side = status.t1Up > 0 ? 'T1' : 'T2'
  return `${side} ${lead} UP thru ${status.holesPlayed}`
}

export function matchStatusTextWithNames(
  status: MatchStatus,
  team1Name: string,
  team2Name: string,
): string {
  if (status.holesPlayed === 0) return 'Not started'
  if (status.isComplete && status.result) {
    if (status.result.winner === 'halved') return 'HALVED'
    const winnerName = status.result.winner === 'team1' ? team1Name : team2Name
    return `${winnerName} wins ${status.result.text}`
  }
  if (status.t1Up === 0) return `All Square thru ${status.holesPlayed}`
  const lead = Math.abs(status.t1Up)
  const leaderName = status.t1Up > 0 ? team1Name : team2Name
  return `${leaderName} ${lead} UP thru ${status.holesPlayed}`
}

// ---------------------------------------------------------------------------
// Tournament points
// ---------------------------------------------------------------------------

export function matchPoints(status: MatchStatus): { team1: number; team2: number } {
  if (!status.isComplete || !status.result) return { team1: 0, team2: 0 }
  if (status.result.winner === 'halved') return { team1: 0.5, team2: 0.5 }
  if (status.result.winner === 'team1') return { team1: 1, team2: 0 }
  return { team1: 0, team2: 1 }
}

export function totalPoints(
  sessions: Array<{ format: Format; matches: Match[] }>,
  players: Player[],
  course: Course,
): { team1: number; team2: number } {
  let t1 = 0
  let t2 = 0
  for (const session of sessions) {
    for (const match of session.matches) {
      const status = calcMatchStatus(match, session.format, players, course)
      const pts = matchPoints(status)
      t1 += pts.team1
      t2 += pts.team2
    }
  }
  return { team1: t1, team2: t2 }
}

// Re-export for convenience
export { scrambleTeamHandicap, courseHandicap }
export type { MatchScores }
