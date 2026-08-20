/**
 * Validation for the tournament manual (see src/lib/manual.ts for what it is
 * and why it's shaped this way).
 *
 * The manual is stored as one jsonb document, so nothing here is enforced by
 * the database — this module is the only thing standing between a request and
 * the column. It doesn't fill in defaults: an absent field stays absent and
 * the reader supplies the default, which keeps a saved document to the
 * organiser's actual answers.
 *
 * Text limits are generous because these are prose fields, but finite, so a
 * runaway paste can't push a tournament row past what a request can carry.
 */

import { ValidationError } from './validate'

export const MANUAL_PARTS = ['info', 'rules', 'schedule', 'lodging', 'wagers'] as const
export type ManualPart = (typeof MANUAL_PARTS)[number]

export const MAX_SCORES = ['Double par', 'Net double bogey', 'Triple bogey', 'No maximum'] as const
export const HONORS = ['Optional', 'Mandatory'] as const
export const GIMMES = ['None — hole everything out', 'Inside the leather', 'Opponent may concede'] as const
export const SCHEDULE_KINDS = ['Event', 'Lunch', 'Dinner'] as const

/** A day of golf has a lot of moving parts, but not this many. */
const MAX_SCHEDULE_ENTRIES = 200
const MAX_CUSTOM_RULES = 50

function fail(message: string): never {
  throw new ValidationError(message)
}

function obj(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${field} must be an object`)
  }
  return value as Record<string, unknown>
}

function text(value: unknown, field: string, max: number): string {
  if (value == null) return ''
  if (typeof value !== 'string') fail(`${field} must be text`)
  const trimmed = value.trim()
  if (trimmed.length > max) fail(`${field} must be ${max} characters or fewer`)
  return trimmed
}

function bool(value: unknown, field: string): boolean {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  fail(`${field} must be true or false`)
}

function num(value: unknown, field: string, min: number, max: number): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''))
  if (!isFinite(n)) fail(`${field} must be a number`)
  if (n < min || n > max) fail(`${field} must be between ${min} and ${max}`)
  return n
}

function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (!allowed.includes(value as T)) fail(`${field} must be one of: ${allowed.join(', ')}`)
  return value as T
}

function list(value: unknown, field: string, max: number): unknown[] {
  if (!Array.isArray(value)) fail(`${field} must be a list`)
  if (value.length > max) fail(`${field} is limited to ${max} entries`)
  return value
}

/**
 * Validate one part of the manual and hand back the object to store. Each part
 * is saved on its own so editing the schedule can't clobber the rules.
 */
export function validateManualPart(part: ManualPart, value: unknown): unknown {
  switch (part) {
    case 'info':
      return validateInfo(value)
    case 'rules':
      return validateRules(value)
    case 'schedule':
      return validateSchedule(value)
    case 'lodging':
      return validateLodging(value)
    case 'wagers':
      return validateWagers(value)
  }
}

function validateInfo(value: unknown) {
  const i = obj(value, 'Event details')
  return {
    dates: text(i.dates, 'Dates', 60),
    location: text(i.location, 'Location', 80),
    tagline: text(i.tagline, 'Tagline', 120),
  }
}

function validateRules(value: unknown) {
  const r = obj(value, 'Rules')
  const ob = obj(r.outOfBounds ?? {}, 'Out of bounds rule')
  const pace = obj(r.pace ?? {}, 'Pace of play rule')
  const eq = obj(r.equipment ?? {}, 'Equipment rule')
  const sc = obj(r.scramble ?? {}, 'Scramble rule')

  return {
    conduct: text(r.conduct, 'Code of conduct', 2000),
    outOfBounds: {
      penaltyStrokes: num(ob.penaltyStrokes, 'Penalty strokes', 0, 2),
      returnToTee: bool(ob.returnToTee, 'Return to tee'),
      searchMinutes: num(ob.searchMinutes, 'Ball search limit', 0, 10),
      galleryDrops: bool(ob.galleryDrops, 'Gallery drops'),
    },
    maxScore: oneOf(r.maxScore, 'Maximum score', MAX_SCORES),
    mulligans: num(r.mulligans, 'Mulligans', 0, 18),
    gimmes: oneOf(r.gimmes, 'Concessions', GIMMES),
    pace: {
      readyGolf: bool(pace.readyGolf, 'Ready golf'),
      honors: oneOf(pace.honors, 'Honors', HONORS),
    },
    equipment: {
      rangefinders: bool(eq.rangefinders, 'Rangefinders'),
      slope: bool(eq.slope, 'Slope devices'),
    },
    scramble: {
      clubLengths: num(sc.clubLengths, 'Club-lengths', 0, 3),
      sameLie: bool(sc.sameLie, 'Same lie'),
    },
    custom: list(r.custom ?? [], 'Rules', MAX_CUSTOM_RULES).map((c, i) => {
      const row = obj(c, `Rule ${i + 1}`)
      const title = text(row.title, `Rule ${i + 1} title`, 80)
      const body = text(row.body, `Rule ${i + 1}`, 1000)
      if (!title && !body) fail(`Rule ${i + 1} is empty — give it a title or remove it`)
      return { id: text(row.id, 'Rule id', 40) || `custom-${i}`, title, body }
    }),
  }
}

function validateSchedule(value: unknown) {
  return list(value, 'Schedule', MAX_SCHEDULE_ENTRIES).map((e, i) => {
    const row = obj(e, `Schedule row ${i + 1}`)
    const kind = oneOf(row.kind ?? 'Event', `Schedule row ${i + 1} type`, SCHEDULE_KINDS)
    const title = text(row.title, `Schedule row ${i + 1} event`, 120)
    // Lunch and Dinner are self-describing, so only a plain event needs a name.
    if (kind === 'Event' && !title) fail(`Schedule row ${i + 1} needs an event name`)
    return {
      id: text(row.id, 'Schedule row id', 40) || `entry-${i}`,
      day: text(row.day, `Schedule row ${i + 1} day`, 40),
      time: text(row.time, `Schedule row ${i + 1} time`, 40),
      kind,
      title,
      note: text(row.note, `Schedule row ${i + 1} note`, 500),
      sessionName: text(row.sessionName, `Schedule row ${i + 1} round`, 60),
    }
  })
}

function validateLodging(value: unknown) {
  const l = obj(value, 'Lodging')
  return {
    enabled: bool(l.enabled, 'Lodging page'),
    name: text(l.name, 'Lodging name', 80),
    address: text(l.address, 'Address', 200),
    checkIn: text(l.checkIn, 'Check-in', 80),
    checkOut: text(l.checkOut, 'Check-out', 80),
    doorCode: text(l.doorCode, 'Door code', 40),
    wifiNetwork: text(l.wifiNetwork, 'Wi-Fi network', 80),
    wifiPassword: text(l.wifiPassword, 'Wi-Fi password', 80),
    notes: text(l.notes, 'Lodging notes', 2000),
  }
}

function validateWagers(value: unknown) {
  const w = obj(value, 'Wagers')
  // Capped well above any sane buy-in, but capped: these numbers multiply out
  // across the whole field on the payouts board.
  return {
    matchupStake: num(w.matchupStake, 'Matchup stake', 0, 10000),
    cup: num(w.cup, 'Cup buy-in', 0, 10000),
    golferBuyIn: num(w.golferBuyIn, 'Golfer of the Weekend buy-in', 0, 10000),
    skill: num(w.skill, 'Skills buy-in', 0, 10000),
    notes: text(w.notes, 'Wager notes', 2000),
  }
}
