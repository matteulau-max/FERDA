import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPool } from './_lib/db'
import { resolveTournament } from './_lib/tournament'
import { OrganizerAuthError, requireEventOrganizer } from './_lib/organizer-auth'

/** Do not trust client-provided roles. Check each tournament on the server. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Vary', 'Authorization')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const slug = typeof req.query.t === 'string' ? req.query.t : ''
  if (!slug) return res.status(400).json({ error: 'Tournament required' })
  try {
    const pool = getPool()
    const tournament = await resolveTournament(pool, slug)
    await requireEventOrganizer(req, pool, tournament.id)
    return res.status(200).json({ organizer: true })
  } catch (error) {
    if (error instanceof OrganizerAuthError) return res.status(200).json({ organizer: false })
    if (error instanceof Error && error.name === 'NotFoundError') return res.status(404).json({ error: 'Tournament not found' })
    console.error('Organizer access check failed', error instanceof Error ? error.name : 'Unknown')
    return res.status(503).json({ error: 'Permission check unavailable' })
  }
}
