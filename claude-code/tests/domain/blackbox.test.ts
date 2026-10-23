import { describe, expect, test } from 'claude-code/testing'
import { capitalize } from '../../src/core'
import { appendEntry, attachCost, entryRows, keyedEntries, newEntry, promptLine } from '../../src/domain'
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

describe('rows', () => {
  test('three or more of the same call by one writer fold into a run, newest first', () => {
    const write = (at: number, file: string, who = 'bridge') => newEntry(at, who, `Write → ${file}`, 'info', null)
    const entries = [
      write(1, 'a.ts'),
      write(2, 'b.ts'),
      write(3, 'c.ts'),
      newEntry(4, 'captain', 'ok', 'info', null),
      write(5, 'd.ts'),
      write(6, 'e.ts'),
    ]
    const rows = entryRows(keyedEntries(entries, null))
    expect(
      rows.map(row => (row.run ? `${row.run.verb} ×${row.run.targets.length}: ${row.run.targets.join(',')}` : row.keyed.entry.text)),
    ).toEqual(['Write → e.ts', 'Write → d.ts', 'ok', 'Write ×3: c.ts,b.ts,a.ts'])
  })
})
