import type { Jump, LastJump, LineCost, SessionTotals } from '../../types'
import { DEFAULT_JUMP, DEFAULT_TOTALS } from './defaults'

const COST_EPSILON = 0.005

export type StepUsage = {
  input_tokens?: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
  output_tokens?: number
} | null

export type StepTokens = { tokIn: number; tokOut: number }

/** A step's tokens: every input token the request read or wrote, and its output. */
export function stepTokens(usage: StepUsage): StepTokens {
  return {
    tokIn: (usage?.input_tokens ?? 0) + (usage?.cache_read_input_tokens ?? 0) + (usage?.cache_creation_input_tokens ?? 0),
    tokOut: usage?.output_tokens ?? 0,
  }
}

export function startJump(startedAt: number, costAtStart: number | null): Jump {
  return { ...DEFAULT_JUMP, startedAt, costAtStart }
}

/** Errors count on the bridge only; edits count from every shuttle, so delegated work still reaches "before done". */
export function afterCall(jump: Jump, call: { inSubagent: boolean; hasFailed: boolean; isEdit: boolean }): Jump {
  return {
    ...jump,
    errorStreak: call.inSubagent ? jump.errorStreak : call.hasFailed ? jump.errorStreak + 1 : 0,
    errors: jump.errors + (!call.inSubagent && call.hasFailed ? 1 : 0),
    edits: jump.edits + (call.isEdit ? 1 : 0),
  }
}

export function withJumpTokens(jump: Jump, tokens: StepTokens): Jump {
  return { ...jump, tokIn: jump.tokIn + tokens.tokIn, tokOut: jump.tokOut + tokens.tokOut }
}

/** The session's cost since the jump started, when it was read at both ends. */
function costSince(jump: Jump, costNow: number | null): number | null {
  return costNow !== null && jump.costAtStart !== null ? costNow - jump.costAtStart : null
}

/** What a jump cost: its tokens, and dollars when the session's cost was read at both ends. */
export function jumpCost(jump: Jump, costNow: number | null): LineCost {
  const delta = costSince(jump, costNow)
  return { usd: delta !== null ? Math.max(0, delta) : null, tokIn: jump.tokIn, tokOut: jump.tokOut }
}

export function lastJumpOf(
  jump: Jump,
  end: { durationMs: number; shuttlesSince: number; costNow: number | null; reason: string },
): LastJump {
  const delta = costSince(jump, end.costNow)
  return {
    durationMs: end.durationMs,
    shuttles: end.shuttlesSince,
    edits: jump.edits,
    errors: jump.errors,
    costDelta: delta !== null && delta >= COST_EPSILON ? delta : null,
    reason: end.reason,
  }
}

export function totalsKey(sessionId: string): string {
  return `totals:${sessionId}`
}

export function freshTotals(id: string, firstSeen: number): SessionTotals {
  return { ...DEFAULT_TOTALS, id, firstSeen }
}

export function withRequestTokens(totals: SessionTotals, tokens: StepTokens): SessionTotals {
  return { ...totals, tokIn: totals.tokIn + tokens.tokIn, tokOut: totals.tokOut + tokens.tokOut, req: totals.req + 1 }
}

export function withActiveTime(totals: SessionTotals, durationMs: number): SessionTotals {
  return { ...totals, activeMs: totals.activeMs + Math.max(0, durationMs) }
}

/** Active time so far, the running jump included. */
export function activeTime(totals: SessionTotals, jump: Jump, isRunning: boolean, now: number): number {
  return totals.activeMs + (isRunning && jump.startedAt > 0 ? now - jump.startedAt : 0)
}

export function withPromptAt(jump: Jump, promptAt: number): Jump {
  return { ...jump, promptAt }
}

/** While the council reviews before done, the mission says so. */
export function withReviewing(jump: Jump, isReviewing: boolean): Jump {
  return { ...jump, isReviewing }
}
