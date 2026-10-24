import type { RenderNode } from 'claude-code'
import { fmtTimer, printable } from '../core'
import { EFFORTS, effortLevel, effortPct } from '../domain'
import type { DrawContext, UiContext } from './context'
import { hazardOf } from './hazard'
import { Sep } from './layout'
import { FOLD_MARK, GAUGE_WIDTH } from './metrics'

const FOLD_MIN_WIDTH = 10
const FOLD_LINES = 2
/** The fold chevron and the space before it. */
const CHEVRON_WIDTH = 2

/** A gauge of `width` cells: ▰ filled, ▱ empty. */
export function gaugeCells(pct: number, width: number): { on: string; off: string } {
  const full = Math.max(0, Math.min(width, Math.round((pct / 100) * width)))
  return { on: '▰'.repeat(full), off: '▱'.repeat(width - full) }
}

/** `width` cells shared by counts, largest remainders first; any count above 0 keeps at least one cell. */
export function shareCells(counts: readonly number[], width: number): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0)
  if (total === 0) return counts.map(() => 0)
  const exact = counts.map(count => (count / total) * width)
  const cells = counts.map((count, i) => (count > 0 ? Math.max(1, Math.floor(exact[i] ?? 0)) : 0))
  const spare = width - cells.reduce((sum, count) => sum + count, 0)
  const byRemainder = counts
    .map((count, i) => ({ i, rest: count > 0 ? (exact[i] ?? 0) % 1 : -1 }))
    .filter(part => part.rest >= 0)
    .sort((left, right) => right.rest - left.rest)
  for (const part of byRemainder.slice(0, Math.max(0, spare))) cells[part.i] = (cells[part.i] ?? 0) + 1
  return cells
}

/** A gauge whose fill takes the hazard colour of its percent. */
export function Bar(props: { ui: DrawContext; pct: number }): RenderNode {
  const { Text } = props.ui.els
  const cells = gaugeCells(props.pct, GAUGE_WIDTH)
  return (
    <Text>
      <Text color={hazardOf(props.pct, props.ui.space).color}>{cells.on}</Text>
      <Text color={props.ui.colors.faint}>{cells.off}</Text>
    </Text>
  )
}

/** One square per effort level and the effort's name, padded to a gauge's width so later values line up. */
export function Effort(props: { ui: UiContext; effort: string }): RenderNode {
  const { Text } = props.ui.els
  const level = effortLevel(props.effort)
  const color = hazardOf(effortPct(props.effort), props.ui.space).color
  return (
    <Text>
      <Text color={color}>{'▰'.repeat(level)}</Text>
      <Text color={props.ui.colors.faint}>{'▱'.repeat(EFFORTS.length - level)}</Text>
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

/** Long text shows two lines cut with an ellipsis; a mark on the last line opens the rest and closes it again. */
export function Fold(props: { ui: UiContext; foldKey: string; text: string; width: number; color?: string; isDim?: boolean }): RenderNode {
  const { ui, foldKey } = props
  const { Box, Text, Button } = ui.els
  // Stored text may predate cleaning, and one control character makes a surface refuse the whole pane.
  const text = printable(props.text)
  const max = Math.max(FOLD_MIN_WIDTH, props.width - CHEVRON_WIDTH) * FOLD_LINES
  const isLong = text.length > max
  const isOpen = ui.view.unfolded.includes(foldKey)
  return (
    <Box alignItems="flex-end">
      <Box flexShrink={1}>
        <Text color={props.color} dimColor={props.isDim} wrap="wrap">
          {isLong && !isOpen ? `${text.slice(0, max - 1).trimEnd()}…` : text}
        </Text>
      </Box>
      {isLong ? (
        <Box flexShrink={0} marginLeft={1}>
          <Button
            key={`fold-${foldKey}`}
            plain
            dimColor
            label={isOpen ? FOLD_MARK.open : FOLD_MARK.closed}
            onPress={() => ui.actions.toggleFold(foldKey)}
          />
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
  if (!props.ui.hasClient || !('Client' in els))
    return <els.Text color={props.ui.colors.faint}>{'─'.repeat(Math.max(1, props.width))}</els.Text>
  const loader = { isActive: props.isActive ?? true, width: props.width, color: props.color, dim: props.ui.colors.faint }
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
