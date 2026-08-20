import type { CSSProperties } from 'react'
import type { ManualWagers } from '../../lib/manual'
import type { Session, TournamentData } from '../../lib/types'
import { sessionRules } from '../../lib/holes'
import { LivePayouts } from '../LivePayouts'
import { formatLabel } from './round'
import { BareCard, Card, Item, Lede, List, MANUAL_COLORS, Prose } from './ui'

/**
 * What's on the line: the points race, then the money.
 *
 * The points table is derived — a Match Play or Stroke Play session is worth
 * one point per match, so its value is just its pairing count. A Total Stroke
 * Play session pays on the margin instead, which has no ceiling, so it's shown
 * as a rate and left out of the total (and out of the clinch number, which
 * would otherwise be a guess).
 */
export function WagersTab({ wagers, data }: { wagers: ManualWagers; data: TournamentData }) {
  const rows = data.sessions.map((session) => ({ session, points: fixedPoints(session) }))
  const fixedTotal = rows.reduce((sum, r) => sum + (r.points ?? 0), 0)
  const allFixed = rows.every((r) => r.points !== null)
  // Half a point clear of an even split is the smallest lead that can't be
  // caught — the Ryder Cup's 14½ of 28.
  const clinch = fixedTotal / 2 + 0.5

  return (
    <>
      <Lede>Play for your team. Settle up like gentlemen.</Lede>

      {rows.length > 0 && (
        <BareCard
          badge="The Race"
          title="Team Points"
          subtitle="1 point per match won · half each for a halve"
        >
          <div style={{ padding: '6px 18px 8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15.5 }}>
              <tbody>
                {rows.map(({ session, points }) => (
                  <tr key={session.name}>
                    <td style={CELL}>
                      {session.name}
                      <span style={{ display: 'block', fontSize: 13, color: MANUAL_COLORS.muted }}>
                        {formatLabel(session)}
                      </span>
                    </td>
                    <td style={{ ...CELL, textAlign: 'right', fontWeight: 700, color: MANUAL_COLORS.green }}>
                      {points === null
                        ? `${sessionRules(session).pointsPerStroke} / stroke`
                        : `${points} pt${points === 1 ? '' : 's'}`}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={TOTAL_CELL}>Total on the board</td>
                  <td style={{ ...TOTAL_CELL, textAlign: 'right', fontWeight: 700 }}>
                    {allFixed ? `${fixedTotal} pts` : `${fixedTotal} pts + margins`}
                  </td>
                </tr>
              </tbody>
            </table>
            <List>
              <Item term={allFixed ? `${clinch} points` : 'A majority'} last={!allFixed}>
                {allFixed
                  ? 'clinches the tournament.'
                  : 'clinches it — the total moves with the stroke-play margins, so there is no fixed number.'}
              </Item>
              {allFixed && (
                <Item term="Ties" last>
                  in a match are a push — half a point each, and no money changes hands.
                </Item>
              )}
            </List>
          </div>
        </BareCard>
      )}

      <Card badge="The Pot" title="The Money" subtitle="All figures are net — every pool ties to zero">
        <List>
          {wagers.matchupStake > 0 && (
            <Item term={`Matchups — $${wagers.matchupStake} a round.`}>
              Win your match and you take the head-to-head; a halve is a push. In a 2v1 the pot is
              split by side size, so the solo player is up more than each of the pair.
            </Item>
          )}
          {wagers.cup > 0 && (
            <Item term={`The Cup — $${wagers.cup}.`}>
              Team total. Win the tournament with your side and take it off the other one.
            </Item>
          )}
          {wagers.golferBuyIn > 0 && (
            <Item term={`Golfer of the Tournament — $${wagers.golferBuyIn}.`}>
              Everyone buys in and the winner takes the pot
              {data.players.length > 1 && <> — ${wagers.golferBuyIn * (data.players.length - 1)} to the winner</>}.
              Judged on points won, gross birdies and best net.
            </Item>
          )}
          {wagers.skill > 0 && (
            <Item term={`Skills — $${wagers.skill} each.`}>
              Longest drive and closest to the pin. A teammate winning means you win; the other
              side pays.
            </Item>
          )}
          <Item term="Everything below is live." last>
            The board settles itself off the leaderboard as matches finish.
          </Item>
        </List>
        {wagers.notes.trim() && <Prose text={wagers.notes} />}
      </Card>

      <LivePayouts data={data} />
    </>
  )
}

/**
 * Points a session is worth, or null when it depends on the result. Match Play
 * and Stroke Play both settle one point per match; Total Stroke Play pays on
 * the session margin instead, so there's no number until it's played.
 */
function fixedPoints(session: Session): number | null {
  if (sessionRules(session).scoring === 'Total Stroke Play') return null
  return session.matches.length
}

const CELL: CSSProperties = {
  padding: '11px 2px',
  borderBottom: `1px solid ${MANUAL_COLORS.hairline}`,
  verticalAlign: 'top',
}

const TOTAL_CELL: CSSProperties = {
  padding: '13px 2px 11px',
  borderTop: `2px solid ${MANUAL_COLORS.hairline}`,
  verticalAlign: 'top',
  fontFamily: "'Playfair Display',Georgia,serif",
  fontSize: 18,
  color: MANUAL_COLORS.green,
}
