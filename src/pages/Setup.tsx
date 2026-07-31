import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTournament } from '../hooks/useTournament'
import { useTournamentRoute } from '../lib/paths'
import { TabNav } from '../components/TabNav'
import { OverflowMenu } from '../components/OverflowMenu'
import { TeamsSection } from '../components/setup/TeamsSection'
import { CoursesSection } from '../components/setup/CoursesSection'
import { PlayersSection } from '../components/setup/PlayersSection'
import { SessionsSection } from '../components/setup/SessionsSection'
import { PairingsSection } from '../components/setup/PairingsSection'

const API_URL = import.meta.env.VITE_API_URL as string

const SECTIONS = ['Teams', 'Courses', 'Players', 'Sessions', 'Pairings'] as const
type Section = (typeof SECTIONS)[number]

/**
 * Event setup. Everything here stays editable while scoring is underway —
 * a handicap typo found on Sunday should be fixable on Sunday.
 */
export function Setup() {
  const { slug } = useTournamentRoute()
  const { data, loading, error, refetch } = useTournament(API_URL, slug)
  const [section, setSection] = useState<Section>('Teams')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FDF8E8' }}>
        <p className="font-body text-gray-500">Loading…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#FDF8E8' }}>
        <p className="font-serif text-lg text-gray-600 mb-2">Unable to load tournament</p>
        {error && <p className="text-xs font-body" style={{ color: '#C41E3A' }}>{error}</p>}
        <Link to="/" className="mt-4 font-body text-sm underline" style={{ color: '#006747' }}>
          See all tournaments
        </Link>
      </div>
    )
  }

  // The mock tournament has no database row, so there is nothing to edit.
  const editableSlug = data.slug ?? slug
  if (!editableSlug) {
    return (
      <div className="min-h-screen" style={{ background: '#FDF8E8' }}>
        <Header title="Setup" />
        <div className="px-4 py-8 text-center">
          <p className="font-serif text-lg text-gray-600 mb-2">No tournament connected</p>
          <p className="text-sm text-gray-500 font-body">
            This is the sample tournament. Set <code className="bg-gray-100 px-1 rounded">VITE_API_URL</code> and
            create an event to start editing.
          </p>
        </div>
      </div>
    )
  }

  const props = { apiUrl: API_URL, slug: editableSlug, data, onSaved: refetch }

  return (
    <div className="min-h-screen pb-16" style={{ background: '#FDF8E8' }}>
      <Header title={data.name ?? 'Setup'} />

      <div className="flex gap-1 px-3 py-3 overflow-x-auto">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className="px-3 py-1.5 rounded-full font-body text-sm whitespace-nowrap border"
            style={
              section === s
                ? { background: '#006747', color: '#fff', borderColor: '#006747' }
                : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }
            }
          >
            {s}
          </button>
        ))}
      </div>

      <div className="px-3 pb-8">
        {section === 'Teams' && <TeamsSection {...props} />}
        {section === 'Courses' && <CoursesSection {...props} />}
        {section === 'Players' && <PlayersSection {...props} />}
        {section === 'Sessions' && <SessionsSection {...props} />}
        {section === 'Pairings' && <PairingsSection {...props} />}
      </div>

      <ShareLink slug={editableSlug} />
    </div>
  )
}

function Header({ title }: { title: string }) {
  return (
    <div className="sticky top-0 z-10">
      <div
        className="relative text-white text-center py-4 px-4"
        style={{ background: 'linear-gradient(135deg, #004d34 0%, #006747 100%)' }}
      >
        <div className="absolute right-2 top-3">
          <OverflowMenu />
        </div>
        <p className="text-xs uppercase tracking-widest font-body" style={{ color: '#FFF200', opacity: 0.85 }}>
          Event Setup
        </p>
        <h1 className="font-serif italic text-xl font-bold truncate px-10" style={{ color: '#FFF200' }}>
          {title}
        </h1>
      </div>
      <TabNav />
    </div>
  )
}

/**
 * With no sign-in, the link is the only way back to this tournament — so
 * it's shown here rather than buried.
 */
function ShareLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/t/${slug}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked — the URL is on screen to copy by hand
    }
  }

  return (
    <div className="px-3 pb-8">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="font-body text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">
          Tournament link
        </p>
        <p className="text-xs text-gray-500 font-body mb-2">
          Anyone with this link can view scores and enter them. Save it — there's no sign-in to recover it.
        </p>
        <p className="font-body text-sm break-all mb-3" style={{ color: '#006747' }}>{url}</p>
        <button
          onClick={copy}
          className="px-3 py-2 rounded-lg font-body text-sm font-semibold"
          style={{ background: '#006747', color: '#fff' }}
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  )
}
