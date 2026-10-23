const MASK = '•••'

const SECRET_PATTERNS: readonly (readonly [RegExp, string])[] = [
  [/(authorization\s*[:=]\s*)(bearer\s+|basic\s+)?\S+/gi, `$1$2${MASK}`],
  [/\b(bearer)\s+[A-Za-z0-9._~+/-]{8,}=*/gi, `$1 ${MASK}`],
  [/\b(sk|pk|rk|ghp|gho|ghs|github_pat|xox[abprs])[-_][A-Za-z0-9_-]{8,}/g, MASK],
  [/((?:api[_-]?key|access[_-]?token|token|secret|password|passwd|pwd)\s*[=:]\s*)("[^"]*"|'[^']*'|\S+)/gi, `$1${MASK}`],
  [/(--(?:token|password|api-key|secret)[= ])\S+/gi, `$1${MASK}`],
  [/(\b[A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)=)\S+/g, `$1${MASK}`],
  [/(\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:)[^\s@]+@/gi, `$1${MASK}@`],
]

/** Credentials masked, before anything is written to state. */
export function redact(text: string): string {
  return SECRET_PATTERNS.reduce((out, [pattern, mask]) => out.replace(pattern, mask), text)
}
