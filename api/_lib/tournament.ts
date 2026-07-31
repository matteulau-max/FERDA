import type { Pool } from 'pg'

// Response shapes mirror src/lib/types.ts — the frontend consumes this
// JSON exactly as it consumed the Apps Script version.

export interface TournamentRow {
  id: string
  slug: string
  name: string
  team1_name: string
  team2_name: string
}

interface HoleScores {
  team1: Record<string, number>
  team2: Record<string, number>
}

/**
 * Resolve which tournament a request is for:
 * explicit ?t=<slug> → DEFAULT_TOURNAMENT_SLUG env → the sole tournament.
 */
export async function resolveTournament(pool: Pool, slug?: string): Promise<TournamentRow> {
  const wanted = slug?.trim() || process.env.DEFAULT_TOURNAMENT_SLUG?.trim()
  if (wanted) {
    const { rows } = await pool.query<TournamentRow>(
      'select id, slug, name, team1_name, team2_name from tournaments where slug = $1',
      [wanted],
    )
    if (!rows[0]) throw new Error(`Tournament not found: ${wanted}`)
    return rows[0]
  }
  const { rows } = await pool.query<TournamentRow>(
    'select id, slug, name, team1_name, team2_name from tournaments order by created_at limit 2',
  )
  if (rows.length === 0) throw new Error('No tournaments exist — run the seed script first')
  if (rows.length > 1) throw new Error('Multiple tournaments exist — pass ?t=<slug> or set DEFAULT_TOURNAMENT_SLUG')
  return rows[0]
}

export interface TournamentSummary {
  slug: string
  name: string
  team1Name: string
  team2Name: string
  playerCount: number
  sessionCount: number
  matchCount: number
  createdAt: string
}

/**
 * Everything on the landing page. Counts come from subqueries rather than
 * joins so a tournament with no players still shows up (with zeroes).
 */
export async function listTournaments(pool: Pool): Promise<TournamentSummary[]> {
  const { rows } = await pool.query(
    `select t.slug, t.name, t.team1_name, t.team2_name, t.created_at,
            (select count(*) from players  p where p.tournament_id = t.id) as player_count,
            (select count(*) from sessions s where s.tournament_id = t.id) as session_count,
            (select count(*) from matches  m where m.tournament_id = t.id) as match_count
       from tournaments t
      order by t.created_at desc`,
  )
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    team1Name: r.team1_name,
    team2Name: r.team2_name,
    // count() comes back from pg as a string.
    playerCount: Number(r.player_count),
    sessionCount: Number(r.session_count),
    matchCount: Number(r.match_count),
    createdAt: r.created_at.toISOString(),
  }))
}

export async function getTournament(pool: Pool, tournament: TournamentRow) {
  const [courses, players, sessions, matches, scores] = await Promise.all([
    pool.query(
      `select c.name, c.rating, c.slope, c.par,
              json_agg(json_build_object('number', h.number, 'par', h.par, 'strokeIndex', h.stroke_index)
                       order by h.number) as holes
         from courses c
         join holes h on h.course_id = c.id
        where c.tournament_id = $1
        group by c.id
        order by c.name`,
      [tournament.id],
    ),
    pool.query(
      `select name, handicap_index, team, phone from players
        where tournament_id = $1 order by team, name`,
      [tournament.id],
    ),
    pool.query(
      `select name, format, scoring, sort_order, course_name,
              hole_set, use_handicap, points_per_stroke
         from sessions
        where tournament_id = $1 order by sort_order`,
      [tournament.id],
    ),
    pool.query(
      `select id, session_name, team1_players, team2_players, sort_order from matches
        where tournament_id = $1 order by sort_order`,
      [tournament.id],
    ),
    pool.query(
      `select match_id, hole, side, player, gross_score from scores
        where tournament_id = $1`,
      [tournament.id],
    ),
  ])

  // scores[matchId][hole] = { team1: {player: gross}, team2: {...} }
  const scoresByMatch: Record<string, Record<number, HoleScores>> = {}
  for (const row of scores.rows) {
    const byHole = (scoresByMatch[row.match_id] ??= {})
    const holeScores = (byHole[row.hole] ??= { team1: {}, team2: {} })
    holeScores[row.side as 'team1' | 'team2'][row.player] = row.gross_score
  }

  return {
    slug: tournament.slug,
    name: tournament.name,
    courses: courses.rows.map((c) => ({
      name: c.name,
      rating: parseFloat(c.rating), // numeric comes back as a string from pg
      slope: c.slope,
      par: c.par,
      holes: c.holes,
    })),
    teams: {
      team1: { name: tournament.team1_name },
      team2: { name: tournament.team2_name },
    },
    players: players.rows.map((p) => ({
      name: p.name,
      handicapIndex: parseFloat(p.handicap_index),
      team: p.team,
      ...(p.phone ? { phone: p.phone } : {}),
    })),
    sessions: sessions.rows.map((s) => ({
      name: s.name,
      format: s.format,
      ...(s.scoring ? { scoring: s.scoring } : {}),
      sortOrder: s.sort_order,
      courseName: s.course_name,
      holeSet: s.hole_set,
      useHandicap: s.use_handicap,
      pointsPerStroke: parseFloat(s.points_per_stroke), // numeric arrives as a string
      matches: matches.rows
        .filter((m) => m.session_name === s.name)
        .map((m) => ({
          id: m.id,
          team1Players: m.team1_players,
          team2Players: m.team2_players,
          sortOrder: m.sort_order,
          scores: scoresByMatch[m.id] ?? {},
        })),
    })),
  }
}

export async function saveScore(
  pool: Pool,
  tournament: TournamentRow,
  params: Record<string, string | undefined>,
): Promise<{ success: boolean; error?: string }> {
  const matchId = params.matchId?.trim()
  const hole = parseInt(params.hole ?? '', 10)
  const side = params.side
  const player = params.player?.trim()
  const grossScore = parseInt(params.grossScore ?? '', 10)

  if (!matchId || !hole || !side || !player || isNaN(grossScore)) {
    return { success: false, error: 'Missing required fields' }
  }
  if (hole < 1 || hole > 18) return { success: false, error: 'Invalid hole' }
  if (side !== 'team1' && side !== 'team2') return { success: false, error: 'Invalid side' }
  if (grossScore < 1 || grossScore > 20) return { success: false, error: 'Invalid score' }

  try {
    await pool.query(
      `insert into scores (tournament_id, match_id, hole, side, player, gross_score)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (tournament_id, match_id, hole, player)
       do update set gross_score = excluded.gross_score, side = excluded.side, updated_at = now()`,
      [tournament.id, matchId, hole, side, player, grossScore],
    )
  } catch (err) {
    // 23503 = foreign key violation: the match doesn't exist in this tournament
    if ((err as { code?: string }).code === '23503') {
      return { success: false, error: `Unknown match: ${matchId}` }
    }
    throw err
  }
  return { success: true }
}
