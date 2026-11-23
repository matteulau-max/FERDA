import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HomeSignIn } from '../components/HomeSignIn'
import { consumeAuthCallback, useFerdaSession } from '../lib/ferdaAuth'
import { avatarUrl, uploadAvatar } from '../lib/avatar'

type Profile = { full_name: string | null; phone: string | null; handicap_index: string | null; avatar_path: string | null; ghin_number: string | null }
type ProfileResponse = { email: string; userId: string; profile: Profile | null }

export function PlayerProfile() {
  const session = useFerdaSession()
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [handicap, setHandicap] = useState('')
  const [ghin, setGhin] = useState('')
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => { consumeAuthCallback() }, [])
  useEffect(() => {
    if (!session) return
    const controller = new AbortController()
    fetch('/api/profile', {
      headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store', signal: controller.signal,
    }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load profile')
      return data as ProfileResponse
    }).then(data => {
      setEmail(data.email)
      setUserId(data.userId)
      if (data.profile) {
        setName(data.profile.full_name || '')
        setPhone(data.profile.phone || '')
        setHandicap(data.profile.handicap_index == null ? '' : String(data.profile.handicap_index))
        setAvatarPath(data.profile.avatar_path)
        setGhin(data.profile.ghin_number || '')
      }
    }).catch(error => { if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : 'Could not load profile') })
    return () => controller.abort()
  }, [session])

  async function save() {
    if (!session) return
    setBusy(true)
    setNotice('')
    try {
      let nextPath: string | null = avatarPath
      if (avatarFile) nextPath = await uploadAvatar(avatarFile, session, userId)
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: name.trim(), phone: phone.trim(), handicap: Number(handicap), ghinNumber: ghin.trim(), ...(nextPath ? { avatarPath: nextPath } : {}) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save profile')
      setAvatarPath(data.profile.avatar_path)
      setAvatarFile(null)
      setNotice('Profile saved. Future event registrations will use these details automatically.')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not save profile') }
    finally { setBusy(false) }
  }

  return <div className="min-h-screen bg-[#FDF8E8] pb-12">
    <header className="bg-[#006747] text-white px-5 py-7">
      <h1 className="font-serif italic text-2xl">My Ferda profile</h1>
      <Link className="underline text-sm mt-2 inline-block" to="/">Back to tournaments</Link>
    </header>
    <main className="max-w-lg mx-auto p-4 space-y-4">
      {!session ? <HomeSignIn returnPath="/profile" /> : <section className="bg-white border rounded-xl p-5 space-y-4">
        <p className="text-sm text-gray-600">Account email: {email || 'Loading…'}</p>
        <div className="flex items-center gap-4">
          {avatarPath && avatarUrl(avatarPath) ? <img src={avatarUrl(avatarPath) || ''} alt="Current profile photo" className="w-20 h-20 rounded-full object-cover" /> :
            <div className="w-20 h-20 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-2xl" aria-hidden="true">{name.slice(0,1).toUpperCase() || '?'}</div>}
          <label className="text-sm flex-1">Profile picture (optional)
            <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose profile picture" className="block text-xs mt-2 w-full" onChange={e => setAvatarFile(e.target.files?.[0] || null)} />
            <span className="text-xs text-gray-500 block mt-1">JPG, PNG or WebP, up to 2 MB. Publicly visible where your Ferda draft-board avatar appears.</span>
          </label>
        </div>
        <label className="text-sm block">Full name
          <input value={name} onChange={e => setName(e.target.value)} maxLength={120} className="w-full mt-1 p-3 border rounded-lg" autoComplete="name" />
        </label>
        <label className="text-sm block">Phone number
          <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" maxLength={30} className="w-full mt-1 p-3 border rounded-lg" autoComplete="tel" />
        </label>
        <label className="text-sm block">Current golf handicap index
          <input value={handicap} onChange={e => setHandicap(e.target.value)} type="number" min="-10" max="54" step="0.1" className="w-full mt-1 p-3 border rounded-lg" />
        </label>
        <label className="text-sm block">GHIN number (optional)
          <input value={ghin} onChange={e => setGhin(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" maxLength={12} placeholder="Your GHIN number" className="w-full mt-1 p-3 border rounded-lg" />
        </label>
        <p className="text-xs text-gray-500">Used for organizer-assisted GHIN lookup. Ferda does not automatically verify GHIN handicaps.</p>
        <p className="text-xs text-gray-500">Updating your profile does not rewrite the handicap snapshot saved for a previous event.</p>
        <button type="button" disabled={busy || !userId || !name.trim() || !phone.trim() || handicap.trim() === ''} onClick={() => void save()} className="w-full rounded-lg bg-[#006747] text-white p-3 font-semibold disabled:opacity-50">
          {busy ? 'Saving…' : 'Save profile'}
        </button>
      </section>}
      {notice && <p role="status" className="bg-white border rounded-lg p-3 text-sm">{notice}</p>}
    </main>
  </div>
}
