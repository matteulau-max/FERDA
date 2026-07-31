export interface Course {
  name: string
  rating: number
  slope: number
  par: number
  holes: Hole[]
}

export interface Hole {
  number: number       // 1-18
  par: number          // 3, 4, or 5
  strokeIndex: number  // 1-18
}

export interface Team {
  name: string
}

export interface Player {
  name: string
  handicapIndex: number  // USGA Handicap Index (decimal), NOT a course handicap
  team: 1 | 2
  phone?: string         // optional, for sharing the tournament link
}

export type Format = 'Singles' | 'Best Ball' | 'Scramble' | '2v1'

/**
 * Match Play        — holes won, the classic Ryder Cup point per match.
 * Stroke Play       — net stroke differential, still one point per match.
 * Total Stroke Play — every match's total is pooled into one team score for
 *                     the session; the margin pays out at pointsPerStroke.
 */
export type Scoring = 'Match Play' | 'Stroke Play' | 'Total Stroke Play'

/** Which holes of the session's course are actually played. */
export type HoleSet = 'All 18' | 'Front 9' | 'Back 9'

export interface Session {
  name: string
  format: Format
  scoring?: Scoring
  sortOrder: number
  courseName: string
  /** Absent on tournaments created before nines existed — treat as 'All 18'. */
  holeSet?: HoleSet
  /** Absent means handicaps apply, which is how every earlier session ran. */
  useHandicap?: boolean
  /** Total Stroke Play only. Absent means the default 0.5. */
  pointsPerStroke?: number
  matches: Match[]
}

/**
 * Everything the scoring engine needs to know about how a session is played.
 * Built from a Session by `sessionRules()`, which fills in the defaults that
 * older tournaments don't carry.
 */
export interface SessionRules {
  format: Format
  scoring: Scoring
  holeSet: HoleSet
  useHandicap: boolean
  pointsPerStroke: number
}

/**
 * A course as a particular session plays it. For 'All 18' this is the course
 * itself; for a nine, `holes` is that nine with stroke indexes re-ranked 1–9
 * and `par`/`rating` scaled to match. See src/lib/holes.ts.
 */
export interface SessionCourse extends Course {
  /** Fraction of a Handicap Index in play: 1 for 18 holes, 0.5 for a nine. */
  indexFactor: number
}

export interface Match {
  id: string
  team1Players: string[]
  team2Players: string[]
  sortOrder: number
  scores: MatchScores
}

// Scores keyed by hole number (1-18)
// Best Ball / Singles / 2v1: per-player object  { "Matt": 5, "Jake": 6 }
// Scramble: per-player object with single entry (first player name used as key)
export interface HoleScores {
  team1: Record<string, number>
  team2: Record<string, number>
}

export type MatchScores = Record<number, HoleScores>

export interface MatchStatus {
  /** Positive = team1 leads, negative = team2 leads.
   *  Match Play: holes up. Stroke play: cumulative net stroke differential. */
  t1Up: number
  /** Each side's competing score summed over the holes played so far —
   *  net when handicaps are on, gross when they're off. This is what Total
   *  Stroke Play pools across the session. */
  t1Total: number
  t2Total: number
  holesPlayed: number
  holesRemaining: number
  isComplete: boolean
  scoring: Scoring
  result: {
    winner: 'team1' | 'team2' | 'halved'
    /** Match Play: "3&2", "1 UP", "HALVED". Stroke play: "by 3", "HALVED". */
    text: string
  } | null
}

/** A Total Stroke Play session rolled up: both team totals and the payout. */
export interface SessionTotals {
  team1: number
  team2: number
  /** Strokes the leader is ahead by; 0 when level. */
  margin: number
  leader: 'team1' | 'team2' | null
  isComplete: boolean
  points: { team1: number; team2: number }
}

export interface TournamentData {
  /** Absent on the built-in mock tournament, which has no database row. */
  slug?: string
  name?: string
  courses: Course[]
  teams: { team1: Team; team2: Team }
  players: Player[]
  sessions: Session[]
  /**
   * The manual document, stored as-is. Read it through `manualDoc()` in
   * src/lib/manual.ts rather than directly — it may be absent, empty, or
   * missing whatever the organiser never filled in.
   */
  manual?: unknown
}

export interface SaveScorePayload {
  action: 'saveScore'
  matchId: string
  hole: number
  side: 'team1' | 'team2'
  player: string
  grossScore: number
}
