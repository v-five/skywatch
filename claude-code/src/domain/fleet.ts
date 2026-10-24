import type { TurnCompleteReason } from 'claude-code'
import type { Probe, Shuttle, ShuttleStatus, ToolNote } from '../../types'
import { redact, shorten } from '../core'
import type { CallNote } from './bridge'
import { DEFAULT_SHUTTLE } from './defaults'
import { type StepUsage, stepTokens } from './mission'
import { taskOf } from './tasks'
import { shuttleTitle, uniqueTitle } from './titles'

const SHUTTLES_MAX = 24
const TOOL_NOTES_MAX = 3
const PROBES_MAX = 60
const ANSWER_MAX = 400
const BRIEF_MAX = 600
const WRITER_MAX = 18
const PROBE_ACTIVE_MS = 15_000

/** A shuttle at launch: its title made from the mission and numbered past the fleet's, its brief redacted and cut. */
export function newShuttle(
  fleet: readonly Shuttle[],
  spawn: { id: string; type: string; model: string; description: string; prompt: string; spawnedAt: number },
): Shuttle {
  const { prompt, ...rest } = spawn
  const title = uniqueTitle(shuttleTitle(spawn.description, spawn.type), fleet.map(titleOf))
  return { ...DEFAULT_SHUTTLE, ...rest, title, brief: shorten(redact(prompt), BRIEF_MAX) }
}

export function addShuttle(fleet: readonly Shuttle[], shuttle: Shuttle): Shuttle[] {
  return [...fleet, shuttle].slice(-SHUTTLES_MAX)
}

export function withShuttle(fleet: readonly Shuttle[], id: string, change: (shuttle: Shuttle) => Shuttle): Shuttle[] {
  return fleet.map(shuttle => (shuttle.id === id ? change(shuttle) : shuttle))
}

export function hasShuttle(fleet: readonly Shuttle[], id: string): boolean {
  return fleet.some(shuttle => shuttle.id === id)
}

/** A shuttle after one model request: its hull is the latest step's whole input; output adds up. */
export function applyStep(shuttle: Shuttle, step: { model: string; usage: StepUsage; stopReason: string | null }): Shuttle {
  const tokens = stepTokens(step.usage)
  return {
    ...shuttle,
    model: shuttle.model || step.model,
    steps: shuttle.steps + 1,
    ctx: tokens.tokIn > 0 ? tokens.tokIn : shuttle.ctx,
    out: shuttle.out + tokens.tokOut,
    lastStop: step.stopReason,
  }
}

/** A shuttle after starting a tool call: what it is doing, and the task-list step the call starts. */
export function withShuttleCall(shuttle: Shuttle, call: CallNote): Shuttle {
  const step = taskOf(call.tool, call.input, [], shuttle.task)
  return { ...shuttle, doing: call.doing, doingTitle: call.doingTitle, ...(step ? { task: step.task } : {}) }
}

export function noteTool(shuttle: Shuttle, note: ToolNote): Shuttle {
  return { ...shuttle, tools: [...shuttle.tools, note].slice(-TOOL_NOTES_MAX) }
}

const STATUS_OF: Readonly<Record<TurnCompleteReason, ShuttleStatus>> = {
  answer: 'done',
  aborted: 'stopped',
  refusal: 'failed',
  error: 'failed',
}

/** How a shuttle landed, from the reason its last turn completed. */
export function statusOf(reason: TurnCompleteReason): ShuttleStatus {
  // An installed mod outlives engine updates: a reason a newer engine adds reads as failed.
  return STATUS_OF[reason] ?? 'failed'
}

export function landShuttle(shuttle: Shuttle, landing: { status: ShuttleStatus; at: number; answer: string }): Shuttle {
  return {
    ...shuttle,
    status: landing.status,
    endedAt: landing.at,
    doing: null,
    doingTitle: null,
    answer: shorten(landing.answer, ANSWER_MAX),
  }
}

/** A shuttle's short name: the one it launched with, or made now for one stored before titles. */
export function titleOf(shuttle: Shuttle): string {
  return shuttle.title || shuttleTitle(shuttle.description, shuttle.type)
}

/** The name a shuttle writes under in the black box, from its spawn on. */
export function shuttleWriter(shuttle: Shuttle): string {
  return shorten(titleOf(shuttle), WRITER_MAX)
}

/** In flight first, then up to `docked` landed shuttles, newest first. */
export function shownShuttles(fleet: readonly Shuttle[], docked: number): Shuttle[] {
  const landed = fleet.filter(shuttle => shuttle.status !== 'running')
  return [...fleet.filter(shuttle => shuttle.status === 'running'), ...landed.slice(-docked).reverse()]
}

/** A shuttle's bar, in cells: the gap before it, its length and the gap after. */
export function stepProbe(probes: readonly Probe[], id: string, at: number): Probe[] {
  const found = probes.find(probe => probe.id === id)
  const next = found
    ? probes.map(probe => (probe === found ? { ...probe, steps: probe.steps + 1, lastAt: at } : probe))
    : [...probes, { id, steps: 1, firstAt: at, lastAt: at, isDone: false }]
  return next.slice(-PROBES_MAX)
}

export function endProbe(probes: readonly Probe[], id: string, at: number): Probe[] {
  return probes.map(probe => (probe.id === id ? { ...probe, isDone: true, lastAt: at } : probe))
}

export function dropProbe(probes: readonly Probe[], id: string): Probe[] {
  return probes.filter(probe => probe.id !== id)
}

export function isProbeActive(probe: Probe, now: number): boolean {
  return !probe.isDone && now - probe.lastAt < PROBE_ACTIVE_MS
}
