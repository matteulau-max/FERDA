import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPool } from './_lib/db'
import { getTournament, resolveTournament, saveScore } from './_lib/tournament'

/**
 * /api/exec — the app's single API endpoint, Postgres-backed.
 *
 * Keeps the query-string contract the frontend has always used:
 *   ?action=getTournament            → full TournamentData JSON
 *   ?action=saveScore&matchId=...    → { success, error? }
 *
 * An optional ?t=<slug> selects the tournament; without it the handler
 * falls back to DEFAULT_TOURNAMENT_SLUG, then to the sole tournament.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const query = req.query as Record<string, string | undefined>
  const action = query.action

  try {
    const pool = getPool()
    const tournament = await resolveTournament(pool, query.t)

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

    return res.status(400).json({ error: `Unknown action: ${action}` })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
}
