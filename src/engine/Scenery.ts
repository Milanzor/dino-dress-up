/**
 * Scenery — the pretty, busy world.
 *
 * buildScenery() assembles a lush, layered environment per EnvironmentKind:
 * a gradient skydome + drifting clouds, rolling background hills, dense
 * wind-animated instanced grass & flowers, fuller trees/props, plus
 * per-biome highlights (sparkly water, fireflies, butterflies, glowing
 * crystals, festival bunting/lanterns/confetti). It returns a handle with an
 * update(dt, elapsed) the SceneManager ticks each frame.
 *
 * Performance: dense vegetation uses InstancedMesh; wind is a vertex-shader
 * effect (no per-frame CPU), so hundreds of blades cost a couple of draw
 * calls. Only hero props cast shadows.
 */

import * as THREE from 'three'
import type { EnvironmentKind, LightingPreset, SceneDescriptor } from '@/story/SceneDescriptor'
import { makeToonMaterial } from '@/character/Recolor'

export interface SceneryHandle {
  group: THREE.Group
  update: (dt: number, elapsed: number) => void
  dispose: () => void
}

// ── small deterministic PRNG so scenery is stable across reloads ────────────
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function col(hex: string): THREE.Color {
  return new THREE.Color(hex)
}
function shade(hex: string, amt: number): string {
  const c = new THREE.Color(hex)
  c.lerp(new THREE.Color(amt < 0 ? 0x000000 : 0xffffff), Math.abs(amt))
  return `#${c.getHexString()}`
}

// ── wind: a vertex-shader sway shared by grass/flowers ──────────────────────
interface WindReg {
  mats: THREE.Material[]
}
function applyWind(mat: THREE.MeshToonMaterial, amp: number, byHeight: boolean, reg: WindReg): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 }
    mat.userData.uTime = shader.uniforms.uTime
    shader.vertexShader =
      'uniform float uTime;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         #ifdef USE_INSTANCING
           float wphase = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.6;
         #else
           float wphase = 0.0;
         #endif
         float wamt = ${byHeight ? 'max(transformed.y, 0.0)' : '1.0'};
         transformed.x += sin(uTime * 1.6 + wphase) * ${amp.toFixed(3)} * wamt;
         transformed.z += cos(uTime * 1.2 + wphase) * ${(amp * 0.5).toFixed(3)} * wamt;`,
      )
  }
  // Unique per (amp, byHeight) so three compiles a distinct program for each
  // wind variant instead of sharing one (the classic onBeforeCompile pitfall).
  mat.customProgramCacheKey = () => `wind_${amp}_${byHeight}`
  reg.mats.push(mat)
}

// ── sky ─────────────────────────────────────────────────────────────────────
const SKY: Record<LightingPreset, { top: number; bottom: number }> = {
  day: { top: 0x4ea8ff, bottom: 0xcdeeff },
  sunset: { top: 0xff9a5a, bottom: 0xffe0b0 },
  cave: { top: 0x140f2e, bottom: 0x352a63 },
  rain: { top: 0x6f8499, bottom: 0xb9c8d4 },
}

function buildSky(lighting: LightingPreset): THREE.Mesh {
  const c = SKY[lighting]
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { uTop: { value: col(`#${c.top.toString(16).padStart(6, '0')}`) }, uBottom: { value: col(`#${c.bottom.toString(16).padStart(6, '0')}`) } },
    vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vPos; uniform vec3 uTop; uniform vec3 uBottom;
      void main(){ float h = clamp(normalize(vPos).y * 0.5 + 0.5, 0.0, 1.0);
      vec3 c = mix(uBottom, uTop, smoothstep(0.0, 0.85, h)); gl_FragColor = vec4(c, 1.0); }`,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(140, 24, 16), mat)
  mesh.name = 'sky'
  mesh.renderOrder = -1
  return mesh
}

function buildClouds(rng: () => number): { group: THREE.Group; update: (dt: number) => void } {
  const group = new THREE.Group()
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false })
  const speeds: number[] = []
  for (let i = 0; i < 9; i++) {
    const puff = new THREE.Group()
    const n = 3 + Math.floor(rng() * 3)
    for (let j = 0; j < n; j++) {
      const s = 2 + rng() * 3
      const b = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), mat)
      b.scale.y = 0.6
      b.position.set((j - n / 2) * s * 0.9, rng() * 1.5, rng() * 2)
      puff.add(b)
    }
    puff.position.set(-70 + rng() * 140, 26 + rng() * 16, -50 - rng() * 60)
    group.add(puff)
    speeds.push(0.4 + rng() * 0.7)
  }
  return {
    group,
    update: (dt) => {
      group.children.forEach((c, i) => {
        c.position.x += dt * speeds[i]
        if (c.position.x > 90) c.position.x = -90
      })
    },
  }
}

// ── ground + hills ──────────────────────────────────────────────────────────
function buildGround(palette: SceneDescriptor['palette'], kind: EnvironmentKind): THREE.Mesh {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(60, 64),
    makeToonMaterial(palette?.ground ?? defaultGround(kind)),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  return ground
}

function buildHills(palette: SceneDescriptor['palette'], kind: EnvironmentKind, rng: () => number): THREE.Group {
  const g = new THREE.Group()
  const base = palette?.ground ?? defaultGround(kind)
  for (let ring = 0; ring < 2; ring++) {
    const r = 30 + ring * 9
    const tint = shade(base, ring === 0 ? -0.08 : -0.16)
    const n = 14 + ring * 4
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng() * 0.2
      const size = 5 + rng() * 9
      const h = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), makeToonMaterial(tint))
      h.scale.set(1.2, 0.35 + rng() * 0.25, 1.2)
      h.position.set(Math.cos(a) * r, -1.5 - ring, Math.sin(a) * r)
      g.add(h)
    }
  }
  return g
}

// ── instanced vegetation ────────────────────────────────────────────────────
function bladeGeo(): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(0.1, 0.6, 1, 2)
  g.translate(0, 0.3, 0)
  return g
}

function buildGrass(count: number, radius: number, color: string, rng: () => number, reg: WindReg): THREE.InstancedMesh {
  const mat = makeToonMaterial(color)
  mat.side = THREE.DoubleSide
  applyWind(mat, 0.18, true, reg)
  const mesh = new THREE.InstancedMesh(bladeGeo(), mat, count)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const s = new THREE.Vector3()
  const p = new THREE.Vector3()
  const greens = [color, shade(color, 0.12), shade(color, -0.1)]
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2
    const r = Math.sqrt(rng()) * radius
    p.set(Math.cos(a) * r, 0, Math.sin(a) * r)
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * Math.PI)
    const sc = 0.7 + rng() * 0.9
    s.set(sc, sc + rng() * 0.5, sc)
    m.compose(p, q, s)
    mesh.setMatrixAt(i, m)
    mesh.setColorAt(i, col(greens[i % greens.length]))
  }
  mesh.instanceMatrix.needsUpdate = true
  mesh.castShadow = false
  mesh.receiveShadow = false
  mesh.frustumCulled = false // bounding sphere is one blade; instances span the field
  return mesh
}

function buildFlowers(count: number, radius: number, rng: () => number, reg: WindReg): THREE.Group {
  const group = new THREE.Group()
  const palette = ['#ff7ab6', '#ffd93d', '#ff9f43', '#b07cff', '#ff6b6b', '#ffffff', '#6ad6ff']
  const stemMat = makeToonMaterial('#5aa85a')
  applyWind(stemMat, 0.07, true, reg)
  const headMat = makeToonMaterial('#ffffff')
  applyWind(headMat, 0.07, false, reg)

  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.03, 0.5, 5).translate(0, 0.25, 0), stemMat, count)
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 8, 6), headMat, count)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const one = new THREE.Vector3(1, 1, 1)
  const p = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2
    const r = Math.sqrt(rng()) * radius
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    p.set(x, 0, z)
    m.compose(p, q, one)
    stems.setMatrixAt(i, m)
    p.set(x, 0.52, z)
    m.compose(p, q, one)
    heads.setMatrixAt(i, m)
    heads.setColorAt(i, col(palette[Math.floor(rng() * palette.length)]))
  }
  stems.instanceMatrix.needsUpdate = true
  heads.instanceMatrix.needsUpdate = true
  stems.frustumCulled = false
  heads.frustumCulled = false
  group.add(stems, heads)
  return group
}

// ── hero props ──────────────────────────────────────────────────────────────
function tree(x: number, z: number, rng: () => number): THREE.Group {
  const g = new THREE.Group()
  const trunkH = 1.1 + rng() * 0.9
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, trunkH, 7), makeToonMaterial('#8a5a36'))
  trunk.position.y = trunkH / 2
  g.add(trunk)
  const leafColor = rng() > 0.5 ? '#3f9e57' : '#54b06a'
  const tiers = 2 + Math.floor(rng() * 2)
  for (let t = 0; t < tiers; t++) {
    const rad = 1.0 - t * 0.22
    const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, 1.2, 8), makeToonMaterial(shade(leafColor, t * 0.06)))
    cone.position.y = trunkH + 0.2 + t * 0.7
    cone.castShadow = true
    g.add(cone)
  }
  trunk.castShadow = true
  g.position.set(x, 0, z)
  g.rotation.y = rng() * Math.PI
  return g
}

function bush(x: number, z: number, color: string, rng: () => number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + rng() * 0.4, 0), makeToonMaterial(color))
  m.scale.y = 0.7
  m.position.set(x, 0.4, z)
  m.castShadow = true
  return m
}

function rock(x: number, z: number, color: string, rng: () => number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + rng() * 0.5, 0), makeToonMaterial(color))
  m.position.set(x, 0.25, z)
  m.rotation.set(rng(), rng(), rng())
  m.castShadow = true
  return m
}

function mushroom(x: number, z: number, rng: () => number): THREE.Group {
  const g = new THREE.Group()
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.3, 6), makeToonMaterial('#f3ead6'))
  stem.position.y = 0.15
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), makeToonMaterial(rng() > 0.5 ? '#ff6b6b' : '#b07cff'))
  cap.position.y = 0.3
  g.add(stem, cap)
  g.position.set(x, 0, z)
  return g
}

function scatterRing<T extends THREE.Object3D>(group: THREE.Group, n: number, rMin: number, rMax: number, rng: () => number, make: (x: number, z: number) => T): void {
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2
    const r = rMin + rng() * (rMax - rMin)
    group.add(make(Math.cos(a) * r, Math.sin(a) * r))
  }
}

// ── animated critters ───────────────────────────────────────────────────────
function butterfly(color: string): THREE.Group {
  const g = new THREE.Group()
  const mat = makeToonMaterial(color)
  const wl = new THREE.Mesh(new THREE.CircleGeometry(0.14, 8), mat)
  const wr = new THREE.Mesh(new THREE.CircleGeometry(0.14, 8), mat)
  mat.side = THREE.DoubleSide
  wl.position.x = -0.1
  wr.position.x = 0.1
  g.add(wl, wr)
  g.userData.wings = [wl, wr]
  return g
}

function buildButterflies(n: number, radius: number, rng: () => number): { group: THREE.Group; update: (dt: number, el: number) => void } {
  const group = new THREE.Group()
  const colors = ['#ff7ab6', '#ffd93d', '#6ad6ff', '#ff9f43', '#ffffff']
  const seeds: number[] = []
  for (let i = 0; i < n; i++) {
    const b = butterfly(colors[i % colors.length])
    group.add(b)
    seeds.push(rng() * 10)
  }
  return {
    group,
    update: (_dt, el) => {
      group.children.forEach((b, i) => {
        const s = seeds[i]
        const t = el * 0.6 + s
        b.position.set(Math.sin(t) * radius * (0.4 + 0.3 * Math.sin(t * 0.3)), 1.0 + Math.sin(t * 2) * 0.5, Math.cos(t * 0.8) * radius * 0.5)
        b.rotation.y = -t
        const flap = Math.sin(el * 18 + s) * 0.9
        const wings = b.userData.wings as THREE.Mesh[]
        wings[0].rotation.y = flap
        wings[1].rotation.y = -flap
      })
    },
  }
}

function buildPoints(n: number, radius: number, height: number, color: number, size: number, rng: () => number): { points: THREE.Points; update: (dt: number, el: number) => void } {
  const pos = new Float32Array(n * 3)
  const seeds = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2
    const r = Math.sqrt(rng()) * radius
    pos[i * 3] = Math.cos(a) * r
    pos[i * 3 + 1] = 0.4 + rng() * height
    pos[i * 3 + 2] = Math.sin(a) * r
    seeds[i] = rng() * 10
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
  const points = new THREE.Points(geo, mat)
  const update = (_dt: number, el: number): void => {
    mat.opacity = 0.5 + 0.4 * Math.abs(Math.sin(el * 2))
    const arr = geo.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < n; i++) {
      arr.setY(i, 0.5 + height * (0.5 + 0.5 * Math.sin(el * 1.5 + seeds[i])))
    }
    arr.needsUpdate = true
  }
  return { points, update }
}

// ── water ───────────────────────────────────────────────────────────────────
function buildWater(): { mesh: THREE.Mesh; update: (dt: number, el: number) => void } {
  const uniforms = { uTime: { value: 0 } }
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms,
    vertexShader: `varying vec2 vUv; varying vec3 vPos; void main(){ vUv = uv; vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec2 vUv; varying vec3 vPos; uniform float uTime;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      void main(){
        vec3 deep = vec3(0.18, 0.55, 0.95);
        vec3 shallow = vec3(0.55, 0.85, 1.0);
        float ripple = sin(vPos.x * 1.4 + uTime * 1.6) * 0.5 + sin(vPos.y * 1.9 - uTime * 1.2) * 0.5;
        vec3 c = mix(deep, shallow, ripple * 0.5 + 0.5);
        vec2 cell = floor((vUv + vec2(uTime * 0.02, 0.0)) * 60.0);
        float spark = step(0.985, hash(cell + floor(uTime * 2.0)));
        c += spark * 0.8;
        gl_FragColor = vec4(c, 0.9);
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(70, 9, 1, 1), mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, 0.03, -7)
  return { mesh, update: (_dt, el) => (uniforms.uTime.value = el) }
}

function reed(x: number, z: number, rng: () => number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.0 + rng() * 0.6, 5), makeToonMaterial('#6fae5a'))
  m.position.set(x, 0.6, z)
  return m
}

function lilypad(x: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.4, 10, 0, Math.PI * 1.8), makeToonMaterial('#3fae5a'))
  m.rotation.x = -Math.PI / 2
  m.position.set(x, 0.06, z)
  return m
}

// ── cave ────────────────────────────────────────────────────────────────────
function crystal(x: number, z: number, color: string, rng: () => number): THREE.Mesh {
  const mat = makeToonMaterial(color)
  mat.emissive = col(color)
  mat.emissiveIntensity = 0.5
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.25 + rng() * 0.2, 1.0 + rng() * 1.0, 6), mat)
  m.position.set(x, 0.5, z)
  m.rotation.set((rng() - 0.5) * 0.4, rng() * Math.PI, (rng() - 0.5) * 0.4)
  m.castShadow = true
  return m
}

// ── festival ────────────────────────────────────────────────────────────────
function bunting(radius: number): THREE.Group {
  const g = new THREE.Group()
  const colors = ['#ff6b6b', '#ffd93d', '#4ea8ff', '#7ed957', '#ff8fc8', '#b07cff']
  const poles = 8
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= poles; i++) {
    const a = (i / poles) * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 3.4, Math.sin(a) * radius))
    if (i < poles) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 6), makeToonMaterial('#c98a5a'))
      pole.position.set(Math.cos(a) * radius, 1.8, Math.sin(a) * radius)
      g.add(pole)
    }
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const segs = 6
    for (let s = 0; s < segs; s++) {
      const t = s / segs
      const p = a.clone().lerp(b, t)
      p.y -= Math.sin(t * Math.PI) * 0.5 // droop
      const flag = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 3), makeToonMaterial(colors[(i * segs + s) % colors.length]))
      flag.rotation.x = Math.PI
      flag.position.copy(p)
      g.add(flag)
    }
  }
  return g
}

function balloon(x: number, z: number, color: string, h: number): THREE.Group {
  const g = new THREE.Group()
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), makeToonMaterial(color))
  b.scale.y = 1.2
  b.position.y = h
  const str = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, h, 4), makeToonMaterial('#ffffff'))
  str.position.y = h / 2
  g.add(b, str)
  g.position.set(x, 0, z)
  return g
}

function lantern(x: number, z: number, color: string): THREE.Mesh {
  const mat = makeToonMaterial(color)
  mat.emissive = col(color)
  mat.emissiveIntensity = 0.6
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), mat)
  m.position.set(x, 2.2, z)
  return m
}

function stage(): THREE.Group {
  const g = new THREE.Group()
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.3, 0.4, 28), makeToonMaterial('#c98a5a'))
  floor.position.set(0, 0.2, -4)
  floor.receiveShadow = true
  const trim = new THREE.Mesh(new THREE.TorusGeometry(4.1, 0.12, 8, 28), makeToonMaterial('#ffd93d'))
  trim.rotation.x = Math.PI / 2
  trim.position.set(0, 0.42, -4)
  g.add(floor, trim)
  return g
}

function buildConfetti(n: number, radius: number, rng: () => number): { points: THREE.Points; update: (dt: number, el: number) => void } {
  const pos = new Float32Array(n * 3)
  const vel = new Float32Array(n)
  const colors = new Float32Array(n * 3)
  const palette = [col('#ff6b6b'), col('#ffd93d'), col('#4ea8ff'), col('#7ed957'), col('#ff8fc8')]
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (rng() - 0.5) * radius * 2
    pos[i * 3 + 1] = rng() * 8
    pos[i * 3 + 2] = (rng() - 0.5) * radius * 2
    vel[i] = 0.6 + rng() * 1.2
    const c = palette[Math.floor(rng() * palette.length)]
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const mat = new THREE.PointsMaterial({ size: 0.18, vertexColors: true, transparent: true, opacity: 0.95 })
  const points = new THREE.Points(geo, mat)
  return {
    points,
    update: (dt) => {
      const arr = geo.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < n; i++) {
        let y = arr.getY(i) - vel[i] * dt
        if (y < 0) y = 8
        arr.setY(i, y)
      }
      arr.needsUpdate = true
    },
  }
}

function defaultGround(kind: EnvironmentKind): string {
  switch (kind) {
    case 'nest': return '#9bd67a'
    case 'meadow': return '#86d96a'
    case 'river': return '#a9d98a'
    case 'forest': return '#4f9a52'
    case 'cave': return '#3a3358'
    case 'festival': return '#9bd67a'
  }
}

// ── assembler ───────────────────────────────────────────────────────────────
export function buildScenery(
  kind: EnvironmentKind,
  palette: SceneDescriptor['palette'],
  lighting: LightingPreset,
): SceneryHandle {
  const seed = [...kind].reduce((a, c) => a + c.charCodeAt(0), 7)
  const rng = mulberry32(seed * 2654435761)
  const group = new THREE.Group()
  group.name = `scenery:${kind}`
  const animators: ((dt: number, el: number) => void)[] = []
  const wind: WindReg = { mats: [] }

  group.add(buildSky(lighting))
  group.add(buildGround(palette, kind))
  group.add(buildHills(palette, kind, rng))

  if (lighting !== 'cave') {
    const clouds = buildClouds(rng)
    group.add(clouds.group)
    animators.push((dt) => clouds.update(dt))
  }

  const accent = palette?.accent ?? '#ffffff'
  const groundC = palette?.ground ?? defaultGround(kind)

  // Dense grass everywhere outdoors (kept short so the dino walks "through" it).
  if (kind !== 'cave') {
    group.add(buildGrass(420, 26, shade(groundC, -0.12), rng, wind))
  }

  switch (kind) {
    case 'nest': {
      group.add(buildFlowers(90, 22, rng, wind))
      scatterRing(group, 5, 8, 20, rng, (x, z) => tree(x, z, rng))
      scatterRing(group, 8, 5, 20, rng, (x, z) => bush(x, z, '#4f9e4f', rng))
      scatterRing(group, 6, 8, 22, rng, (x, z) => rock(x, z, '#b08a5a', rng))
      // a cozy nest with eggs
      const nest = new THREE.Group()
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.4, 8, 22), makeToonMaterial('#b5894e'))
      ring.rotation.x = Math.PI / 2
      ring.position.y = 0.25
      nest.add(ring)
      for (let i = 0; i < 3; i++) {
        const egg = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), makeToonMaterial('#fff3d6'))
        egg.scale.y = 1.3
        egg.position.set((i - 1) * 0.5, 0.35, 0)
        nest.add(egg)
      }
      nest.position.set(-3, 0, -4)
      nest.traverse((o) => (o.castShadow = true))
      group.add(nest)
      const bf = buildButterflies(5, 8, rng)
      group.add(bf.group)
      animators.push(bf.update)
      break
    }
    case 'meadow': {
      group.add(buildFlowers(260, 24, rng, wind))
      scatterRing(group, 7, 12, 24, rng, (x, z) => tree(x, z, rng))
      scatterRing(group, 10, 6, 22, rng, (x, z) => bush(x, z, '#4f9e4f', rng))
      const bf = buildButterflies(8, 10, rng)
      group.add(bf.group)
      animators.push(bf.update)
      break
    }
    case 'river': {
      const water = buildWater()
      group.add(water.mesh)
      animators.push(water.update)
      group.add(buildFlowers(60, 22, rng, wind))
      scatterRing(group, 16, 3, 22, rng, (x, z) => reed(x, z < -3 ? z : z - 6, rng))
      for (let i = -3; i <= 3; i++) group.add(rock(i * 1.7, -7 + (i % 2) * 0.5, '#9aa7b0', rng))
      group.add(lilypad(-2, -7), lilypad(1.5, -8), lilypad(3, -6))
      scatterRing(group, 4, 14, 24, rng, (x, z) => tree(x, z, rng))
      const bf = buildButterflies(4, 9, rng)
      group.add(bf.group)
      animators.push(bf.update)
      break
    }
    case 'forest': {
      scatterRing(group, 26, 6, 26, rng, (x, z) => tree(x, z, rng))
      scatterRing(group, 18, 4, 22, rng, (x, z) => mushroom(x, z, rng))
      scatterRing(group, 12, 5, 22, rng, (x, z) => bush(x, z, '#3f7e44', rng))
      const fireflies = buildPoints(60, 20, 2.5, 0xfff2a0, 0.16, rng)
      group.add(fireflies.points)
      animators.push(fireflies.update)
      break
    }
    case 'cave': {
      scatterRing(group, 30, 3, 24, rng, (x, z) => crystal(x, z, ['#7be0ff', '#b78cff', '#7bffd1', accent][Math.floor(rng() * 4)], rng))
      // stalagmites
      scatterRing(group, 14, 5, 22, rng, (x, z) => {
        const m = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6 + rng() * 1.4, 7), makeToonMaterial('#4a4368'))
        m.position.set(x, 0.8, z)
        m.castShadow = true
        return m
      })
      const sparkle = buildPoints(80, 22, 4, 0xbfe0ff, 0.2, rng)
      group.add(sparkle.points)
      animators.push(sparkle.update)
      break
    }
    case 'festival': {
      group.add(buildFlowers(70, 22, rng, wind))
      group.add(bunting(14))
      group.add(stage())
      scatterRing(group, 14, 8, 22, rng, (x, z) => balloon(x, z, ['#ff6b6b', '#4ea8ff', '#ffd93d', '#7ed957', '#ff8fc8'][Math.floor(rng() * 5)], 3 + rng() * 1.5))
      scatterRing(group, 10, 6, 18, rng, (x, z) => lantern(x, z, ['#ffd17a', '#ff9f9f', '#a0d0ff'][Math.floor(rng() * 3)]))
      scatterRing(group, 5, 12, 24, rng, (x, z) => tree(x, z, rng))
      const confetti = buildConfetti(120, 16, rng)
      group.add(confetti.points)
      animators.push(confetti.update)
      const bf = buildButterflies(4, 10, rng)
      group.add(bf.group)
      animators.push(bf.update)
      break
    }
  }

  // One animator drives every wind material's time uniform.
  if (wind.mats.length) {
    animators.push((_dt, el) => {
      for (const mat of wind.mats) {
        const u = (mat as THREE.MeshToonMaterial).userData.uTime as { value: number } | undefined
        if (u) u.value = el
      }
    })
  }

  return {
    group,
    update: (dt, el) => {
      for (const a of animators) a(dt, el)
    },
    dispose: () => {
      group.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const mat = mesh.material
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else if (mat) (mat as THREE.Material).dispose()
      })
    },
  }
}
