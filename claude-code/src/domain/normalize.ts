import type {
  BlackboxEntry,
  Bridge,
  Check,
  Council,
  CouncilRoster,
  EntryKind,
  Jump,
  LastJump,
  Meta,
  PlanStatus,
  PlanStep,
  Probe,
  RateLimit,
  SessionTotals,
  Shields,
  Shuttle,
  ShuttleStatus,
  Tally,
  ToolNote,
  Transmission,
  Usage,
  Verdict,
  View,
} from '../../types'
import { isDeck, isHazardMode, isNumber, isOneOf, isRecord, isString, listOf, mergeDefaults } from '../core'
import { MOMENTS } from './council'
import {
  DEFAULT_AVG,
  DEFAULT_BRIDGE,
  DEFAULT_COST,
  DEFAULT_COUNCIL,
  DEFAULT_COUNCIL_ROSTER,
  DEFAULT_HELD,
  DEFAULT_JUMP,
  DEFAULT_LAST_JUMP,
  DEFAULT_PROBE,
  DEFAULT_SHIELDS,
  DEFAULT_SHUTTLE,
  DEFAULT_TOTALS,
  DEFAULT_USAGE,
  DEFAULT_VIEW,
  SCHEMA_VERSION,
  ZERO_TALLY,
} from './defaults'

const ENTRY_KINDS = ['info', 'error', 'transmission', 'done'] as const satisfies readonly EntryKind[]
const SHUTTLE_STATUSES = ['running', 'done', 'stopped', 'failed'] as const satisfies readonly ShuttleStatus[]
const VERDICTS = ['rule', 'ask', 'cleared', 'refused', 'deny', 'blocked'] as const satisfies readonly Verdict[]

const DEFAULT_LIMIT: RateLimit = { kind: '', pct: 0 }
const DEFAULT_TRANSMISSION: Transmission = { id: '', at: 0, endAt: null, moment: 'before a plan', via: '' }
const DEFAULT_TOOL_NOTE: ToolNote = { tool: '', text: '', isError: false }

const isSpeed = (value: unknown) => isRecord(value) && isNumber(value.ttftMs) && (value.tokPerS === null || isNumber(value.tokPerS))

export function normalizeMeta(stored: unknown): Meta {
  return mergeDefaults({ schemaVersion: 0 }, stored)
}

const PLAN_STATUSES = ['pending', 'running', 'done', 'skipped'] as const satisfies readonly PlanStatus[]

function isPlanStep(value: unknown): value is PlanStep {
  return isRecord(value) && typeof value.text === 'string' && isOneOf(PLAN_STATUSES, value.status)
}

export function normalizeBridge(stored: unknown): Bridge {
  const bridge = mergeDefaults(DEFAULT_BRIDGE, stored, {
    speed: isSpeed,
    doing: isString,
    doingTitle: isString,
    command: isString,
    task: isString,
  })
  return {
    ...bridge,
    plan: listOf(bridge.plan).filter(isString),
    planSteps: listOf(bridge.planSteps).filter(isPlanStep),
    avg: mergeDefaults(DEFAULT_AVG, bridge.avg),
  }
}

export function normalizeUsage(stored: unknown): Usage {
  const usage = mergeDefaults(DEFAULT_USAGE, stored, { pct: isNumber, tokens: isNumber, costUsd: isNumber, lastCompactAt: isNumber })
  return {
    ...usage,
    limits: listOf(usage.limits)
      .filter(isRecord)
      .map(limit => mergeDefaults(DEFAULT_LIMIT, limit)),
    history: listOf(usage.history).filter(isNumber),
  }
}

function normalizeTransmission(stored: Record<string, unknown>): Transmission {
  const transmission = mergeDefaults(DEFAULT_TRANSMISSION, stored, { endAt: isNumber })
  return { ...transmission, moment: isOneOf(MOMENTS, transmission.moment) ? transmission.moment : DEFAULT_TRANSMISSION.moment }
}

export function normalizeCouncil(stored: unknown): Council {
  const council = mergeDefaults(DEFAULT_COUNCIL, stored)
  return {
    ...council,
    transmissions: listOf(council.transmissions).filter(isRecord).map(normalizeTransmission),
    ids: listOf(council.ids).filter(isString),
    seen: listOf(council.seen).filter(isString),
  }
}

const DEFAULT_CHECK: Check = { id: '', tool: '', deck: 'other', verdict: 'deny', inSubagent: false, detail: '', at: 0 }

/** A stored check whose verdict or deck is unknown reads as stopped, on the `other` deck. */
function normalizeCheck(stored: Record<string, unknown>): Check {
  const check = mergeDefaults(DEFAULT_CHECK, stored)
  return { ...check, verdict: isOneOf(VERDICTS, check.verdict) ? check.verdict : 'deny', deck: isDeck(check.deck) ? check.deck : 'other' }
}

/** A check without an id can never settle: it is dropped. */
const hasId = (stored: Record<string, unknown>) => typeof stored.id === 'string' && stored.id !== ''

export function normalizeShields(stored: unknown): Shields {
  const shields = mergeDefaults(DEFAULT_SHIELDS, stored)
  const totals = mergeDefaults(DEFAULT_SHIELDS.totals, shields.totals)
  return {
    recent: listOf(shields.recent).filter(isRecord).filter(hasId).map(normalizeCheck),
    totals: Object.fromEntries(
      Object.entries(totals)
        .filter(([deck]) => isDeck(deck))
        .map(([deck, tally]) => [deck, mergeDefaults<Tally>(ZERO_TALLY, tally)]),
    ),
    held: mergeDefaults(DEFAULT_HELD, shields.held),
  }
}

/** A stored shuttle in a status this build does not know has landed: it reads as stopped. */
function normalizeShuttle(stored: unknown): Shuttle {
  const shuttle = mergeDefaults(DEFAULT_SHUTTLE, stored, {
    endedAt: isNumber,
    lastStop: isString,
    doing: isString,
    doingTitle: isString,
    task: isString,
    speed: isSpeed,
  })
  return {
    ...shuttle,
    status: isOneOf(SHUTTLE_STATUSES, shuttle.status) ? shuttle.status : 'stopped',
    tools: listOf(shuttle.tools)
      .filter(isRecord)
      .map(note => mergeDefaults(DEFAULT_TOOL_NOTE, note)),
    avg: mergeDefaults(DEFAULT_AVG, shuttle.avg),
  }
}

export function normalizeShuttles(stored: unknown): Shuttle[] {
  return listOf(stored).map(normalizeShuttle)
}

export function normalizeProbes(stored: unknown): Probe[] {
  return listOf(stored).map(probe => mergeDefaults(DEFAULT_PROBE, probe))
}

function normalizeEntry(stored: unknown): BlackboxEntry {
  const entry = isRecord(stored) ? stored : {}
  return {
    at: typeof entry.at === 'number' ? entry.at : 0,
    who: String(entry.who ?? ''),
    text: String(entry.text ?? ''),
    agentId: typeof entry.agentId === 'string' ? entry.agentId : null,
    kind: isOneOf(ENTRY_KINDS, entry.kind) ? entry.kind : 'info',
    cost: isRecord(entry.cost) ? mergeDefaults(DEFAULT_COST, entry.cost, { usd: isNumber }) : null,
  }
}

export function normalizeBlackbox(stored: unknown): BlackboxEntry[] {
  return listOf(stored).map(normalizeEntry)
}

export function normalizeJump(stored: unknown): Jump {
  return mergeDefaults(DEFAULT_JUMP, stored, { costAtStart: isNumber, promptAt: isNumber })
}

export function normalizeLastJump(stored: unknown): LastJump | null {
  return isRecord(stored) ? mergeDefaults(DEFAULT_LAST_JUMP, stored, { costDelta: isNumber }) : null
}

export function normalizeView(stored: unknown): View {
  const view = mergeDefaults(DEFAULT_VIEW, stored, { expanded: isString, deckOpen: isDeck, hazards: isHazardMode })
  return { ...view, unfolded: listOf(view.unfolded).filter(isString), folded: listOf(view.folded).filter(isString) }
}

export function normalizeCouncilRoster(stored: unknown): CouncilRoster {
  return { councilTypes: listOf(mergeDefaults(DEFAULT_COUNCIL_ROSTER, stored).councilTypes).filter(isString) }
}

export function normalizeTotals(stored: unknown): SessionTotals {
  return mergeDefaults(DEFAULT_TOTALS, stored)
}

export function isCurrentSchema(meta: Meta): boolean {
  return meta.schemaVersion >= SCHEMA_VERSION
}
