import type { BlackboxEntry, EntryKind, LineCost } from '../../types'
import { shorten } from '../core'

/** The writers the black box names; a shuttle writes under its label, or as `shuttle` once it has left the fleet. */
export const WRITERS = {
  captain: 'captain',
  comms: 'comms',
  bridge: 'bridge',
  council: 'council',
  shields: 'shields',
  shuttle: 'shuttle',
} as const

/** Black box entries shown at a time, and added per press. */
export const BLACKBOX_PAGE = 10

const BLACKBOX_MAX = 200
const PROMPT_MAX = 300
const COMMS_MAX = 70
const SENDER_ID_LENGTH = 8
const SLASH_COMMAND = /<command-(?:name|message)>\s*\/?([^<\s]+)\s*<\/command-(?:name|message)>/

export function newEntry(at: number, who: string, text: string, kind: EntryKind, agentId: string | null): BlackboxEntry {
  return { at, who, text, kind, agentId, cost: null }
}

export function appendEntry(entries: readonly BlackboxEntry[], entry: BlackboxEntry): BlackboxEntry[] {
  return [...entries, entry].slice(-BLACKBOX_MAX)
}

/** The jump's cost written onto the bridge entry that opened it. */
export function attachCost(entries: readonly BlackboxEntry[], at: number, cost: LineCost): BlackboxEntry[] {
  return entries.map(entry => (entry.at === at && !entry.agentId ? { ...entry, cost } : entry))
}

/** A jump's opening: the captain's words, or for a tagged message from the engine, comms and the message's kind. */
export function promptLine(text: string): { who: string; text: string } {
  const command = SLASH_COMMAND.exec(text)?.[1]
  if (command) return { who: WRITERS.comms, text: shorten(`/${command}`, COMMS_MAX) }
  const tag = /^\s*<([a-z][\w-]*)/i.exec(text)?.[1]
  if (!tag) return { who: WRITERS.captain, text: shorten(text, PROMPT_MAX) }
  const from = /\bfrom="([^"]+)"/.exec(text)?.[1]
  return {
    who: WRITERS.comms,
    text: shorten(`${tag.replace(/[-_]/g, ' ')}${from ? ` from ${from.slice(0, SENDER_ID_LENGTH)}` : ''}`, COMMS_MAX),
  }
}

export type KeyedEntry = { entry: BlackboxEntry; foldKey: string }

/** Newest first, one shuttle's only while it is viewed; fold keys count repeats of a time and writer, oldest first. */
export function keyedEntries(entries: readonly BlackboxEntry[], viewedAgentId: string | null): KeyedEntry[] {
  const seen = new Map<string, number>()
  const keyed = entries.map(entry => {
    const base = `log-${entry.at}-${entry.who}`
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return { entry, foldKey: count > 0 ? `${base}-${count}` : base }
  })
  return (viewedAgentId ? keyed.filter(({ entry }) => entry.agentId === viewedAgentId) : keyed).reverse()
}
