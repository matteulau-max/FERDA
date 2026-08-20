import type { TournamentData } from '../../lib/types'
import { hasWagers, manualDoc, type ManualWagers } from '../../lib/manual'
import { useManualSection } from './useManualSection'
import { Button, Card, ErrorText, Field, SectionHeading, TextArea, TextInput } from './ui'

interface Props {
  apiUrl: string
  slug: string
  data: TournamentData
  onSaved: () => void
}

/** What each pool was in the original FERDA setup, offered as a one-tap start. */
const CLASSIC: Pick<ManualWagers, 'matchupStake' | 'cup' | 'golferBuyIn' | 'skill'> = {
  matchupStake: 10,
  cup: 150,
  golferBuyIn: 5,
  skill: 10,
}

/**
 * Buy-ins for the four pools the payouts board already knows how to settle.
 *
 * Only the amounts are asked for — how each pool pays out is fixed logic in
 * payouts.ts, and every figure on the board is net, so the pools always tie to
 * zero. A pool left at 0 simply doesn't appear.
 */
export function WagersSection({ apiUrl, slug, data, onSaved }: Props) {
  const saved = manualDoc(data.manual).wagers
  const form = useManualSection<ManualWagers>('wagers', saved, { apiUrl, slug, onSaved })
  const { value, patch } = form
  const field = data.players.length

  return (
    <div>
      <SectionHeading
        title="Wagers"
        action={
          <Button onClick={form.save} disabled={!form.dirty || form.saving}>
            {form.saving ? 'Saving…' : form.justSaved ? 'Saved' : 'Save'}
          </Button>
        }
      />

      <p className="text-sm text-gray-500 font-body mb-3">
        Set a buy-in per pool and the app settles them live from the leaderboard. Everything on the
        payouts board is net — winners' gains equal losers' losses. Leave a pool at 0 to leave it
        out. With all four at 0 the Wagers tab is hidden.
      </p>

      {!hasWagers(value) && (
        <Card>
          <p className="font-body text-sm text-gray-600 mb-2">
            Not sure where to start? The original FERDA stakes were $10 a round, $150 on the Cup,
            $5 into Golfer of the Weekend and $10 a skill.
          </p>
          <Button variant="ghost" onClick={() => patch(CLASSIC)}>
            Use those amounts
          </Button>
        </Card>
      )}

      <Card>
        <Money
          label="Matchups"
          hint="Per player, per round, head-to-head. Winners split the match pot; a halve is a push."
          value={value.matchupStake}
          onChange={(matchupStake) => patch({ matchupStake })}
        />
        <Money
          label="The Cup"
          hint="Per player on the overall team result. Swings to whichever side is ahead right now."
          value={value.cup}
          onChange={(cup) => patch({ cup })}
        />
        <Money
          label="Golfer of the Weekend"
          hint={
            field
              ? `Per player, winner takes the pot — ${field} players in, so the winner is up $${
                  value.golferBuyIn * (field - 1)
                } and everyone else down $${value.golferBuyIn}.`
              : 'Per player, winner takes the pot.'
          }
          value={value.golferBuyIn}
          onChange={(golferBuyIn) => patch({ golferBuyIn })}
        />
        <Money
          label="Skills"
          hint="Per player, per skill — longest drive and closest to the pin. You pick the winning team on the Wagers tab."
          value={value.skill}
          onChange={(skill) => patch({ skill })}
        />
      </Card>

      <Card>
        <Field label="Notes" hint="Anything else about settling up. Optional.">
          <TextArea
            value={value.notes}
            maxLength={2000}
            placeholder="Settle up at dinner Sunday. Venmo @someone."
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </Field>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={form.save} disabled={!form.dirty || form.saving}>
          {form.saving ? 'Saving…' : form.justSaved ? 'Saved' : 'Save'}
        </Button>
        <ErrorText>{form.error}</ErrorText>
      </div>
    </div>
  )
}

function Money({
  label, hint, value, onChange,
}: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <span className="font-body text-base text-gray-500">$</span>
        <TextInput
          type="number"
          inputMode="decimal"
          min={0}
          step="1"
          value={String(value)}
          onChange={(e) => {
            // An empty box is 0, not NaN — clearing a field shouldn't break the form.
            const n = parseFloat(e.target.value)
            onChange(Number.isFinite(n) && n >= 0 ? n : 0)
          }}
        />
      </div>
    </Field>
  )
}
