import { describe, expect, test } from 'claude-code/testing'
import {
  type CheckDecision,
  checkVerdict,
  countHeld,
  DEFAULT_SHIELDS,
  deckOf,
  recordCheck,
  settleCheck,
  shieldsSummary,
  tallyTotal,
  trimRecent,
  ZERO_TALLY,
} from '../../src/domain'
import type { Check, Deck } from '../../types'
import { DECK_CALLS, DECK_SETS } from '../support/corpus'
import { GOLDEN } from '../support/golden'

const check = (id: string, verdict: Check['verdict'], deck: Deck = 'shell'): Check => ({
  id,
  tool: 'Bash',
  deck,
  verdict,
  inSubagent: false,
  detail: id,
  at: 0,
})

describe('shields', () => {
  test('deckOf matches the pre-refactor output for every deck set', () => {
    expect(DECK_SETS.map(set => DECK_CALLS.map(call => deckOf(call.tool, call.input, set as Deck[])))).toEqual(GOLDEN.deckOf)
  })

  test('checkVerdict', () => {
    expect([checkVerdict('allow', false), checkVerdict('ask', false), checkVerdict('deny', false), checkVerdict('deny', true)]).toEqual([
      'rule',
      'ask',
      'deny',
      'blocked',
    ])
    const decision: string = 'defer'
    expect(checkVerdict(decision as CheckDecision, false)).toBe('deny')
  })

  test('record then settle an ask', () => {
    const asked = recordCheck(DEFAULT_SHIELDS, check('c1', 'ask'))
    expect(asked.totals.shell?.ask).toBe(1)
    const cleared = settleCheck(asked, 'c1', true)
    expect(cleared.totals.shell).toMatchObject({ ask: 0, cleared: 1 })
    expect(cleared.recent[0]?.verdict).toBe('cleared')
    expect(settleCheck(cleared, 'c1', false)).toBe(cleared)
  })

  test('trimRecent never drops a pending ask', () => {
    const list = [check('a', 'ask'), check('b', 'rule'), check('c', 'rule'), check('d', 'rule')]
    expect(trimRecent(list, 2).map(c => c.id)).toEqual(['a', 'd'])
  })

  test('totals count blocked checks', () => {
    const blocked = recordCheck(recordCheck(DEFAULT_SHIELDS, check('a', 'blocked')), check('b', 'rule', 'file'))
    expect(tallyTotal(blocked.totals.shell ?? ZERO_TALLY)).toBe(1)
    expect(shieldsSummary(blocked)).toMatchObject({ blocked: 1, rule: 1, total: 2 })
  })

  test('countHeld', () => {
    expect(countHeld(DEFAULT_SHIELDS, 'blocked').held).toEqual({ ran: 0, refused: 0, blocked: 1 })
  })
})
