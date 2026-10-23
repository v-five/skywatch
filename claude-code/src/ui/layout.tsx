import type { RenderChildren, RenderNode } from 'claude-code'
import type { UiContext } from './context'
import { FRAME_INSET, LABEL_WIDTH, SEPARATOR } from './metrics'
import { COLORS } from './theme'

/** A label column, then values that truncate on one line. */
export function Row(props: { ui: UiContext; label: string; children?: RenderChildren }): RenderNode {
  const { Box, Text } = props.ui.els
  return (
    <Box alignItems="flex-start">
      <Box width={LABEL_WIDTH} flexShrink={0}>
        <Text dimColor>{props.label}</Text>
      </Box>
      <Text wrap="truncate">{props.children}</Text>
    </Box>
  )
}

/** A label column, then a block that may wrap or fold, the label at its top. */
export function RowBlock(props: { ui: UiContext; label: string; children?: RenderChildren }): RenderNode {
  const { Box, Text } = props.ui.els
  return (
    <Box alignItems="flex-start">
      <Box width={LABEL_WIDTH} flexShrink={0}>
        <Text dimColor>{props.label}</Text>
      </Box>
      <Box flexGrow={1} flexShrink={1}>
        {props.children}
      </Box>
    </Box>
  )
}

export function Sep(props: { ui: UiContext }): RenderNode {
  const { Text } = props.ui.els
  return <Text color={COLORS.faint}>{SEPARATOR}</Text>
}

/** A rule across the frame; truncated, as the desktop app draws '─' wider than a cell. */
export function Ruler(props: { ui: UiContext; isDashed?: boolean }): RenderNode {
  const { Text } = props.ui.els
  return (
    <Text color={COLORS.faint} wrap="truncate">
      {(props.isDashed ? '╌' : '─').repeat(Math.max(1, props.ui.width - FRAME_INSET))}
    </Text>
  )
}

export function Blank(props: { ui: UiContext }): RenderNode {
  const { Text } = props.ui.els
  return <Text> </Text>
}

/** Items one blank row apart. */
export function Stack(props: { ui: UiContext; items: readonly RenderNode[] }): RenderNode {
  const { Box } = props.ui.els
  return (
    <Box flexDirection="column" width={props.ui.width}>
      {props.items.map((item, i) => (
        <Box flexDirection="column">
          {i > 0 ? <Blank ui={props.ui} /> : null}
          {item}
        </Box>
      ))}
    </Box>
  )
}

/** The rounded border every module and shuttle card draws in. */
export function Border(props: {
  ui: UiContext
  borderColor: string
  borderStyle?: 'round' | 'double'
  isBorderDim?: boolean
  children?: RenderChildren
}): RenderNode {
  const { Box } = props.ui.els
  return (
    <Box
      flexDirection="column"
      borderStyle={props.borderStyle ?? 'round'}
      borderColor={props.borderColor}
      borderDimColor={props.isBorderDim}
      paddingX={1}
      width={props.ui.width}
    >
      {props.children}
    </Box>
  )
}
