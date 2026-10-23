// Ported from Anthropic's blast-radius sample mod (claude-code-playground, 569c528).
// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { type Dir, type Risk, type RiskOf, unmeasured } from '../risk'
import type { Segment } from './types'

const SQL_SUMMARY_MAX = 80
const DB_CLIENT = /(^|[\s;&|(])(psql|mysql|mariadb|sqlite3|sqlcmd|duckdb|clickhouse-client|mongosh)\b/
const DESTRUCTIVE_SQL =
  /\b(drop\s+(?:table|database|schema|view|index|collection)\b[^;'"]*|truncate\s+(?:table\s+)?(?:"[^"]+"|[\w.]+)|delete\s+from\s+(?:"[^"]+"|[\w.]+)(?![^;]*\bwhere\b))/i
/** Commands that only read, so a bare word "migrate" in them is no migration. */
const READ_ONLY: ReadonlySet<string> = new Set(['ls', 'cat', 'echo', 'printf', 'grep', 'rg', 'find', 'less', 'head', 'tail', 'cd', 'git'])

type MigrationTool = RiskOf<'migrate'>['tool']

const MIGRATIONS: readonly (readonly [RegExp, MigrationTool, string])[] = [
  [/\balembic\s+upgrade\b/, 'alembic', 'alembic upgrade'],
  [/\bdb:migrate(?!:status\b)/, 'rails', 'db:migrate'],
  [/\bprisma\s+migrate\b/, 'prisma', 'prisma migrate'],
  [/\bmanage\.py\s+migrate\b/, 'django', 'manage.py migrate'],
]

function migration(tool: MigrationTool, label: string, dir: Dir): Risk {
  return { kind: 'migrate', group: 'database', label, tool, dir }
}

/** A destructive statement passed to a database client, read from the raw line since the SQL sits in quotes. */
export function destructiveSql(raw: string): Risk | null {
  const sql = DB_CLIENT.test(raw) ? DESTRUCTIVE_SQL.exec(raw)?.[1] : undefined
  if (!sql) return null
  const statement = sql.trim().replace(/\s+/g, ' ').slice(0, SQL_SUMMARY_MAX)
  return unmeasured(
    'database',
    'destructive SQL',
    `run ${statement}`,
    null,
    "Rows and tables a statement like this removes can't be brought back without a backup.",
  )
}

/** Rules on any program's words: database drops and migrations, run by whatever tool. */
export function classifyDatabaseWords(segment: Segment, dir: Dir): Risk | null {
  const joined = segment.words.join(' ')
  if (/\bdb:(drop|reset|schema:load)\b/.test(joined)) return unmeasured('database', 'rails db:drop', 'drop or reset the database', dir)
  const known = MIGRATIONS.find(([pattern]) => pattern.test(joined))
  if (known) return migration(known[1], known[2], dir)
  return !READ_ONLY.has(segment.program) && segment.args.includes('migrate') ? migration('unknown', 'migrate', dir) : null
}
