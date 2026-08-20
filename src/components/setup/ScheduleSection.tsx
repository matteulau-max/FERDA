import type { TournamentData } from '../../lib/types'
import {
  SCHEDULE_KINDS,
  manualDoc,
  newId,
  type ManualInfo,
  type ScheduleEntry,
} from '../../lib/manual'
import { useManualSection } from './useManualSection'
import {
  Button,
  Card,
  ErrorText,
  Field,
  SectionHeading,
  Select,
  TextArea,
  TextInput,
} from './ui'

interface Props {
  apiUrl: string
  slug: string
  data: TournamentData
  onSaved: () => void
}

/**
 * The schedule, plus the two lines under the tournament name.
 *
 * Day and time are free text on purpose. Real golf weekends are full of
 * "Daytime", "AM", "Midday" and "After the round", and a date picker would
 * force those into times nobody actually agreed on. Entries stay in the order
 * they're added and group under whatever day string they share, so "Fri 7/10"
 * and "Friday" are simply two different days — spell them consistently.
 */
export function ScheduleSection({ apiUrl, slug, data, onSaved }: Props) {
  const doc = manualDoc(data.manual)
  const info = useManualSection<ManualInfo>('info', doc.info, { apiUrl, slug, onSaved })
  const schedule = useManualSection<ScheduleEntry[]>('schedule', doc.schedule, { apiUrl, slug, onSaved })

  const entries = schedule.value
  const setEntries = schedule.setValue

  function update(i: number, fields: Partial<ScheduleEntry>) {
    setEntries(entries.map((e, j) => (j === i ? { ...e, ...fields } : e)))
  }

  function add() {
    // Inherit the last row's day: a schedule is written a day at a time.
    const day = entries.length ? entries[entries.length - 1].day : ''
    setEntries([...entries, { id: newId('entry'), day, time: '', kind: 'Event', title: '', note: '', sessionName: '' }])
  }

  return (
    <div>
      <SectionHeading title="Schedule" />

      <Card>
        <h3 className="font-serif font-bold text-base mb-3" style={{ color: '#004d34' }}>
          Event details
        </h3>
        <p className="text-xs text-gray-500 font-body mb-3">
          Shown under the tournament name at the top of the manual.
        </p>
        <Field label="Dates">
          <TextInput
            value={info.value.dates}
            maxLength={60}
            placeholder="July 9–12, 2026"
            onChange={(e) => info.patch({ dates: e.target.value })}
          />
        </Field>
        <Field label="Location">
          <TextInput
            value={info.value.location}
            maxLength={80}
            placeholder="Stony Point, New York"
            onChange={(e) => info.patch({ location: e.target.value })}
          />
        </Field>
        <Field label="Tagline" hint="One line at the top of the schedule. Optional.">
          <TextInput
            value={info.value.tagline}
            maxLength={120}
            placeholder="Four days. Two teams. One champion."
            onChange={(e) => info.patch({ tagline: e.target.value })}
          />
        </Field>
        <Button onClick={info.save} disabled={!info.dirty || info.saving}>
          {info.saving ? 'Saving…' : info.justSaved ? 'Saved' : 'Save details'}
        </Button>
        <ErrorText>{info.error}</ErrorText>
      </Card>

      <div className="flex items-center justify-between mb-2 mt-5">
        <h3 className="font-serif font-bold text-base" style={{ color: '#004d34' }}>
          The days
        </h3>
        <Button onClick={schedule.save} disabled={!schedule.dirty || schedule.saving}>
          {schedule.saving ? 'Saving…' : schedule.justSaved ? 'Saved' : 'Save schedule'}
        </Button>
      </div>
      <p className="text-xs text-gray-500 font-body mb-3">
        Rows sharing the same Day are grouped together, in the order you add them.
      </p>

      {entries.length === 0 && (
        <p className="text-sm text-gray-500 font-body py-3">
          Nothing scheduled yet. Without any rows the Schedule tab stays hidden.
        </p>
      )}

      {entries.map((entry, i) => (
        <Card key={entry.id}>
          <div className="flex gap-2">
            <div className="flex-1">
              <Field label="Day">
                <TextInput
                  value={entry.day}
                  maxLength={40}
                  placeholder="Fri 7/10"
                  onChange={(e) => update(i, { day: e.target.value })}
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Time">
                <TextInput
                  value={entry.time}
                  maxLength={40}
                  placeholder="8:20 AM"
                  onChange={(e) => update(i, { time: e.target.value })}
                />
              </Field>
            </div>
          </div>

          <Field label="Type">
            <Select value={entry.kind} onChange={(e) => update(i, { kind: e.target.value as ScheduleEntry['kind'] })}>
              {SCHEDULE_KINDS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </Select>
          </Field>

          <Field
            label={entry.kind === 'Event' ? 'Event' : `${entry.kind} — what's the plan?`}
            hint={entry.kind === 'Event' ? undefined : 'Leave blank to just show the meal on the schedule.'}
          >
            <TextInput
              value={entry.title}
              maxLength={120}
              placeholder={entry.kind === 'Event' ? 'Round 1 · Patriot Hills' : 'Grill out at the house'}
              onChange={(e) => update(i, { title: e.target.value })}
            />
          </Field>

          {entry.kind === 'Event' && data.sessions.length > 0 && (
            <Field
              label="Round"
              hint="Optional. Links this row to a session so it shows that round's format, scoring and course."
            >
              <Select
                value={entry.sessionName}
                onChange={(e) => update(i, { sessionName: e.target.value })}
              >
                <option value="">Not a scored round</option>
                {data.sessions.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Note" hint="Optional. Tee times, cost, an address, whatever people need.">
            <TextArea
              rows={2}
              value={entry.note}
              maxLength={500}
              placeholder="Tee times 8:20 / 8:30 / 8:40 · $100 with cart"
              onChange={(e) => update(i, { note: e.target.value })}
            />
          </Field>

          <div className="flex gap-2">
            <Button variant="ghost" disabled={i === 0} onClick={() => setEntries(swap(entries, i, i - 1))}>
              ↑
            </Button>
            <Button
              variant="ghost"
              disabled={i === entries.length - 1}
              onClick={() => setEntries(swap(entries, i, i + 1))}
            >
              ↓
            </Button>
            <Button variant="danger" onClick={() => setEntries(entries.filter((_, j) => j !== i))}>
              Remove
            </Button>
          </div>
        </Card>
      ))}

      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={add}>Add row</Button>
        <Button onClick={schedule.save} disabled={!schedule.dirty || schedule.saving}>
          {schedule.saving ? 'Saving…' : schedule.justSaved ? 'Saved' : 'Save schedule'}
        </Button>
        <ErrorText>{schedule.error}</ErrorText>
      </div>
    </div>
  )
}

function swap<T>(list: T[], a: number, b: number): T[] {
  const next = [...list]
  const tmp = next[a]
  next[a] = next[b]
  next[b] = tmp
  return next
}
