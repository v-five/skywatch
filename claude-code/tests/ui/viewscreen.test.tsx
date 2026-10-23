import { expect, test } from 'claude-code/testing'
import { bandRequest, complete, START, skywatch } from '../support/drive'
import { world } from '../support/world'

test('after /skywatch hazards viewscreen, the band shows the hazard, the gauge and the last jump', async ($, on) => {
  world(on, { usage: { percent: 47, tokens: 94_000, window: 200_000, usd: 1 } })
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => $.ui.resolve(e).Text({ children: 'engine' }))
  on('turn.complete', () => ({ text: '' }))
  await $.session.start(START)
  const before = await $.ui.mount(bandRequest('terminal'))
  expect(await before.find({ type: 'Text', text: 'engine' })).toBeDefined()
  await before.unmount()
  await $.command.run(skywatch('hazards viewscreen'))
  await $.turn.complete(complete('', { durationMs: 61_000 }))
  for (const surface of ['terminal', 'desktop'] as const) {
    const band = await $.ui.mount(bandRequest(surface))
    expect(await band.find({ type: 'Text', text: '☁  Gas cloud  ' })).toBeDefined()
    expect(await band.find({ type: 'Text', text: '▰▰▰▰▰' })).toBeDefined()
    expect(await band.find({ type: 'Text', text: '  47%' })).toBeDefined()
    expect(await band.find({ type: 'Text', text: '  94k / 200k' })).toBeDefined()
    expect(await band.find({ type: 'Text', text: 'Last jump 1m01s' })).toBeDefined()
    await band.unmount()
  }
})
