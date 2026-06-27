/**
 * Save schema — the versioned localStorage envelope.
 *
 * One namespaced key holds everything: the dino's CharacterConfig and the
 * serialized Ink runtime state (which *is* "every choice that mattered").
 * Loads read `version` first and run forward migrations; any corruption or
 * unknown version fails soft → fresh start (a kids' game must never hard-crash
 * on a bad save). See SaveManager + migrations.
 */

import type { CharacterConfig } from '@/character/CharacterConfig'
import type { ChoiceRecord } from '@/story/events'

export const STORAGE_KEY = 'dino-dress-up:save'
export const CURRENT_VERSION = 1 as const

export interface StoryState {
  /** story.state.ToJson() — Ink's full serialized runtime state. */
  inkState: string | null
  currentSceneId: string | null
  choiceHistory: ChoiceRecord[]
}

export interface SaveMeta {
  /** Unix ms of last write; injected at save time (not by pure logic). */
  updatedAt: number
  /** Friend/sticker album persisted across playthroughs (Phase 5). */
  album: string[]
}

export interface SaveStateV1 {
  version: 1
  character: CharacterConfig
  story: StoryState
  meta: SaveMeta
}

/** The current save shape. Bump this alias when CURRENT_VERSION changes. */
export type CurrentSaveState = SaveStateV1

/**
 * Any historical save shape, discriminated by `version`. Migrations walk a
 * value of this union forward to CurrentSaveState.
 */
export type AnySaveState = SaveStateV1
