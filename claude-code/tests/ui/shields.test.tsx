import { describe, expect, test } from 'claude-code/testing'
import { shareCells } from '../../src/ui/widgets'
import { paneRequest, START } from '../support/drive'
import { runTools, world } from '../support/world'

describe('shields', () => {
  test('cells are shared by counts, and a count above 0 keeps a cell', () => {
    expect(shareCells([3, 1], 4)).toEqual([3, 1])
    expect(shareCells([500, 1, 0], 20)).toEqual([19, 1, 0])
    expect(shareCells([1, 1, 1], 20).reduce((sum, cells) => sum + cells, 0)).toBe(20)
    expect(shareCells([0, 0], 20)).toEqual([0, 0])
  })

  test('the sensors bar keeps its width, tallies at 0 are left out, and other names what it holds', async ($, on) => {
    world(on)
    runTools(on)
    await $.session.start(START)
    for (const command of ['ls', 'pwd', 'date']) await $.tool.call({ tool: 'Bash', command })
    await $.tool.call({ tool: 'TodoWrite', todos: [] })
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: '▰'.repeat(20) })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: ' stopped 0' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: 'none yet' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'other: TodoWrite' })).toBeDefined()
    await ui.unmount()
  })
})
