import type { Args } from 'claude-code'
import { describe, expect, test } from 'claude-code/testing'
import { paneRequest, START, spawn } from '../support/drive'
import { runTools, world } from '../support/world'

/** A command that starts with `false` fails. */
const isFalse = (call: Args<'tool.call'>) => 'command' in call && String(call.command).startsWith('false')

describe('tool calls', () => {
  test('edits and errors reach the black box; two errors in a row make the next consultation "error repeats"', async ($, on) => {
    world(on)
    runTools(on, isFalse)
    on('agent.spawn', () => ({ model: 'm', agentId: 'a1' }))
    await $.session.start(START)
    await $.tool.call({ tool: 'Edit', file_path: '/work/project/src/a.ts', old_string: 'a', new_string: 'b' })
    await $.tool.call({ tool: 'Bash', command: 'false one' })
    await $.tool.call({ tool: 'Bash', command: 'false two' })
    await $.agent.spawn(spawn('architect', 'look'))
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: 'Edit → src/a.ts' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Bash → false two  ✗' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'error repeats · architect' })).toBeDefined()
    await ui.unmount()
  })

  test('the errors of the jump unfold under the mission', async ($, on) => {
    world(on)
    runTools(on, isFalse)
    on('turn.start', (_, e) => ({ turnId: e.turnId }))
    await $.session.start(START)
    await $.turn.start({ text: 'go', turnId: 'j1' })
    await $.tool.call({ tool: 'Bash', command: 'false one' })
    await $.tool.call({ tool: 'Bash', command: 'false two' })
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: 'Errors' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Bridge: Bash → false one {2}✗ {2}· {2}Bridge: Bash → false two/ })).toBeDefined()
    await ui.unmount()
  })

  test('three errors in a row raise a distress on the bridge and in the black box, once', async ($, on) => {
    world(on)
    runTools(on, isFalse)
    on('turn.start', (_, e) => ({ turnId: e.turnId }))
    await $.session.start(START)
    await $.turn.start({ text: 'go', turnId: 'j1' })
    for (const n of ['one', 'two', 'three', 'four']) await $.tool.call({ tool: 'Bash', command: `false ${n}` })
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: '⚠ 4 errors in a row' })).toBeDefined()
    expect(await ui.findAll({ type: 'Text', text: /^distress · / })).toHaveLength(1)
    await ui.unmount()
  })

  test('a shuttle keeps its last tools; the card shows the one before the latest', async ($, on) => {
    world(on)
    runTools(on)
    on('agent.spawn', () => ({ model: 'm', agentId: 's1' }))
    await $.session.start(START)
    await $.agent.spawn(spawn('Explore', 'scan'))
    await $.tool.call({ tool: 'Bash', command: 'ls src', agentId: 's1' })
    await $.tool.call({ tool: 'Bash', command: 'ls tests', agentId: 's1' })
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: 'Bash → ls src' })).toBeDefined()
    await ui.unmount()
  })
})
