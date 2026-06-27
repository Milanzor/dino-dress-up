/**
 * Renderer — owns the WebGLRenderer, the rAF loop, and the frame clock.
 *
 * Keeps tablet perf in check: pixel ratio capped at 2, soft shadows toggleable
 * per scene, ACES-ish tone curve for the toon look. Systems register an update
 * callback (dt, elapsed) via onFrame; the loop fans them out each tick.
 */

import * as THREE from 'three'

export type FrameCallback = (dt: number, elapsed: number) => void

export class Renderer {
  readonly renderer: THREE.WebGLRenderer
  readonly canvas: HTMLCanvasElement
  private clock = new THREE.Clock()
  private callbacks = new Set<FrameCallback>()
  private rafId = 0
  private running = false

  /** Active scene + camera the loop renders. Swapped by SceneManager. */
  private scene: THREE.Scene | null = null
  private camera: THREE.Camera | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.resize()
    window.addEventListener('resize', this.resize)
    window.addEventListener('orientationchange', this.resize)
  }

  setActive(scene: THREE.Scene, camera: THREE.Camera): void {
    this.scene = scene
    this.camera = camera
    this.resize()
  }

  setShadows(enabled: boolean): void {
    this.renderer.shadowMap.enabled = enabled
  }

  onFrame(cb: FrameCallback): () => void {
    this.callbacks.add(cb)
    return () => this.callbacks.delete(cb)
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.clock.start()
    this.loop()
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)
  }

  private loop = (): void => {
    if (!this.running) return
    this.rafId = requestAnimationFrame(this.loop)
    // Clamp dt so a backgrounded tab doesn't fling the dino across the map.
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const elapsed = this.clock.elapsedTime
    for (const cb of this.callbacks) cb(dt, elapsed)
    if (this.scene && this.camera) this.renderer.render(this.scene, this.camera)
  }

  private resize = (): void => {
    const w = window.innerWidth
    const h = window.innerHeight
    this.renderer.setSize(w, h, false)
    const cam = this.camera
    if (cam && (cam as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const pc = cam as THREE.PerspectiveCamera
      pc.aspect = w / h
      pc.updateProjectionMatrix()
    }
  }

  dispose(): void {
    this.stop()
    window.removeEventListener('resize', this.resize)
    window.removeEventListener('orientationchange', this.resize)
    this.callbacks.clear()
    this.renderer.dispose()
  }
}
