import type { RateLimit, Speed, SpeedAvg, Usage } from '../../types'
import { SECOND_MS } from '../core'

const HISTORY_MAX = 12
const COMPACTION_MIN_TOKENS = 20_000

type LimitReading = { kind: string; percentUsed: number; resetsAt?: string }

/** A context, cost and rate-limit reading, as `$.session.usage()` and `session.measure` give it. */
export type UsageReading = {
  context: { percent?: number | null; tokens?: number | null; window: number }
  cost?: { usd?: number | null } | null
  rateLimits: readonly LimitReading[]
}

/** A rate-limit reading with its ISO reset time turned into ms since the epoch. */
function limitOf(reading: LimitReading): RateLimit {
  const at = reading.resetsAt ? Date.parse(reading.resetsAt) : Number.NaN
  return { kind: reading.kind, pct: reading.percentUsed, resetsAt: Number.isFinite(at) ? at : null }
}

export function usageFrom(usage: Usage, reading: UsageReading): Usage {
  return {
    ...usage,
    pct: reading.context.percent ?? null,
    tokens: reading.context.tokens ?? null,
    window: reading.context.window,
    costUsd: reading.cost?.usd ?? null,
    limits: reading.rateLimits.map(limitOf),
  }
}

/** A reading whose context had no response to count it yet (a fresh or just-compacted window), filled from an estimate. */
export function withEstimatedContext(reading: UsageReading, estimatedTokens: number): UsageReading {
  const { window } = reading.context
  const percent = window > 0 ? Math.round((estimatedTokens / window) * 100) : null
  return { ...reading, context: { ...reading.context, tokens: estimatedTokens, percent } }
}

/** A compaction, read from the context: more than 20k tokens, then less than half of it. */
export function compactionOf(before: number | null, after: number | null): { before: number; after: number } | null {
  if (before === null || after === null) return null
  return before > COMPACTION_MIN_TOKENS && after < before / 2 ? { before, after } : null
}

export function withCompaction(usage: Usage, at: number): Usage {
  return { ...usage, compactions: usage.compactions + 1, lastCompactAt: at }
}

export function withHistory(usage: Usage, contextTokens: number): Usage {
  return { ...usage, history: [...usage.history, contextTokens].slice(-HISTORY_MAX) }
}

/** The context added or freed by the last jump. */
export function lastDelta(usage: Usage): number {
  const [before = 0, after = 0] = usage.history.slice(-2)
  return usage.history.length >= 2 ? after - before : 0
}

/** How fast a request answered: null when no response came; `tokPerS` null without usage or time to divide by. */
export function stepSpeed(sentAt: number, firstAt: number | null, stopAt: number, outTokens: number | null): Speed | null {
  if (firstAt === null) return null
  const decodeMs = stopAt - firstAt
  return {
    ttftMs: Math.max(0, firstAt - sentAt),
    tokPerS: outTokens !== null && outTokens > 0 && decodeMs > 0 ? (outTokens * SECOND_MS) / decodeMs : null,
  }
}

function addSpeed(avg: SpeedAvg, speed: Speed): SpeedAvg {
  return speed.tokPerS === null
    ? { ...avg, n: avg.n + 1, ttftMs: avg.ttftMs + speed.ttftMs }
    : { n: avg.n + 1, ttftMs: avg.ttftMs + speed.ttftMs, nTok: avg.nTok + 1, tokPerS: avg.tokPerS + speed.tokPerS }
}

/** The averages, or null before any request is measured. */
export function avgSpeed(avg: SpeedAvg): Speed | null {
  return avg.n > 0 ? { ttftMs: avg.ttftMs / avg.n, tokPerS: avg.nTok > 0 ? avg.tokPerS / avg.nTok : null } : null
}

export function withSpeed<T extends { speed: Speed | null; avg: SpeedAvg }>(target: T, speed: Speed): T {
  return { ...target, speed, avg: addSpeed(target.avg, speed) }
}

/** After a recalibration the gauge waits for the next measurement rather than showing the fill before it. */
export function usageAfterReset(usage: Usage): Usage {
  return { ...usage, pct: null, tokens: null }
}
