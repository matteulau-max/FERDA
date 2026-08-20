import type { ManualRules } from '../../lib/manual'
import type { TournamentData } from '../../lib/types'
import { sessionRules } from '../../lib/holes'
import {
  BEST_BALL_ALLOWANCE,
  SCRAMBLE_ALLOWANCES,
} from '../../lib/constants'
import { RoundBadges, roundDetail } from './round'
import { Card, EmptyTab, Item, Lede, List, Note, Prose } from './ui'

/**
 * The Rules tab.
 *
 * Three sources feed it, and keeping them apart is the whole idea:
 *
 *  - The rounds card is read from the tournament's sessions, so it can never
 *    disagree with what's being scored.
 *  - The handicap cards explain what the app actually does, down to the
 *    allowance percentages pulled from constants.ts. They aren't editable
 *    because editing them wouldn't change the maths, only the description of
 *    it — and a manual that lies about the handicaps is worse than none.
 *  - Everything else is the organiser's answers from Setup → Rules.
 *
 * Cards that don't apply are left out rather than shown empty: no scramble
 * session, no scramble cards.
 */
export function RulesTab({ rules, data }: { rules: ManualRules; data: TournamentData }) {
  const { sessions } = data
  const eventName = data.name ?? 'Local'

  const hasScramble = sessions.some((s) => s.format === 'Scramble')
  const hasBestBall = sessions.some((s) => s.format === 'Best Ball' || s.format === '2v1')
  const anyHandicaps = sessions.some((s) => sessionRules(s).useHandicap)

  // Numbered in the order they appear, so removing a card doesn't leave a gap.
  let ruleNumber = 0
  const nextRule = () => ROMAN[ruleNumber++] ?? String(ruleNumber)

  const ob = rules.outOfBounds

  return (
    <>
      <Lede>
        These rules govern all competitive play during {eventName}. Everyone is expected to know
        and abide by them.
      </Lede>

      {rules.conduct.trim() && (
        <Card badge="The Code" title="Code of Conduct">
          <Prose text={rules.conduct} />
        </Card>
      )}

      {sessions.length > 0 && (
        <Card badge="Formats" title={`The ${countWord(sessions.length)}`}>
          <List>
            {sessions.map((session, i) => (
              <Item key={session.name} term={`${session.name}.`} last={i === sessions.length - 1}>
                {roundDetail(session)}
                <RoundBadges session={session} />
              </Item>
            ))}
          </List>
        </Card>
      )}

      {anyHandicaps && (
        <Card badge="Handicaps" title="How Handicaps Work">
          <p style={{ margin: '10px 2px 4px', fontSize: 15.5 }}>
            Matches are played <b>net</b> and the app does the maths — you always enter your raw
            gross score. Here's what happens underneath.
          </p>
          <List>
            <Item marker="1" term="Handicap Index.">
              Your official index, entered by the organiser before the event.
            </Item>
            <Item marker="2" term="Course Handicap.">
              Your index converted to the course and tees you're playing:
              <span
                style={{
                  display: 'block',
                  margin: '9px 0 4px',
                  padding: '10px 12px',
                  background: '#ece3cb',
                  borderRadius: 9,
                  fontSize: 15,
                  color: '#1c5540',
                  textAlign: 'center',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                Index × (Slope ÷ 113) + (Course Rating − Par)
              </span>
              rounded to the nearest whole number.
            </Item>
            <Item marker="3" term="Strokes by hole.">
              That number is spread across the holes by each hole's <b>Stroke Index</b> (SI 1 =
              hardest). A 14 gets a shot on the 14 hardest holes; anything over 18 gets a second
              shot on the lowest indexes.
            </Item>
            <Item marker="4" term="Playing off the low.">
              In a match the lowest handicap plays off scratch and everyone else gets the{' '}
              <i>difference</i> — only the gap between players matters.
            </Item>
            <Item marker="5" term="Net score." last>
              The app subtracts your strokes automatically and tracks the match in net terms. The
              dots by your name (● / ●●) show where your shots fall.
              <Note>
                Nine-hole rounds use half your index against half the course rating, and the
                stroke indexes are re-ranked 1–9 within the nine being played.
              </Note>
            </Item>
          </List>
        </Card>
      )}

      {hasScramble && (
        <Card badge="Scramble" title="Scramble Handicaps">
          <List>
            <Item term="One ball, one score.">
              Everyone hits every shot, you play the best one from there, and the team records a
              single gross score per hole.
            </Item>
            <Item term="A small, blended team handicap.">
              Several cracks at every shot already scores low, so the side plays off one combined
              handicap: {scrambleAllowanceText()} of each player's course handicap, low to high.
            </Item>
            <Item term="Example." last>
              A 6 and a 14 in a pair → (35% × 6) + (15% × 14) ≈ <b>4 team strokes</b>, taken on the
              4 hardest holes.
            </Item>
          </List>
        </Card>
      )}

      {hasBestBall && (
        <Card badge="Best Ball" title="Best Ball Handicaps">
          <List>
            <Item term="Everyone plays their own ball.">
              Each player holes out with their own ball and net score; the side takes the{' '}
              <b>better net</b> on each hole.
            </Item>
            <Item term="Full individual strokes.">
              Each player gets their own course handicap at{' '}
              <b>{Math.round(BEST_BALL_ALLOWANCE * 100)}%</b>, allocated by Stroke Index as normal.
            </Item>
            <Item term="Off the low." last>
              The group is reduced to its lowest handicap, who plays off scratch while everyone
              else gets the difference.
            </Item>
          </List>
        </Card>
      )}

      <Card badge={`Rule ${nextRule()}`} badgeTone="dark" title="Out of Bounds & Lost Ball">
        <List>
          <Item term={penaltyTerm(ob.penaltyStrokes)}>
            {ob.returnToTee ? (
              <>
                Return to where you last played from — stroke and distance. A tee shot hit out of
                bounds means you're playing your {ob.penaltyStrokes + 2}
                {ordinal(ob.penaltyStrokes + 2)} from the tee.
              </>
            ) : (
              <>
                Drop where the ball last crossed out of bounds — <b>whatever the stake colour</b> —
                a couple of club-lengths from the line. A tee shot hit out of bounds means you're
                playing your {ob.penaltyStrokes + 2}
                {ordinal(ob.penaltyStrokes + 2)} from the drop.
              </>
            )}
          </Item>
          {!ob.returnToTee && (
            <Item term="No return to the tee required">
              — play from the drop. If you do choose to re-tee, you're still hitting your{' '}
              {ob.penaltyStrokes + 2}
              {ordinal(ob.penaltyStrokes + 2)}.
            </Item>
          )}
          <Item term="Ball search limit" last={!ob.galleryDrops}>
            is {ob.searchMinutes} minute{ob.searchMinutes === 1 ? '' : 's'}. After that the ball is
            lost and the penalty applies.
          </Item>
          {ob.galleryDrops && (
            <Item term="Gallery drop." last>
              If the group unanimously agrees a ball is in bounds but it can't be found, free
              relief with no penalty — drop where the group agrees it most likely came to rest.
            </Item>
          )}
        </List>
      </Card>

      <Card badge={`Rule ${nextRule()}`} badgeTone="dark" title="Maximum Score">
        <List>
          <Item term={`${rules.maxScore}${rules.maxScore === 'No maximum' ? '.' : ' caps every hole.'}`} last>
            {rules.maxScore === 'No maximum'
              ? 'Hole out on every hole, however long it takes.'
              : "Once you've reached the cap, pick up and write it down — no need to hole out."}
            <Note>
              <strong style={{ color: '#6f6a52', fontWeight: 700 }}>Note:</strong> the app doesn't
              enforce this — it accepts any gross score — so apply the cap yourself as you enter.
            </Note>
          </Item>
        </List>
      </Card>

      <Card badge={`Rule ${nextRule()}`} badgeTone="dark" title="Mulligans">
        <List>
          <Item term={rules.mulligans === 0 ? 'No mulligans.' : `${rules.mulligans} per round.`} last>
            {rules.mulligans === 0 ? (
              <>All shots count. Play the ball as it lies. This applies to every round and format.</>
            ) : (
              <>
                Each player gets {rules.mulligans} re-hit{rules.mulligans === 1 ? '' : 's'} per
                round, taken immediately and at the player's own call. Everything else counts.
              </>
            )}
          </Item>
        </List>
      </Card>

      <Card badge={`Rule ${nextRule()}`} badgeTone="dark" title="Concessions & Gimmes">
        <List>
          <Item term={rules.gimmes} last>
            {gimmeDetail(rules.gimmes)}
          </Item>
        </List>
      </Card>

      <Card badge={`Rule ${nextRule()}`} badgeTone="dark" title="Pace of Play">
        <List>
          <Item term={rules.pace.readyGolf ? 'Ready golf is in effect' : 'Play in order'}>
            {rules.pace.readyGolf
              ? '— hit when you\'re ready, don\'t wait for strict order of play.'
              : '— the ball furthest from the hole plays first.'}
          </Item>
          <Item term={`Honors are ${rules.pace.honors.toLowerCase()}.`}>
            {rules.pace.honors === 'Optional'
              ? 'A side that just lost the previous hole may wait for the winners to tee off first if they\'d like.'
              : 'The side that won the previous hole tees off first.'}
          </Item>
          <Item last>Be ready when it's your turn. Slow play may be subject to organiser intervention.</Item>
        </List>
      </Card>

      <Card badge={`Rule ${nextRule()}`} badgeTone="dark" title="Equipment & Devices">
        <List>
          <Item
            term={
              rules.equipment.rangefinders
                ? 'Rangefinders, GPS devices and apps are permitted'
                : 'No distance-measuring devices.'
            }
            last
          >
            {rules.equipment.rangefinders ? (
              rules.equipment.slope ? (
                <>without restriction. Slope compensation, wind readings and all device features are allowed.</>
              ) : (
                <>for distance only. Slope compensation and wind readings must be switched off.</>
              )
            ) : (
              <>Play by eye and by the yardage markers on the course.</>
            )}
          </Item>
        </List>
      </Card>

      <Card badge={`Rule ${nextRule()}`} badgeTone="dark" title="Disputes & Rulings">
        <List>
          <Item term="The organiser has final ruling authority">
            on all disputes, penalties and interpretations.
          </Item>
          <Item>In cases not covered by these rules, the USGA Rules of Golf apply as the default standard.</Item>
          <Item last>
            Rulings made in good faith are final. No retroactive scoring adjustments after a hole
            is completed.
          </Item>
        </List>
      </Card>

      {hasScramble && (
        <Card badge={`Rule ${nextRule()}`} badgeTone="dark" title="Scramble Play">
          <List>
            <Item
              term={
                rules.scramble.clubLengths === 0
                  ? 'Play it as it lies.'
                  : `${rules.scramble.clubLengths} club-length placement.`
              }
              last={rules.scramble.clubLengths === 0 || !rules.scramble.sameLie}
            >
              {rules.scramble.clubLengths === 0 ? (
                <>Once the side picks the shot to play, everyone plays from that exact spot.</>
              ) : (
                <>
                  Once the side picks the shot to play, each player places their ball within{' '}
                  <b>
                    {rules.scramble.clubLengths} club-length
                    {rules.scramble.clubLengths === 1 ? '' : 's'}
                  </b>{' '}
                  of that spot — <b>no closer to the hole</b>.
                </>
              )}
            </Item>
            {rules.scramble.clubLengths > 0 && rules.scramble.sameLie && (
              <Item term="Same lie, same condition." last>
                The placement must stay in the same type of lie as the selected shot: bunker stays
                in the bunker, rough stays in the rough, fairway stays in the fairway, and on the
                green stays on the green.
              </Item>
            )}
          </List>
        </Card>
      )}

      {rules.custom.length > 0 && (
        <Card badge={`Rule ${nextRule()}`} title={`${eventName} Rules`}>
          <List>
            {rules.custom.map((rule, i) => (
              <Item key={rule.id} term={rule.title ? `${rule.title}.` : undefined} last={i === rules.custom.length - 1}>
                {rule.body}
              </Item>
            ))}
          </List>
        </Card>
      )}

      {sessions.length === 0 && !rules.conduct.trim() && rules.custom.length === 0 && (
        <EmptyTab>
          These are the default rules. The organiser can change any of them under Event setup →
          Rules.
        </EmptyTab>
      )}
    </>
  )
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

function countWord(n: number): string {
  const words = ['Rounds', 'Round', 'Two Rounds', 'Three Rounds', 'Four Rounds', 'Five Rounds', 'Six Rounds']
  return words[n] ?? `${n} Rounds`
}

function penaltyTerm(strokes: number): string {
  if (strokes === 0) return 'Free drop.'
  return `${strokes === 1 ? 'One' : 'Two'}-stroke penalty${strokes === 1 ? ' drop.' : '.'}`
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th'
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
}

function gimmeDetail(gimmes: string): string {
  switch (gimmes) {
    case 'Inside the leather':
      return 'A putt inside the length of a putter grip is good. Anything longer gets holed out.'
    case 'Opponent may concede':
      return 'Your opponent may concede a putt at any time. Once conceded it counts as holed, and the score is written down as if it were.'
    default:
      return 'There are no concessions on the green. Every player holes out on every hole, which removes any argument and keeps every score in the app real.'
  }
}

/** "35% / 15%" for a pair, from the same table the scoring engine uses. */
function scrambleAllowanceText(): string {
  return (SCRAMBLE_ALLOWANCES[2] ?? []).map((a) => `${Math.round(a * 100)}%`).join(' / ')
}
