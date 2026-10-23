import type { Args, EngineInterface, On, ResultOf } from 'claude-code'
import type { Check } from '../../types'
import { fmtDuration, shorten } from '../core'
import {
  adviceLine,
  afterCall,
  type CheckDecision,
  checkVerdict,
  countHeld,
  deckOf,
  describeInput,
  EDIT_TOOLS,
  HANDBACK_TOOL,
  handbackMessage,
  hasPendingAsk,
  noteTool,
  recordCheck,
  settleCheck,
  WRITERS,
  withShuttle,
} from '../domain'
import { gateVerdict, type Held, holdFor } from '../forcefield'
import { getCouncil, getJump, getShields, logEntry, noteAdvice, noteCall, patchJump, patchShields, patchShuttles, whoIs } from '../state'
import type { Runtime } from './runtime'
import { refreshStatus } from './status'

const CHECK_DETAIL_MAX = 90
const CALL_TEXT_MAX = 64

type CallResult = ResultOf['tool.call']

/** Bookkeeping never decides a verdict or a call: if it fails, the force field still answers. */
async function bestEffort(work: Promise<unknown>): Promise<void> {
  await work.catch(() => undefined)
}

async function recordVerdict(
  $: EngineInterface,
  runtime: Runtime,
  e: Args<'tool.check'>,
  gate: { id: string; decision: CheckDecision; blockedBy: string | null },
): Promise<void> {
  const { decision, blockedBy } = gate
  const check: Check = {
    id: gate.id,
    tool: e.tool,
    deck: deckOf(e.tool, e.input, runtime.config.decks),
    verdict: checkVerdict(decision, blockedBy !== null),
    inSubagent: Boolean(e.agentId),
    detail: shorten(describeInput(e.tool, e.input, runtime.places), CHECK_DETAIL_MAX),
    at: await $.clock.now(),
  }
  await patchShields($, shields => recordCheck(shields, check))
  // The status line updates when a prompt goes up and when the call settles; a refusal ends here.
  if (decision === 'ask') await refreshStatus($, runtime)
  if (blockedBy !== null) {
    await logEntry($, WRITERS.shields, `blocked by directive "${blockedBy}" · ${check.detail}`, 'error')
    await patchShields($, shields => countHeld(shields, 'blocked'))
    await refreshStatus($, runtime)
  } else if (decision === 'deny') {
    await logEntry($, WRITERS.shields, `stopped by rule · ${check.detail}`, 'error')
    await refreshStatus($, runtime)
  }
}

/** The held call's prompt is up: its wait starts now. */
async function markAsked($: EngineInterface, runtime: Runtime, id: string, held: Held): Promise<void> {
  runtime.held.set(id, { ...held, since: await $.clock.now() })
  $.ui.invalidate('ui.render')
}

/** Measures a risky call before it runs, so tool.check can put it to the prompt. */
async function holdCall($: EngineInterface, runtime: Runtime, e: Args<'tool.call'>): Promise<void> {
  const draft = await holdFor($, { tool: e.tool, input: e, places: runtime.places }, runtime.directives.directives)
  if (draft) runtime.held.set(e.tool_use_id, { ...draft, who: await whoIs($, e.agentId) })
}

/** A held call settles: it waited for an answer, then ran or was stopped. */
async function settleHeld($: EngineInterface, runtime: Runtime, e: Args<'tool.call'>, didRun: boolean): Promise<void> {
  const held = runtime.held.get(e.tool_use_id)
  if (!held) return
  runtime.held.delete(e.tool_use_id)
  if (held.since !== null) {
    const waited = fmtDuration((await $.clock.now()) - held.since)
    await logEntry(
      $,
      WRITERS.shields,
      `held ${waited} · ${didRun ? 'cleared' : 'stopped'} ${held.headline}`,
      didRun ? 'info' : 'error',
      e.agentId ?? null,
    )
    await patchShields($, shields => countHeld(shields, didRun ? 'ran' : 'refused'))
  }
  $.ui.invalidate('ui.render')
}

/** Settles this call's pending ask, if it had one; no write, and no redraw, otherwise. */
async function settleAsk($: EngineInterface, id: string, didRun: boolean): Promise<boolean> {
  if (!hasPendingAsk(await getShields($), id)) return false
  await patchShields($, shields => settleCheck(shields, id, didRun))
  return true
}

/** A background shuttle hands its report back through a tool; an architect's report is its advice. */
async function noteHandback($: EngineInterface, e: Args<'tool.call'>): Promise<void> {
  const message = handbackMessage(e)
  if (!e.agentId || message === null) return
  const council = await getCouncil($)
  if (!council.ids.includes(e.agentId)) return
  const advice = adviceLine(message)
  if (advice && advice !== council.lastAdvice) await noteAdvice($, advice)
}

/** The jump's edits and errors, the shuttle's last tools, and the black box's refusals, errors and edits. */
async function recordOutcome($: EngineInterface, runtime: Runtime, e: Args<'tool.call'>, ran: CallResult, didRun: boolean): Promise<void> {
  const hasFailed = didRun && ran.isError === true
  const isEdit = !hasFailed && didRun && EDIT_TOOLS.has(e.tool)
  const isStopped = ran.deny !== undefined
  if (isEdit || hasFailed || (!e.agentId && (await getJump($)).errorStreak > 0)) {
    await patchJump($, jump => afterCall(jump, { inSubagent: Boolean(e.agentId), hasFailed, isEdit }))
  }
  const text = shorten(describeInput(e.tool, e, runtime.places), CALL_TEXT_MAX)
  const { agentId } = e
  if (agentId) {
    await patchShuttles($, fleet =>
      withShuttle(fleet, agentId, shuttle => noteTool(shuttle, { tool: e.tool, text, isError: hasFailed || isStopped })),
    )
  }
  if (!isStopped && !hasFailed && !isEdit) return
  const line = isStopped ? `${text}  stopped` : hasFailed ? `${text}  ✗` : text
  await logEntry($, await whoIs($, agentId), line, isStopped || hasFailed ? 'error' : 'info', agentId ?? null)
}

/** After a call: its hold and ask settle, then its outcome is recorded and the status refreshed when it changed. */
async function afterToolCall($: EngineInterface, runtime: Runtime, e: Args<'tool.call'>, ran: CallResult): Promise<void> {
  const didRun = ran.deny === undefined
  const isHandback = String(e.tool) === HANDBACK_TOOL
  await settleHeld($, runtime, e, didRun)
  const isSettled = await settleAsk($, e.tool_use_id, didRun)
  if (isHandback) await noteHandback($, e)
  else if (e.tool !== 'Agent') await recordOutcome($, runtime, e, ran, didRun)
  if (!isHandback && (isSettled || (!didRun && e.tool !== 'Agent'))) await refreshStatus($, runtime)
}

export function registerTools(on: On, runtime: Runtime): void {
  // A measured risky call goes to the permission prompt, whatever the rules allowed; a refusal stays.
  on('tool.check', async ($, e, next) => {
    const found = await next(e)
    const id = e.tool_use_id
    if (!id) return found
    const held = runtime.held.get(id)
    const { verdict, blockedBy } = gateVerdict(found, held)
    if (held && verdict.decision === 'ask') await bestEffort(markAsked($, runtime, id, held))
    await bestEffort(recordVerdict($, runtime, e, { id, decision: verdict.decision, blockedBy }))
    return verdict
  })

  on('tool.call', async ($, e, next) => {
    if (String(e.tool) !== HANDBACK_TOOL) await bestEffort(noteCall($, e.agentId, { tool: e.tool, input: e, places: runtime.places }))
    await bestEffort(holdCall($, runtime, e))
    let ran: CallResult | undefined
    try {
      ran = await next(e)
    } finally {
      if (ran === undefined) runtime.held.delete(e.tool_use_id)
    }
    await bestEffort(afterToolCall($, runtime, e, ran))
    return ran
  })
}
