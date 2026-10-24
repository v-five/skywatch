import { describe, expect, test } from 'claude-code/testing'
import { assistantRow, complete, paneRequest, START, spawn } from '../support/drive'
import { world } from '../support/world'

describe('agents: shuttles', () => {
  test('a spawned agent becomes a shuttle card, and its completion docks it', async ($, on) => {
    world(on)
    on('agent.spawn', () => ({ model: 'claude-sonnet-4-5', agentId: 's1' }))
    on('turn.complete', () => ({ text: '' }))
    await $.session.start(START)
    await $.agent.spawn(spawn('Explore', 'scan the repo'))
    const flying = await $.ui.mount(paneRequest())
    expect(await flying.find({ type: 'Text', text: '⇡ Repo scout' })).toBeDefined()
    expect(await flying.find({ type: 'Text', text: 'Scan the repo' })).toBeDefined()
    expect(await flying.find({ type: 'Text', text: '◐ in flight' })).toBeDefined()
    await flying.unmount()
    await $.turn.complete(complete('All clear.', { agentId: 's1' }))
    const docked = await $.ui.mount(paneRequest())
    expect(await docked.find({ type: 'Text', text: '1 docked' })).toBeDefined()
    expect(await docked.find({ type: 'Text', text: '✓ docked' })).toBeUndefined()
    await docked.press({ key: 'hangar' })
    expect(await docked.find({ type: 'Text', text: '✓ docked' })).toBeDefined()
    await docked.press({ key: 'shuttle-s1' })
    expect(await docked.find({ type: 'Text', text: 'All clear.' })).toBeDefined()
    expect(await docked.find({ type: 'Text', text: /^done · / })).toBeDefined()
    await docked.unmount()
    const desktop = await $.ui.mount(paneRequest('desktop'))
    expect(await desktop.find({ type: 'Text', text: '○ 1 docked' })).toBeDefined()
    expect(await desktop.findAll({ type: 'Svg' })).toEqual([])
    await desktop.unmount()
  })

  test('a shuttle writes under one name, from its spawn to its landing', async ($, on) => {
    world(on)
    on('agent.spawn', () => ({ model: 'claude-sonnet-4-5', agentId: 's1' }))
    on('turn.complete', () => ({ text: '' }))
    await $.session.start(START)
    await $.agent.spawn(spawn('Explore', 'scan the repository'))
    await $.turn.complete(complete('All clear.', { agentId: 's1' }))
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.findAll({ type: 'Text', text: 'Repository scout' })).toHaveLength(2)
    await ui.unmount()
  })
})

describe('agents: shuttle cards', () => {
  test('a card in flight shows its mission and brief, and folds when its chevron is pressed', async ($, on) => {
    world(on)
    on('agent.spawn', () => ({ model: 'claude-sonnet-4-5', agentId: 's1' }))
    await $.session.start(START)
    await $.agent.spawn({ ...spawn('general-purpose', 'Implement the footer component'), prompt: 'Build the footer in src/ui/footer.tsx.' })
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: '⇡ Footer builder' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Implement the footer component' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Build the footer in src/ui/footer.tsx.' })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'shuttle-s1', text: '▲' })).toBeDefined()
    await ui.press({ key: 'shuttle-s1' })
    expect(await ui.find({ type: 'Button', key: 'shuttle-s1', text: '▼' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Implement the footer component' })).toBeUndefined()
    await ui.unmount()
  })
})

describe('agents: the council', () => {
  test('an architect opens a council transmission instead of a shuttle', async ($, on) => {
    world(on)
    on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: 'a1' }))
    on('turn.complete', () => ({ text: '' }))
    await $.session.start(START)
    await $.agent.spawn(spawn('plugin:architect', 'review the plan'))
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: '⟁ Council' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Architect transmitting · transmissions ' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^⇡ / })).toBeUndefined()
    await ui.unmount()
    await $.turn.complete(complete('**Use** the cache.\nmore', { agentId: 'a1' }))
    const after = await $.ui.mount(paneRequest())
    expect(await after.find({ type: 'Text', text: '» Use the cache.' })).toBeDefined()
    await after.unmount()
  })

  test("an architect's report opening a jump is its advice", async ($, on) => {
    world(on)
    on('agent.spawn', () => ({ model: 'm', agentId: 'a1' }))
    on('turn.start', (_, e) => ({ turnId: e.turnId }))
    await $.session.start(START)
    await $.agent.spawn(spawn('architect', 'review'))
    await $.turn.start({ turnId: 'j1', text: '<agent-message from="a1">\nThe report follows:\nShip the smaller change.' })
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: '» Ship the smaller change.' })).toBeDefined()
    await ui.unmount()
  })

  test('a server-side advisor call is a transmission that its result in the same row ends', async ($, on) => {
    world(on)
    await $.session.start(START)
    await $.session.append(
      assistantRow([
        { type: 'server_tool_use', id: 'srv1', name: 'advisor', input: {} },
        { type: 'advisor_tool_result', tool_use_id: 'srv1', content: [] },
      ]),
    )
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: 'Architect on watch · transmissions ' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'before a plan · advisor tool' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'advice returned' })).toBeDefined()
    await ui.unmount()
  })
})
