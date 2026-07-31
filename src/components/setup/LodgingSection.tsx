import type { TournamentData } from '../../lib/types'
import { manualDoc, type ManualLodging } from '../../lib/manual'
import { useManualSection } from './useManualSection'
import { Button, Card, ErrorText, Field, Fieldset, SectionHeading, TextArea, TextInput, YesNo } from './ui'

interface Props {
  apiUrl: string
  slug: string
  data: TournamentData
  onSaved: () => void
}

/**
 * Where everyone is staying. Off by default — plenty of events are a day trip,
 * and an empty Lodging tab is worse than no tab at all.
 *
 * The door code and Wi-Fi password sit behind the tournament link like
 * everything else here, and the link is all anyone needs. Worth knowing before
 * filling those in.
 */
export function LodgingSection({ apiUrl, slug, data, onSaved }: Props) {
  const saved = manualDoc(data.manual).lodging
  const form = useManualSection<ManualLodging>('lodging', saved, { apiUrl, slug, onSaved })
  const { value, patch } = form

  const save = (
    <Button onClick={form.save} disabled={!form.dirty || form.saving}>
      {form.saving ? 'Saving…' : form.justSaved ? 'Saved' : 'Save'}
    </Button>
  )

  return (
    <div>
      <SectionHeading title="Lodging" action={save} />

      <Card>
        <Fieldset label="Include a lodging page" hint="Adds a Lodging tab to the manual.">
          <YesNo value={value.enabled} onChange={(enabled) => patch({ enabled })} yes="Yes" no="No" />
        </Fieldset>
      </Card>

      {value.enabled && (
        <>
          <Card>
            <Field label="Name" hint="Whatever people will call it.">
              <TextInput
                value={value.name}
                maxLength={80}
                placeholder="The Airbnb"
                onChange={(e) => patch({ name: e.target.value })}
              />
            </Field>
            <Field label="Address" hint="Shown as a tappable link that opens in maps.">
              <TextInput
                value={value.address}
                maxLength={200}
                placeholder="58 Pyngyp Road, Stony Point, NY 10980"
                onChange={(e) => patch({ address: e.target.value })}
              />
            </Field>
            <div className="flex gap-2">
              <div className="flex-1">
                <Field label="Check-in">
                  <TextInput
                    value={value.checkIn}
                    maxLength={80}
                    placeholder="Thu Jul 9 · 4:00 PM"
                    onChange={(e) => patch({ checkIn: e.target.value })}
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="Check-out">
                  <TextInput
                    value={value.checkOut}
                    maxLength={80}
                    placeholder="Sun Jul 12 · by 10 AM"
                    onChange={(e) => patch({ checkOut: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-xs text-gray-500 font-body mb-3">
              Anyone with the tournament link can read these. Fine for a group of friends; leave
              them blank if the link is going anywhere wider.
            </p>
            <Field label="Door code">
              <TextInput
                value={value.doorCode}
                maxLength={40}
                onChange={(e) => patch({ doorCode: e.target.value })}
              />
            </Field>
            <div className="flex gap-2">
              <div className="flex-1">
                <Field label="Wi-Fi network">
                  <TextInput
                    value={value.wifiNetwork}
                    maxLength={80}
                    onChange={(e) => patch({ wifiNetwork: e.target.value })}
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="Wi-Fi password">
                  <TextInput
                    value={value.wifiPassword}
                    maxLength={80}
                    onChange={(e) => patch({ wifiPassword: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <Field label="House notes" hint="Quiet hours, parking, who's in which room — anything worth knowing.">
              <TextArea
                value={value.notes}
                maxLength={2000}
                placeholder="No outdoor noise after 8 PM — it's a quiet residential street."
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </Field>
          </Card>
        </>
      )}

      <div className="flex items-center gap-3">
        {save}
        <ErrorText>{form.error}</ErrorText>
      </div>
    </div>
  )
}
