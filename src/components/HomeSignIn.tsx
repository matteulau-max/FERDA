import { useState } from 'react'
import { authConfig, redirectHome, saveFerdaSession, useFerdaSession } from '../lib/ferdaAuth'

export function HomeSignIn() {
  const session = useFerdaSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'password' | 'link' | 'signup'>('password')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  if (session) return <div className="rounded-xl bg-white border p-4 flex items-center justify-between gap-3">
    <span className="text-sm text-[#006747]">Signed in · Organizer options appear on events you manage.</span>
    <button type="button" className="text-sm underline" onClick={() => { saveFerdaSession(null); setNotice('') }}>Sign out</button>
  </div>

  function google() {
    try {
      const { base } = authConfig()
      window.location.assign(`${base}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectHome())}`)
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Google sign-in unavailable') }
  }
  async function submit() {
    setBusy(true)
    setNotice('')
    try {
      const { base, key } = authConfig()
      if (mode !== 'link' && password.length < 8) throw new Error('Enter a password of at least 8 characters.')
      const endpoint = mode === 'link'
        ? `/auth/v1/otp?redirect_to=${encodeURIComponent(redirectHome())}`
        : mode === 'signup' ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password'
      const res = await fetch(base + endpoint, {
        method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'link' ? { email, create_user: false } : { email, password }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 429) throw new Error('Sign-in email rate limit reached. Try password sign-in or wait before requesting another link.')
        throw new Error(body.error_description || body.msg || body.message || 'Sign-in failed')
      }
      if (body.access_token && body.refresh_token) {
        saveFerdaSession({ access_token: body.access_token, refresh_token: body.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + Number(body.expires_in || 3600) })
        setPassword('')
      } else {
        setNotice(mode === 'link' ? 'Check your inbox for a new Ferda sign-in link.' : 'Check your inbox to confirm your account, then sign in.')
      }
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Sign-in failed') }
    finally { setBusy(false) }
  }

  return <section className="rounded-xl bg-white border p-4 space-y-3">
    <h2 className="font-semibold text-[#006747]">Sign in to Ferda</h2>
    <p className="text-xs text-gray-600">Anyone can view published scores. Sign in to see features available to your account.</p>
    <button type="button" className="w-full border rounded-lg py-3 font-medium" onClick={google}>Continue with Google</button>
    <input type="email" autoComplete="email" aria-label="Email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded-lg p-3" />
    {mode !== 'link' && <input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} aria-label="Password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded-lg p-3" />}
    <button type="button" disabled={busy || !email.includes('@') || (mode !== 'link' && password.length < 8)} onClick={() => void submit()} className="w-full bg-[#006747] text-white rounded-lg py-3 disabled:opacity-50">{mode === 'link' ? 'Email sign-in link' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
    <div className="flex justify-between gap-2 text-sm text-[#006747]">
      <button type="button" className="underline" onClick={() => setMode(mode === 'link' ? 'password' : 'link')}>{mode === 'link' ? 'Use password' : 'Use email link'}</button>
      <button type="button" className="underline" onClick={() => setMode(mode === 'signup' ? 'password' : 'signup')}>{mode === 'signup' ? 'Have an account?' : 'Create account'}</button>
    </div>
    {notice && <p role="status" className="text-sm text-gray-700">{notice}</p>}
  </section>
}
