import { describe, expect, test } from 'claude-code/testing'
import { heldTexts } from '../support/drive'
import { PROJECT_DIRECTIVES, shellAnswer, type WorldOptions, world } from '../support/world'

describe('holds', () => {
  test('git outside the session folder is held unmeasured', async ($, on) => {
    world(on, { run: shellAnswer })
    const { texts } = await heldTexts($, on, { tool: 'Bash', command: 'git -C /elsewhere reset --hard' })
    expect(texts).toContain('git reset --hard in /elsewhere')
    expect(texts).toContain('Not measured: that repository is outside the session folder.')
  })

  test('a directive that names the command holds an rm the temp-folder rule would pass', async ($, on) => {
    world(on, { run: shellAnswer, files: { [PROJECT_DIRECTIVES]: 'hold rm -rf /tmp/x\n' } })
    const { texts } = await heldTexts($, on, { tool: 'Bash', command: 'rm -rf /tmp/x' })
    expect(texts).toContain('run rm -rf /tmp/x, which a directive covers')
  })

  test('a secret beside a measured risk joins both in the summary', async ($, on) => {
    world(on, { run: shellAnswer })
    const { texts } = await heldTexts($, on, { tool: 'Bash', command: 'rm -rf build && cat .env' })
    expect(texts).toContain('delete 3 files (about 4.0 KB), and touch .env, which may hold secrets')
  })

  test('a folder a `cd -` moved to cannot be measured', async ($, on) => {
    world(on, { run: shellAnswer, files: { [PROJECT_DIRECTIVES]: 'hold @delete\n' } })
    const { texts } = await heldTexts($, on, { tool: 'Bash', command: 'cd - && rm -rf x' })
    expect(texts).toContain("Couldn't find the folder -, so it could not be measured.")
  })

  test('a delete in a script a shell runs is held', async ($, on) => {
    world(on, { run: shellAnswer, files: { [PROJECT_DIRECTIVES]: 'hold @delete\n' } })
    const { texts } = await heldTexts($, on, { tool: 'Bash', command: 'sudo bash -lc "make; rm -rf build"' })
    expect(texts).toContain('delete 3 files (about 4.0 KB)')
  })

  test('a shell script that moves to a temp folder leaves the delete after it held', async ($, on) => {
    world(on, { run: shellAnswer, files: { [PROJECT_DIRECTIVES]: 'hold @delete\n' } })
    const { texts } = await heldTexts($, on, { tool: 'Bash', command: 'bash -c "cd /tmp"; rm -rf build' })
    expect(texts).toContain('delete 3 files (about 4.0 KB)')
  })
})

/** Git answers by subcommand, after the `-c` settings the measures pass; other commands as `shellAnswer`. */
function gitAnswers(answers: Readonly<Record<string, string>>): WorldOptions['run'] {
  return argv => {
    const sub = argv.find((word, i) => i > 0 && word !== '-c' && argv[i - 1] !== '-c') ?? ''
    if (argv[0] === 'git') return { exitCode: 0, stdout: answers[sub] ?? '' }
    if (argv[0] === 'find') return { exitCode: 0, stdout: answers.find ?? '' }
    return shellAnswer(argv)
  }
}

describe('measures: git history', () => {
  test('reset --hard lists the staged and unstaged changes it drops', async ($, on) => {
    world(on, { run: gitAnswers({ 'diff-files': 'M\tsrc/a.ts\n', 'diff-index': 'A\tsrc/b.ts\n' }) })
    const { texts } = await heldTexts($, on, { tool: 'Bash', command: 'git reset --hard' })
    expect(texts).toEqual(expect.arrayContaining(['discard uncommitted changes in 2 files', 'M src/a.ts', 'A src/b.ts']))
    expect(texts).toContain("Uncommitted changes can't be recovered.")
  })

  test('stash drop names the stash it drops', async ($, on) => {
    world(on, { run: gitAnswers({ stash: 'stash@{0}: WIP on main: fix\nstash@{1}: WIP on dev\n' }) })
    const { texts } = await heldTexts($, on, { tool: 'Bash', command: 'git stash drop' })
    expect(texts).toEqual(expect.arrayContaining(['drop stash@{0}: WIP on main: fix', 'A dropped stash is hard to get back.']))
  })

  test('branch -D counts the commits only that branch has', async ($, on) => {
    world(on, { run: gitAnswers({ 'rev-list': '3\n' }) })
    const { texts } = await heldTexts($, on, { tool: 'Bash', command: 'git branch -D old' })
    expect(texts).toEqual(
      expect.arrayContaining(['delete old, losing 3 commits that are on no other branch', 'old: 3 commits on no other branch']),
    )
  })

  test('push --force lists the remote commits it drops', async ($, on) => {
    world(on, { run: gitAnswers({ 'rev-parse': 'abc\n', log: 'abc1 fix\nabc2 wip\n' }) })
    const { texts } = await heldTexts($, on, { tool: 'Bash', command: 'git push --force origin main' })
    expect(texts).toEqual(expect.arrayContaining(['force-push to origin/main: drops 2 commits', 'abc1 fix', 'abc2 wip']))
    expect(texts).toContain("Commits on origin/main that main doesn't have, as of the last fetch.")
  })
})

describe('measures: deletes', () => {
  const holdDeletes = { [PROJECT_DIRECTIVES]: 'hold @delete\n' }

  test('git clean lists what its dry run would remove', async ($, on) => {
    world(on, { files: holdDeletes, run: gitAnswers({ clean: 'Would remove build/\nWould remove tmp.txt\n' }) })
    const { texts } = await heldTexts($, on, { tool: 'Bash', command: 'git clean -fd' })
    expect(texts).toEqual(expect.arrayContaining(['remove 2 untracked paths', 'build/', 'tmp.txt']))
  })

  test('find -delete lists what the same find matches', async ($, on) => {
    world(on, { files: holdDeletes, run: gitAnswers({ find: './a.tmp\n./b.tmp\n' }) })
    const { texts } = await heldTexts($, on, { tool: 'Bash', command: 'find . -name "*.tmp" -delete' })
    expect(texts).toEqual(expect.arrayContaining(['delete 2 paths find matches', './a.tmp', 'From the same find without -delete.']))
  })
})
