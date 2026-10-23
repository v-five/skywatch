import type { EngineInterface } from 'claude-code'
import { PALETTE_NAMES, type PaletteName, type PerSurface } from '../core'
import { type PaletteOverrides, parsePaletteFile } from '../ui'

const PALETTE_FILE = '.claude/skywatch.palette'

export type PaletteFiles = { overrides: PaletteOverrides; errors: string[] }

/** The person's palette file, then the project's: a colour named in both takes the project's. */
export async function loadPaletteFiles($: EngineInterface, home: string): Promise<PaletteFiles> {
  const files = [
    ...(home ? [{ path: `${home}/${PALETTE_FILE}`, source: `~/${PALETTE_FILE}` }] : []),
    { path: PALETTE_FILE, source: PALETTE_FILE },
  ]
  let overrides: PaletteOverrides = {}
  const errors: string[] = []
  for (const file of files) {
    const text = await $.fs.read(file.path).catch(() => null)
    if (typeof text !== 'string') continue
    const parsed = parsePaletteFile(text)
    overrides = { ...overrides, ...parsed.overrides }
    errors.push(...parsed.errors.map(error => `${file.source}:${error}`))
  }
  return { overrides, errors }
}

/** `/skywatch palette`: each surface's preset, the colours the files set, and lines they could not read. */
export function paletteReport(palette: PerSurface<PaletteName>, files: PaletteFiles): string {
  const set = Object.entries(files.overrides).map(([key, color]) => `${key} = ${color}`)
  return [
    `Palette: app ${palette.app}, terminal ${palette.terminal}. Presets: ${PALETTE_NAMES.join(', ')}.`,
    set.length > 0 ? `From ${PALETTE_FILE}: ${set.join(', ')}` : `No colours set in ~/${PALETTE_FILE} or ${PALETTE_FILE}.`,
    ...(files.errors.length > 0 ? ['', 'Not read (each line is `name = colour`):', ...files.errors] : []),
  ].join('\n')
}
