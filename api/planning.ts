import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPool } from './_lib/db'
import { resolveTournament } from './_lib/tournament'
import { OrganizerAuthError, requireEventOrganizer } from './_lib/organizer-auth'

/**
 * Private 2027 planning API. Unlike the legacy scoring endpoint, every
 * operation (including reads) requires a verified event organizer.
 * Deploy only after the reviewed planning migration is applied.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Vary', 'Authorization')
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const slug = typeof req.query.t === 'string' ? req.query.t : ''
    if (!slug) return res.status(400).json({ error: 'Tournament slug required' })
    const pool = getPool()
    const tournament = await resolveTournament(pool, slug)
    const actorId = await requireEventOrganizer(req, pool, tournament.id)

    if (req.method === 'GET') {
      const [tasks, invitations, schedule, expenses, payments] = await Promise.all([
        pool.query('select id,title,owner_user_id,due_at,status from public.planning_tasks where tournament_id=$1 order by due_at nulls last,created_at', [tournament.id]),
        pool.query('select id,player_id,invitee_name,status from public.event_invitations where tournament_id=$1 order by invitee_name', [tournament.id]),
        pool.query('select id,title,starts_at,ends_at,location,visibility from public.event_schedule where tournament_id=$1 order by starts_at', [tournament.id]),
        pool.query('select id,category,description,estimated_cents,actual_cents,status from public.event_expenses where tournament_id=$1 order by category,description', [tournament.id]),
        pool.query('select player_id,coalesce(sum(amount_cents),0)::text as paid_cents from public.event_payments where tournament_id=$1 group by player_id', [tournament.id]),
      ])
      return res.status(200).json({
        tournament: { slug: tournament.slug, name: tournament.name },
        tasks: tasks.rows, invitations: invitations.rows, schedule: schedule.rows,
        expenses: expenses.rows, payments: payments.rows,
      })
    }

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>
    if (body.action !== 'createTask') return res.status(400).json({ error: 'Unknown planning action' })
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title || title.length > 240) return res.status(400).json({ error: 'Task title must be 1–240 characters' })
    const result = await pool.query(
      'insert into public.planning_tasks(tournament_id,title,owner_user_id) values($1,$2,$3) returning id,title,status',
      [tournament.id, title, actorId],
    )
    await pool.query(
      'insert into public.event_audit_log(tournament_id,actor_user_id,action) values($1,$2,$3)',
      [tournament.id, actorId, 'planning.task.create'],
    )
    return res.status(201).json({ task: result.rows[0] })
  } catch (error) {
    if (error instanceof OrganizerAuthError) return res.status(error.status).json({ error: error.message })
    if (error instanceof Error && error.name === 'NotFoundError') return res.status(404).json({ error: 'Tournament not found' })
    // Do not leak database details or credentials in responses.
    console.error('Planning API failed', error instanceof Error ? error.name : 'Unknown error')
    return res.status(500).json({ error: 'Planning service unavailable' })
  }
}
