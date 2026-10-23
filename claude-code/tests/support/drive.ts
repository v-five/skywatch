import type { Args, On, RenderSurface } from 'claude-code'
import type { Engine, MountTarget } from 'claude-code/testing'
import { CWD, runTools } from './world'

// The one place a partial kit input stands in for a whole one: the mod never reads origins, presentation or providers.

export const START: Args<'session.start'> = { cwd: CWD, surface: 'desktop', isInteractive: true }

export function slashCommand(command: string, args = ''): Args<'command.run'> {
  return { command, args } satisfies Partial<Args<'command.run'>> as Args<'command.run'>
}

export function skywatch(args: string): Args<'command.run'> {
  return slashCommand('skywatch', args)
}

export function spawn(subagentType: string, description: string): Args<'agent.spawn'> {
  const call = { tool_use_id: `t-${description}`, prompt: 'p', description, subagentType }
  return call satisfies Partial<Args<'agent.spawn'>> as Args<'agent.spawn'>
}

/** A completed jump: the bridge's when no agent id is given, else that agent's. */
export function complete(answer: string, options: { agentId?: string; durationMs?: number } = {}): Args<'turn.complete'> {
  const { agentId, durationMs = 1000 } = options
  return { turnId: `j-${agentId ?? 'bridge'}`, ...(agentId ? { agentId } : {}), reason: 'answer', answer, durationMs, isAborted: false }
}

/** The pane as a surface asks the mod to draw it. */
export function paneRequest(surface: RenderSurface = 'terminal', bodyColumns = 66) {
  return {
    plugin: 'skywatch',
    surface,
    component: 'Pane',
    requestId: 'skywatch',
    props: { title: 'SkyWatch', isFocused: false, bodyColumns, placement: 'dock', scroll: { offset: 0, bodyRows: 200 }, view: {} },
  } as const
}

/** The band above the prompt as a surface asks the mod to draw it. */
export function bandRequest<P extends RenderSurface>(surface: P, bodyColumns = 100): MountTarget<P, 'AbovePrompt'> {
  return {
    plugin: 'skywatch',
    surface,
    component: 'AbovePrompt',
    props: { bodyColumns, hasSurvey: false, isWorking: false, maxRows: 4, scroll: { offset: 0, bodyRows: 4 }, view: {} },
  }
}

/** A usage reading as session.measure delivers it. */
export function measured(percent: number, tokens: number): Args<'session.measure'> {
  const reading = { context: { percent, tokens, window: 200_000 }, rateLimits: [], changed: ['context' as const] }
  return reading satisfies Partial<Args<'session.measure'>> as Args<'session.measure'>
}

export function sessionEnd(reason: Args<'session.end'>['reason']): Args<'session.end'> {
  return { reason } satisfies Partial<Args<'session.end'>> as Args<'session.end'>
}

/** An assistant row of the bridge, as the response door appends it. */
export function assistantRow(content: readonly { type: string; [field: string]: unknown }[]): Args<'session.append'> {
  const row = { door: 'response' as const, message: { type: 'assistant' as const, content: [...content] } }
  return row satisfies Partial<Args<'session.append'>> as Args<'session.append'>
}

/** The prompt hint line as the terminal asks the mod to draw it. */
export function hintRequest() {
  return {
    plugin: 'skywatch',
    surface: 'terminal',
    component: 'PromptHint',
    props: { isDraft: false, isWorking: false, hint: '? for shortcuts' },
  } as const
}

/** The prompt footer's mode labels as the terminal asks the mod to draw them. */
export function modeRequest(modes: readonly string[]) {
  return { plugin: 'skywatch', surface: 'terminal', component: 'SessionMode', props: { modes } } as const
}

/** Starts a session and makes a call, reading the pane's texts while the call's permission prompt is up. */
export async function heldTexts($: Engine, on: On, call: Parameters<Engine['tool']['call']>[0]) {
  const texts: string[] = []
  on('classic.PermissionRequest', async (_, e, next) => {
    const ui = await $.ui.mount(paneRequest())
    for (const found of await ui.findAll({ type: 'Text' })) texts.push(found.text)
    await ui.unmount()
    return next(e)
  })
  runTools(on)
  await $.session.start(START)
  const ran = await $.tool.call(call)
  return { ran, texts }
}
