import type { EngineInterface } from 'claude-code'
import type { EntryKind, LineCost } from '../../types'
import { appendEntry, attachCost, newEntry, shuttleWriter, WRITERS } from '../domain'
import { getShuttles, patchBlackbox } from './atoms'

/** Writes a black box entry; resolves to its time, the key a jump's cost is later written under. */
export async function logEntry(
  $: EngineInterface,
  who: string,
  text: string,
  kind: EntryKind = 'info',
  agentId: string | null = null,
): Promise<number> {
  const at = await $.clock.now()
  await patchBlackbox($, entries => appendEntry(entries, newEntry(at, who, text, kind, agentId)))
  return at
}

/** The writer for a call: the bridge, or the shuttle making it; never fails, as a held call needs a writer. */
export async function whoIs($: EngineInterface, agentId: string | undefined): Promise<string> {
  if (!agentId) return WRITERS.bridge
  const fleet = await getShuttles($).catch(() => [])
  const shuttle = fleet.find(each => each.id === agentId)
  return shuttle ? shuttleWriter(shuttle) : WRITERS.shuttle
}

export async function attachPromptCost($: EngineInterface, promptAt: number, cost: LineCost): Promise<void> {
  await patchBlackbox($, entries => attachCost(entries, promptAt, cost))
}
