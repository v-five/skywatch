import { expect, test } from 'claude-code/testing'
import { secretFileOf } from '../../src/forcefield'
import { SECRET_CALLS } from '../support/corpus'
import { GOLDEN } from '../support/golden'

test('secretFileOf matches the pre-refactor output', () => {
  expect(SECRET_CALLS.map(call => secretFileOf(call.tool, call.input))).toEqual([...GOLDEN.secretFileOf])
})
