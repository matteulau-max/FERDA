import type { ManualLodging } from '../../lib/manual'
import { Card, Item, Lede, List, Prose } from './ui'

/** Where everyone is staying. Only reachable when the organiser turned it on. */
export function LodgingTab({ lodging }: { lodging: ManualLodging }) {
  const rows = [
    lodging.address && { term: 'Address.', body: <MapLink address={lodging.address} /> },
    lodging.checkIn && { term: 'Check-in.', body: lodging.checkIn },
    lodging.checkOut && { term: 'Check-out.', body: lodging.checkOut },
    lodging.doorCode && {
      term: 'Door code.',
      body: <b style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '.06em' }}>{lodging.doorCode}</b>,
    },
    lodging.wifiNetwork && {
      term: 'Wi-Fi.',
      body: lodging.wifiPassword
        ? `Network "${lodging.wifiNetwork}" · Password "${lodging.wifiPassword}"`
        : `Network "${lodging.wifiNetwork}"`,
    },
  ].filter(Boolean) as { term: string; body: React.ReactNode }[]

  return (
    <>
      <Lede>Home base for the trip.</Lede>

      {rows.length > 0 && (
        <Card
          badge="The House"
          title={lodging.name || 'Lodging'}
          subtitle={[lodging.checkIn, lodging.checkOut].filter(Boolean).join(' → ') || undefined}
        >
          <List>
            {rows.map((row, i) => (
              <Item key={row.term} term={row.term} last={i === rows.length - 1}>
                {row.body}
              </Item>
            ))}
          </List>
        </Card>
      )}

      {lodging.notes.trim() && (
        <Card badge="House Rules" badgeTone="red" title="Good Neighbour Policy">
          <Prose text={lodging.notes} />
        </Card>
      )}
    </>
  )
}

/** Tapping an address on a phone should open the map, not select the text. */
function MapLink({ address }: { address: string }) {
  return (
    <a
      href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
      target="_blank"
      rel="noreferrer"
      style={{ color: '#1c5540', textDecoration: 'underline' }}
    >
      {address}
    </a>
  )
}
