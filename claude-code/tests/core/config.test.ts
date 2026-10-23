import { expect, test } from 'claude-code/testing'
import { isDeck, isHazardMode, parseConfig } from '../../src/core'
import { CONFIGS } from '../support/corpus'
import { GOLDEN } from '../support/golden'

test('parseConfig matches the pre-refactor output, its modules applying to every surface', () => {
  const asBefore = (options: (typeof CONFIGS)[number]) => {
    const { modules, palette, ...rest } = parseConfig(options)
    expect(modules.app).toEqual(modules.terminal)
    expect(palette).toEqual({ app: 'skywatch', terminal: 'skywatch' })
    // The plan module came after the refactor: by default it sits after the bridge.
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
