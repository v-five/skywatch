import { describe, expect, test } from 'claude-code/testing'
import { paneRequest, START } from '../support/drive'
import { runTools, world } from '../support/world'

const todo = (content: string, status: 'pending' | 'in_progress' | 'completed') => ({ content, status, activeForm: content })

describe('the pane: flight plan', () => {
  test('the task list shows with its progress, a finished phase folded to its line', async ($, on) => {
    world(on)
    runTools(on)
    on('turn.start', (_, e) => ({ turnId: e.turnId }))
    await $.session.start(START)
    await $.turn.start({ text: 'go', turnId: 'j1' })
    await $.tool.call({
      tool: 'TodoWrite',
      todos: [
        todo('Fix findings: force field', 'completed'),
        todo('Fix findings: domain', 'completed'),
        todo('Write tests', 'in_progress'),
        todo('Ship it', 'pending'),
      ],
    })
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: '⊹ Flight plan' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '  2/4' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Fix findings' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'force field' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: 'Write tests' })).toBeDefined()
    await ui.press({ key: 'phase-0-Fix findings' })
    expect(await ui.find({ type: 'Text', text: 'force field' })).toBeDefined()
    await ui.unmount()
  })

  test('no task list, no card', async ($, on) => {
    world(on)
    await $.session.start(START)
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: '⊹ Flight plan' })).toBeUndefined()
    await ui.unmount()
  })
})
