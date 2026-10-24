import type { RenderNode } from 'claude-code'
import type { Satellite } from '../../../types'
import { printable } from '../../core'
import type { ModuleProps, ModuleView, UiContext } from '../context'
import { ModuleFrame } from '../frame'
import { LiveClock } from '../widgets'

const SHOWN = 6

const STATUS_LOOK: Readonly<Record<Satellite['status'], { mark: string; role: 'shuttles' | 'cleared' | 'alert' | 'dim' }>> = {
  running: { mark: '◐', role: 'shuttles' },
  done: { mark: '✓', role: 'cleared' },
  failed: { mark: '✗', role: 'alert' },
  stopped: { mark: '■', role: 'dim' },
}

function SatelliteRow({ ui, satellite }: { ui: UiContext; satellite: Satellite }): RenderNode {
  const { Box, Text } = ui.els
  const look = STATUS_LOOK[satellite.status]
  return (
    <Box justifyContent="space-between">
      <Text wrap="truncate">
        <Text color={ui.colors[look.role]}>{`${look.mark} `}</Text>
        <Text dimColor={satellite.status !== 'running'}>{printable(satellite.label)}</Text>
      </Text>
      <Box flexShrink={0} marginLeft={1}>
        <LiveClock
          ui={ui}
          clockKey={`satellite-${satellite.id}`}
          since={satellite.startedAt}
          endAt={satellite.endedAt}
          color={ui.colors.dim}
        />
      </Box>
    </Box>
  )
}

/** Background tasks: those still in orbit first, then the last ones that came down. */
function SatellitesModule({ ui, data }: ModuleProps): RenderNode {
  const { satellites } = data.station
  const running = satellites.filter(satellite => satellite.status === 'running')
  const landed = satellites.filter(satellite => satellite.status !== 'running').reverse()
  return (
    <ModuleFrame
      foldKey="satellites"
      ui={ui}
      title="◍ Satellites"
      color={ui.colors.shuttles}
      isActive={running.length > 0}
      note={[{ text: `${running.length} in orbit · ${landed.length} down`, isDim: true }]}
    >
      {[...running, ...landed].slice(0, SHOWN).map(satellite => (
        <SatelliteRow ui={ui} satellite={satellite} />
      ))}
    </ModuleFrame>
  )
}

export const SATELLITES_VIEW: ModuleView = { isEmpty: data => data.station.satellites.length === 0, draw: SatellitesModule }
