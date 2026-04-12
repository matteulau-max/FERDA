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

export const FORMAT_LABELS: Record<string, string> = {
  Singles: 'Singles',
  'Best Ball': 'Best Ball',
  Scramble: 'Scramble',
}
