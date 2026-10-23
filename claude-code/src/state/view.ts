import type { EngineInterface } from 'claude-code'
import { type PaneActions, toggleDeck, toggleExpanded, toggleUnfolded, withEntriesShown } from '../domain'
import { patchView } from './atoms'

/** The pane's actions, bound to this session. */
export function paneActions($: EngineInterface): PaneActions {
  return {
    toggleFold: key => patchView($, view => toggleUnfolded(view, key)),
    toggleDeck: deck => patchView($, view => toggleDeck(view, deck)),
    toggleShuttle: id => patchView($, view => toggleExpanded(view, id)),
    showEntries: count => patchView($, view => withEntriesShown(view, count)),
  }
}
