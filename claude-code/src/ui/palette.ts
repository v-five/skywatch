import type { PaletteName } from '../core'

/** The hazard scale's steps, coolest first. */
export const SPACE_STEPS = ['clearSpace', 'stardust', 'nebula', 'gasCloud', 'debris', 'asteroids', 'ionStorm', 'eventHorizon'] as const
export type SpaceStep = (typeof SPACE_STEPS)[number]
export type Space = Readonly<Record<SpaceStep, string>>

/** What each part of the pane is painted with. */
export const ROLES = [
  'bridge',
  'shuttles',
  'shields',
  'council',
  'allowed',
  'cleared',
  'waiting',
  'stopped',
  'blocked',
  'held',
  'alert',
  'dim',
  'faint',
  'text',
] as const
export type Role = (typeof ROLES)[number]
export type Colors = Readonly<Record<Role, string>>

export type Palette = { readonly space: Space; readonly colors: Colors }

/** Colours a palette file names, by step or role. */
export type PaletteOverrides = Readonly<Partial<Record<SpaceStep | Role, string>>>

const SKYWATCH_SPACE: Space = {
  clearSpace: '#fef08a',
  stardust: '#bef264',
  nebula: '#4ade80',
  gasCloud: '#22d3ee',
  debris: '#38bdf8',
  asteroids: '#3b82f6',
  ionStorm: '#f97316',
  eventHorizon: '#ef4444',
}

/** The terminal's own sixteen colours: whatever theme the terminal runs paints the scale. */
const ANSI_SPACE: Space = {
  clearSpace: 'yellowBright',
  stardust: 'greenBright',
  nebula: 'green',
  gasCloud: 'cyanBright',
  debris: 'cyan',
  asteroids: 'blue',
  ionStorm: 'magenta',
  eventHorizon: 'red',
}

/** Claude Code's theme keys for the roles; the scale keeps ANSI, as the theme has no eight steps. */
const CLAUDE_ROLES: Partial<Colors> = {
  bridge: 'claude',
  shuttles: 'suggestion',
  shields: 'success',
  council: 'permission',
  allowed: 'suggestion',
  cleared: 'success',
  waiting: 'warning',
  stopped: 'warning',
  blocked: 'error',
  held: 'error',
  alert: 'error',
}

/** Eight hex colours, coolest first, as `SPACE_STEPS` orders them. */
function spaceOf(hexes: readonly [string, string, string, string, string, string, string, string]): Space {
  const [clearSpace, stardust, nebula, gasCloud, debris, asteroids, ionStorm, eventHorizon] = hexes
  return { clearSpace, stardust, nebula, gasCloud, debris, asteroids, ionStorm, eventHorizon }
}

const PRESETS: Readonly<Record<PaletteName, { space: Space; roles?: Partial<Colors> }>> = {
  skywatch: { space: SKYWATCH_SPACE },
  terminal: { space: ANSI_SPACE },
  claude: { space: ANSI_SPACE, roles: CLAUDE_ROLES },
  'catppuccin-mocha': { space: spaceOf(['#f9e2af', '#a6e3a1', '#94e2d5', '#89dceb', '#74c7ec', '#89b4fa', '#fab387', '#f38ba8']) },
  'catppuccin-macchiato': { space: spaceOf(['#eed49f', '#a6da95', '#8bd5ca', '#91d7e3', '#7dc4e4', '#8aadf4', '#f5a97f', '#ed8796']) },
  'catppuccin-frappe': { space: spaceOf(['#e5c890', '#a6d189', '#81c8be', '#99d1db', '#85c1dc', '#8caaee', '#ef9f76', '#e78284']) },
  'catppuccin-latte': { space: spaceOf(['#df8e1d', '#40a02b', '#179299', '#04a5e5', '#209fb5', '#1e66f5', '#fe640b', '#d20f39']) },
  dracula: { space: spaceOf(['#f1fa8c', '#50fa7b', '#69ff94', '#8be9fd', '#a4ffff', '#bd93f9', '#ffb86c', '#ff5555']) },
  nord: { space: spaceOf(['#ebcb8b', '#a3be8c', '#8fbcbb', '#88c0d0', '#81a1c1', '#5e81ac', '#d08770', '#bf616a']) },
  gruvbox: { space: spaceOf(['#fabd2f', '#b8bb26', '#8ec07c', '#689d6a', '#83a598', '#458588', '#fe8019', '#fb4934']) },
  'tokyo-night': { space: spaceOf(['#e0af68', '#9ece6a', '#73daca', '#7dcfff', '#2ac3de', '#7aa2f7', '#ff9e64', '#f7768e']) },
}

/** Modules and results take the scale's colours; greys and body text follow the person's theme. */
function rolesOf(space: Space): Colors {
  return {
    bridge: space.ionStorm,
    shuttles: space.gasCloud,
    shields: space.nebula,
    council: space.asteroids,
    allowed: space.gasCloud,
    cleared: space.nebula,
    waiting: space.clearSpace,
    stopped: space.ionStorm,
    blocked: space.eventHorizon,
    held: space.eventHorizon,
    alert: space.eventHorizon,
    dim: 'inactive',
    faint: 'subtle',
    text: 'text',
  }
}

function pick<K extends SpaceStep | Role>(keys: readonly K[], overrides: PaletteOverrides): Partial<Record<K, string>> {
  const picked: Partial<Record<K, string>> = {}
  for (const key of keys) {
    const value = overrides[key]
    if (value) picked[key] = value
  }
  return picked
}

/** A preset with a palette file's colours over it: a step recolours the roles drawn from it, a role only itself. */
export function paletteOf(name: PaletteName, overrides: PaletteOverrides = {}): Palette {
  const preset = PRESETS[name]
  const space: Space = { ...preset.space, ...pick(SPACE_STEPS, overrides) }
  const colors: Colors = { ...rolesOf(space), ...preset.roles, ...pick(ROLES, overrides) }
  return { space, colors }
}

export const DEFAULT_PALETTE: Palette = paletteOf('skywatch')

const KEBAB = /-([a-z])/g
const OVERRIDE_LINE = /^([a-z-]+)\s*=\s*(\S+)$/i
const COMMENT = /^\s*(#|$)/

function isOverrideKey(key: string): key is SpaceStep | Role {
  return (SPACE_STEPS as readonly string[]).includes(key) || (ROLES as readonly string[]).includes(key)
}

/** A palette file: `name = colour` lines (`ion-storm = #fab387`, `shields = green`); `#` starts a comment. */
export function parsePaletteFile(text: string): { overrides: PaletteOverrides; errors: string[] } {
  const overrides: Partial<Record<SpaceStep | Role, string>> = {}
  const errors: string[] = []
  text.split('\n').forEach((line, i) => {
    if (COMMENT.test(line)) return
    const match = OVERRIDE_LINE.exec(line.trim())
    const key = match?.[1]?.toLowerCase().replace(KEBAB, (_, letter: string) => letter.toUpperCase())
    if (match?.[2] && key && isOverrideKey(key)) overrides[key] = match[2]
    else errors.push(`${i + 1}  ${line.trim()}`)
  })
  return { overrides, errors }
}
