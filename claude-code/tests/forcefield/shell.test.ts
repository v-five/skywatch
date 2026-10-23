import { describe, expect, test } from 'claude-code/testing'
import { commandWords, maskQuotes, SCRIPT_END, SCRIPT_START, segmentsOf, stripHeredocs, tokenize } from '../../src/forcefield'
import { COMMANDS, RUN_AS_CODE } from '../support/corpus'
import { GOLDEN } from '../support/golden'

/** A script a new shell runs, as maskQuotes writes it: between script markers. */
const script = (text: string) => `;${SCRIPT_START};${text};${SCRIPT_END};`

/** The corpus with its golden outputs, less the scripts a shell runs, whose fix changed them. */
function unchanged(golden: readonly string[]): [string, string][] {
  return COMMANDS.map((command, i): [string, string] => [command, golden[i] ?? '']).filter(([command]) => !RUN_AS_CODE.has(command))
}

describe('shell', () => {
  test('stripHeredocs matches the pre-refactor output', () => {
    expect(COMMANDS.map(stripHeredocs)).toEqual([...GOLDEN.stripHeredocs])
  })

  test('maskQuotes matches the pre-refactor output, except scripts a shell runs', () => {
    const cases = unchanged(GOLDEN.maskQuotes)
    expect(cases.map(([command]) => maskQuotes(command))).toEqual(cases.map(([, golden]) => golden))
  })

  test('segmentsOf splits at separators and drops empty parts', () => {
    expect(segmentsOf('a && b || c; d | e\n\nf')).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  test('tokenize honours quotes', () => {
    expect(tokenize(`rm -rf "a b" 'c d' e\\"f`)).toEqual(['rm', '-rf', 'a b', 'c d', 'e\\"f'])
  })

  test('commandWords drops brackets, assignments, sudo, prefixes and nice', () => {
    expect(commandWords('(sudo -u root FOO=1 nohup nice -n 5 rm -rf x)')).toEqual(['rm', '-rf', 'x'])
    expect(commandWords('nice -10 env A=1 time rm y')).toEqual(['env', 'A=1', 'time', 'rm', 'y'])
  })

  test('commandWords reads past eval and a shell handed a script', () => {
    expect(commandWords('eval rm -rf x')).toEqual(['rm', '-rf', 'x'])
    expect(commandWords('sudo bash -lc rm -rf x')).toEqual(['rm', '-rf', 'x'])
    expect(commandWords('/bin/sh -o pipefail -ec -- rm y')).toEqual(['rm', 'y'])
    expect(commandWords('bash <<< rm z')).toEqual(['rm', 'z'])
    expect(commandWords('bash -euo pipefail -c rm x')).toEqual(['rm', 'x'])
    expect(commandWords('bash -x script.sh -c rm y')).toEqual(['rm', 'y'])
    expect(commandWords('bash script.sh --clean')).toEqual(['bash', 'script.sh', '--clean'])
  })
})

describe('here-documents', () => {
  test('a body a shell reads is kept, between script markers', () => {
    expect(stripHeredocs('bash <<EOF\nrm -rf x\nEOF\nls')).toBe(`bash <<EOF\n${SCRIPT_START}\nrm -rf x\n${SCRIPT_END}\nls`)
    expect(stripHeredocs('cat <<-EOF | sudo sh\n\trm -rf x\n\tEOF')).toBe(
      `cat <<-EOF | sudo sh\n${SCRIPT_START}\n\trm -rf x\n${SCRIPT_END}`,
    )
  })

  test('a here-string and a quoted << open no here-document', () => {
    expect(stripHeredocs('cat <<<EOF\nrm -rf x\nEOF')).toBe('cat <<<EOF\nrm -rf x\nEOF')
    expect(stripHeredocs('echo "a <<EOF"\nrm -rf x\nEOF')).toBe('echo "a <<EOF"\nrm -rf x\nEOF')
    expect(stripHeredocs("echo '<<END' \\'<<EOF\nrm -rf x\nEOF")).toBe("echo '<<END' \\'<<EOF")
  })
})

describe('quotes', () => {
  test('a script a shell runs is unquoted between script markers, however the shell is reached', () => {
    expect(maskQuotes('bash -lc "a; rm -rf x"')).toBe(`bash -lc ${script('a; rm -rf x')}`)
    expect(maskQuotes("sudo env A=1 sh -ec 'a; rm -rf x'")).toBe(`sudo env A=1 sh -ec ${script('a; rm -rf x')}`)
    expect(maskQuotes('ls | xargs -n 1 sh -c \'a; rm -rf "$1"\' _')).toBe(`ls | xargs -n 1 sh -c ${script('a; rm -rf "$1"')} _`)
    expect(maskQuotes('bash -c "echo \'a;b\'; rm x"')).toBe(`bash -c ${script("echo ''; rm x")}`)
  })

  test('a double-quoted script is unescaped as bash does; a single-quoted one is taken as it is', () => {
    expect(maskQuotes(String.raw`bash -c "echo \\'; rm -rf x"`)).toBe(`bash -c ${script("echo \\'; rm -rf x")}`)
    expect(maskQuotes(String.raw`sh -c 'echo \"; rm x'`)).toBe(`sh -c ${script(String.raw`echo \"; rm x`)}`)
  })

  test("eval's script is unquoted in place", () => {
    expect(maskQuotes('eval "cd /tmp; rm x"')).toBe('eval ;cd /tmp; rm x;')
  })

  test('other quoted separators are emptied; an escaped quote opens nothing', () => {
    expect(maskQuotes('node -e "a; rm -rf build"')).toBe('node -e ""')
    expect(maskQuotes('echo \\"a; rm -rf x\\"')).toBe('echo \\"a; rm -rf x\\"')
    expect(maskQuotes('bash script.sh "a;b"')).toBe('bash script.sh ""')
  })
})
