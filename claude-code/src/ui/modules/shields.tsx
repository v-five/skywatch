import type { RenderNode } from 'claude-code'
import type { Check, Deck, Shields } from '../../../types'
import { shieldsSummary, tallyTotal, ZERO_TALLY } from '../../domain'
import type { ModuleProps, ModuleView, UiContext } from '../context'
import { ModuleFrame } from '../frame'
import { Row, Ruler, Sep } from '../layout'
import { DECK_KEYS, FRAME_INSET, LABEL_WIDTH } from '../metrics'
import { COLORS, VERDICT_STYLE } from '../theme'
import { Tally } from '../widgets'
import { HeldCall } from './parts'

const SENSORS_MIN = 8
const DECK_CHECKS_SHOWN = 5
/** The longest verdict word and a space, so the details line up. */
const VERDICT_WORD_WIDTH = Math.max(...Object.values(VERDICT_STYLE).map(style => style.word.length)) + 1
const DECKS_MIN_WIDTH = 10

function Sensors({ ui, data }: ModuleProps): RenderNode {
  const { Text } = ui.els
  const strip = data.shields.recent.slice(-Math.max(SENSORS_MIN, ui.width - LABEL_WIDTH - FRAME_INSET))
  return (
    <Row ui={ui} label="Sensors">
      {strip.length === 0 ? <Text color={COLORS.faint}>no checks yet</Text> : null}
      {strip.map(check => (
        <Text color={VERDICT_STYLE[check.verdict].color} dimColor={check.inSubagent}>
          {'▰'}
        </Text>
      ))}
    </Row>
  )
}

/** Protocols are Claude Code's rules; the decider answers prompts; the force field is what directives held. */
function Verdicts({ ui, data }: ModuleProps): RenderNode {
  const { Box, Text } = ui.els
  const summary = shieldsSummary(data.shields)
  const { held } = data.shields
  return (
    <Box flexDirection="column">
      <Row ui={ui} label="Protocols">
        <Tally ui={ui} color={COLORS.allowed} label="cleared" count={summary.rule} />
        <Sep ui={ui} />
        <Tally ui={ui} color={COLORS.stopped} label="stopped" count={summary.deny} />
        {data.shields.recent.some(check => check.inSubagent) ? <Text color={COLORS.faint}>{'   dim = subagents'}</Text> : null}
      </Row>
      <Row ui={ui} label={data.bridge.mode === 'auto' ? 'Autopilot' : 'Airlock'}>
        <Tally ui={ui} color={COLORS.cleared} label="cleared" count={summary.cleared} />
        <Sep ui={ui} />
        <Tally ui={ui} color={COLORS.stopped} label="stopped" count={summary.refused} />
        <Sep ui={ui} />
        <Tally ui={ui} color={COLORS.waiting} label="waiting" count={summary.ask} />
      </Row>
      <Row ui={ui} label="Force field">
        <Tally ui={ui} color={COLORS.cleared} label="cleared" count={held.ran} />
        <Sep ui={ui} />
        <Tally ui={ui} color={COLORS.stopped} label="stopped" count={held.refused} />
        <Sep ui={ui} />
        <Tally ui={ui} color={COLORS.waiting} label="waiting" count={data.held ? 1 : 0} />
        {data.hasBlockDirective ? <Sep ui={ui} /> : null}
        {data.hasBlockDirective ? <Tally ui={ui} color={COLORS.blocked} label="blocked" count={held.blocked} /> : null}
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

function Decks({ ui, data }: ModuleProps): RenderNode {
  const { Box, Text } = ui.els
  return (
    <Box alignItems="flex-start">
      <Box width={LABEL_WIDTH} flexShrink={0}>
        <Text dimColor>Decks</Text>
      </Box>
      <Box columnGap={2} flexWrap="wrap" width={Math.max(DECKS_MIN_WIDTH, ui.width - FRAME_INSET - LABEL_WIDTH)}>
        {data.config.decks.map(deck => (
          <DeckButton ui={ui} deck={deck} shields={data.shields} />
        ))}
      </Box>
    </Box>
  )
}

function CheckRow({ ui, check }: { ui: UiContext; check: Check }): RenderNode {
  const { Text } = ui.els
  const style = VERDICT_STYLE[check.verdict]
  return (
    <Row ui={ui} label="">
      <Text color={style.color}>{'▰ '}</Text>
      <Text color={COLORS.dim}>{`${style.word.padEnd(VERDICT_WORD_WIDTH)} `}</Text>
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
      ui={ui}
      title="⛨ Shields"
      color={COLORS.shields}
      borderColor={data.held ? COLORS.held : COLORS.shields}
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
