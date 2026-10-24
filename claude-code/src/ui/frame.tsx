import type { RenderChildren, RenderNode } from 'claude-code'
import type { UiContext } from './context'
import { Blank, Border } from './layout'
import { FOLD_MARK, FRAME_INSET, MIN_LOADER_ROOM } from './metrics'
import { Connector } from './widgets'

const TITLE_GAP = 2
/** The fold mark at a title row's end and the space before it. */
export const FOLD_MARK_WIDTH = 2

export type NotePart = { text: string; color?: string; isBold?: boolean; isDim?: boolean }

/** The mark at a card's end that folds it to its title row and opens it again. */
export function FoldMark(props: { ui: UiContext; markKey: string; isFolded: boolean; onPress: () => void }): RenderNode {
  const { Box, Button } = props.ui.els
  return (
    <Box marginLeft={1} flexShrink={0}>
      <Button key={props.markKey} plain dimColor label={props.isFolded ? FOLD_MARK.closed : FOLD_MARK.open} onPress={props.onPress} />
    </Box>
  )
}

/** A module's title at the left, a note and its fold mark at the right and, while its work runs, a loader between them. */
function TitleRow(props: {
  ui: UiContext
  title: string
  color: string
  foldKey: string
  isCollapsed: boolean
  note?: readonly NotePart[]
  noteSlack?: number
  isActive?: boolean
}): RenderNode {
  const { ui } = props
  const { Box, Text } = ui.els
  const note = props.note ?? []
  const noteLength = note.reduce((sum, part) => sum + part.text.length, 0) + (props.noteSlack ?? 0)
  const room = ui.width - FRAME_INSET - props.title.length - noteLength - TITLE_GAP - FOLD_MARK_WIDTH
  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Text color={props.color} bold wrap="truncate">
          {props.title}
        </Text>
        {props.isActive && ui.hasClient && room >= MIN_LOADER_ROOM ? (
          <Box marginX={1}>
            <Connector ui={ui} connectorKey={`load-${props.title}`} width={room} color={ui.hazardColor} />
          </Box>
        ) : null}
        <Box flexShrink={0}>
          {note.map(part => (
            <Text color={part.color} bold={part.isBold} dimColor={part.isDim}>
              {part.text}
            </Text>
          ))}
          <FoldMark
            ui={ui}
            markKey={`module-${props.foldKey}`}
            isFolded={props.isCollapsed}
            onPress={() => ui.actions.toggleModule(props.foldKey)}
          />
        </Box>
      </Box>
      {props.isCollapsed ? null : <Blank ui={ui} />}
    </Box>
  )
}

/** A module: its frame, title row and body; folded, its title row alone. */
export function ModuleFrame(props: {
  ui: UiContext
  title: string
  /** The module's name, which its fold is kept under. */
  foldKey: string
  color: string
  borderColor?: string
  note?: readonly NotePart[]
  noteSlack?: number
  isActive?: boolean
  children?: RenderChildren
}): RenderNode {
  const isCollapsed = (props.ui.view.collapsed ?? []).includes(props.foldKey)
  return (
    <Border ui={props.ui} borderColor={props.borderColor ?? props.color} isBorderDim={isCollapsed}>
      <TitleRow
        ui={props.ui}
        title={props.title}
        color={props.color}
        foldKey={props.foldKey}
        isCollapsed={isCollapsed}
        note={props.note}
        noteSlack={props.noteSlack}
        isActive={props.isActive && !isCollapsed}
      />
      {isCollapsed ? null : props.children}
    </Border>
  )
}
