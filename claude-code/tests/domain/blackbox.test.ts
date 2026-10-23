import { describe, expect, test } from 'claude-code/testing'
import { capitalize } from '../../src/core'
import { appendEntry, attachCost, keyedEntries, newEntry, promptLine } from '../../src/domain'
import type { BlackboxEntry } from '../../types'
import { PROMPTS } from '../support/corpus'
import { GOLDEN } from '../support/golden'

const entry = (at: number, who: string, agentId: string | null = null): BlackboxEntry => newEntry(at, who, who, 'info', agentId)

describe('black box', () => {
  test('promptLine and writer names match the pre-refactor output', () => {
    expect(PROMPTS.map(promptLine)).toEqual(GOLDEN.promptLine)
    expect(['captain', 'bridge', 'Explore', ''].map(capitalize)).toEqual([...GOLDEN.writerName])
  })

  test('appendEntry keeps the latest 200', () => {
    const many = Array.from({ length: 200 }, (_, i) => entry(i, 'bridge'))
    expect(
      appendEntry(many, entry(999, 'captain'))
        .map(e => e.at)
        .slice(0, 1),
    ).toEqual([1])
  })

  test('attachCost writes onto the bridge entry only', () => {
    const cost = { usd: 1, tokIn: 2, tokOut: 3 }
    const after = attachCost([entry(5, 'captain'), entry(5, 'scan', 's1')], 5, cost)
    expect(after.map(e => e.cost)).toEqual([cost, null])
  })

  test('keyedEntries is newest first, filtered to the viewed shuttle', () => {
    const list = [entry(1, 'a'), entry(2, 'b', 's1'), entry(3, 'c')]
    expect(keyedEntries(list, null).map(k => k.entry.at)).toEqual([3, 2, 1])
    expect(keyedEntries(list, 's1').map(k => k.entry.at)).toEqual([2])
  })

  test('fold keys stay with their entry when newer entries arrive, duplicates told apart', () => {
    const list = [entry(42, 'captain'), entry(42, 'captain')]
    expect(keyedEntries(list, null).map(k => k.foldKey)).toEqual(['log-42-captain-1', 'log-42-captain'])
    const longer = keyedEntries([...list, entry(50, 'bridge')], null)
    expect(longer.map(k => k.foldKey)).toEqual(['log-50-bridge', 'log-42-captain-1', 'log-42-captain'])
  })
})
