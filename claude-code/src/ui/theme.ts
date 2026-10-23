import type { BlackboxEntry, ShuttleStatus, Verdict } from '../../types'
import { WRITERS } from '../domain'

/** The hazard scale's colours, named for the modules and results that reuse them. */
export const SPACE = {
  clearSpace: '#fef08a',
  stardust: '#bef264',
  nebula: '#4ade80',
  gasCloud: '#22d3ee',
  debris: '#38bdf8',
  asteroids: '#3b82f6',
  ionStorm: '#f97316',
  eventHorizon: '#ef4444',
} as const

/** Modules and results take the hazard colours; greys and body text follow the person's theme. */
export const COLORS = {
  bridge: SPACE.ionStorm,
  shuttles: SPACE.gasCloud,
  shields: SPACE.nebula,
  council: SPACE.asteroids,
  allowed: SPACE.gasCloud,
  cleared: SPACE.nebula,
  waiting: SPACE.clearSpace,
  stopped: SPACE.ionStorm,
  blocked: SPACE.eventHorizon,
  held: SPACE.eventHorizon,
  alert: SPACE.eventHorizon,
  dim: 'inactive',
  faint: 'subtle',
  text: 'text',
} as const

/** SVG cannot name theme keys: mid-tone colours that read on light and dark backgrounds. */
export const SVG_COLORS = { running: SPACE.asteroids, done: '#16a34a', failed: '#dc2626', other: '#8b5cf6', label: '#6b7280' } as const

export const VERDICT_STYLE: Readonly<Record<Verdict, { color: string; word: string }>> = {
  rule: { color: COLORS.allowed, word: 'cleared' },
  cleared: { color: COLORS.cleared, word: 'cleared' },
  ask: { color: COLORS.waiting, word: 'waiting' },
  blocked: { color: COLORS.blocked, word: 'blocked' },
  refused: { color: COLORS.stopped, word: 'stopped' },
  deny: { color: COLORS.stopped, word: 'stopped' },
}

/** A shuttle's status: running is in flight, done has docked, failed is lost. */
export const SHUTTLE_STATUS: Readonly<Record<ShuttleStatus, { word: string; glyph: string; color: string; svgFill: string }>> = {
  running: { word: 'in flight', glyph: '◐', color: COLORS.shuttles, svgFill: SVG_COLORS.running },
  done: { word: 'docked', glyph: '✓', color: COLORS.shields, svgFill: SVG_COLORS.done },
  failed: { word: 'lost', glyph: '✗', color: COLORS.alert, svgFill: SVG_COLORS.failed },
  stopped: { word: 'stopped', glyph: '■', color: COLORS.shuttles, svgFill: SVG_COLORS.other },
}

const WRITER_COLOR: ReadonlyMap<string, string> = new Map([
  [WRITERS.bridge, COLORS.bridge],
  [WRITERS.shields, COLORS.shields],
  [WRITERS.captain, COLORS.text],
])

export function entryColor(entry: BlackboxEntry): string {
  if (entry.kind === 'error') return COLORS.alert
  if (entry.kind === 'transmission') return COLORS.council
  return WRITER_COLOR.get(entry.who) ?? COLORS.shuttles
}
