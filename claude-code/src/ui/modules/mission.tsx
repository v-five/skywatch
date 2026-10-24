import type { RenderNode } from 'claude-code'
import type { RateLimit } from '../../../types'
import { fmtAgo, fmtDuration, fmtResetIn, fmtUsd, kTokens, limitLabel, plural } from '../../core'
import { activeTime } from '../../domain'
import type { ModuleProps, ModuleView, UiContext } from '../context'
import { ModuleFrame } from '../frame'
import { Row, Ruler, Sep } from '../layout'
import { LABEL_WIDTH } from '../metrics'
import { Bar, LiveClock } from '../widgets'

const LIMITS_SHOWN = 2

/** A rate limit: how much is used, and when it recharges. */
function PowerRow({ ui, limit }: { ui: UiContext; limit: RateLimit }): RenderNode {
  const { Text } = ui.els
  const resetIn = fmtResetIn(limit.resetsAt, ui.now)
  return (
    <Row ui={ui} label={`Power ${limitLabel(limit.kind)}`}>
      <Bar ui={ui} pct={limit.pct} />
      <Text bold>{`  ${String(Math.round(limit.pct)).padStart(2)}%`}</Text>
      {resetIn ? <Sep ui={ui} /> : null}
      {resetIn ? <Text dimColor>{`recharge in ${resetIn}`}</Text> : null}
    </Row>
  )
}

function Totals({ ui, data }: ModuleProps): RenderNode {
  const { Box, Text } = ui.els
  const { totals, usage } = data
  const activeMs = activeTime(totals, data.jump, data.bridge.isRunning, ui.now)
  return (
    <Box flexDirection="column">
      <Row ui={ui} label="Fuel">
        <Text>{`↑${kTokens(totals.tokIn)}  ↓${kTokens(totals.tokOut)}`}</Text>
        {usage.costUsd !== null ? <Sep ui={ui} /> : null}
        {usage.costUsd !== null ? <Text bold>{fmtUsd(usage.costUsd)}</Text> : null}
        <Sep ui={ui} />
        <Text>{`${totals.req} calls`}</Text>
      </Row>
      <Row ui={ui} label="Flight time">
        <Text>{`${fmtDuration(activeMs)} active`}</Text>
        {totals.firstSeen > 0 ? <Sep ui={ui} /> : null}
        {totals.firstSeen > 0 ? <Text dimColor>{`launched ${fmtAgo(ui.now - totals.firstSeen)}`}</Text> : null}
      </Row>
      {usage.limits.slice(0, LIMITS_SHOWN).map(limit => (
        <PowerRow ui={ui} limit={limit} />
      ))}
    </Box>
  )
}

function Jumps({ ui, data }: ModuleProps): RenderNode | null {
  const { Box, Text } = ui.els
  const { jump, lastJump } = data
  if (!data.bridge.isRunning && !lastJump) return null
  const isAnswer = lastJump?.reason === 'answer'
  const counts = lastJump
    ? [plural(lastJump.shuttles, 'shuttle'), plural(lastJump.edits, 'edit'), plural(lastJump.errors, 'error')].join(' · ')
    : ''
  return (
    <Box flexDirection="column">
      <Ruler ui={ui} />
      {data.bridge.isRunning ? (
        <Box>
          <Box width={LABEL_WIDTH} flexShrink={0}>
            <Text dimColor>Jump</Text>
          </Box>
          <Text color={ui.colors.bridge}>{'◐ '}</Text>
          <Box flexShrink={0}>
            <LiveClock ui={ui} clockKey="jump-clock" since={jump.startedAt} endAt={null} color={ui.colors.bridge} />
          </Box>
          <Text wrap="truncate">
            <Sep ui={ui} />
            <Text dimColor>{`${plural(jump.edits, 'edit')} · ${plural(jump.errors, 'error')}`}</Text>
          </Text>
        </Box>
      ) : null}
      {lastJump ? (
        <Row ui={ui} label="Last jump">
          <Text color={isAnswer ? ui.colors.shields : ui.colors.alert}>{isAnswer ? '✓ ' : '✗ '}</Text>
          <Text>{fmtDuration(lastJump.durationMs)}</Text>
          <Sep ui={ui} />
          <Text dimColor>{counts}</Text>
          {lastJump.costDelta !== null ? <Sep ui={ui} /> : null}
          {lastJump.costDelta !== null ? <Text color={ui.colors.bridge}>{`+${fmtUsd(lastJump.costDelta)}`}</Text> : null}
        </Row>
      ) : null}
    </Box>
  )
}

/** The whole session and the account: fuel, flight time, power, then the jump running and the last one. */
function MissionModule(props: ModuleProps): RenderNode {
  const { ui, data } = props
  const { Text } = ui.els
  return (
    <ModuleFrame ui={ui} foldKey="mission" title="✧ Mission" color={ui.colors.dim}>
      <Totals {...props} />
      <Jumps {...props} />
      {data.jump.isReviewing ? <Text color={ui.colors.council}>{'architect reviewing before done (inferred)'}</Text> : null}
    </ModuleFrame>
  )
}

export const MISSION_VIEW: ModuleView = { isEmpty: () => false, draw: MissionModule }
