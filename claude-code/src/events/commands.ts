import type { EngineInterface, On } from 'claude-code'
import { isHazardMode } from '../core'
import { withCommand, withHazards } from '../domain'
import { directivesReport, loadDirectives } from '../forcefield'
import { patchBridge, patchView, resetAll } from '../state'
import type { Runtime } from './runtime'
import { hazardsNow, openPane, PANE_ID, refreshStatus, remeasure } from './status'

const USAGE = 'Usage: /skywatch [launch|dock|recalibrate|hazards viewscreen|beacon|off|directives]'
const HAZARDS_USAGE = 'Usage: /skywatch hazards viewscreen|beacon|off'
const LAUNCHED = 'SkyWatch launched. Focus it with ctrl+x tab; 1-9 open docked shuttles, deck letters open their lists.'

/** `/skywatch hazards [mode]`: without a mode it shows this session's, with one it sets it. */
async function runHazards($: EngineInterface, runtime: Runtime, mode: string): Promise<string> {
  if (!mode) return `Hazards: ${await hazardsNow($, runtime)}. Change it with /skywatch hazards viewscreen|beacon|off.`
  if (!isHazardMode(mode)) return HAZARDS_USAGE
  await patchView($, view => withHazards(view, mode))
  await refreshStatus($, runtime)
  $.ui.invalidate('ui.render')
  return `Hazards: ${mode}, for this session.`
}

async function launch($: EngineInterface): Promise<string> {
  const opened = await openPane($)
  return opened.isPlaced ? LAUNCHED : `SkyWatch is not shown yet: ${opened.reason}`
}

/** `/skywatch [verb] [argument]`; no verb launches the pane. */
async function runSkywatch($: EngineInterface, runtime: Runtime, args: string): Promise<string> {
  const [verb = '', argument = ''] = args.trim().split(/\s+/)
  switch (verb || 'launch') {
    case 'launch':
      return launch($)
    case 'dock':
      await $.ui.close({ id: PANE_ID })
      return 'SkyWatch docked.'
    case 'recalibrate':
      await resetAll($)
      await refreshStatus($, runtime)
      return 'SkyWatch recalibrated.'
    case 'hazards':
      return runHazards($, runtime, argument)
    case 'directives':
      runtime.directives = await loadDirectives($)
      return directivesReport(runtime.directives)
    default:
      return USAGE
  }
}

/** After any slash command: the bridge clears it, and the hull is read fresh. */
async function endCommand($: EngineInterface, runtime: Runtime): Promise<void> {
  await patchBridge($, bridge => withCommand(bridge, null))
  await remeasure($, runtime)
}

export function registerCommands(on: On, runtime: Runtime): void {
  on('command.run', { command: 'skywatch' }, async ($, e) => ({ text: await runSkywatch($, runtime, e.args) }))

  // Every slash command passes here, so the bridge can show one running between jumps (a compaction runs no jump).
  on('command.run', async ($, e, next) => {
    if (e.command === 'skywatch') return next(e)
    await patchBridge($, bridge => withCommand(bridge, e.command))
    $.ui.invalidate('ui.render')
    try {
      return await next(e)
    } finally {
      await endCommand($, runtime)
    }
  })
}
