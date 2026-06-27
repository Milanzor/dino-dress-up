/**
 * Save migrations — a forward-only, sequential version walker.
 *
 * `migrate()` takes any historical save (discriminated by `version`) and walks
 * it forward one step at a time until it reaches CURRENT_VERSION. Each step
 * `N -> N+1` is registered in `STEPS`. A kids' game must never hard-crash on a
 * bad save, so anything unexpected returns null → SaveManager starts fresh.
 *
 * Today only v1 exists, so the walk is a validate-and-pass-through. When the
 * schema changes, bump CURRENT_VERSION, add a `SaveStateV2` to schema.ts, widen
 * AnySaveState, and register a `1` step here that maps v1 → v2.
 */

import {
  CURRENT_VERSION,
  type AnySaveState,
  type CurrentSaveState,
} from '@/save/schema'

/**
 * One migration step transforms a save at version N into a (still loosely
 * typed) save at version N+1. Keyed by the SOURCE version number.
 */
type MigrationStep = (raw: Record<string, unknown>) => Record<string, unknown>

const STEPS: Record<number, MigrationStep> = {
  // 1: (raw) => ({ ...raw, version: 2, /* new fields */ }),
}

/** Shape-check a value that claims to be a v1 save. */
function isValidV1(raw: Record<string, unknown>): boolean {
  return (
    raw.version === 1 &&
    typeof raw.character === 'object' &&
    raw.character !== null &&
    typeof raw.story === 'object' &&
    raw.story !== null &&
    typeof raw.meta === 'object' &&
    raw.meta !== null
  )
}

/**
 * Walk a save forward to CURRENT_VERSION. Returns the typed current save, or
 * null if the input is malformed or a needed migration step is missing.
 */
export function migrate(raw: AnySaveState): CurrentSaveState | null {
  const input = raw as unknown
  if (input === null || typeof input !== 'object') return null

  let current = input as Record<string, unknown>

  // Apply steps until we reach the current version (bounded by step count + 1
  // so a bad/cyclic registry can never spin forever).
  let guard = Object.keys(STEPS).length + 1
  while (current.version !== CURRENT_VERSION && guard-- > 0) {
    const version = current.version
    if (typeof version !== 'number') return null
    const step = STEPS[version]
    if (!step) return null // unknown / unsupported version → fresh start
    current = step(current)
  }

  if (current.version !== CURRENT_VERSION) return null
  if (!isValidV1(current)) return null

  return current as unknown as CurrentSaveState
}
