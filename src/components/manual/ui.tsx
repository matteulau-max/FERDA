import type { CSSProperties, ReactNode } from 'react'

/**
 * The manual's visual language, lifted out of what used to be one long string
 * of inline-styled HTML.
 *
 * It deliberately doesn't use Tailwind or the app's green/cream palette: the
 * manual is the printed programme, and reads as paper — serif headings, warm
 * card stock, hairline rules. Keeping the styles here rather than in the tab
 * files means all six tabs stay in step.
 */

export const MANUAL_COLORS = {
  paper: '#f3ecd9',
  card: '#fffdf7',
  ink: '#19271f',
  green: '#1c5540',
  greenDeep: '#0e3a29',
  term: '#2f7256',
  muted: '#5d6b5f',
  faint: '#8a8470',
  gold: '#bcae5b',
  yellow: '#efe14e',
  red: '#b5462f',
  hairline: 'rgba(14,58,41,.14)',
} as const

const SERIF = "'Playfair Display', Georgia, serif"

export function Lede({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontFamily: SERIF,
        fontStyle: 'italic',
        fontSize: 20,
        lineHeight: 1.4,
        textAlign: 'center',
        color: MANUAL_COLORS.green,
        margin: '6px 8px 22px',
      }}
    >
      {children}
    </p>
  )
}

export function Card({
  badge, badgeTone = 'yellow', title, subtitle, children,
}: {
  badge?: string
  badgeTone?: 'yellow' | 'dark' | 'red'
  title?: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div style={CARD}>
      {(badge || title) && (
        <div style={CARD_HEADER}>
          {badge && <span style={badgeStyle(badgeTone)}>{badge}</span>}
          {title && (
            <h2 style={CARD_TITLE}>
              {title}
              {subtitle && <small style={CARD_SUB}>{subtitle}</small>}
            </h2>
          )}
        </div>
      )}
      <div style={{ padding: '6px 18px 8px' }}>{children}</div>
    </div>
  )
}

/** A card whose body sets its own padding (tables, dense lists). */
export function BareCard({
  badge, badgeTone = 'yellow', title, subtitle, children,
}: {
  badge?: string
  badgeTone?: 'yellow' | 'dark' | 'red'
  title?: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div style={CARD}>
      {(badge || title) && (
        <div style={CARD_HEADER}>
          {badge && <span style={badgeStyle(badgeTone)}>{badge}</span>}
          {title && (
            <h2 style={CARD_TITLE}>
              {title}
              {subtitle && <small style={CARD_SUB}>{subtitle}</small>}
            </h2>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

export function List({ children }: { children: ReactNode }) {
  return <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{children}</ul>
}

/**
 * One line of a rules list: a gold marker, then the rule. `term` is the bit in
 * green that carries the actual instruction, so it can be skimmed.
 */
export function Item({
  marker = '—', term, children, last,
}: { marker?: string; term?: string; children?: ReactNode; last?: boolean }) {
  return (
    <li
      style={{
        padding: '14px 2px',
        borderBottom: last ? 'none' : `1px solid ${MANUAL_COLORS.hairline}`,
        display: 'flex',
        gap: 12,
      }}
    >
      <span style={{ color: MANUAL_COLORS.gold, fontWeight: 700, flex: '0 0 auto', lineHeight: 1.4 }}>
        {marker}
      </span>
      <span>
        {term && <span style={{ color: MANUAL_COLORS.term, fontWeight: 700 }}>{term} </span>}
        {children}
      </span>
    </li>
  )
}

/** A schedule row: the time in the left gutter, the event beside it. */
export function TimeItem({
  time, title, children, last,
}: { time: string; title: ReactNode; children?: ReactNode; last?: boolean }) {
  return (
    <li
      style={{
        padding: '14px 2px',
        borderBottom: last ? 'none' : `1px solid ${MANUAL_COLORS.hairline}`,
        display: 'flex',
        gap: 12,
      }}
    >
      <span
        style={{
          flex: '0 0 76px',
          fontVariantNumeric: 'tabular-nums',
          color: MANUAL_COLORS.green,
          fontWeight: 700,
          fontSize: 15,
          paddingTop: 1,
        }}
      >
        {time}
      </span>
      <span>
        <span style={{ fontWeight: 600 }}>{title}</span>
        {children && (
          <span style={{ display: 'block', fontSize: 14, color: MANUAL_COLORS.muted, marginTop: 2 }}>
            {children}
          </span>
        )}
      </span>
    </li>
  )
}

/** The rounded format pill (2v2 Scramble). */
export function Chip({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: '#ece3cb',
        color: MANUAL_COLORS.green,
        borderRadius: 999,
        padding: '2px 10px',
        fontSize: 12.5,
        letterSpacing: '.04em',
        fontWeight: 600,
        marginLeft: 6,
        verticalAlign: 'middle',
      }}
    >
      {children}
    </span>
  )
}

/** The squared scoring tag (MATCH PLAY). */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: '#e1ede4',
        color: MANUAL_COLORS.green,
        border: '1px solid #b9d3c1',
        fontSize: 11.5,
        letterSpacing: '.05em',
        textTransform: 'uppercase',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 6,
        marginLeft: 6,
        verticalAlign: 'middle',
      }}
    >
      {children}
    </span>
  )
}

/** The smaller grey aside under a rule — caveats, "the app won't enforce this". */
export function Note({ children }: { children: ReactNode }) {
  return (
    <span style={{ display: 'block', fontSize: 13, color: MANUAL_COLORS.faint, marginTop: 5 }}>
      {children}
    </span>
  )
}

/** Free text the organiser typed: keep their line breaks, drop the blanks. */
export function Prose({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  return (
    <>
      {paragraphs.map((p, i) => (
        <p
          key={i}
          style={{
            fontSize: 17,
            lineHeight: 1.55,
            padding: i === 0 ? '10px 2px 6px' : '0 2px 6px',
            margin: 0,
            whiteSpace: 'pre-line',
          }}
        >
          {p}
        </p>
      ))}
    </>
  )
}

export function EmptyTab({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        textAlign: 'center',
        color: MANUAL_COLORS.muted,
        fontSize: 15,
        lineHeight: 1.6,
        padding: '30px 20px',
      }}
    >
      {children}
    </p>
  )
}

const CARD: CSSProperties = {
  background: MANUAL_COLORS.card,
  border: `1px solid ${MANUAL_COLORS.hairline}`,
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
  borderBottom: `1px solid ${MANUAL_COLORS.hairline}`,
  background: 'linear-gradient(180deg,#fffdf7,#fbf7ea)',
}

const CARD_TITLE: CSSProperties = {
  fontFamily: SERIF,
  fontWeight: 700,
  color: MANUAL_COLORS.green,
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
  color: MANUAL_COLORS.muted,
  fontWeight: 400,
  marginTop: 3,
}

function badgeStyle(tone: 'yellow' | 'dark' | 'red'): CSSProperties {
  const tones = {
    yellow: { background: MANUAL_COLORS.yellow, color: MANUAL_COLORS.greenDeep },
    dark: { background: MANUAL_COLORS.greenDeep, color: '#f3ecd9' },
    red: { background: MANUAL_COLORS.red, color: '#f3ecd9' },
  }
  return {
    flex: '0 0 auto',
    textTransform: 'uppercase',
    letterSpacing: '.12em',
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 11px',
    borderRadius: 7,
    whiteSpace: 'nowrap',
    ...tones[tone],
  }
}
