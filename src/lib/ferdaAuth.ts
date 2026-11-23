import { useEffect, useState } from 'react'

export type FerdaSession = { access_token: string; refresh_token: string; expires_at: number }
export const sessionKey = 'ferda-organizer-session'
const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') || ''
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || ''

export function getFerdaSession(): FerdaSession | null {
  try {
    const current = JSON.parse(sessionStorage.getItem(sessionKey) || 'null') as FerdaSession | null
    return current?.access_token && current.expires_at > Date.now() / 1000 + 30 ? current : null
  } catch { return null }
}
export function saveFerdaSession(session: FerdaSession | null) {
  if (session) sessionStorage.setItem(sessionKey, JSON.stringify(session))
  else sessionStorage.removeItem(sessionKey)
  window.dispatchEvent(new Event('ferda-auth-changed'))
}
export function consumeAuthCallback(): FerdaSession | null {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const access = hash.get('access_token')
  const refresh = hash.get('refresh_token')
  if (access && refresh && hash.get('token_type') === 'bearer') {
    const expires = Number(hash.get('expires_in') || 3600)
    const session = { access_token: access, refresh_token: refresh, expires_at: Math.floor(Date.now() / 1000) + expires }
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    saveFerdaSession(session)
    return session
  }
  return getFerdaSession()
}
export function useFerdaSession() {
  const [session, setSession] = useState<FerdaSession | null>(getFerdaSession)
  useEffect(() => {
    const changed = () => setSession(getFerdaSession())
    changed()
    window.addEventListener('ferda-auth-changed', changed)
    return () => window.removeEventListener('ferda-auth-changed', changed)
  }, [])
  return session
}
export function authConfig() {
  if (!base || !key) throw new Error('Sign-in is not configured on this deployment.')
  return { base, key }
}
export function redirectHome() { return window.location.origin + '/' }
