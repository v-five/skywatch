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
  withEstimatedContext,
  withJumpTokens,
  withManifest,
  withRequestTokens,
  withUsed,
} from '../domain'
import { getUsage, patchJump, patchTotals, patchUsage } from './atoms'
import { logEntry } from './log'

/** The reading as given, or with its context estimated when no response has counted it since a compaction. */
async function withContext($: EngineInterface, reading: UsageReading): Promise<UsageReading> {
  if (reading.context.tokens != null) return reading
  const estimate = await $.session.usage({ breakdown: 'summary' }).catch(() => null)
  const total = estimate?.context.breakdown?.totalTokens
  return total === undefined ? reading : withEstimatedContext(reading, total)
}

/** Stores a usage reading; a compaction is read from the context, as installed mods cannot hook it. */
export async function recordUsage($: EngineInterface, given: UsageReading): Promise<void> {
  const reading = await withContext($, given)
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

/** What fills the context, from Claude Code's local estimate: free, and sent nowhere. */
export async function recordManifest($: EngineInterface): Promise<void> {
  const reading = await $.session.usage({ breakdown: 'summary' }).catch(() => null)
  const breakdown = reading?.context.breakdown
  if (breakdown) await patchUsage($, usage => withManifest(usage, breakdown))
}

/** Something the context carries was used: it is ballast no more. */
export async function noteUsed($: EngineInterface, key: string): Promise<void> {
  await patchUsage($, usage => withUsed(usage, key))
}
