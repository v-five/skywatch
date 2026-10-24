/** Where each hazard step starts, in percent of the context window: a directive names a step by these words. */
export const HAZARD_STARTS: ReadonlyMap<string, number> = new Map([
  ['clear-space', 0],
  ['stardust', 10],
  ['nebula', 25],
  ['gas-cloud', 40],
  ['debris', 55],
  ['asteroids', 70],
  ['ion-storm', 80],
  ['event-horizon', 90],
])

export function hazardStart(step: string): number {
  return HAZARD_STARTS.get(step) ?? 0
}
