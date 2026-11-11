import type { EngineInterface, On } from 'claude-code'
import { isHazardMode } from '../core'
import { activeTime, debriefText, WRITERS, withCommand, withForcefield, withHazards } from '../domain'
import { directivesReport, loadDirectives } from '../forcefield'
import {
  getBlackbox,
  getBridge,
  getJump,
  getShields,
  getShuttles,
  getStation,
  getTotals,
  getUsage,
  getView,
  logEntry,
  patchBridge,
  patchView,
  resetAll,
} from '../state'
import { paletteReport } from './palette'
import type { Runtime } from './runtime'
import { hazardsNow, openPane, PANE_ID, refreshStatus, remeasure } from './status'

const USAGE = 'Usage: /skywatch [launch|dock|recalibrate|hazards viewscreen|beacon|off|forcefield on|off|directives|palette|debrief]'
const HAZARDS_USAGE = 'Usage: /skywatch hazards viewscreen|beacon|off'
const FORCEFIELD_USAGE = 'Usage: /skywatch forcefield on|off'
const LAUNCHED = 'SkyWatch launched.'

/** `/skywatch hazards [mode]`: without a mode it shows this session's, with one it sets it. */
async function runHazards($: EngineInterface, runtime: Runtime, mode: string): Promise<string> {
  if (!mode) return `Hazards: ${await hazardsNow($, runtime)}. Change it with /skywatch hazards viewscreen|beacon|off.`
  if (!isHazardMode(mode)) return HAZARDS_USAGE
  await patchView($, view => withHazards(view, mode))
  await refreshStatus($, runtime)
  $.ui.invalidate('ui.render')
  return `Hazards: ${mode}, for this session.`
}

/** `/skywatch forcefield [on|off]`: off, the directives hold and block nothing for this session. */
async function runForcefield($: EngineInterface, runtime: Runtime, state: string): Promise<string> {
  const isOff = (await getView($)).isForcefieldOff === true
  if (!state) return `Force field: ${isOff ? 'off' : 'on'}. Change it with /skywatch forcefield on|off.`
  if (state !== 'on' && state !== 'off') return FORCEFIELD_USAGE
  if ((state === 'off') !== isOff) {
    await patchView($, view => withForcefield(view, state === 'off'))
    await logEntry($, WRITERS.shields, `force field ${state}`, state === 'off' ? 'error' : 'info')
  }
  await refreshStatus($, runtime)
  $.ui.invalidate('ui.render')
  return state === 'off'
    ? 'Force field: off, for this session. Directives hold and block nothing; Claude Code decides. Turn it back on with /skywatch forcefield on.'
    : 'Force field: on.'
}

/** `/skywatch debrief`: the session as markdown, to keep or paste into a pull request. */
async function readDebrief($: EngineInterface): Promise<string> {
  const [totals, usage, jump, bridge, fleet, shields, station, blackbox, now] = await Promise.all([
    getTotals($),
    getUsage($),
    getJump($),
    getBridge($),
    getShuttles($),
    getShields($),
    getStation($),
    getBlackbox($),
    $.clock.now(),
  ])
  return debriefText({
    totals,
    usage,
    activeMs: activeTime(totals, jump, bridge.isRunning, now),
    plan: bridge.planSteps ?? [],
    fleet,
    shields,
    station,
    errors: blackbox.filter(entry => entry.kind === 'error').length,
  })
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
    case 'forcefield':
      return runForcefield($, runtime, argument)
    case 'debrief':
      return readDebrief($)
    case 'palette':
      return paletteReport(runtime.config.palette, runtime.paletteFiles)
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
