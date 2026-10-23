import { describe, expect, test } from 'claude-code/testing'
import { DEFAULT_PALETTE, drawContext, PaneFault } from '../../src/ui'
import { paneRequest } from '../support/drive'

const PROBE = { ...paneRequest('desktop'), plugin: 'test', requestId: 'probe' } as const

describe('the pane: faults', () => {
  test('after a client module fails, drawings leave client modules out', async ($, on) => {
    on('ui.render', { component: 'Pane', requestId: 'probe' }, (engine, e) => {
      const els = engine.ui.resolve(e)
      expect(drawContext(els, DEFAULT_PALETTE).hasClient).toBe(true)
      expect(drawContext(els, DEFAULT_PALETTE, false).hasClient).toBe(false)
      return <els.Text>probe</els.Text>
    })
    const ui = await $.ui.mount(PROBE)
    await ui.unmount()
  })

  test('a pane that cannot be drawn says why and how to clear it', async ($, on) => {
    on('ui.render', { component: 'Pane', requestId: 'probe' }, (engine, e) => <PaneFault els={engine.ui.resolve(e)} reason="clock gone" />)
    const ui = await $.ui.mount(PROBE)
    expect(await ui.find({ type: 'Text', text: '⚠ SkyWatch could not draw: clock gone' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Run /skywatch recalibrate to clear its readings.' })).toBeDefined()
    await ui.unmount()
  })
})
