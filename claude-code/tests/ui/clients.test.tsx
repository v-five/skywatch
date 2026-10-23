import { expect, test } from 'claude-code/testing'
import { paneRequest, START, spawn } from '../support/drive'
import { world } from '../support/world'

test('a shuttle in flight shows a live clock and a loader from its client modules', async ($, on) => {
  world(on)
  on('agent.spawn', () => ({ model: 'claude-x', agentId: 's1' }))
  await $.session.start(START)
  await $.agent.spawn(spawn('Explore', 'scan'))
  const ui = await $.ui.mount(paneRequest())
  const clock = await ui.find({ type: 'Text', text: /^\d+:\d\d$/, in: 'shuttle-clock-s1' })
  expect(clock?.text).toBe('0:00')
  expect(await ui.find({ type: 'Client', key: 'load-s1' })).toBeDefined()
  await ui.unmount()
})
