import type { Council, CouncilRoster, Jump, Moment, Transmission } from '../../types'
import { shorten } from '../core'

/** Agent types and server tools that sit on the council: an advisor or an architect, by name. */
export const COUNCIL_TYPES = /advisor|architect/i

export const MOMENTS = ['before a plan', 'error repeats', 'before done'] as const satisfies readonly Moment[]

const TRANSMISSIONS_MAX = 40
const COUNCIL_IDS_MAX = 40
const SEEN_MAX = 60
const ROSTER_MAX = 20
const ADVICE_MAX = 160
const MIN_TIMELINE_WIDTH = 4
/** Failed calls in a row on the bridge that make a consultation read as "error repeats". */
const ERROR_REPEATS = 2

/** Which of the council's moments a transmission falls at: an inference over the jump so far. */
export function momentOf(jump: Pick<Jump, 'edits' | 'errorStreak'>): Moment {
  if (jump.errorStreak >= ERROR_REPEATS) return 'error repeats'
  return jump.edits === 0 ? 'before a plan' : 'before done'
}

export function openTransmission(council: Council, opened: { id: string; at: number; moment: Moment; via: string }): Council {
  if (council.transmissions.some(t => t.id === opened.id)) return council
  return { ...council, transmissions: [...council.transmissions, { ...opened, endAt: null }].slice(-TRANSMISSIONS_MAX) }
}

/** Ends the open transmission (the latest without an end), or the one named. */
export function closeTransmission(council: Council, at: number, advice: string | null, id?: string): Council {
  const open = [...council.transmissions].reverse().find(t => t.endAt === null && (id === undefined || t.id === id))
  return {
    ...council,
    transmissions: council.transmissions.map(t => (t === open ? { ...t, endAt: at } : t)),
    lastAdvice: advice ?? council.lastAdvice,
  }
}

export function isTransmitting(council: Council): boolean {
  return council.transmissions.some(t => t.endAt === null)
}

export function isOpenTransmission(council: Council, id: string): boolean {
  return council.transmissions.some(t => t.id === id && t.endAt === null)
}

export function latestTransmission(council: Council): Transmission | undefined {
  return council.transmissions.at(-1)
}

export function hasCouncil(council: Council): boolean {
  return council.transmissions.length > 0 || council.ids.length > 0
}

/** A one-row timeline across `width` cells: ◆ a transmission, ━ while it ran. */
export function transmissionTimeline(council: Council, now: number, width: number): string {
  if (council.transmissions.length === 0 || width < MIN_TIMELINE_WIDTH) return '─'.repeat(Math.max(0, width))
  const first = council.transmissions[0]?.at ?? now
  const span = Math.max(1, now - first)
  const cells = Array.from({ length: width }, () => '─')
  const cellOf = (at: number) => Math.min(width - 1, Math.floor(((at - first) / span) * (width - 1)))
  for (const transmission of council.transmissions) {
    const from = cellOf(transmission.at)
    const to = cellOf(transmission.endAt ?? now)
    for (let i = from + 1; i <= to; i += 1) cells[i] = '━'
    cells[from] = '◆'
  }
  return cells.join('')
}

/** The first line that is not blank, a bracketed note or a tag. */
function firstRealLine(text: string): string {
  const lines = text.split('\n').map(line => line.trim())
  return lines.find(line => line && !line.startsWith('[') && !line.startsWith('<')) ?? ''
}

/** The advice line for a report: its first real line, markdown markers stripped. */
export function adviceLine(report: string): string {
  return shorten(
    firstRealLine(report)
      .replace(/\*\*|__/g, '')
      .replace(/^[#>*\s-]+/, ''),
    ADVICE_MAX,
  )
}

/** A shuttle's hand-back message: who sent it and the first line of its report. */
export function handbackOf(text: string): { from: string; body: string } | null {
  const from = /^\s*<agent-message\s+from="([^"]+)"/.exec(text)?.[1]
  if (!from) return null
  const rest = text.split(/The report follows:\s*\n/)[1] ?? text.replace(/^\s*<agent-message[^>]*>/, '')
  const body = firstRealLine(rest)
  return body ? { from, body } : null
}

export function withCouncilId(council: Council, id: string): Council {
  return { ...council, ids: [...council.ids, id].slice(-COUNCIL_IDS_MAX) }
}

export function withSeen(council: Council, id: string): Council {
  return { ...council, seen: [...council.seen, id].slice(-SEEN_MAX) }
}

export function withRosterType(roster: CouncilRoster, type: string): CouncilRoster {
  return roster.councilTypes.includes(type) ? roster : { councilTypes: [...roster.councilTypes, type].slice(-ROSTER_MAX) }
}

export function withAdvice(council: Council, advice: string): Council {
  return { ...council, lastAdvice: advice }
}
