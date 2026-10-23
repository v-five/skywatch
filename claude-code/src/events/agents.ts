import type { Args, EngineInterface, On } from 'claude-code'
import { addShuttle, COUNCIL_TYPES, dropProbe, isOpenTransmission, newShuttle, serverBlocksOf, shuttleWriter } from '../domain'
import {
  addCouncilId,
  addCouncilType,
  endTransmission,
  getCouncil,
  getShuttles,
  isCouncilType,
  logEntry,
  markSeen,
  noteMode,
  patchProbes,
  patchShuttles,
  startTransmission,
} from '../state'
import type { Runtime } from './runtime'
import { refreshStatus } from './status'

/** A spawned agent: a council member opens a transmission; any other is a shuttle. */
async function launchAgent(
  $: EngineInterface,
  runtime: Runtime,
  e: Args<'agent.spawn'>,
  started: { agentId: string; model: string },
): Promise<void> {
  const id = started.agentId
  if (await isCouncilType($, e.subagentType)) {
    await addCouncilId($, id)
    await patchProbes($, probes => dropProbe(probes, id))
    await startTransmission($, id, e.subagentType.split(':').pop() ?? 'agent')
    await refreshStatus($, runtime)
    return
  }
  const shuttle = newShuttle(await getShuttles($), {
    id,
    type: e.name ?? e.subagentType,
    model: started.model,
    description: e.description,
    prompt: e.prompt,
    spawnedAt: await $.clock.now(),
  })
  await patchShuttles($, fleet => addShuttle(fleet, shuttle))
  await patchProbes($, probes => dropProbe(probes, id))
  await logEntry($, shuttleWriter(shuttle), `spawned · ${shuttle.type}`, 'info', id)
  await refreshStatus($, runtime)
}

/** A server-side review tool never reaches tool.call: it shows only in the assistant's rows. */
async function readServerTools($: EngineInterface, runtime: Runtime, content: unknown): Promise<void> {
  const { seen } = await getCouncil($)
  // Transmissions this row opened: their result may be in the same row.
  const opened = new Set<string>()
  for (const block of serverBlocksOf(content)) {
    if (block.type === 'server_tool_use' && block.name && block.id && COUNCIL_TYPES.test(block.name)) {
      if (seen.includes(block.id)) continue
      await markSeen($, block.id)
      opened.add(block.id)
      await startTransmission($, block.id, `${block.name} tool`)
      await refreshStatus($, runtime)
    } else if (block.type.endsWith('_tool_result') && block.tool_use_id) {
      const id = block.tool_use_id
      if (!opened.has(id) && !isOpenTransmission(await getCouncil($), id)) continue
      await endTransmission($, null, id)
      await refreshStatus($, runtime)
    }
  }
}

export function registerAgents(on: On, runtime: Runtime): void {
  on('agent.offer', async ($, e, next) => {
    const offered = await next(e)
    if (COUNCIL_TYPES.test(e.agent)) await addCouncilType($, e.agent)
    return offered
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    if (!e.parentAgentId) await noteMode($, e.permissionMode)
    if (started.deny === undefined && started.agentId) await launchAgent($, runtime, e, { agentId: started.agentId, model: started.model })
    return started
  })

  on('session.append', { door: 'response' }, async ($, e, next) => {
    if (!e.agentId && e.message.type === 'assistant') await readServerTools($, runtime, e.message.content)
    return next(e)
  })
}
