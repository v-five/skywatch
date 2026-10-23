import type { ClientModule } from 'claude-code'
import { fmtTimer } from '../../core'

type Props = { since: number; now: number; endAt: number | null; color: string }
type Ref = { base: number; ticks: number; lastNow: number; isRunning: boolean }
type State = { ref: Ref }

const TICK_MS = 1000

/** A running clock that ticks on the surface's frame clock between the hooks module's readings. */
const Clock: ClientModule<Props, State> = (props, surface) => {
  const { Text } = surface.elements
  const ref = surface.state?.ref ?? { base: 0, ticks: 0, lastNow: -1, isRunning: true }
  if (props.now !== ref.lastNow) {
    ref.lastNow = props.now
    ref.base = (props.endAt ?? props.now) - props.since
    ref.ticks = 0
  }
  ref.isRunning = props.endAt === null
  if (surface.state === undefined) {
    surface.setState({ ref })
    surface.every(TICK_MS, () => {
      if (!ref.isRunning) return
      ref.ticks += 1
      surface.setState({ ref })
    })
  }
  return <Text color={props.color}>{fmtTimer(ref.base + ref.ticks * TICK_MS)}</Text>
}

export default Clock
