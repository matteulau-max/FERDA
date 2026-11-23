import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPool } from './_lib/db'
import { resolveTournament } from './_lib/tournament'
import { OrganizerAuthError, requireEventOrganizer } from './_lib/organizer-auth'

const numeric = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= -10 &&
  value <= 54 && Number.isInteger(value * 10)
const uuid = (value: unknown) => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

/** Organizer-assisted review only. No automated GHIN lookup or authorization is implied. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Vary', 'Authorization')
  if (!['GET','POST'].includes(req.method || '')) return res.status(405).json({ error: 'Method not allowed' })
  try {
    const slug = typeof req.query.t === 'string' ? req.query.t : ''
    if (!slug) return res.status(400).json({ error: 'Tournament slug required' })
    const pool = getPool()
    const tournament = await resolveTournament(pool, slug)
    const organizerId = await requireEventOrganizer(req, pool, tournament.id)
    if (req.method === 'GET') {
      const [registrations, lock, snapshots] = await Promise.all([
        pool.query(`select r.id,r.full_name,r.handicap_index,r.rsvp_status,
                   coalesce(r.ghin_number_snapshot,p.ghin_number) as ghin_number,
                   r.ghin_checked_index,r.ghin_checked_at,r.ghin_check_source,
                   r.ghin_checked_by
                   from public.event_registrations r
                   left join public.player_profiles p on p.user_id=r.user_id
                   where r.tournament_id=$1 order by r.full_name`,[tournament.id]),
        pool.query('select locked_at from public.event_handicap_locks where tournament_id=$1',[tournament.id]),
        pool.query('select registration_id,final_handicap_index,review_source from public.event_locked_handicaps where tournament_id=$1',[tournament.id]),
      ])
      return res.status(200).json({ registrations: registrations.rows, lockedAt: lock.rows[0]?.locked_at || null, lockedHandicaps: snapshots.rows })
    }
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {}
    if (!['review','lock'].includes(String(body.action))) return res.status(400).json({ error: 'Invalid action' })
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      // Serialize organizer reviews, locking, and event-specific lock decisions.
      await client.query('select pg_advisory_xact_lock(hashtext($1))',[tournament.id])
      const locked = await client.query('select locked_at from public.event_handicap_locks where tournament_id=$1',[tournament.id])
      if (locked.rowCount) {
        await client.query('ROLLBACK')
        return res.status(409).json({ error: 'Handicaps have already been locked for this tournament' })
      }
      if (body.action === 'review') {
        if (!uuid(body.registrationId) || !numeric(body.reviewedIndex) ||
            !['organizer_ghin_lookup','organizer_manual'].includes(String(body.source))) {
          await client.query('ROLLBACK')
          return res.status(400).json({ error: 'Choose a registration, reviewed index, and manual review method' })
        }
        const row = await client.query(`update public.event_registrations
          set ghin_checked_index=$3,ghin_checked_at=now(),ghin_checked_by=$4,
              ghin_check_source=$5
          where tournament_id=$1 and id=$2 and rsvp_status='yes'
          returning id,handicap_index,ghin_checked_index,ghin_checked_at,ghin_check_source`,
          [tournament.id,body.registrationId,body.reviewedIndex,organizerId,body.source])
        if (!row.rowCount) {
          await client.query('ROLLBACK')
          return res.status(404).json({ error: 'Going registration not found' })
        }
        await client.query('insert into public.event_audit_log(tournament_id,actor_user_id,action) values($1,$2,$3)',[tournament.id,organizerId,'handicap.manual_review'])
        await client.query('COMMIT')
        return res.status(200).json({ reviewed: row.rows[0] })
      }
      const pending = await client.query(`select id,full_name from public.event_registrations
        where tournament_id=$1 and rsvp_status='yes' and
        (ghin_checked_at is null or ghin_checked_index is null or ghin_check_source not in ('organizer_ghin_lookup','organizer_manual'))`,[tournament.id])
      const count = await client.query('select count(*)::int as n from public.event_registrations where tournament_id=$1 and rsvp_status=$2',[tournament.id,'yes'])
      if (count.rows[0].n === 0 || pending.rowCount) {
        await client.query('ROLLBACK')
        return res.status(409).json({ error: count.rows[0].n === 0 ? 'No confirmed attendees to lock' : `${pending.rowCount} confirmed attendee(s) still need organizer review` })
      }
      await client.query('insert into public.event_handicap_locks(tournament_id,locked_by) values($1,$2)',[tournament.id,organizerId])
      const records = await client.query(`insert into public.event_locked_handicaps
        (tournament_id,registration_id,player_name,ghin_number,submitted_handicap_index,final_handicap_index,review_source)
        select r.tournament_id,r.id,r.full_name,coalesce(r.ghin_number_snapshot,p.ghin_number),
          r.handicap_index,r.ghin_checked_index,r.ghin_check_source
        from public.event_registrations r
        left join public.player_profiles p on p.user_id=r.user_id
        where r.tournament_id=$1 and r.rsvp_status='yes' returning registration_id`,[tournament.id])
      await client.query('insert into public.event_audit_log(tournament_id,actor_user_id,action) values($1,$2,$3)',[tournament.id,organizerId,'handicap.lock'])
      await client.query('COMMIT')
      return res.status(200).json({ locked: true, count: records.rowCount })
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally { client.release() }
  } catch (error) {
    if (error instanceof OrganizerAuthError) return res.status(error.status).json({ error: error.message })
    if (error instanceof Error && error.name === 'NotFoundError') return res.status(404).json({ error: 'Tournament not found' })
    console.error('Handicap review failed', error instanceof Error ? error.name : 'Unknown')
    return res.status(503).json({ error: 'Handicap review service unavailable' })
  }
}
