import type { Player, TournamentData } from '../../lib/types'
import { BareCard, EmptyTab, Lede, MANUAL_COLORS } from './ui'

/**
 * The field, straight from Setup → Players. Nothing is stored for this tab:
 * the roster is one list, and typing it twice is how a manual ends up naming
 * someone who dropped out.
 *
 * Phone numbers are optional and shown as tappable links, which is the whole
 * point of having them on a page people open at the course.
 */
export function RosterTab({ data }: { data: TournamentData }) {
  const { players, teams } = data
  if (players.length === 0) {
    return <EmptyTab>No players yet. The organiser adds them under Event setup → Players.</EmptyTab>
  }

  const sides = [
    { name: teams.team1.name, players: players.filter((p) => p.team === 1), tone: 'yellow' as const },
    { name: teams.team2.name, players: players.filter((p) => p.team === 2), tone: 'dark' as const },
  ].filter((side) => side.players.length > 0)

  return (
    <>
      <Lede>
        {players.length} player{players.length === 1 ? '' : 's'}, one tap away.
      </Lede>
      {sides.map((side) => (
        <BareCard
          key={side.name}
          badge={`${side.players.length}`}
          badgeTone={side.tone}
          title={side.name}
          subtitle="Tap a number to call"
        >
          <ul style={{ listStyle: 'none', margin: 0, padding: '6px 18px 10px' }}>
            {side.players.map((player, i) => (
              <PlayerRow key={player.name} player={player} last={i === side.players.length - 1} />
            ))}
          </ul>
        </BareCard>
      ))}
    </>
  )
}

function PlayerRow({ player, last }: { player: Player; last: boolean }) {
  return (
    <li
      style={{
        padding: '13px 2px',
        borderBottom: last ? 'none' : `1px solid ${MANUAL_COLORS.hairline}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ minWidth: 0 }}>
        <span style={{ fontWeight: 600, color: '#1c2b22', fontSize: 16 }}>{player.name}</span>
        <span style={{ display: 'block', fontSize: 13, color: MANUAL_COLORS.muted, marginTop: 1 }}>
          Index {player.handicapIndex}
        </span>
      </span>
      {player.phone && (
        <a
          href={`tel:${player.phone.replace(/[^\d+]/g, '')}`}
          style={{
            flex: '0 0 auto',
            color: MANUAL_COLORS.green,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: 14,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {player.phone}
        </a>
      )}
    </li>
  )
}
