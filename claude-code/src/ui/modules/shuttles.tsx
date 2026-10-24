import type { RenderNode } from 'claude-code'
import type { Shuttle } from '../../../types'
import { shownShuttles } from '../../domain'
import type { ModuleProps, ModuleView, UiContext } from '../context'
import { FoldMark } from '../frame'
import { Border, Stack } from '../layout'
import { ShuttleCard } from './parts'

const DOCKED_SHOWN = 6
const HANGAR_HOTKEY = 'h'
const HANGAR_ICON = '⇡'

/** The hangar's one line: how many shuttles have landed, and the mark that shows them. */
function Hangar({ ui, landed }: { ui: UiContext; landed: readonly Shuttle[] }): RenderNode {
  const { Box, Text } = ui.els
  const lost = landed.filter(shuttle => shuttle.status !== 'done').length
  const isOpen = ui.view.isHangarOpen === true
  return (
    <Border ui={ui} borderColor={ui.colors.shuttles} isBorderDim>
      <Box justifyContent="space-between">
        <Text color={ui.colors.dim}>{`${HANGAR_ICON} Hangar`}</Text>
        <Box flexShrink={0}>
          <Text color={ui.colors.dim}>{`${landed.length - lost} docked${lost > 0 ? ` · ${lost} lost` : ''}`}</Text>
          <FoldMark ui={ui} markKey="hangar" isFolded={!isOpen} hotkey={HANGAR_HOTKEY} onPress={() => ui.actions.toggleHangar()} />
        </Box>
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
