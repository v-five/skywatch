import type { EngineInterface } from 'claude-code'
import { type Places, shorten } from '../core'
import { describeInput, phraseOf, withCall, withMode, withShuttle, withShuttleCall } from '../domain'
import { patchBridge, patchShuttles } from './atoms'

const DOING_MAX = 80
const TITLE_MAX = 60

/** What a call is doing, for the bridge or the shuttle making it: the call, a title, and the task-list step. */
export async function noteCall(
  $: EngineInterface,
  agentId: string | undefined,
  call: { tool: string; input: unknown; places: Places },
): Promise<void> {
  const { tool, input } = call
  const doing = shorten(describeInput(tool, input, call.places), DOING_MAX)
  const doingTitle = shorten(phraseOf(tool, input), TITLE_MAX)
  const noted = { doing, doingTitle, tool, input }
  if (!agentId) await patchBridge($, bridge => withCall(bridge, noted))
  else await patchShuttles($, fleet => withShuttle(fleet, agentId, shuttle => withShuttleCall(shuttle, noted)))
}

export async function noteMode($: EngineInterface, mode: string | null | undefined): Promise<void> {
  if (mode) await patchBridge($, bridge => withMode(bridge, mode))
}
