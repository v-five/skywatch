import { describe, expect, test } from 'claude-code/testing'
import { gateVerdict, type Held } from '../../src/forcefield'

const held = (mode: Held['mode']): Held => ({
  headline: 'rm -rf build',
  who: 'bridge',
  since: null,
  summary: 'delete 3 files (about 4.0 KB)',
  lines: [],
  more: 0,
  note: '',
  mode,
  directive: `${mode} @delete`,
})

describe('gateVerdict', () => {
  test('a hold turns any verdict but a refusal into an ask with the measure', () => {
    expect(gateVerdict({ decision: 'allow' }, held('hold'))).toEqual({
      verdict: { decision: 'ask', reason: 'SkyWatch: this would delete 3 files (about 4.0 KB).' },
      blockedBy: null,
    })
  })

  test('a block denies with the directive', () => {
    expect(gateVerdict({ decision: 'ask' }, held('block'))).toEqual({
      verdict: { decision: 'deny', reason: 'SkyWatch blocks this: the directive "block @delete" covers it.' },
      blockedBy: 'block @delete',
    })
  })

  test('a refusal already made, or no held call, stays as found', () => {
    const denied = { decision: 'deny' as const, reason: 'rule' }
    expect(gateVerdict(denied, held('block')).verdict).toBe(denied)
    const allowed = { decision: 'allow' as const }
    expect(gateVerdict(allowed, undefined)).toEqual({ verdict: allowed, blockedBy: null })
  })
})
