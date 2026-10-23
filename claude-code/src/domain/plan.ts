import type { PlanStatus, PlanStep } from '../../types'
import { capitalize, isRecord } from '../core'

const STATUS_BY_WORD: ReadonlyMap<string, PlanStatus> = new Map([
  ['pending', 'pending'],
  ['in_progress', 'running'],
  ['completed', 'done'],
])
/** A phase's name and a step's part of it: "Fix findings: force field". */
const PHASE = /^(.+?):\s+(.+)$/

function itemText(item: Record<string, unknown>): string {
  if (typeof item.content === 'string' && item.content) return item.content
  return typeof item.subject === 'string' ? item.subject : ''
}

/** A rewritten list: its own statuses, and a step it dropped before finishing kept as skipped. */
function fromItems(before: readonly PlanStep[], items: readonly unknown[]): PlanStep[] {
  const steps = items.filter(isRecord).map(item => ({
    text: capitalize(itemText(item)),
    status: STATUS_BY_WORD.get(String(item.status)) ?? 'pending',
  }))
  const texts = new Set(steps.map(step => step.text))
  const dropped = before.filter(step => step.status !== 'done' && step.status !== 'skipped' && !texts.has(step.text))
  return [...steps, ...dropped.map(step => ({ ...step, status: 'skipped' as const }))]
}

function withStatus(steps: readonly PlanStep[], at: number, status: PlanStatus): PlanStep[] {
  return steps.map((step, i) => (i === at ? { ...step, status } : step))
}

/** `advance`: the step running is done and the next pending one runs. */
function advanced(steps: readonly PlanStep[]): PlanStep[] {
  const running = steps.findIndex(step => step.status === 'running')
  const done = running === -1 ? [...steps] : withStatus(steps, running, 'done')
  const next = done.findIndex((step, i) => i > running && step.status === 'pending')
  return next === -1 ? done : withStatus(done, next, 'running')
}

/** `done` and `start` name steps from 1. */
function marked(steps: readonly PlanStep[], input: Record<string, unknown>): PlanStep[] {
  const done = Array.isArray(input.done) ? input.done.filter((n): n is number => typeof n === 'number') : []
  const afterDone = done.reduce<PlanStep[]>((list, n) => withStatus(list, n - 1, 'done'), [...steps])
  return typeof input.start === 'number' ? withStatus(afterDone, input.start - 1, 'running') : afterDone
}

/** The plan after a call; undefined for a call that writes no task list. */
export function planAfter(steps: readonly PlanStep[], tool: string, input: unknown): PlanStep[] | undefined {
  const call = isRecord(input) ? input : {}
  if (tool === 'TodoWrite' && Array.isArray(call.todos)) return fromItems(steps, call.todos)
  if (!tool.endsWith('update_plan')) return undefined
  if (Array.isArray(call.items)) return fromItems(steps, call.items)
  if (call.advance === true) return advanced(steps)
  return Array.isArray(call.done) || typeof call.start === 'number' ? marked(steps, call) : undefined
}

/** A run of steps under one phase name, or a step of its own (`phase` null). */
export type PlanGroup = { phase: string | null; steps: { text: string; status: PlanStatus }[] }

function phaseOf(step: PlanStep): { phase: string; part: string } | null {
  const match = PHASE.exec(step.text)
  return match?.[1] && match[2] ? { phase: match[1], part: match[2] } : null
}

/** Consecutive steps that share a name before `:` form a phase; a phase of one step stays a step. */
export function planGroups(steps: readonly PlanStep[]): PlanGroup[] {
  const runs: { phase: string | null; steps: PlanStep[] }[] = []
  for (const step of steps) {
    const phase = phaseOf(step)?.phase ?? null
    const last = runs.at(-1)
    if (phase !== null && last?.phase === phase) last.steps.push(step)
    else runs.push({ phase, steps: [step] })
  }
  return runs.map(run =>
    run.phase !== null && run.steps.length > 1
      ? { phase: run.phase, steps: run.steps.map(step => ({ text: phaseOf(step)?.part ?? step.text, status: step.status })) }
      : { phase: null, steps: run.steps },
  )
}

/** A phase's status: done when all are, running while any is, skipped when all left are, else pending. */
export function groupStatus(group: PlanGroup): PlanStatus {
  const statuses = group.steps.map(step => step.status)
  if (statuses.every(status => status === 'done')) return 'done'
  if (statuses.includes('running')) return 'running'
  return statuses.every(status => status === 'done' || status === 'skipped') ? 'skipped' : 'pending'
}
