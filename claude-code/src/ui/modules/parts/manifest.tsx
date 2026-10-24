import type { RenderNode } from 'claude-code'
import { kTokens } from '../../../core'
import { layerName } from '../../../domain'
import type { ModuleProps } from '../../context'
import { RowBlock } from '../../layout'
import { FRAME_INSET, GAUGE_WIDTH, LABEL_WIDTH } from '../../metrics'
import { Fold, shareCells } from '../../widgets'

/** The manifest bar is twice a gauge: the whole window, shared by what fills it. */
const MANIFEST_WIDTH = GAUGE_WIDTH * 2

/** What fills the context: a bar of the whole window in Claude Code's colours for each part, then the parts by size. */
export function Manifest({ ui, data }: ModuleProps): RenderNode | null {
  const { Box, Text } = ui.els
  const layers = data.usage.layers ?? []
  if (layers.length === 0) return null
  const cells = shareCells(
    layers.map(layer => layer.tokens),
    MANIFEST_WIDTH,
  )
  const used = layers.filter(layer => layer.kind === 'used').sort((left, right) => right.tokens - left.tokens)
  const parts = used.map(layer => `${layerName(layer.name)} ${kTokens(layer.tokens)}`).join(' · ')
  return (
    <RowBlock ui={ui} label="Manifest">
      <Box flexDirection="column">
        <Text>
          {layers.map((layer, i) => (
            <Text color={layer.kind === 'free' ? ui.colors.faint : layer.color}>
              {(layer.kind === 'free' ? '▱' : '▰').repeat(cells[i] ?? 0)}
            </Text>
          ))}
        </Text>
        <Fold ui={ui} foldKey="manifest" text={parts} width={ui.width - FRAME_INSET - LABEL_WIDTH} isDim />
      </Box>
    </RowBlock>
  )
}

/** What the context carries and this session has not used, heaviest first. */
export function Ballast({ ui, data }: ModuleProps): RenderNode | null {
  const ballast = data.usage.ballast ?? []
  if (ballast.length === 0) return null
  const text = ballast.map(item => `${item.name} ${kTokens(item.tokens)}`).join(' · ')
  return (
    <RowBlock ui={ui} label="Ballast">
      <Fold ui={ui} foldKey="ballast" text={`unused · ${text}`} width={ui.width - FRAME_INSET - LABEL_WIDTH} isDim />
    </RowBlock>
  )
}
