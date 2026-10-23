import type { RenderNode, RenderSurface } from 'claude-code'
import type { Bridge, LastJump, Usage } from '../../types'
import { fmtDuration, kTokens } from '../core'
import { lastDelta } from '../domain'
import type { DrawContext } from './context'
import { hazardOf } from './hazard'
import { SEPARATOR } from './metrics'
import { Bar, Connector } from './widgets'

const LOADER_WIDTH = 12
const LOADER_SPACING = 8
const LOADER_MIN_COLUMNS = 70

type ViewscreenProps = {
  draw: DrawContext
  surface: RenderSurface
  bodyColumns: number
  usage: Usage
  bridge: Bridge
  lastJump: LastJump | null
}

function lastJumpParts(usage: Usage, bridge: Bridge, lastJump: LastJump | null): string[] {
  const delta = lastDelta(usage)
  return [
    delta > 0 ? `▲ +${kTokens(delta)}` : delta < 0 ? `▼ ${kTokens(-delta)}` : null,
    lastJump ? fmtDuration(lastJump.durationMs) : null,
    bridge.speed?.tokPerS ? `${Math.round(bridge.speed.tokPerS)} tok/s` : null,
  ].filter((part): part is string => part !== null)
}

/** The band above the prompt: the hazard, how full the context is, and the last jump; a loader while working. */
export function Viewscreen({ draw, surface, bodyColumns, usage, bridge, lastJump }: ViewscreenProps): RenderNode {
  const { Box, Text } = draw.els
  const pct = Math.round(usage.pct ?? 0)
  const hazard = hazardOf(pct, draw.space)
  const last = lastJumpParts(usage, bridge, lastJump)
  return (
    // In the terminal the band sits right under the transcript, so it keeps a row of space above.
    <Box flexDirection="row" justifyContent="space-between" paddingX={1} marginTop={surface === 'terminal' ? 1 : 0}>
      <Box flexDirection="row" flexShrink={1}>
        <Text color={hazard.color} bold>{`${hazard.icon}  ${hazard.word}  `}</Text>
        <Bar ui={draw} pct={pct} />
        <Text bold>{`  ${pct}%`}</Text>
        {usage.window ? <Text dimColor>{`  ${kTokens(usage.tokens ?? 0)} / ${kTokens(usage.window)}`}</Text> : null}
        {last.length > 0 ? <Text color={draw.colors.faint}>{SEPARATOR}</Text> : null}
        {last.length > 0 ? <Text dimColor wrap="truncate">{`Last jump ${last.join(' · ')}`}</Text> : null}
      </Box>
      {draw.hasClient && bodyColumns >= LOADER_MIN_COLUMNS ? (
        <Connector
          ui={draw}
          connectorKey="band-loader"
          width={LOADER_WIDTH}
          color={hazard.color}
          isActive={bridge.isRunning || Boolean(bridge.command)}
          spacing={LOADER_SPACING}
        />
      ) : null}
    </Box>
  )
}
