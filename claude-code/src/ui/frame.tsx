import type { RenderChildren, RenderNode } from 'claude-code'
import type { UiContext } from './context'
import { Blank, Border } from './layout'
import { FRAME_INSET, MIN_LOADER_ROOM } from './metrics'
import { Connector } from './widgets'

const TITLE_GAP = 2

export type NotePart = { text: string; color?: string; isBold?: boolean; isDim?: boolean }

/** A module's title at the left, a note at the right and, while its work runs, a loader between them. */
function TitleRow(props: {
  ui: UiContext
  title: string
  color: string
  note?: readonly NotePart[]
  noteSlack?: number
  isActive?: boolean
}): RenderNode {
  const { ui } = props
  const { Box, Text } = ui.els
  const note = props.note ?? []
  const noteLength = note.reduce((sum, part) => sum + part.text.length, 0) + (props.noteSlack ?? 0)
  const room = ui.width - FRAME_INSET - props.title.length - noteLength - TITLE_GAP
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
        {note.length > 0 ? (
          <Text>
            {note.map(part => (
              <Text color={part.color} bold={part.isBold} dimColor={part.isDim}>
                {part.text}
              </Text>
            ))}
          </Text>
        ) : null}
      </Box>
      <Blank ui={ui} />
    </Box>
  )
}

/** A module: its frame, title row and body. */
export function ModuleFrame(props: {
  ui: UiContext
  title: string
  color: string
  borderColor?: string
  note?: readonly NotePart[]
  noteSlack?: number
  isActive?: boolean
  children?: RenderChildren
}): RenderNode {
  return (
    <Border ui={props.ui} borderColor={props.borderColor ?? props.color}>
      <TitleRow
        ui={props.ui}
        title={props.title}
        color={props.color}
        note={props.note}
        noteSlack={props.noteSlack}
        isActive={props.isActive}
      />
      {props.children}
    </Border>
  )
}
