/**
 * holes.ts
 * Turning a rated 18-hole course into the course a session actually plays.
 *
 * A nine is not simply "the same course, fewer holes". Two things change:
 *
 *  1. Stroke indexes. A course rates its holes 1–18 across the full round, so
 *     the front nine typically holds the odd indexes (1, 3, 5 …) and the back
 *     the even. Allocating a nine-hole handicap against those raw numbers
 *     would hand out roughly half the strokes it should. Re-ranking the nine's
 *     indexes 1–9 among themselves fixes that: a player owed 9 strokes over
 *     nine holes gets one on every hole, which is correct.
 *
 *  2. The handicap itself. Only 18-hole rating and slope are stored, so the
 *     nine-hole Course Handicap is derived the standard way — half the index
 *     against half the rating, with par summed from the holes played.
 *
 * Everything downstream keeps working on a plain Course, so the rest of the
 * engine never has to ask how many holes are in play.
 */

import type { Course, Hole, HoleSet, Session, SessionCourse, SessionRules } from './types'

export const HOLE_SETS: HoleSet[] = ['All 18', 'Front 9', 'Back 9']

export const HOLE_SET_LABELS: Record<HoleSet, string> = {
  'All 18': 'All 18',
  'Front 9': 'Front 9 (1–9)',
  'Back 9': 'Back 9 (10–18)',
}

/** Fill in the defaults older sessions don't carry. */
export function sessionRules(session: {
  format: Session['format']
  scoring?: Session['scoring']
  holeSet?: HoleSet
  useHandicap?: boolean
  pointsPerStroke?: number
}): SessionRules {
  return {
    format: session.format,
    scoring: session.scoring ?? 'Match Play',
    holeSet: session.holeSet ?? 'All 18',
    useHandicap: session.useHandicap ?? true,
    pointsPerStroke: session.pointsPerStroke ?? 0.5,
  }
}

/** The hole numbers a set covers, before the course is consulted. */
export function holeNumbersFor(holeSet: HoleSet): number[] {
  if (holeSet === 'Front 9') return [1, 2, 3, 4, 5, 6, 7, 8, 9]
  if (holeSet === 'Back 9') return [10, 11, 12, 13, 14, 15, 16, 17, 18]
  return Array.from({ length: 18 }, (_, i) => i + 1)
}

/**
 * The holes a session plays, in order, with stroke indexes re-ranked within
 * the set. The hardest hole of the nine becomes index 1, the next 2, and so
 * on — their relative difficulty order is preserved, only the scale changes.
 */
export function playedHoles(course: Course, holeSet: HoleSet): Hole[] {
  const wanted = new Set(holeNumbersFor(holeSet))
  const holes = course.holes
    .filter((h) => wanted.has(h.number))
    .sort((a, b) => a.number - b.number)

  if (holeSet === 'All 18') return holes

  // Rank by the original stroke index; position in that ranking is the new one.
  const rankByNumber = new Map(
    [...holes]
      .sort((a, b) => a.strokeIndex - b.strokeIndex)
      .map((h, i) => [h.number, i + 1] as const),
  )
  return holes.map((h) => ({ ...h, strokeIndex: rankByNumber.get(h.number) ?? h.strokeIndex }))
}

/**
 * The course as this session plays it. Handicap math reads `indexFactor`;
 * everything else can treat the result as an ordinary Course.
 */
export function sessionCourse(course: Course, holeSet: HoleSet): SessionCourse {
  if (holeSet === 'All 18') return { ...course, indexFactor: 1 }

  const holes = playedHoles(course, holeSet)
  return {
    ...course,
    // No separate nine-hole rating is stored, so halve the eighteen's.
    rating: course.rating / 2,
    par: holes.reduce((sum, h) => sum + h.par, 0),
    holes,
    indexFactor: 0.5,
  }
}

/** Resolve a session's course from the tournament's list, already scoped to its holes. */
export function courseForSession(
  courses: Course[],
  session: { courseName: string; holeSet?: HoleSet },
): SessionCourse | undefined {
  const course = courses.find((c) => c.name === session.courseName) ?? courses[0]
  if (!course) return undefined
  return sessionCourse(course, session.holeSet ?? 'All 18')
}
