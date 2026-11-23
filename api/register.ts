import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPool } from './_lib/db'
import { resolveTournament } from './_lib/tournament'
import { verifiedFerdaUser, validateProfileInput } from './_lib/verified-ferda-user'

/** One account can RSVP independently to many events. Never trusts email or user_id from the browser. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Vary', 'Authorization')
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const slug = typeof req.query.t === 'string' ? req.query.t : ''
    if (!slug) return res.status(400).json({ error: 'Tournament required' })
    const user = await verifiedFerdaUser(req)
    if (!user?.id || !user.email) return res.status(401).json({ error: 'Sign in with a verified email to RSVP' })
    const pool = getPool()
    const tournament = await resolveTournament(pool, slug)
    if (req.method === 'GET') {
      const [registration, profile] = await Promise.all([
        pool.query('select full_name,email,phone,handicap_index,rsvp_status,ghin_number_snapshot from public.event_registrations where tournament_id=$1 and user_id=$2', [tournament.id,user.id]),
        pool.query('select full_name,phone,handicap_index,avatar_path,ghin_number from public.player_profiles where user_id=$1', [user.id]),
      ])
      return res.status(200).json({
        tournament: { name: tournament.name, slug: tournament.slug },
        email: user.email, userId: user.id, registration: registration.rows[0] || null, profile: profile.rows[0] || null,
      })
    }

    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {}
    const input = validateProfileInput(body)
    if (!input || !['yes','maybe','no'].includes(String(body.status))) {
      return res.status(400).json({ error: 'Provide name, phone, valid handicap and RSVP status' })
    }
    const { name, phone, handicap } = input
    const status = body.status
    const ghin = body.ghinNumber === undefined ? undefined : typeof body.ghinNumber === 'string' ? body.ghinNumber.trim() : null
    if (ghin !== undefined && ghin !== '' && (ghin === null || !/^[0-9]{4,12}$/.test(ghin))) return res.status(400).json({ error: 'GHIN number must contain 4–12 digits' })
    // Update their reusable profile while keeping the event-specific handicap snapshot.
    await pool.query(`insert into public.player_profiles(user_id,full_name,phone,handicap_index,ghin_number)
      values($1,$2,$3,$4,$5) on conflict(user_id) do update
      set full_name=excluded.full_name,phone=excluded.phone,
      handicap_index=excluded.handicap_index,
      ghin_number=case when $6::boolean then excluded.ghin_number else public.player_profiles.ghin_number end,
      updated_at=now()`,[user.id,name,phone,handicap,ghin || null,ghin !== undefined])
    const result = await pool.query(
      `insert into public.event_registrations(tournament_id,user_id,full_name,email,phone,handicap_index,rsvp_status,ghin_number_snapshot)
       values($1,$2,$3,$4,$5,$6,$7,coalesce($8,(select ghin_number from public.player_profiles where user_id=$2)))
       on conflict (tournament_id,user_id) do update set
         full_name=excluded.full_name,email=excluded.email,phone=excluded.phone,
         rsvp_status=excluded.rsvp_status,
         ghin_number_snapshot=coalesce(excluded.ghin_number_snapshot,public.event_registrations.ghin_number_snapshot),
         ghin_checked_at=case when public.event_registrations.ghin_number_snapshot is distinct from excluded.ghin_number_snapshot and excluded.ghin_number_snapshot is not null then null else public.event_registrations.ghin_checked_at end,
         ghin_checked_index=case when public.event_registrations.ghin_number_snapshot is distinct from excluded.ghin_number_snapshot and excluded.ghin_number_snapshot is not null then null else public.event_registrations.ghin_checked_index end,
         ghin_checked_by=case when public.event_registrations.ghin_number_snapshot is distinct from excluded.ghin_number_snapshot and excluded.ghin_number_snapshot is not null then null else public.event_registrations.ghin_checked_by end,
         updated_at=now()
       returning full_name,email,phone,handicap_index,rsvp_status,ghin_number_snapshot`,
      [tournament.id, user.id, name, user.email.toLowerCase(), phone, handicap, status,ghin || null],
    )
    return res.status(200).json({ registration: result.rows[0], saved: true })
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundError') return res.status(404).json({ error: 'Tournament not found' })
    console.error('Registration failed', error instanceof Error ? error.name : 'Unknown')
    return res.status(503).json({ error: 'Registration unavailable' })
  }
}
