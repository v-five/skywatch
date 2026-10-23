export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** For each field whose default is null, what else a stored value may be. */
export type NullableFields<T> = { readonly [K in keyof T]?: (value: unknown) => boolean }

/** A stored field fits when it has its default's type: a list for a list; for a null default, null or what its guard allows. */
function fitsDefault(fallback: unknown, value: unknown, guard: ((value: unknown) => boolean) | undefined): boolean {
  if (value === undefined) return false
  if (fallback === null) return value === null || (guard?.(value) ?? true)
  if (Array.isArray(fallback)) return Array.isArray(value)
  return value !== null && typeof value === typeof fallback
}

/** A stored object read over its defaults: a missing or wrongly typed field takes the default. */
export function mergeDefaults<T extends object>(defaults: T, stored: unknown, nullable: NullableFields<T> = {}): T {
  if (!isRecord(stored)) return defaults
  const guards: Readonly<Record<string, ((value: unknown) => boolean) | undefined>> = nullable
  const merged: Record<string, unknown> = { ...stored }
  for (const [key, fallback] of Object.entries(defaults)) if (!fitsDefault(fallback, stored[key], guards[key])) merged[key] = fallback
  return merged as T
}

/** A stored list, or none: its items are still unread, for a guard to narrow. */
export function listOf(stored: unknown): unknown[] {
  return Array.isArray(stored) ? stored : []
}

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return (values as readonly unknown[]).includes(value)
}

export function stringOf(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
