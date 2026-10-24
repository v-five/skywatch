import { describe, expect, test } from 'claude-code/testing'
import { printable, shorten } from '../../src/core'
import { complete, paneRequest, START, spawn } from '../support/drive'
import { world } from '../support/world'

const COLOURED = 'Build \u001b[31mred\u001b[0m\u0007 now\tplease'

describe('drawn text', () => {
  test('escape sequences and control characters go, a tab is a space, newlines stay', () => {
    expect(printable(COLOURED)).toBe('Build red now please')
    expect(printable('one\ntwo')).toBe('one\ntwo')
  })

  test('shortening never cuts through an emoji', () => {
    expect(shorten('🚀🚀🚀🚀', 3)).toBe('🚀🚀…')
  })

  for (const surface of ['desktop', 'terminal'] as const) {
    test(`a shuttle whose brief and report hold escape codes still opens (${surface})`, async ($, on) => {
      world(on)
      on('agent.spawn', () => ({ model: 'claude-sonnet-4-5', agentId: 's1' }))
      on('turn.complete', () => ({ text: '' }))
      await $.session.start(START)
      await $.agent.spawn({ ...spawn('general-purpose', 'Implement the footer'), prompt: `${COLOURED} ${'🚀'.repeat(400)}` })
      await $.turn.complete(complete(`All clear \u001b[32mok\u001b[0m ${'🚀'.repeat(300)}`, { agentId: 's1' }))
      const ui = await $.ui.mount(paneRequest(surface))
      await ui.press({ key: 'hangar' })
      await ui.press({ key: 'shuttle-s1' })
      expect(await ui.find({ type: 'Text', text: /^All clear ok/ })).toBeDefined()
      await ui.unmount()
    })
  }
})
