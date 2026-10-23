import type { ClientModule } from 'claude-code'

type Props = { isActive: boolean; width: number; color: string; dim: string; spacing?: number }
type Ref = { phase: number; isActive: boolean }
type State = { ref: Ref }
type Run = { text: string; isLit: boolean }

const STEP_MS = 110
const DEFAULT_SPACING = 24

/** Packets every `spacing` cells, a bright head and a trailing dot, moving left to right. */
function litCells(width: number, spacing: number, phase: number): Map<number, string> {
  const lit = new Map<number, string>()
  for (let base = 0; base < width + spacing; base += spacing) {
    const head = (base + phase) % (width + spacing)
    if (head < width) lit.set(head, '●')
    if (head - 1 >= 0 && head - 1 < width) lit.set(head - 1, '•')
  }
  return lit
}

/** Consecutive cells of one kind share a Text: a handful of nodes per frame. */
function runsOf(width: number, lit: Map<number, string>): Run[] {
  const runs: Run[] = []
  for (let i = 0; i < width; i += 1) {
    const isLit = lit.has(i)
    const glyph = lit.get(i) ?? '─'
    const last = runs.at(-1)
    if (last && last.isLit === isLit) last.text += glyph
    else runs.push({ text: glyph, isLit })
  }
  return runs
}

/** A connector drawn on the surface's frame clock: packets travel while active; only this region redraws. */
const Loader: ClientModule<Props, State> = (props, surface) => {
  const { Box, Text } = surface.elements
  const ref = surface.state?.ref ?? { phase: 0, isActive: props.isActive }
  ref.isActive = props.isActive
  if (surface.state === undefined) {
    surface.setState({ ref })
    surface.every(STEP_MS, () => {
      if (!ref.isActive) return
      ref.phase += 1
      surface.setState({ ref })
    })
  }
  const width = Math.max(1, surface.columns || props.width)
  if (!props.isActive) {
    return (
      <Box>
        <Text color={props.dim}>{'─'.repeat(width)}</Text>
      </Box>
    )
  }
  const runs = runsOf(width, litCells(width, props.spacing ?? DEFAULT_SPACING, ref.phase))
  return (
    <Box>
      {runs.map(run => (
        <Text color={run.isLit ? props.color : props.dim} bold={run.isLit}>
          {run.text}
        </Text>
      ))}
    </Box>
  )
}

export default Loader
