import type { Pool, PoolClient } from 'pg'
import type { TournamentRow } from './tournament'
import {
  FORMATS,
  HOLE_SETS,
  SCORINGS,
  ValidationError,
  optionalBool,
  optionalText,
  requireInt,
  requireNumber,
  requireOneOf,
  requireText,
  slugify,
  validateHoles,
  validateNoDoubleBooking,
  validatePairing,
} from './validate'

/**
 * Setup writes. Everything here runs in a transaction, because the schema
 * joins on names rather than ids (matches carry player-name arrays, sessions
 * carry a course name). Renaming therefore has to update every referencing
 * row in the same breath or the tournament breaks apart mid-edit.
 *
 * Nothing is ever locked: scoring can be underway and setup still edited,
 * which is what the organiser asked for.
 */

async function tx<T>(pool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('begin')
    const result = await fn(client)
    await client.query('commit')
    return result
  } catch (err) {
    await client.query('rollback').catch(() => {})
    throw asValidationError(err)
  } finally {
    client.release()
  }
}

/** Names are unique per tournament. Say so, rather than leaking the constraint. */
const DUPLICATE_MESSAGES: Record<string, string> = {
  sessions_tournament_id_name_key: 'A session with that name already exists. Pick a different name.',
  courses_tournament_id_name_key: 'A course with that name already exists. Pick a different name.',
  players_tournament_id_name_key: 'A player with that name already exists. Pick a different name.',
}

function asValidationError(err: unknown): unknown {
  const e = err as { code?: string; constraint?: string }
  if (e?.code === '23505') {
    const message = (e.constraint && DUPLICATE_MESSAGES[e.constraint]) ?? 'That name is already taken.'
    return new ValidationError(message)
  }
  return err
}

/** Append -2, -3, ... until the slug is free. */
async function uniqueSlug(client: PoolClient, base: string): Promise<string> {
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`
    const { rowCount } = await client.query('select 1 from tournaments where slug = $1', [candidate])
    if (!rowCount) return candidate
  }
}

export async function createTournament(
  pool: Pool,
  body: Record<string, unknown>,
): Promise<{ slug: string; name: string }> {
  const name = requireText(body.name, 'Tournament name')
  // Team names are optional at creation — the setup page fills them in.
  const team1Name = optionalText(body.team1Name, 'Team 1 name', 40) ?? 'Team 1'
  const team2Name = optionalText(body.team2Name, 'Team 2 name', 40) ?? 'Team 2'

  return tx(pool, async (client) => {
    const slug = await uniqueSlug(client, slugify(name))
    await client.query(
      'insert into tournaments (slug, name, team1_name, team2_name) values ($1, $2, $3, $4)',
      [slug, name, team1Name, team2Name],
    )
    return { slug, name }
  })
}

export async function updateTournament(
  pool: Pool,
  t: TournamentRow,
  body: Record<string, unknown>,
): Promise<{ success: true }> {
  const name = requireText(body.name ?? t.name, 'Tournament name')
  const team1Name = requireText(body.team1Name ?? t.team1_name, 'Team 1 name', 40)
  const team2Name = requireText(body.team2Name ?? t.team2_name, 'Team 2 name', 40)

  await pool.query(
    'update tournaments set name = $2, team1_name = $3, team2_name = $4 where id = $1',
    [t.id, name, team1Name, team2Name],
  )
  return { success: true }
}

// ---------------------------------------------------------------- courses

export async function saveCourse(
  pool: Pool,
  t: TournamentRow,
  body: Record<string, unknown>,
): Promise<{ success: true; name: string }> {
  const name = requireText(body.name, 'Course name', 60)
  const originalName = optionalText(body.originalName, 'Course name', 60)
  const rating = requireNumber(body.rating, 'Course rating', 55, 85)
  const slope = requireInt(body.slope, 'Slope', 55, 155)
  const par = requireInt(body.par, 'Par', 60, 80)
  const holes = validateHoles(body.holes)

  return tx(pool, async (client) => {
    const existing = originalName
      ? await client.query<{ id: string }>(
          'select id from courses where tournament_id = $1 and name = $2',
          [t.id, originalName],
        )
      : { rows: [] as { id: string }[] }

    let courseId: string
    if (existing.rows[0]) {
      courseId = existing.rows[0].id
      await client.query(
        'update courses set name = $2, rating = $3, slope = $4, par = $5 where id = $1',
        [courseId, name, rating, slope, par],
      )
      if (originalName && originalName !== name) {
        // Sessions point at the course by name.
        await client.query(
          'update sessions set course_name = $3 where tournament_id = $1 and course_name = $2',
          [t.id, originalName, name],
        )
      }
      await client.query('delete from holes where course_id = $1', [courseId])
    } else {
      const inserted = await client.query<{ id: string }>(
        'insert into courses (tournament_id, name, rating, slope, par) values ($1, $2, $3, $4, $5) returning id',
        [t.id, name, rating, slope, par],
      )
      courseId = inserted.rows[0].id
    }

    for (const hole of holes) {
      await client.query(
        'insert into holes (course_id, number, par, stroke_index) values ($1, $2, $3, $4)',
        [courseId, hole.number, hole.par, hole.strokeIndex],
      )
    }
    return { success: true as const, name }
  })
}

export async function deleteCourse(
  pool: Pool,
  t: TournamentRow,
  body: Record<string, unknown>,
): Promise<{ success: true }> {
  const name = requireText(body.name, 'Course name', 60)

  return tx(pool, async (client) => {
    const { rows } = await client.query<{ name: string }>(
      'select name from sessions where tournament_id = $1 and course_name = $2',
      [t.id, name],
    )
    if (rows.length) {
      throw new ValidationError(
        `${name} is still used by: ${rows.map((r) => r.name).join(', ')}. Point those sessions at another course first.`,
      )
    }
    await client.query('delete from courses where tournament_id = $1 and name = $2', [t.id, name])
    return { success: true as const }
  })
}

// ---------------------------------------------------------------- players

export async function savePlayer(
  pool: Pool,
  t: TournamentRow,
  body: Record<string, unknown>,
): Promise<{ success: true; name: string }> {
  const name = requireText(body.name, 'Player name', 60)
  const originalName = optionalText(body.originalName, 'Player name', 60)
  const handicapIndex = requireNumber(body.handicapIndex, 'Handicap index', -10, 54)
  const team = requireInt(body.team, 'Team', 1, 2)
  const phone = optionalText(body.phone, 'Phone number', 32)

  return tx(pool, async (client) => {
    const existing = originalName
      ? await client.query('select 1 from players where tournament_id = $1 and name = $2', [t.id, originalName])
      : { rowCount: 0 }

    if (existing.rowCount) {
      await client.query(
        'update players set name = $3, handicap_index = $4, team = $5, phone = $6 where tournament_id = $1 and name = $2',
        [t.id, originalName, name, handicapIndex, team, phone],
      )
      if (originalName && originalName !== name) {
        // Matches store player names in arrays; scores store them per row.
        await client.query(
          `update matches set team1_players = array_replace(team1_players, $2, $3),
                              team2_players = array_replace(team2_players, $2, $3)
             where tournament_id = $1`,
          [t.id, originalName, name],
        )
        await client.query(
          'update scores set player = $3 where tournament_id = $1 and player = $2',
          [t.id, originalName, name],
        )
      }
    } else {
      await client.query(
        'insert into players (tournament_id, name, handicap_index, team, phone) values ($1, $2, $3, $4, $5)',
        [t.id, name, handicapIndex, team, phone],
      )
    }
    return { success: true as const, name }
  })
}

export async function deletePlayer(
  pool: Pool,
  t: TournamentRow,
  body: Record<string, unknown>,
): Promise<{ success: true }> {
  const name = requireText(body.name, 'Player name', 60)

  return tx(pool, async (client) => {
    const { rows } = await client.query<{ id: string }>(
      'select id from matches where tournament_id = $1 and ($2 = any(team1_players) or $2 = any(team2_players))',
      [t.id, name],
    )
    if (rows.length) {
      throw new ValidationError(
        `${name} is playing in ${rows.map((r) => r.id).join(', ')}. Remove them from those matches first.`,
      )
    }
    await client.query('delete from players where tournament_id = $1 and name = $2', [t.id, name])
    return { success: true as const }
  })
}

// --------------------------------------------------------------- sessions

export async function saveSession(
  pool: Pool,
  t: TournamentRow,
  body: Record<string, unknown>,
): Promise<{ success: true; name: string }> {
  const name = requireText(body.name, 'Session name', 60)
  const originalName = optionalText(body.originalName, 'Session name', 60)
  const format = requireOneOf(body.format, 'Format', FORMATS)
  const scoring = body.scoring == null || body.scoring === ''
    ? 'Match Play'
    : requireOneOf(body.scoring, 'Scoring', SCORINGS)
  const courseName = requireText(body.courseName, 'Course', 60)
  const holeSet = body.holeSet == null || body.holeSet === ''
    ? 'All 18'
    : requireOneOf(body.holeSet, 'Holes', HOLE_SETS)
  const useHandicap = optionalBool(body.useHandicap, true)
  // Only Total Stroke Play reads this, but it's stored either way so toggling
  // the scoring type back and forth doesn't lose the organiser's rate.
  const pointsPerStroke = body.pointsPerStroke == null || body.pointsPerStroke === ''
    ? 0.5
    : requireNumber(body.pointsPerStroke, 'Points per stroke', 0, 10)

  return tx(pool, async (client) => {
    const course = await client.query('select 1 from courses where tournament_id = $1 and name = $2', [t.id, courseName])
    if (!course.rowCount) throw new ValidationError(`No course named ${courseName}. Add it under Courses first.`)

    const existing = originalName
      ? await client.query<{ sort_order: number }>(
          'select sort_order from sessions where tournament_id = $1 and name = $2',
          [t.id, originalName],
        )
      : { rows: [] as { sort_order: number }[] }

    if (existing.rows[0]) {
      await client.query(
        `update sessions
            set name = $3, format = $4, scoring = $5, course_name = $6,
                hole_set = $7, use_handicap = $8, points_per_stroke = $9
          where tournament_id = $1 and name = $2`,
        [t.id, originalName, name, format, scoring, courseName, holeSet, useHandicap, pointsPerStroke],
      )
      if (originalName && originalName !== name) {
        await client.query(
          'update matches set session_name = $3 where tournament_id = $1 and session_name = $2',
          [t.id, originalName, name],
        )
      }
    } else {
      const { rows } = await client.query<{ next: number }>(
        'select coalesce(max(sort_order), 0) + 1 as next from sessions where tournament_id = $1',
        [t.id],
      )
      await client.query(
        `insert into sessions
           (tournament_id, name, format, scoring, sort_order, course_name, hole_set, use_handicap, points_per_stroke)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [t.id, name, format, scoring, rows[0].next, courseName, holeSet, useHandicap, pointsPerStroke],
      )
    }
    return { success: true as const, name }
  })
}

export async function deleteSession(
  pool: Pool,
  t: TournamentRow,
  body: Record<string, unknown>,
): Promise<{ success: true }> {
  const name = requireText(body.name, 'Session name', 60)

  return tx(pool, async (client) => {
    // Scores cascade from matches via the composite foreign key.
    await client.query('delete from matches where tournament_id = $1 and session_name = $2', [t.id, name])
    await client.query('delete from sessions where tournament_id = $1 and name = $2', [t.id, name])
    return { success: true as const }
  })
}

/** Reorder sessions to the given name order; unnamed sessions keep trailing. */
export async function reorderSessions(
  pool: Pool,
  t: TournamentRow,
  body: Record<string, unknown>,
): Promise<{ success: true }> {
  const order = Array.isArray(body.order) ? body.order.map((n) => String(n)) : []
  if (!order.length) throw new ValidationError('No session order supplied')

  return tx(pool, async (client) => {
    for (let i = 0; i < order.length; i++) {
      await client.query(
        'update sessions set sort_order = $3 where tournament_id = $1 and name = $2',
        [t.id, order[i], i + 1],
      )
    }
    return { success: true as const }
  })
}

// ---------------------------------------------------------------- matches

/** Next free human-readable id: M001, M002, ... */
async function nextMatchId(client: PoolClient, tournamentId: string): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    "select id from matches where tournament_id = $1 and id ~ '^M[0-9]+$'",
    [tournamentId],
  )
  const highest = rows.reduce((max, r) => Math.max(max, parseInt(r.id.slice(1), 10)), 0)
  return `M${String(highest + 1).padStart(3, '0')}`
}

export async function saveMatch(
  pool: Pool,
  t: TournamentRow,
  body: Record<string, unknown>,
): Promise<{ success: true; id: string }> {
  const sessionName = requireText(body.sessionName, 'Session', 60)
  const matchId = optionalText(body.id, 'Match id', 20)
  const team1Players = toNameList(body.team1Players, 'Team 1 players')
  const team2Players = toNameList(body.team2Players, 'Team 2 players')

  return tx(pool, async (client) => {
    const session = await client.query<{ format: string }>(
      'select format from sessions where tournament_id = $1 and name = $2',
      [t.id, sessionName],
    )
    if (!session.rows[0]) throw new ValidationError(`No session named ${sessionName}`)

    const roster = await client.query<{ name: string; team: 1 | 2 }>(
      'select name, team from players where tournament_id = $1',
      [t.id],
    )
    validatePairing(
      session.rows[0].format as (typeof FORMATS)[number],
      team1Players,
      team2Players,
      roster.rows,
    )

    // Check the whole session for double-booking, with this match's new lineup
    // substituted in, so an edit can't quietly duplicate a player.
    const siblings = await client.query<{ id: string; team1_players: string[]; team2_players: string[] }>(
      'select id, team1_players, team2_players from matches where tournament_id = $1 and session_name = $2',
      [t.id, sessionName],
    )
    const id = matchId ?? (await nextMatchId(client, t.id))
    const lineup = siblings.rows
      .filter((m) => m.id !== id)
      .map((m) => ({ id: m.id, team1Players: m.team1_players, team2Players: m.team2_players }))
    lineup.push({ id, team1Players, team2Players })
    validateNoDoubleBooking(lineup, id)

    const existing = await client.query('select 1 from matches where tournament_id = $1 and id = $2', [t.id, id])
    if (existing.rowCount) {
      await client.query(
        'update matches set session_name = $3, team1_players = $4, team2_players = $5 where tournament_id = $1 and id = $2',
        [t.id, id, sessionName, team1Players, team2Players],
      )
    } else {
      const { rows } = await client.query<{ next: number }>(
        'select coalesce(max(sort_order), 0) + 1 as next from matches where tournament_id = $1',
        [t.id],
      )
      await client.query(
        'insert into matches (tournament_id, id, session_name, team1_players, team2_players, sort_order) values ($1, $2, $3, $4, $5, $6)',
        [t.id, id, sessionName, team1Players, team2Players, rows[0].next],
      )
    }
    return { success: true as const, id }
  })
}

export async function deleteMatch(
  pool: Pool,
  t: TournamentRow,
  body: Record<string, unknown>,
): Promise<{ success: true }> {
  const id = requireText(body.id, 'Match id', 20)
  // Scores cascade via the composite foreign key.
  await pool.query('delete from matches where tournament_id = $1 and id = $2', [t.id, id])
  return { success: true }
}

function toNameList(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw new ValidationError(`${field} must be a list`)
  return value.map((n) => requireText(n, field, 60))
}
