import { describe, expect, test } from 'claude-code/testing'
import { groupStatus, planAfter, planGroups } from '../../src/domain'
import type { PlanStep } from '../../types'

const item = (content: string, status: string) => ({ content, status })

describe('the plan', () => {
  test('a task list keeps each step status, and a step dropped before it was done as skipped', () => {
    const first = planAfter([], 'TodoWrite', { todos: [item('read', 'completed'), item('fix', 'in_progress'), item('ship', 'pending')] })
    expect(first).toEqual([
      { text: 'Read', status: 'done' },
      { text: 'Fix', status: 'running' },
      { text: 'Ship', status: 'pending' },
    ])
    const second = planAfter(first ?? [], 'TodoWrite', { todos: [item('read', 'completed'), item('fix', 'completed')] })
    expect(second?.map(step => step.status)).toEqual(['done', 'done', 'skipped'])
    expect(planAfter([], 'Read', { file_path: 'x' })).toBeUndefined()
  })

  test('update_plan rewrites, advances, and marks steps by number', () => {
    const items = [item('one', 'in_progress'), item('two', 'pending'), item('three', 'pending')]
    const written = planAfter([], 'mcp__ccd_turn__update_plan', { items }) ?? []
    const advanced = planAfter(written, 'mcp__ccd_turn__update_plan', { advance: true }) ?? []
    expect(advanced.map(step => step.status)).toEqual(['done', 'running', 'pending'])
    const marked = planAfter(advanced, 'mcp__ccd_turn__update_plan', { done: [2], start: 3 }) ?? []
    expect(marked.map(step => step.status)).toEqual(['done', 'done', 'running'])
  })

  test('steps sharing a name before a colon form a phase; one alone stays a step', () => {
    const steps: PlanStep[] = [
      { text: 'Refactor', status: 'done' },
      { text: 'Fix findings: force field', status: 'done' },
      { text: 'Fix findings: domain', status: 'running' },
      { text: 'Ship: commit', status: 'pending' },
    ]
    const groups = planGroups(steps)
    expect(groups.map(group => [group.phase, group.steps.map(step => step.text)])).toEqual([
      [null, ['Refactor']],
      ['Fix findings', ['force field', 'domain']],
      [null, ['Ship: commit']],
    ])
    expect(groups.map(groupStatus)).toEqual(['done', 'running', 'pending'])
  })
})
