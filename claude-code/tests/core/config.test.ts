import { expect, test } from 'claude-code/testing'
import { isDeck, isHazardMode, parseConfig } from '../../src/core'
import { CONFIGS } from '../support/corpus'
import { GOLDEN } from '../support/golden'

test('parseConfig matches the pre-refactor output', () => {
  expect(CONFIGS.map(parseConfig)).toEqual(GOLDEN.parseConfig)
})

test('closed sets', () => {
  expect([isDeck('mcp'), isDeck('nope'), isHazardMode('off'), isHazardMode('loud')]).toEqual([true, false, true, false])
})
