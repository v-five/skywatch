import type { EngineInterface, On } from 'claude-code'
import { modeOf } from '../domain'
import {
  getBlackbox,
  getBridge,
  getCouncil,
  getJump,
  getLastJump,
  getProbes,
  getShields,
  getShuttles,
  getTotals,
  getUsage,
  getView,
  paneActions,
} from '../state'
import { drawContext, Pane, type PaneData, type UiContext, uiContext, Viewscreen } from '../ui'
import { hasBlockDirective, heldNow, type Runtime } from './runtime'
import { hazardsNow, readBeacon } from './status'

type PaneRequest = { surface: UiContext['surface']; bodyColumns: number; viewedAgentId: string | null; els: UiContext['els'] }

async function paneContext($: EngineInterface, runtime: Runtime, pane: PaneRequest): Promise<{ ui: UiContext; data: PaneData }> {
  const [bridge, usage, council, shields, fleet, probes, blackbox, jump, lastJump, view, totals, now] = await Promise.all([
    getBridge($),
    getUsage($),
    getCouncil($),
    getShields($),
    getShuttles($),
    getProbes($),
    getBlackbox($),
    getJump($),
    getLastJump($),
    getView($),
    getTotals($),
    $.clock.now(),
  ])
  const ui = uiContext({ els: pane.els, surface: pane.surface, bodyColumns: pane.bodyColumns, now, usage, view, actions: paneActions($) })
  const data: PaneData = {
    config: runtime.config,
    bridge,
    usage,
    council,
    shields,
    fleet,
    probes,
    blackbox,
    jump,
    lastJump,
    totals,
    held: heldNow(runtime),
    hasBlockDirective: hasBlockDirective(runtime),
    viewedAgentId: pane.viewedAgentId,
  }
  return { ui, data }
}

export function registerRender(on: On, runtime: Runtime): void {
  // Reads the footer's mode labels and leaves the footer as drawn; the next jump records the mode.
  on('ui.render', { component: 'SessionMode' }, (_, e, next) => {
    runtime.modeSeen = modeOf(e.props.modes)
    return next(e)
  })

  // The terminal joins the tail to the hint line with its own ` · `, so the tail adds no gap of its own.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || (await hazardsNow($, runtime)) !== 'beacon') return next(e)
    return next({ ...e, props: { ...e.props, tail: await readBeacon($) } })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if ((await hazardsNow($, runtime)) !== 'viewscreen' || e.props.hasSurvey) return next(e)
    const [usage, bridge, lastJump] = await Promise.all([getUsage($), getBridge($), getLastJump($)])
    return (
      <Viewscreen
        draw={drawContext($.ui.resolve(e))}
        surface={e.surface}
        bodyColumns={e.props.bodyColumns}
        usage={usage}
        bridge={bridge}
        lastJump={lastJump}
      />
    )
  })

  // The engine reads matchers as literals: this is status.ts's PANE_ID.
  on('ui.render', { component: 'Pane', requestId: 'skywatch' }, async ($, e) => {
    const pane = {
      surface: e.surface,
      bodyColumns: e.props.bodyColumns,
      viewedAgentId: e.props.view?.agentId ?? null,
      els: $.ui.resolve(e),
    }
    const { ui, data } = await paneContext($, runtime, pane)
    return <Pane ui={ui} data={data} />
  })
}
