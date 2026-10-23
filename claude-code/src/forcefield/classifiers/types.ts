import type { Dir, Risk } from '../risk'

/** One command of a shell line: its program (a leading `\` dropped), the words after it, and all its words. */
export type Segment = { readonly program: string; readonly args: readonly string[]; readonly words: readonly string[] }

export type Classifier = (segment: Segment, dir: Dir) => Risk | null

export function isFlag(word: string): boolean {
  return word.startsWith('-')
}
