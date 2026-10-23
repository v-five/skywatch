import type { RenderNode } from 'claude-code'
import type { Probe } from '../../../types'
import { isProbeActive } from '../../domain'
import type { ModuleProps, ModuleView, UiContext } from '../context'
import { ModuleFrame } from '../frame'
import { FRAME_INSET } from '../metrics'
import { COLORS } from '../theme'

const DOTS_MIN = 4
/** Cells kept free at the dot row's end, so the dots read as a short strip rather than a full line. */
const DOT_ROW_MARGIN = 34

/** A probe: lit while active, ticked once done, an empty ring while quiet. */
function ProbeDot({ ui, probe }: { ui: UiContext; probe: Probe }): RenderNode {
  const { Text } = ui.els
  if (isProbeActive(probe, ui.now)) return <Text color={COLORS.shuttles}>●</Text>
  return probe.isDone ? <Text color={COLORS.dim}>✓</Text> : <Text color={COLORS.faint}>○</Text>
}

/** Model loops no shuttle claims: a dot each, lit while active, ticked once done. */
function ProbesModule({ ui, data }: ModuleProps): RenderNode {
  const { Text } = ui.els
  const active = data.probes.filter(probe => isProbeActive(probe, ui.now)).length
  return (
    <ModuleFrame
      ui={ui}
      title="◌ Probes"
      color={COLORS.dim}
      isActive={active > 0}
      note={[{ text: `${data.probes.length} in orbit · ${active} active`, isDim: true }]}
    >
      <Text wrap="truncate">
        {data.probes.slice(-Math.max(DOTS_MIN, ui.width - FRAME_INSET - DOT_ROW_MARGIN)).map(probe => (
          <ProbeDot ui={ui} probe={probe} />
        ))}
      </Text>
    </ModuleFrame>
  )
}

export const PROBES_VIEW: ModuleView = { isEmpty: data => data.probes.length === 0, draw: ProbesModule }
