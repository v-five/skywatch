import type { RenderNode } from 'claude-code'
import { shorten } from '../../../core'
import { flightPaths, shuttleLabel } from '../../../domain'
import type { ModuleProps } from '../../context'
import { SHUTTLE_STATUS } from '../../theme'

const SHOWN = 10
const ROW_HEIGHT = 18
const WIDTH_PX = 520
const LABEL_PX = 150
const AXIS_END_MARGIN_PX = 10
const AXIS_PX = WIDTH_PX - LABEL_PX - AXIS_END_MARGIN_PX
const AXIS_CELLS = 100
const LABEL_MAX = 22
const LABEL_X = 4
const LABEL_BASELINE = 13
const FONT_SIZE = 11
const BAR_TOP = 4
const BAR_HEIGHT = 10
const BAR_RADIUS = 3
const BAR_MIN_PX = 3
const SVG_PADDING = 4

/** The shuttles' flight paths as SVG bars on one time axis; desktop surfaces only. */
export function FlightPaths({ ui, data }: ModuleProps): RenderNode | null {
  if (ui.surface === 'terminal' || !('Svg' in ui.els) || data.fleet.length === 0) return null
  const { Svg } = ui.els
  const fleet = data.fleet.slice(-SHOWN)
  const paths = flightPaths(fleet, ui.now, AXIS_CELLS)
  const rows = fleet.map((shuttle, i) => {
    const path = paths[i]
    const barX = LABEL_PX + ((path?.before ?? 0) / AXIS_CELLS) * AXIS_PX
    const width = Math.max(BAR_MIN_PX, ((path?.bar ?? 1) / AXIS_CELLS) * AXIS_PX)
    const label = shorten(shuttleLabel(shuttle), LABEL_MAX).replace(/[<&>]/g, '')
    return (
      `<text x="${LABEL_X}" y="${i * ROW_HEIGHT + LABEL_BASELINE}" font-size="${FONT_SIZE}" fill="${ui.svg.label}">${label}</text>` +
      `<rect x="${barX}" y="${i * ROW_HEIGHT + BAR_TOP}" width="${width}" height="${BAR_HEIGHT}" rx="${BAR_RADIUS}" fill="${ui.svg[SHUTTLE_STATUS[shuttle.status].svg]}"/>`
    )
  })
  const height = fleet.length * ROW_HEIGHT + SVG_PADDING
  return (
    <Svg
      source={`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH_PX}" height="${height}" viewBox="0 0 ${WIDTH_PX} ${height}">${rows.join('')}</svg>`}
      alt={`${data.fleet.length} shuttles on a time axis`}
      width={WIDTH_PX}
      height={height}
    />
  )
}
