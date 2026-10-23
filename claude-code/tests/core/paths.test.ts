import { describe, expect, test } from 'claude-code/testing'
import { NO_PLACES, relativePaths, shortPath } from '../../src/core'
import { describeInput } from '../../src/domain'

const PLACES = { cwd: '/home/captain/work/skywatch', home: '/home/captain' }

describe('paths', () => {
  test('paths under the session folder lose it, the folder itself reads as a dot, home reads as a tilde', () => {
    expect(relativePaths('mkdir -p /home/captain/work/skywatch/scripts/golden', PLACES)).toBe('mkdir -p scripts/golden')
    expect(relativePaths('cd /home/captain/work/skywatch && ls', PLACES)).toBe('cd . && ls')
    expect(relativePaths('cat /home/captain/.zshrc', PLACES)).toBe('cat ~/.zshrc')
    expect(relativePaths('ls /home/captain/work/skywatch-old', PLACES)).toBe('ls ~/work/skywatch-old')
    expect(relativePaths('ls /tmp/x', PLACES)).toBe('ls /tmp/x')
    expect(relativePaths('/a/b', NO_PLACES)).toBe('/a/b')
  })

  test('a file path reads relative where it can, else as its last two parts', () => {
    expect(shortPath('/home/captain/work/skywatch/claude-code/AGENTS.md', PLACES)).toBe('claude-code/AGENTS.md')
    expect(shortPath('/private/tmp/scratch/notes.md', PLACES)).toBe('scratch/notes.md')
  })

  test('a call reads its paths relative to the session folder', () => {
    expect(describeInput('Write', { file_path: '/home/captain/work/skywatch/docs/brief.md' }, PLACES)).toBe('Write → docs/brief.md')
    expect(describeInput('Bash', { command: 'rm -r /home/captain/work/skywatch/build' }, PLACES)).toBe('Bash → rm -r build')
  })
})
