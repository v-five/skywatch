import type { Deck, HazardMode, View } from '../../types'
import { DEFAULT_VIEW } from './defaults'

const UNFOLDED_MAX = 30

/** The pane's button writes; each runs on a press, never while drawing. */
export type PaneActions = {
  toggleFold(key: string): Promise<void>
  toggleDeck(deck: Deck): Promise<void>
  toggleShuttle(id: string): Promise<void>
  showEntries(count: number): Promise<void>
}

/** The hazards this session shows: its /skywatch hazards choice, else the setting. */
export function effectiveHazards(view: View, setting: HazardMode): HazardMode {
  return view.hazards ?? setting
}

export function toggleUnfolded(view: View, key: string): View {
  const unfolded = view.unfolded.includes(key) ? view.unfolded.filter(k => k !== key) : [...view.unfolded, key].slice(-UNFOLDED_MAX)
  return { ...view, unfolded }
}

export function toggleDeck(view: View, deck: Deck): View {
  return { ...view, deckOpen: view.deckOpen === deck ? null : deck }
}

export function toggleExpanded(view: View, id: string): View {
  return { ...view, expanded: view.expanded === id ? null : id }
}

export function withEntriesShown(view: View, count: number): View {
  return { ...view, entriesShown: count }
}

/** A recalibrated view keeps only this session's hazards choice. */
export function viewAfterReset(view: View): View {
  return { ...DEFAULT_VIEW, hazards: view.hazards }
}

/** This session's hazards choice, over the setting. */
export function withHazards(view: View, hazards: HazardMode): View {
  return { ...view, hazards }
}
