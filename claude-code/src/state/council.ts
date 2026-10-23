import type { EngineInterface } from 'claude-code'
import { shorten } from '../core'
import {
  adviceLine,
  COUNCIL_TYPES,
  closeTransmission,
  momentOf,
  openTransmission,
  WRITERS,
  withAdvice,
  withCouncilId,
  withReviewing,
  withRosterType,
  withSeen,
} from '../domain'
import { getCouncilRoster, getJump, patchCouncil, patchCouncilRoster, patchJump } from './atoms'
import { logEntry } from './log'

const ADVICE_LOG_MAX = 60

/** Opens a transmission at the moment the jump is in; before done, the jump is marked as under review. */
export async function startTransmission($: EngineInterface, id: string, via: string): Promise<void> {
  const moment = momentOf(await getJump($))
  const at = await $.clock.now()
  await patchCouncil($, council => openTransmission(council, { id, at, moment, via }))
  if (moment === 'before done') await patchJump($, jump => withReviewing(jump, true))
  await logEntry($, WRITERS.council, `${moment} · ${via}`, 'transmission')
}

export async function endTransmission($: EngineInterface, report: string | null, id?: string): Promise<void> {
  const at = await $.clock.now()
  const advice = report ? adviceLine(report) : null
  await patchCouncil($, council => closeTransmission(council, at, advice, id))
  await patchJump($, jump => withReviewing(jump, false))
  await logEntry($, WRITERS.council, advice ? `advice: ${shorten(advice, ADVICE_LOG_MAX)}` : 'advice returned', 'transmission')
}

export async function noteAdvice($: EngineInterface, advice: string): Promise<void> {
  await patchCouncil($, council => withAdvice(council, advice))
  await logEntry($, WRITERS.council, `advice: ${shorten(advice, ADVICE_LOG_MAX)}`, 'transmission')
}

export async function isCouncilType($: EngineInterface, type: string): Promise<boolean> {
  return COUNCIL_TYPES.test(type) || (await getCouncilRoster($)).councilTypes.includes(type)
}

export async function addCouncilType($: EngineInterface, type: string): Promise<void> {
  await patchCouncilRoster($, roster => withRosterType(roster, type))
}

export async function addCouncilId($: EngineInterface, id: string): Promise<void> {
  await patchCouncil($, council => withCouncilId(council, id))
}

export async function markSeen($: EngineInterface, id: string): Promise<void> {
  await patchCouncil($, council => withSeen(council, id))
}
