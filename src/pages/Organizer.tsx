import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL as string
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
type Task = { id: string; title: string; status: string; due_at: string | null }
type Invite = { id: string; invitee_name: string; status: string }
type Schedule = { id: string; title: string; starts_at: string; location: string | null }
type Expense = { id: string; description: string; estimated_cents: string; actual_cents: string | null }
type Planning = { tournament: { name: string }; tasks: Task[]; invitations: Invite[]; schedule: Schedule[]; expenses: Expense[]; payments: unknown[] }
type Session = { access_token: string; refresh_token: string; expires_at: number }
const sessionKey = 'ferda-organizer-session'

function loadSession(): Session | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(sessionKey) || 'null') as Session | null
    return parsed && parsed.expires_at > Date.now() / 1000 + 30 ? parsed : null
  } catch { return null }
}

export function Organizer() {
  const { slug } = useParams<{ slug: string }>()
  const [session, setSession] = useState<Session | null>(loadSession)
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')
  const [data, setData] = useState<Planning | null>(null)
  const [task, setTask] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // Supabase magic-link redirects return a session in the URL fragment.
    // Consume it immediately so tokens do not remain in the address bar.
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const access = hash.get('access_token')
    const refresh = hash.get('refresh_token')
    if (access && refresh && hash.get('token_type') === 'bearer') {
      const expires = Number(hash.get('expires_in') || 3600)
      const next = { access_token: access, refresh_token: refresh, expires_at: Math.floor(Date.now() / 1000) + expires }
      sessionStorage.setItem(sessionKey, JSON.stringify(next))
      setSession(next)
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  useEffect(() => {
    if (!session || !slug || !API_URL) return
    let active = true
    fetch(`${API_URL.replace(/\/exec(?:\?.*)?$/, '')}/planning?t=${encodeURIComponent(slug)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store',
    }).then(async response => {
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to load organizer data')
      return body as Planning
    }).then(result => { if (active) { setData(result); setNotice('') } })
      .catch(error => { if (active) setNotice(error instanceof Error ? error.message : 'Unable to load') })
    return () => { active = false }
  }, [session, slug])

  async function signIn() {
    if (!SUPABASE_URL || !SUPABASE_KEY) { setNotice('Organizer sign-in is not configured yet.'); return }
    setBusy(true)
    try {
      const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/otp`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, create_user: false, options: { email_redirect_to: window.location.href.split('#')[0] } }),
      })
      if (!response.ok) throw new Error('Could not send sign-in link')
      setNotice('Check your email for your organizer sign-in link.')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Sign-in failed') }
    finally { setBusy(false) }
  }

  async function addTask() {
    if (!session || !slug || !task.trim()) return
    setBusy(true)
    try {
      const response = await fetch(`${API_URL.replace(/\/exec(?:\?.*)?$/, '')}/planning?t=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createTask', title: task.trim() }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Could not add task')
      setData(previous => previous ? { ...previous, tasks: [...previous.tasks, body.task] } : previous)
      setTask('')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not add task') }
    finally { setBusy(false) }
  }

  return <div className="min-h-screen bg-[#FDF8E8] pb-16">
    <header className="bg-[#006747] text-white px-5 py-6">
      <p className="text-xs uppercase tracking-widest text-[#FFF200]">Ferda Invitational · Organizers</p>
      <h1 className="font-serif italic text-2xl mt-1">{data?.tournament.name || 'Event planning'}</h1>
      <Link to={`/t/${slug}`} className="text-sm underline mt-2 inline-block">Back to leaderboard</Link>
    </header>
    <main className="max-w-3xl mx-auto p-4 space-y-5">
      {notice && <p role="status" className="bg-white rounded-lg border p-3 text-sm">{notice}</p>}
      {!session ? <section className="bg-white rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-lg">Organizer sign-in</h2>
        <p className="text-sm text-gray-600">Only invited organizers can access planning and payment information.</p>
        <input type="email" aria-label="Organizer email" value={email} onChange={event => setEmail(event.target.value)}
          placeholder="Email address" className="w-full border rounded-lg p-3" />
        <button disabled={busy || !email.includes('@')} onClick={signIn} className="bg-[#006747] text-white rounded-lg px-4 py-3 disabled:opacity-50">Email me a sign-in link</button>
      </section> : <>
        <div className="flex justify-end"><button className="text-sm underline" onClick={() => { sessionStorage.removeItem(sessionKey); setSession(null); setData(null) }}>Sign out</button></div>
        {data ? <>
          <div className="grid grid-cols-2 gap-3">
            {([['RSVPs', data.invitations.length], ['Tasks', data.tasks.length], ['Schedule items', data.schedule.length], ['Expenses', data.expenses.length]] as const).map(([label, count]) =>
              <div key={label} className="bg-white rounded-xl p-4 border"><p className="text-2xl font-bold text-[#006747]">{count}</p><p className="text-sm text-gray-600">{label}</p></div>)}
          </div>
          <section className="bg-white rounded-xl p-4 border space-y-3">
            <h2 className="font-semibold text-lg">Planning tasks</h2>
            {data.tasks.length === 0 && <p className="text-sm text-gray-500">No tasks yet. Add the first planning item.</p>}
            {data.tasks.map(item => <p key={item.id} className="text-sm border-b pb-2">{item.title} <span className="text-gray-500">· {item.status}</span></p>)}
            <div className="flex gap-2"><input aria-label="New task" value={task} onChange={event => setTask(event.target.value)}
              placeholder="e.g. Confirm courses" className="border rounded-lg p-3 min-w-0 flex-1" />
              <button disabled={busy || !task.trim()} onClick={addTask} className="bg-[#006747] text-white px-4 rounded-lg disabled:opacity-50">Add</button></div>
          </section>
          <section className="bg-white rounded-xl p-4 border space-y-2">
            <h2 className="font-semibold text-lg">Attendees</h2>
            {data.invitations.length === 0 ? <p className="text-sm text-gray-500">No invitations yet.</p> :
              data.invitations.map(item => <p key={item.id} className="text-sm">{item.invitee_name} · {item.status}</p>)}
          </section>
          <section className="bg-white rounded-xl p-4 border space-y-2">
            <h2 className="font-semibold text-lg">Itinerary</h2>
            {data.schedule.length === 0 ? <p className="text-sm text-gray-500">No itinerary items yet.</p> :
              data.schedule.map(item => <p key={item.id} className="text-sm">{item.title} · {new Date(item.starts_at).toLocaleString()}</p>)}
          </section>
          <section className="bg-white rounded-xl p-4 border">
            <h2 className="font-semibold text-lg">Budget overview</h2>
            <p className="text-sm text-gray-600 mt-2">Estimated: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.expenses.reduce((sum, item) => sum + Number(item.estimated_cents) / 100, 0))}</p>
            <p className="text-xs text-gray-500 mt-2">Detailed allocations and payment reconciliation are coming next.</p>
          </section>
        </> : <p className="text-sm text-gray-500">Loading organizer workspace…</p>}
      </>}
    </main>
  </div>
}
