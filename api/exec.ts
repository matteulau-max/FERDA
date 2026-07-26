import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPool } from './_lib/db'
import { getTournament, resolveTournament, saveScore } from './_lib/tournament'
import { ValidationError } from './_lib/validate'
import {
  createTournament,
  deleteCourse,
  deleteMatch,
  deletePlayer,
  deleteSession,
  reorderSessions,
  saveCourse,
  saveMatch,
  savePlayer,
  saveSession,
  updateTournament,
} from './_lib/setup'

/**
 * /api/exec — the app's single API endpoint, Postgres-backed.
 *
 * Reads keep the query-string contract the frontend has always used:
 *   ?action=getTournament            → full TournamentData JSON
 *   ?action=saveScore&matchId=...    → { success, error? }
 *
 * Setup writes are POSTs carrying a JSON body: { action, ...fields }.
 * An optional ?t=<slug> selects the tournament; without it the handler
 * falls back to DEFAULT_TOURNAMENT_SLUG, then to the sole tournament.
 */

/** Writes that operate on an existing tournament. */
const WRITE_ACTIONS = {
  updateTournament,
  saveCourse,
  deleteCourse,
  savePlayer,
  deletePlayer,
  saveSession,
  deleteSession,
  reorderSessions,
  saveMatch,
  deleteMatch,
} as const

type WriteAction = keyof typeof WRITE_ACTIONS

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const query = req.query as Record<string, string | undefined>
  const body = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>
  const action = (typeof body.action === 'string' ? body.action : query.action) ?? ''

  try {
    const pool = getPool()

    // Creating a tournament is the one action with nothing to resolve yet.
    if (action === 'createTournament') {
      requirePost(req)
      const result = await createTournament(pool, body)
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ success: true, ...result })
    }

    const tournament = await resolveTournament(pool, query.t ?? (body.t as string | undefined))

    if (action === 'getTournament') {
      const data = await getTournament(pool, tournament)
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=5')
      return res.status(200).json(data)
    }

    if (action === 'saveScore') {
      const result = await saveScore(pool, tournament, query)
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json(result)
    }

    if (action in WRITE_ACTIONS) {
      requirePost(req)
      const result = await WRITE_ACTIONS[action as WriteAction](pool, tournament, body)
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json(result)
    }

    return res.status(400).json({ error: `Unknown action: ${action}` })
  } catch (err) {
    // Validation failures are the caller's fault and carry a message meant
    // for the organiser; everything else is a genuine 500.
    if (err instanceof ValidationError) {
      return res.status(400).json({ success: false, error: err.message })
    }
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ success: false, error: message })
  }
}

function requirePost(req: VercelRequest): void {
  if (req.method !== 'POST') throw new ValidationError('This action requires POST')
}
