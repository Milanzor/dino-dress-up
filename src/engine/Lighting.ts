/**
 * Lighting — reusable cute lighting presets keyed by LightingPreset.
 *
 * A preset returns a disposable group of lights plus the fog/background color
 * the SceneManager applies to the scene. Soft, warm, high-key — a friendly
 * picture-book look that stays cheap on tablets (one shadow-casting light max).
 */

import * as THREE from 'three'
import type { LightingPreset } from '@/story/SceneDescriptor'

export interface LightingResult {
  group: THREE.Group
  background: THREE.Color
  fog: THREE.Fog | null
}

interface PresetSpec {
  background: number
  hemiSky: number
  hemiGround: number
  hemiIntensity: number
  sun: number
  sunIntensity: number
  sunPos: [number, number, number]
  fog: { color: number; near: number; far: number } | null
  shadows: boolean
}

const PRESETS: Record<LightingPreset, PresetSpec> = {
  day: {
    background: 0x8ed0ff,
    hemiSky: 0xbfe8ff,
    hemiGround: 0x9bd67a,
    hemiIntensity: 1.1,
    sun: 0xfff4d6,
    sunIntensity: 1.4,
    sunPos: [6, 10, 4],
    fog: { color: 0xbfe8ff, near: 22, far: 60 },
    shadows: true,
  },
  sunset: {
    background: 0xffb08a,
    hemiSky: 0xffd6a8,
    hemiGround: 0x8a6b8f,
    hemiIntensity: 1.0,
    sun: 0xffcaa0,
    sunIntensity: 1.5,
    sunPos: [-8, 5, 2],
    fog: { color: 0xffc7a0, near: 18, far: 55 },
    shadows: true,
  },
  cave: {
    background: 0x2a2350,
    hemiSky: 0x6a5cff,
    hemiGround: 0x241a40,
    hemiIntensity: 0.7,
    sun: 0xa0e0ff,
    sunIntensity: 0.8,
    sunPos: [2, 6, 3],
    fog: { color: 0x2a2350, near: 10, far: 38 },
    shadows: false,
  },
  rain: {
    background: 0x9fb6c9,
    hemiSky: 0xc3d4e0,
    hemiGround: 0x7a8a78,
    hemiIntensity: 0.95,
    sun: 0xdfe8ef,
    sunIntensity: 0.9,
    sunPos: [4, 9, 5],
    fog: { color: 0xb4c4d2, near: 16, far: 50 },
    shadows: true,
  },
}

export function buildLighting(preset: LightingPreset): LightingResult {
  const spec = PRESETS[preset]
  const group = new THREE.Group()
  group.name = `lighting:${preset}`

  const hemi = new THREE.HemisphereLight(spec.hemiSky, spec.hemiGround, spec.hemiIntensity)
  hemi.position.set(0, 20, 0)
  group.add(hemi)

  const sun = new THREE.DirectionalLight(spec.sun, spec.sunIntensity)
  sun.position.set(...spec.sunPos)
  if (spec.shadows) {
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    const c = sun.shadow.camera
    c.near = 1
    c.far = 40
    c.left = -14
    c.right = 14
    c.top = 14
    c.bottom = -14
    sun.shadow.bias = -0.0005
  }
  group.add(sun)

  // A soft fill from the opposite side keeps shadowed faces readable.
  const fill = new THREE.DirectionalLight(0xffffff, 0.25)
  fill.position.set(-spec.sunPos[0], 4, -spec.sunPos[2])
  group.add(fill)

  const fog = spec.fog
    ? new THREE.Fog(spec.fog.color, spec.fog.near, spec.fog.far)
    : null

  return { group, background: new THREE.Color(spec.background), fog }
}

/** Whether a preset wants shadow rendering (SceneManager toggles the renderer). */
export function presetCastsShadows(preset: LightingPreset): boolean {
  return PRESETS[preset].shadows
}
