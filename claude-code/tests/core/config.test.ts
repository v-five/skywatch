import { expect, test } from 'claude-code/testing'
import { isDeck, isHazardMode, parseConfig } from '../../src/core'
import { CONFIGS } from '../support/corpus'
import { GOLDEN } from '../support/golden'

test('parseConfig matches the pre-refactor output, its modules applying to every surface', () => {
  const asBefore = (options: (typeof CONFIGS)[number]) => {
    const { modules, palette, ...rest } = parseConfig(options)
    expect(palette).toEqual({ app: 'skywatch', terminal: 'skywatch' })
    // Modules added after the refactor are left out: the plan, and the terminal's satellites, cargo and relays.
    return { modules: modules.app.filter(module => module !== 'plan'), ...rest }
  }
  expect(CONFIGS.map(asBefore)).toEqual(GOLDEN.parseConfig)
})

test('modules and palette may differ per surface', () => {
  const config = parseConfig({ modules: 'bridge,mission; terminal=blackbox', palette: 'app=catppuccin-latte; terminal=terminal' })
  expect(config.modules).toEqual({ app: ['bridge', 'mission'], terminal: ['blackbox'] })
  expect(config.palette).toEqual({ app: 'catppuccin-latte', terminal: 'terminal' })
  expect(parseConfig({ palette: 'Catppuccin' }).palette).toEqual({ app: 'catppuccin-mocha', terminal: 'catppuccin-mocha' })
  expect(parseConfig({ palette: 'neon; terminal=nope' }).palette).toEqual({ app: 'skywatch', terminal: 'skywatch' })
})

test('closed sets', () => {
  expect([isDeck('mcp'), isDeck('nope'), isHazardMode('off'), isHazardMode('loud')]).toEqual([true, false, true, false])
})

test('by default the terminal adds satellites, cargo and relays, which the app shows itself', () => {
  const { modules } = parseConfig({})
  expect(modules.app).not.toContain('cargo')
  expect(modules.terminal).toContain('cargo')
  expect(parseConfig({ modules: 'bridge,cargo' }).modules).toEqual({ app: ['bridge', 'cargo'], terminal: ['bridge', 'cargo'] })
})
