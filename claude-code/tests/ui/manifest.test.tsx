import { describe, expect, test } from 'claude-code/testing'
import { measured, paneRequest, START } from '../support/drive'
import { runTools, world } from '../support/world'

const category = (name: string, tokens: number, kind: 'used' | 'free' | 'buffer' | 'deferred', color = 'claude') => ({
  name,
  tokens,
  kind,
  color,
  isDeferred: kind === 'deferred',
})
const mcpTool = (serverName: string, tokens: number) => ({ name: `mcp__${serverName}__x`, serverName, tokens, isLoaded: true })

const MANIFEST = {
  categories: [
    category('Messages', 40_000, 'used'),
    category('MCP tools', 17_000, 'used', 'permission'),
    category('MCP tools (deferred)', 80_000, 'deferred'),
    category('Autocompact buffer', 33_000, 'buffer', 'inactive'),
    category('Free space', 110_000, 'free', 'inactive'),
  ],
  mcpTools: [mcpTool('Sanity', 9_000), mcpTool('Linear', 2_000), mcpTool('tiny', 100)],
  autoCompactThreshold: 167_000,
}

describe('the bridge: manifest', () => {
  test('the manifest names what fills the context, ballast what is loaded and unused, hull where it compacts', async ($, on) => {
    world(on, { usage: { percent: 30, tokens: 60_000, window: 200_000, usd: 1, manifest: MANIFEST } })
    runTools(on)
    await $.session.start(START)
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: 'Cargo 40k · Docking ports 17k' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'unused · Sanity 9k · Linear 2k' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'compacts in 107k' })).toBeDefined()
    await ui.unmount()
    await $.tool.call({ tool: 'mcp__Sanity__query', query: 'q' } as never)
    await $.session.measure(measured(30, 60_000))
    const after = await $.ui.mount(paneRequest())
    expect(await after.find({ type: 'Text', text: 'unused · Linear 2k' })).toBeDefined()
    await after.unmount()
  })

  test('no breakdown, no manifest', async ($, on) => {
    world(on)
    await $.session.start(START)
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: 'Manifest' })).toBeUndefined()
    await ui.unmount()
  })
})
