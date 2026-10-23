import { expect, test } from 'claude-code/testing'
import { redact } from '../../src/core'
import { REDACT_TEXTS } from '../support/corpus'
import { GOLDEN } from '../support/golden'

test('redact matches the pre-refactor output', () => {
  expect(REDACT_TEXTS.map(redact)).toEqual([...GOLDEN.redact])
})
