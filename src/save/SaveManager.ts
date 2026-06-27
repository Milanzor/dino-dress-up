/**
 * SaveManager — the localStorage persistence layer.
 *
 * One namespaced key (STORAGE_KEY) holds the whole versioned envelope. Every
 * localStorage access is wrapped in try/catch: private mode, exceeded quota, or
 * disabled storage must NEVER throw to callers — a pre-reader's game has no way
 * to recover from a crash. Bad/corrupt/unknown saves fail soft: the key is
 * cleared and load() returns null so the game starts fresh.
 */

import { DEFAULT_CHARACTER } from '@/character/CharacterConfig'
import {
  CURRENT_VERSION,
  STORAGE_KEY,
  type CurrentSaveState,
} from '@/save/schema'
import { migrate } from '@/save/migrations'

/** Build a brand-new save envelope (fresh dino, empty progress). */
export function createFreshSave(): CurrentSaveState {
  return {
    version: CURRENT_VERSION,
    character: structuredClone(DEFAULT_CHARACTER),
    story: {
      inkState: null,
      currentSceneId: null,
      choiceHistory: [],
    },
    meta: {
      updatedAt: Date.now(),
      album: [],
    },
  }
}

export class SaveManager {
  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  /** Access localStorage defensively; returns null if it is unavailable. */
  private storage(): Storage | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage : null
    } catch {
      return null
    }
  }

  /**
   * Read, parse and migrate the save. FAIL SOFT: any error, unknown version,
   * or invalid shape clears the key and returns null (→ fresh start).
   */
  load(): CurrentSaveState | null {
    const store = this.storage()
    if (!store) return null

    let raw: string | null
    try {
      raw = store.getItem(STORAGE_KEY)
    } catch {
      return null
    }
    if (raw === null) return null

    try {
      const parsed = JSON.parse(raw)
      const migrated = migrate(parsed)
      if (!migrated) {
        this.clear()
        return null
      }
      return migrated
    } catch {
      this.clear()
      return null
    }
  }

  /**
   * Stamp meta.updatedAt and write. Wrapped in try/catch (private mode / quota /
   * disabled storage); failures are swallowed so the game keeps running.
   */
  save(state: CurrentSaveState): void {
    const store = this.storage()
    if (!store) return

    const stamped: CurrentSaveState = {
      ...state,
      meta: { ...state.meta, updatedAt: Date.now() },
    }

    try {
      store.setItem(STORAGE_KEY, JSON.stringify(stamped))
    } catch {
      // private mode / quota exceeded / disabled — ignore.
    }
  }

  /** Coalesce rapid writes (autosave) onto a single trailing save. */
  saveDebounced(state: CurrentSaveState, ms = 600): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      this.save(state)
    }, ms)
  }

  /** Remove the save key (parent-gated "opnieuw beginnen"). */
  clear(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    const store = this.storage()
    if (!store) return
    try {
      store.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  /** Whether a usable (loadable) save currently exists. */
  has(): boolean {
    return this.load() !== null
  }
}
