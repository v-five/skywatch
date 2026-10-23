import type { EngineInterface, UiOpenResult } from 'claude-code'
import type { HazardMode } from '../../types'
import { effectiveHazards } from '../domain'
import { getCouncil, getShields, getShuttles, getUsage, getView, readUsage, recordUsage } from '../state'
import { beaconText } from '../ui'
import type { Runtime } from './runtime'

export const PANE_ID = 'skywatch'
const PANE_TITLE = 'SkyWatch'
const PANE_COLUMNS = 66
const PANE_ROWS = 8

/** Opens the pane: columns apply when docked beside the transcript, rows when seated above the prompt. */
export async function openPane($: EngineInterface): Promise<UiOpenResult> {
  return $.ui.open({ id: PANE_ID, title: PANE_TITLE, columns: PANE_COLUMNS, rows: PANE_ROWS })
}

export async function hazardsNow($: EngineInterface, runtime: Runtime): Promise<HazardMode> {
  return effectiveHazards(await getView($), runtime.config.hazards)
}

export async function readBeacon($: EngineInterface): Promise<string> {
  const [usage, council, shields, fleet] = await Promise.all([getUsage($), getCouncil($), getShields($), getShuttles($)])
  return beaconText({ usage, council, shields, fleet })
}

/** The beacon is a status entry, except on the terminal, which marks those as warnings: there it joins the hint line. */
export async function refreshStatus($: EngineInterface, runtime: Runtime): Promise<void> {
  const isTerminal = runtime.surface === 'terminal'
  const isBeacon = (await hazardsNow($, runtime)) === 'beacon'
  $.ui.status(isBeacon && !isTerminal ? await readBeacon($) : undefined)
  if (isTerminal) $.ui.invalidate('ui.render')
}

/** Reads the hull fresh outside a jump (after a command or a compaction) and redraws. */
export async function remeasure($: EngineInterface, runtime: Runtime): Promise<void> {
  const reading = await readUsage($)
  if (reading) await recordUsage($, reading)
  await refreshStatus($, runtime)
  $.ui.invalidate('ui.render')
}
