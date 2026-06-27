/**
 * UIRoot — the single entry point GameApp talks to for the HTML UI layer.
 *
 * It owns the DOM overlay inside `#ui-root` (which is pointer-events:none by
 * default; each panel opts its own interactive surface back in). UIRoot composes
 * the small, self-contained components — only one "main" panel (title / creator
 * / choices) is mounted at a time, while the HUD is an independent overlay that
 * can coexist with the choice dialog during the story.
 *
 * Vanilla TS + DOM only. Every component cleans up its own listeners/timers in
 * destroy(); UIRoot just orchestrates which ones are alive.
 */

import './styles/ui.css'

import type { AppState } from '@/app/AppState'
import type { AudioService } from '@/audio/AudioService'
import type { CharacterConfig } from '@/character/CharacterConfig'
import type { PictureChoice } from '@/story/events'

import { TitleScreen } from './components/TitleScreen'
import { CharacterCreator } from './components/CharacterCreator'
import { ChoiceDialog } from './components/ChoiceDialog'
import { HUD } from './components/HUD'

/** Anything UIRoot mounts and later tears down. */
interface Panel {
  destroy(): void
}

export interface UIRootDeps {
  state: AppState
  audio: AudioService
}

export class UIRoot {
  private readonly root: HTMLElement
  private readonly audio: AudioService

  /** The currently mounted main panel (title | creator | choices). */
  private current: Panel | null = null
  /** The HUD overlay, managed independently of the main panel. */
  private hud: HUD | null = null

  constructor(root: HTMLElement, deps: UIRootDeps) {
    this.root = root
    // `deps.state` is part of the contract; components that need to subscribe
    // receive what they require directly, so UIRoot itself only keeps `audio`.
    void deps.state
    this.audio = deps.audio
  }

  showTitle(opts: {
    hasSave: boolean
    onStart: () => void
    onReset: () => void
  }): void {
    this.clear()
    this.current = new TitleScreen(this.root, this.audio, opts)
  }

  showCreator(opts: {
    initial: CharacterConfig
    onChange: (draft: CharacterConfig) => void
    onConfirm: (final: CharacterConfig) => void
  }): void {
    this.clear()
    this.current = new CharacterCreator(this.root, this.audio, opts)
  }

  showChoices(
    choices: PictureChoice[],
    opts: { onChoose: (index: number) => void },
  ): void {
    this.clear()
    this.current = new ChoiceDialog(this.root, this.audio, choices, opts)
  }

  hideChoices(): void {
    if (this.current instanceof ChoiceDialog) this.clear()
  }

  showHud(opts: { onMenu?: () => void }): void {
    this.hideHud()
    this.hud = new HUD(this.root, this.audio, opts)
  }

  hideHud(): void {
    this.hud?.destroy()
    this.hud = null
  }

  /** Remove whatever main panel is currently shown (HUD is left alone). */
  clear(): void {
    this.current?.destroy()
    this.current = null
  }

  /** Tear down everything (called when GameApp shuts the UI down). */
  destroy(): void {
    this.clear()
    this.hideHud()
  }
}
