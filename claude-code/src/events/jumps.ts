import type { Args, EngineInterface, On, ResultOf } from 'claude-code'
import type { Shuttle, Speed } from '../../types'
import { fmtDuration } from '../core'
import {
  adviceLine,
  applyStep,
  endProbe,
  endRunning,
  handbackOf,
  hasShuttle,
  jumpCost,
  landShuttle,
  lastJumpOf,
  promptLine,
  startJump,
  startRunning,
  statusOf,
  stepProbe,
  stepSpeed,
  withActiveTime,
  withHistory,
  withPromptAt,
  withShuttle,
  withSpeed,
  withStep,
} from '../domain'
import {
  addJumpTokens,
  attachPromptCost,
  contextNow,
  costNow,
  endTransmission,
  followSession,
  getCouncil,
  getJump,
  getShuttles,
  logEntry,
  noteAdvice,
  noteMode,
  patchBridge,
  patchJump,
  patchLastJump,
  patchProbes,
  patchShuttles,
  patchTotals,
  patchUsage,
  saveTotals,
  whoIs,
} from '../state'
import type { Runtime } from './runtime'
import { refreshStatus } from './status'

/** A jump opens with the captain's words, or a tagged message; an architect's report is its advice. */
async function startBridgeJump($: EngineInterface, runtime: Runtime, text: string | undefined): Promise<void> {
  await followSession($)
  if (runtime.modeSeen) await noteMode($, runtime.modeSeen)
  const [now, cost] = await Promise.all([$.clock.now(), costNow($)])
  await patchJump($, () => startJump(now, cost))
  await patchBridge($, startRunning)
  if (!text) return
  // The hand-back tool call normally carries a background architect's report first; this is the fallback.
  const handback = handbackOf(text)
  const council = handback ? await getCouncil($) : null
  if (handback && council?.ids.includes(handback.from)) {
    const advice = adviceLine(handback.body)
    if (advice && advice !== council.lastAdvice) await noteAdvice($, advice)
    return
  }
  const opening = promptLine(text)
  const promptAt = await logEntry($, opening.who, opening.text)
  await patchJump($, jump => withPromptAt(jump, promptAt))
}

type StepResult = ResultOf['turn.step']

async function recordAgentStep(
  $: EngineInterface,
  e: Args<'turn.step'>,
  id: string,
  result: StepResult,
  speed: Speed | null,
): Promise<void> {
  const [fleet, council] = await Promise.all([getShuttles($), getCouncil($)])
  if (!hasShuttle(fleet, id)) {
    if (council.ids.includes(id)) return
    const now = await $.clock.now()
    await patchProbes($, probes => stepProbe(probes, id, now))
    return
  }
  const step = { model: e.model, usage: result.usage, stopReason: result.stopReason }
  const effort = e.effort ? String(e.effort) : null
  await patchShuttles($, stored =>
    withShuttle(stored, id, shuttle => {
      const stepped = { ...applyStep(shuttle, step), ...(effort ? { effort } : {}) }
      return speed ? withSpeed(stepped, speed) : stepped
    }),
  )
  if (result.stopReason === 'max_tokens') await logEntry($, await whoIs($, id), 'hit max_tokens', 'error', id)
}

async function completeBridgeJump($: EngineInterface, runtime: Runtime, e: Args<'turn.complete'>): Promise<void> {
  const [jump, fleet, cost] = await Promise.all([getJump($), getShuttles($), costNow($)])
  const shuttlesSince = fleet.filter(shuttle => shuttle.spawnedAt >= jump.startedAt).length
  await patchLastJump($, () => lastJumpOf(jump, { durationMs: e.durationMs, shuttlesSince, costNow: cost, reason: e.reason }))
  if (jump.promptAt !== null) await attachPromptCost($, jump.promptAt, jumpCost(jump, cost))
  await patchBridge($, endRunning)
  // The context after this jump, for the viewscreen's change since the last one.
  const context = await contextNow($)
  if (context > 0) await patchUsage($, usage => withHistory(usage, context))
  await patchTotals($, totals => withActiveTime(totals, e.durationMs))
  await saveTotals($)
  await refreshStatus($, runtime)
}

async function completeShuttle($: EngineInterface, e: Args<'turn.complete'>, shuttle: Shuttle, now: number): Promise<void> {
  const status = statusOf(e.reason)
  await patchShuttles($, fleet => withShuttle(fleet, shuttle.id, each => landShuttle(each, { status, at: now, answer: e.answer })))
  const text = status === 'done' ? `done · ${fmtDuration(now - shuttle.spawnedAt)}` : status
  await logEntry($, await whoIs($, shuttle.id), text, status === 'done' ? 'done' : 'error', shuttle.id)
}

/** A council member's answer ends its transmission; a shuttle docks; any other loop is a probe that ended. */
async function completeAgent($: EngineInterface, runtime: Runtime, e: Args<'turn.complete'>, id: string): Promise<void> {
  if ((await getCouncil($)).ids.includes(id)) {
    await endTransmission($, e.answer, id)
  } else {
    const now = await $.clock.now()
    const shuttle = (await getShuttles($)).find(each => each.id === id)
    if (shuttle) await completeShuttle($, e, shuttle, now)
    else await patchProbes($, probes => endProbe(probes, id, now))
  }
  await refreshStatus($, runtime)
}

export function registerJumps(on: On, runtime: Runtime): void {
  on('turn.start', async ($, e, next) => {
    await startBridgeJump($, runtime, e.text)
    return next(e)
  })

  // Times the response as it passes: the first piece that is not the engine's envelope, then the stop.
  on('turn.step', async function* ($, e, next) {
    if (!e.agentId) await patchBridge($, bridge => withStep(bridge, e.model, e.effort))
    const sentAt = await $.clock.now()
    let firstAt: number | null = null
    let stopAt: number | null = null
    const stream = next(e)
    for await (const chunk of stream) {
      if (chunk.kind === 'stop') stopAt = await $.clock.now()
      else if (firstAt === null && chunk.kind !== 'engine') firstAt = await $.clock.now()
      yield chunk
    }
    const result = await stream.result
    await addJumpTokens($, result.usage)
    const speed = result.usage && stopAt !== null ? stepSpeed(sentAt, firstAt, stopAt, result.usage.output_tokens) : null
    if (e.agentId) await recordAgentStep($, e, e.agentId, result, speed)
    else if (speed) await patchBridge($, bridge => withSpeed(bridge, speed))
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId) await completeAgent($, runtime, e, e.agentId)
    else await completeBridgeJump($, runtime, e)
    return done
  })
}
