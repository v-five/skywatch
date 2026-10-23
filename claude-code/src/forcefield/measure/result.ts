import type { Measure } from '../risk'

export const LIST_MAX = 10

/** A measure with nothing to list. */
export function plainMeasure(summary: string, note = ''): Measure {
  return { summary, lines: [], more: 0, note }
}

/** A measure listing up to LIST_MAX lines, and how many more there are. */
export function listMeasure(summary: string, lines: readonly string[], note: string): Measure {
  return { summary, lines: lines.slice(0, LIST_MAX), more: Math.max(0, lines.length - LIST_MAX), note }
}
