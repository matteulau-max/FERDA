import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { HomeSignIn } from '../components/HomeSignIn'
import { consumeAuthCallback, useFerdaSession } from '../lib/ferdaAuth'
import { avatarUrl, uploadAvatar } from '../lib/avatar'

type Registration = { full_name: string; email: string; phone: string; handicap_index: string; rsvp_status: string }
type Profile = { full_name: string; phone: string; handicap_index: string; avatar_path: string | null }
type Response = { tournament: { name: string; slug: string }; email: string; userId: string; registration: Registration | null; profile: Profile | null }

export function EventRegistration() {
  const { slug } = useParams<{ slug: string }>()
  const session = useFerdaSession()
  const [eventName, setEventName] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [handicap, setHandicap] = useState('')
  const [status, setStatus] = useState<'yes' | 'maybe' | 'no'>('yes')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [saved, setSaved] = useState(false)
  const [eventHandicap, setEventHandicap] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => { consumeAuthCallback() }, [])
  useEffect(() => {
    if (!slug || !session) return
    let alive = true
    setLoading(true)
    fetch(`/api/register?t=${encodeURIComponent(slug)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store',
    }).then(async response => {
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Could not load registration')
      return body as Response
    }).then(data => {
      if (!alive) return
      setEventName(data.tournament.name)
      setEmail(data.email)
      setUserId(data.userId)
      if (data.profile) {
        setName(data.profile.full_name || '')
        setPhone(data.profile.phone || '')
        setHandicap(data.profile.handicap_index == null ? '' : String(data.profile.handicap_index))
        setAvatarPath(data.profile.avatar_path)
      }
      if (data.registration) {
        if (!data.profile?.full_name) setName(data.registration.full_name)
        if (!data.profile?.phone) setPhone(data.registration.phone)
        if (data.profile?.handicap_index == null) setHandicap(String(data.registration.handicap_index))
        setEventHandicap(String(data.registration.handicap_index))
        setStatus(data.registration.rsvp_status as 'yes' | 'maybe' | 'no')
        setSaved(true)
      }
      setNotice('')
    }).catch(error => { if (alive) setNotice(error instanceof Error ? error.message : 'Registration unavailable') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [session, slug])

  async function save() {
    if (!slug || !session) return
    setLoading(true)
    try {
      const response = await fetch(`/api/register?t=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: name.trim(), phone: phone.trim(), handicap: Number(handicap), status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save RSVP')
      if (!eventHandicap) setEventHandicap(String(data.registration.handicap_index))
      if (avatarFile) {
        const path = await uploadAvatar(avatarFile, session, userId)
        const profileResponse = await fetch('/api/profile', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName: name.trim(), phone: phone.trim(), handicap: Number(handicap), avatarPath: path }),
        })
        const profileResult = await profileResponse.json()
        if (!profileResponse.ok) throw new Error(profileResult.error || 'Photo uploaded, but profile update failed')
        setAvatarPath(path)
        setAvatarFile(null)
      }
      setSaved(true)
      setNotice('Your RSVP is saved. You can return to this link to make changes.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save RSVP')
    } finally { setLoading(false) }
  }

  return <div className="min-h-screen bg-[#FDF8E8]">
    <header className="bg-[#006747] text-white px-5 py-7">
      <p className="text-xs uppercase tracking-widest text-[#FFF200]">Ferda Invitational · Registration</p>
      <h1 className="font-serif italic text-2xl mt-2">{eventName || 'Join this tournament'}</h1>
      <Link to="/" className="text-sm underline mt-3 inline-block">All tournaments</Link>
    </header>
    <main className="max-w-lg mx-auto p-4 space-y-4">
      <p className="text-sm text-gray-600">Sign in or create a Ferda account, then RSVP for this event. Your registration is separate from team selection and scoring.</p>
      {!session ? <HomeSignIn returnPath={`/t/${slug}/register`} /> : <section className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="text-lg font-semibold">{saved ? 'Update your RSVP' : 'RSVP for this event'}</h2>
        <p className="text-xs text-gray-600">Signed in as {email || 'your verified account'}</p>
        <label className="block text-sm font-medium">Full name
          <input value={name} onChange={e => setName(e.target.value)} maxLength={120} autoComplete="name" className="mt-1 w-full border rounded-lg p-3" />
        </label>
        <label className="block text-sm font-medium">Phone number
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" maxLength={30} className="mt-1 w-full border rounded-lg p-3" />
        </label>
        <label className="block text-sm font-medium">Golf handicap index
          <input type="number" step="0.1" min="-10" max="54" value={handicap} onChange={e => setHandicap(e.target.value)} placeholder="e.g. 18.2" className="mt-1 w-full border rounded-lg p-3" />
        </label>
        {eventHandicap && <p className="text-xs text-gray-600">Event handicap snapshot: {eventHandicap}. Updating your profile does not rewrite this event’s recorded handicap.</p>}
        <div className="space-y-2">
          <p className="text-sm font-medium">Profile picture (optional)</p>
          <div className="flex items-center gap-3">
            {avatarPath && avatarUrl(avatarPath) ? <img alt="Your current avatar" src={avatarUrl(avatarPath) || ''} className="w-16 h-16 rounded-full object-cover" /> :
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xl" aria-hidden="true">{name.slice(0,1).toUpperCase() || '?'}</div>}
            <input aria-label="Upload profile picture" type="file" accept="image/jpeg,image/png,image/webp"
              className="text-xs min-w-0 max-w-[230px]" onChange={e => setAvatarFile(e.target.files?.[0] || null)} />
          </div>
          <p className="text-xs text-gray-500">JPG, PNG or WebP up to 2 MB. Your photo may be visible on tournament draft boards.</p>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Are you coming?</legend>
          {([['yes','Going'],['maybe','Maybe'],['no','Not going']] as const).map(([value,label]) =>
            <label key={value} className="flex items-center gap-3 text-sm">
              <input type="radio" name="rsvp" checked={status === value} onChange={() => setStatus(value)} />{label}
            </label>)}
        </fieldset>
        <button type="button" onClick={() => void save()} disabled={loading || !name.trim() || !phone.trim() || handicap.trim() === ''} className="w-full bg-[#006747] text-white font-semibold rounded-lg p-3 disabled:opacity-50">
          {loading ? 'Saving…' : saved ? 'Update RSVP' : 'Submit RSVP'}
        </button>
      </section>}
      {session && <Link to="/profile" className="text-sm underline text-[#006747]">Edit your global player profile</Link>}
      {notice && <p role="status" className="rounded-lg border bg-white p-3 text-sm">{notice}</p>}
    </main>
  </div>
}
