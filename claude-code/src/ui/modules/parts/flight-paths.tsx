import type { RenderNode } from 'claude-code'
import { fmtDuration, shorten } from '../../../core'
import { titleOf } from '../../../domain'
import type { ModuleProps } from '../../context'
import { GAUGE_WIDTH } from '../../metrics'
import { SHUTTLE_STATUS } from '../../theme'
import { gaugeCells } from '../../widgets'

const SHOWN = 10
/** A title's column: the longest title shown, up to this many cells, and two to spare. */
const TITLE_MAX = 22
const TITLE_GAP = 2

/** Each shuttle's flight time as a gauge against the longest one, in its status colour, then the time itself. */
export function FlightPaths({ ui, data }: ModuleProps): RenderNode | null {
  const { Box, Text } = ui.els
  const fleet = data.fleet.slice(-SHOWN)
  if (fleet.length === 0) return null
  const flights = fleet.map(shuttle => Math.max(0, (shuttle.endedAt ?? ui.now) - shuttle.spawnedAt))
  const longest = Math.max(1, ...flights)
  const titles = fleet.map(shuttle => shorten(titleOf(shuttle), TITLE_MAX))
  const titleWidth = Math.max(...titles.map(title => title.length)) + TITLE_GAP
  return (
    <Box flexDirection="column">
      {fleet.map((shuttle, i) => {
        const flight = flights[i] ?? 0
        const cells = gaugeCells((flight / longest) * 100, GAUGE_WIDTH)
        return (
          <Box>
            <Box width={titleWidth} flexShrink={0}>
              <Text dimColor wrap="truncate">
                {titles[i]}
              </Text>
            </Box>
            <Text color={ui.colors[SHUTTLE_STATUS[shuttle.status].role]}>{cells.on}</Text>
            <Text color={ui.colors.faint}>{cells.off}</Text>
            <Text dimColor>{`  ${fmtDuration(flight)}`}</Text>
          </Box>
        )
      })}
    </Box>
  )
}
