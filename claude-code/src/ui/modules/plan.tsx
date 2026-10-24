import type { RenderNode } from 'claude-code'
import type { PlanStatus } from '../../../types'
import { groupStatus, type PlanGroup, planGroups } from '../../domain'
import type { ModuleProps, ModuleView, UiContext } from '../context'
import { ModuleFrame } from '../frame'
import { FOLD_MARK, GAUGE_WIDTH } from '../metrics'
import type { Role } from '../palette'
import { gaugeCells } from '../widgets'

/** How a step's status reads: its mark, the colour of the mark, and whether its words are dimmed. */
const STATUS_LOOK: Readonly<Record<PlanStatus, { mark: string; role: Role; isDim: boolean }>> = {
  done: { mark: '✓', role: 'cleared', isDim: true },
  running: { mark: '◐', role: 'bridge', isDim: false },
  pending: { mark: '○', role: 'faint', isDim: false },
  skipped: { mark: '⊘', role: 'dim', isDim: true },
}
const CHILD_INDENT = '    '

function StepLine({ ui, text, status, indent }: { ui: UiContext; text: string; status: PlanStatus; indent: string }): RenderNode {
  const { Text } = ui.els
  const look = STATUS_LOOK[status]
  return (
    <Text wrap="truncate">
      <Text>{indent}</Text>
      <Text color={ui.colors[look.role]}>{`${look.mark} `}</Text>
      <Text bold={status === 'running'} dimColor={look.isDim} strikethrough={status === 'skipped'}>
        {text}
      </Text>
    </Text>
  )
}

/** A phase: its line with how far it is, then its steps; a finished phase folds to its line until opened. */
function Phase({ ui, group, index }: { ui: UiContext; group: PlanGroup & { phase: string }; index: number }): RenderNode {
  const { Box, Button, Text } = ui.els
  const status = groupStatus(group)
  const done = group.steps.filter(step => step.status === 'done').length
  const foldKey = `phase-${index}-${group.phase}`
  const isFolded = status === 'done' ? !ui.view.unfolded.includes(foldKey) : ui.view.unfolded.includes(foldKey)
  return (
    <Box flexDirection="column">
      <Box>
        <Button
          key={foldKey}
          plain
          dimColor
          label={isFolded ? FOLD_MARK.closed : FOLD_MARK.open}
          onPress={() => ui.actions.toggleFold(foldKey)}
        />
        <Text> </Text>
        <StepLine ui={ui} text={group.phase} status={status} indent="" />
        <Text dimColor>{`  ${done}/${group.steps.length}`}</Text>
      </Box>
      {isFolded ? null : group.steps.map(step => <StepLine ui={ui} text={step.text} status={step.status} indent={CHILD_INDENT} />)}
    </Box>
  )
}

/** The bridge's task list: every step with its status, steps that share a name before `:` grouped into phases. */
function PlanModule({ ui, data }: ModuleProps): RenderNode {
  const { Box, Text } = ui.els
  const steps = data.bridge.planSteps ?? []
  const done = steps.filter(step => step.status === 'done').length
  const cells = gaugeCells(steps.length > 0 ? (done / steps.length) * 100 : 0, GAUGE_WIDTH)
  return (
    <ModuleFrame
      foldKey="plan"
      ui={ui}
      title="⊹ Flight plan"
      color={ui.colors.bridge}
      note={[
        { text: cells.on, color: ui.colors.cleared },
        { text: cells.off, color: ui.colors.faint },
        { text: `  ${done}/${steps.length}`, isDim: true },
      ]}
    >
      <Box flexDirection="column">
        {planGroups(steps).map((group, index) =>
          group.phase === null ? (
            group.steps.map(step => <StepLine ui={ui} text={step.text} status={step.status} indent="  " />)
          ) : (
            <Phase ui={ui} group={{ ...group, phase: group.phase }} index={index} />
          ),
        )}
        {steps.length === 0 ? <Text color={ui.colors.faint}>no plan yet</Text> : null}
      </Box>
    </ModuleFrame>
  )
}

export const PLAN_VIEW: ModuleView = { isEmpty: data => (data.bridge.planSteps ?? []).length === 0, draw: PlanModule }
