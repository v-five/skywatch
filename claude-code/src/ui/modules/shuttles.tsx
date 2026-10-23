import type { RenderNode } from 'claude-code'
import { shownShuttles } from '../../domain'
import type { ModuleProps, ModuleView } from '../context'
import { Stack } from '../layout'
import { ShuttleCard } from './parts'

const DOCKED_SHOWN = 6

/** Shuttles in flight first, then the docked ones, newest first. */
function ShuttlesModule({ ui, data }: ModuleProps): RenderNode {
  return (
    <Stack
      ui={ui}
      items={shownShuttles(data.fleet, DOCKED_SHOWN).map((shuttle, index) => (
        <ShuttleCard ui={ui} shuttle={shuttle} index={index} bridgeModel={data.bridge.model} isViewed={data.viewedAgentId === shuttle.id} />
      ))}
    />
  )
}

export const SHUTTLES_VIEW: ModuleView = { isEmpty: data => data.fleet.length === 0, draw: ShuttlesModule }
