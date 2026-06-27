/**
 * DinoActor — a live dino in the world: its root Object3D plus locomotion and
 * animation. GameApp moves/rotates the root; DinoActor animates the body.
 *
 * Two animation paths share one API:
 *  - glTF assets: crossfade baked clips through an AnimationMixer (RIGS.clips).
 *  - v1 placeholder: procedural bobbing/leg-swing driven by `animNodes`.
 * Missing 'happy' falls back to 'idle' (per the plan's risk note).
 */

import * as THREE from 'three'
import type { SocketMap } from './AccessoryMounter'
import type { Species } from './CharacterConfig'

export type Locomotion = 'idle' | 'walk' | 'happy'

export interface DinoAnimNodes {
  body?: THREE.Object3D
  head?: THREE.Object3D
  tail?: THREE.Object3D
  legL?: THREE.Object3D
  legR?: THREE.Object3D
  armL?: THREE.Object3D
  armR?: THREE.Object3D
}

export interface DinoParts {
  root: THREE.Object3D
  species: Species
  bodyMaterials: THREE.MeshToonMaterial[]
  bellyMaterials: THREE.MeshToonMaterial[]
  sockets: SocketMap
  height: number
  /** glTF path: */
  mixer?: THREE.AnimationMixer
  actions?: Partial<Record<Locomotion, THREE.AnimationAction>>
  /** Placeholder path: */
  animNodes?: DinoAnimNodes
}

export class DinoActor {
  readonly parts: DinoParts
  private state: Locomotion = 'idle'
  private current?: THREE.AnimationAction
  private walkPhase = 0
  private speed01 = 0 // 0..1 movement intensity, smoothed
  private happyTimer = 0

  constructor(parts: DinoParts) {
    this.parts = parts
    if (this.parts.mixer) this.crossfadeTo('idle')
  }

  get object3d(): THREE.Object3D {
    return this.parts.root
  }

  get position(): THREE.Vector3 {
    return this.parts.root.position
  }

  setPosition(x: number, y: number, z: number): void {
    this.parts.root.position.set(x, y, z)
  }

  /** Face a heading in the XZ plane (radians); smooth turning is GameApp's job. */
  setHeading(rad: number): void {
    this.parts.root.rotation.y = rad
  }

  /** Drive walk-cycle intensity from current move speed (0..1). */
  setSpeed01(v: number): void {
    this.speed01 = THREE.MathUtils.clamp(v, 0, 1)
    if (this.state !== 'happy') {
      this.setLocomotion(this.speed01 > 0.05 ? 'walk' : 'idle')
    }
  }

  setLocomotion(state: Locomotion): void {
    if (this.state === state) return
    this.state = state
    if (this.parts.mixer) this.crossfadeTo(state)
  }

  /** One-shot happy bounce, then return to idle/walk. */
  playHappy(): void {
    this.happyTimer = 1.0
    this.state = 'happy'
    if (this.parts.mixer) this.crossfadeTo('happy')
  }

  private crossfadeTo(state: Locomotion): void {
    const actions = this.parts.actions
    if (!actions) return
    const next = actions[state] ?? actions.idle
    if (!next || next === this.current) return
    next.reset().fadeIn(0.25).play()
    if (this.current) this.current.fadeOut(0.25)
    this.current = next
  }

  update(dt: number, elapsed: number): void {
    if (this.happyTimer > 0) {
      this.happyTimer -= dt
      if (this.happyTimer <= 0) {
        this.state = this.speed01 > 0.05 ? 'walk' : 'idle'
        if (this.parts.mixer) this.crossfadeTo(this.state)
      }
    }

    if (this.parts.mixer) {
      this.parts.mixer.update(dt)
      return
    }
    this.animateProcedural(dt, elapsed)
  }

  // ── Procedural placeholder animation ──────────────────────────────────────
  private animateProcedural(dt: number, elapsed: number): void {
    const n = this.parts.animNodes
    if (!n) return

    const walking = this.state === 'walk'
    const happy = this.state === 'happy'
    this.walkPhase += dt * (4 + this.speed01 * 6) * (walking ? 1 : 0)

    // Body bob: breathing at idle, bouncing while walking, big hop when happy.
    const breath = Math.sin(elapsed * 2) * 0.01
    const stride = Math.abs(Math.sin(this.walkPhase)) * 0.06 * this.speed01
    const hop = happy ? Math.abs(Math.sin(this.happyTimer * Math.PI * 3)) * 0.25 : 0
    if (n.body) n.body.position.y = breath + stride + hop

    // Legs alternate while walking.
    const swing = Math.sin(this.walkPhase) * 0.6 * (walking ? 1 : 0)
    if (n.legL) n.legL.rotation.x = swing
    if (n.legR) n.legR.rotation.x = -swing
    if (n.armL) n.armL.rotation.x = -swing * 0.5
    if (n.armR) n.armR.rotation.x = swing * 0.5

    // Head/tail life: gentle sway, excited nod when happy.
    if (n.head) n.head.rotation.z = Math.sin(elapsed * 1.7) * 0.05 + (happy ? Math.sin(elapsed * 12) * 0.15 : 0)
    if (n.tail) n.tail.rotation.y = Math.sin(this.walkPhase + 0.5) * 0.25 + Math.sin(elapsed * 2) * 0.08
  }

  dispose(): void {
    this.parts.root.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const mat = (mesh as THREE.Mesh).material
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else if (mat) (mat as THREE.Material).dispose()
    })
  }
}
