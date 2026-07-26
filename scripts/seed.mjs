#!/usr/bin/env node
/**
 * Import a tournament into Postgres.
 *
 * The source is either the existing deployed API (Apps Script or this app's
 * /api/exec) or a JSON file containing TournamentData (src/lib/types.ts shape).
 *
 * Two output modes:
 *   - default: write straight to the database at DATABASE_URL
 *   - --emit-sql <file>: write a .sql file instead, to paste into the
 *     Supabase SQL editor. Needs no database credentials.
 *
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/seed.mjs \
 *     --source https://your-app.vercel.app/api/exec \
 *     --slug ferda-2026 --name "FERDA Invitational"
 *
 *   node scripts/seed.mjs --source tournament.json --slug ferda-2026 \
 *     --emit-sql seed.sql
 *
 * Options:
 *   --source    URL or file path of TournamentData JSON (required)
 *   --slug      URL-safe tournament identifier (required)
 *   --name      Display name (defaults to the slug)
 *   --emit-sql  Write SQL to this path instead of connecting to a database
 *   --force     Replace the tournament if the slug already exists
 */
import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import pg from 'pg'

function parseArgs(argv) {
  const args = { force: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--force') args.force = true
    else if (arg === '--source') args.source = argv[++i]
    else if (arg === '--slug') args.slug = argv[++i]
    else if (arg === '--name') args.name = argv[++i]
    else if (arg === '--emit-sql') args.emitSql = argv[++i]
    else if (arg === '--default-course') args.defaultCourse = argv[++i]
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

async function loadTournamentData(source) {
  if (/^https?:\/\//.test(source)) {
    const url = `${source}${source.includes('?') ? '&' : '?'}action=getTournament`
    console.log(`Fetching ${url}`)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)
    return res.json()
  }
  console.log(`Reading ${source}`)
  return JSON.parse(await readFile(source, 'utf8'))
}

/**
 * Fill in sessions that carry no course. Older Apps Script deployments did not
 * serve a courseName, and the app silently fell back to the first course; this
 * makes that fallback explicit and recorded rather than implicit.
 */
function applyDefaultCourse(data, defaultCourse) {
  if (!defaultCourse) return
  const known = new Set((data.courses ?? []).map((c) => c.name))
  if (!known.has(defaultCourse)) {
    throw new Error(`--default-course '${defaultCourse}' is not one of: ${[...known].join(', ')}`)
  }
  let filled = 0
  for (const session of data.sessions ?? []) {
    if (!known.has(session.courseName)) {
      session.courseName = defaultCourse
      filled++
    }
  }
  if (filled) console.log(`Assigned '${defaultCourse}' to ${filled} session(s) with no course`)
}

/**
 * Check the source data against everything db/schema.sql constrains, so a bad
 * import fails with a readable list instead of one cryptic Postgres error.
 * Errors block the import; warnings are things the app tolerates but that
 * usually mean a typo in the source spreadsheet.
 */
function validate(data) {
  const errors = []
  const warnings = []

  if (!data?.teams?.team1?.name || !data?.teams?.team2?.name) errors.push('Missing teams.team1.name / teams.team2.name')
  if (!Array.isArray(data.courses) || data.courses.length === 0) errors.push('No courses')
  if (!Array.isArray(data.players) || data.players.length === 0) errors.push('No players')
  if (!Array.isArray(data.sessions)) errors.push('No sessions array')
  if (errors.length) throw new Error(`Source data unusable:\n  - ${errors.join('\n  - ')}`)

  const courseNames = new Set()
  for (const c of data.courses) {
    if (!c.name) errors.push('A course has no name')
    if (courseNames.has(c.name)) errors.push(`Duplicate course name: ${c.name}`)
    courseNames.add(c.name)
    if (!(c.slope >= 55 && c.slope <= 155)) errors.push(`Course '${c.name}': slope ${c.slope} outside 55-155`)
    if (!(c.rating > 0)) errors.push(`Course '${c.name}': invalid rating ${c.rating}`)
    if (!(c.par > 0)) errors.push(`Course '${c.name}': invalid par ${c.par}`)

    const holes = c.holes ?? []
    if (holes.length !== 18) warnings.push(`Course '${c.name}': ${holes.length} holes, expected 18`)
    const seenNumbers = new Set()
    const seenIndexes = new Set()
    for (const h of holes) {
      if (!(h.number >= 1 && h.number <= 18)) errors.push(`Course '${c.name}': hole number ${h.number} outside 1-18`)
      if (!(h.par >= 3 && h.par <= 6)) errors.push(`Course '${c.name}' hole ${h.number}: par ${h.par} outside 3-6`)
      if (!(h.strokeIndex >= 1 && h.strokeIndex <= 18)) errors.push(`Course '${c.name}' hole ${h.number}: stroke index ${h.strokeIndex} outside 1-18`)
      if (seenNumbers.has(h.number)) errors.push(`Course '${c.name}': duplicate hole number ${h.number}`)
      if (seenIndexes.has(h.strokeIndex)) warnings.push(`Course '${c.name}': duplicate stroke index ${h.strokeIndex}`)
      seenNumbers.add(h.number)
      seenIndexes.add(h.strokeIndex)
    }
  }

  const playerNames = new Set()
  for (const p of data.players) {
    if (!p.name) errors.push('A player has no name')
    if (playerNames.has(p.name)) errors.push(`Duplicate player name: ${p.name}`)
    playerNames.add(p.name)
    if (p.team !== 1 && p.team !== 2) errors.push(`Player '${p.name}': team must be 1 or 2, got ${p.team}`)
    if (typeof p.handicapIndex !== 'number' || Number.isNaN(p.handicapIndex)) {
      errors.push(`Player '${p.name}': invalid handicap index ${p.handicapIndex}`)
    }
  }

  const FORMATS = ['Singles', 'Best Ball', 'Scramble', '2v1']
  const sessionNames = new Set()
  const matchIds = new Set()
  for (const s of data.sessions) {
    if (!s.name) errors.push('A session has no name')
    if (sessionNames.has(s.name)) errors.push(`Duplicate session name: ${s.name}`)
    sessionNames.add(s.name)
    if (!FORMATS.includes(s.format)) errors.push(`Session '${s.name}': unknown format '${s.format}'`)
    if (s.scoring && s.scoring !== 'Match Play' && s.scoring !== 'Stroke Play') {
      errors.push(`Session '${s.name}': unknown scoring '${s.scoring}'`)
    }
    // Not a foreign key in the schema, but the app can't compute handicaps
    // for a session whose course it can't find.
    if (!courseNames.has(s.courseName)) errors.push(`Session '${s.name}': courseName '${s.courseName}' matches no course`)

    for (const m of s.matches ?? []) {
      if (!m.id) errors.push(`Session '${s.name}': a match has no id`)
      if (matchIds.has(m.id)) errors.push(`Duplicate match id: ${m.id}`)
      matchIds.add(m.id)
      const roster = [...(m.team1Players ?? []), ...(m.team2Players ?? [])]
      if (roster.length === 0) errors.push(`Match ${m.id}: no players`)
      for (const name of roster) {
        if (!playerNames.has(name)) errors.push(`Match ${m.id}: player '${name}' is not in the Players list`)
      }
      // A player scoring outside the match roster is usually one typo
      // repeated across every hole, so count holes and report it once.
      const strayHoles = new Map()
      for (const [hole, sides] of Object.entries(m.scores ?? {})) {
        const holeNum = parseInt(hole, 10)
        if (!(holeNum >= 1 && holeNum <= 18)) errors.push(`Match ${m.id}: score on hole ${hole}, outside 1-18`)
        for (const side of ['team1', 'team2']) {
          for (const [name, gross] of Object.entries(sides[side] ?? {})) {
            if (!(gross >= 1 && gross <= 20)) errors.push(`Match ${m.id} hole ${hole}: '${name}' scored ${gross}, outside 1-20`)
            if (!roster.includes(name)) strayHoles.set(name, (strayHoles.get(name) ?? 0) + 1)
          }
        }
      }
      for (const [name, count] of strayHoles) {
        warnings.push(`Match ${m.id}: '${name}' has scores on ${count} hole(s) but is not in this match`)
      }
    }
  }

  for (const w of warnings) console.warn(`  warning: ${w}`)
  if (errors.length) {
    throw new Error(`Source data has ${errors.length} problem(s):\n  - ${errors.join('\n  - ')}`)
  }
}

// --- Output targets --------------------------------------------------------
// Both expose query(sql, params); the caller builds statements once and either
// executes them or renders them to a file.

function makeDbTarget(client) {
  return {
    query: (sql, params) => client.query(sql, params),
    async begin() { await client.query('begin') },
    async commit() { await client.query('commit') },
    async rollback() { await client.query('rollback') },
    async finish() {},
  }
}

function literal(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return `array[${value.map(literal).join(', ')}]`
  return `'${String(value).replace(/'/g, "''")}'`
}

function makeSqlTarget(path) {
  const lines = []
  return {
    async query(sql, params = []) {
      // Inline $1..$n placeholders as escaped literals.
      const rendered = sql
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\$(\d+)/g, (_, n) => literal(params[Number(n) - 1]))
      lines.push(`${rendered};`)
      return { rows: [] }
    },
    async begin() { lines.push('begin;') },
    async commit() { lines.push('commit;') },
    async rollback() {},
    async finish() {
      await writeFile(path, `${lines.join('\n')}\n`)
      console.log(`Wrote ${lines.length} statements to ${path}`)
    },
  }
}

// --- Import ----------------------------------------------------------------

async function importTournament(target, data, args) {
  await target.begin()

  // Ids are generated here rather than by database defaults so that the
  // SQL-emit path can reference them without reading anything back.
  const tid = randomUUID()

  if (args.force) {
    await target.query('delete from tournaments where slug = $1', [args.slug])
  }

  await target.query(
    `insert into tournaments (id, slug, name, team1_name, team2_name)
     values ($1, $2, $3, $4, $5)`,
    [tid, args.slug, args.name ?? args.slug, data.teams.team1.name, data.teams.team2.name],
  )

  for (const course of data.courses) {
    const courseId = randomUUID()
    await target.query(
      `insert into courses (id, tournament_id, name, rating, slope, par)
       values ($1, $2, $3, $4, $5, $6)`,
      [courseId, tid, course.name, course.rating, course.slope, course.par],
    )
    for (const hole of course.holes) {
      await target.query(
        'insert into holes (course_id, number, par, stroke_index) values ($1, $2, $3, $4)',
        [courseId, hole.number, hole.par, hole.strokeIndex],
      )
    }
  }

  for (const player of data.players) {
    await target.query(
      'insert into players (id, tournament_id, name, handicap_index, team) values ($1, $2, $3, $4, $5)',
      [randomUUID(), tid, player.name, player.handicapIndex, player.team],
    )
  }

  let scoreCount = 0
  for (const session of data.sessions) {
    await target.query(
      `insert into sessions (id, tournament_id, name, format, scoring, sort_order, course_name)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [randomUUID(), tid, session.name, session.format, session.scoring ?? null, session.sortOrder, session.courseName],
    )
    for (const match of session.matches ?? []) {
      await target.query(
        `insert into matches (tournament_id, id, session_name, team1_players, team2_players, sort_order)
         values ($1, $2, $3, $4, $5, $6)`,
        [tid, match.id, session.name, match.team1Players, match.team2Players, match.sortOrder],
      )
      for (const [hole, sides] of Object.entries(match.scores ?? {})) {
        for (const side of ['team1', 'team2']) {
          for (const [player, gross] of Object.entries(sides[side] ?? {})) {
            await target.query(
              `insert into scores (tournament_id, match_id, hole, side, player, gross_score)
               values ($1, $2, $3, $4, $5, $6)`,
              [tid, match.id, parseInt(hole, 10), side, player, gross],
            )
            scoreCount++
          }
        }
      }
    }
  }

  await target.commit()

  const matchCount = data.sessions.reduce((n, s) => n + (s.matches?.length ?? 0), 0)
  console.log(
    `Imported '${args.slug}': ${data.courses.length} courses, ${data.players.length} players, ` +
    `${data.sessions.length} sessions, ${matchCount} matches, ${scoreCount} scores`,
  )
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.source || !args.slug) {
    console.error('Required: --source <url-or-file> --slug <slug>   (see header comment for usage)')
    process.exit(1)
  }
  if (!args.emitSql && !process.env.DATABASE_URL) {
    console.error('Set DATABASE_URL, or pass --emit-sql <file> to write SQL instead')
    process.exit(1)
  }

  const data = await loadTournamentData(args.source)
  applyDefaultCourse(data, args.defaultCourse)
  validate(data)

  if (args.emitSql) {
    const target = makeSqlTarget(args.emitSql)
    await importTournament(target, data, args)
    await target.finish()
    return
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  const target = makeDbTarget(client)

  try {
    if (!args.force) {
      const existing = await client.query('select id from tournaments where slug = $1', [args.slug])
      if (existing.rows[0]) {
        throw new Error(`Tournament '${args.slug}' already exists — pass --force to replace it`)
      }
    }
    await importTournament(target, data, args)
  } catch (err) {
    await target.rollback()
    throw err
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
