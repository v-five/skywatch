// Runs inside a copy of the pre-refactor plugin (see scripts/golden.sh): prints what its modules gave for the corpus.
import { test } from 'claude-code/testing'
import * as core from '../hooks/core'
import * as forcefield from '../hooks/forcefield.mjs'
import * as corpus from './support/corpus'

test('print golden', async () => {
  const golden = {
    classify: corpus.COMMANDS.map(command =>
      forcefield.classifyAll(command).map((risk: Record<string, unknown>) => ({ ...risk, group: core.groupOf(risk as never) })),
    ),
    stripHeredocs: corpus.COMMANDS.map(command => forcefield.stripHeredocs(command)),
    maskQuotes: corpus.COMMANDS.map(command => forcefield.maskQuotes(command)),
    parseDirectives: corpus.DIRECTIVE_TEXTS.map(text => core.parseDirectives(text, 'src')),
    directiveFor: corpus.DIRECTIVE_CALLS.map(call =>
      corpus.DIRECTIVE_TEXTS.map(text =>
        core.directiveFor([...core.DEFAULT_DIRECTIVES, ...core.parseDirectives(text, 'src').directives], call.groups, call.command),
      ),
    ),
    secretFileOf: corpus.SECRET_CALLS.map(call => core.secretFileOf(call.tool, call.input)),
    redact: corpus.REDACT_TEXTS.map(text => core.redact(text)),
    prettyModel: corpus.MODEL_IDS.map(id => core.prettyModel(id)),
    kTokens: corpus.NUMBERS.map(n => core.kTokens(n)),
    fmtDuration: corpus.DURATIONS.map(ms => core.fmtDuration(ms)),
    fmtTimer: corpus.DURATIONS.map(ms => core.fmtTimer(ms)),
    fmtUsd: corpus.USD.map(usd => core.fmtUsd(usd)),
    fmtResetIn: corpus.RESETS.map(reset => core.fmtResetIn(reset.resetsAt, reset.now)),
    limitLabel: corpus.LIMIT_KINDS.map(kind => core.limitLabel(kind)),
    shorten: corpus.SHORTEN_CASES.map(([text, max]) => core.shorten(text, max)),
    plural: [0, 1, 2].map(n => core.plural(n, 'error')),
    lineCost: [core.lineCost({ usd: null, tokIn: 1500, tokOut: 20 }), core.lineCost({ usd: 1.5, tokIn: 2_000_000, tokOut: 0 })],
    parseConfig: corpus.CONFIGS.map(options => core.parseConfig(options)),
    taskOf: corpus.TASK_CALLS.map(call => core.taskOf(call.tool, call.input, call.plan, call.current) ?? 'undefined'),
    phraseOf: corpus.TOOL_CALLS.map(call => core.phraseOf(call.tool, call.input)),
    describeInput: corpus.TOOL_CALLS.map(call => core.describeInput(call.tool, call.input)),
    toolName: corpus.TOOL_CALLS.map(call => core.toolName(call.tool)),
    deckOf: corpus.DECK_SETS.map(decks => corpus.DECK_CALLS.map(call => core.deckOf(call.tool, call.input, decks as never))),
    promptLine: corpus.PROMPTS.map(text => core.promptLine(text)),
    handbackOf: corpus.HANDBACKS.map(text => core.handbackOf(text)),
    adviceLine: corpus.REPORTS.map(report => core.adviceLine(report)),
    hazardOf: corpus.PERCENTS.map(pct => core.hazardOf(pct)),
    ringOf: corpus.PERCENTS.map(pct => core.ringOf(pct)),
    gauge: corpus.PERCENTS.map(pct => core.gauge(pct, 10)),
    writerName: ['captain', 'bridge', 'Explore', ''].map(who => core.writerName(who)),
  }
  console.log(`GOLDEN>>>${JSON.stringify(golden)}<<<GOLDEN`)
})
