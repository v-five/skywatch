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
      text: 'SkyWatch launched. Focus it with ctrl+x tab; 1-9 open docked shuttles, deck letters open their lists.',
    })
  })

  test('dock, recalibrate and an unknown verb answer as before', async ($, on) => {
    world(on)
    await $.session.start(START)
    expect(await $.command.run(skywatch('dock'))).toMatchObject({ text: 'SkyWatch docked.' })
    expect(await $.command.run(skywatch('recalibrate'))).toMatchObject({ text: 'SkyWatch recalibrated.' })
    expect(await $.command.run(skywatch('warp'))).toMatchObject({
      text: 'Usage: /skywatch [launch|dock|recalibrate|hazards viewscreen|beacon|off|directives]',
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
})
