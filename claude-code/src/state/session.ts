import type { EngineInterface } from 'claude-code'
import {
  bridgeAfterReset,
  DEFAULT_COUNCIL,
  DEFAULT_JUMP,
  DEFAULT_SHIELDS,
  freshTotals,
  normalizeTotals,
  totalsKey,
  usageAfterReset,
  viewAfterReset,
} from '../domain'
import {
  getTotals,
  patchBlackbox,
  patchBridge,
  patchCouncil,
  patchJump,
  patchLastJump,
  patchProbes,
  patchShields,
  patchShuttles,
  patchTotals,
  patchUsage,
  patchView,
} from './atoms'

/** Clears the session's readings; fuel, power, compactions and this session's hazards choice stay. */
export async function resetAll($: EngineInterface): Promise<void> {
  await patchBridge($, bridgeAfterReset)
  await patchCouncil($, () => DEFAULT_COUNCIL)
  await patchShields($, () => DEFAULT_SHIELDS)
  await patchShuttles($, () => [])
  await patchProbes($, () => [])
  await patchBlackbox($, () => [])
  await patchJump($, () => DEFAULT_JUMP)
  await patchLastJump($, () => null)
  await patchView($, viewAfterReset)
  await patchUsage($, usageAfterReset)
}

/** This session's totals from the store: they outlive a restart, a resume and the day. */
export async function loadTotals($: EngineInterface): Promise<void> {
  const [id, now] = await Promise.all([$.session.id(), $.clock.now()])
  const saved = normalizeTotals(await $.store.get(totalsKey(id)))
  const totals = saved.id === id ? saved : freshTotals(id, now)
  await patchTotals($, () => totals)
  if (saved.id !== id) await $.store.set(totalsKey(id), totals)
}

export async function saveTotals($: EngineInterface): Promise<void> {
  const totals = await getTotals($)
  if (totals.id) await $.store.set(totalsKey(totals.id), totals)
}

/** /clear, /resume and /branch reset state without a new session.start: reload the totals when the session moved. */
export async function followSession($: EngineInterface): Promise<void> {
  const [id, totals] = await Promise.all([$.session.id().catch(() => null), getTotals($)])
  if (id !== null && totals.id !== id) await loadTotals($).catch(() => undefined)
}
