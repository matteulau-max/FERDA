import { useState } from 'react'
import { authConfig, redirectHome, saveFerdaSession, useFerdaSession, type FerdaSession } from '../lib/ferdaAuth'

export function AccountBar() {
  const session = useFerdaSession()
  const [expanded, setExpanded] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup' | 'link'>('login')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit() {
    setBusy(true)
    setMessage('')
    try {
      const { base, key } = authConfig()
      if (mode === 'link') {
        const response = await fetch(`${base}/auth/v1/otp?redirect_to=${encodeURIComponent(redirectHome())}`, {
          method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, create_user: false }),
        })
        if (!response.ok) {
          if (response.status === 429) throw new Error('Too many emails requested. Try again later or use a password.')
          const body = await response.json().catch(() => ({}))
          throw new Error(body.msg || body.message || 'Could not send sign-in link')
        }
        setMessage('Check your email. Your new link will return to the Ferda homepage.')
        return
      }
      if (password.length < 8) throw new Error('Password must be at least 8 characters.')
      const url = mode === 'signup' ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password'
      const response = await fetch(base + url, {
        method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...(mode === 'signup' ? { options: { emailRedirectTo: redirectHome() } } : {}) }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.msg || body.error_description || body.message || 'Sign-in failed')
      if (body.access_token && body.refresh_token) {
        const next: FerdaSession = { access_token: body.access_token, refresh_token: body.refresh_token, expires_at: Math.floor(Date.now() / 1000) + Number(body.expires_in || 3600) }
        saveFerdaSession(next)
        setExpanded(false)
        setPassword('')
      } else {
        setMessage('Check your email to confirm your account, then sign in.')
        setMode('login')
        setPassword('')
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not sign in') }
    finally { setBusy(false) }
  }

  function google() {
    try {
      const { base } = authConfig()
      window.location.assign(`${base}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectHome())}`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Google sign-in unavailable') }
  }

  return <section className="rounded-xl border bg-white p-4 text-sm space-y-3">
    {session ? <div className="flex justify-between items-center gap-2">
      <span className="font-semibold text-[#006747]">Signed in to Ferda</span>
      <button className="underline" onClick={() => { saveFerdaSession(null); setMessage('Signed out.') }}>Sign out</button>
    </div> : <>
      <div className="flex justify-between items-center gap-2">
        <div><p className="font-semibold">Your Ferda account</p><p className="text-gray-500 text-xs">Sign in to access organizer controls for events you manage.</p></div>
        <button className="rounded-lg bg-[#006747] px-4 py-2 text-white font-semibold" onClick={() => setExpanded(v => !v)}>{expanded ? 'Close' : 'Sign in'}</button>
      </div>
      {expanded && <div className="space-y-2">
        <button className="w-full rounded-lg border p-3 font-semibold" onClick={google}>Continue with Google</button>
        <input type="email" aria-label="Account email" autoComplete="email" className="w-full border rounded-lg p-3" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
        {mode !== 'link' && <input type="password" aria-label="Account password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className="w-full border rounded-lg p-3" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />}
        <button disabled={busy || !email.includes('@') || (mode !== 'link' && password.length < 8)} onClick={() => void submit()} className="w-full bg-[#006747] text-white rounded-lg p-3 font-semibold disabled:opacity-50">{mode === 'link' ? 'Email me a link' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        <div className="flex gap-4 text-[#006747] underline">
          <button onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Have an account?' : 'Create account'}</button>
          <button onClick={() => setMode(mode === 'link' ? 'login' : 'link')}>{mode === 'link' ? 'Use password' : 'Use email link'}</button>
        </div>
      </div>}
    </>}
    {message && <p role="status" className="text-gray-700">{message}</p>}
  </section>
}
