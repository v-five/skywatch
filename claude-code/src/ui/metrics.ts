import type { Deck } from '../../types'

/** Each deck's hotkey in the pane; `app` takes `p`, as `agents` has `a`. */
export const DECK_KEYS: Readonly<Record<Deck, string>> = {
  file: 'f',
  git: 'g',
  shell: 's',
  web: 'w',
  agents: 'a',
  app: 'p',
  mcp: 'm',
  other: 'o',
}

export const LABEL_WIDTH = 12
export const PANE_MIN_WIDTH = 40
/** The least room a loader is drawn in. */
export const MIN_LOADER_ROOM = 6
export const GAUGE_WIDTH = 10
/** A frame's border and padding, in cells. */
export const FRAME_INSET = 4
/** The gap between values on a row. */
export const SEPARATOR = '  │  '
