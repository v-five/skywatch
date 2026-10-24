import type { CargoFile, Relay, Satellite, Station } from '../../types'
import { isNumber, isOneOf, isRecord, isString, listOf, shorten } from '../core'

export const DEFAULT_STATION: Station = { edited: [], changes: null, satellites: [], relays: [] }

const EDITED_MAX = 40
const SATELLITES_MAX = 20
const LABEL_MAX = 60
const ERROR_MAX = 120
const SATELLITE_STATUSES = ['running', 'done', 'failed', 'stopped'] as const
const NUMSTAT_LINE = /^(\d+|-)\t(\d+|-)\t(.+)$/
const TASK_ID = /<task-id>\s*([^<\s]+)\s*<\/task-id>/
const TASK_STATUS = /<status>\s*([a-z_]+)\s*<\/status>/i
const STATUS_BY_WORD: ReadonlyMap<string, Satellite['status']> = new Map([
  ['completed', 'done'],
  ['failed', 'failed'],
  ['killed', 'stopped'],
  ['stopped', 'stopped'],
])

function isSatellite(value: unknown): value is Satellite {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.label) &&
    isNumber(value.startedAt) &&
    (value.endedAt === null || isNumber(value.endedAt)) &&
    isOneOf(SATELLITE_STATUSES, value.status)
  )
}

function isRelay(value: unknown): value is Relay {
  return isRecord(value) && isString(value.server) && isNumber(value.calls) && isNumber(value.errors) && isString(value.lastError)
}

function isCargoFile(value: unknown): value is CargoFile {
  return isRecord(value) && isString(value.path) && isNumber(value.added) && isNumber(value.removed)
}

function isEdited(value: unknown): value is Station['edited'][number] {
  return isRecord(value) && isString(value.path) && isNumber(value.edits)
}

export function normalizeStation(stored: unknown): Station {
  const station = isRecord(stored) ? stored : {}
  return {
    edited: listOf(station.edited).filter(isEdited),
    changes: Array.isArray(station.changes) ? station.changes.filter(isCargoFile) : null,
    satellites: listOf(station.satellites).filter(isSatellite),
    relays: listOf(station.relays).filter(isRelay),
  }
}

export function withEdit(station: Station, path: string): Station {
  const before = station.edited.find(file => file.path === path)
  const others = station.edited.filter(file => file.path !== path)
  return { ...station, edited: [...others, { path, edits: (before?.edits ?? 0) + 1 }].slice(-EDITED_MAX) }
}

/** `git diff --numstat` output as files; a binary file counts no lines. */
export function changesOf(numstat: string): CargoFile[] {
  return numstat.split('\n').flatMap(line => {
    const match = NUMSTAT_LINE.exec(line.trim())
    if (!match?.[3]) return []
    return [{ path: match[3], added: Number(match[1]) || 0, removed: Number(match[2]) || 0 }]
  })
}

export function withChanges(station: Station, changes: CargoFile[] | null): Station {
  return { ...station, changes }
}

export function launchSatellite(station: Station, satellite: { id: string; label: string; at: number }): Station {
  const launched: Satellite = {
    id: satellite.id,
    label: shorten(satellite.label, LABEL_MAX),
    startedAt: satellite.at,
    endedAt: null,
    status: 'running',
  }
  return { ...station, satellites: [...station.satellites.filter(each => each.id !== satellite.id), launched].slice(-SATELLITES_MAX) }
}

export function endSatellite(station: Station, id: string, status: Satellite['status'], at: number): Station {
  return {
    ...station,
    satellites: station.satellites.map(each => (each.id === id && each.status === 'running' ? { ...each, status, endedAt: at } : each)),
  }
}

/** A task notification's task and how it ended; null for any other text. */
export function taskNotificationOf(text: string): { id: string; status: Satellite['status'] } | null {
  if (!text.includes('<task-notification>')) return null
  const id = TASK_ID.exec(text)?.[1]
  if (!id) return null
  const word = TASK_STATUS.exec(text)?.[1]?.toLowerCase() ?? 'completed'
  return { id, status: STATUS_BY_WORD.get(word) ?? 'done' }
}

export function withRelayCall(station: Station, server: string, failure: string | null): Station {
  const before = station.relays.find(relay => relay.server === server) ?? { server, calls: 0, errors: 0, lastError: '' }
  const after: Relay = {
    ...before,
    calls: before.calls + 1,
    errors: before.errors + (failure !== null ? 1 : 0),
    lastError: failure !== null ? shorten(failure, ERROR_MAX) : before.lastError,
  }
  return { ...station, relays: [...station.relays.filter(relay => relay.server !== server), after] }
}
