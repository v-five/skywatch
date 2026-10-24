import type { Args, EngineInterface, ResultOf } from 'claude-code'
import { isRecord, shortPath, stringOf } from '../core'
import { commandOf, EDIT_TOOLS } from '../domain'
import { noteEdit, noteLanding, noteLaunch, noteRelayCall } from '../state'
import type { Runtime } from './runtime'

type CallResult = ResultOf['tool.call']

const MCP_SERVER = /^mcp__(.+?)__/
/** Tools that stop a background task, and the field naming it. */
const STOP_TOOLS: ReadonlyMap<string, string> = new Map([
  ['TaskStop', 'task_id'],
  ['KillShell', 'shell_id'],
  ['KillBash', 'shell_id'],
])

/** The first text block of a tool result, as an MCP error carries its message. */
function resultText(result: unknown): string {
  const content = isRecord(result) ? result.content : undefined
  const block = Array.isArray(content) ? content.find(item => isRecord(item) && item.type === 'text') : undefined
  return isRecord(block) ? stringOf(block.text) : ''
}

/** What a call adds to the station: an edited file, a relay's answer, a satellite launched or stopped. */
export async function recordStation(
  $: EngineInterface,
  runtime: Runtime,
  e: Args<'tool.call'>,
  call: { ran: CallResult; didRun: boolean },
): Promise<void> {
  const { ran, didRun } = call
  const hasFailed = didRun && ran.isError === true
  const input: Record<string, unknown> = isRecord(e) ? e : {}
  if (didRun && !hasFailed && EDIT_TOOLS.has(e.tool) && typeof input.file_path === 'string') {
    await noteEdit($, shortPath(input.file_path, runtime.places))
  }
  const server = MCP_SERVER.exec(e.tool)?.[1]
  if (server && didRun) await noteRelayCall($, server, hasFailed ? resultText(ran.result) || 'failed' : null)
  const taskId = isRecord(ran.result) ? stringOf(ran.result.backgroundTaskId) : ''
  if (taskId) await noteLaunch($, { id: taskId, label: stringOf(input.description) || commandOf(e) })
  const stopField = STOP_TOOLS.get(e.tool)
  const stopped = stopField ? stringOf(input[stopField]) : ''
  if (stopped && didRun) await noteLanding($, stopped, 'stopped')
}
