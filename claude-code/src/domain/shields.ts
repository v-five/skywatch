import type { ResultOf } from 'claude-code'
import type { Check, Deck, HeldTally, Shields, Tally, Verdict } from '../../types'
import { DECKS } from '../core'
import { APP_TOOLS, commandOf, FILE_TOOLS, SHELL_TOOLS } from './calls'
import { ZERO_TALLY } from './defaults'

/** The decision a permission check settles on. */
export type CheckDecision = ResultOf['tool.check']['decision']

const RECENT_CHECKS_MAX = 80
const DECK_MATCH: Readonly<Record<Exclude<Deck, 'other'>, (tool: string, input: unknown) => boolean>> = {
  file: tool => FILE_TOOLS.has(tool),
  git: (tool, input) => SHELL_TOOLS.has(tool) && /^\s*(git|gh)\b/.test(commandOf(input)),
  shell: tool => SHELL_TOOLS.has(tool),
  web: tool => tool === 'WebFetch' || tool === 'WebSearch' || /^mcp__(Claude_Browser|claude-in-chrome)__/.test(tool),
  agents: tool => tool === 'Agent' || tool === 'Skill',
  app: tool => tool.startsWith('mcp__ccd_') || APP_TOOLS.has(tool),
  mcp: tool => tool.startsWith('mcp__'),
}

/** The first chosen deck a call matches, else `other`. */
export function deckOf(tool: string, input: unknown, decks: readonly Deck[]): Deck {
  return DECKS.find(deck => deck !== 'other' && decks.includes(deck) && DECK_MATCH[deck](tool, input)) ?? 'other'
}

const VERDICT_OF: Readonly<Record<CheckDecision, Verdict>> = { allow: 'rule', ask: 'ask', deny: 'deny' }

/** A check's verdict from the decision that settled it. */
export function checkVerdict(decision: CheckDecision, isBlocked: boolean): Verdict {
  // A decision a newer engine adds reads as stopped, as a stored unknown verdict does.
  return isBlocked ? 'blocked' : (VERDICT_OF[decision] ?? 'deny')
}

/** Keeps the last `max` checks, but never drops a pending ask: its settle must still find it. */
export function trimRecent(list: Check[], max: number): Check[] {
  let extra = list.length - max
  if (extra <= 0) return list
  const kept: Check[] = []
  for (const check of list) {
    if (extra > 0 && check.verdict !== 'ask') {
      extra -= 1
      continue
    }
    kept.push(check)
  }
  return kept.slice(-max * 2)
}

const withVerdict = (tally: Tally, verdict: Verdict, by: number): Tally => ({ ...tally, [verdict]: Math.max(0, tally[verdict] + by) })

export function recordCheck(shields: Shields, check: Check): Shields {
  const tally = shields.totals[check.deck] ?? ZERO_TALLY
  return {
    ...shields,
    recent: trimRecent([...shields.recent, check], RECENT_CHECKS_MAX),
    totals: { ...shields.totals, [check.deck]: withVerdict(tally, check.verdict, 1) },
  }
}

/** An `ask` settled by the call that followed it: it ran (cleared) or was refused. */
export function settleCheck(shields: Shields, id: string, didRun: boolean): Shields {
  const pending = shields.recent.find(check => check.id === id && check.verdict === 'ask')
  if (!pending) return shields
  const verdict = didRun ? 'cleared' : 'refused'
  const tally = shields.totals[pending.deck] ?? ZERO_TALLY
  return {
    ...shields,
    recent: shields.recent.map(check => (check === pending ? { ...check, verdict } : check)),
    totals: { ...shields.totals, [pending.deck]: withVerdict(withVerdict(tally, 'ask', -1), verdict, 1) },
  }
}

export function hasPendingAsk(shields: Shields, id: string): boolean {
  return shields.recent.some(check => check.id === id && check.verdict === 'ask')
}

export function tallyTotal(tally: Tally): number {
  return tally.rule + tally.ask + tally.cleared + tally.refused + tally.deny + tally.blocked
}

export function shieldsSummary(shields: Shields): Tally & { total: number } {
  const all = Object.values(shields.totals).reduce<Tally>(
    (sum, tally) => ({
      rule: sum.rule + tally.rule,
      ask: sum.ask + tally.ask,
      cleared: sum.cleared + tally.cleared,
      refused: sum.refused + tally.refused,
      deny: sum.deny + tally.deny,
      blocked: sum.blocked + tally.blocked,
    }),
    ZERO_TALLY,
  )
  return { ...all, total: tallyTotal(all) }
}

export function countHeld(shields: Shields, outcome: keyof HeldTally): Shields {
  return { ...shields, held: { ...shields.held, [outcome]: shields.held[outcome] + 1 } }
}
