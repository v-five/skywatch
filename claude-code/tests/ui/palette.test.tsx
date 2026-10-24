import { describe, expect, test } from 'claude-code/testing'
import { PALETTE_NAMES } from '../../src/core'
import { paletteOf, parsePaletteFile } from '../../src/ui'
import { paneRequest, START, skywatch } from '../support/drive'
import { HOME, world } from '../support/world'

describe('palettes', () => {
  test('every preset paints eight distinct steps', () => {
    for (const name of PALETTE_NAMES) expect(new Set(Object.values(paletteOf(name).space)).size).toBe(8)
  })

  test('roles follow the steps they are drawn from; claude keeps theme keys for its roles', () => {
    const latte = paletteOf('catppuccin-latte')
    expect(latte.colors.bridge).toBe(latte.space.ionStorm)
    expect(latte.colors.alert).toBe(latte.space.eventHorizon)
    expect(paletteOf('claude').colors.shields).toBe('success')
    expect(paletteOf('terminal').space.eventHorizon).toBe('red')
  })

  test('a palette file recolours a step and the roles drawn from it, or a single role', () => {
    const file = parsePaletteFile('# mine\nion-storm = #fab387\nshields = green\nloud = #fff\n')
    expect(file.overrides).toEqual({ ionStorm: '#fab387', shields: 'green' })
    expect(file.errors).toEqual(['4  loud = #fff'])
    const palette = paletteOf('skywatch', file.overrides)
    expect([palette.space.ionStorm, palette.colors.bridge, palette.colors.shields]).toEqual(['#fab387', '#fab387', 'green'])
  })
})

describe('the pane: palette', () => {
  test('each surface draws with its own palette', { options: { palette: 'app=catppuccin-mocha; terminal=terminal' } }, async ($, on) => {
    world(on)
    await $.session.start(START)
    for (const [surface, color] of [
      ['desktop', '#fab387'],
      ['terminal', 'magenta'],
    ] as const) {
      const ui = await $.ui.mount(paneRequest(surface))
      expect((await ui.find({ type: 'Text', text: '⌬ Bridge' }))?.props.color).toBe(color)
      await ui.unmount()
    }
  })

  test('/skywatch palette lists the presets, the file colours and unread lines', async ($, on) => {
    world(on, { files: { [`${HOME}/.claude/skywatch.palette`]: 'bridge = #123456\nnope\n' } })
    await $.session.start(START)
    const { text } = await $.command.run(skywatch('palette'))
    expect(text).toContain('Palette: app skywatch, terminal skywatch.')
    expect(text).toContain('From .claude/skywatch.palette: bridge = #123456')
    expect(text).toContain('~/.claude/skywatch.palette:2  nope')
  })
})
