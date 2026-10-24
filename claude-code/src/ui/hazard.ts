import { hazardStart } from '../core'
import { DEFAULT_PALETTE, type Space, type SpaceStep } from './palette'

export type Hazard = { upTo: number; icon: string; word: string; color: string }

type Step = { upTo: number; icon: string; word: string; step: SpaceStep }

const EVENT_HORIZON: Step = { upTo: Number.POSITIVE_INFINITY, icon: '◉', word: 'Event horizon', step: 'eventHorizon' }

/** Hazard steps by percent of the context window used: single-width symbols. */
const HAZARD_SCALE: readonly Step[] = [
  { upTo: hazardStart('stardust'), icon: '✦', word: 'Clear space', step: 'clearSpace' },
  { upTo: hazardStart('nebula'), icon: '∙', word: 'Stardust', step: 'stardust' },
  { upTo: hazardStart('gas-cloud'), icon: '≈', word: 'Nebula', step: 'nebula' },
  { upTo: hazardStart('debris'), icon: '☁', word: 'Gas cloud', step: 'gasCloud' },
  { upTo: hazardStart('asteroids'), icon: '∴', word: 'Debris', step: 'debris' },
  { upTo: hazardStart('ion-storm'), icon: '☄', word: 'Asteroid field', step: 'asteroids' },
  { upTo: hazardStart('event-horizon'), icon: 'ϟ', word: 'Ion storm', step: 'ionStorm' },
  EVENT_HORIZON,
]

/** The hazard for a percent, coloured by `space`: SkyWatch's own colours unless a palette says otherwise. */
export function hazardOf(pct: number, space: Space = DEFAULT_PALETTE.space): Hazard {
  const { upTo, icon, word, step } = HAZARD_SCALE.find(hazard => pct < hazard.upTo) ?? EVENT_HORIZON
  return { upTo, icon, word, color: space[step] }
}

const RING = '○◔◑◕●'

/** A quarter-step ring for a percent: ○ ◔ ◑ ◕ ●. */
export function ringOf(pct: number): string {
  const step = Math.round((pct / 100) * (RING.length - 1))
  return RING.charAt(Math.max(0, Math.min(RING.length - 1, step)))
}
