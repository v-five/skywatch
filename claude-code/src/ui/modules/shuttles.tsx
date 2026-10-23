import type { RenderNode } from 'claude-code'
import type { Shuttle } from '../../../types'
import { shownShuttles } from '../../domain'
import type { ModuleProps, ModuleView, UiContext } from '../context'
import { Border, Stack } from '../layout'
import { FOLD_MARK } from '../metrics'
import { ShuttleCard } from './parts'

const DOCKED_SHOWN = 6
const HANGAR_HOTKEY = 'h'

/** The hangar's one line: how many shuttles have landed, and the chevron that shows them. */
function Hangar({ ui, landed }: { ui: UiContext; landed: readonly Shuttle[] }): RenderNode {
  const { Box, Button, Text } = ui.els
  const lost = landed.filter(shuttle => shuttle.status !== 'done').length
  const isOpen = ui.view.isHangarOpen === true
  return (
    <Border ui={ui} borderColor={ui.colors.shuttles} isBorderDim>
      <Box justifyContent="space-between">
        <Box>
          <Button
            key="hangar"
            plain
            dimColor
            hotkey={HANGAR_HOTKEY}
            label={isOpen ? FOLD_MARK.open : FOLD_MARK.closed}
            onPress={() => ui.actions.toggleHangar()}
          />
          <Text color={ui.colors.dim}>{' ⇡ Hangar'}</Text>
        </Box>
        <Text color={ui.colors.dim}>{`${landed.length - lost} docked${lost > 0 ? ` · ${lost} lost` : ''}`}</Text>
      </Box>
    </Border>
  )
}

/** Shuttles in flight, then the hangar, which holds the docked ones, newest first, when open. */
function ShuttlesModule({ ui, data }: ModuleProps): RenderNode {
  const shown = shownShuttles(data.fleet, DOCKED_SHOWN)
  const flying = shown.filter(shuttle => shuttle.status === 'running')
  const landed = shown.filter(shuttle => shuttle.status !== 'running')
  const cards = (list: readonly Shuttle[], offset: number) =>
    list.map((shuttle, i) => (
      <ShuttleCard
        ui={ui}
        shuttle={shuttle}
        index={offset + i}
        bridgeModel={data.bridge.model}
        isViewed={data.viewedAgentId === shuttle.id}
      />
    ))
  return (
    <Stack
      ui={ui}
      items={[
        ...cards(flying, 0),
        ...(landed.length > 0 ? [<Hangar ui={ui} landed={landed} />] : []),
        ...(ui.view.isHangarOpen ? cards(landed, flying.length) : []),
      ]}
    />
  )
}

export const SHUTTLES_VIEW: ModuleView = { isEmpty: data => data.fleet.length === 0, draw: ShuttlesModule }
