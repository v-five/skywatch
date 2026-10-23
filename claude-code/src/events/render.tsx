import type { EngineInterface, On } from 'claude-code'
import { modeOf, WRITERS } from '../domain'
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
  logEntry,
  paneActions,
} from '../state'
import { drawContext, errorText, Pane, type PaneData, PaneFault, type UiContext, uiContext, Viewscreen } from '../ui'
import { hasBlockDirective, heldNow, paletteFor, type Runtime } from './runtime'
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
  const ui = uiContext({
    els: pane.els,
    surface: pane.surface,
    bodyColumns: pane.bodyColumns,
    now,
    usage,
    view,
    actions: paneActions($),
    canAnimate: !runtime.hasClientFault,
    places: runtime.places,
    palette: paletteFor(runtime, pane.surface),
  })
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
    const [usage, bridge, lastJump, shields] = await Promise.all([getUsage($), getBridge($), getLastJump($), getShields($)])
    return (
      <Viewscreen
        draw={drawContext($.ui.resolve(e), paletteFor(runtime, e.surface), !runtime.hasClientFault)}
        surface={e.surface}
        bodyColumns={e.props.bodyColumns}
        usage={usage}
        bridge={bridge}
        lastJump={lastJump}
        shields={shields}
      />
    )
  })

  // A failed client stops drawing for good, and takes its drawing with it: the next ones leave every client out.
  on('ui.fault', async ($, e, next) => {
    if (!runtime.hasClientFault) await logEntry($, WRITERS.comms, `${e.module} stopped (${e.phase}): ${e.reason}`, 'error').catch(() => 0)
    runtime.hasClientFault = true
    const heard = await next(e)
    $.ui.invalidate('ui.render')
    return heard
  })

  // The engine reads matchers as literals: this is status.ts's PANE_ID.
  on('ui.render', { component: 'Pane', requestId: 'skywatch' }, async ($, e) => {
    const els = $.ui.resolve(e)
    const pane = { surface: e.surface, bodyColumns: e.props.bodyColumns, viewedAgentId: e.props.view?.agentId ?? null, els }
    // A throw would leave the pane empty for as long as the state that caused it stays.
    try {
      const { ui, data } = await paneContext($, runtime, pane)
      return <Pane ui={ui} data={data} />
    } catch (error) {
      return <PaneFault els={els} reason={errorText(error)} />
    }
  })
}
