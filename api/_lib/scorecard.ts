import Anthropic from '@anthropic-ai/sdk'
import type { Pool } from 'pg'
import type { TournamentRow } from './tournament'
import { ValidationError } from './validate'

/**
 * Read a course scorecard from a photo.
 *
 * This exists because typing an 18-hole card is the most tedious thing in
 * setup, and the stroke indexes — the part that actually drives handicaps —
 * are the easiest to fumble. A photo gets an organiser to a filled-in card in
 * one step.
 *
 * Two things this deliberately does NOT do:
 *
 *  - It never writes to the database. The read is handed back to the browser,
 *    the organiser checks it against the card in their hand, and *they* press
 *    save. A misread stroke index silently misallocates strokes in every match
 *    on that course, and nothing downstream would catch it, so a human has to
 *    look at these numbers before they count for anything.
 *  - It never trusts the model's output shape. Structured outputs constrain
 *    the JSON, but not whether a par is 4 or 40 — every value is re-checked
 *    here, and anything that fails is dropped with a note rather than passed
 *    through.
 *
 * The API key is read from the environment on the server. It must never be
 * exposed to the browser: anything named VITE_* is compiled into the bundle
 * and readable by anyone who opens devtools.
 */

/** Claude's most capable model — small print on a phone photo is hard to read. */
const MODEL = 'claude-opus-5'

/**
 * Bounded extraction, not open-ended reasoning: medium reads cards accurately
 * while keeping the round trip inside a serverless function's lifetime.
 */
const EFFORT = 'medium'

/** Calls per tournament per UTC day. Generous for real use, low enough to bound the bill. */
const DAILY_LIMIT = 40

/**
 * Base64 characters. Vercel caps a serverless request body at 4.5MB and base64
 * inflates by a third, so this leaves room for the JSON around it. The browser
 * downsizes to a fraction of this; the cap is the backstop.
 */
const MAX_IMAGE_BYTES = 4_000_000

const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
type MediaType = (typeof MEDIA_TYPES)[number]

export interface ScorecardHole {
  number: number
  par: number
  strokeIndex: number
}

export interface ScorecardRead {
  success: true
  name: string
  tees: string
  rating: number | null
  slope: number | null
  holes: ScorecardHole[]
  /** Things the organiser needs to look at — unreadable cells, dropped rows. */
  warnings: string[]
}

/**
 * The shape Claude must return. Structured outputs guarantee valid JSON in
 * this shape; they don't guarantee the numbers make sense, which is what
 * `validateRead` below is for.
 *
 * Every field is required so the model can't quietly omit one, and the ones it
 * may not be able to read are nullable so it has a way to say "not on this
 * card" instead of inventing a value.
 */
const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'The golf course name. Empty string if not shown.' },
    tees: { type: 'string', description: 'Which tee set these numbers are for, e.g. "Blue". Empty string if unclear.' },
    rating: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
      description: 'Course rating for these tees, e.g. 71.2. Null if not shown.',
    },
    slope: {
      anyOf: [{ type: 'integer' }, { type: 'null' }],
      description: 'Slope rating for these tees, e.g. 132. Null if not shown.',
    },
    holes: {
      type: 'array',
      description: 'One entry per hole legible on the card. Omit holes you cannot read.',
      items: {
        type: 'object',
        properties: {
          number: { type: 'integer', description: 'Hole number, 1-18.' },
          par: { type: 'integer', description: 'Par for the hole.' },
          strokeIndex: {
            type: 'integer',
            description: 'The hole handicap / stroke index, 1-18. Labelled "Handicap", "HCP", "Index" or "SI".',
          },
        },
        required: ['number', 'par', 'strokeIndex'],
        additionalProperties: false,
      },
    },
    warnings: {
      type: 'array',
      description: 'Anything the organiser should double-check: blurry cells, ambiguous columns, holes you skipped.',
      items: { type: 'string' },
    },
  },
  required: ['name', 'tees', 'rating', 'slope', 'holes', 'warnings'],
  additionalProperties: false,
} as const

const SYSTEM = `You read golf scorecards from photographs and return the data on them.

A scorecard is a grid. Holes run across the columns (1-18, often split 1-9 then
10-18 with OUT/IN/TOTAL summary columns between or after them). Rows carry
yardages per tee colour, then Par, then the hole handicap.

Read these rows:
- Par: usually 3, 4 or 5.
- The hole handicap row, labelled "Handicap", "HCP", "HDCP", "Index", "SI" or
  "Stroke Index". It ranks the holes 1-18 by difficulty and each number is used
  exactly once across the 18 holes. Some cards print separate men's and
  women's handicap rows — use the men's row unless only one is present.

Rules:
- Never guess. If a cell is blurred, cropped, or obscured, leave that hole out
  of the array entirely and say so in warnings. A missing hole is easy for the
  organiser to fill in; a wrong stroke index silently corrupts every handicap
  calculation on this course and nobody will notice.
- Ignore OUT, IN and TOTAL columns. They are sums, not holes.
- Course rating and slope are usually in a small table by the tee colours,
  printed as a pair like "71.2 / 132". Return the pair for the tee set whose
  yardages you read. If several tee sets are shown and you cannot tell which
  one to use, return nulls and say so in warnings.
- If the photo is not a golf scorecard, return empty values and explain in
  warnings.`

/** One read costs money and the endpoint is behind a public link, so count it. */
async function checkAndCountUsage(pool: Pool, tournamentId: string): Promise<void> {
  // Increment first and read the new value back, so two requests racing can't
  // both see "39 used" and both proceed.
  const { rows } = await pool.query<{ count: number }>(
    `insert into ai_usage (tournament_id, day, kind, count)
     values ($1, (now() at time zone 'utc')::date, 'scorecard', 1)
     on conflict (tournament_id, day, kind)
     do update set count = ai_usage.count + 1
     returning count`,
    [tournamentId],
  )
  if (rows[0].count > DAILY_LIMIT) {
    throw new ValidationError(
      `That's ${DAILY_LIMIT} scorecard reads for this tournament today, which is the daily limit. ` +
        `Enter the card by hand for now — the limit resets at midnight UTC.`,
    )
  }
}

export async function readScorecard(
  pool: Pool,
  t: TournamentRow,
  body: Record<string, unknown>,
): Promise<ScorecardRead> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    throw new ValidationError(
      'Scorecard reading is not set up — ANTHROPIC_API_KEY is missing from the server environment.',
    )
  }

  const mediaType = typeof body.mediaType === 'string' ? body.mediaType : ''
  if (!MEDIA_TYPES.includes(mediaType as MediaType)) {
    throw new ValidationError(`Unsupported image type. Use one of: ${MEDIA_TYPES.join(', ')}.`)
  }

  const image = typeof body.image === 'string' ? body.image : ''
  if (!image) throw new ValidationError('No photo received')
  if (image.length > MAX_IMAGE_BYTES) {
    throw new ValidationError('That photo is too large. Try again — the app usually shrinks it first.')
  }

  await checkAndCountUsage(pool, t.id)

  const client = new Anthropic({ apiKey })
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    output_config: { effort: EFFORT, format: { type: 'json_schema', schema: SCHEMA } },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType as MediaType, data: image } },
          { type: 'text', text: 'Read this scorecard.' },
        ],
      },
    ],
  })

  // Safety classifiers can decline a request; that arrives as a 200 with an
  // empty body rather than an error, so it has to be checked before reading
  // content or the next line throws something unhelpful.
  if (message.stop_reason === 'refusal') {
    throw new ValidationError("Claude declined to read that image. Try a photo of just the scorecard.")
  }
  if (message.stop_reason === 'max_tokens') {
    throw new ValidationError('The read was cut short. Try a tighter crop of the scorecard.')
  }

  const text = message.content.find((block) => block.type === 'text')?.text
  if (!text) throw new ValidationError("Couldn't read anything from that photo. Try a clearer picture.")

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new ValidationError("Couldn't make sense of that photo. Try a clearer picture of the scorecard.")
  }

  return validateRead(parsed)
}

/**
 * Re-check everything. Structured outputs constrain the JSON shape but not the
 * values, and JSON Schema numeric bounds aren't supported — so a par of 40 or a
 * stroke index of 0 would come through the format check untouched.
 *
 * Bad rows are dropped with a warning rather than failing the whole read: an
 * organiser would much rather correct two holes than re-take the photo.
 */
function validateRead(input: unknown): ScorecardRead {
  const raw = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>
  const warnings: string[] = Array.isArray(raw.warnings)
    ? raw.warnings.filter((w): w is string => typeof w === 'string').slice(0, 20)
    : []

  const holes: ScorecardHole[] = []
  const seenNumbers = new Set<number>()
  const seenIndexes = new Set<number>()

  for (const entry of Array.isArray(raw.holes) ? raw.holes : []) {
    const row = (typeof entry === 'object' && entry !== null ? entry : {}) as Record<string, unknown>
    const number = int(row.number)
    const par = int(row.par)
    const strokeIndex = int(row.strokeIndex)

    if (number == null || number < 1 || number > 18) continue
    if (seenNumbers.has(number)) {
      warnings.push(`Hole ${number} was read twice — kept the first one.`)
      continue
    }
    if (par == null || par < 3 || par > 6) {
      warnings.push(`Hole ${number}: couldn't read a sensible par, left at the default.`)
      continue
    }
    if (strokeIndex == null || strokeIndex < 1 || strokeIndex > 18) {
      warnings.push(`Hole ${number}: couldn't read a sensible stroke index, left at the default.`)
      continue
    }
    // A repeat means one of the two is misread, and there's no way to tell
    // which — so flag it and let the organiser look rather than pick.
    if (seenIndexes.has(strokeIndex)) {
      warnings.push(`Stroke index ${strokeIndex} was read on more than one hole — check hole ${number}.`)
    }

    seenNumbers.add(number)
    seenIndexes.add(strokeIndex)
    holes.push({ number, par, strokeIndex })
  }

  holes.sort((a, b) => a.number - b.number)

  if (holes.length === 0) {
    warnings.push("No holes could be read from this photo. Check it's a scorecard and the numbers are in focus.")
  } else if (holes.length < 18) {
    const missing = Array.from({ length: 18 }, (_, i) => i + 1).filter((n) => !seenNumbers.has(n))
    warnings.push(
      missing.length === 1
        ? `Hole ${missing[0]} wasn't read — it keeps its current values.`
        : `Holes ${missing.join(', ')} weren't read — those keep their current values.`,
    )
  }

  const rating = num(raw.rating)
  const slope = int(raw.slope)

  return {
    success: true,
    name: str(raw.name, 60),
    tees: str(raw.tees, 30),
    // Out-of-range values are dropped rather than clamped — a clamp would look
    // like a real reading, and these two are easy to type by hand.
    rating: rating != null && rating >= 55 && rating <= 85 ? rating : null,
    slope: slope != null && slope >= 55 && slope <= 155 ? slope : null,
    holes,
    warnings: warnings.slice(0, 25),
  }
}

function int(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10)
  return Number.isInteger(n) ? n : null
}

function num(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''))
  return Number.isFinite(n) ? n : null
}

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}
