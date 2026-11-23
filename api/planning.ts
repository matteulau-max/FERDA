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
      const [tasks, invitations, registrations, schedule, expenses, payments, publications] = await Promise.all([
        pool.query('select id,title,owner_user_id,due_at,status from public.planning_tasks where tournament_id=$1 order by due_at nulls last,created_at', [tournament.id]),
        pool.query('select id,player_id,invitee_name,status from public.event_invitations where tournament_id=$1 order by invitee_name', [tournament.id]),
        pool.query('select r.id,r.full_name,r.email,r.phone,r.handicap_index,r.rsvp_status,r.updated_at,p.avatar_path from public.event_registrations r left join public.player_profiles p on p.user_id=r.user_id where r.tournament_id=$1 order by r.updated_at desc', [tournament.id]),
        pool.query('select id,title,starts_at,ends_at,location,visibility from public.event_schedule where tournament_id=$1 order by starts_at', [tournament.id]),
        pool.query('select id,category,description,estimated_cents,actual_cents,status from public.event_expenses where tournament_id=$1 order by category,description', [tournament.id]),
        pool.query('select player_id,coalesce(sum(amount_cents),0)::text as paid_cents from public.event_payments where tournament_id=$1 group by player_id', [tournament.id]),
        pool.query('select section,published_at from public.event_publications where tournament_id=$1', [tournament.id]),
      ])
      return res.status(200).json({
        tournament: { slug: tournament.slug, name: tournament.name },
        tasks: tasks.rows, invitations: invitations.rows, registrations: registrations.rows, schedule: schedule.rows,
        expenses: expenses.rows, payments: payments.rows, publications: publications.rows,
      })
    }

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>
    const str = (value: unknown, max = 240) =>
      typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null
    const uuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null
    const cents = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
    let result: { rows: Record<string, unknown>[]; rowCount: number | null }
    let action = ''
    switch (body.action) {
      case 'createTask': {
        const title = str(body.title)
        if (!title) return res.status(400).json({ error: 'Task title must be 1–240 characters' })
        result = await pool.query('insert into public.planning_tasks(tournament_id,title,owner_user_id) values($1,$2,$3) returning id,title,status', [tournament.id,title,actorId])
        action = 'planning.task.create'
        break
      }
      case 'setTaskStatus': {
        const id = uuid(body.id)
        if (!id || !['todo','doing','done'].includes(String(body.status))) return res.status(400).json({ error: 'Invalid task or status' })
        result = await pool.query('update public.planning_tasks set status=$3 where tournament_id=$1 and id=$2 returning id,title,status', [tournament.id,id,body.status])
        action = 'planning.task.status'
        break
      }
      case 'addInvitee': {
        const name = str(body.name,120)
        if (!name) return res.status(400).json({ error: 'Invitee name required' })
        result = await pool.query('insert into public.event_invitations(tournament_id,invitee_name) values($1,$2) returning id,invitee_name,status', [tournament.id,name])
        action = 'planning.invitation.create'
        break
      }
      case 'setRsvp': {
        const id = uuid(body.id)
        if (!id || !['invited','yes','no','maybe'].includes(String(body.status))) return res.status(400).json({ error: 'Invalid invitation or RSVP' })
        result = await pool.query('update public.event_invitations set status=$3 where tournament_id=$1 and id=$2 returning id,invitee_name,status', [tournament.id,id,body.status])
        action = 'planning.invitation.status'
        break
      }
      case 'addSchedule': {
        const title = str(body.title)
        const start = typeof body.startsAt === 'string' ? new Date(body.startsAt) : new Date(NaN)
        const location = body.location === '' || body.location == null ? null : str(body.location)
        if (!title || !Number.isFinite(start.getTime()) || (body.location && !location)) return res.status(400).json({ error: 'Valid title, date and location required' })
        result = await pool.query('insert into public.event_schedule(tournament_id,title,starts_at,location) values($1,$2,$3,$4) returning id,title,starts_at,location,visibility', [tournament.id,title,start.toISOString(),location])
        action = 'planning.schedule.create'
        break
      }
      case 'setScheduleVisibility': {
        const id = uuid(body.id)
        if (!id || !['draft','published'].includes(String(body.visibility))) return res.status(400).json({ error: 'Invalid schedule item or visibility' })
        result = await pool.query('update public.event_schedule set visibility=$3 where tournament_id=$1 and id=$2 returning id,title,visibility', [tournament.id,id,body.visibility])
        action = 'planning.schedule.visibility'
        break
      }
      case 'publishSchedule': {
        const enabled = body.published === true
        if (enabled) {
          result = await pool.query('insert into public.event_publications(tournament_id,section,published_by) values($1,$2,$3) on conflict(tournament_id,section) do update set published_at=now(),published_by=excluded.published_by returning section', [tournament.id,'schedule',actorId])
        } else {
          result = await pool.query('delete from public.event_publications where tournament_id=$1 and section=$2 returning section', [tournament.id,'schedule'])
          if (!result.rows[0]) return res.status(200).json({ item: { section: 'schedule', published: false } })
        }
        action = enabled ? 'planning.schedule.publish' : 'planning.schedule.unpublish'
        break
      }
      case 'addExpense': {
        const category = str(body.category,80)
        const description = str(body.description)
        const amount = cents(body.estimatedCents)
        if (!category || !description || amount === null) return res.status(400).json({ error: 'Valid category, description and estimated amount required' })
        result = await pool.query('insert into public.event_expenses(tournament_id,category,description,estimated_cents) values($1,$2,$3,$4) returning id,category,description,estimated_cents,actual_cents,status', [tournament.id,category,description,amount])
        action = 'planning.expense.create'
        break
      }
      default: return res.status(400).json({ error: 'Unknown planning action' })
    }
    if (!result.rows[0]) return res.status(404).json({ error: 'Planning item not found' })
    await pool.query('insert into public.event_audit_log(tournament_id,actor_user_id,action) values($1,$2,$3)', [tournament.id,actorId,action])
    return res.status(200).json({ item: result.rows[0], task: result.rows[0] })
  } catch (error) {
    if (error instanceof OrganizerAuthError) return res.status(error.status).json({ error: error.message })
    if (error instanceof Error && error.name === 'NotFoundError') return res.status(404).json({ error: 'Tournament not found' })
    // Do not leak database details or credentials in responses.
    console.error('Planning API failed', error instanceof Error ? error.name : 'Unknown error')
    return res.status(500).json({ error: 'Planning service unavailable' })
  }
}
