import { describe, expect, test } from 'claude-code/testing'
import { classify, classifyAll, type Risk } from '../../src/forcefield'
import { COMMANDS, RUN_AS_CODE } from '../support/corpus'
import { GOLDEN } from '../support/golden'

/** A risk as the pre-refactor classifier spelled it: `unmeasured` was `other`. */
const asBefore = (risk: Risk) => ({ ...risk, kind: risk.kind === 'unmeasured' ? 'other' : risk.kind })

const labels = (command: string) => classifyAll(command).map(risk => risk.label)

describe('classifyAll', () => {
  COMMANDS.forEach((command, i) => {
    if (RUN_AS_CODE.has(command)) return
    test(`matches the pre-refactor output: ${JSON.stringify(command)}`, () => {
      expect(classifyAll(command).map(asBefore)).toEqual(GOLDEN.classify[i])
    })
  })

  test('a script a shell runs is classified, however the shell is reached', () => {
    for (const command of RUN_AS_CODE) expect(classifyAll(command)).toMatchObject([{ label: 'rm -rf', targets: ['build'] }])
    expect(labels('bash -lc "cd /tmp; rm -rf x"')).toEqual(['rm -rf'])
    expect(classifyAll('bash -lc "cd /tmp; rm -rf x"')).toMatchObject([{ dir: '/tmp', targets: ['x'] }])
    expect(labels("sudo sh -c 'git push --force'")).toEqual(['git push --force'])
    expect(labels("env FOO=1 zsh -ec 'make; rm -rf out'")).toEqual(['rm -rf'])
    expect(labels('ls | xargs sh -c \'echo; rm -rf "$1"\' _')).toEqual(['rm -rf'])
    expect(labels('bash <<< "rm -rf x"')).toEqual(['rm -rf'])
  })

  test("a shell script's cd ends with it; eval's carries on", () => {
    const dirs = (command: string) => classifyAll(command).map(risk => risk.dir)
    expect(dirs('bash -c "cd /tmp"; rm -rf x')).toEqual([null])
    expect(dirs('bash <<EOF\ncd /tmp\nEOF\nrm -rf x')).toEqual([null])
    expect(dirs('eval "cd /tmp"; rm -rf x')).toEqual(['/tmp'])
  })

  test('flag sets with values, escapes and stray brackets do not hide a script or move the line', () => {
    expect(labels('bash -euo pipefail -c "a; rm -rf x"')).toEqual(['rm -rf'])
    expect(labels("sh -eo pipefail -c 'a; git push --force'")).toEqual(['git push --force'])
    expect(labels(String.raw`bash -c "echo \\'; rm -rf x"`)).toEqual(['rm -rf'])
    expect(classifyAll('bash -c ") ; cd /tmp"; rm -rf x')).toMatchObject([{ dir: null, targets: ['x'] }])
    expect(classifyAll('bash -c "\u0002; cd /tmp"; rm -rf x')).toMatchObject([{ dir: null, targets: ['x'] }])
  })

  test('a here-document body a shell reads is classified; a here-string opens none', () => {
    expect(labels('bash <<EOF\nrm -rf x\nEOF')).toEqual(['rm -rf'])
    expect(labels("cat <<'EOF' | sh\ngit reset --hard\nEOF")).toEqual(['git reset --hard'])
    expect(labels('cat <<<EOF\nrm -rf x\nEOF')).toEqual(['rm -rf'])
    expect(labels('echo "<<EOF"\nrm -rf x\nEOF')).toEqual(['rm -rf'])
    expect(labels('cat <<EOF > notes\nrm -rf x\nEOF')).toEqual([])
  })

  test('a folder set by cd carries past an earlier risk on the line', () => {
    expect(classifyAll('cd /tmp && rm -rf a && rm -rf b').map(risk => risk.dir)).toEqual(['/tmp', '/tmp'])
  })

  test('a lone &, |&, and the options of time and env do not hide a command', () => {
    const labels = (command: string) => classifyAll(command).map(risk => risk.label)
    expect(labels('sleep 1 & rm -rf build')).toEqual(['rm -rf'])
    expect(labels('true & git push --force')).toEqual(['git push --force'])
    expect(labels('echo ok |& rm -rf x')).toEqual(['rm -rf'])
    expect(labels('time -p rm -rf z')).toEqual(['rm -rf'])
    expect(labels('env -i -u HOME rm -rf q')).toEqual(['rm -rf'])
    expect(classifyAll('rm -rf build &')).toMatchObject([{ targets: ['build'] }])
    expect(classifyAll('make 2>&1 && ls &>log')).toEqual([])
  })

  test('built-in object names are not programs', () => {
    for (const command of ['__proto__', 'toString', 'constructor x', 'valueOf', 'hasOwnProperty rm -rf x'])
      expect(classifyAll(command)).toEqual([])
  })

  test('classify gives the first risk, or null', () => {
    expect(classify('ls && git reset --hard && rm -rf x')?.kind).toBe('git-reset')
    expect(classify('ls -la')).toBeNull()
  })
})
