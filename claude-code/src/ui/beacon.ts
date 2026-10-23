import type { Council, Shields, Shuttle, Usage } from '../../types'
import { hasCouncil, isTransmitting, shieldsSummary } from '../domain'
import { hazardOf, ringOf } from './hazard'

/** An answer is waiting at the permission prompt: the one part of the beacon that asks for the person. */
export const AIRLOCK_MARK = '⚠'

/** The beacon's words: the hazard and the context ring, then shuttles, transmissions and stops. */
export function beaconText(data: { usage: Usage; council: Council; shields: Shields; fleet: readonly Shuttle[] }): string {
  const { usage, council, fleet } = data
  const pct = Math.round(usage.pct ?? 0)
  const hazard = hazardOf(pct)
  const running = fleet.filter(shuttle => shuttle.status === 'running').length
  const summary = shieldsSummary(data.shields)
  const stopped = summary.deny + summary.refused
  return [
    `${hazard.icon} ${hazard.word} · ${ringOf(pct)} ${pct}%`,
    summary.ask > 0 ? `${AIRLOCK_MARK} airlock ${summary.ask} waiting` : null,
    fleet.length > 0 ? `shuttles ${running}/${fleet.length}` : null,
    hasCouncil(council) ? `council ${isTransmitting(council) ? 'transmitting' : council.transmissions.length}` : null,
    stopped > 0 ? `stopped ${stopped}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}
