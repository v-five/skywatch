import type { EngineInterface } from 'claude-code'
import { type PaneActions, toggleCollapsed, toggleDeck, toggleHangar, toggleShuttle, toggleUnfolded, withEntriesShown } from '../domain'
import { patchView } from './atoms'

/** The pane's actions, bound to this session. */
export function paneActions($: EngineInterface): PaneActions {
  return {
    toggleFold: key => patchView($, view => toggleUnfolded(view, key)),
    toggleDeck: deck => patchView($, view => toggleDeck(view, deck)),
    toggleShuttle: (id, isInFlight) => patchView($, view => toggleShuttle(view, id, isInFlight)),
    toggleHangar: () => patchView($, toggleHangar),
    toggleModule: name => patchView($, view => toggleCollapsed(view, name)),
    showEntries: count => patchView($, view => withEntriesShown(view, count)),
  }
}
