import { SPACE } from './theme'

export type Hazard = { upTo: number; icon: string; word: string; color: string }

const EVENT_HORIZON: Hazard = { upTo: Number.POSITIVE_INFINITY, icon: '◉', word: 'Event horizon', color: SPACE.eventHorizon }

/** Hazard steps by percent of the context window used: single-width symbols, fixed hex on every surface. */
const HAZARD_SCALE: readonly Hazard[] = [
  { upTo: 10, icon: '✦', word: 'Clear space', color: SPACE.clearSpace },
  { upTo: 25, icon: '∙', word: 'Stardust', color: SPACE.stardust },
  { upTo: 40, icon: '≈', word: 'Nebula', color: SPACE.nebula },
  { upTo: 55, icon: '☁', word: 'Gas cloud', color: SPACE.gasCloud },
  { upTo: 70, icon: '∴', word: 'Debris', color: SPACE.debris },
  { upTo: 80, icon: '☄', word: 'Asteroid field', color: SPACE.asteroids },
  { upTo: 90, icon: 'ϟ', word: 'Ion storm', color: SPACE.ionStorm },
  EVENT_HORIZON,
]

export function hazardOf(pct: number): Hazard {
  return HAZARD_SCALE.find(hazard => pct < hazard.upTo) ?? EVENT_HORIZON
}

const RING = '○◔◑◕●'

/** A quarter-step ring for a percent: ○ ◔ ◑ ◕ ●. */
export function ringOf(pct: number): string {
  const step = Math.round((pct / 100) * (RING.length - 1))
  return RING.charAt(Math.max(0, Math.min(RING.length - 1, step)))
}
