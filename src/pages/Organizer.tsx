import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

const PLANNING_URL = '/api/planning'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
type Task = { id: string; title: string; status: string; due_at: string | null }
type Invite = { id: string; invitee_name: string; status: string }
type Schedule = { id: string; title: string; starts_at: string; location: string | null; visibility: string }
type Expense = { id: string; description: string; estimated_cents: string; actual_cents: string | null }
type Planning = { tournament: { name: string }; tasks: Task[]; invitations: Invite[]; schedule: Schedule[]; expenses: Expense[]; payments: unknown[]; publications: { section: string; published_at: string }[] }
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
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'link'>('login')
  const [notice, setNotice] = useState('')
  const [data, setData] = useState<Planning | null>(null)
  const [task, setTask] = useState('')
  const [invitee, setInvitee] = useState('')
  const [scheduleTitle, setScheduleTitle] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('Courses')
  const [expenseAmount, setExpenseAmount] = useState('')
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
    if (!session || !slug) return
    let active = true
    fetch(`${PLANNING_URL}?t=${encodeURIComponent(slug)}`, {
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
        body: JSON.stringify({ email, create_user: true, options: { email_redirect_to: window.location.href.split('#')[0] } }),
      })
      if (!response.ok) throw new Error('Could not send sign-in link')
      setNotice('Check your email for your organizer sign-in link.')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Sign-in failed') }
    finally { setBusy(false) }
  }

  async function passwordAuth() {
    if (!SUPABASE_URL || !SUPABASE_KEY) { setNotice('Organizer sign-in is not configured yet.'); return }
    if (password.length < 8) { setNotice('Use a password of at least 8 characters.'); return }
    setBusy(true)
    try {
      const endpoint = authMode === 'signup' ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password'
      const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}${endpoint}`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.msg || body.error_description || body.message || 'Authentication failed')
      if (body.access_token && body.refresh_token) {
        const next: Session = { access_token: body.access_token, refresh_token: body.refresh_token, expires_at: Math.floor(Date.now() / 1000) + Number(body.expires_in || 3600) }
        sessionStorage.setItem(sessionKey, JSON.stringify(next))
        setSession(next)
        setPassword('')
        setNotice('')
      } else {
        setNotice('Check your email to confirm the new account, then sign in with your password.')
        setAuthMode('login')
        setPassword('')
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Authentication failed') }
    finally { setBusy(false) }
  }

  function googleSignIn() {
    if (!SUPABASE_URL || !SUPABASE_KEY) { setNotice('Organizer sign-in is not configured yet.'); return }
    const redirectTo = window.location.href.split('#')[0]
    window.location.assign(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`)
  }

  async function write(action: string, fields: Record<string, unknown>) {
    if (!session || !slug) return
    setBusy(true)
    try {
      const response = await fetch(`${PLANNING_URL}?t=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...fields }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Could not save')
      // Refresh the entire organizer view after every mutation.
      const refreshed = await fetch(`${PLANNING_URL}?t=${encodeURIComponent(slug)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store',
      })
      const next = await refreshed.json()
      if (!refreshed.ok) throw new Error(next.error || 'Could not refresh')
      setData(next as Planning)
      setNotice('')
      return true
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save')
      return false
    } finally { setBusy(false) }
  }

  async function addTask() {
    if (await write('createTask', { title: task.trim() })) setTask('')
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
        <p className="text-sm text-gray-600">Only Matt and PJ's invited accounts can access private planning information.</p>
        <button type="button" onClick={googleSignIn} className="w-full border rounded-lg px-4 py-3 font-medium">Continue with Google</button>
        <div className="text-center text-xs text-gray-500">or sign in with email and password</div>
        <input type="email" autoComplete="email" aria-label="Organizer email" value={email} onChange={event => setEmail(event.target.value)}
          placeholder="Email address" className="w-full border rounded-lg p-3" />
        {authMode !== 'link' && <input type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} aria-label="Password" value={password} onChange={event => setPassword(event.target.value)}
          placeholder="Password (8+ characters)" className="w-full border rounded-lg p-3" />}
        {authMode === 'link'
          ? <button disabled={busy || !email.includes('@')} onClick={signIn} className="bg-[#006747] text-white rounded-lg px-4 py-3 disabled:opacity-50 w-full">Email me a sign-in link</button>
          : <button disabled={busy || !email.includes('@') || password.length < 8} onClick={passwordAuth} className="bg-[#006747] text-white rounded-lg px-4 py-3 disabled:opacity-50 w-full">{authMode === 'signup' ? 'Create password account' : 'Sign in'}</button>}
        <div className="flex flex-wrap gap-3 text-sm text-[#006747]">
          <button type="button" className="underline" onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}>{authMode === 'signup' ? 'Already have an account?' : 'Create account'}</button>
          <button type="button" className="underline" onClick={() => setAuthMode(authMode === 'link' ? 'login' : 'link')}>{authMode === 'link' ? 'Use password' : 'Use email link instead'}</button>
        </div>
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
            {data.tasks.map(item => <div key={item.id} className="flex justify-between items-center gap-2 border-b pb-2"><span className="text-sm">{item.title}</span><select aria-label={`Status for ${item.title}`} value={item.status} disabled={busy} onChange={event => void write('setTaskStatus', { id: item.id, status: event.target.value })} className="text-sm border rounded p-2"><option value="todo">To do</option><option value="doing">Doing</option><option value="done">Done</option></select></div>)}
            <div className="flex gap-2"><input aria-label="New task" value={task} onChange={event => setTask(event.target.value)}
              placeholder="e.g. Confirm courses" className="border rounded-lg p-3 min-w-0 flex-1" />
              <button disabled={busy || !task.trim()} onClick={addTask} className="bg-[#006747] text-white px-4 rounded-lg disabled:opacity-50">Add</button></div>
          </section>
          <section className="bg-white rounded-xl p-4 border space-y-2">
            <h2 className="font-semibold text-lg">Attendees</h2>
            {data.invitations.length === 0 ? <p className="text-sm text-gray-500">No invitations yet.</p> :
              data.invitations.map(item => <div key={item.id} className="flex items-center justify-between gap-2"><span className="text-sm">{item.invitee_name}</span><select aria-label={`RSVP for ${item.invitee_name}`} value={item.status} disabled={busy} onChange={event => void write('setRsvp', { id: item.id, status: event.target.value })} className="text-sm border rounded p-2"><option value="invited">Invited</option><option value="yes">Going</option><option value="maybe">Maybe</option><option value="no">Not going</option></select></div>)}
            <div className="flex gap-2"><input aria-label="Invitee name" placeholder="Add attendee" value={invitee} onChange={e => setInvitee(e.target.value)} className="border rounded-lg p-3 min-w-0 flex-1" /><button disabled={busy || !invitee.trim()} onClick={async () => { if (await write('addInvitee', { name: invitee })) setInvitee('') }} className="bg-[#006747] text-white px-4 rounded-lg disabled:opacity-50">Add</button></div>
          </section>
          <section className="bg-white rounded-xl p-4 border space-y-2">
            <div className="flex justify-between items-center gap-2"><h2 className="font-semibold text-lg">Itinerary</h2><Link to={`/t/${slug}/info`} className="text-sm underline text-[#006747]">Guest view</Link></div>
            <div className="flex items-center justify-between gap-3 bg-[#FDF8E8] p-3 rounded-lg"><div><p className="text-sm font-medium">Publish schedule to guests</p><p className="text-xs text-gray-600">Only items marked Public will appear.</p></div><input type="checkbox" aria-label="Publish schedule to guests" checked={data.publications.some(p => p.section === 'schedule')} disabled={busy} onChange={e => void write('publishSchedule', { published: e.target.checked })} className="w-5 h-5" /></div>
            {data.schedule.length === 0 ? <p className="text-sm text-gray-500">No itinerary items yet.</p> :
              data.schedule.map(item => <div key={item.id} className="flex items-center justify-between gap-2 border-b pb-2"><div><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-gray-500">{new Date(item.starts_at).toLocaleString()}</p></div><select aria-label={`Visibility for ${item.title}`} value={item.visibility} disabled={busy} onChange={e => void write('setScheduleVisibility', { id: item.id, visibility: e.target.value })} className="border rounded p-2 text-sm"><option value="draft">Draft</option><option value="published">Public</option></select></div>)}
            <input aria-label="Schedule title" placeholder="Event or tee time" value={scheduleTitle} onChange={e => setScheduleTitle(e.target.value)} className="border rounded-lg p-3 w-full" />
            <input aria-label="Schedule date and time" type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="border rounded-lg p-3 w-full" />
            <button disabled={busy || !scheduleTitle.trim() || !scheduleDate} onClick={async () => { if (await write('addSchedule', { title: scheduleTitle, startsAt: new Date(scheduleDate).toISOString() })) { setScheduleTitle(''); setScheduleDate('') } }} className="bg-[#006747] text-white px-4 py-2 rounded-lg disabled:opacity-50">Add itinerary item</button>
          </section>
          <section className="bg-white rounded-xl p-4 border">
            <h2 className="font-semibold text-lg">Budget overview</h2>
            <p className="text-sm text-gray-600 mt-2">Estimated: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.expenses.reduce((sum, item) => sum + Number(item.estimated_cents) / 100, 0))}</p>
            {data.expenses.map(item => <p key={item.id} className="text-sm">{item.description} · {(Number(item.estimated_cents) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>)}
            <div className="grid grid-cols-2 gap-2"><input aria-label="Expense category" value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} placeholder="Category" className="border rounded-lg p-3" /><input aria-label="Estimated cost in dollars" type="number" min="0" step="0.01" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="USD" className="border rounded-lg p-3" /></div>
            <input aria-label="Expense description" value={expenseDescription} onChange={e => setExpenseDescription(e.target.value)} placeholder="Expense description" className="border rounded-lg p-3 w-full" />
            <button disabled={busy || !expenseDescription.trim() || !expenseCategory.trim() || !expenseAmount || !Number.isSafeInteger(Math.round(Number(expenseAmount) * 100)) || Number(expenseAmount) < 0} onClick={async () => { if (await write('addExpense', { category: expenseCategory, description: expenseDescription, estimatedCents: Math.round(Number(expenseAmount) * 100) })) { setExpenseDescription(''); setExpenseAmount('') } }} className="bg-[#006747] text-white px-4 py-2 rounded-lg disabled:opacity-50">Add budget item</button>
            <p className="text-xs text-gray-500 mt-2">Detailed allocations and payment reconciliation are coming next.</p>
          </section>
        </> : <p className="text-sm text-gray-500">Loading organizer workspace…</p>}
      </>}
    </main>
  </div>
}
