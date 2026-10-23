import { describe, expect, test } from 'claude-code/testing'
import {
  fmtAgo,
  fmtBytes,
  fmtClock,
  fmtDuration,
  fmtResetIn,
  fmtSpeed,
  fmtTimer,
  fmtUsd,
  kTokens,
  limitLabel,
  lineCost,
  prettyModel,
} from '../../src/core'
import { DURATIONS, LIMIT_KINDS, MODEL_IDS, NUMBERS, RESETS, USD } from '../support/corpus'
import { GOLDEN } from '../support/golden'

describe('formatters match the pre-refactor output', () => {
  test('prettyModel', () => expect(MODEL_IDS.map(prettyModel)).toEqual([...GOLDEN.prettyModel]))
  test('kTokens', () => expect(NUMBERS.map(kTokens)).toEqual([...GOLDEN.kTokens]))
  test('fmtDuration', () => expect(DURATIONS.map(fmtDuration)).toEqual([...GOLDEN.fmtDuration]))
  test('fmtTimer', () => expect(DURATIONS.map(fmtTimer)).toEqual([...GOLDEN.fmtTimer]))
  test('fmtUsd', () => expect(USD.map(fmtUsd)).toEqual([...GOLDEN.fmtUsd]))
  test('fmtResetIn', () => expect(RESETS.map(r => fmtResetIn(r.resetsAt, r.now))).toEqual([...GOLDEN.fmtResetIn]))
  test('limitLabel', () => expect(LIMIT_KINDS.map(limitLabel)).toEqual([...GOLDEN.limitLabel]))
  test('lineCost', () => {
    expect([lineCost({ usd: null, tokIn: 1500, tokOut: 20 }), lineCost({ usd: 1.5, tokIn: 2_000_000, tokOut: 0 })]).toEqual([
      ...GOLDEN.lineCost,
    ])
  })
})

describe('new formatters', () => {
  test('fmtBytes', () => {
    expect([0, 512, 2048, 5 * 1024 * 1024, 20 * 1024 ** 3, Number.NaN].map(fmtBytes)).toEqual([
      '0 B',
      '512 B',
      '2.0 KB',
      '5.0 MB',
      '20 GB',
      '0 B',
    ])
  })

  test('fmtAgo', () => {
    expect([10_000, 30 * 60_000, 5 * 3_600_000, 86_400_000, 3 * 86_400_000].map(fmtAgo)).toEqual([
      '1m ago',
      '30m ago',
      '5h ago',
      '1 day ago',
      '3 days ago',
    ])
  })

  test('fmtSpeed', () => {
    expect(fmtSpeed({ ttftMs: 1234, tokPerS: 55.6 })).toBe('1.2s · 56 tok/s')
    expect(fmtSpeed({ ttftMs: 800, tokPerS: null })).toBe('0.8s')
  })

  test('fmtClock shows a placeholder for an unknown time', () => {
    expect(fmtClock(0)).toBe('--:--:--')
    expect(fmtClock(Date.UTC(2026, 0, 1, 12, 0, 0))).toMatch(/^\d\d:\d\d:\d\d$/)
  })
})
