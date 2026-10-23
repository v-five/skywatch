import type { RenderNode } from 'claude-code'
import { fmtClock, fmtDuration } from '../../core'
import { hasCouncil, isTransmitting, latestTransmission, MOMENTS, transmissionTimeline } from '../../domain'
import type { ModuleProps, ModuleView } from '../context'
import { ModuleFrame } from '../frame'
import { FRAME_INSET } from '../metrics'
import { Fold } from '../widgets'

const TIMELINE_MIN = 8

function lastTransmissionLine({ data, ui }: ModuleProps): string | null {
  const last = latestTransmission(data.council)
  if (!last) return null
  if (isTransmitting(data.council)) return `transmitting since ${fmtClock(last.at)}`
  return `last ${fmtDuration(ui.now - (last.endAt ?? last.at))} ago · took ${fmtDuration((last.endAt ?? ui.now) - last.at)}`
}

/** Advisor and architect consultations: a timeline, the last one, its inferred moment and its advice. */
function CouncilModule(props: ModuleProps): RenderNode {
  const { ui, data } = props
  const { Box, Text } = ui.els
  const { council } = data
  const isLive = isTransmitting(council)
  const last = lastTransmissionLine(props)
  const moment = latestTransmission(council)?.moment
  return (
    <ModuleFrame
      ui={ui}
      title="⟁ Council"
      color={ui.colors.council}
      isActive={isLive}
      note={[
        { text: `Architect ${isLive ? 'transmitting' : 'on watch'} · transmissions `, isDim: true },
        { text: String(council.transmissions.length), color: ui.colors.council, isBold: true },
      ]}
    >
      <Text color={ui.colors.council}>{transmissionTimeline(council, ui.now, Math.max(TIMELINE_MIN, ui.width - FRAME_INSET))}</Text>
      {last ? (
        <Text dimColor wrap="truncate">
          {last}
        </Text>
      ) : (
        <Text dimColor>no transmissions yet</Text>
      )}
      <Box flexWrap="wrap" columnGap={2}>
        {MOMENTS.map(each => (
          <Text color={each === moment ? ui.colors.council : ui.colors.dim} bold={each === moment}>
            {each === moment ? '◆' : '◇'} {each}
          </Text>
        ))}
        <Text color={ui.colors.faint}>(inferred)</Text>
      </Box>
      {council.lastAdvice ? (
        <Fold ui={ui} foldKey="advice" text={`» ${council.lastAdvice}`} width={ui.width - FRAME_INSET} color={ui.colors.council} />
      ) : null}
    </ModuleFrame>
  )
}

export const COUNCIL_VIEW: ModuleView = { isEmpty: data => !hasCouncil(data.council), draw: CouncilModule }
