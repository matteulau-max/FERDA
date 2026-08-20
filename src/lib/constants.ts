export const TEAM_COLORS = {
  team1: '#006747',
  team2: '#C41E3A',
} as const

export const MASTERS_GREEN = '#006747'
export const MASTERS_YELLOW = '#FFF200'
export const MASTERS_CREAM = '#FDF8E8'
export const MASTERS_RED = '#C41E3A'

/**
 * USGA scramble allowance tables.
 * Each array is ordered [low CH, next, next, high CH].
 * Source: USGA Rules of Handicapping, Appendix C.
 */
export const SCRAMBLE_ALLOWANCES: Record<number, number[]> = {
  2: [0.35, 0.15],
  3: [0.30, 0.20, 0.10],
  4: [0.25, 0.20, 0.15, 0.10],
}

/** Best Ball allowance per player */
export const BEST_BALL_ALLOWANCE = 0.9

/** Singles allowance */
export const SINGLES_ALLOWANCE = 1.0

/**
 * 2 v 1 allowance for the PAIRED side only.
 *
 * There is no official USGA "2 v 1" format. Following the USGA four-ball
 * principle of discounting multi-player sides, each member of the two-player
 * side plays at 90% of course handicap while the solo plays at 100%
 * (TWO_V_ONE_SOLO_ALLOWANCE). The shared "lowest of the three plays off
 * scratch" relative offset (see matchPlayingHandicaps) then applies on top.
 */
export const TWO_V_ONE_PAIR_ALLOWANCE = 0.9

/** 2 v 1 allowance for the solo side. */
export const TWO_V_ONE_SOLO_ALLOWANCE = 1.0

export const FORMAT_LABELS: Record<string, string> = {
  Singles: 'Singles',
  'Best Ball': 'Best Ball',
  Scramble: 'Scramble',
  '2v1': '2 v 1',
}

export const SCORING_LABELS: Record<string, string> = {
  'Match Play': 'Match Play',
  'Stroke Play': 'Stroke Play',
  'Total Stroke Play': 'Total Stroke Play',
}

/** Space is tight in the session header badge. */
export const SCORING_SHORT_LABELS: Record<string, string> = {
  'Match Play': 'Match',
  'Stroke Play': 'Stroke',
  'Total Stroke Play': 'Total Stroke',
}

/** Default team points awarded per stroke of margin in Total Stroke Play. */
export const DEFAULT_POINTS_PER_STROKE = 0.5
