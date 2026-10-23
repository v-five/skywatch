import { describe, expect, test } from 'claude-code/testing'
import {
  adviceLine,
  closeTransmission,
  DEFAULT_COUNCIL,
  handbackOf,
  isTransmitting,
  momentOf,
  openTransmission,
  serverBlocksOf,
  transmissionTimeline,
  withRosterType,
} from '../../src/domain'
import { HANDBACKS, REPORTS } from '../support/corpus'
import { GOLDEN } from '../support/golden'

describe('council', () => {
  test('adviceLine and handbackOf match the pre-refactor output', () => {
    expect(REPORTS.map(adviceLine)).toEqual([...GOLDEN.adviceLine])
    expect(HANDBACKS.map(handbackOf)).toEqual(GOLDEN.handbackOf)
  })

  test('momentOf infers the moment from the jump', () => {
    expect([
      momentOf({ edits: 0, errorStreak: 0 }),
      momentOf({ edits: 2, errorStreak: 1 }),
      momentOf({ edits: 0, errorStreak: 2 }),
    ]).toEqual(['before a plan', 'before done', 'error repeats'])
  })

  test('a transmission opens once and closes by id', () => {
    const opened = openTransmission(DEFAULT_COUNCIL, { id: 't1', at: 1000, moment: 'before done', via: 'architect' })
    expect(openTransmission(opened, { id: 't1', at: 2000, moment: 'before done', via: 'x' })).toBe(opened)
    expect(isTransmitting(opened)).toBe(true)
    const closed = closeTransmission(opened, 5000, 'use a cache', 't1')
    expect(isTransmitting(closed)).toBe(false)
    expect(closed.lastAdvice).toBe('use a cache')
    expect(transmissionTimeline(closed, 9000, 10)).toBe('◆━━━━─────')
  })

  test('serverBlocksOf keeps only the fields it reads', () => {
    expect(
      serverBlocksOf([
        { type: 'server_tool_use', id: 'a', name: 'advisor', input: {} },
        'junk',
        { type: 'x_tool_result', tool_use_id: 'a' },
      ]),
    ).toEqual([
      { type: 'server_tool_use', id: 'a', name: 'advisor' },
      { type: 'x_tool_result', tool_use_id: 'a' },
    ])
    expect(serverBlocksOf('nope')).toEqual([])
  })

  test('withRosterType adds a type once', () => {
    const roster = withRosterType({ councilTypes: [] }, 'architect')
    expect(withRosterType(roster, 'architect')).toBe(roster)
  })
})
