import type { CheckDecision } from '../domain'
import type { Held } from './risk'

type Decided = { decision: CheckDecision; reason?: string }

/** A held call's verdict becomes an ask, a blocked one a deny naming its directive; a refusal already made stays. */
export function gateVerdict<V extends Decided>(found: V, held: Held | undefined): { verdict: V; blockedBy: string | null } {
  if (!held || found.decision === 'deny') return { verdict: found, blockedBy: null }
  if (held.mode === 'block') {
    const reason = `SkyWatch blocks this: the directive "${held.directive}" covers it.`
    return { verdict: { ...found, decision: 'deny', reason }, blockedBy: held.directive }
  }
  return { verdict: { ...found, decision: 'ask', reason: `SkyWatch: this would ${held.summary}.` }, blockedBy: null }
}
