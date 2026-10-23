import { capitalize, isRecord } from '../core'

export type TaskStep = { task: string | null; plan: string[] }

function stepText(item: Record<string, unknown>): string {
  if (typeof item.activeForm === 'string' && item.activeForm) return item.activeForm
  if (typeof item.content === 'string') return item.content
  return typeof item.subject === 'string' ? item.subject : ''
}

function fromList(list: unknown[]): TaskStep {
  const items = list.filter(isRecord)
  const current = items.find(item => item.status === 'in_progress')
  return { task: current ? capitalize(stepText(current)) || null : null, plan: items.map(item => capitalize(stepText(item))) }
}

function fromPlanUpdate(input: Record<string, unknown>, plan: string[], current: string | null): TaskStep | undefined {
  if (Array.isArray(input.items)) return fromList(input.items)
  if (typeof input.start === 'number') return { task: plan[input.start - 1] ?? null, plan }
  if (input.advance !== true) return undefined
  const at = current === null ? -1 : plan.indexOf(current)
  return { task: plan[at + 1] ?? null, plan }
}

/** The task-list step a call starts; undefined for a call that writes no task list, a null task for no step in progress. */
export function taskOf(tool: string, input: unknown, plan: string[], current: string | null): TaskStep | undefined {
  const call = isRecord(input) ? input : {}
  if (tool === 'TodoWrite' && Array.isArray(call.todos)) return fromList(call.todos)
  if (tool === 'TaskUpdate' || tool === 'TaskCreate') {
    if (call.status === 'in_progress' && stepText(call)) return { task: capitalize(stepText(call)), plan }
    return call.status === 'completed' ? { task: null, plan } : undefined
  }
  return tool.endsWith('update_plan') ? fromPlanUpdate(call, plan, current) : undefined
}
