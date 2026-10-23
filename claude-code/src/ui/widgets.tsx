import type { RenderNode } from 'claude-code'
import { fmtTimer } from '../core'
import { EFFORTS, effortLevel, effortPct } from '../domain'
import type { DrawContext, UiContext } from './context'
import { hazardOf } from './hazard'
import { Sep } from './layout'
import { GAUGE_WIDTH } from './metrics'
import { COLORS } from './theme'

const FOLD_MIN_WIDTH = 10
const FOLD_LINES = 2
/** The fold chevron and the space before it. */
const CHEVRON_WIDTH = 2

/** A gauge of `width` cells: ▰ filled, ▱ empty. */
export function gaugeCells(pct: number, width: number): { on: string; off: string } {
  const full = Math.max(0, Math.min(width, Math.round((pct / 100) * width)))
  return { on: '▰'.repeat(full), off: '▱'.repeat(width - full) }
}

/** A gauge whose fill takes the hazard colour of its percent. */
export function Bar(props: { ui: DrawContext; pct: number }): RenderNode {
  const { Text } = props.ui.els
  const cells = gaugeCells(props.pct, GAUGE_WIDTH)
  return (
    <Text>
      <Text color={hazardOf(props.pct).color}>{cells.on}</Text>
      <Text color={COLORS.faint}>{cells.off}</Text>
    </Text>
  )
}

/** One square per effort level and the effort's name, padded to a gauge's width so later values line up. */
export function Effort(props: { ui: UiContext; effort: string }): RenderNode {
  const { Text } = props.ui.els
  const level = effortLevel(props.effort)
  const color = hazardOf(effortPct(props.effort)).color
  return (
    <Text>
      <Text color={color}>{'▰'.repeat(level)}</Text>
      <Text color={COLORS.faint}>{'▱'.repeat(EFFORTS.length - level)}</Text>
      <Text>{' '.repeat(GAUGE_WIDTH - EFFORTS.length)}</Text>
      <Text color={color} bold>{`  ${props.effort}`}</Text>
      <Sep ui={props.ui} />
    </Text>
  )
}

/** A verdict's mark, always in its colour; its words dim while the count is 0. */
export function Tally(props: { ui: UiContext; color: string; label: string; count: number }): RenderNode {
  const { Text } = props.ui.els
  return (
    <Text>
      <Text color={props.color}>▰</Text>
      <Text dimColor={props.count === 0}>{` ${props.label} ${props.count}`}</Text>
    </Text>
  )
}

/** Long text shows two lines cut with an ellipsis; a chevron beside them opens the rest and closes it again. */
export function Fold(props: { ui: UiContext; foldKey: string; text: string; width: number; color?: string; isDim?: boolean }): RenderNode {
  const { ui, foldKey, text } = props
  const { Box, Text, Button } = ui.els
  const max = Math.max(FOLD_MIN_WIDTH, props.width - CHEVRON_WIDTH) * FOLD_LINES
  const isLong = text.length > max
  const isOpen = ui.view.unfolded.includes(foldKey)
  return (
    <Box alignItems="center">
      <Box flexShrink={1}>
        <Text color={props.color} dimColor={props.isDim} wrap="wrap">
          {isLong && !isOpen ? `${text.slice(0, max - 1).trimEnd()}…` : text}
        </Text>
      </Box>
      {isLong ? (
        <Box flexShrink={0} marginLeft={1}>
          <Button key={`fold-${foldKey}`} plain dimColor label={isOpen ? '⌃' : '⌄'} onPress={() => ui.actions.toggleFold(foldKey)} />
        </Box>
      ) : null}
    </Box>
  )
}

/** A clock that ticks on the surface's own frame clock; a start of 0 is unknown and shows a dash. */
export function LiveClock(props: { ui: UiContext; clockKey: string; since: number; endAt: number | null; color: string }): RenderNode {
  const { ui, since, endAt, color } = props
  const { Text } = ui.els
  if (since <= 0) return <Text color={color}>—</Text>
  if (ui.hasClient && 'Client' in ui.els)
    return <ui.els.Client key={props.clockKey} module="./clients/clock.tsx" props={{ since, now: ui.now, endAt, color }} />
  return <Text color={color}>{fmtTimer((endAt ?? ui.now) - since)}</Text>
}

/** A connector line: packets travel along it while active, where the surface runs client modules. */
export function Connector(props: {
  ui: DrawContext
  connectorKey: string
  width: number
  color: string
  isActive?: boolean
  spacing?: number
}): RenderNode {
  const { els } = props.ui
  if (!props.ui.hasClient || !('Client' in els)) return <els.Text color={COLORS.faint}>{'─'.repeat(Math.max(1, props.width))}</els.Text>
  const loader = { isActive: props.isActive ?? true, width: props.width, color: props.color, dim: COLORS.faint }
  return (
    <els.Client
      key={props.connectorKey}
      module="./clients/loader.tsx"
      width={props.width}
      height={1}
      props={props.spacing ? { ...loader, spacing: props.spacing } : loader}
    />
  )
}
