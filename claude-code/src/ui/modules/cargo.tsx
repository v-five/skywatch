import type { RenderNode } from 'claude-code'
import type { CargoFile } from '../../../types'
import { printable, shorten } from '../../core'
import type { ModuleProps, ModuleView, UiContext } from '../context'
import { ModuleFrame } from '../frame'
import { Row } from '../layout'
import { FRAME_INSET } from '../metrics'
import { Fold } from '../widgets'

const FOLDERS_SHOWN = 6
const FOLDER_MAX = 30

type Folder = { name: string; files: number; added: number; removed: number }

/** Uncommitted changes by top folder (or the file itself at the root), largest first. */
function byFolder(changes: readonly CargoFile[]): Folder[] {
  const folders = new Map<string, Folder>()
  for (const file of changes) {
    const parts = file.path.split('/')
    const name = parts.length > 1 ? `${parts.slice(0, -1).slice(0, 2).join('/')}/` : file.path
    const folder = folders.get(name) ?? { name, files: 0, added: 0, removed: 0 }
    folders.set(name, { ...folder, files: folder.files + 1, added: folder.added + file.added, removed: folder.removed + file.removed })
  }
  return [...folders.values()].sort((left, right) => right.added + right.removed - (left.added + left.removed))
}

function FolderRow({ ui, folder }: { ui: UiContext; folder: Folder }): RenderNode {
  const { Text } = ui.els
  return (
    <Row ui={ui} label="">
      <Text>{printable(shorten(folder.name, FOLDER_MAX)).padEnd(FOLDER_MAX)}</Text>
      <Text color={ui.colors.cleared}>{`  +${folder.added}`}</Text>
      <Text color={ui.colors.alert}>{` −${folder.removed}`}</Text>
      <Text dimColor>{`  ${folder.files} ${folder.files === 1 ? 'file' : 'files'}`}</Text>
    </Row>
  )
}

/** What the session carries: the files it edited, and the repository's uncommitted changes by folder. */
function CargoModule({ ui, data }: ModuleProps): RenderNode {
  const { Text } = ui.els
  const { changes, edited } = data.station
  const added = (changes ?? []).reduce((sum, file) => sum + file.added, 0)
  const removed = (changes ?? []).reduce((sum, file) => sum + file.removed, 0)
  const recent = [...edited].reverse().map(file => (file.edits > 1 ? `${file.path} ×${file.edits}` : file.path))
  return (
    <ModuleFrame
      foldKey="cargo"
      ui={ui}
      title="▤ Cargo hold"
      color={ui.colors.dim}
      note={
        changes
          ? [
              { text: `+${added}`, color: ui.colors.cleared },
              { text: ` −${removed}`, color: ui.colors.alert },
            ]
          : []
      }
    >
      <Row ui={ui} label="Changes">
        <Text dimColor>
          {changes === null ? 'not a repository' : changes.length === 0 ? 'nothing to commit' : `${changes.length} files`}
        </Text>
      </Row>
      {byFolder(changes ?? [])
        .slice(0, FOLDERS_SHOWN)
        .map(folder => (
          <FolderRow ui={ui} folder={folder} />
        ))}
      {recent.length > 0 ? (
        <Row ui={ui} label="Edited">
          <Text dimColor>{`${edited.length} this session`}</Text>
        </Row>
      ) : null}
      {recent.length > 0 ? <Fold ui={ui} foldKey="cargo-edited" text={recent.join(' · ')} width={ui.width - FRAME_INSET} isDim /> : null}
    </ModuleFrame>
  )
}

export const CARGO_VIEW: ModuleView = {
  isEmpty: data => data.station.edited.length === 0 && (data.station.changes ?? []).length === 0,
  draw: CargoModule,
}
