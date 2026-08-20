import { Pool } from 'pg'

// One small pool per serverless instance. Point DATABASE_URL at a
// pooled/pgbouncer endpoint (e.g. Supabase's transaction pooler) so
// concurrent invocations don't exhaust Postgres connections.
let pool: Pool | undefined

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL?.trim()
    if (!connectionString) throw new Error('DATABASE_URL not configured')
    pool = new Pool({ connectionString, max: 1 })
  }
  return pool
}
