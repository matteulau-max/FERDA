/**
 * Setup validation. This module is authoritative — the UI mirrors some of
 * these checks for instant feedback, but nothing reaches Postgres without
 * passing through here first.
 */

export const FORMATS = ['Singles', 'Best Ball', 'Scramble', '2v1'] as const
export const SCORINGS = ['Match Play', 'Stroke Play'] as const

export type Format = (typeof FORMATS)[number]
export type Scoring = (typeof SCORINGS)[number]

export class ValidationError extends Error {}

function fail(message: string): never {
  throw new ValidationError(message)
}

/** Trim, require non-empty, and cap length so a stray paste can't fill a column. */
export function requireText(value: unknown, field: string, max = 80): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) fail(`${field} is required`)
  if (text.length > max) fail(`${field} must be ${max} characters or fewer`)
  return text
}

export function optionalText(value: unknown, field: string, max = 40): string | null {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return null
  if (text.length > max) fail(`${field} must be ${max} characters or fewer`)
  return text
}

export function requireNumber(value: unknown, field: string, min: number, max: number): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''))
  if (!isFinite(n)) fail(`${field} must be a number`)
  if (n < min || n > max) fail(`${field} must be between ${min} and ${max}`)
  return n
}

export function requireInt(value: unknown, field: string, min: number, max: number): number {
  const n = requireNumber(value, field, min, max)
  if (!Number.isInteger(n)) fail(`${field} must be a whole number`)
  return n
}

export function requireOneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!allowed.includes(text as T)) fail(`${field} must be one of: ${allowed.join(', ')}`)
  return text as T
}

/**
 * Turn a tournament name into a URL slug. Collisions are resolved by the
 * caller (it appends -2, -3, ...) since only the database knows what's taken.
 */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
  return slug || 'tournament'
}

/** A complete 18-hole card: every hole once, every stroke index once. */
export function validateHoles(input: unknown): { number: number; par: number; strokeIndex: number }[] {
  if (!Array.isArray(input) || input.length !== 18) fail('A course needs exactly 18 holes')

  const holes = input.map((h, i) => {
    const row = (h ?? {}) as Record<string, unknown>
    return {
      number: requireInt(row.number ?? i + 1, `Hole ${i + 1} number`, 1, 18),
      par: requireInt(row.par, `Hole ${i + 1} par`, 3, 6),
      strokeIndex: requireInt(row.strokeIndex, `Hole ${i + 1} stroke index`, 1, 18),
    }
  })

  const numbers = new Set(holes.map((h) => h.number))
  if (numbers.size !== 18) fail('Holes must be numbered 1 through 18 with no repeats')

  const indexes = new Set(holes.map((h) => h.strokeIndex))
  if (indexes.size !== 18) fail('Stroke indexes must be 1 through 18 with no repeats')

  return holes.sort((a, b) => a.number - b.number)
}

/**
 * Side sizes allowed per format. Scramble allowances are defined for 2-4
 * players (see src/lib/constants.ts), so sides larger than that would have
 * no handicap basis.
 */
export function validateSideSizes(format: Format, team1: string[], team2: string[]): void {
  const n1 = team1.length
  const n2 = team2.length

  if (format === 'Singles') {
    if (n1 !== 1 || n2 !== 1) fail('Singles matches are one player per side')
    return
  }
  if (format === '2v1') {
    const sizes = [n1, n2].sort().join('v')
    if (sizes !== '1v2') fail('A 2v1 match needs two players on one side and one on the other')
    return
  }
  // Best Ball and Scramble
  if (n1 !== n2) fail(`${format} matches need the same number of players on each side`)
  if (n1 < 2 || n1 > 4) fail(`${format} matches need 2 to 4 players per side`)
}

export interface RosterPlayer {
  name: string
  team: 1 | 2
}

/**
 * Players must exist in this tournament and be on the side they're listed
 * under — a Team 1 player in the team2 slot would be scored against their
 * own team.
 */
export function validatePairing(
  format: Format,
  team1: string[],
  team2: string[],
  roster: RosterPlayer[],
): void {
  validateSideSizes(format, team1, team2)

  const all = [...team1, ...team2]
  const seen = new Set<string>()
  for (const name of all) {
    if (seen.has(name)) fail(`${name} is listed twice in the same match`)
    seen.add(name)
  }

  const byName = new Map(roster.map((p) => [p.name, p]))
  for (const [side, names] of [[1, team1], [2, team2]] as const) {
    for (const name of names) {
      const player = byName.get(name)
      if (!player) fail(`${name} is not on the roster`)
      if (player.team !== side) fail(`${name} is on Team ${player.team} but is listed on the Team ${side} side`)
    }
  }
}

/** No player may appear in two matches in the same session. */
export function validateNoDoubleBooking(
  matches: { id: string; team1Players: string[]; team2Players: string[] }[],
  editingMatchId?: string,
): void {
  const seen = new Map<string, string>()
  for (const match of matches) {
    for (const name of [...match.team1Players, ...match.team2Players]) {
      const other = seen.get(name)
      if (other && other !== match.id) {
        fail(
          editingMatchId && match.id === editingMatchId
            ? `${name} is already playing in match ${other} this session`
            : `${name} appears in both match ${other} and match ${match.id}`,
        )
      }
      seen.set(name, match.id)
    }
  }
}
