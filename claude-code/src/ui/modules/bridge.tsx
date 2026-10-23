import type { RenderNode } from 'claude-code'
import { fmtSpeed, kTokens, prettyModel } from '../../core'
import { avgSpeed, isEffort } from '../../domain'
import type { ModuleProps, ModuleView } from '../context'
import { ModuleFrame } from '../frame'
import { Row, RowBlock, Ruler, Sep } from '../layout'
import { FRAME_INSET, LABEL_WIDTH } from '../metrics'
import { COLORS } from '../theme'
import { Bar, Effort, Fold } from '../widgets'
import { FlightPaths } from './parts'

/** The state glyph is wider than a cell on some surfaces. */
const STATE_SLACK = 1

function Helm({ ui, data }: ModuleProps): RenderNode {
  const { Text } = ui.els
  const { bridge } = data
  return (
    <Row ui={ui} label="Helm">
      {isEffort(bridge.effort) ? <Effort ui={ui} effort={bridge.effort} /> : null}
      <Text>{prettyModel(bridge.model)}</Text>
      {bridge.mode ? <Sep ui={ui} /> : null}
      {bridge.mode ? <Text dimColor>{bridge.mode}</Text> : null}
    </Row>
  )
}

function Hull({ ui, data }: ModuleProps): RenderNode {
  const { Text } = ui.els
  const { usage, bridge } = data
  const tokens = usage.tokens ?? 0
  return (
    <Row ui={ui} label="Hull">
      {usage.pct !== null ? <Bar ui={ui} pct={usage.pct} /> : null}
      {usage.pct !== null ? <Text bold>{`  ${Math.round(usage.pct)}%`}</Text> : null}
      {usage.pct !== null ? <Sep ui={ui} /> : null}
      <Text>{usage.tokens !== null && usage.window ? `${kTokens(tokens)} / ${kTokens(usage.window)}` : kTokens(tokens)}</Text>
      <Sep ui={ui} />
      <Text>{`${bridge.steps} calls`}</Text>
      {usage.compactions ? <Text color={COLORS.waiting}>{`  ⟲${usage.compactions}`}</Text> : null}
    </Row>
  )
}

function Warp({ ui, data }: ModuleProps): RenderNode | null {
  const { Text } = ui.els
  const { speed } = data.bridge
  const average = avgSpeed(data.bridge.avg)
  if (!speed && !average) return null
  return (
    <Row ui={ui} label="Warp">
      {speed ? <Text dimColor>burst </Text> : null}
      {speed ? <Text>{fmtSpeed(speed)}</Text> : null}
      {speed && average ? <Sep ui={ui} /> : null}
      {average ? <Text dimColor>cruise </Text> : null}
      {average ? <Text>{fmtSpeed(average)}</Text> : null}
    </Row>
  )
}

/** A slash command between jumps, or while the bridge runs, its task-list step or tool call. */
function Scanning({ ui, data }: ModuleProps): RenderNode | null {
  const { Box, Text } = ui.els
  const { bridge } = data
  const title = bridge.task || bridge.doingTitle || null
  const reading = bridge.isRunning ? (title ?? bridge.doing) : bridge.command ? `/${bridge.command}` : null
  if (!reading) return null
  return (
    <Box flexDirection="column">
      <Ruler ui={ui} />
      <Row ui={ui} label="Scanning">
        <Text color={COLORS.bridge} bold>
          {reading}
        </Text>
      </Row>
      {bridge.isRunning && title && bridge.doing ? (
        <RowBlock ui={ui} label="">
          <Fold ui={ui} foldKey="doing-bridge" text={bridge.doing} width={ui.width - FRAME_INSET - LABEL_WIDTH} isDim />
        </RowBlock>
      ) : null}
    </Box>
  )
}

function Fleet({ ui, data }: ModuleProps): RenderNode | null {
  const { Box, Text } = ui.els
  if (data.fleet.length === 0) return null
  const running = data.fleet.filter(shuttle => shuttle.status === 'running').length
  return (
    <Box flexDirection="column">
      <Ruler ui={ui} />
      <Row ui={ui} label="Shuttles">
        <Text color={running > 0 ? COLORS.shuttles : COLORS.dim}>{`${running > 0 ? '◐' : '○'} ${running} in flight`}</Text>
        <Text dimColor>{` · ${data.fleet.length} total`}</Text>
      </Row>
      <FlightPaths ui={ui} data={data} />
    </Box>
  )
}

/** The main model: Helm, Hull, Warp, what it is Scanning, and the shuttles it launched. */
function BridgeModule(props: ModuleProps): RenderNode {
  const { bridge } = props.data
  const isBusy = bridge.isRunning || Boolean(bridge.command)
  const state = bridge.isRunning ? '● engaged' : bridge.command ? `◐ /${bridge.command}` : '○ standby'
  return (
    <ModuleFrame
      ui={props.ui}
      title="⌬ Bridge"
      color={COLORS.bridge}
      isActive={isBusy}
      note={[{ text: state, color: isBusy ? COLORS.bridge : COLORS.dim }]}
      noteSlack={STATE_SLACK}
    >
      <Helm {...props} />
      <Hull {...props} />
      <Warp {...props} />
      <Scanning {...props} />
      <Fleet {...props} />
    </ModuleFrame>
  )
}

export const BRIDGE_VIEW: ModuleView = { isEmpty: () => false, draw: BridgeModule }
