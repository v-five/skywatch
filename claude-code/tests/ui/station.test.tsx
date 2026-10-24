import type { Args } from 'claude-code'
import { describe, expect, test } from 'claude-code/testing'
import { changesOf, DEFAULT_STATION, taskNotificationOf, withRelayCall } from '../../src/domain'
import { paneRequest, START } from '../support/drive'
import { world } from '../support/world'

const NUMSTAT = '12\t3\tclaude-code/src/ui/a.ts\n5\t0\tclaude-code/src/ui/b.ts\n-\t-\tlogo.png\n1\t1\tREADME.md\n'

describe('station', () => {
  test('numstat lines, task notifications and relay calls read as the station keeps them', () => {
    expect(changesOf(NUMSTAT)).toEqual([
      { path: 'claude-code/src/ui/a.ts', added: 12, removed: 3 },
      { path: 'claude-code/src/ui/b.ts', added: 5, removed: 0 },
      { path: 'logo.png', added: 0, removed: 0 },
      { path: 'README.md', added: 1, removed: 1 },
    ])
    expect(taskNotificationOf('<task-notification><task-id>b1</task-id><status>failed</status></task-notification>')).toEqual({
      id: 'b1',
      status: 'failed',
    })
    expect(taskNotificationOf('plain words')).toBeNull()
    const relays = withRelayCall(withRelayCall(DEFAULT_STATION, 'Sanity', null), 'Sanity', 'token expired').relays
    expect(relays).toEqual([{ server: 'Sanity', calls: 2, errors: 1, lastError: 'token expired' }])
  })

  test('on the terminal: cargo by folder, a satellite in orbit, a failing relay', async ($, on) => {
    world(on, { run: argv => (argv[0] === 'git' ? { exitCode: 0, stdout: NUMSTAT } : undefined) })
    on('tool.call', (_, e: Args<'tool.call'>) => {
      if (e.tool === 'Bash') return { result: { stdout: '', stderr: '', interrupted: false, backgroundTaskId: 'b1' } }
      if (String(e.tool).startsWith('mcp__')) return { result: { content: [{ type: 'text', text: 'token expired' }] }, isError: true }
      return { result: {} }
    })
    on('turn.complete', () => ({ text: '' }))
    await $.session.start(START)
    await $.tool.call({ tool: 'Edit', file_path: '/work/project/src/a.ts', old_string: 'a', new_string: 'b' })
    await $.tool.call({ tool: 'Bash', command: 'npm run dev', description: 'Run the dev server', run_in_background: true })
    await $.tool.call({ tool: 'mcp__Sanity__query', query: 'q' } as never)
    const ui = await $.ui.mount(paneRequest('terminal'))
    expect(await ui.find({ type: 'Text', text: '▤ Cargo hold' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^claude-code\/src\/ +$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'src/a.ts' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Run the dev server' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '1 calls · 1 failed' })).toBeDefined()
    await ui.unmount()
    const desktop = await $.ui.mount(paneRequest('desktop'))
    expect(await desktop.find({ type: 'Text', text: '▤ Cargo hold' })).toBeUndefined()
    await desktop.unmount()
  })
})
