import type { Deck, HazardMode } from '../../types'
import { isOneOf } from './guards'

const MODULES = ['bridge', 'council', 'shields', 'shuttles', 'probes', 'mission', 'blackbox'] as const
export type Module = (typeof MODULES)[number]

/** Every deck, in the order a call is matched; `other` takes what no chosen deck matches. */
export const DECKS = ['file', 'git', 'shell', 'web', 'agents', 'app', 'mcp', 'other'] as const satisfies readonly Deck[]

const HAZARD_MODES = ['viewscreen', 'beacon', 'off'] as const satisfies readonly HazardMode[]

const DEFAULT_DECKS = 'file,shell,other'
const DEFAULT_HAZARDS: HazardMode = 'beacon'

export type Config = { modules: Module[]; decks: Deck[]; autoLaunch: boolean; hazards: HazardMode }

export function isDeck(value: unknown): value is Deck {
  return isOneOf(DECKS, value)
}

export function isHazardMode(value: unknown): value is HazardMode {
  return isOneOf(HAZARD_MODES, value)
}

function listSetting(options: Readonly<Record<string, unknown>>, key: string, fallback: string): string[] {
  const value = options[key]
  return (typeof value === 'string' && value !== '' ? value : fallback).split(',').map(part => part.trim())
}

/** The plugin's `/config` values, read leniently: anything malformed falls back to the default. */
export function parseConfig(options: Readonly<Record<string, unknown>>): Config {
  const modules = listSetting(options, 'modules', MODULES.join(',')).filter(part => isOneOf(MODULES, part))
  const decks = listSetting(options, 'decks', DEFAULT_DECKS).filter((part): part is Deck => isDeck(part) && part !== 'other')
  return {
    modules: modules.length > 0 ? [...new Set(modules)] : [...MODULES],
    decks: [...new Set(decks), 'other'],
    autoLaunch: typeof options.autoLaunch === 'boolean' ? options.autoLaunch : true,
    hazards: isHazardMode(options.hazards) ? options.hazards : DEFAULT_HAZARDS,
  }
}
