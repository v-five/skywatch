import type { RenderNode } from 'claude-code'
import { capitalize, fmtClock, lineCost, relativePaths } from '../../core'
import { BLACKBOX_PAGE, type EntryRow, entryRows, keyedEntries } from '../../domain'
import type { ModuleProps, ModuleView, UiContext } from '../context'
import { ModuleFrame } from '../frame'
import { FOLD_MARK, FRAME_INSET } from '../metrics'
import { entryColor } from '../theme'
import { Fold } from '../widgets'

const TIME_WIDTH = fmtClock(0).length + 1
/** A writer's name column: a shuttle's title fits, with a cell to spare. */
const WRITER_WIDTH = 19
/** The gap before an entry's cost. */
const COST_GAP = '  '

function Entry({ ui, row }: { ui: UiContext; row: EntryRow }): RenderNode {
  const { Box, Text } = ui.els
  const { keyed, run } = row
  const { entry } = keyed
  const text = run ? `${run.verb} ×${run.targets.length} → ${run.targets.join(', ')}` : entry.text
  const cost = entry.cost ? `${COST_GAP}${lineCost(entry.cost)}` : ''
  const textWidth = ui.width - FRAME_INSET - TIME_WIDTH - WRITER_WIDTH - cost.length
  return (
    <Box alignItems="flex-start">
      <Box width={TIME_WIDTH} flexShrink={0}>
        <Text color={ui.colors.faint}>{fmtClock(entry.at)}</Text>
      </Box>
      <Box width={WRITER_WIDTH} flexShrink={0}>
        <Text color={entryColor(entry, ui.colors)} bold wrap="truncate">
          {capitalize(entry.who)}
        </Text>
      </Box>
      <Box flexGrow={1} flexShrink={1}>
        <Fold
          ui={ui}
          foldKey={run ? `${keyed.foldKey}-run` : keyed.foldKey}
          text={relativePaths(text, ui.places)}
          width={textWidth}
          color={entry.kind === 'error' ? ui.colors.alert : ui.colors.text}
        />
      </Box>
      {cost ? (
        <Box flexShrink={0}>
          <Text dimColor>{cost}</Text>
        </Box>
      ) : null}
    </Box>
  )
}

/** What happened, newest first: ten entries, ten more at a time. */
function BlackboxModule({ ui, data }: ModuleProps): RenderNode {
  const { Box, Text, Button } = ui.els
  const all = keyedEntries(data.blackbox, data.viewedAgentId)
  const count = Math.max(BLACKBOX_PAGE, ui.view.entriesShown)
  const shown = all.slice(0, count)
  const hasMore = all.length > count
  const hasLess = count > BLACKBOX_PAGE
  return (
    <ModuleFrame
      ui={ui}
      title={data.viewedAgentId ? '▣ Black box · this shuttle' : '▣ Black box'}
      color={ui.colors.dim}
      note={[{ text: `${shown.length} of ${all.length}`, isDim: true }]}
    >
      {shown.length === 0 ? <Text color={ui.colors.faint}>nothing yet</Text> : null}
      {entryRows(shown).map(row => (
        <Entry ui={ui} row={row} />
      ))}
      {hasMore || hasLess ? (
        <Box justifyContent="center" columnGap={3} marginTop={1}>
          {hasMore ? (
            <Button
              key="log-more"
              plain
              dimColor
              label={`Reconstitute ${FOLD_MARK.closed}`}
              onPress={() => ui.actions.showEntries(count + BLACKBOX_PAGE)}
            />
          ) : null}
          {hasLess ? (
            <Button
              key="log-less"
              plain
              dimColor
              label={`Archive ${FOLD_MARK.open}`}
              onPress={() => ui.actions.showEntries(BLACKBOX_PAGE)}
            />
          ) : null}
        </Box>
      ) : null}
    </ModuleFrame>
  )
}

export const BLACKBOX_VIEW: ModuleView = { isEmpty: () => false, draw: BlackboxModule }
