import type { RenderNode } from 'claude-code'
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

/** The pane: the header, then the configured modules that have something to show, one column. */
export function Pane(props: ModuleProps): RenderNode {
  const { ui, data } = props
  const { Box } = ui.els
  const modules = data.config.modules.filter(module => !MODULE_VIEWS[module].isEmpty(data))
  return (
    <Box flexDirection="column" width={ui.width}>
      <Header {...props} />
      <Stack ui={ui} items={modules.map(module => MODULE_VIEWS[module].draw(props))} />
    </Box>
  )
}
