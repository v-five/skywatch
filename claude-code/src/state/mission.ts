import type { EngineInterface } from 'claude-code'
import { kTokens } from '../core'
import {
  compactionOf,
  type StepUsage,
  stepTokens,
  type UsageReading,
  usageFrom,
  WRITERS,
  withCompaction,
  withJumpTokens,
  withRequestTokens,
} from '../domain'
import { getUsage, patchJump, patchTotals, patchUsage } from './atoms'
import { logEntry } from './log'

/** Stores a usage reading; a compaction is read from the context, as installed mods cannot hook it. */
export async function recordUsage($: EngineInterface, reading: UsageReading): Promise<void> {
  const compaction = compactionOf((await getUsage($)).tokens, reading.context.tokens ?? null)
  if (compaction) {
    const at = await $.clock.now()
    await patchUsage($, usage => withCompaction(usage, at))
    await logEntry($, WRITERS.bridge, `context compacted (${kTokens(compaction.before)} → ${kTokens(compaction.after)})`)
  }
  await patchUsage($, usage => usageFrom(usage, reading))
}

/** A usage reading, or null on a host without one (headless, an SDK host, a session not yet bound). */
export async function readUsage($: EngineInterface): Promise<UsageReading | null> {
  return $.session.usage().catch(() => null)
}

/** The session's cost read fresh: the last jump subtracts two of these. */
export async function costNow($: EngineInterface): Promise<number | null> {
  return (await readUsage($))?.cost?.usd ?? null
}

/** The context after the last jump, 0 when unknown. */
export async function contextNow($: EngineInterface): Promise<number> {
  return (await readUsage($))?.context.tokens ?? 0
}

export async function addJumpTokens($: EngineInterface, usage: StepUsage): Promise<void> {
  const tokens = stepTokens(usage)
  if (tokens.tokIn === 0 && tokens.tokOut === 0) return
  await patchJump($, jump => withJumpTokens(jump, tokens))
  await patchTotals($, totals => withRequestTokens(totals, tokens))
}
