import type { Args, On, ResultOf, TurnUsage } from 'claude-code'
import { describe, type Engine, expect, test } from 'claude-code/testing'
import { complete, paneRequest, START, spawn } from '../support/drive'
import { world } from '../support/world'

const FIRST_PIECE_MS = 500
const DECODE_MS = 1000

type StopReason = ResultOf['turn.step']['stopReason']

/** A model request that answers after FIRST_PIECE_MS and stops DECODE_MS later, with 50 output tokens. */
function answerSteps(on: On, clock: { advance(ms: number): Promise<void> }, stopReason: StopReason = 'end_turn'): void {
  on('turn.step', async function* (_, e) {
    const usage: TurnUsage = {
      input_tokens: 1000,
      output_tokens: 50,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
      model: e.model,
    }
    await clock.advance(FIRST_PIECE_MS)
    yield { kind: 'text' as const, index: 0, text: 'ok' }
    await clock.advance(DECODE_MS)
    yield { kind: 'stop' as const, stopReason, usage }
    return { turnId: e.turnId, index: e.index, answer: 'ok', toolUses: [], stopReason, usage }
  })
}

async function step($: Engine, options: Pick<Args<'turn.step'>, 'agentId' | 'effort'> = {}): Promise<void> {
  const stream = $.turn.step({ turnId: 'j1', index: 0, model: 'claude-opus-5-5', messageCount: 1, ...options })
  for await (const _ of stream);
  await stream.result
}

describe('jumps', () => {
  test('a jump logs the captain, then its cost on that line and the Last jump on the mission', async ($, on) => {
    world(on, { usage: { percent: 20, tokens: 40_000, window: 200_000, usd: 0.5 } })
    on('turn.start', (_, e) => ({ turnId: e.turnId }))
    on('turn.complete', () => ({ text: '' }))
    await $.session.start(START)
    await $.turn.start({ turnId: 'j1', text: 'fix the parser' })
    const running = await $.ui.mount(paneRequest())
    expect(await running.find({ type: 'Text', text: '● engaged' })).toBeDefined()
    expect(await running.find({ type: 'Text', text: 'fix the parser' })).toBeDefined()
    await running.unmount()
    await $.turn.complete(complete('done', { durationMs: 5_000 }))
    const done = await $.ui.mount(paneRequest())
    expect(await done.find({ type: 'Text', text: '○ standby' })).toBeDefined()
    expect(await done.find({ type: 'Text', text: '5s' })).toBeDefined()
    expect(await done.find({ type: 'Text', text: '0 shuttles · 0 edits · 0 errors' })).toBeDefined()
    expect(await done.find({ type: 'Text', text: '  ↑0 ↓0 $0.00' })).toBeDefined()
    await done.unmount()
  })

  test('a jump opened by a slash command is written by comms, as the name of the command', async ($, on) => {
    world(on)
    on('turn.start', (_, e) => ({ turnId: e.turnId }))
    await $.session.start(START)
    await $.turn.start({ turnId: 'j1', text: '<command-name>/compact</command-name>' })
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: 'Comms' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '/compact' })).toBeDefined()
    await ui.unmount()
  })
})

describe('steps', () => {
  test("the bridge's step is timed for Warp: time to the first piece, and tokens per second after it", async ($, on) => {
    answerSteps(on, world(on))
    await $.session.start(START)
    await step($)
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: '0.5s · 50 tok/s' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '1 calls' })).toBeDefined()
    await ui.unmount()
  })

  test('a step no shuttle claims is a probe', async ($, on) => {
    answerSteps(on, world(on))
    await $.session.start(START)
    await step($, { agentId: 'w1' })
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: '◌ Probes' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '1 in orbit · 1 active' })).toBeDefined()
    await ui.unmount()
  })

  test("a shuttle's step fills its Fuel and effort; max_tokens marks its card and the black box", async ($, on) => {
    answerSteps(on, world(on), 'max_tokens')
    on('agent.spawn', () => ({ model: 'claude-sonnet-4-5', agentId: 's1' }))
    await $.session.start(START)
    await $.agent.spawn(spawn('Explore', 'scan'))
    await step($, { agentId: 's1', effort: 'high' })
    const ui = await $.ui.mount(paneRequest())
    expect(await ui.find({ type: 'Text', text: '↑1k  ↓50' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '1 calls' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '  high' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '◐ max_tokens' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'hit max_tokens' })).toBeDefined()
    await ui.unmount()
  })
})
