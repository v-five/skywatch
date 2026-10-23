import type { Bridge } from '../../types'
import { isOneOf } from '../core'
import { DEFAULT_BRIDGE } from './defaults'
import { taskOf } from './tasks'

export const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const

/** The effort's step, 1 for `low`; 0 for an unknown effort. */
export function effortLevel(effort: string): number {
  return isOneOf(EFFORTS, effort) ? EFFORTS.indexOf(effort) + 1 : 0
}

/** One effort level as a share of the highest, for a gauge. */
export function effortPct(effort: string): number {
  return (effortLevel(effort) / EFFORTS.length) * 100
}

export function isEffort(effort: string): boolean {
  return effortLevel(effort) > 0
}

/** The permission mode the footer's labels show. */
export function modeOf(labels: readonly string[]): string {
  const all = labels.join(' ').toLowerCase()
  if (all.includes('auto')) return 'auto'
  if (all.includes('accept edits')) return 'acceptEdits'
  if (all.includes('plan')) return 'plan'
  if (all.includes('bypass')) return 'bypassPermissions'
  return 'default'
}

export type CallNote = { doing: string; doingTitle: string; tool: string; input: unknown }

/** The bridge after starting a tool call: what it is doing, and the task-list step the call starts. */
export function withCall(bridge: Bridge, call: CallNote): Bridge {
  const step = taskOf(call.tool, call.input, bridge.plan, bridge.task)
  return { ...bridge, doing: call.doing, doingTitle: call.doingTitle, ...(step ? { task: step.task, plan: step.plan } : {}) }
}

export function withStep(bridge: Bridge, model: string, effort: unknown): Bridge {
  return { ...bridge, model, effort: String(effort ?? bridge.effort), steps: bridge.steps + 1 }
}

/** A recalibrated bridge keeps only its model and mode. */
export function bridgeAfterReset(bridge: Bridge): Bridge {
  return { ...DEFAULT_BRIDGE, model: bridge.model, mode: bridge.mode }
}

/** A slash command running outside a jump, or none. */
export function withCommand(bridge: Bridge, command: string | null): Bridge {
  return { ...bridge, command }
}

export function startRunning(bridge: Bridge): Bridge {
  return { ...bridge, isRunning: true }
}

/** A jump ended: the bridge stands by, with no call in flight. */
export function endRunning(bridge: Bridge): Bridge {
  return { ...bridge, isRunning: false, doing: null, doingTitle: null }
}

export function withMode(bridge: Bridge, mode: string): Bridge {
  return bridge.mode === mode ? bridge : { ...bridge, mode }
}
