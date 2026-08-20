/**
 * The tournament manual — everything the app can't work out for itself.
 *
 * The manual page has three kinds of content, and only the third is stored here:
 *
 *  1. Derived. The rounds, the roster, the points on the board, the handicap
 *     maths — all of it already lives in the tournament. It is read from
 *     sessions/players/courses at render time and never typed twice.
 *  2. Explained. How handicaps, scramble allowances and best-ball allowances
 *     work is a property of the app, identical for every event, so it's fixed
 *     copy in the manual page.
 *  3. Decided. Penalty strokes, search time, mulligans, stakes, where everyone
 *     is sleeping. That's this file.
 *
 * Every field has a recommended default, so an organiser who touches none of
 * this still gets a complete, sensible manual. A stored document is therefore
 * always treated as a patch over the defaults, never as the whole truth —
 * `manualDoc()` is the only way the rest of the app should read it.
 */

export interface OutOfBoundsRule {
  /** Penalty strokes for an out-of-bounds or lost ball. */
  penaltyStrokes: number
  /** True = stroke and distance (back to the tee). False = lateral drop. */
  returnToTee: boolean
  /** Minutes allowed to look for a ball before it's lost. */
  searchMinutes: number
  /** Group agrees the ball is in play but can't find it → free drop. */
  galleryDrops: boolean
}

export const MAX_SCORES = [
  'Double par',
  'Net double bogey',
  'Triple bogey',
  'No maximum',
] as const
export type MaxScore = (typeof MAX_SCORES)[number]

export const HONORS = ['Optional', 'Mandatory'] as const
export type Honors = (typeof HONORS)[number]

export const GIMMES = ['None — hole everything out', 'Inside the leather', 'Opponent may concede'] as const
export type Gimmes = (typeof GIMMES)[number]

export interface PaceRule {
  readyGolf: boolean
  honors: Honors
}

export interface EquipmentRule {
  rangefinders: boolean
  /** Slope-adjusting (elevation-compensating) devices. */
  slope: boolean
}

export interface ScrambleRule {
  /** Club-lengths of placement relief from the chosen shot. 0 = play it as it lies. */
  clubLengths: number
  /** Placement must stay in the same kind of lie (bunker stays in the bunker). */
  sameLie: boolean
}

/** One of the organiser's own rules, listed under "<Tournament> Rules". */
export interface CustomRule {
  id: string
  title: string
  body: string
}

export interface ManualRules {
  /** Free-form. Blank hides the card entirely. */
  conduct: string
  outOfBounds: OutOfBoundsRule
  maxScore: MaxScore
  /** Mulligans allowed per player per round. 0 = none. */
  mulligans: number
  gimmes: Gimmes
  pace: PaceRule
  equipment: EquipmentRule
  scramble: ScrambleRule
  custom: CustomRule[]
}

export const SCHEDULE_KINDS = ['Event', 'Lunch', 'Dinner'] as const
export type ScheduleKind = (typeof SCHEDULE_KINDS)[number]

export interface ScheduleEntry {
  id: string
  /** Free text so "Thu 7/9", "Friday" and "Day 1" all work. */
  day: string
  /** Free text for the same reason: "8:20 AM", "AM", "Midday", "After". */
  time: string
  kind: ScheduleKind
  title: string
  note: string
  /** Optional link to a session, which supplies the format/course badge. */
  sessionName: string
}

export interface ManualInfo {
  /** Shown under the tournament name, e.g. "July 9–12, 2026". */
  dates: string
  location: string
  /** One line at the top of the schedule, e.g. "Four Days. Two Teams." */
  tagline: string
}

export interface ManualLodging {
  /** Off by default — most events don't need a lodging page. */
  enabled: boolean
  name: string
  address: string
  checkIn: string
  checkOut: string
  doorCode: string
  wifiNetwork: string
  wifiPassword: string
  notes: string
}

/**
 * Stakes for the four pools payouts.ts settles. Each is a per-player buy-in;
 * setting one to 0 removes that pool from the board entirely.
 */
export interface ManualWagers {
  /** Per player, per round, head-to-head. */
  matchupStake: number
  /** Per player on the overall team result. */
  cup: number
  /** Per player into the Golfer of the Weekend pot; winner takes it all. */
  golferBuyIn: number
  /** Per player, per skill (longest drive, closest to the pin). */
  skill: number
  notes: string
}

export interface ManualDoc {
  info: ManualInfo
  rules: ManualRules
  schedule: ScheduleEntry[]
  lodging: ManualLodging
  wagers: ManualWagers
}

/** The top-level keys, each saved independently. */
export const MANUAL_PARTS = ['info', 'rules', 'schedule', 'lodging', 'wagers'] as const
export type ManualPart = (typeof MANUAL_PARTS)[number]

// ------------------------------------------------------------------ defaults

export const DEFAULT_INFO: ManualInfo = { dates: '', location: '', tagline: '' }

/**
 * The recommended ruleset. These are the answers a first-time organiser would
 * most likely want, so an untouched manual reads as a finished document rather
 * than a form full of blanks.
 */
export const DEFAULT_RULES: ManualRules = {
  conduct: '',
  outOfBounds: {
    penaltyStrokes: 1,
    returnToTee: false,
    searchMinutes: 3,
    galleryDrops: true,
  },
  maxScore: 'Double par',
  mulligans: 0,
  gimmes: 'None — hole everything out',
  pace: { readyGolf: true, honors: 'Optional' },
  equipment: { rangefinders: true, slope: true },
  scramble: { clubLengths: 1, sameLie: true },
  custom: [],
}

export const DEFAULT_LODGING: ManualLodging = {
  enabled: false,
  name: '',
  address: '',
  checkIn: '',
  checkOut: '',
  doorCode: '',
  wifiNetwork: '',
  wifiPassword: '',
  notes: '',
}

export const DEFAULT_WAGERS: ManualWagers = {
  matchupStake: 0,
  cup: 0,
  golferBuyIn: 0,
  skill: 0,
  notes: '',
}

export const DEFAULT_MANUAL: ManualDoc = {
  info: DEFAULT_INFO,
  rules: DEFAULT_RULES,
  schedule: [],
  lodging: DEFAULT_LODGING,
  wagers: DEFAULT_WAGERS,
}

// ------------------------------------------------------------- normalisation

type Partial2<T> = { [K in keyof T]?: unknown }

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function num(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''))
  return Number.isFinite(n) ? n : fallback
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function obj(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

/**
 * Read a stored manual, whatever state it's in. Anything missing, malformed or
 * written by an older version of the app falls back to the default, so callers
 * always get a complete document and never have to check for undefined.
 */
export function manualDoc(stored: unknown): ManualDoc {
  const doc = obj(stored)
  return {
    info: manualInfo(doc.info),
    rules: manualRules(doc.rules),
    schedule: manualSchedule(doc.schedule),
    lodging: manualLodging(doc.lodging),
    wagers: manualWagers(doc.wagers),
  }
}

export function manualInfo(stored: unknown): ManualInfo {
  const i = obj(stored) as Partial2<ManualInfo>
  return {
    dates: str(i.dates, DEFAULT_INFO.dates),
    location: str(i.location, DEFAULT_INFO.location),
    tagline: str(i.tagline, DEFAULT_INFO.tagline),
  }
}

export function manualRules(stored: unknown): ManualRules {
  const r = obj(stored)
  const ob = obj(r.outOfBounds)
  const pace = obj(r.pace)
  const eq = obj(r.equipment)
  const sc = obj(r.scramble)
  const d = DEFAULT_RULES
  return {
    conduct: str(r.conduct, d.conduct),
    outOfBounds: {
      penaltyStrokes: num(ob.penaltyStrokes, d.outOfBounds.penaltyStrokes),
      returnToTee: bool(ob.returnToTee, d.outOfBounds.returnToTee),
      searchMinutes: num(ob.searchMinutes, d.outOfBounds.searchMinutes),
      galleryDrops: bool(ob.galleryDrops, d.outOfBounds.galleryDrops),
    },
    maxScore: oneOf(r.maxScore, MAX_SCORES, d.maxScore),
    mulligans: num(r.mulligans, d.mulligans),
    gimmes: oneOf(r.gimmes, GIMMES, d.gimmes),
    pace: {
      readyGolf: bool(pace.readyGolf, d.pace.readyGolf),
      honors: oneOf(pace.honors, HONORS, d.pace.honors),
    },
    equipment: {
      rangefinders: bool(eq.rangefinders, d.equipment.rangefinders),
      slope: bool(eq.slope, d.equipment.slope),
    },
    scramble: {
      clubLengths: num(sc.clubLengths, d.scramble.clubLengths),
      sameLie: bool(sc.sameLie, d.scramble.sameLie),
    },
    custom: Array.isArray(r.custom)
      ? r.custom.map((c, i) => {
          const row = obj(c)
          return {
            id: str(row.id, `custom-${i}`),
            title: str(row.title, ''),
            body: str(row.body, ''),
          }
        })
      : [],
  }
}

export function manualSchedule(stored: unknown): ScheduleEntry[] {
  if (!Array.isArray(stored)) return []
  return stored.map((e, i) => {
    const row = obj(e)
    return {
      id: str(row.id, `entry-${i}`),
      day: str(row.day, ''),
      time: str(row.time, ''),
      kind: oneOf(row.kind, SCHEDULE_KINDS, 'Event'),
      title: str(row.title, ''),
      note: str(row.note, ''),
      sessionName: str(row.sessionName, ''),
    }
  })
}

export function manualLodging(stored: unknown): ManualLodging {
  const l = obj(stored) as Partial2<ManualLodging>
  const d = DEFAULT_LODGING
  return {
    enabled: bool(l.enabled, d.enabled),
    name: str(l.name, d.name),
    address: str(l.address, d.address),
    checkIn: str(l.checkIn, d.checkIn),
    checkOut: str(l.checkOut, d.checkOut),
    doorCode: str(l.doorCode, d.doorCode),
    wifiNetwork: str(l.wifiNetwork, d.wifiNetwork),
    wifiPassword: str(l.wifiPassword, d.wifiPassword),
    notes: str(l.notes, d.notes),
  }
}

export function manualWagers(stored: unknown): ManualWagers {
  const w = obj(stored) as Partial2<ManualWagers>
  const d = DEFAULT_WAGERS
  return {
    matchupStake: num(w.matchupStake, d.matchupStake),
    cup: num(w.cup, d.cup),
    golferBuyIn: num(w.golferBuyIn, d.golferBuyIn),
    skill: num(w.skill, d.skill),
    notes: str(w.notes, d.notes),
  }
}

// ----------------------------------------------------------------- questions

/** True when the organiser has put any money on the board. */
export function hasWagers(w: ManualWagers): boolean {
  return w.matchupStake > 0 || w.cup > 0 || w.golferBuyIn > 0 || w.skill > 0
}

/** Group schedule entries by day, keeping both days and entries in stored order. */
export function scheduleByDay(entries: ScheduleEntry[]): { day: string; entries: ScheduleEntry[] }[] {
  const days: { day: string; entries: ScheduleEntry[] }[] = []
  for (const entry of entries) {
    const day = entry.day.trim()
    const last = days.find((d) => d.day === day)
    if (last) last.entries.push(entry)
    else days.push({ day, entries: [entry] })
  }
  return days
}

/** Stable-enough ids for list rows; the manual is edited by one person at a time. */
export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
