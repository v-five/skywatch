import type { BlackboxEntry, ShuttleStatus, Verdict } from '../../types'
import { WRITERS } from '../domain'
import type { Colors, Role, SvgColors } from './palette'

export const VERDICT_STYLE: Readonly<Record<Verdict, { role: Role; word: string }>> = {
  rule: { role: 'allowed', word: 'cleared' },
  cleared: { role: 'cleared', word: 'cleared' },
  ask: { role: 'waiting', word: 'waiting' },
  blocked: { role: 'blocked', word: 'blocked' },
  refused: { role: 'stopped', word: 'stopped' },
  deny: { role: 'stopped', word: 'stopped' },
}

/** A shuttle's status: running is in flight, done has docked, failed is lost. */
export const SHUTTLE_STATUS: Readonly<Record<ShuttleStatus, { word: string; glyph: string; role: Role; svg: keyof SvgColors }>> = {
  running: { word: 'in flight', glyph: '◐', role: 'shuttles', svg: 'running' },
  done: { word: 'docked', glyph: '✓', role: 'shields', svg: 'done' },
  failed: { word: 'lost', glyph: '✗', role: 'alert', svg: 'failed' },
  stopped: { word: 'stopped', glyph: '■', role: 'shuttles', svg: 'other' },
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
