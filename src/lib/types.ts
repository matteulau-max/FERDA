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
  handicapIndex: number  // USGA Handicap Index (decimal)
  team: 1 | 2
}

export type Format = 'Singles' | 'Best Ball' | 'Scramble'

export interface Session {
  name: string
  format: Format
  sortOrder: number
  matches: Match[]
}

export interface Match {
  id: string
  team1Players: string[]
  team2Players: string[]
  sortOrder: number
  scores: MatchScores
}

// Scores keyed by hole number (1-18)
// Best Ball / Singles: per-player object  { "Matt": 5, "Jake": 6 }
// Scramble: per-player object with single entry (first player name used as key)
export interface HoleScores {
  team1: Record<string, number>
  team2: Record<string, number>
}

export type MatchScores = Record<number, HoleScores>

export interface MatchStatus {
  /** Positive = team1 leads, negative = team2 leads */
  t1Up: number
  holesPlayed: number
  holesRemaining: number
  isComplete: boolean
  result: {
    winner: 'team1' | 'team2' | 'halved'
    /** e.g. "3&2", "1 UP", "HALVED" */
    text: string
  } | null
}

export interface TournamentData {
  course: Course
  teams: { team1: Team; team2: Team }
  players: Player[]
  sessions: Session[]
}

export interface SaveScorePayload {
  action: 'saveScore'
  matchId: string
  hole: number
  side: 'team1' | 'team2'
  player: string
  grossScore: number
}
