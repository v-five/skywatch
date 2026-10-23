import { describe, expect, test } from 'claude-code/testing'
import { modeRequest, paneRequest, START } from '../support/drive'
import { PROJECT_DIRECTIVES, runTools, world } from '../support/world'

const TITLES = /^(⌬ Bridge|⟁ Council|⛨ Shields|◌ Probes|✧ Mission|▣ Black box)$/

describe('the pane: modules', () => {
  for (const surface of ['terminal', 'desktop'] as const) {
    test(`draws the configured modules in order, empty ones left out (${surface})`, async ($, on) => {
      world(on)
      await $.session.start(START)
      const ui = await $.ui.mount(paneRequest(surface))
      const titles = (await ui.findAll({ type: 'Text', text: TITLES })).map(found => found.text)
      expect(titles).toEqual(['⌬ Bridge', '⛨ Shields', '✧ Mission', '▣ Black box'])
      expect(await ui.find({ type: 'Text', text: ' SkyWatch' })).toBeDefined()
      await ui.unmount()
    })
  }

  test('modules follow the modules setting', { options: { modules: 'blackbox,bridge' } }, async ($, on) => {
    world(on)
    await $.session.start(START)
    const ui = await $.ui.mount(paneRequest())
    expect((await ui.findAll({ type: 'Text', text: TITLES })).map(found => found.text)).toEqual(['▣ Black box', '⌬ Bridge'])
    await ui.unmount()
  })
})

describe('the pane: decks', () => {
  test('a deck button counts every verdict, blocked included', async ($, on) => {
    world(on, { files: { [PROJECT_DIRECTIVES]: 'block @git-history\n' } })
    runTools(on)
    await $.session.start(START)
    await $.tool.call({ tool: 'Bash', command: 'git reset --hard' })
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Button', text: 'shell 1' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '1 checks' })).toBeDefined()
    await ui.unmount()
  })

  test('a deck opens its latest checks when pressed', async ($, on) => {
    world(on)
    runTools(on)
    await $.session.start(START)
    await $.tool.call({ tool: 'Bash', command: 'ls -la' })
    const ui = await $.ui.mount(paneRequest())
    await ui.press({ key: 'deck-shell' })
    expect(await ui.find({ type: 'Button', text: 'shell 1 ▾' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Bash → ls -la' })).toBeDefined()
    await ui.unmount()
  })
})

describe('the pane: black box', () => {
  test('a long entry stays unfolded when newer entries arrive', async ($, on) => {
    world(on)
    on('turn.start', (_, e) => ({ turnId: e.turnId }))
    await $.session.start(START)
    await $.turn.start({ turnId: 'j1', text: `please ${'refactor the parser '.repeat(12)}` })
    const ui = await $.ui.mount(paneRequest())
    const [fold] = await ui.findAll({ type: 'Button', text: '⌄' })
    expect(fold?.key).toMatch(/^fold-log-\d+-captain$/)
    await ui.press({ key: fold?.key ?? '' })
    await ui.unmount()
    await $.turn.start({ turnId: 'j2', text: 'and then the tests' })
    const again = await $.ui.mount(paneRequest())
    expect(await again.find({ type: 'Button', key: fold?.key ?? '', text: '⌃' })).toBeDefined()
    await again.unmount()
  })
})

describe('the pane: shields', () => {
  test('in auto mode, the prompts row reads Autopilot from the next jump', async ($, on) => {
    world(on)
    on('ui.render', { component: 'SessionMode' }, ($, e) => $.ui.resolve(e).Text({ children: e.props.modes.join(' & ') }))
    on('turn.start', (_, e) => ({ turnId: e.turnId }))
    await $.session.start(START)
    const footer = await $.ui.mount(modeRequest(['auto mode on']))
    await footer.unmount()
    await $.turn.start({ turnId: 'j1', text: 'go' })
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: 'Autopilot' })).toBeDefined()
    await ui.unmount()
  })
})
