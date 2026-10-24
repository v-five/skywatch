import { describe, expect, test } from 'claude-code/testing'
import { bandRequest, complete, paneRequest, START, spawn } from '../support/drive'
import { runTools, world } from '../support/world'

describe('the mobile app', () => {
  test(
    'draws the pane and the band without client modules, a busy session included',
    { options: { hazards: 'viewscreen' } },
    async ($, on) => {
      world(on)
      runTools(on)
      on('agent.spawn', () => ({ model: 'm', agentId: 's1' }))
      on('turn.start', (_, e) => ({ turnId: e.turnId }))
      on('turn.complete', () => ({ text: '' }))
      await $.session.start(START)
      await $.turn.start({ text: 'go', turnId: 'j1' })
      await $.tool.call({ tool: 'TodoWrite', todos: [{ content: 'Phase: one', status: 'in_progress', activeForm: 'one' }] })
      await $.agent.spawn(spawn('Explore', 'scan the repo'))
      await $.tool.call({ tool: 'Bash', command: 'ls' })
      const pane = await $.ui.mount(paneRequest('mobile'))
      expect(await pane.find({ type: 'Text', text: '⌬ Bridge' })).toBeDefined()
      expect(await pane.find({ type: 'Text', text: '⇡ Repo scout' })).toBeDefined()
      expect(await pane.findAll({ type: 'Client' })).toEqual([])
      await pane.unmount()
      await $.turn.complete(complete('All clear.', { agentId: 's1' }))
      const band = await $.ui.mount(bandRequest('mobile'))
      expect(await band.find({ type: 'Text', text: /%/ })).toBeDefined()
      await band.unmount()
    },
  )
})
