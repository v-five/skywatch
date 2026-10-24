import type { EngineInterface } from 'claude-code'
import type { Satellite } from '../../types'
import { changesOf, endSatellite, launchSatellite, withChanges, withEdit, withRelayCall } from '../domain'
import { patchStation } from './atoms'

const GIT_TIMEOUT_MS = 5000
/** The working tree against HEAD, a line per file; paths unquoted, as they are. */
const NUMSTAT = ['git', '-c', 'core.quotepath=off', 'diff', '--numstat', 'HEAD']

/** Looks at the repository's uncommitted changes; outside a repository there is nothing to carry. */
export async function lookAtCargo($: EngineInterface): Promise<void> {
  const run = await $.process.run(NUMSTAT, { timeoutMs: GIT_TIMEOUT_MS }).catch(() => null)
  const changes = run && run.exitCode === 0 ? changesOf(run.stdout) : null
  await patchStation($, station => withChanges(station, changes))
}

export async function noteEdit($: EngineInterface, path: string): Promise<void> {
  await patchStation($, station => withEdit(station, path))
}

export async function noteRelayCall($: EngineInterface, server: string, failure: string | null): Promise<void> {
  await patchStation($, station => withRelayCall(station, server, failure))
}

export async function noteLaunch($: EngineInterface, satellite: { id: string; label: string }): Promise<void> {
  const at = await $.clock.now()
  await patchStation($, station => launchSatellite(station, { ...satellite, at }))
}

export async function noteLanding($: EngineInterface, id: string, status: Satellite['status']): Promise<void> {
  const at = await $.clock.now()
  await patchStation($, station => endSatellite(station, id, status, at))
}
