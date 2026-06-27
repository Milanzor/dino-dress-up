/**
 * CameraRig — a cuddly third-person camera.
 *
 * 'follow' mode trails the dino with position/look damping and never lets it
 * leave the frame. 'showcase' mode slowly orbits a stationary dino for the
 * character creator turntable. No collision, no inversion — toddler-proof.
 */

import * as THREE from 'three'

export type CameraMode = 'follow' | 'showcase'

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera
  private target: THREE.Object3D | null = null
  private mode: CameraMode = 'follow'

  // Follow tuning: sit behind (+z) and above, look slightly ahead/down.
  private followOffset = new THREE.Vector3(0, 3.2, 6.2)
  private followLookHeight = 1.2
  private posDamp = 3.5
  private lookDamp = 6
  private currentLook = new THREE.Vector3()

  // Showcase tuning.
  private showcaseRadius = 5.0
  private showcaseHeight = 2.2
  private showcaseAngle = 0
  private showcaseSpeed = 0.35 // rad/s

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 200)
    this.camera.position.set(0, 3.2, 6.2)
  }

  setTarget(obj: THREE.Object3D): void {
    this.target = obj
    this.currentLook.copy(obj.position)
  }

  setMode(mode: CameraMode): void {
    this.mode = mode
    if (mode === 'showcase') this.showcaseAngle = 0
  }

  /** Jump straight to the ideal pose (use on scene load to avoid a swoop). */
  snap(): void {
    if (!this.target) return
    if (this.mode === 'follow') {
      const desired = this.desiredFollowPos()
      this.camera.position.copy(desired)
      this.currentLook.copy(this.target.position).setY(this.followLookHeight)
      this.camera.lookAt(this.currentLook)
    } else {
      this.updateShowcase(0)
    }
  }

  update(dt: number): void {
    if (!this.target) return
    if (this.mode === 'follow') this.updateFollow(dt)
    else this.updateShowcase(dt)
  }

  private desiredFollowPos(): THREE.Vector3 {
    const t = this.target!
    // Offset is applied in the target's local frame so the camera stays behind
    // the dino as it turns, but we keep a fixed world-up height for comfort.
    const behind = this.followOffset.clone().applyQuaternion(t.quaternion)
    return new THREE.Vector3().copy(t.position).add(behind)
  }

  private updateFollow(dt: number): void {
    const desired = this.desiredFollowPos()
    const kPos = 1 - Math.exp(-this.posDamp * dt)
    this.camera.position.lerp(desired, kPos)

    const lookTarget = this.target!.position.clone().setY(this.followLookHeight)
    const kLook = 1 - Math.exp(-this.lookDamp * dt)
    this.currentLook.lerp(lookTarget, kLook)
    this.camera.lookAt(this.currentLook)
  }

  private updateShowcase(dt: number): void {
    this.showcaseAngle += this.showcaseSpeed * dt
    const t = this.target!
    const cx = t.position.x + Math.sin(this.showcaseAngle) * this.showcaseRadius
    const cz = t.position.z + Math.cos(this.showcaseAngle) * this.showcaseRadius
    this.camera.position.set(cx, t.position.y + this.showcaseHeight, cz)
    const look = t.position.clone().setY(t.position.y + 0.9)
    this.currentLook.lerp(look, 1 - Math.exp(-this.lookDamp * dt))
    this.camera.lookAt(this.currentLook)
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
  }
}
