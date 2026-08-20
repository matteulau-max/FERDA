/**
 * Tee times are stored as 'HH:MM' on a 24-hour clock and read out on a
 * 12-hour one, which is how they're called at the first tee.
 *
 * The conversion is done by hand rather than with `toLocaleTimeString`,
 * because the stored value is a wall-clock time with no date behind it.
 * Building a `Date` to format it would drag it through the viewer's time
 * zone, and an 8:10 tee time would read as 11:10 to someone following the
 * leaderboard from three hours away.
 */
export function formatTeeTime(value: string | undefined | null): string | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec((value ?? '').trim())
  if (!match) return null

  const hours = Number(match[1])
  if (hours > 23 || Number(match[2]) > 59) return null

  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${match[2]} ${hours < 12 ? 'AM' : 'PM'}`
}
