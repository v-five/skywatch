import type { EngineInterface } from 'claude-code'
import { type PaneActions, toggleDeck, toggleHangar, toggleShuttle, toggleUnfolded, withEntriesShown } from '../domain'
import { patchView } from './atoms'

/** The pane's actions, bound to this session. */
export function paneActions($: EngineInterface): PaneActions {
  return {
    toggleFold: key => patchView($, view => toggleUnfolded(view, key)),
    toggleDeck: deck => patchView($, view => toggleDeck(view, deck)),
    toggleShuttle: (id, isInFlight) => patchView($, view => toggleShuttle(view, id, isInFlight)),
    toggleHangar: () => patchView($, toggleHangar),
    showEntries: count => patchView($, view => withEntriesShown(view, count)),
  }
}
