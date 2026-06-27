/**
 * Recolor — applies CharacterConfig colors + pattern to a dino's materials.
 *
 * Two robustness rules from the plan:
 *  - Materials are cloned before editing (DinoFactory does the clone; here we
 *    only mutate the already-private materials we're handed).
 *  - Patterns are texture-based (a multiply map) so they survive whatever messy
 *    UVs a CC0 model ships with. v1 generates spots/stripes procedurally on a
 *    canvas — no texture files required.
 */

import * as THREE from 'three'
import type { CharacterConfig, Pattern } from './CharacterConfig'

// Shared 3-step toon gradient ramp (cute banded shading, cheap on tablets).
let gradientMap: THREE.DataTexture | null = null
function toonGradient(): THREE.DataTexture {
  if (gradientMap) return gradientMap
  const data = new Uint8Array([90, 170, 255]) // 3 luminance bands
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.needsUpdate = true
  gradientMap = tex
  return tex
}

// Pattern textures are independent of color (white base, gray marks) so they
// multiply cleanly over any body color. Cached per pattern.
const patternCache = new Map<Pattern, THREE.CanvasTexture | null>()

function patternTexture(pattern: Pattern): THREE.CanvasTexture | null {
  if (pattern === 'none') return null
  if (patternCache.has(pattern)) return patternCache.get(pattern)!

  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = 'rgba(0,0,0,0.32)' // marks darken the base color

  if (pattern === 'spots') {
    const r = size * 0.09
    const step = size / 4
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const ox = (j % 2) * (step / 2)
        ctx.beginPath()
        ctx.arc(i * step + step / 2 + ox - step / 2, j * step + step / 2, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  } else if (pattern === 'stripes') {
    ctx.save()
    ctx.translate(size / 2, size / 2)
    ctx.rotate(Math.PI / 5)
    ctx.translate(-size, -size)
    const band = size * 0.16
    for (let x = 0; x < size * 2.5; x += band * 2) {
      ctx.fillRect(x, 0, band, size * 3)
    }
    ctx.restore()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2.5, 2.5)
  tex.colorSpace = THREE.SRGBColorSpace
  patternCache.set(pattern, tex)
  return tex
}

/** Lighten a hex color toward white (for a default belly from body color). */
export function lighten(hex: string, amount = 0.5): string {
  const c = new THREE.Color(hex)
  c.lerp(new THREE.Color(0xffffff), amount)
  return `#${c.getHexString()}`
}

/** Turn a material into a toon material's look (idempotent-ish helper). */
export function makeToonMaterial(color: string): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({
    color: new THREE.Color(color),
    gradientMap: toonGradient(),
  })
}

export interface RecolorTargets {
  bodyMaterials: THREE.MeshToonMaterial[]
  bellyMaterials: THREE.MeshToonMaterial[]
}

/** Apply body/belly color + pattern to the dino's (already-cloned) materials. */
export function applyRecolor(targets: RecolorTargets, config: CharacterConfig): void {
  const bellyColor = config.bellyColor ?? lighten(config.bodyColor, 0.55)
  const pattern = patternTexture(config.pattern)

  for (const m of targets.bodyMaterials) {
    m.color.set(config.bodyColor)
    m.map = pattern
    m.needsUpdate = true
  }
  for (const m of targets.bellyMaterials) {
    m.color.set(bellyColor)
    // Belly stays smooth (no pattern) for a soft two-tone look.
    m.map = null
    m.needsUpdate = true
  }
}
