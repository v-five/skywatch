import type { ElementTable, RenderNode } from 'claude-code'
import { capitalize, type Module } from '../core'
import { hasCouncil, isTransmitting } from '../domain'
import type { ModuleProps } from './context'
import { hazardOf } from './hazard'
import { Stack } from './layout'
import { MODULE_VIEWS } from './modules'
import { COLORS } from './theme'

/** The header: the radar in the hazard's colour, and the architect's watch once the council has sat. */
function Header({ ui, data }: ModuleProps): RenderNode {
  const { Box, Text } = ui.els
  const hasSat = hasCouncil(data.council)
  return (
    <Box justifyContent="center" marginBottom={1}>
      <Text bold wrap="truncate">
        <Text color={data.usage.pct !== null ? hazardOf(data.usage.pct).color : COLORS.shuttles}>◎</Text>
        <Text> SkyWatch</Text>
        {hasSat ? <Text color={COLORS.dim}> · </Text> : null}
        {hasSat ? <Text color={COLORS.council}>Architect</Text> : null}
        {hasSat ? <Text>{isTransmitting(data.council) ? ' transmitting' : ' on watch'}</Text> : null}
      </Text>
    </Box>
  )
}

const RECALIBRATE_HINT = 'Run /skywatch recalibrate to clear its readings.'

/** One module, or a line saying it failed: a module that throws never takes the rest of the pane with it. */
function drawModule(module: Module, props: ModuleProps): RenderNode | null {
  const { Text } = props.ui.els
  try {
    const view = MODULE_VIEWS[module]
    return view.isEmpty(props.data) ? null : view.draw(props)
  } catch (error) {
    return <Text color={COLORS.alert}>{`⚠ ${capitalize(module)} could not draw: ${errorText(error)}`}</Text>
  }
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** The pane: the header, then the configured modules that have something to show, one column. */
export function Pane(props: ModuleProps): RenderNode {
  const { ui, data } = props
  const { Box } = ui.els
  const drawn = data.config.modules.map(module => drawModule(module, props)).filter((node): node is RenderNode => node !== null)
  return (
    <Box flexDirection="column" width={ui.width}>
      <Header {...props} />
      <Stack ui={ui} items={drawn} />
    </Box>
  )
}

/** What the pane shows when its readings cannot be drawn at all. */
export function PaneFault(props: { els: ElementTable; reason: string }): RenderNode {
  const { Box, Text } = props.els
  return (
    <Box flexDirection="column">
      <Text color={COLORS.alert}>{`⚠ SkyWatch could not draw: ${props.reason}`}</Text>
      <Text dimColor>{RECALIBRATE_HINT}</Text>
    </Box>
  )
}
