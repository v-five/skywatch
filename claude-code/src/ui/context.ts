import type { ElementTable, RenderNode, RenderSurface } from 'claude-code'
import type { BlackboxEntry, Bridge, Council, Jump, LastJump, Probe, SessionTotals, Shields, Shuttle, Usage, View } from '../../types'
import type { Config, Places } from '../core'
import type { PaneActions } from '../domain'
import type { ActiveHold } from '../forcefield'
import { hazardOf } from './hazard'
import { PANE_MIN_WIDTH } from './metrics'
import type { Colors, Palette, Space, SvgColors } from './palette'

/** What a drawing outside the pane needs: the surface's elements, its palette, and whether it runs client modules. */
export type DrawContext = {
  readonly els: ElementTable
  readonly hasClient: boolean
  readonly colors: Colors
  readonly space: Space
  readonly svg: SvgColors
}

/** What every pane component draws with: the elements, the clock, the pane's width and its actions. */
export type UiContext = DrawContext & {
  readonly surface: RenderSurface
  readonly now: number
  readonly width: number
  /** The context's hazard colour, for loaders; the bridge's colour before a reading. */
  readonly hazardColor: string
  readonly view: View
  readonly actions: PaneActions
  /** Where paths in free text, such as a debrief, read relative from. */
  readonly places: Places
}

/** The session's readings, as the pane draws them. */
export type PaneData = {
  readonly config: Config
  readonly bridge: Bridge
  readonly usage: Usage
  readonly council: Council
  readonly shields: Shields
  readonly fleet: readonly Shuttle[]
  readonly probes: readonly Probe[]
  readonly blackbox: readonly BlackboxEntry[]
  readonly jump: Jump
  readonly lastJump: LastJump | null
  readonly totals: SessionTotals
  readonly held: ActiveHold | null
  readonly hasBlockDirective: boolean
  readonly viewedAgentId: string | null
}

export type ModuleProps = { readonly ui: UiContext; readonly data: PaneData }

export type ModuleView = { isEmpty(data: PaneData): boolean; draw(props: ModuleProps): RenderNode }

/** `canAnimate` is false once a client module has failed in this load: the surface then draws without any. */
export function drawContext(els: ElementTable, palette: Palette, canAnimate = true): DrawContext {
  return { els, hasClient: canAnimate && 'Client' in els, colors: palette.colors, space: palette.space, svg: palette.svg }
}

/** The pane's drawing context from what the surface asked for and the session's readings. */
export function uiContext(pane: {
  els: ElementTable
  surface: RenderSurface
  bodyColumns: number
  now: number
  usage: Usage
  view: View
  actions: PaneActions
  canAnimate: boolean
  places: Places
  palette: Palette
}): UiContext {
  const draw = drawContext(pane.els, pane.palette, pane.canAnimate)
  return {
    ...draw,
    surface: pane.surface,
    now: pane.now,
    width: Math.max(PANE_MIN_WIDTH, pane.bodyColumns),
    hazardColor: pane.usage.pct !== null ? hazardOf(pane.usage.pct, draw.space).color : draw.colors.bridge,
    view: pane.view,
    actions: pane.actions,
    places: pane.places,
  }
}
