import type { Deck, HazardMode } from '../../types'
import { isOneOf } from './guards'

const MODULES = ['bridge', 'council', 'shields', 'shuttles', 'probes', 'mission', 'blackbox'] as const
export type Module = (typeof MODULES)[number]

/** Every deck, in the order a call is matched; `other` takes what no chosen deck matches. */
export const DECKS = ['file', 'git', 'shell', 'web', 'agents', 'app', 'mcp', 'other'] as const satisfies readonly Deck[]

const HAZARD_MODES = ['viewscreen', 'beacon', 'off'] as const satisfies readonly HazardMode[]

const DEFAULT_DECKS = 'file,shell,other'
const DEFAULT_HAZARDS: HazardMode = 'beacon'
const DEFAULT_PALETTE: PaletteName = 'skywatch'

export const PALETTE_NAMES = [
  'skywatch',
  'terminal',
  'claude',
  'catppuccin-mocha',
  'catppuccin-macchiato',
  'catppuccin-frappe',
  'catppuccin-latte',
  'dracula',
  'nord',
  'gruvbox',
  'tokyo-night',
] as const
export type PaletteName = (typeof PALETTE_NAMES)[number]
const PALETTE_ALIASES: ReadonlyMap<string, PaletteName> = new Map([['catppuccin', 'catppuccin-mocha']])

/** The terminal, or every surface that draws for itself (desktop, VS Code, mobile). */
export type SurfaceGroup = 'app' | 'terminal'
export type PerSurface<T> = Readonly<Record<SurfaceGroup, T>>
const SURFACE_PART = /^\s*(app|terminal)\s*=\s*(.*)$/
const SURFACE_SEPARATOR = ';'

export function surfaceGroupOf(surface: string | null): SurfaceGroup {
  return surface === 'terminal' ? 'terminal' : 'app'
}

export type Config = {
  modules: PerSurface<Module[]>
  decks: Deck[]
  autoLaunch: boolean
  hazards: HazardMode
  palette: PerSurface<PaletteName>
}

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

/** `value`, or `app=…; terminal=…`, each part read by `parse`; a surface left out takes the plain part, else the fallback. */
function perSurface<T>(value: unknown, parse: (part: string) => T | null, fallback: T): PerSurface<T> {
  const parts = typeof value === 'string' ? value.split(SURFACE_SEPARATOR) : []
  const read = (group: SurfaceGroup | null): T | null => {
    for (const part of parts) {
      const match = SURFACE_PART.exec(part)
      const text = group === null ? (match ? null : part) : match?.[1] === group ? (match[2] ?? '') : null
      const parsed = text === null ? null : parse(text)
      if (parsed !== null) return parsed
    }
    return null
  }
  const plain = read(null) ?? fallback
  return { app: read('app') ?? plain, terminal: read('terminal') ?? plain }
}

function modulesOf(part: string): Module[] | null {
  const modules = part
    .split(',')
    .map(name => name.trim())
    .filter(name => isOneOf(MODULES, name))
  return modules.length > 0 ? [...new Set(modules)] : null
}

function paletteNameOf(part: string): PaletteName | null {
  const name = part.trim().toLowerCase()
  return isOneOf(PALETTE_NAMES, name) ? name : (PALETTE_ALIASES.get(name) ?? null)
}

/** The plugin's `/config` values, read leniently: anything malformed falls back to the default. */
export function parseConfig(options: Readonly<Record<string, unknown>>): Config {
  const decks = listSetting(options, 'decks', DEFAULT_DECKS).filter((part): part is Deck => isDeck(part) && part !== 'other')
  return {
    modules: perSurface(options.modules, modulesOf, [...MODULES]),
    decks: [...new Set(decks), 'other'],
    autoLaunch: typeof options.autoLaunch === 'boolean' ? options.autoLaunch : true,
    hazards: isHazardMode(options.hazards) ? options.hazards : DEFAULT_HAZARDS,
    palette: perSurface(options.palette, paletteNameOf, DEFAULT_PALETTE),
  }
}
