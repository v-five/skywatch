import type { RenderNode } from 'claude-code'
import { capitalize, printable } from '../../../core'
import type { ActiveHold } from '../../../forcefield'
import type { UiContext } from '../../context'
import { Row } from '../../layout'
import { LABEL_WIDTH, SEPARATOR } from '../../metrics'
import { LiveClock } from '../../widgets'

const LINES_SHOWN = 3

/** The risky call held for an answer: how long it has waited, who made it and what it would change. */
export function HeldCall({ ui, held }: { ui: UiContext; held: ActiveHold }): RenderNode {
  const { Box, Text } = ui.els
  const hidden = held.lines.length - Math.min(LINES_SHOWN, held.lines.length) + held.more
  return (
    <Box flexDirection="column">
      <Box>
        <Box width={LABEL_WIDTH} flexShrink={0}>
          <Text color={ui.colors.held} bold>
            Held
          </Text>
        </Box>
        <Text color={ui.colors.held}>{'waiting '}</Text>
        <Box flexShrink={0}>
          <LiveClock ui={ui} clockKey="held-clock" since={held.since} endAt={null} color={ui.colors.held} />
        </Box>
        <Text dimColor wrap="truncate">{`${SEPARATOR}from ${capitalize(held.who)}`}</Text>
      </Box>
      <Row ui={ui} label="">
        <Text color={ui.colors.held} bold>
          {printable(held.headline)}
        </Text>
      </Row>
      <Row ui={ui} label="">
        <Text>{held.summary}</Text>
      </Row>
      {held.lines.slice(0, LINES_SHOWN).map(line => (
        <Row ui={ui} label="">
          <Text dimColor>{printable(line)}</Text>
        </Row>
      ))}
      {hidden > 0 ? (
        <Row ui={ui} label="">
          <Text color={ui.colors.faint}>{`+${hidden} more`}</Text>
        </Row>
      ) : null}
      {held.note ? (
        <Row ui={ui} label="">
          <Text color={ui.colors.faint}>{printable(held.note)}</Text>
        </Row>
      ) : null}
      <Row ui={ui} label="">
        <Text color={ui.colors.held}>answer in the permission prompt</Text>
      </Row>
    </Box>
  )
}
