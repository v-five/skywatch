import type { EngineInterface } from 'claude-code'
import { atom, read, update } from 'claude-code'
import type {
  BlackboxEntry,
  Bridge,
  Council,
  CouncilRoster,
  Jump,
  LastJump,
  Probe,
  SessionTotals,
  Shields,
  Shuttle,
  Usage,
  View,
} from '../../types'
import {
  DEFAULT_BRIDGE,
  DEFAULT_COUNCIL,
  DEFAULT_COUNCIL_ROSTER,
  DEFAULT_JUMP,
  DEFAULT_SHIELDS,
  DEFAULT_TOTALS,
  DEFAULT_USAGE,
  DEFAULT_VIEW,
  isCurrentSchema,
  normalizeBlackbox,
  normalizeBridge,
  normalizeCouncil,
  normalizeCouncilRoster,
  normalizeJump,
  normalizeLastJump,
  normalizeMeta,
  normalizeProbes,
  normalizeShields,
  normalizeShuttles,
  normalizeTotals,
  normalizeUsage,
  normalizeView,
  SCHEMA_VERSION,
} from '../domain'

// The engine accepts read and update only on atoms declared here, by literal ref, in the same file.
const meta = atom({ plugin: 'skywatch', key: 'meta' } as const, { schemaVersion: SCHEMA_VERSION })
const bridge = atom({ plugin: 'skywatch', key: 'bridge' } as const, DEFAULT_BRIDGE)
const usage = atom({ plugin: 'skywatch', key: 'usage' } as const, DEFAULT_USAGE)
const council = atom({ plugin: 'skywatch', key: 'council' } as const, DEFAULT_COUNCIL)
const shields = atom({ plugin: 'skywatch', key: 'shields' } as const, DEFAULT_SHIELDS)
const shuttles = atom({ plugin: 'skywatch', key: 'shuttles' } as const, [])
const probes = atom({ plugin: 'skywatch', key: 'probes' } as const, [])
const blackbox = atom({ plugin: 'skywatch', key: 'blackbox' } as const, [])
const jump = atom({ plugin: 'skywatch', key: 'jump' } as const, DEFAULT_JUMP)
const lastJump = atom({ plugin: 'skywatch', key: 'lastJump' } as const, null)
const view = atom({ plugin: 'skywatch', key: 'view' } as const, DEFAULT_VIEW)
const councilRoster = atom({ plugin: 'skywatch', key: 'councilRoster' } as const, DEFAULT_COUNCIL_ROSTER)
const totals = atom({ plugin: 'skywatch', key: 'totals' } as const, DEFAULT_TOTALS)

type Change<T> = (value: T) => T

/** A stored shape older than this build's: drop what cannot be read, keep the rest. */
export async function migrateState($: EngineInterface): Promise<void> {
  if (isCurrentSchema(normalizeMeta(await read($, meta)))) return
  await update($, blackbox, normalizeBlackbox)
  await update($, shuttles, normalizeShuttles)
  await update($, shields, normalizeShields)
  await update($, meta, () => ({ schemaVersion: SCHEMA_VERSION }))
}

export async function getBridge($: EngineInterface): Promise<Bridge> {
  return normalizeBridge(await read($, bridge))
}
export async function patchBridge($: EngineInterface, change: Change<Bridge>): Promise<void> {
  await update($, bridge, stored => change(normalizeBridge(stored)))
}

export async function getUsage($: EngineInterface): Promise<Usage> {
  return normalizeUsage(await read($, usage))
}
export async function patchUsage($: EngineInterface, change: Change<Usage>): Promise<void> {
  await update($, usage, stored => change(normalizeUsage(stored)))
}

export async function getCouncil($: EngineInterface): Promise<Council> {
  return normalizeCouncil(await read($, council))
}
export async function patchCouncil($: EngineInterface, change: Change<Council>): Promise<void> {
  await update($, council, stored => change(normalizeCouncil(stored)))
}

export async function getShields($: EngineInterface): Promise<Shields> {
  return normalizeShields(await read($, shields))
}
export async function patchShields($: EngineInterface, change: Change<Shields>): Promise<void> {
  await update($, shields, stored => change(normalizeShields(stored)))
}

export async function getShuttles($: EngineInterface): Promise<Shuttle[]> {
  return normalizeShuttles(await read($, shuttles))
}
export async function patchShuttles($: EngineInterface, change: Change<Shuttle[]>): Promise<void> {
  await update($, shuttles, stored => change(normalizeShuttles(stored)))
}

export async function getProbes($: EngineInterface): Promise<Probe[]> {
  return normalizeProbes(await read($, probes))
}
export async function patchProbes($: EngineInterface, change: Change<Probe[]>): Promise<void> {
  await update($, probes, stored => change(normalizeProbes(stored)))
}

export async function getBlackbox($: EngineInterface): Promise<BlackboxEntry[]> {
  return normalizeBlackbox(await read($, blackbox))
}
export async function patchBlackbox($: EngineInterface, change: Change<BlackboxEntry[]>): Promise<void> {
  await update($, blackbox, stored => change(normalizeBlackbox(stored)))
}

export async function getJump($: EngineInterface): Promise<Jump> {
  return normalizeJump(await read($, jump))
}
export async function patchJump($: EngineInterface, change: Change<Jump>): Promise<void> {
  await update($, jump, stored => change(normalizeJump(stored)))
}

export async function getLastJump($: EngineInterface): Promise<LastJump | null> {
  return normalizeLastJump(await read($, lastJump))
}
export async function patchLastJump($: EngineInterface, change: Change<LastJump | null>): Promise<void> {
  await update($, lastJump, stored => change(normalizeLastJump(stored)))
}

export async function getView($: EngineInterface): Promise<View> {
  return normalizeView(await read($, view))
}
export async function patchView($: EngineInterface, change: Change<View>): Promise<void> {
  await update($, view, stored => change(normalizeView(stored)))
}

export async function getCouncilRoster($: EngineInterface): Promise<CouncilRoster> {
  return normalizeCouncilRoster(await read($, councilRoster))
}
export async function patchCouncilRoster($: EngineInterface, change: Change<CouncilRoster>): Promise<void> {
  await update($, councilRoster, stored => change(normalizeCouncilRoster(stored)))
}

export async function getTotals($: EngineInterface): Promise<SessionTotals> {
  return normalizeTotals(await read($, totals))
}
export async function patchTotals($: EngineInterface, change: Change<SessionTotals>): Promise<void> {
  await update($, totals, stored => change(normalizeTotals(stored)))
}
