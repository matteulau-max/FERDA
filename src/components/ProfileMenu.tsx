import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { HomeSignIn } from './HomeSignIn'
import { avatarUrl } from '../lib/avatar'
import { saveFerdaSession, useFerdaSession } from '../lib/ferdaAuth'

type ProfileResponse = {
  email: string
  profile: { full_name: string | null; avatar_path: string | null } | null
}

/** Compact account entry point for the tournament hub. */
export function ProfileMenu() {
  const session = useFerdaSession()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!session) {
      setProfile(null)
      return
    }
    const controller = new AbortController()
    fetch('/api/profile', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error('Profile unavailable')
      return response.json() as Promise<ProfileResponse>
    }).then(setProfile).catch(() => {})
    return () => controller.abort()
  }, [session?.access_token])

  useEffect(() => {
    if (!open) return
    function closeOnOutsideClick(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const name = profile?.profile?.full_name?.trim() || ''
  const photo = profile?.profile?.avatar_path ? avatarUrl(profile.profile.avatar_path) : null
  const initials = (name || profile?.email || 'Player').slice(0, 1).toUpperCase()

  return <div className="relative z-30" ref={menuRef}>
    <button
      type="button"
      aria-label={session ? 'Open player profile menu' : 'Open sign-in menu'}
      aria-expanded={open}
      aria-haspopup="true"
      onClick={() => setOpen(value => !value)}
      className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-[#FFF200] bg-white text-[#006747] font-bold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFF200]"
    >
      {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <span aria-hidden="true">{session ? initials : '👤'}</span>}
    </button>

    {open && <div role="group" aria-label="Ferda account" className="absolute right-0 top-14 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-[#e8e5d8] bg-[#FDF8E8] p-3 text-left text-[#19271f] shadow-xl">
      {session ? <div className="space-y-1">
        <div className="px-3 py-2">
          <p className="font-semibold">{name || 'My Ferda account'}</p>
          {profile?.email && <p className="text-xs text-gray-600 break-all">{profile.email}</p>}
        </div>
        <Link to="/profile" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-semibold hover:bg-white focus-visible:bg-white">My player profile</Link>
        <Link to="/" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm hover:bg-white focus-visible:bg-white">My tournaments</Link>
        <div className="border-t border-[#e8e5d8] pt-1">
          <button type="button" className="w-full rounded-lg px-3 py-3 text-left text-sm hover:bg-white" onClick={() => { saveFerdaSession(null); setOpen(false) }}>Sign out</button>
        </div>
      </div> : <HomeSignIn />}
    </div>}
  </div>
}
