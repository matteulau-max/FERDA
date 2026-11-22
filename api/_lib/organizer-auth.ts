import type { VercelRequest } from '@vercel/node'
import type { Pool } from 'pg'

/**
 * Organizer authorization for the new planning endpoints.
 * Server-side only: never trust a user ID, role, or email from request JSON.
 * Requires SUPABASE_URL and SUPABASE_ANON_KEY in server environment.
 * Not yet wired into legacy routes: see implementation security gate.
 */
export async function requireEventOrganizer(
  req: VercelRequest,
  pool: Pool,
  tournamentId: string,
): Promise<string> {
  const header = req.headers.authorization
  const token = typeof header === 'string' && /^Bearer\s+(.+)$/i.exec(header)?.[1]
  if (!token) throw new OrganizerAuthError(401, 'Organizer sign-in required')

  const base = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.SUPABASE_ANON_KEY
  if (!base || !key) throw new Error('Supabase Auth environment not configured')

  // Supabase Auth verifies the supplied access token; do not merely decode JWT.
  const response = await fetch(`${base}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) throw new OrganizerAuthError(401, 'Invalid or expired organizer session')
  const user = await response.json() as { id?: unknown }
  if (typeof user.id !== 'string') throw new OrganizerAuthError(401, 'Invalid organizer session')

  const membership = await pool.query(
    'select 1 from public.event_organizers where tournament_id = $1 and user_id = $2 limit 1',
    [tournamentId, user.id],
  )
  if (membership.rowCount !== 1) throw new OrganizerAuthError(403, 'Not an organizer of this event')
  return user.id
}

export class OrganizerAuthError extends Error {
  constructor(public readonly status: 401 | 403, message: string) {
    super(message)
    this.name = 'OrganizerAuthError'
  }
}
