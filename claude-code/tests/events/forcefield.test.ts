import { describe, expect, test } from 'claude-code/testing'
import { heldTexts, paneRequest, START, skywatch } from '../support/drive'
import { CWD, PROJECT_DIRECTIVES, runTools, shellAnswer, world } from '../support/world'

describe('the force field: blocks and passes', () => {
  test('a block directive refuses the call with the directive, and the force field counts it', async ($, on) => {
    world(on, { files: { [PROJECT_DIRECTIVES]: 'block @git-history\n' } })
    runTools(on)
    await $.session.start(START)
    const ran = await $.tool.call({ tool: 'Bash', command: 'git push --force origin main' })
    expect(ran).toMatchObject({
      isError: true,
      text: expect.stringContaining('SkyWatch blocks this: the directive "block @git-history" covers it.'),
    })
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: ' blocked 1' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^blocked by directive "block @git-history" · / })).toBeDefined()
    await ui.unmount()
  })

  test('/skywatch forcefield off lets a blocked call through for the session, and on blocks it again', async ($, on) => {
    world(on, { files: { [PROJECT_DIRECTIVES]: 'block @git-history\n' } })
    runTools(on)
    await $.session.start(START)
    expect(await $.command.run(skywatch('forcefield'))).toMatchObject({ text: expect.stringContaining('Force field: on.') })
    expect(await $.command.run(skywatch('forcefield off'))).toMatchObject({
      text: expect.stringContaining('Force field: off, for this session.'),
    })
    expect(await $.tool.call({ tool: 'Bash', command: 'git push --force origin main' })).not.toMatchObject({ isError: true })
    await $.command.run(skywatch('recalibrate'))
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: 'off' })).toBeDefined()
    await ui.unmount()
    await $.command.run(skywatch('forcefield on'))
    expect(await $.tool.call({ tool: 'Bash', command: 'git push --force origin main' })).toMatchObject({ isError: true })
    expect(await $.command.run(skywatch('forcefield maybe'))).toMatchObject({ text: 'Usage: /skywatch forcefield on|off' })
  })

  test('block @secrets refuses a dotenv read', async ($, on) => {
    world(on, { run: shellAnswer, files: { [PROJECT_DIRECTIVES]: 'block @secrets\n' } })
    runTools(on)
    await $.session.start(START)
    const ran = await $.tool.call({ tool: 'Read', file_path: `${CWD}/.env` })
    expect(ran).toMatchObject({ isError: true, text: expect.stringContaining('the directive "block @secrets"') })
  })

  test('a later pass directive lets a held group through', async ($, on) => {
    world(on, { run: shellAnswer, files: { [PROJECT_DIRECTIVES]: 'pass git push --force\n' } })
    runTools(on)
    await $.session.start(START)
    expect(await $.tool.call({ tool: 'Bash', command: 'git push --force' })).not.toMatchObject({ isError: true })
  })

  test('an rm inside a temp folder passes without a prompt', async ($, on) => {
    world(on, { files: { [PROJECT_DIRECTIVES]: 'hold @delete\n' }, run: shellAnswer })
    runTools(on)
    await $.session.start(START)
    expect(await $.tool.call({ tool: 'Bash', command: 'rm -rf /tmp/scratch' })).not.toMatchObject({ isError: true })
  })

  test('by default an rm passes', async ($, on) => {
    world(on, { run: shellAnswer })
    runTools(on)
    await $.session.start(START)
    expect(await $.tool.call({ tool: 'Bash', command: 'rm -rf build' })).not.toMatchObject({ isError: true })
  })

  test("a refusal by Claude Code's rules is logged, counted under Protocols and shown on the beacon", async ($, on) => {
    const statuses: (string | undefined)[] = []
    world(on, { statuses })
    on('tool.check', () => ({ decision: 'deny', reason: 'a rule' }))
    runTools(on)
    await $.session.start(START)
    await $.tool.call({ tool: 'Bash', command: 'ls' })
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: 'stopped by rule · Bash → ls' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: ' stopped 1' })).toBeDefined()
    await ui.unmount()
    expect(statuses.at(-1)).toBe('∙ Stardust · ○ 12% · stopped 1')
  })
})

describe('the force field: holds', () => {
  test('a held rm waits at the prompt with its measure, then the black box records the wait', async ($, on) => {
    world(on, { files: { [PROJECT_DIRECTIVES]: 'hold @delete\n' }, run: shellAnswer })
    const { ran, texts } = await heldTexts($, on, { tool: 'Bash', command: 'rm -rf build' })
    expect(ran).toMatchObject({ isError: true })
    expect(texts).toEqual(
      expect.arrayContaining(['Held', 'rm -rf build', 'delete 3 files (about 4.0 KB)', 'build/a.js', 'answer in the permission prompt']),
    )
    const after = await $.ui.mount(paneRequest())
    expect(await after.find({ type: 'Text', text: /^held \d+s · \w+ rm -rf build$/ })).toBeDefined()
    await after.unmount()
  })

  test('a dotenv read is held with its reason', async ($, on) => {
    world(on, { run: shellAnswer })
    const { texts } = await heldTexts($, on, { tool: 'Read', file_path: `${CWD}/.env` })
    expect(texts).toContain(`read ${CWD}/.env, which may hold secrets`)
  })
})
