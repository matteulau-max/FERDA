import { useEffect, useState, type CSSProperties } from 'react'
import type { TournamentData } from '../lib/types'
import { computePayouts, type SkillsState, type SkillWinner } from '../lib/payouts'
import { TEAM_COLORS } from '../lib/constants'

const SKILLS_KEY = 'ferda_skills_v1'

function loadSkills(): SkillsState {
  try {
    const raw = localStorage.getItem(SKILLS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SkillsState>
      return {
        longDrive: parsed.longDrive ?? null,
        closestToPin: parsed.closestToPin ?? null,
      }
    }
  } catch {
    // ignore malformed / unavailable storage
  }
  return { longDrive: null, closestToPin: null }
}

interface Props {
  data: TournamentData
}

export function LivePayouts({ data }: Props) {
  const [skills, setSkills] = useState<SkillsState>(loadSkills)

  useEffect(() => {
    try {
      localStorage.setItem(SKILLS_KEY, JSON.stringify(skills))
    } catch {
      // storage full or unavailable — ignore
    }
  }, [skills])

  const t1Name = data.teams.team1.name
  const t2Name = data.teams.team2.name
  const { players, winningTeam, teamPoints, bestGolfer } = computePayouts(data, skills)

  const ranked = [...players].sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name),
  )

  const leadLine =
    winningTeam === 0
      ? `All square · ${fmtPts(teamPoints.team1)}–${fmtPts(teamPoints.team2)}`
      : `${winningTeam === 1 ? t1Name : t2Name} leads · ${fmtPts(teamPoints.team1)}–${fmtPts(teamPoints.team2)}`

  return (
    <div style={CARD}>
      <div style={CARD_HEADER}>
        <span style={BADGE}>Live</span>
        <h2 style={CARD_TITLE}>
          Payouts So Far
          <small style={CARD_SUB}>Straight from the leaderboard · gross winnings, before your buy-ins</small>
        </h2>
      </div>

      {/* Organizer skills toggle */}
      <div style={{ padding: '10px 18px 4px' }}>
        <p style={SECTION_LABEL}>Skills — set the winners</p>
        <SkillToggle
          label="Longest Drive"
          value={skills.longDrive}
          t1Name={t1Name}
          t2Name={t2Name}
          onChange={(v) => setSkills((s) => ({ ...s, longDrive: v }))}
        />
        <SkillToggle
          label="Closest to the Pin"
          value={skills.closestToPin}
          t1Name={t1Name}
          t2Name={t2Name}
          onChange={(v) => setSkills((s) => ({ ...s, closestToPin: v }))}
          last
        />
      </div>

      {/* Context strip */}
      <div style={CONTEXT_STRIP}>
        <span>{leadLine}</span>
        <span>{bestGolfer ? `Best Golfer: ${bestGolfer}` : 'Best Golfer: TBD'}</span>
      </div>

      {/* Per-player payouts */}
      <ul style={{ listStyle: 'none', margin: 0, padding: '4px 18px 10px' }}>
        {ranked.map((p, i) => {
          const color = p.team === 1 ? TEAM_COLORS.team1 : TEAM_COLORS.team2
          const parts: string[] = []
          if (p.matchups > 0) parts.push(`Matchups +$${p.matchups} (${p.wins}W · ${p.ties}T)`)
          if (p.cup > 0) parts.push(`Cup +$${p.cup}`)
          if (p.golfer > 0) parts.push(`Golfer +$${p.golfer}`)
          if (p.skills > 0) parts.push(`Skills +$${p.skills}`)
          return (
            <li
              key={p.name}
              style={{
                padding: '13px 2px',
                borderBottom: i < ranked.length - 1 ? '1px solid rgba(14,58,41,.14)' : 'none',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: '0 0 auto', width: 9, height: 9, borderRadius: '50%', background: color }} />
                  <span style={{ fontWeight: 600, color: '#1c2b22', fontSize: 16 }}>{p.name}</span>
                </div>
                <span style={{ display: 'block', fontSize: 13.5, color: '#5d6b5f', marginTop: 3 }}>
                  {parts.length ? parts.join(' · ') : 'Nothing on the board yet'}
                </span>
              </div>
              <span
                style={{
                  flex: '0 0 auto',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 700,
                  fontSize: 17,
                  paddingTop: 1,
                  whiteSpace: 'nowrap',
                  color: p.total > 0 ? '#1c5540' : '#9aa39a',
                }}
              >
                {p.total > 0 ? `+$${p.total}` : '$0'}
              </span>
            </li>
          )
        })}
      </ul>

      <p style={FOOTNOTE}>
        Cup pays out to whichever side is ahead right now and updates as matches finish. Matchups
        count settled rounds only. Golfer of the Weekend goes to the current Best Golfer leader.
      </p>
    </div>
  )
}

interface ToggleProps {
  label: string
  value: SkillWinner
  t1Name: string
  t2Name: string
  onChange: (v: SkillWinner) => void
  last?: boolean
}

function SkillToggle({ label, value, t1Name, t2Name, onChange, last }: ToggleProps) {
  const option = (team: 1 | 2, name: string) => {
    const on = value === team
    const color = team === 1 ? TEAM_COLORS.team1 : TEAM_COLORS.team2
    return (
      <button
        type="button"
        onClick={() => onChange(on ? null : team)}
        style={{
          flex: '1 1 0',
          minWidth: 0,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontWeight: 700,
          fontSize: 13.5,
          padding: '9px 8px',
          borderRadius: 9,
          minHeight: 40,
          border: `1.5px solid ${on ? color : 'rgba(14,58,41,.2)'}`,
          background: on ? color : '#fff',
          color: on ? '#fff' : '#1c5540',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {on ? '✓ ' : ''}
        {name}
      </button>
    )
  }
  return (
    <div style={{ padding: '9px 0', borderBottom: last ? 'none' : '1px solid rgba(14,58,41,.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, color: '#1c2b22', fontSize: 15 }}>{label}</span>
        <span style={{ fontSize: 12.5, color: value ? '#2f7256' : '#9aa39a', fontWeight: 600 }}>
          {value ? 'Winner set — tap again to clear' : 'Not decided'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {option(1, t1Name)}
        {option(2, t2Name)}
      </div>
    </div>
  )
}

const fmtPts = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(1))

// --- Styles (match the Wagers tab card aesthetic) ---

const CARD: CSSProperties = {
  background: '#fffdf7',
  border: '1px solid rgba(14,58,41,.14)',
  borderRadius: 14,
  boxShadow: '0 10px 30px -18px rgba(14,58,41,.55)',
  margin: '0 0 18px',
  overflow: 'hidden',
}

const CARD_HEADER: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '16px 18px',
  borderBottom: '1px solid rgba(14,58,41,.14)',
  background: 'linear-gradient(180deg,#fffdf7,#fbf7ea)',
}

const BADGE: CSSProperties = {
  flex: '0 0 auto',
  background: '#efe14e',
  color: '#0e3a29',
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  fontSize: 12,
  fontWeight: 600,
  padding: '6px 11px',
  borderRadius: 7,
  whiteSpace: 'nowrap',
}

const CARD_TITLE: CSSProperties = {
  fontFamily: "'Playfair Display',Georgia,serif",
  fontWeight: 700,
  color: '#1c5540',
  fontSize: 21,
  lineHeight: 1.1,
  margin: 0,
}

const CARD_SUB: CSSProperties = {
  display: 'block',
  fontFamily: "'Iowan Old Style',Palatino,Georgia,serif",
  fontStyle: 'normal',
  fontSize: 12.5,
  letterSpacing: '.05em',
  color: '#5d6b5f',
  fontWeight: 400,
  marginTop: 3,
}

const SECTION_LABEL: CSSProperties = {
  margin: '6px 2px 2px',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '.1em',
  color: '#8a8470',
  fontWeight: 700,
}

const CONTEXT_STRIP: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 10,
  flexWrap: 'wrap',
  margin: '10px 18px 0',
  padding: '10px 12px',
  background: '#ece3cb',
  borderRadius: 9,
  fontSize: 13.5,
  color: '#1c5540',
  fontWeight: 600,
}

const FOOTNOTE: CSSProperties = {
  margin: 0,
  padding: '0 18px 16px',
  fontSize: 12.5,
  lineHeight: 1.5,
  color: '#8a8470',
}
