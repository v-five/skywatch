import { describe, expect, test } from 'claude-code/testing'
import { paneRequest, START, skywatch, slashCommand } from '../support/drive'
import { HOME, PROJECT_DIRECTIVES, world } from '../support/world'

const DIRECTIVES_REPORT = [
  'Directives, the last match wins (~/.claude/skywatch.directives, then .claude/skywatch.directives):',
  'pass   @delete                       default',
  'hold   @secrets                      default',
  'hold   @git-history                  default',
  'hold   @publish                      default',
  'hold   @infra                        default',
  'hold   @database                     default',
  'block  git push origin main          ~/.claude/skywatch.directives',
  'hold   @delete                       .claude/skywatch.directives',
  '',
  'Not read (each line is `pass|hold|block <@group or command>`):',
  '.claude/skywatch.directives:2  nonsense',
].join('\n')

describe('/skywatch', () => {
  test('a bare command launches the pane', async ($, on) => {
    world(on)
    await $.session.start(START)
    expect(await $.command.run(skywatch(''))).toMatchObject({
      text: 'SkyWatch launched.',
    })
  })

  test('dock, recalibrate and an unknown verb answer as before', async ($, on) => {
    world(on)
    await $.session.start(START)
    expect(await $.command.run(skywatch('dock'))).toMatchObject({ text: 'SkyWatch docked.' })
    expect(await $.command.run(skywatch('recalibrate'))).toMatchObject({ text: 'SkyWatch recalibrated.' })
    expect(await $.command.run(skywatch('warp'))).toMatchObject({
      text: 'Usage: /skywatch [launch|dock|recalibrate|hazards viewscreen|beacon|off|directives|palette]',
    })
  })

  test('hazards shows, rejects and sets the mode for the session', async ($, on) => {
    world(on)
    await $.session.start(START)
    const shown = (mode: string) => `Hazards: ${mode}. Change it with /skywatch hazards viewscreen|beacon|off.`
    expect(await $.command.run(skywatch('hazards'))).toMatchObject({ text: shown('beacon') })
    expect(await $.command.run(skywatch('hazards loud'))).toMatchObject({ text: 'Usage: /skywatch hazards viewscreen|beacon|off' })
    expect(await $.command.run(skywatch('hazards off'))).toMatchObject({ text: 'Hazards: off, for this session.' })
    expect(await $.command.run(skywatch('hazards'))).toMatchObject({ text: shown('off') })
  })

  test('directives lists defaults, then the files, and lines it could not read', async ($, on) => {
    world(on, {
      files: {
        [`${HOME}/.claude/skywatch.directives`]: 'block git push origin main\n',
        [PROJECT_DIRECTIVES]: 'hold @delete\nnonsense\n',
      },
    })
    await $.session.start(START)
    expect(await $.command.run(skywatch('directives'))).toMatchObject({ text: DIRECTIVES_REPORT })
  })
})

describe('other slash commands', () => {
  test('the bridge shows a slash command while it runs, and stands by after', async ($, on) => {
    world(on)
    const seen: (string | undefined)[] = []
    on('command.run', async () => {
      const ui = await $.ui.mount(paneRequest())
      seen.push((await ui.find({ type: 'Text', text: '◐ /compact' }))?.text)
      await ui.unmount()
      return { text: '' }
    })
    await $.session.start(START)
    await $.command.run(slashCommand('compact'))
    const after = await $.ui.mount(paneRequest())
    expect(seen).toEqual(['◐ /compact'])
    expect(await after.find({ type: 'Text', text: '○ standby' })).toBeDefined()
    await after.unmount()
  })

  test('after a compaction the hull reads the estimate, before any response counts it', async ($, on) => {
    const usage = { percent: 45, tokens: 453_000, window: 1_000_000, usd: 1 }
    world(on, { usage })
    on('command.run', () => {
      Object.assign(usage, { percent: undefined, tokens: undefined, estimated: 90_000 })
      return { text: '' }
    })
    await $.session.start(START)
    await $.command.run(slashCommand('compact'))
    const pane = await $.ui.mount(paneRequest())
    expect(await pane.find({ type: 'Text', text: '  9%' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /context compacted \(453k → 90k\)/ })).toBeDefined()
    await pane.unmount()
  })

  test('an automatic compaction reads the hull fresh too, with no command around it', async ($, on) => {
    const usage = { percent: 80, tokens: 800_000, window: 1_000_000, usd: 1 }
    world(on, { usage })
    on('classic.PostCompact', () => ({}))
    await $.session.start(START)
    Object.assign(usage, { percent: undefined, tokens: undefined, estimated: 120_000 })
    await $.classic.PostCompact({ trigger: 'auto', compact_summary: 'summary' })
    const pane = await $.ui.mount(paneRequest())
    expect(await pane.find({ type: 'Text', text: '  12%' })).toBeDefined()
    await pane.unmount()
  })
})
