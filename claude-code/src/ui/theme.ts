import type { BlackboxEntry, ShuttleStatus, Verdict } from '../../types'
import { WRITERS } from '../domain'
import type { Colors, Role } from './palette'

export const VERDICT_STYLE: Readonly<Record<Verdict, { role: Role; word: string }>> = {
  rule: { role: 'allowed', word: 'cleared' },
  cleared: { role: 'cleared', word: 'cleared' },
  ask: { role: 'waiting', word: 'waiting' },
  blocked: { role: 'blocked', word: 'blocked' },
  refused: { role: 'stopped', word: 'stopped' },
  deny: { role: 'stopped', word: 'stopped' },
}

/** A shuttle's status: running is in flight, done has docked, failed is lost. */
export const SHUTTLE_STATUS: Readonly<Record<ShuttleStatus, { word: string; glyph: string; role: Role }>> = {
  running: { word: 'in flight', glyph: '◐', role: 'shuttles' },
  done: { word: 'docked', glyph: '✓', role: 'shields' },
  failed: { word: 'lost', glyph: '✗', role: 'alert' },
  stopped: { word: 'stopped', glyph: '■', role: 'shuttles' },
}

const WRITER_ROLE: ReadonlyMap<string, Role> = new Map([
  [WRITERS.bridge, 'bridge'],
  [WRITERS.shields, 'shields'],
  [WRITERS.captain, 'text'],
])

export function entryColor(entry: BlackboxEntry, colors: Colors): string {
  if (entry.kind === 'error') return colors.alert
  if (entry.kind === 'transmission') return colors.council
  return colors[WRITER_ROLE.get(entry.who) ?? 'shuttles']
}
