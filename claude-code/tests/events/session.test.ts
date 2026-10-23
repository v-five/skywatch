import { describe, expect, test } from 'claude-code/testing'
import { complete, hintRequest, measured, paneRequest, START, sessionEnd, skywatch, spawn } from '../support/drive'
import { world } from '../support/world'

describe('session', () => {
  test('a context that falls by half from over 20k counts a compaction', async ($, on) => {
    world(on)
    await $.session.start(START)
    await $.session.measure(measured(50, 100_000))
    await $.session.measure(measured(15, 30_000))
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: 'context compacted (100k → 30k)' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '  ⟲1' })).toBeDefined()
    await ui.unmount()
  })

  test('/clear and /skywatch recalibrate clear the shuttles and the black box', async ($, on) => {
    world(on)
    on('agent.spawn', () => ({ model: 'm', agentId: 's1' }))
    await $.session.start(START)
    await $.agent.spawn(spawn('Explore', 'scan'))
    await $.session.end(sessionEnd('clear'))
    const cleared = await $.ui.mount(paneRequest())
    expect(await cleared.find({ type: 'Text', text: /^⇡ / })).toBeUndefined()
    expect(await cleared.find({ type: 'Text', text: 'nothing yet' })).toBeDefined()
    await cleared.unmount()
    await $.agent.spawn(spawn('Explore', 'again'))
    await $.command.run(skywatch('recalibrate'))
    const recalibrated = await $.ui.mount(paneRequest())
    expect(await recalibrated.find({ type: 'Text', text: /^⇡ / })).toBeUndefined()
    await recalibrated.unmount()
  })

  test('a host without usage readings starts at clear space, and a jump there costs no dollars', async ($, on) => {
    const statuses: (string | undefined)[] = []
    world(on, { usage: null, statuses })
    on('turn.start', (_, e) => ({ turnId: e.turnId }))
    on('turn.complete', () => ({ text: '' }))
    await $.session.start(START)
    expect(statuses.at(-1)).toBe('✦ Clear space · ○ 0%')
    await $.turn.start({ turnId: 'j1', text: 'hello' })
    await $.turn.complete(complete('done'))
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: '  ↑0 ↓0' })).toBeDefined()
    await ui.unmount()
  })
})

describe('beacon', () => {
  test('on the desktop the beacon is a status entry, cleared when hazards go off', async ($, on) => {
    const statuses: (string | undefined)[] = []
    world(on, { statuses })
    await $.session.start(START)
    expect(statuses.at(-1)).toBe('∙ Stardust · ○ 12%')
    await $.command.run(skywatch('hazards off'))
    expect(statuses.at(-1)).toBeUndefined()
  })

  test('on the terminal the beacon is the hint line tail, and no status entry', async ($, on) => {
    const statuses: (string | undefined)[] = []
    world(on, { statuses })
    on('ui.render', { component: 'PromptHint' }, ($, e) => $.ui.resolve(e).Text({ children: `tail: ${e.props.tail ?? ''}` }))
    await $.session.start({ ...START, surface: 'terminal' })
    expect(statuses.at(-1)).toBeUndefined()
    const hint = await $.ui.mount(hintRequest())
    expect(await hint.find({ type: 'Text', text: 'tail: ∙ Stardust · ○ 12%' })).toBeDefined()
    await hint.unmount()
  })
})
