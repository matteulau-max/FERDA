import type { ManualRules } from '../../lib/manual'
import { Card, Item, Lede, List } from './ui'

/**
 * How to use the app. This is the one tab with nothing tournament-specific in
 * it — it describes the software, which behaves the same at every event — so
 * it's fixed copy rather than another thing for an organiser to write.
 *
 * The single exception is the max-score reminder, which has to name whatever
 * cap the organiser actually chose or it sends people looking for a rule that
 * isn't there.
 */
export function AppTab({ rules }: { rules: ManualRules }) {
  return (
    <>
      <Lede>Live scores, win probability and the full ruleset — in your pocket. No download, no login.</Lede>

      <Card badge="Start" title="Five Steps to a Scorecard">
        <List>
          <Item marker="1">
            Tap the <Term>Leaderboard</Term> tab up top — you're already in the app, nothing to
            download or log in to.
          </Item>
          <Item marker="2">
            The <Term>Leaderboard</Term> shows the team score up top and every match below.
          </Item>
          <Item marker="3">
            Scroll to your session, then <Term>tap your match row</Term> to open your scorecard.
          </Item>
          <Item marker="4">
            After each hole, tap your score box and type your <Term>gross score</Term>. It saves
            automatically — there's no button to press.
          </Item>
          <Item marker="5" last>
            Tap <Term>←</Term> to return to the Leaderboard any time.
          </Item>
        </List>
      </Card>

      <Card badge="Leaderboard" badgeTone="dark" title="Finding Your Match">
        <p style={{ margin: '10px 2px 4px', fontSize: 15.5 }}>
          Matches are grouped into <b>sessions</b> — named rounds. Scroll to your session and look
          for your name. Each row shows the two sides, a status in the middle, and a colour for
          who's ahead.
        </p>
        <List>
          <Item marker="•">Match hasn't started yet</Item>
          <Item marker="A/S">All square — tied right now</Item>
          <Item marker="thru 9">In progress — 9 holes played</Item>
          <Item marker="F">Finished</Item>
          <Item last>
            <Term>Green</Term> = Team 1 leading · <Term>red</Term> = Team 2 leading · neutral = all
            square. Tap any row for the full scorecard.
          </Item>
        </List>
      </Card>

      <Card badge="Scoring" badgeTone="dark" title="Entering Scores">
        <List>
          <Item marker="1">
            Open your match from the Leaderboard. An 18-hole round shows two grids,{' '}
            <Term>Front 9</Term> and <Term>Back 9</Term>; a nine-hole round shows just the nine
            you're playing.
          </Item>
          <Item marker="2">Find your row and tap the box under the hole you just finished.</Item>
          <Item marker="3">
            Type your <Term>gross score</Term> — actual strokes, penalties included. The app
            handles handicaps.
          </Item>
          <Item marker="4">
            You'll see <Term>Saving…</Term> then <Term>Saved</Term>. That's it.
          </Item>
          <Item term="No Save button, no lock step.">
            Every entry saves instantly and can be edited — retype to overwrite.
          </Item>
          <Item term="Two people, one box?">
            Last to reach the server wins, with no warning. Agree up front on who's entering.
          </Item>
          <Item term="Handicap dots" last>
            by your name: ● = 1 stroke on that hole, ●● = 2. Still enter raw gross — the app
            computes net.
          </Item>
        </List>
      </Card>

      <Card badge="Results" badgeTone="dark" title="How Matches Close">
        <p style={{ margin: '10px 2px 4px', fontSize: 15.5 }}>
          A match play match ends the moment the leader can't be mathematically caught — nobody
          marks it done. A banner shows the result.
        </p>
        <List>
          <Item marker="3&2">Won with a 3-hole lead and 2 to play — over early</Item>
          <Item marker="1 UP">Won by one hole after the final hole</Item>
          <Item marker="HALVED">Tied at the end (also shows as A/S)</Item>
          <Item marker="F" last>
            Finished — see the banner for the full result
          </Item>
        </List>
      </Card>

      <Card badge="Standings" title="Leaderboard & Win Probability">
        <List>
          <Item term="Score banner">
            shows overall points over a progress bar: <b>solid fill</b> = locked-in points from
            finished matches, <b>light fill</b> = projected points from matches still going,{' '}
            <b>centre line</b> = the winning threshold.
          </Item>
          <Item term="Win probability">
            weighs how far ahead a team is against the points still on the board. A gut-check, not
            a guarantee.
          </Item>
          <Item term="Points:">
            win = 1 · halved = ½ each · loss = 0. Total Stroke Play sessions instead pay the
            winning side for the stroke margin. The board refreshes every 15 seconds.
          </Item>
          <Item term="Best Golfer" last>
            ranks the top individuals — weighted 50% match points, 35% net strokes, 15% birdies.
          </Item>
        </List>
      </Card>

      <Card badge="Help" badgeTone="dark" title="FAQ & Troubleshooting">
        <List>
          <Item term={'"Save failed."'}>
            The number is on your screen but didn't reach the server. Get signal and retype —
            leave the page first and it's lost.
          </Item>
          <Item term="Scores look stale.">It refreshes every 15 seconds — wait a beat, or reload.</Item>
          <Item term="Can't find your match.">
            Scroll past the other sessions. Still missing? The organiser may not have entered it yet.
          </Item>
          <Item term="Wrong score.">Tap the box and retype — it overwrites instantly, no confirm step.</Item>
          <Item term="Match ended early.">
            That's match play — it closes when the leader can't be caught. The result stands.
          </Item>
          <Item term="No signal?" last>
            You can view everything from cache, but you can't <i>save</i> without a connection.
          </Item>
        </List>
      </Card>

      <Card badge="Heads-Up" title="Confirm Before You Tee">
        <List>
          <Item term="Pick a scorekeeper.">
            The app doesn't assign one — agree on a person per match so you don't fight the
            last-write-wins rule.
          </Item>
          <Item term="Max score isn't enforced." last>
            The app accepts any gross score, so apply the{' '}
            {rules.maxScore === 'No maximum' ? 'cap' : rules.maxScore.toLowerCase()} cap yourself
            as you enter.
          </Item>
        </List>
      </Card>
    </>
  )
}

function Term({ children }: { children: React.ReactNode }) {
  return <span style={{ color: '#2f7256', fontWeight: 700 }}>{children}</span>
}
