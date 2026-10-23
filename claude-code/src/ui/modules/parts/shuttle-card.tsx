import type { RenderNode } from 'claude-code'
import type { Shuttle } from '../../../../types'
import { kTokens, prettyModel, relativePaths, shorten } from '../../../core'
import { isEffort, shuttleName } from '../../../domain'
import type { UiContext } from '../../context'
import { Blank, Border, Row, RowBlock, Ruler, Sep } from '../../layout'
import { FOLD_MARK, FRAME_INSET, LABEL_WIDTH, MIN_LOADER_ROOM } from '../../metrics'
import { SHUTTLE_STATUS } from '../../theme'
import { Connector, Effort, Fold, LiveClock } from '../../widgets'

const MAX_TOKENS = 'max_tokens'
const NAME_PREFIX = '⇡ '
const NAME_MIN = 12
/** The status's glyph, the folded clock and the chevron beside the status word. */
const STATUS_EXTRAS = 12
/** The loader's margins and the gap before the status. */
const LOADER_EXTRAS = 6
const HOTKEYS = 9

type CardProps = { ui: UiContext; shuttle: Shuttle; index: number; bridgeModel: string; isViewed: boolean }

function statusWord(shuttle: Shuttle): string {
  return shuttle.lastStop === MAX_TOKENS ? MAX_TOKENS : SHUTTLE_STATUS[shuttle.status].word
}

/** The title row: the shuttle's name, a loader while it flies, its status, and its chevron once docked. */
function ShuttleTitle({ ui, shuttle, index, isFolded }: CardProps & { isFolded: boolean }): RenderNode {
  const { Box, Text, Button } = ui.els
  const status = statusWord(shuttle)
  const isInFlight = shuttle.status === 'running'
  const name = `${NAME_PREFIX}${shuttleName(shuttle)}`
  const nameWidth = Math.max(NAME_MIN, ui.width - FRAME_INSET - status.length - STATUS_EXTRAS)
  const room = ui.width - FRAME_INSET - Math.min(name.length, nameWidth) - status.length - LOADER_EXTRAS
  const style = SHUTTLE_STATUS[shuttle.status]
  return (
    <Box justifyContent="space-between">
      <Box flexShrink={1}>
        <Text color={isFolded ? ui.colors.dim : ui.colors.shuttles} bold={!isFolded} wrap="truncate">
          {shorten(name, nameWidth)}
        </Text>
      </Box>
      {isInFlight && ui.hasClient && room >= MIN_LOADER_ROOM ? (
        <Box marginX={1}>
          <Connector ui={ui} connectorKey={`load-${shuttle.id}`} width={room} color={ui.hazardColor} />
        </Box>
      ) : null}
      <Box flexShrink={0}>
        <Text color={shuttle.lastStop === MAX_TOKENS ? ui.colors.alert : ui.colors[style.role]}>{`${style.glyph} ${status}`}</Text>
        {isFolded ? <Text dimColor>{'  '}</Text> : null}
        {isFolded ? (
          <LiveClock
            ui={ui}
            clockKey={`fold-clock-${shuttle.id}`}
            since={shuttle.spawnedAt}
            endAt={shuttle.endedAt}
            color={ui.colors.dim}
          />
        ) : null}
        {isInFlight ? null : <Text> </Text>}
        {isInFlight ? null : (
          <Button
            key={`shuttle-${shuttle.id}`}
            plain
            dimColor
            {...(index < HOTKEYS ? { hotkey: String(index + 1) } : {})}
            label={isFolded ? FOLD_MARK.closed : FOLD_MARK.open}
            onPress={() => ui.actions.toggleShuttle(shuttle.id)}
          />
        )}
      </Box>
    </Box>
  )
}

/** Helm and Fuel, with the shuttle's clock beside them. */
function CardGauges({ ui, shuttle, bridgeModel }: CardProps): RenderNode {
  const { Box, Text } = ui.els
  return (
    <Box flexDirection="column">
      <Row ui={ui} label="Helm">
        {isEffort(shuttle.effort) ? <Effort ui={ui} effort={shuttle.effort} /> : null}
        <Text>{`${shuttle.type} · ${prettyModel(shuttle.model || bridgeModel)}`}</Text>
      </Row>
      <Box justifyContent="space-between">
        <Row ui={ui} label="Fuel">
          <Text>{`↑${kTokens(shuttle.ctx)}  ↓${kTokens(shuttle.out)}`}</Text>
          <Sep ui={ui} />
          <Text>{`${shuttle.steps} calls`}</Text>
        </Row>
        <Box flexShrink={0}>
          <LiveClock
            ui={ui}
            clockKey={`shuttle-clock-${shuttle.id}`}
            since={shuttle.spawnedAt}
            endAt={shuttle.endedAt}
            color={ui.colors.dim}
          />
        </Box>
      </Box>
    </Box>
  )
}

/** What the shuttle is Scanning while it flies, or its Debrief once docked. */
function CardReading({ ui, shuttle }: CardProps): RenderNode {
  const { Text } = ui.els
  const reading = shuttle.task || shuttle.doingTitle || null
  if (shuttle.status !== 'running') {
    return (
      <RowBlock ui={ui} label="Debrief">
        {shuttle.answer ? (
          <Fold
            ui={ui}
            foldKey={`answer-${shuttle.id}`}
            text={relativePaths(shuttle.answer, ui.places)}
            width={ui.width - FRAME_INSET - LABEL_WIDTH}
            color={ui.colors.text}
          />
        ) : (
          <Text dimColor>no report</Text>
        )}
      </RowBlock>
    )
  }
  return (
    <RowBlock ui={ui} label="Scanning">
      {reading ? (
        <Text color={ui.colors.shuttles} bold wrap="wrap">
          {reading}
        </Text>
      ) : (
        <Text dimColor>{shuttle.doing ?? 'starting'}</Text>
      )}
    </RowBlock>
  )
}

/** The call in flight under its title, and the last tool the shuttle used. */
function CardCalls({ ui, shuttle }: CardProps): RenderNode {
  const { Box } = ui.els
  const inner = ui.width - FRAME_INSET - LABEL_WIDTH
  const hasTitle = shuttle.status === 'running' && Boolean(shuttle.task || shuttle.doingTitle)
  const lastTool = shuttle.tools.length > 1 ? shuttle.tools.at(-2) : undefined
  return (
    <Box flexDirection="column">
      {hasTitle && shuttle.doing ? (
        <RowBlock ui={ui} label="">
          <Fold ui={ui} foldKey={`doing-${shuttle.id}`} text={shuttle.doing} width={inner} isDim />
        </RowBlock>
      ) : null}
      {lastTool ? (
        <RowBlock ui={ui} label="Last">
          <Fold
            ui={ui}
            foldKey={`last-${shuttle.id}`}
            text={lastTool.text}
            width={inner}
            color={lastTool.isError ? ui.colors.alert : undefined}
            isDim={!lastTool.isError}
          />
        </RowBlock>
      ) : null}
    </Box>
  )
}

/** One card per shuttle; a docked one folds to its title row until opened. */
export function ShuttleCard(props: CardProps): RenderNode {
  const { ui, shuttle } = props
  const isFolded = shuttle.status !== 'running' && ui.view.expanded !== shuttle.id
  const border = shuttle.lastStop === MAX_TOKENS ? ui.colors.alert : ui.colors.shuttles
  if (isFolded) {
    return (
      <Border ui={ui} borderColor={border} isBorderDim>
        <ShuttleTitle {...props} isFolded />
      </Border>
    )
  }
  return (
    <Border ui={ui} borderColor={border} borderStyle={props.isViewed ? 'double' : 'round'}>
      <ShuttleTitle {...props} isFolded={false} />
      <Blank ui={ui} />
      <CardGauges {...props} />
      <Ruler ui={ui} isDashed />
      <CardReading {...props} />
      <CardCalls {...props} />
    </Border>
  )
}
