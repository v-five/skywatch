import type { RenderNode } from 'claude-code'
import type { Relay } from '../../../types'
import { printable } from '../../core'
import type { ModuleProps, ModuleView, UiContext } from '../context'
import { ModuleFrame } from '../frame'
import { FRAME_INSET } from '../metrics'
import { Fold } from '../widgets'

const SHOWN = 8

function RelayRow({ ui, relay }: { ui: UiContext; relay: Relay }): RenderNode {
  const { Box, Text } = ui.els
  const isFailing = relay.errors > 0
  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Text wrap="truncate">
          <Text color={isFailing ? ui.colors.alert : ui.colors.cleared}>{isFailing ? '◌ ' : '● '}</Text>
          <Text>{printable(relay.server)}</Text>
        </Text>
        <Text dimColor>{`${relay.calls} calls${isFailing ? ` · ${relay.errors} failed` : ''}`}</Text>
      </Box>
      {relay.lastError ? (
        <Fold
          ui={ui}
          foldKey={`relay-${relay.server}`}
          text={`  ${relay.lastError}`}
          width={ui.width - FRAME_INSET}
          color={ui.colors.alert}
        />
      ) : null}
    </Box>
  )
}

/** The MCP servers the session called, by how they answered; the failing ones first. */
function RelaysModule({ ui, data }: ModuleProps): RenderNode {
  const relays = [...data.station.relays].sort((left, right) => right.errors - left.errors || right.calls - left.calls)
  const failing = relays.filter(relay => relay.errors > 0).length
  return (
    <ModuleFrame
      foldKey="relays"
      ui={ui}
      title="⌁ Relays"
      color={failing > 0 ? ui.colors.alert : ui.colors.dim}
      note={[{ text: `${relays.length} servers${failing > 0 ? ` · ${failing} failing` : ''}`, isDim: true }]}
    >
      {relays.slice(0, SHOWN).map(relay => (
        <RelayRow ui={ui} relay={relay} />
      ))}
    </ModuleFrame>
  )
}

export const RELAYS_VIEW: ModuleView = { isEmpty: data => data.station.relays.length === 0, draw: RelaysModule }
