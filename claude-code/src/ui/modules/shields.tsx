import type { RenderNode } from 'claude-code'
import type { Check, Deck, Shields, Verdict } from '../../../types'
import { shieldsSummary, tallyTotal, ZERO_TALLY } from '../../domain'
import type { ModuleProps, ModuleView, UiContext } from '../context'
import { ModuleFrame } from '../frame'
import { Row, Ruler, Sep } from '../layout'
import { DECK_KEYS, FRAME_INSET, LABEL_WIDTH } from '../metrics'
import { VERDICT_STYLE } from '../theme'
import { shareCells, Tally } from '../widgets'
import { HeldCall } from './parts'

/** The sensors bar's cells: every check so far, shared by verdict. */
const SENSORS_WIDTH = 20
const VERDICTS: readonly Verdict[] = ['rule', 'cleared', 'ask', 'refused', 'deny', 'blocked']
const OTHER_TOOLS_SHOWN = 3
const DECK_CHECKS_SHOWN = 5
/** The longest verdict word and a space, so the details line up. */
const VERDICT_WORD_WIDTH = Math.max(...Object.values(VERDICT_STYLE).map(style => style.word.length)) + 1
const DECKS_MIN_WIDTH = 10

/** Every check so far as one fixed bar, each verdict's share in its colour. */
function Sensors({ ui, data }: ModuleProps): RenderNode {
  const { Text } = ui.els
  const summary = shieldsSummary(data.shields)
  const cells = shareCells(
    VERDICTS.map(verdict => summary[verdict]),
    SENSORS_WIDTH,
  )
  return (
    <Row ui={ui} label="Sensors">
      {summary.total === 0 ? <Text color={ui.colors.faint}>no checks yet</Text> : null}
      {VERDICTS.map((verdict, i) => (
        <Text color={ui.colors[VERDICT_STYLE[verdict].role]}>{'▰'.repeat(cells[i] ?? 0)}</Text>
      ))}
    </Row>
  )
}

type TallyPart = { role: 'allowed' | 'cleared' | 'stopped' | 'waiting' | 'blocked'; label: string; count: number }

/** The tallies above 0, separated; a row with none says so once. */
function Tallies({ ui, parts }: { ui: UiContext; parts: readonly TallyPart[] }): RenderNode {
  const { Text } = ui.els
  const shown = parts.filter(part => part.count > 0)
  if (shown.length === 0) return <Text color={ui.colors.faint}>none yet</Text>
  return (
    <Text>
      {shown.map((part, i) => (
        <Text>
          {i > 0 ? <Sep ui={ui} /> : null}
          <Tally ui={ui} color={ui.colors[part.role]} label={part.label} count={part.count} />
        </Text>
      ))}
    </Text>
  )
}

/** Protocols are Claude Code's rules; the decider answers prompts; the force field is what directives held. */
function Verdicts({ ui, data }: ModuleProps): RenderNode {
  const { Box } = ui.els
  const summary = shieldsSummary(data.shields)
  const { held } = data.shields
  return (
    <Box flexDirection="column">
      <Row ui={ui} label="Protocols">
        <Tallies
          ui={ui}
          parts={[
            { role: 'allowed', label: 'cleared', count: summary.rule },
            { role: 'stopped', label: 'stopped', count: summary.deny },
          ]}
        />
      </Row>
      <Row ui={ui} label={data.bridge.mode === 'auto' ? 'Autopilot' : 'Airlock'}>
        <Tallies
          ui={ui}
          parts={[
            { role: 'cleared', label: 'cleared', count: summary.cleared },
            { role: 'stopped', label: 'stopped', count: summary.refused },
            { role: 'waiting', label: 'waiting', count: summary.ask },
          ]}
        />
      </Row>
      <Row ui={ui} label="Force field">
        <Tallies
          ui={ui}
          parts={[
            { role: 'cleared', label: 'cleared', count: held.ran },
            { role: 'stopped', label: 'stopped', count: held.refused },
            { role: 'waiting', label: 'waiting', count: data.held ? 1 : 0 },
            ...(data.hasBlockDirective ? [{ role: 'blocked' as const, label: 'blocked', count: held.blocked }] : []),
          ]}
        />
      </Row>
    </Box>
  )
}

/** A deck's button: its name, how many checks it holds, and its hotkey; pressed, it opens its latest checks. */
function DeckButton({ ui, deck, shields }: { ui: UiContext; deck: Deck; shields: Shields }): RenderNode {
  const { Button } = ui.els
  const count = tallyTotal(shields.totals[deck] ?? ZERO_TALLY)
  return (
    <Button
      key={`deck-${deck}`}
      plain
      hotkey={DECK_KEYS[deck]}
      label={`${deck} ${count}${ui.view.deckOpen === deck ? ' ▾' : ''}`}
      dimColor={count === 0}
      onPress={() => ui.actions.toggleDeck(deck)}
    />
  )
}

/** The tools `other` holds most, so a deck left out of the setting is easy to spot. */
function otherTools(shields: Shields): string[] {
  const counts = new Map<string, number>()
  for (const check of shields.recent) if (check.deck === 'other') counts.set(check.tool, (counts.get(check.tool) ?? 0) + 1)
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, OTHER_TOOLS_SHOWN)
    .map(([tool]) => tool)
}

function Decks({ ui, data }: ModuleProps): RenderNode {
  const { Box, Text } = ui.els
  const others = otherTools(data.shields)
  return (
    <Box alignItems="flex-start">
      <Box width={LABEL_WIDTH} flexShrink={0}>
        <Text dimColor>Decks</Text>
      </Box>
      <Box columnGap={2} flexWrap="wrap" width={Math.max(DECKS_MIN_WIDTH, ui.width - FRAME_INSET - LABEL_WIDTH)}>
        {data.config.decks.map(deck => (
          <DeckButton ui={ui} deck={deck} shields={data.shields} />
        ))}
        {others.length > 0 ? <Text color={ui.colors.faint}>{`other: ${others.join(', ')}`}</Text> : null}
      </Box>
    </Box>
  )
}

function CheckRow({ ui, check }: { ui: UiContext; check: Check }): RenderNode {
  const { Text } = ui.els
  const style = VERDICT_STYLE[check.verdict]
  return (
    <Row ui={ui} label="">
      <Text color={ui.colors[style.role]}>{'▰ '}</Text>
      <Text color={ui.colors.dim}>{`${style.word.padEnd(VERDICT_WORD_WIDTH)} `}</Text>
      <Text dimColor={check.inSubagent}>{check.detail}</Text>
    </Row>
  )
}

function DeckChecks({ ui, data }: ModuleProps): RenderNode | null {
  const { Box } = ui.els
  const { deckOpen } = ui.view
  if (!deckOpen) return null
  return (
    <Box flexDirection="column">
      {data.shields.recent
        .filter(check => check.deck === deckOpen)
        .slice(-DECK_CHECKS_SHOWN)
        .map(check => (
          <CheckRow ui={ui} check={check} />
        ))}
    </Box>
  )
}

/** Every permission check by verdict, by deck, and the risky call held for an answer. */
function ShieldsModule(props: ModuleProps): RenderNode {
  const { ui, data } = props
  const summary = shieldsSummary(data.shields)
  const note = `${summary.total} checks`
  return (
    <ModuleFrame
      foldKey="shields"
      ui={ui}
      title="⛨ Shields"
      color={ui.colors.shields}
      borderColor={data.held ? ui.colors.held : ui.colors.shields}
      isActive={summary.ask > 0 || data.held !== null}
      note={[{ text: note, isDim: true }]}
    >
      <Sensors {...props} />
      <Verdicts {...props} />
      <Decks {...props} />
      <DeckChecks {...props} />
      {data.held ? <Ruler ui={ui} /> : null}
      {data.held ? <HeldCall ui={ui} held={data.held} /> : null}
    </ModuleFrame>
  )
}

export const SHIELDS_VIEW: ModuleView = { isEmpty: () => false, draw: ShieldsModule }
