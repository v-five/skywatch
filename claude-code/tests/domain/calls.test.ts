import { expect, test } from 'claude-code/testing'
import { describeInput, handbackMessage, phraseOf, toolName } from '../../src/domain'
import { TOOL_CALLS } from '../support/corpus'
import { GOLDEN } from '../support/golden'

test('phraseOf, describeInput and toolName match the pre-refactor output', () => {
  expect(TOOL_CALLS.map(call => phraseOf(call.tool, call.input))).toEqual([...GOLDEN.phraseOf])
  expect(TOOL_CALLS.map(call => describeInput(call.tool, call.input))).toEqual([...GOLDEN.describeInput])
  expect(TOOL_CALLS.map(call => toolName(call.tool))).toEqual([...GOLDEN.toolName])
})

test('handbackMessage reads only a string message', () => {
  expect([handbackMessage({ message: 'report' }), handbackMessage({ message: 3 }), handbackMessage(null)]).toEqual(['report', null, null])
})
