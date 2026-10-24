import type { PlanStep, SessionTotals, Shields, Shuttle, Station, Usage } from '../../types'
import { fmtDuration, fmtUsd, kTokens, plural } from '../core'
import { titleOf } from './fleet'
import { shieldsSummary } from './shields'

const PLAN_MARKS: Readonly<Record<PlanStep['status'], string>> = { done: '[x]', running: '[~]', pending: '[ ]', skipped: '[-]' }

export type DebriefData = {
  totals: SessionTotals
  usage: Usage
  activeMs: number
  plan: readonly PlanStep[]
  fleet: readonly Shuttle[]
  shields: Shields
  station: Station
  errors: number
}

function fuelLines(data: DebriefData): string[] {
  const { totals, usage } = data
  return [
    `- Flight time: ${fmtDuration(data.activeMs)} active`,
    `- Fuel: ↑${kTokens(totals.tokIn)} ↓${kTokens(totals.tokOut)} over ${plural(totals.req, 'call')}${usage.costUsd !== null ? `, ${fmtUsd(usage.costUsd)}` : ''}`,
    `- Hull: ${usage.pct !== null ? `${Math.round(usage.pct)}% full` : 'not measured'}${usage.compactions > 0 ? `, ${plural(usage.compactions, 'compaction')}` : ''}`,
  ]
}

function shuttleLines(fleet: readonly Shuttle[]): string[] {
  return fleet.map(shuttle => {
    const flight = shuttle.endedAt !== null ? fmtDuration(shuttle.endedAt - shuttle.spawnedAt) : 'in flight'
    return `- ${titleOf(shuttle)} (${shuttle.type}): ${shuttle.status === 'done' ? 'docked' : shuttle.status}, ${flight}, ↓${kTokens(shuttle.out)}`
  })
}

function cargoLines(station: Station): string[] {
  const changes = station.changes ?? []
  const added = changes.reduce((sum, file) => sum + file.added, 0)
  const removed = changes.reduce((sum, file) => sum + file.removed, 0)
  return [
    `- Edited: ${plural(station.edited.length, 'file')} this session`,
    station.changes === null
      ? '- Changes: not a repository'
      : `- Changes: ${plural(changes.length, 'file')}, +${added} −${removed}, not committed`,
  ]
}

function section(title: string, lines: readonly string[]): string[] {
  return lines.length > 0 ? ['', `## ${title}`, ...lines] : []
}

/** The session as markdown: fuel, the plan, the shuttles, the shields and the cargo. */
export function debriefText(data: DebriefData): string {
  const summary = shieldsSummary(data.shields)
  const shieldsLines = [
    `- ${plural(summary.total, 'check')}: ${summary.rule + summary.cleared} cleared, ${summary.deny + summary.refused} stopped, ${summary.blocked} blocked`,
    `- Force field: ${data.shields.held.ran} cleared, ${data.shields.held.refused} stopped after a hold`,
    `- ${plural(data.errors, 'error')} in the black box`,
  ]
  return [
    '# Mission debrief',
    ...section('Fuel', fuelLines(data)),
    ...section(
      'Flight plan',
      data.plan.map(step => `- ${PLAN_MARKS[step.status]} ${step.text}`),
    ),
    ...section('Shuttles', shuttleLines(data.fleet)),
    ...section('Shields', shieldsLines),
    ...section('Cargo', cargoLines(data.station)),
  ].join('\n')
}
