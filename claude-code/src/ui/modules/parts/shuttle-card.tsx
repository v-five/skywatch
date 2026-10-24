import type { RenderNode } from 'claude-code'
import type { Shuttle } from '../../../../types'
import { capitalize, kTokens, prettyModel, printable, relativePaths, shorten } from '../../../core'
import { isEffort, titleOf } from '../../../domain'
import type { UiContext } from '../../context'
import { FOLD_MARK_WIDTH, FoldMark } from '../../frame'
import { Blank, Border, Row, RowBlock, Ruler, Sep } from '../../layout'
import { FRAME_INSET, LABEL_WIDTH, MIN_LOADER_ROOM } from '../../metrics'
import { SHUTTLE_STATUS } from '../../theme'
import { Connector, Effort, Fold, LiveClock } from '../../widgets'

const MAX_TOKENS = 'max_tokens'
const SHUTTLE_ICON = '⇡'
const NAME_MIN = 12
/** The icon before the title, the status's glyph and the folded clock beside the status word. */
const STATUS_EXTRAS = 12
/** The loader's margins and the gap before the status. */
const LOADER_EXTRAS = 6
const HOTKEYS = 9

type CardProps = { ui: UiContext; shuttle: Shuttle; index: number; bridgeModel: string; isViewed: boolean }

function statusWord(shuttle: Shuttle): string {
  return shuttle.lastStop === MAX_TOKENS ? MAX_TOKENS : SHUTTLE_STATUS[shuttle.status].word
}

/** The title row: the icon and title, a loader while it flies, its status, its flight time while folded, and its fold mark. */
function ShuttleTitle(props: CardProps & { isFolded: boolean }): RenderNode {
  const { ui, shuttle, isFolded } = props
  const { Box, Text } = ui.els
  const status = statusWord(shuttle)
  const isInFlight = shuttle.status === 'running'
  const name = titleOf(shuttle)
  const nameWidth = Math.max(NAME_MIN, ui.width - FRAME_INSET - status.length - STATUS_EXTRAS - FOLD_MARK_WIDTH)
  const room = ui.width - FRAME_INSET - Math.min(name.length, nameWidth) - status.length - LOADER_EXTRAS - FOLD_MARK_WIDTH
  const style = SHUTTLE_STATUS[shuttle.status]
  return (
    <Box justifyContent="space-between">
      <Box flexShrink={1}>
        <Text color={isFolded ? ui.colors.dim : ui.colors.shuttles} bold={!isFolded} wrap="truncate">
          {`${SHUTTLE_ICON} ${shorten(name, nameWidth)}`}
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
        <FoldMark
          ui={ui}
          markKey={`shuttle-${shuttle.id}`}
          isFolded={isFolded}
          {...(props.index < HOTKEYS ? { hotkey: String(props.index + 1) } : {})}
          onPress={() => ui.actions.toggleShuttle(shuttle.id, isInFlight)}
        />
      </Box>
    </Box>
  )
}

/** The mission in the shuttle's own short words, and the brief it was given, folded. */
function CardMission({ ui, shuttle }: CardProps): RenderNode | null {
  const { Box, Text } = ui.els
  const inner = ui.width - FRAME_INSET - LABEL_WIDTH
  const brief = shuttle.brief ? relativePaths(shuttle.brief, ui.places) : ''
  if (!shuttle.description && !brief) return null
  return (
    <Box flexDirection="column">
      {shuttle.description ? (
        <Row ui={ui} label="Mission">
          <Text>{printable(capitalize(shuttle.description))}</Text>
        </Row>
      ) : null}
      {brief && brief !== shuttle.description ? (
        <RowBlock ui={ui} label="Brief">
          <Fold ui={ui} foldKey={`brief-${shuttle.id}`} text={brief} width={inner} isDim />
        </RowBlock>
      ) : null}
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
          {printable(reading)}
        </Text>
      ) : (
        <Text dimColor>{printable(shuttle.doing ?? 'starting')}</Text>
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

/** Whether a card shows only its title row: in flight, once the person folds it; docked, until they open it. */
function isCardFolded(ui: UiContext, shuttle: Shuttle): boolean {
  return shuttle.status === 'running' ? (ui.view.folded ?? []).includes(shuttle.id) : ui.view.expanded !== shuttle.id
}

/** One card per shuttle; it folds to its title row, a docked one on its own. */
export function ShuttleCard(props: CardProps): RenderNode {
  const { ui, shuttle } = props
  const isFolded = isCardFolded(ui, shuttle)
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
      <CardMission {...props} />
      <CardGauges {...props} />
      <Ruler ui={ui} isDashed />
      <CardReading {...props} />
      <CardCalls {...props} />
    </Border>
  )
}
