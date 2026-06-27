/**
 * SceneManager — builds and tears down the active level scene.
 *
 * One persistent THREE.Scene; on load() we swap the lighting + the rich
 * procedural scenery (see Scenery.ts), set background/fog, toggle shadows for
 * the preset, and (re)place the dino at the descriptor's spawn. Glowing
 * interaction zones are layered on top.
 */

import * as THREE from 'three'
import type { SceneDescriptor } from '@/story/SceneDescriptor'
import type { Renderer } from './Renderer'
import { buildLighting, presetCastsShadows } from './Lighting'
import { buildScenery, type SceneryHandle } from './Scenery'
import type { DinoActor } from '@/character/DinoActor'

interface ActiveZone {
  id: string
  mesh: THREE.Mesh
  position: THREE.Vector3
  radius: number
}

export class SceneManager {
  readonly scene = new THREE.Scene()
  private scenery: SceneryHandle | null = null
  private lightingGroup: THREE.Group | null = null
  private zones: ActiveZone[] = []
  private dino: DinoActor | null = null
  private current: SceneDescriptor | null = null

  constructor(private renderer: Renderer) {}

  get descriptor(): SceneDescriptor | null {
    return this.current
  }

  load(desc: SceneDescriptor, dino: DinoActor): void {
    this.current = desc
    this.teardown()

    // Lighting + atmosphere.
    const light = buildLighting(desc.lighting)
    this.lightingGroup = light.group
    this.scene.add(light.group)
    this.scene.background = light.background
    this.scene.fog = light.fog
    this.renderer.setShadows(presetCastsShadows(desc.lighting))

    // Rich procedural scenery (sky, hills, vegetation, critters, biome props).
    this.scenery = buildScenery(desc.environment, desc.palette, desc.lighting)
    this.scene.add(this.scenery.group)

    // Glowing interaction zones.
    for (const z of desc.zones ?? []) {
      const mesh = makeZoneMesh(z.radius)
      mesh.position.set(...z.position)
      this.scene.add(mesh)
      this.zones.push({ id: z.id, mesh, position: new THREE.Vector3(...z.position), radius: z.radius })
    }

    // Place the dino.
    this.setDino(dino)
    if (this.dino) {
      this.dino.setPosition(...desc.spawn.position)
      this.dino.setHeading(desc.spawn.rotationY)
    }
  }

  setDino(dino: DinoActor): void {
    if (this.dino && this.dino !== dino) {
      this.scene.remove(this.dino.object3d)
    }
    this.dino = dino
    if (!this.scene.children.includes(dino.object3d)) this.scene.add(dino.object3d)
  }

  /** Which zone (if any) a world position currently sits inside. */
  zoneAt(pos: THREE.Vector3): string | null {
    for (const z of this.zones) {
      if (pos.distanceTo(z.position) <= z.radius) return z.id
    }
    return null
  }

  update(dt: number, elapsed: number): void {
    this.scenery?.update(dt, elapsed)
    // Gentle pulse on interaction zones.
    for (const z of this.zones) {
      const s = 1 + Math.sin(elapsed * 3) * 0.08
      z.mesh.scale.set(s, s, s)
      const mat = z.mesh.material as THREE.MeshBasicMaterial
      mat.opacity = 0.45 + Math.sin(elapsed * 3) * 0.15
    }
  }

  private teardown(): void {
    if (this.scenery) {
      this.scene.remove(this.scenery.group)
      this.scenery.dispose()
      this.scenery = null
    }
    if (this.lightingGroup) {
      this.scene.remove(this.lightingGroup)
      this.lightingGroup = null
    }
    for (const z of this.zones) {
      this.scene.remove(z.mesh)
      z.mesh.geometry.dispose()
      ;(z.mesh.material as THREE.Material).dispose()
    }
    this.zones = []
  }

  clear(): void {
    this.teardown()
    if (this.dino) {
      this.scene.remove(this.dino.object3d)
      this.dino = null
    }
  }
}

function makeZoneMesh(radius: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.7, radius, 28),
    new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0.05
  return mesh
}
