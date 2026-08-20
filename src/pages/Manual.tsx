import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TabNav } from '../components/TabNav'
import { OverflowMenu } from '../components/OverflowMenu'
import { useTournament } from '../hooks/useTournament'
import { useTournamentRoute } from '../lib/paths'
import { hasWagers, manualDoc } from '../lib/manual'
import { ScheduleTab } from '../components/manual/ScheduleTab'
import { RulesTab } from '../components/manual/RulesTab'
import { WagersTab } from '../components/manual/WagersTab'
import { AppTab } from '../components/manual/AppTab'
import { RosterTab } from '../components/manual/RosterTab'
import { LodgingTab } from '../components/manual/LodgingTab'
import { MANUAL_COLORS } from '../components/manual/ui'

const API_URL = import.meta.env.VITE_API_URL as string

/**
 * The tournament manual — schedule, rules, wagers, roster, lodging, and how to
 * work the app.
 *
 * It used to be one tournament's programme hard-coded as a string of HTML.
 * Now every tab is built from that tournament's own data: the parts the app
 * already knows (rounds, roster, points, payouts) are read straight from it,
 * and the parts only a person can decide come from Setup → Schedule / Rules /
 * Wagers / Lodging.
 *
 * Tabs with nothing behind them are dropped rather than shown empty, so a
 * one-day scramble gets a two-tab manual and a four-day trip gets six.
 */
export function Manual() {
  const { slug } = useTournamentRoute()
  const { data, loading, error } = useTournament(API_URL, slug)

  const doc = useMemo(() => manualDoc(data?.manual), [data?.manual])

  const tabs = useMemo(() => {
    if (!data) return []
    return [
      doc.schedule.length > 0 && { id: 'schedule', label: 'Schedule' },
      { id: 'rules', label: 'Rules' },
      (hasWagers(doc.wagers) || data.sessions.length > 0) && { id: 'wagers', label: 'Wagers' },
      { id: 'app', label: 'The App' },
      data.players.length > 0 && { id: 'roster', label: 'Roster' },
      doc.lodging.enabled && { id: 'lodging', label: 'Lodging' },
    ].filter(Boolean) as { id: string; label: string }[]
  }, [data, doc])

  const [requested, setRequested] = useState<string | null>(null)
  // The requested tab can vanish — the organiser turns off lodging, or clears
  // the schedule — so fall back rather than render a blank page.
  const active = tabs.some((t) => t.id === requested) ? (requested as string) : tabs[0]?.id

  function go(id: string) {
    setRequested(id)
    requestAnimationFrame(() => {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } catch {
        window.scrollTo(0, 0)
      }
    })
  }

  if (loading && !data) {
    return (
      <div style={{ ...PAGE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: MANUAL_COLORS.muted }}>Loading…</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ ...PAGE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <p style={{ color: MANUAL_COLORS.green, fontSize: 18 }}>Unable to load this tournament</p>
        {error && <p style={{ color: MANUAL_COLORS.red, fontSize: 13, marginTop: 6 }}>{error}</p>}
        <Link to="/" style={{ marginTop: 16, color: MANUAL_COLORS.green }}>
          See all tournaments
        </Link>
      </div>
    )
  }

  const subtitle = [doc.info.dates, doc.info.location].filter(Boolean).join(' · ')

  return (
    <div style={PAGE}>
      <header
        style={{
          position: 'relative',
          background: 'linear-gradient(170deg,#0c3324 0%,#10422f 55%,#0e3a29 100%)',
          color: '#f3ecd9',
          textAlign: 'center',
          padding: '18px 20px 16px',
          borderBottom: '2px solid rgba(239,225,78,.25)',
        }}
      >
        <div style={{ position: 'absolute', right: 8, top: 12 }}>
          <OverflowMenu />
        </div>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 700,
            color: MANUAL_COLORS.yellow,
            fontSize: 34,
            lineHeight: 1.02,
            margin: '0 32px',
            letterSpacing: '.01em',
          }}
        >
          {data.name ?? 'The Manual'}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 13, letterSpacing: '.04em', color: 'rgba(243,236,217,.78)', margin: '7px 0 0' }}>
            {subtitle}
          </p>
        )}
      </header>

      <TabNav />

      <nav
        aria-label="Manual sections"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: MANUAL_COLORS.greenDeep,
          display: 'flex',
          gap: 2,
          borderBottom: '1px solid rgba(0,0,0,.3)',
        }}
      >
        {tabs.map((t) => {
          const on = t.id === active
          return (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              style={{
                flex: '1 1 0',
                minWidth: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                fontSize: 11,
                padding: '14px 4px 12px',
                position: 'relative',
                whiteSpace: 'nowrap',
                minHeight: 44,
                color: on ? MANUAL_COLORS.yellow : 'rgba(243,236,217,.55)',
              }}
            >
              {t.label}
              {on && (
                <span
                  style={{
                    position: 'absolute',
                    left: 12,
                    right: 12,
                    bottom: 0,
                    height: 2,
                    background: MANUAL_COLORS.yellow,
                    borderRadius: 2,
                  }}
                />
              )}
            </button>
          )
        })}
      </nav>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '22px 16px 64px' }}>
        {active === 'schedule' && <ScheduleTab info={doc.info} schedule={doc.schedule} data={data} />}
        {active === 'rules' && <RulesTab rules={doc.rules} data={data} />}
        {active === 'wagers' && <WagersTab wagers={doc.wagers} data={data} />}
        {active === 'app' && <AppTab rules={doc.rules} />}
        {active === 'roster' && <RosterTab data={data} />}
        {active === 'lodging' && <LodgingTab lodging={doc.lodging} />}

        <footer
          style={{
            textAlign: 'center',
            color: MANUAL_COLORS.muted,
            fontSize: 12.5,
            padding: '8px 16px 40px',
            letterSpacing: '.04em',
          }}
        >
          {data.name}
          {doc.info.dates && ` · ${doc.info.dates}`}
        </footer>
      </main>
    </div>
  )
}

const PAGE = {
  background: MANUAL_COLORS.paper,
  minHeight: '100vh',
  color: MANUAL_COLORS.ink,
  fontFamily: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
  fontSize: 17,
  lineHeight: 1.5,
} as const
