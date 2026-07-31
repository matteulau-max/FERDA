/**
 * matchPlay.ts
 * Match status calculation — pure functions, no side effects.
 */

import type {
  Course,
  Format,
  HoleScores,
  Match,
  MatchScores,
  MatchStatus,
  Player,
  Session,
  SessionCourse,
  SessionRules,
  SessionTotals,
} from './types'
export type { SessionRules, SessionTotals }
import {
  matchPlayingHandicaps,
  perPlayerHoleStrokes,
  scrambleSideHandicaps,
  strokesOnHole,
} from './handicap'
import { scrambleTeamHandicap, courseHandicap } from './handicap'
import { courseForSession, sessionRules } from './holes'

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
// Average net per side (2 v 1)
// ---------------------------------------------------------------------------

/**
 * Average of the side's players' net scores on a hole.
 * Iterates the side's roster (not just entered keys) so a two-player side only
 * counts once BOTH players have a gross; returns null (hole not yet complete)
 * otherwise. For a one-player (solo) side this is simply that player's net.
 */
function avgNetForSide(
  sidePlayers: string[],
  holeScores: Record<string, number>,
  playerStrokes: Record<string, Record<number, number>>,
  hole: number,
): number | null {
  const nets: number[] = []
  for (const player of sidePlayers) {
    const gross = holeScores[player]
    if (!gross || gross === 0) return null
    const strokes = playerStrokes[player]?.[hole] ?? 0
    nets.push(gross - strokes)
  }
  if (nets.length === 0) return null
  return nets.reduce((sum, n) => sum + n, 0) / nets.length
}

// ---------------------------------------------------------------------------
// Shared per-match stroke setup and per-hole side nets
// ---------------------------------------------------------------------------

interface MatchStrokes {
  t1PlayerStrokes: Record<string, Record<number, number>>
  t2PlayerStrokes: Record<string, Record<number, number>>
  t1TeamStrokesPerHole: Record<number, number>
  t2TeamStrokesPerHole: Record<number, number>
}

export function computeMatchStrokes(
  match: Match,
  rules: SessionRules,
  players: Player[],
  course: SessionCourse,
): MatchStrokes {
  const { format } = rules
  const strokes: MatchStrokes = {
    t1PlayerStrokes: {},
    t2PlayerStrokes: {},
    t1TeamStrokesPerHole: {},
    t2TeamStrokesPerHole: {},
  }

  // Handicaps off: everyone plays gross, so nobody receives a stroke anywhere.
  // Leaving the maps empty makes every lookup fall through to 0.
  if (!rules.useHandicap) return strokes

  if (format === 'Scramble') {
    const { team1Ph, team2Ph } = scrambleSideHandicaps(
      match.team1Players,
      match.team2Players,
      players,
      course,
    )
    for (const hole of course.holes) {
      strokes.t1TeamStrokesPerHole[hole.number] = strokesOnHole(team1Ph, hole.strokeIndex)
      strokes.t2TeamStrokesPerHole[hole.number] = strokesOnHole(team2Ph, hole.strokeIndex)
    }
  } else {
    const { t1Phs, t2Phs } = matchPlayingHandicaps(
      match.team1Players, match.team2Players, players, course, format,
    )
    strokes.t1PlayerStrokes = perPlayerHoleStrokes(match.team1Players, t1Phs, course)
    strokes.t2PlayerStrokes = perPlayerHoleStrokes(match.team2Players, t2Phs, course)
  }

  return strokes
}

/**
 * Both sides' competing net scores on one hole, per the format's rules.
 * Returns null while either side's score for the hole is incomplete.
 */
function sideNetsForHole(
  match: Match,
  format: Format,
  strokes: MatchStrokes,
  holeScores: HoleScores,
  holeNumber: number,
): { t1Net: number; t2Net: number } | null {
  if (format === 'Scramble') {
    // Use first player name as key, or any non-zero value
    const t1Gross = firstNonZeroValue(holeScores.team1)
    const t2Gross = firstNonZeroValue(holeScores.team2)
    if (t1Gross === null || t2Gross === null) return null
    return {
      t1Net: t1Gross - (strokes.t1TeamStrokesPerHole[holeNumber] ?? 0),
      t2Net: t2Gross - (strokes.t2TeamStrokesPerHole[holeNumber] ?? 0),
    }
  }
  if (format === 'Best Ball') {
    const t1Net = bestNetForSide(holeScores.team1, strokes.t1PlayerStrokes, holeNumber)
    const t2Net = bestNetForSide(holeScores.team2, strokes.t2PlayerStrokes, holeNumber)
    if (t1Net === null || t2Net === null) return null
    return { t1Net, t2Net }
  }
  if (format === '2v1') {
    // Each side's net = average of its players' nets (pair = mean of two,
    // solo = its single net). May be fractional (e.g. 4.5).
    const t1Net = avgNetForSide(match.team1Players, holeScores.team1, strokes.t1PlayerStrokes, holeNumber)
    const t2Net = avgNetForSide(match.team2Players, holeScores.team2, strokes.t2PlayerStrokes, holeNumber)
    if (t1Net === null || t2Net === null) return null
    return { t1Net, t2Net }
  }
  // Singles — one player per side
  const t1Player = match.team1Players[0]
  const t2Player = match.team2Players[0]
  const t1Gross = holeScores.team1[t1Player]
  const t2Gross = holeScores.team2[t2Player]
  if (!t1Gross || !t2Gross) return null
  return {
    t1Net: t1Gross - (strokes.t1PlayerStrokes[t1Player]?.[holeNumber] ?? 0),
    t2Net: t2Gross - (strokes.t2PlayerStrokes[t2Player]?.[holeNumber] ?? 0),
  }
}

// ---------------------------------------------------------------------------
// Main match status calculator
// ---------------------------------------------------------------------------

export function calcMatchStatus(
  match: Match,
  rules: SessionRules,
  players: Player[],
  course: SessionCourse | undefined,
): MatchStatus {
  const { format, scoring } = rules
  const emptyStatus: MatchStatus = {
    t1Up: 0, t1Total: 0, t2Total: 0,
    holesPlayed: 0, holesRemaining: 18, isComplete: false, scoring, result: null,
  }
  if (!course) return emptyStatus

  // 18 for a full round, 9 for a nine — this is what closes out a match.
  const totalHoles = course.holes.length

  // --- Compute playing handicap strokes per player / team ---
  const strokes = computeMatchStrokes(match, rules, players, course)

  // Stroke play of either kind accumulates a differential rather than holes.
  const isStrokes = scoring === 'Stroke Play' || scoring === 'Total Stroke Play'

  // --- Walk holes and compute running match status ---
  let t1Up = 0
  let t1Total = 0
  let t2Total = 0
  let holesPlayed = 0
  let isComplete = false
  let result: MatchStatus['result'] = null

  // Sort holes by number to ensure order
  const sortedHoles = [...course.holes].sort((a, b) => a.number - b.number)

  for (const hole of sortedHoles) {
    const holeScores = match.scores[hole.number]
    if (!holeScores) continue

    const nets = sideNetsForHole(match, format, strokes, holeScores, hole.number)
    if (nets === null) continue
    const { t1Net, t2Net } = nets

    holesPlayed++
    t1Total += t1Net
    t2Total += t2Net

    if (isStrokes) {
      // Accumulate raw net stroke differential (lower net = better)
      t1Up += t2Net - t1Net
    } else {
      // Match Play: +1 for hole win, -1 for hole loss
      const hr = holeResult(t1Net, t2Net)
      if (hr === 1) t1Up++
      else if (hr === 0) t1Up--

      // Auto-close: match is over when lead exceeds holes remaining
      const holesRemaining = totalHoles - holesPlayed
      const lead = Math.abs(t1Up)
      if (lead > holesRemaining) {
        isComplete = true
        const winner = t1Up > 0 ? 'team1' : 'team2'
        result = { winner, text: `${lead}&${holesRemaining}` }
        break
      }
    }
  }

  // Check if every hole in play has been scored
  if (!isComplete && holesPlayed === totalHoles) {
    isComplete = true
    if (t1Up > 0) {
      result = { winner: 'team1', text: isStrokes ? `by ${fmt(t1Up)}` : '1 UP' }
    } else if (t1Up < 0) {
      result = { winner: 'team2', text: isStrokes ? `by ${fmt(Math.abs(t1Up))}` : '1 UP' }
    } else {
      result = { winner: 'halved', text: 'HALVED' }
    }
  }

  return {
    t1Up,
    t1Total,
    t2Total,
    holesPlayed,
    holesRemaining: totalHoles - holesPlayed,
    isComplete,
    scoring,
    result,
  }
}

/** 2v1 averages sides, so a differential can land on a half. */
function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function firstNonZeroValue(obj: Record<string, number>): number | null {
  for (const v of Object.values(obj)) {
    if (v && v !== 0) return v
  }
  return null
}

// ---------------------------------------------------------------------------
// Per-hole winner highlights (for scorecard scanning)
// ---------------------------------------------------------------------------

export interface HoleWinner {
  side: 'team1' | 'team2'
  /** Player name(s) whose score cell produced the win (row keys in ScoreTable). */
  players: string[]
}

/**
 * For each fully-scored, non-halved hole: which side won it (lower net, the
 * same comparison calcMatchStatus uses) and which of that side's score cells
 * to highlight — Singles/Scramble: the side's single cell; Best Ball: the
 * player(s) whose net equals the side's best; 2v1: the whole side (the pair's
 * average is what won, so both cells).
 */
export function holeWinnerHighlights(
  match: Match,
  rules: SessionRules,
  players: Player[],
  course: SessionCourse | undefined,
): Record<number, HoleWinner> {
  const result: Record<number, HoleWinner> = {}
  if (!course) return result
  const { format } = rules
  const strokes = computeMatchStrokes(match, rules, players, course)

  for (const hole of course.holes) {
    const holeScores = match.scores[hole.number]
    if (!holeScores) continue
    const nets = sideNetsForHole(match, format, strokes, holeScores, hole.number)
    if (nets === null || nets.t1Net === nets.t2Net) continue

    const side: 'team1' | 'team2' = nets.t1Net < nets.t2Net ? 'team1' : 'team2'
    const roster = side === 'team1' ? match.team1Players : match.team2Players
    const sideScores = side === 'team1' ? holeScores.team1 : holeScores.team2
    const sideStrokes = side === 'team1' ? strokes.t1PlayerStrokes : strokes.t2PlayerStrokes
    const winningNet = side === 'team1' ? nets.t1Net : nets.t2Net

    let winners: string[]
    if (format === 'Best Ball') {
      // The ball(s) that produced the side's best net
      winners = Object.entries(sideScores)
        .filter(([name, gross]) =>
          gross && gross - (sideStrokes[name]?.[hole.number] ?? 0) === winningNet)
        .map(([name]) => name)
    } else if (format === '2v1') {
      winners = [...roster]
    } else {
      // Singles / Scramble — the side's single row (Scramble rows key off the
      // first roster name, matching ScoreTable)
      winners = [roster[0] ?? side]
    }

    result[hole.number] = { side, players: winners }
  }

  return result
}

// ---------------------------------------------------------------------------
// Status display text helpers
// ---------------------------------------------------------------------------

/** True for both stroke-play variants, which measure a margin rather than holes. */
export function isStrokePlay(scoring: MatchStatus['scoring']): boolean {
  return scoring === 'Stroke Play' || scoring === 'Total Stroke Play'
}

export function matchStatusText(status: MatchStatus): string {
  if (status.holesPlayed === 0) return 'Not started'
  if (status.isComplete && status.result) {
    return `FINAL: ${status.result.text}`
  }
  if (status.t1Up === 0) return `AS thru ${status.holesPlayed}`
  const lead = fmt(Math.abs(status.t1Up))
  const side = status.t1Up > 0 ? 'T1' : 'T2'
  if (isStrokePlay(status.scoring)) {
    return `${side} leads by ${lead} thru ${status.holesPlayed}`
  }
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
  const lead = fmt(Math.abs(status.t1Up))
  const leaderName = status.t1Up > 0 ? team1Name : team2Name
  if (isStrokePlay(status.scoring)) {
    return `${leaderName} leads by ${lead} thru ${status.holesPlayed}`
  }
  return `${leaderName} ${lead} UP thru ${status.holesPlayed}`
}

// ---------------------------------------------------------------------------
// Tournament points
// ---------------------------------------------------------------------------

/**
 * Points a single match is worth. Total Stroke Play pays at the session level
 * instead — no individual match wins anything there.
 */
export function matchPoints(status: MatchStatus): { team1: number; team2: number } {
  if (status.scoring === 'Total Stroke Play') return { team1: 0, team2: 0 }
  if (!status.isComplete || !status.result) return { team1: 0, team2: 0 }
  if (status.result.winner === 'halved') return { team1: 0.5, team2: 0.5 }
  if (status.result.winner === 'team1') return { team1: 1, team2: 0 }
  return { team1: 0, team2: 1 }
}

/**
 * Total Stroke Play: pool every match's total into one score per team, then
 * pay the margin out at the session's rate. Two pairings shooting 70 and 71
 * make 141; against 139 that's 2 strokes, and at 0.5 a stroke, one point.
 *
 * Level totals mean a margin of zero, so neither team scores.
 */
export function calcSessionTotals(
  session: Session,
  players: Player[],
  courses: Course[],
): SessionTotals {
  const rules = sessionRules(session)
  const course = courseForSession(courses, session)

  let team1 = 0
  let team2 = 0
  let allComplete = session.matches.length > 0

  for (const match of session.matches) {
    const status = calcMatchStatus(match, rules, players, course)
    team1 += status.t1Total
    team2 += status.t2Total
    if (!status.isComplete) allComplete = false
  }

  const margin = Math.abs(team1 - team2)
  const leader = team1 < team2 ? 'team1' : team2 < team1 ? 'team2' : null
  // Guard against float dust from 2v1's averaged sides.
  const award = leader ? round2(margin * rules.pointsPerStroke) : 0

  return {
    team1,
    team2,
    margin,
    leader,
    isComplete: allComplete,
    points: {
      team1: leader === 'team1' ? award : 0,
      team2: leader === 'team2' ? award : 0,
    },
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function totalPoints(
  sessions: Session[],
  players: Player[],
  courses: Course[],
): { team1: number; team2: number } {
  let t1 = 0
  let t2 = 0
  for (const session of sessions) {
    const rules = sessionRules(session)

    // A Total Stroke Play session is scored as a whole, not match by match.
    if (rules.scoring === 'Total Stroke Play') {
      const totals = calcSessionTotals(session, players, courses)
      t1 += totals.points.team1
      t2 += totals.points.team2
      continue
    }

    const course = courseForSession(courses, session)
    if (!course) continue
    for (const match of session.matches) {
      const pts = matchPoints(calcMatchStatus(match, rules, players, course))
      t1 += pts.team1
      t2 += pts.team2
    }
  }
  return { team1: t1, team2: t2 }
}

// ---------------------------------------------------------------------------
// Hole-by-hole running status (for worm chart / status row)
// ---------------------------------------------------------------------------

/**
 * Returns the cumulative t1Up value after each played hole, in order.
 * Pass a match with already-merged local scores.
 */
export function runningStatusByHole(
  match: Match,
  rules: SessionRules,
  players: Player[],
  course: SessionCourse,
): Array<{ hole: number; t1Up: number }> {
  const result: Array<{ hole: number; t1Up: number }> = []
  const sortedHoles = [...course.holes].sort((a, b) => a.number - b.number)
  const partialScores: Match['scores'] = {}

  for (const hole of sortedHoles) {
    const hs = match.scores[hole.number]
    if (!hs) continue
    partialScores[hole.number] = hs
    const partial: Match = { ...match, scores: partialScores }
    const st = calcMatchStatus(partial, rules, players, course)
    result.push({ hole: hole.number, t1Up: st.t1Up })
  }
  return result
}

// Re-export for convenience
export { scrambleTeamHandicap, courseHandicap }
export type { MatchScores }
