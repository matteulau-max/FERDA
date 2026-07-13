#!/usr/bin/env node
/**
 * Import a tournament into Postgres.
 *
 * The source is either the existing deployed API (Apps Script or this app's
 * /api/exec) or a JSON file containing TournamentData (src/lib/types.ts shape).
 *
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/seed.mjs \
 *     --source https://your-app.vercel.app/api/exec \
 *     --slug ferda-2026 --name "FERDA Invitational 2026"
 *
 *   node scripts/seed.mjs --source tournament.json --slug ferda-2026
 *
 * Options:
 *   --source  URL or file path of TournamentData JSON (required)
 *   --slug    URL-safe tournament identifier (required)
 *   --name    Display name (defaults to the slug)
 *   --force   Replace the tournament if the slug already exists
 */
import { readFile } from 'node:fs/promises'
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

function validate(data) {
  if (!data?.teams?.team1?.name || !data?.teams?.team2?.name) throw new Error('Source JSON missing teams')
  if (!Array.isArray(data.courses) || data.courses.length === 0) throw new Error('Source JSON missing courses')
  if (!Array.isArray(data.players) || data.players.length === 0) throw new Error('Source JSON missing players')
  if (!Array.isArray(data.sessions)) throw new Error('Source JSON missing sessions')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.source || !args.slug) {
    console.error('Required: --source <url-or-file> --slug <slug>   (see header comment for usage)')
    process.exit(1)
  }
  if (!process.env.DATABASE_URL) {
    console.error('Set DATABASE_URL to your Postgres connection string')
    process.exit(1)
  }

  const data = await loadTournamentData(args.source)
  validate(data)

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  try {
    await client.query('begin')

    const existing = await client.query('select id from tournaments where slug = $1', [args.slug])
    if (existing.rows[0]) {
      if (!args.force) throw new Error(`Tournament '${args.slug}' already exists — pass --force to replace it`)
      console.log(`Deleting existing tournament '${args.slug}'`)
      await client.query('delete from tournaments where id = $1', [existing.rows[0].id])
    }

    const { rows: [tournament] } = await client.query(
      `insert into tournaments (slug, name, team1_name, team2_name)
       values ($1, $2, $3, $4) returning id`,
      [args.slug, args.name ?? args.slug, data.teams.team1.name, data.teams.team2.name],
    )
    const tid = tournament.id

    for (const course of data.courses) {
      const { rows: [c] } = await client.query(
        `insert into courses (tournament_id, name, rating, slope, par)
         values ($1, $2, $3, $4, $5) returning id`,
        [tid, course.name, course.rating, course.slope, course.par],
      )
      for (const hole of course.holes) {
        await client.query(
          'insert into holes (course_id, number, par, stroke_index) values ($1, $2, $3, $4)',
          [c.id, hole.number, hole.par, hole.strokeIndex],
        )
      }
    }

    for (const player of data.players) {
      await client.query(
        'insert into players (tournament_id, name, handicap_index, team) values ($1, $2, $3, $4)',
        [tid, player.name, player.handicapIndex, player.team],
      )
    }

    let scoreCount = 0
    for (const session of data.sessions) {
      await client.query(
        `insert into sessions (tournament_id, name, format, scoring, sort_order, course_name)
         values ($1, $2, $3, $4, $5, $6)`,
        [tid, session.name, session.format, session.scoring ?? null, session.sortOrder, session.courseName],
      )
      for (const match of session.matches ?? []) {
        await client.query(
          `insert into matches (tournament_id, id, session_name, team1_players, team2_players, sort_order)
           values ($1, $2, $3, $4, $5, $6)`,
          [tid, match.id, session.name, match.team1Players, match.team2Players, match.sortOrder],
        )
        for (const [hole, sides] of Object.entries(match.scores ?? {})) {
          for (const side of ['team1', 'team2']) {
            for (const [player, gross] of Object.entries(sides[side] ?? {})) {
              await client.query(
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

    await client.query('commit')
    const matchCount = data.sessions.reduce((n, s) => n + (s.matches?.length ?? 0), 0)
    console.log(
      `Imported '${args.slug}': ${data.courses.length} courses, ${data.players.length} players, ` +
      `${data.sessions.length} sessions, ${matchCount} matches, ${scoreCount} scores`,
    )
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
