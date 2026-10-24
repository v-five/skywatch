import { describe, expect, test } from 'claude-code/testing'
import { DEFAULT_JUMP, DEFAULT_SHIELDS, distressOf, recordCheck } from '../../src/domain'

const NOW = 1_000_000

describe('distress', () => {
  test('errors in a row, one file edited over and over, a prompt left waiting', () => {
    const calm = { jump: DEFAULT_JUMP, shields: DEFAULT_SHIELDS, now: NOW }
    expect(distressOf(calm)).toBeNull()
    expect(distressOf({ ...calm, jump: { ...DEFAULT_JUMP, errorStreak: 3 } })).toBe('3 errors in a row')
    expect(distressOf({ ...calm, jump: { ...DEFAULT_JUMP, editsByFile: { 'src/a.ts': 6, 'src/b.ts': 1 } } })).toBe(
      'src/a.ts edited 6 times this jump',
    )
    const asked = recordCheck(DEFAULT_SHIELDS, {
      id: 'c',
      tool: 'Bash',
      deck: 'shell',
      verdict: 'ask',
      inSubagent: false,
      detail: '',
      at: NOW - 180_000,
    })
    expect(distressOf({ ...calm, shields: asked })).toBe('a permission prompt has waited 3m00s')
  })
})
