import { describe, expect, test } from 'claude-code/testing'
import { allUnder, classifyAll, cleanArgs, diffRows, headlineOf, pushTarget, readRmOutput } from '../../src/forcefield'

describe('measure readers', () => {
  test('readRmOutput reads counts, then names without ./', () => {
    expect(readRmOutput('3 4096 2\n./a.txt\nb/c.txt\n')).toEqual({ files: 3, bytes: 4096, found: 2, names: ['a.txt', 'b/c.txt'] })
    expect(readRmOutput('')).toEqual({ files: 0, bytes: 0, found: 0, names: [] })
  })

  test('cleanArgs keeps excludes and paths, drops what would change the dry run', () => {
    expect(cleanArgs(['-fdx', '-e', '*.log', '--exclude=tmp', '-q', 'src', '--', 'a', '-b'])).toEqual({
      flags: ['-dx', '-e', '*.log', '--exclude=tmp'],
      paths: ['src', 'a', '-b'],
    })
  })

  test('diffRows reads name-status rows', () => {
    expect(diffRows('M\tsrc/a.ts\nD\tb.ts\n')).toEqual(['M src/a.ts', 'D b.ts'])
  })

  test('pushTarget reads remote, source and branch', () => {
    expect(pushTarget(['--force'])).toEqual({ remote: 'origin', source: '', branch: '' })
    expect(pushTarget(['-f', 'up', '+feat:refs/heads/main'])).toEqual({ remote: 'up', source: 'feat', branch: 'main' })
    expect(pushTarget(['origin', 'dev'])).toEqual({ remote: 'origin', source: 'dev', branch: 'dev' })
  })

  test('allUnder: strictly inside a root, never a root itself', () => {
    expect(allUnder(['/tmp', '/'], ['/tmp/a', '/tmp/b/c'])).toBe(true)
    expect(allUnder(['/tmp'], ['/tmp'])).toBe(false)
    expect(allUnder(['/tmp'], ['/tmpx/a'])).toBe(false)
    expect(allUnder(['/tmp'], [])).toBe(false)
  })

  test('headlineOf names the first risk and counts the rest', () => {
    expect(headlineOf(classifyAll('rm -rf build dist && git branch -D old'))).toBe('rm -rf build dist (+1 more)')
    expect(headlineOf(classifyAll('git branch -D a b'))).toBe('git branch -D a b')
    expect(headlineOf([])).toBe('')
  })
})
