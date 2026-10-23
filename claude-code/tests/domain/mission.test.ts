import { describe, expect, test } from 'claude-code/testing'
import {
  activeTime,
  afterCall,
  avgSpeed,
  compactionOf,
  DEFAULT_AVG,
  DEFAULT_TOTALS,
  DEFAULT_USAGE,
  jumpCost,
  lastDelta,
  lastJumpOf,
  startJump,
  stepSpeed,
  stepTokens,
  usageAfterReset,
  usageFrom,
  withHistory,
  withJumpTokens,
  withRequestTokens,
  withSpeed,
} from '../../src/domain'

describe('usage', () => {
  test('usageFrom reads a reading, reset times in ms', () => {
    const usage = usageFrom(DEFAULT_USAGE, {
      context: { percent: 42, tokens: 84_000, window: 200_000 },
      cost: { usd: 1.5 },
      rateLimits: [
        { kind: 'five_hour', percentUsed: 10, resetsAt: '2026-01-01T00:00:00Z' },
        { kind: 'seven_day', percentUsed: 3, resetsAt: 'bad' },
      ],
    })
    expect(usage).toMatchObject({ pct: 42, tokens: 84_000, window: 200_000, costUsd: 1.5 })
    expect(usage.limits).toEqual([
      { kind: 'five_hour', pct: 10, resetsAt: Date.UTC(2026, 0, 1) },
      { kind: 'seven_day', pct: 3, resetsAt: null },
    ])
    expect(usageAfterReset(usage)).toMatchObject({ pct: null, tokens: null, costUsd: 1.5 })
  })

  test('a compaction is a drop below half from over 20k', () => {
    const cases = [compactionOf(30_000, 10_000), compactionOf(30_000, 20_000), compactionOf(15_000, 1_000), compactionOf(null, 1)]
    expect(cases).toEqual([{ before: 30_000, after: 10_000 }, null, null, null])
  })

  test('history and the last delta', () => {
    expect(lastDelta([5, 8, 6].reduce(withHistory, DEFAULT_USAGE))).toBe(-2)
    expect(lastDelta(withHistory(DEFAULT_USAGE, 9))).toBe(0)
  })

  test('speeds add up to averages', () => {
    expect(stepSpeed(0, null, 10, 5)).toBeNull()
    const speed = stepSpeed(1000, 1500, 3500, 100)
    expect(speed).toEqual({ ttftMs: 500, tokPerS: 50 })
    const bridge = withSpeed({ speed: null, avg: DEFAULT_AVG }, speed ?? { ttftMs: 0, tokPerS: null })
    expect(avgSpeed(withSpeed(bridge, { ttftMs: 1500, tokPerS: null }).avg)).toEqual({ ttftMs: 1000, tokPerS: 50 })
    expect(avgSpeed(DEFAULT_AVG)).toBeNull()
  })
})

describe('jumps and totals', () => {
  test('a jump counts errors on the bridge and edits everywhere', () => {
    const calls = [
      { inSubagent: false, hasFailed: true, isEdit: false },
      { inSubagent: true, hasFailed: true, isEdit: true },
      { inSubagent: false, hasFailed: true, isEdit: false },
    ]
    const jump = calls.reduce(afterCall, startJump(1000, 0.5))
    expect(jump).toMatchObject({ errorStreak: 2, errors: 2, edits: 1 })
    const tokens = withJumpTokens(jump, stepTokens({ input_tokens: 10, cache_creation_input_tokens: 2, output_tokens: 3 }))
    expect(jumpCost(tokens, 0.75)).toEqual({ usd: 0.25, tokIn: 12, tokOut: 3 })
    expect(lastJumpOf(tokens, { durationMs: 9, shuttlesSince: 1, costNow: 0.501, reason: 'answer' }).costDelta).toBeNull()
  })

  test('totals add requests and active time', () => {
    const totals = withRequestTokens(DEFAULT_TOTALS, { tokIn: 4, tokOut: 2 })
    expect(totals).toMatchObject({ tokIn: 4, tokOut: 2, req: 1 })
    expect(activeTime({ ...totals, activeMs: 100 }, startJump(1000, null), true, 1500)).toBe(600)
  })
})
