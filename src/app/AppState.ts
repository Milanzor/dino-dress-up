/**
 * AppState — the single source of truth, a tiny hand-rolled observable store.
 *
 * No framework, no Zustand dependency: a frozen state object plus a listener
 * set. UI panels subscribe to re-render; the story loop and flow machine read
 * and mutate through `set`. Keep this dumb — business logic lives in systems,
 * not here.
 */

import {
  DEFAULT_CHARACTER,
  type CharacterConfig,
} from '@/character/CharacterConfig'
import type { ChoiceRecord } from '@/story/events'

/** Top-level app flow phase (Title → Creator → Story). */
export type FlowPhase = 'boot' | 'title' | 'creator' | 'story' | 'ending'

export interface AppStateData {
  flow: FlowPhase
  /** Has the user tapped once to unlock audio (iOS/tablet autoplay gate)? */
  audioUnlocked: boolean
  /** The committed dino. The creator edits a draft and commits on confirm. */
  character: CharacterConfig
  progress: {
    currentSceneId: string | null
    choiceHistory: ChoiceRecord[]
    /** Set when the story reaches an ending variant. */
    endingId: string | null
  }
}

export type Listener = (state: Readonly<AppStateData>) => void

function initialState(): AppStateData {
  return {
    flow: 'boot',
    audioUnlocked: false,
    character: structuredClone(DEFAULT_CHARACTER),
    progress: { currentSceneId: null, choiceHistory: [], endingId: null },
  }
}

export class AppState {
  private state: AppStateData = initialState()
  private listeners = new Set<Listener>()

  get(): Readonly<AppStateData> {
    return this.state
  }

  /** Shallow-merge a patch and notify subscribers. */
  set(patch: Partial<AppStateData>): void {
    this.state = { ...this.state, ...patch }
    this.emit()
  }

  /** Replace the committed character (used when the creator confirms). */
  setCharacter(character: CharacterConfig): void {
    this.set({ character: structuredClone(character) })
  }

  setFlow(flow: FlowPhase): void {
    this.set({ flow })
  }

  /** Append a choice to history (immutably) and notify. */
  recordChoice(record: ChoiceRecord): void {
    this.set({
      progress: {
        ...this.state.progress,
        choiceHistory: [...this.state.progress.choiceHistory, record],
      },
    })
  }

  setScene(sceneId: string): void {
    this.set({
      progress: { ...this.state.progress, currentSceneId: sceneId },
    })
  }

  setEnding(endingId: string): void {
    this.set({
      flow: 'ending',
      progress: { ...this.state.progress, endingId },
    })
  }

  /** Reset to a fresh game (parent-gated "opnieuw beginnen"). */
  reset(): void {
    this.state = initialState()
    this.emit()
  }

  /** Rehydrate from a loaded save (does not emit a flow change by itself). */
  hydrate(character: CharacterConfig, progress: AppStateData['progress']): void {
    this.set({ character: structuredClone(character), progress })
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(): void {
    for (const l of this.listeners) l(this.state)
  }
}
