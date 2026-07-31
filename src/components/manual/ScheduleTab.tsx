import type { ManualInfo, ScheduleEntry } from '../../lib/manual'
import { scheduleByDay } from '../../lib/manual'
import type { TournamentData } from '../../lib/types'
import { RoundBadges, roundDetail } from './round'
import { BareCard, EmptyTab, Lede, List, TimeItem } from './ui'

/**
 * The schedule, exactly as the organiser entered it.
 *
 * Rows sharing a Day become one card, in the order they were added — no
 * sorting, because "Daytime", "AM" and "8:20" don't sort against each other in
 * any way a person would recognise. A row linked to a session picks up that
 * round's format, scoring and course automatically.
 */
export function ScheduleTab({
  info, schedule, data,
}: { info: ManualInfo; schedule: ScheduleEntry[]; data: TournamentData }) {
  if (schedule.length === 0) {
    return <EmptyTab>No schedule yet. The organiser can add one under Event setup → Schedule.</EmptyTab>
  }

  const days = scheduleByDay(schedule)
  const sessions = new Map(data.sessions.map((s) => [s.name, s]))

  return (
    <>
      {info.tagline && <Lede>{info.tagline}</Lede>}
      {days.map((day, i) => (
        <BareCard key={`${day.day}-${i}`} badge={day.day || undefined} badgeTone={i % 2 === 0 ? 'yellow' : 'dark'}>
          <div style={{ padding: '6px 18px 8px' }}>
            <List>
              {day.entries.map((entry, j) => {
                const session = entry.sessionName ? sessions.get(entry.sessionName) : undefined
                // A meal with no time uses "Dinner" as its own gutter label, so
                // the title mustn't fall back to it too and print it twice.
                const time = entry.time || entry.kind
                const title = entry.title || (time === entry.kind ? '' : entry.kind)
                return (
                  <TimeItem
                    key={entry.id}
                    time={time}
                    last={j === day.entries.length - 1}
                    title={
                      <>
                        {title}
                        {session && <RoundBadges session={session} />}
                      </>
                    }
                  >
                    {[session ? roundDetail(session) : '', entry.note].filter(Boolean).join(' · ') || undefined}
                  </TimeItem>
                )
              })}
            </List>
          </div>
        </BareCard>
      ))}
    </>
  )
}
