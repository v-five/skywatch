import { expect, test } from 'claude-code/testing'
import { taskOf } from '../../src/domain'
import { TASK_CALLS } from '../support/corpus'
import { GOLDEN } from '../support/golden'

test('taskOf matches the pre-refactor output across every task-list tool', () => {
  expect(TASK_CALLS.map(call => taskOf(call.tool, call.input, call.plan, call.current) ?? 'undefined')).toEqual(GOLDEN.taskOf)
})
