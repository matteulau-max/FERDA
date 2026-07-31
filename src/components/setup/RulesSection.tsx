import type { ReactNode } from 'react'
import type { TournamentData } from '../../lib/types'
import {
  GIMMES,
  MAX_SCORES,
  manualDoc,
  newId,
  type CustomRule,
  type ManualRules,
} from '../../lib/manual'
import { useManualSection } from './useManualSection'
import {
  Button,
  Card,
  Choice,
  ErrorText,
  Field,
  Fieldset,
  Recommended,
  SectionHeading,
  TextArea,
  TextInput,
  YesNo,
} from './ui'

interface Props {
  apiUrl: string
  slug: string
  data: TournamentData
  onSaved: () => void
}

/**
 * The questions behind the Rules tab.
 *
 * Only the decisions are asked for. The rounds come from Sessions, and how
 * handicaps, scramble allowances and best-ball allowances work is the app's
 * own behaviour — printing a question for those would invite an organiser to
 * write down something the scoring engine won't actually do.
 */
export function RulesSection({ apiUrl, slug, data, onSaved }: Props) {
  const saved = manualDoc(data.manual).rules
  const form = useManualSection<ManualRules>('rules', saved, { apiUrl, slug, onSaved })
  const { value, patch } = form
  const eventName = data.name ?? 'Tournament'

  function setCustom(custom: CustomRule[]) {
    patch({ custom } as Partial<ManualRules>)
  }

  return (
    <div>
      <SectionHeading title="Rules" action={<SaveButton form={form} />} />

      <p className="text-sm text-gray-500 font-body mb-3">
        These answers become the Rules tab of the manual. The rounds, the handicap maths and the
        format allowances are filled in from the rest of setup — everything below is what only
        you can decide.
      </p>

      <Card>
        <Field
          label="Code of conduct"
          hint="Free-form, in your own words. Leave it blank to leave the card out."
        >
          <TextArea
            value={value.conduct}
            maxLength={2000}
            placeholder="Chirp, celebrate, talk a little trash — but keep it respectful."
            onChange={(e) => patch({ conduct: e.target.value })}
          />
        </Field>
      </Card>

      <Card>
        <RuleHeading>Out of bounds &amp; lost ball</RuleHeading>
        <Fieldset label="Penalty strokes">
          <Choice
            value={value.outOfBounds.penaltyStrokes}
            onChange={(penaltyStrokes) => patch({ outOfBounds: { ...value.outOfBounds, penaltyStrokes } })}
            options={[
              { value: 0, label: 'None' },
              { value: 1, label: '1 stroke' },
              { value: 2, label: '2 strokes' },
            ]}
          />
        </Fieldset>
        <Fieldset label="Where you play from">
          <Choice
            value={value.outOfBounds.returnToTee}
            onChange={(returnToTee) => patch({ outOfBounds: { ...value.outOfBounds, returnToTee } })}
            options={[
              { value: false, label: 'Lateral drop' },
              { value: true, label: 'Back to the tee' },
            ]}
          />
          <p className="text-xs text-gray-500 font-body mt-1">
            {value.outOfBounds.returnToTee
              ? 'Stroke and distance — the full rules-of-golf version.'
              : 'Drop where the ball crossed the line, whatever the stake colour. Faster, and what most weekend events play.'}
          </p>
        </Fieldset>
        <Fieldset label="Ball search limit">
          <Choice
            value={value.outOfBounds.searchMinutes}
            onChange={(searchMinutes) => patch({ outOfBounds: { ...value.outOfBounds, searchMinutes } })}
            options={[
              { value: 2, label: '2 min' },
              { value: 3, label: '3 min' },
              { value: 5, label: '5 min' },
            ]}
          />
        </Fieldset>
        <Fieldset
          label="Gallery drops"
          hint="The group agrees a ball is in play but nobody can find it — free relief where they think it finished."
        >
          <YesNo
            value={value.outOfBounds.galleryDrops}
            onChange={(galleryDrops) => patch({ outOfBounds: { ...value.outOfBounds, galleryDrops } })}
            yes="Allowed"
            no="Not allowed"
          />
        </Fieldset>
      </Card>

      <Card>
        <RuleHeading>Maximum score</RuleHeading>
        <Fieldset label="Cap every hole at">
          <Choice
            value={value.maxScore}
            onChange={(maxScore) => patch({ maxScore })}
            options={MAX_SCORES.map((m) => ({ value: m, label: m }))}
          />
        </Fieldset>
        <Recommended>
          Double par is the usual choice. Note that the app doesn't enforce a cap — it accepts any
          gross score — so this is something players apply themselves as they enter. The manual
          says so too.
        </Recommended>
      </Card>

      <Card>
        <RuleHeading>Mulligans</RuleHeading>
        <Fieldset label="Per player, per round">
          <Choice
            value={value.mulligans}
            onChange={(mulligans) => patch({ mulligans })}
            options={[
              { value: 0, label: 'None' },
              { value: 1, label: '1' },
              { value: 2, label: '2' },
              { value: 3, label: '3' },
            ]}
          />
        </Fieldset>
      </Card>

      <Card>
        <RuleHeading>Concessions &amp; gimmes</RuleHeading>
        <Fieldset label="Short putts">
          <Choice
            value={value.gimmes}
            onChange={(gimmes) => patch({ gimmes })}
            options={GIMMES.map((g) => ({ value: g, label: g }))}
          />
        </Fieldset>
        <Recommended>
          Holing everything out removes the argument, and it's the only option that keeps every
          score in the app honest — a conceded putt still has to be written down as something.
        </Recommended>
      </Card>

      <Card>
        <RuleHeading>Pace of play</RuleHeading>
        <Fieldset label="Ready golf" hint="Hit when you're ready rather than waiting for strict order of play.">
          <YesNo
            value={value.pace.readyGolf}
            onChange={(readyGolf) => patch({ pace: { ...value.pace, readyGolf } })}
            yes="In effect"
            no="Not in effect"
          />
        </Fieldset>
        <Fieldset label="Honors">
          <Choice
            value={value.pace.honors}
            onChange={(honors) => patch({ pace: { ...value.pace, honors } })}
            options={[
              { value: 'Optional' as const, label: 'Optional' },
              { value: 'Mandatory' as const, label: 'Mandatory' },
            ]}
          />
        </Fieldset>
      </Card>

      <Card>
        <RuleHeading>Equipment &amp; devices</RuleHeading>
        <Fieldset label="Rangefinders, GPS and apps">
          <YesNo
            value={value.equipment.rangefinders}
            onChange={(rangefinders) => patch({ equipment: { ...value.equipment, rangefinders } })}
            yes="Allowed"
            no="Not allowed"
          />
        </Fieldset>
        {value.equipment.rangefinders && (
          <Fieldset label="Slope and wind readings">
            <YesNo
              value={value.equipment.slope}
              onChange={(slope) => patch({ equipment: { ...value.equipment, slope } })}
              yes="Allowed"
              no="Distance only"
            />
          </Fieldset>
        )}
        <Recommended>Allowing everything is simplest — nobody has to police device settings.</Recommended>
      </Card>

      <Card>
        <RuleHeading>Scramble play</RuleHeading>
        <p className="text-xs text-gray-500 font-body mb-3">
          Only applies to sessions you've set to Scramble.
        </p>
        <Fieldset label="Placement from the chosen shot">
          <Choice
            value={value.scramble.clubLengths}
            onChange={(clubLengths) => patch({ scramble: { ...value.scramble, clubLengths } })}
            options={[
              { value: 0, label: 'Play it as it lies' },
              { value: 1, label: '1 club-length' },
              { value: 2, label: '2 club-lengths' },
            ]}
          />
        </Fieldset>
        {value.scramble.clubLengths > 0 && (
          <Fieldset
            label="Same lie required"
            hint="Bunker stays in the bunker, rough stays in the rough, green stays on the green."
          >
            <YesNo
              value={value.scramble.sameLie}
              onChange={(sameLie) => patch({ scramble: { ...value.scramble, sameLie } })}
              yes="Required"
              no="Not required"
            />
          </Fieldset>
        )}
      </Card>

      <Card>
        <RuleHeading>{eventName} rules</RuleHeading>
        <p className="text-xs text-gray-500 font-body mb-3">
          Anything else your group plays — lift and clean, obstruction relief, bunker footprints,
          side games. These appear as their own card at the bottom of the Rules tab.
        </p>

        {value.custom.map((rule, i) => (
          <div key={rule.id} className="rounded-lg border border-gray-200 p-3 mb-3">
            <Field label={`Rule ${i + 1}`}>
              <TextInput
                value={rule.title}
                maxLength={80}
                placeholder="Lift, clean & place — fairway only"
                onChange={(e) =>
                  setCustom(value.custom.map((c, j) => (j === i ? { ...c, title: e.target.value } : c)))
                }
              />
            </Field>
            <TextArea
              rows={2}
              value={rule.body}
              maxLength={1000}
              placeholder="You may lift, clean and place your ball in the fairway. Not in the rough."
              onChange={(e) =>
                setCustom(value.custom.map((c, j) => (j === i ? { ...c, body: e.target.value } : c)))
              }
            />
            <div className="flex gap-2 mt-2">
              <Button
                variant="ghost"
                disabled={i === 0}
                onClick={() => setCustom(swap(value.custom, i, i - 1))}
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                disabled={i === value.custom.length - 1}
                onClick={() => setCustom(swap(value.custom, i, i + 1))}
              >
                ↓
              </Button>
              <Button variant="danger" onClick={() => setCustom(value.custom.filter((_, j) => j !== i))}>
                Remove
              </Button>
            </div>
          </div>
        ))}

        <Button
          variant="ghost"
          onClick={() => setCustom([...value.custom, { id: newId('rule'), title: '', body: '' }])}
        >
          Add other rule
        </Button>
      </Card>

      <div className="flex items-center gap-3">
        <SaveButton form={form} />
        <ErrorText>{form.error}</ErrorText>
      </div>
    </div>
  )
}

function RuleHeading({ children }: { children: ReactNode }) {
  return <h3 className="font-serif font-bold text-base mb-3" style={{ color: '#004d34' }}>{children}</h3>
}

function SaveButton({ form }: { form: ReturnType<typeof useManualSection<ManualRules>> }) {
  return (
    <Button onClick={form.save} disabled={!form.dirty || form.saving}>
      {form.saving ? 'Saving…' : form.justSaved ? 'Saved' : 'Save'}
    </Button>
  )
}

function swap<T>(list: T[], a: number, b: number): T[] {
  const next = [...list]
  const tmp = next[a]
  next[a] = next[b]
  next[b] = tmp
  return next
}
