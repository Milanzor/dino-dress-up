/**
 * GameApp — the one and only wiring point.
 *
 * Owns every system and runs the story loop (the heartbeat from the plan):
 * pull a StoryEngine step → load scene / narrate / show picture-choices → on a
 * confirmed tap, advance and autosave. Between scripted beats the child free-
 * roams the dino (arrows/touch); choice dialogs are modal and pause movement.
 * No system imports another's internals — only the typed contracts.
 */

import * as THREE from 'three'

import { AppState } from './AppState'
import { assertTransition } from './flow'
import { Renderer } from '@/engine/Renderer'
import { Loader } from '@/engine/Loader'
import { CameraRig } from '@/engine/CameraRig'
import { SceneManager } from '@/engine/SceneManager'
import { DinoFactory } from '@/character/DinoFactory'
import type { DinoActor } from '@/character/DinoActor'
import type { CharacterConfig } from '@/character/CharacterConfig'
import { AudioService } from '@/audio/AudioService'
import { InputController } from '@/input/InputController'
import { UIRoot } from '@/ui/UIRoot'
import { StoryEngine } from '@/story/StoryEngine'
import { SaveManager } from '@/save/SaveManager'
import { CURRENT_VERSION, type CurrentSaveState } from '@/save/schema'
import { getScene } from '@/levels/scenes'
import type { PictureChoice, Beat } from '@/story/events'

const MAX_SPEED = 3.6 // world units / second
const TURN_DAMP = 9 // heading smoothing

export class GameApp {
  private readonly state = new AppState()
  private readonly renderer: Renderer
  private readonly loader: Loader
  private readonly camera: CameraRig
  private readonly scenes: SceneManager
  private readonly factory: DinoFactory
  private readonly audio = new AudioService()
  private readonly input: InputController
  private readonly ui: UIRoot
  private readonly story = new StoryEngine()
  private readonly save = new SaveManager()

  private dino: DinoActor | null = null
  private draft: CharacterConfig | null = null
  private readonly touchLayer: HTMLElement

  private roamLocked = true
  private advancing = false
  private rebuilding = false
  private currentSceneId: string | null = null
  private currentBounds = { x: 10, z: 10 }
  private activeChoices: PictureChoice[] | null = null

  private readonly up = new THREE.Vector3(0, 1, 0)
  private readonly tmpFwd = new THREE.Vector3()
  private readonly tmpRight = new THREE.Vector3()
  private readonly tmpDir = new THREE.Vector3()

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.renderer = new Renderer(canvas)
    this.loader = new Loader(this.renderer.renderer)
    this.camera = new CameraRig(window.innerWidth / window.innerHeight)
    this.scenes = new SceneManager(this.renderer)
    this.factory = new DinoFactory(this.loader)

    // Input injects its touch controls into a dedicated layer inside #ui-root.
    const touchLayer = document.createElement('div')
    touchLayer.id = 'touch-layer'
    touchLayer.style.cssText =
      'position:fixed;inset:0;pointer-events:none;z-index:5;display:none;'
    uiRoot.appendChild(touchLayer)
    this.touchLayer = touchLayer
    this.input = new InputController(touchLayer)

    this.ui = new UIRoot(uiRoot, { state: this.state, audio: this.audio })

    this.renderer.setActive(this.scenes.scene, this.camera.camera)
    this.renderer.onFrame(this.onFrame)
  }

  /** Bootstrap: build a title backdrop, then show the title. */
  async start(): Promise<void> {
    this.input.start()
    this.renderer.start()

    // A gently turn-tabling dino behind the title for charm.
    this.dino = await this.factory.build(this.state.get().character)
    this.loadScene('nest')
    this.camera.setMode('showcase')
    this.camera.snap()

    this.goTitle()
  }

  // ── Flow: Title ────────────────────────────────────────────────────────────
  private goTitle(): void {
    this.state.setFlow(assertTransition(this.state.get().flow, 'title'))
    this.setRoamLocked(true)
    this.camera.setMode('showcase')
    this.ui.showTitle({
      hasSave: this.save.has(),
      onStart: () => void this.onStart(),
      onReset: () => this.onReset(),
    })
  }

  private async onStart(): Promise<void> {
    await this.audio.unlock()
    this.state.set({ audioUnlocked: true })

    const saved = this.save.load()
    if (saved && saved.story.inkState) {
      this.ui.clear()
      await this.continueFrom(saved)
    } else {
      this.ui.clear()
      await this.enterCreator()
    }
  }

  private onReset(): void {
    // The UI already ran a parent-gate (long-press) before calling this.
    this.save.clear()
    this.story.reset()
    this.state.reset()
    this.audio.sfx('sfx_pop')
    this.goTitle()
  }

  // ── Flow: Creator ───────────────────────────────────────────────────────────
  private async enterCreator(): Promise<void> {
    this.state.setFlow(assertTransition(this.state.get().flow, 'creator'))
    this.draft = structuredClone(this.state.get().character)

    await this.swapDino(this.draft)
    this.loadScene('nest')
    this.camera.setMode('showcase')
    this.camera.snap()
    this.setRoamLocked(true)

    this.ui.showCreator({
      initial: this.draft,
      onChange: (d) => void this.onCreatorChange(d),
      onConfirm: (d) => this.onCreatorConfirm(d),
    })
  }

  private async onCreatorChange(draft: CharacterConfig): Promise<void> {
    this.draft = draft
    if (!this.dino || this.rebuilding) return
    // Cheap edits (color/belly/pattern/accessories) apply in place; a species
    // change returns false and needs a fresh build.
    if (!this.factory.apply(this.dino, draft)) {
      await this.swapDino(draft)
    }
  }

  private onCreatorConfirm(draft: CharacterConfig): void {
    this.state.setCharacter(draft)
    this.audio.sfx('sfx_confirm')
    this.ui.clear()
    void this.startNewStory()
  }

  // ── Flow: Story ─────────────────────────────────────────────────────────────
  private async startNewStory(): Promise<void> {
    this.story.reset()
    this.state.set({
      progress: { currentSceneId: null, choiceHistory: [], endingId: null },
    })
    await this.beginStoryHud()
    await this.advance()
  }

  private async continueFrom(saved: CurrentSaveState): Promise<void> {
    this.state.hydrate(saved.character, {
      currentSceneId: saved.story.currentSceneId,
      choiceHistory: saved.story.choiceHistory,
      endingId: null,
    })
    await this.swapDino(saved.character)
    const ok = this.story.loadState(saved.story.inkState!)
    if (!ok) {
      // Corrupt ink state → fail soft into a fresh story with the saved dino.
      await this.startNewStory()
      return
    }
    this.loadScene(saved.story.currentSceneId ?? 'nest')
    await this.beginStoryHud()

    const pending = this.story.currentChoices()
    if (pending.length) this.presentChoices(pending)
    else await this.advance()
  }

  private async beginStoryHud(): Promise<void> {
    this.state.setFlow(assertTransition(this.state.get().flow, 'story'))
    this.camera.setMode('follow')
    this.camera.snap()
    this.ui.showHud({ onMenu: () => this.onReset() })
    this.setRoamLocked(false)
  }

  /** Pull beats until a choice point or the ending. Re-entrant-safe. */
  private async advance(): Promise<void> {
    if (this.advancing) return
    this.advancing = true
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const step = this.story.next()
        if (step.kind === 'beat') {
          await this.applyBeat(step.beat)
          continue
        }
        if (step.kind === 'choices') {
          this.presentChoices(step.choices)
          return
        }
        await this.finishStory(step.endingId)
        return
      }
    } finally {
      this.advancing = false
    }
  }

  private async applyBeat(beat: Beat): Promise<void> {
    if (beat.sceneId && beat.sceneId !== this.currentSceneId) {
      this.loadScene(beat.sceneId)
    }
    if (beat.ambient) this.audio.ambient(beat.ambient)
    this.setRoamLocked(false)
    if (beat.narrateClip) {
      // Narration auto-advances; the child can roam while it plays, and an
      // interact press skips it (handled in onFrame via stopNarration).
      await this.audio.narrate(beat.narrateClip)
    }
    this.persist()
  }

  private presentChoices(choices: PictureChoice[]): void {
    this.activeChoices = choices
    this.setRoamLocked(true)
    this.dino?.setSpeed01(0)
    this.ui.showChoices(choices, { onChoose: (index) => this.onChoose(index) })
  }

  private onChoose(index: number): void {
    const chosen = this.activeChoices?.find((c) => c.index === index)
    this.ui.hideChoices()
    this.activeChoices = null
    this.story.choose(index)
    this.state.recordChoice({
      sceneId: this.currentSceneId ?? 'unknown',
      iconId: chosen?.iconId ?? '?',
      index,
    })
    this.persist()
    this.setRoamLocked(false)
    void this.advance()
  }

  private async finishStory(endingId: string): Promise<void> {
    this.state.setEnding(endingId)
    this.dino?.playHappy()
    this.audio.sfx('sfx_sparkle')
    this.persist()
    // Stay in the festival; the parent-gated HUD menu offers "opnieuw beginnen".
    this.setRoamLocked(false)
  }

  // ── Scene + dino plumbing ────────────────────────────────────────────────────
  private loadScene(sceneId: string): void {
    if (!this.dino) return
    const desc = getScene(sceneId)
    this.scenes.load(desc, this.dino)
    this.currentSceneId = desc.id
    this.currentBounds = desc.bounds
    this.state.setScene(desc.id)
    this.camera.setTarget(this.dino.object3d)
    this.camera.snap()
    this.audio.ambient(desc.ambient ?? null)
  }

  /** Build a new dino for a config and swap it into the scene (disposes old). */
  private async swapDino(config: CharacterConfig): Promise<void> {
    this.rebuilding = true
    try {
      const next = await this.factory.build(config)
      const old = this.dino
      this.dino = next
      this.scenes.setDino(next)
      this.camera.setTarget(next.object3d)
      if (old) old.dispose()
    } finally {
      this.rebuilding = false
    }
  }

  /** Lock/unlock free-roam; touch controls only show while roaming. */
  private setRoamLocked(locked: boolean): void {
    this.roamLocked = locked
    this.touchLayer.style.display = locked ? 'none' : 'block'
  }

  private persist(): void {
    const s = this.state.get()
    const payload: CurrentSaveState = {
      version: CURRENT_VERSION,
      character: s.character,
      story: {
        inkState: this.story.saveState(),
        currentSceneId: this.currentSceneId,
        choiceHistory: s.progress.choiceHistory,
      },
      meta: { updatedAt: 0, album: [] }, // SaveManager stamps updatedAt
    }
    this.save.saveDebounced(payload)
  }

  // ── Per-frame update ─────────────────────────────────────────────────────────
  private onFrame = (dt: number, elapsed: number): void => {
    // Interact press skips narration (gentle "next" for impatient kids).
    if (this.input.consumeInteract() && this.audio.isUnlocked()) {
      this.audio.stopNarration()
    }

    if (!this.roamLocked && this.dino) this.driveDino(dt)
    else this.dino?.setSpeed01(0)

    this.camera.update(dt)
    this.scenes.update(dt, elapsed)
    this.dino?.update(dt, elapsed)
  }

  /** Camera-relative locomotion with smooth turning and soft bounds. */
  private driveDino(dt: number): void {
    const dino = this.dino!
    const move = this.input.getMove()
    const mag = Math.min(Math.hypot(move.x, move.y), 1)

    if (mag > 0.04) {
      // Ground-projected camera basis.
      this.camera.camera.getWorldDirection(this.tmpFwd)
      this.tmpFwd.y = 0
      this.tmpFwd.normalize()
      this.tmpRight.crossVectors(this.tmpFwd, this.up).normalize()

      this.tmpDir
        .set(0, 0, 0)
        .addScaledVector(this.tmpRight, move.x)
        .addScaledVector(this.tmpFwd, move.y)
      this.tmpDir.y = 0

      if (this.tmpDir.lengthSq() > 1e-5) {
        this.tmpDir.normalize()
        dino.position.addScaledVector(this.tmpDir, mag * MAX_SPEED * dt)

        // Smoothly face the movement direction.
        const targetHeading = Math.atan2(this.tmpDir.x, this.tmpDir.z)
        const cur = dino.object3d.rotation.y
        dino.setHeading(cur + shortestAngle(cur, targetHeading) * Math.min(1, TURN_DAMP * dt))
      }
      dino.setSpeed01(mag)
    } else {
      dino.setSpeed01(0)
    }

    // Soft bounds: keep the dino on the playable disc.
    const b = this.currentBounds
    const p = dino.position
    p.x = THREE.MathUtils.clamp(p.x, -b.x, b.x)
    p.z = THREE.MathUtils.clamp(p.z, -b.z, b.z)
    p.y = 0
  }

  dispose(): void {
    this.renderer.dispose()
    this.input.dispose()
    this.dino?.dispose()
  }
}

/** Signed smallest angular delta from `a` to `b` (radians, -π..π). */
function shortestAngle(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}
