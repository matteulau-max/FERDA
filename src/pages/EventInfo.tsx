import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

type ScheduleItem = { title: string; starts_at: string; ends_at: string | null; location: string | null }
type EventInfo = { name: string; publishedSections: string[]; schedule: ScheduleItem[] }

export function EventInfoPage() {
  const { slug } = useParams<{ slug: string }>()
  const [info, setInfo] = useState<EventInfo | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!slug) return
    const controller = new AbortController()
    fetch(`/api/event-info?t=${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async response => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Could not load event')
        setInfo(body as EventInfo)
      }).catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load') })
    return () => controller.abort()
  }, [slug])
  return <div className="min-h-screen bg-[#FDF8E8] pb-16">
    <header className="bg-[#006747] text-white px-5 py-8">
      <p className="text-[#FFF200] uppercase tracking-widest text-xs">Ferda Invitational · Guest guide</p>
      <h1 className="text-3xl font-serif italic mt-2">{info?.name || 'Event information'}</h1>
      <Link to={`/t/${slug}`} className="text-sm underline mt-3 inline-block">Leaderboard</Link>
    </header>
    <main className="max-w-2xl mx-auto p-4 space-y-4">
      {error && <p role="alert" className="bg-white rounded-xl border p-4">{error}</p>}
      {!info && !error && <p className="text-gray-600">Loading event information…</p>}
      {info && <>
        <section className="bg-white rounded-xl border p-5">
          <h2 className="text-xl font-semibold">Your trip guide</h2>
          <p className="text-gray-600 text-sm mt-2">This page shows only details confirmed and published by the organizers. Check back for updates.</p>
        </section>
        <section className="bg-white rounded-xl border p-5 space-y-3">
          <h2 className="text-xl font-semibold">Schedule & tee times</h2>
          {info.schedule.length === 0 ? <p className="text-sm text-gray-500">The organizers haven't published the schedule yet.</p> :
            info.schedule.map((item, index) => <div key={index} className="border-b last:border-0 pb-3">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-gray-600">{new Date(item.starts_at).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/New_York' })}</p>
              {item.location && <p className="text-sm text-gray-600">{item.location}</p>}
            </div>)}
        </section>
        <p className="text-xs text-gray-500">Private budgets, RSVP records and payment information are never displayed here.</p>
      </>}
    </main>
  </div>
}
