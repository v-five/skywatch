import type { RenderNode } from 'claude-code'
import { fmtSpeed, kTokens, prettyModel } from '../../core'
import { avgSpeed, isEffort } from '../../domain'
import type { ModuleProps, ModuleView } from '../context'
import { ModuleFrame } from '../frame'
import { Row, Ruler, Sep } from '../layout'
import { Bar, Effort } from '../widgets'
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
      {usage.compactions ? <Text color={ui.colors.waiting}>{`  ⟲${usage.compactions}`}</Text> : null}
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
        <Text color={ui.colors.bridge} bold>
          {reading}
        </Text>
      </Row>
      {bridge.isRunning && title && bridge.doing ? (
        <Row ui={ui} label="">
          <Text dimColor>{bridge.doing}</Text>
        </Row>
      ) : null}
    </Box>
  )
}

function Fleet({ ui, data }: ModuleProps): RenderNode | null {
  const { Box, Text } = ui.els
  if (data.fleet.length === 0) return null
  const running = data.fleet.filter(shuttle => shuttle.status === 'running').length
  const docked = data.fleet.filter(shuttle => shuttle.status === 'done').length
  const lost = data.fleet.length - running - docked
  // With none in flight the flight paths only repeat what the cards say: one line is enough.
  return (
    <Box flexDirection="column">
      <Ruler ui={ui} />
      <Row ui={ui} label="Shuttles">
        {running > 0 ? <Text color={ui.colors.shuttles}>{`◐ ${running} in flight`}</Text> : null}
        {running > 0 ? <Text dimColor>{` · ${data.fleet.length} total`}</Text> : null}
        {running === 0 ? <Text color={ui.colors.dim}>{`○ ${docked} docked`}</Text> : null}
        {running === 0 && lost > 0 ? <Text dimColor>{` · ${lost} lost`}</Text> : null}
      </Row>
      {running > 0 ? <FlightPaths ui={ui} data={data} /> : null}
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
      foldKey="bridge"
      ui={props.ui}
      title="⌬ Bridge"
      color={props.ui.colors.bridge}
      isActive={isBusy}
      note={[{ text: state, color: isBusy ? props.ui.colors.bridge : props.ui.colors.dim }]}
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
