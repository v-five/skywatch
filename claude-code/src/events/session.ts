import type { EngineInterface, On } from 'claude-code'
import { usageFrom, withCommand } from '../domain'
import { homeFolder, loadDirectives } from '../forcefield'
import { loadTotals, migrateState, patchBridge, patchUsage, readUsage, recordUsage, resetAll } from '../state'
import type { Runtime } from './runtime'
import { openPane, refreshStatus, remeasure } from './status'

async function startSession($: EngineInterface, runtime: Runtime): Promise<void> {
  runtime.directives = await loadDirectives($).catch(() => runtime.directives)
  const [cwd, home] = await Promise.all([$.session.cwd().catch(() => ''), homeFolder($)])
  runtime.places = { cwd, home }
  await $.command.register({
    name: 'skywatch',
    description: 'SkyWatch, a starbase for your session: launch, dock, recalibrate, hazards, directives',
    argumentHint: '[launch|dock|recalibrate|hazards viewscreen|beacon|off|directives]',
  })
  await migrateState($)
  // A command still marked running belongs to a process that has gone.
  await patchBridge($, bridge => withCommand(bridge, null))
  const reading = await readUsage($)
  if (reading) await patchUsage($, usage => usageFrom(usage, reading))
  await loadTotals($).catch(() => undefined)
  if (runtime.config.autoLaunch) void openPane($).catch(() => undefined)
  await refreshStatus($, runtime)
}

export function registerSession(on: On, runtime: Runtime): void {
  on('session.start', async ($, e, next) => {
    runtime.surface = e.surface ?? null
    await startSession($, runtime)
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      await resetAll($)
      await refreshStatus($, runtime)
    }
    return next(e)
  })

  // Every compaction ends here, manual or automatic, whether or not a slash command ran it.
  on('classic.PostCompact', async ($, e, next) => {
    await remeasure($, runtime).catch(() => undefined)
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await recordUsage($, e)
    if (e.changed.includes('context')) await refreshStatus($, runtime)
    return next(e)
  })
}
