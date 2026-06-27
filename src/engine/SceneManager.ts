/**
 * SceneManager — builds and tears down the active level scene.
 *
 * One persistent THREE.Scene; on load() we swap the environment + lighting
 * groups, set background/fog, toggle shadows for the preset, and (re)place the
 * dino at the descriptor's spawn. Environments are cheap procedural props so
 * the whole game runs with zero downloaded art (Phase 6 swaps in real models).
 */

import * as THREE from 'three'
import type { SceneDescriptor, EnvironmentKind } from '@/story/SceneDescriptor'
import type { Renderer } from './Renderer'
import { buildLighting, presetCastsShadows } from './Lighting'
import { makeToonMaterial } from '@/character/Recolor'
import type { DinoActor } from '@/character/DinoActor'

interface ActiveZone {
  id: string
  mesh: THREE.Mesh
  position: THREE.Vector3
  radius: number
}

export class SceneManager {
  readonly scene = new THREE.Scene()
  private envGroup: THREE.Group | null = null
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

    // Environment props + ground.
    this.envGroup = buildEnvironment(desc.environment, desc.palette)
    this.scene.add(this.envGroup)

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

  update(_dt: number, elapsed: number): void {
    // Gentle pulse on interaction zones.
    for (const z of this.zones) {
      const s = 1 + Math.sin(elapsed * 3) * 0.08
      z.mesh.scale.set(s, s, s)
      const mat = z.mesh.material as THREE.MeshBasicMaterial
      mat.opacity = 0.45 + Math.sin(elapsed * 3) * 0.15
    }
  }

  private teardown(): void {
    if (this.envGroup) {
      disposeGroup(this.envGroup)
      this.scene.remove(this.envGroup)
      this.envGroup = null
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

// ── Environment builders ────────────────────────────────────────────────────

function buildEnvironment(
  kind: EnvironmentKind,
  palette?: SceneDescriptor['palette'],
): THREE.Group {
  const group = new THREE.Group()
  group.name = `env:${kind}`

  const groundColor = palette?.ground ?? defaultGround(kind)
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(28, 48),
    makeToonMaterial(groundColor),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  group.add(ground)

  const accent = palette?.accent ?? '#ffffff'
  // Deterministic scatter (no RNG dependency for reproducibility).
  const scatter = (n: number, radius: number, make: (i: number, x: number, z: number) => THREE.Object3D) => {
    for (let i = 0; i < n; i++) {
      const a = i * 2.399963 // golden angle
      const r = radius * Math.sqrt((i + 0.5) / n)
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      group.add(make(i, x, z))
    }
  }

  switch (kind) {
    case 'nest': {
      scatter(7, 18, (_i, x, z) => rock(x, z, accent))
      group.add(nestRing(0, -2))
      break
    }
    case 'meadow': {
      scatter(48, 22, (i, x, z) => flower(x, z, i))
      scatter(10, 20, (_i, x, z) => bush(x, z))
      break
    }
    case 'river': {
      const water = new THREE.Mesh(new THREE.PlaneGeometry(60, 7), makeToonMaterial('#5fb8ff'))
      water.rotation.x = -Math.PI / 2
      water.position.set(0, 0.02, -6)
      group.add(water)
      for (let i = -2; i <= 2; i++) group.add(rock(i * 1.6, -6 + (i % 2) * 0.6, '#9aa7b0'))
      scatter(14, 20, (_i, x, z) => reed(x, z))
      break
    }
    case 'forest': {
      scatter(22, 23, (i, x, z) => tree(x, z, i))
      scatter(14, 18, (i, x, z) => mushroom(x, z, i))
      break
    }
    case 'cave': {
      scatter(26, 22, (i, x, z) => crystal(x, z, i, accent))
      break
    }
    case 'festival': {
      scatter(18, 20, (i, x, z) => balloon(x, z, i))
      group.add(stage())
      break
    }
  }
  return group
}

function defaultGround(kind: EnvironmentKind): string {
  switch (kind) {
    case 'nest': return '#9bd67a'
    case 'meadow': return '#86d96a'
    case 'river': return '#a9d98a'
    case 'forest': return '#5fa85a'
    case 'cave': return '#3a3358'
    case 'festival': return '#9bd67a'
  }
}

// Tiny prop factories — intentionally low-poly and bright.
function rock(x: number, z: number, color: string): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + (x % 3) * 0.1, 0), makeToonMaterial(color))
  m.position.set(x, 0.3, z)
  m.castShadow = true
  return m
}
function flower(x: number, z: number, i: number): THREE.Group {
  const g = new THREE.Group()
  const colors = ['#ff7ab6', '#ffd93d', '#ff9f43', '#b07cff', '#ff6b6b']
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 5), makeToonMaterial('#5aa85a'))
  stem.position.y = 0.25
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), makeToonMaterial(colors[i % colors.length]))
  head.position.y = 0.55
  g.add(stem, head)
  g.position.set(x, 0, z)
  g.castShadow = true
  return g
}
function bush(x: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), makeToonMaterial('#4f9e4f'))
  m.scale.y = 0.7
  m.position.set(x, 0.4, z)
  m.castShadow = true
  return m
}
function reed(x: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.1, 5), makeToonMaterial('#6fae5a'))
  m.position.set(x, 0.55, z)
  return m
}
function tree(x: number, z: number, i: number): THREE.Group {
  const g = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.2, 7), makeToonMaterial('#8a5a36'))
  trunk.position.y = 0.6
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 8), makeToonMaterial(i % 2 ? '#3f9e57' : '#54b06a'))
  leaves.position.y = 1.8
  g.add(trunk, leaves)
  g.position.set(x, 0, z)
  g.traverse((o) => (o.castShadow = true))
  return g
}
function mushroom(x: number, z: number, i: number): THREE.Group {
  const g = new THREE.Group()
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.3, 6), makeToonMaterial('#f3ead6'))
  stem.position.y = 0.15
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), makeToonMaterial(i % 2 ? '#ff6b6b' : '#b07cff'))
  cap.position.y = 0.3
  g.add(stem, cap)
  g.position.set(x, 0, z)
  return g
}
function crystal(x: number, z: number, i: number, accent: string): THREE.Mesh {
  const colors = ['#7be0ff', '#b78cff', '#7bffd1', accent]
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.2 + (i % 3) * 0.3, 6), makeToonMaterial(colors[i % colors.length]))
  m.position.set(x, 0.6, z)
  m.rotation.z = (i % 5) * 0.1 - 0.2
  m.castShadow = true
  return m
}
function balloon(x: number, z: number, i: number): THREE.Group {
  const g = new THREE.Group()
  const colors = ['#ff6b6b', '#4ea8ff', '#ffd93d', '#7ed957', '#ff8fc8']
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), makeToonMaterial(colors[i % colors.length]))
  b.scale.y = 1.2
  b.position.y = 3 + (i % 3) * 0.4
  const str = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 3, 4), makeToonMaterial('#ffffff'))
  str.position.y = 1.5
  g.add(b, str)
  g.position.set(x, 0, z)
  return g
}
function stage(): THREE.Group {
  const g = new THREE.Group()
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.3, 24), makeToonMaterial('#c98a5a'))
  floor.position.set(0, 0.15, -3)
  floor.receiveShadow = true
  g.add(floor)
  return g
}
function nestRing(x: number, z: number): THREE.Group {
  const g = new THREE.Group()
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.35, 8, 20), makeToonMaterial('#b5894e'))
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.2
  g.add(ring)
  g.position.set(x, 0, z)
  g.traverse((o) => (o.receiveShadow = true))
  return g
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

function disposeGroup(group: THREE.Object3D): void {
  group.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (mesh.geometry) mesh.geometry.dispose()
    const mat = mesh.material
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
    else if (mat) (mat as THREE.Material).dispose()
  })
}
