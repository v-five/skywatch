import type { TurnCompleteReason } from 'claude-code'
import { describe, expect, test } from 'claude-code/testing'
import {
  addShuttle,
  applyStep,
  dropProbe,
  endProbe,
  flightPaths,
  isProbeActive,
  landShuttle,
  newShuttle,
  noteTool,
  shownShuttles,
  shuttleName,
  statusOf,
  stepProbe,
  withShuttle,
} from '../../src/domain'
import type { Shuttle } from '../../types'

const shuttle = (id: string, spawnedAt = 1000) => newShuttle({ id, type: 'Explore', model: '', description: 'scan the repo', spawnedAt })

describe('a shuttle', () => {
  test('steps, notes tools and lands', () => {
    const step = { model: 'm', usage: { input_tokens: 10, cache_read_input_tokens: 5, output_tokens: 7 }, stopReason: 'end_turn' }
    const stepped = applyStep(shuttle('s1'), step)
    expect(stepped).toMatchObject({ model: 'm', steps: 1, ctx: 15, out: 7, lastStop: 'end_turn' })
    const noted = [1, 2, 3, 4].reduce((s, n) => noteTool(s, { tool: 'Read', text: `t${n}`, isError: false }), stepped)
    expect(noted.tools.map(t => t.text)).toEqual(['t2', 't3', 't4'])
    const landed = landShuttle(noted, { status: statusOf('answer'), at: 5000, answer: 'done it' })
    expect(landed).toMatchObject({ status: 'done', endedAt: 5000, answer: 'done it', doing: null })
    expect([statusOf('aborted'), statusOf('error')]).toEqual(['stopped', 'failed'])
  })

  test('a completion reason a newer engine adds reads as failed', () => {
    const reason: string = 'max_turns'
    expect(statusOf(reason as TurnCompleteReason)).toBe('failed')
  })

  test('its name capitalizes type and description', () => {
    expect(shuttleName(shuttle('s'))).toBe('Explore · Scan the repo')
  })
})

describe('the fleet', () => {
  test('keeps 24 and changes one shuttle by id', () => {
    const fleet = Array.from({ length: 24 }, (_, i) => shuttle(`s${i}`)).reduce<Shuttle[]>(addShuttle, [])
    const grown = addShuttle(fleet, shuttle('new'))
    expect(grown).toHaveLength(24)
    expect(grown.at(-1)?.id).toBe('new')
    expect(withShuttle(fleet, 's3', s => ({ ...s, steps: 9 })).find(s => s.id === 's3')?.steps).toBe(9)
  })

  test('shows those in flight first, then the docked ones newest first', () => {
    const fleet = [
      landShuttle(shuttle('a'), { status: 'done', at: 1, answer: '' }),
      shuttle('b'),
      landShuttle(shuttle('c'), { status: 'failed', at: 2, answer: '' }),
    ]
    expect(shownShuttles(fleet, 6).map(s => s.id)).toEqual(['b', 'c', 'a'])
  })

  test('flight paths share one axis', () => {
    const fleet = [shuttle('a', 1000), { ...shuttle('b', 6000), endedAt: 8000 }]
    expect(flightPaths(fleet, 11_000, 10)).toEqual([
      { id: 'a', before: 0, bar: 10, after: 0 },
      { id: 'b', before: 5, bar: 2, after: 3 },
    ])
  })
})

describe('probes', () => {
  test('step, end, drop and go quiet', () => {
    const probes = stepProbe(stepProbe([], 'p', 1000), 'p', 2000)
    expect(probes).toEqual([{ id: 'p', steps: 2, firstAt: 1000, lastAt: 2000, isDone: false }])
    const [probe] = probes
    expect(probe && isProbeActive(probe, 10_000)).toBe(true)
    expect(probe && isProbeActive(probe, 20_000)).toBe(false)
    expect(endProbe(probes, 'p', 3000)[0]?.isDone).toBe(true)
    expect(dropProbe(probes, 'p')).toEqual([])
  })
})
