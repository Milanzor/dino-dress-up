export interface MoveIntent {
  x: number // -1..1 strafe/turn axis
  y: number // -1..1 forward(+) / back(-)
}

const STYLE_ID = 'dino-input-controls-style'
const JOY_RADIUS = 64 // px — half of the 128px joystick base
const KNOB_MAX = 48 // px — max knob travel from center
const DAMP = 0.25 // movement smoothing factor per frame-ish update

const STYLE = `
.dino-input-root {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 50;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}
.dino-joystick {
  position: absolute;
  left: calc(env(safe-area-inset-left, 0px) + 24px);
  bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
  width: 128px;
  height: 128px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  border: 4px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
  touch-action: none;
}
.dino-joystick-knob {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 64px;
  height: 64px;
  margin-left: -32px;
  margin-top: -32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  transition: transform 0.05s linear;
  pointer-events: none;
}
.dino-action-btn {
  position: absolute;
  right: calc(env(safe-area-inset-right, 0px) + 24px);
  bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
  width: 112px;
  height: 112px;
  min-width: 96px;
  min-height: 96px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ffd45e, #f7a712);
  border: 4px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
  pointer-events: auto;
  touch-action: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44px;
  line-height: 1;
}
.dino-action-btn:active {
  transform: scale(0.92);
}
`

export class InputController {
  private touchLayer: HTMLElement
  private running = false

  // Raw target vector (from key/touch) and smoothed output.
  private target: MoveIntent = { x: 0, y: 0 }
  private smoothed: MoveIntent = { x: 0, y: 0 }

  // Keyboard state.
  private keys = new Set<string>()

  // Edge-triggered interact flag (consumeInteract) + subscribers.
  private interactPending = false
  private interactSubs = new Set<() => void>()

  // Injected DOM.
  private root: HTMLDivElement | null = null
  private joystick: HTMLDivElement | null = null
  private knob: HTMLDivElement | null = null
  private actionBtn: HTMLDivElement | null = null

  // Active joystick pointer.
  private joyPointerId: number | null = null

  // Bound handlers (stable refs for add/removeEventListener).
  private readonly onKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e)
  private readonly onKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e)
  private readonly onJoyDown = (e: PointerEvent) => this.handleJoyDown(e)
  private readonly onJoyMove = (e: PointerEvent) => this.handleJoyMove(e)
  private readonly onJoyUp = (e: PointerEvent) => this.handleJoyUp(e)
  private readonly onActionDown = (e: PointerEvent) => this.handleActionDown(e)

  constructor(touchLayer: HTMLElement) {
    this.touchLayer = touchLayer
  }

  // ---- Lifecycle ----------------------------------------------------------

  start(): void {
    if (this.running) return
    this.running = true

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)

    this.injectControls()
  }

  stop(): void {
    if (!this.running) return
    this.running = false

    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)

    this.removeControls()

    this.keys.clear()
    this.target = { x: 0, y: 0 }
    this.smoothed = { x: 0, y: 0 }
    this.joyPointerId = null
  }

  dispose(): void {
    this.stop()
    this.interactSubs.clear()
    this.interactPending = false
  }

  // ---- Query API ----------------------------------------------------------

  getMove(): MoveIntent {
    this.updateFromKeys()
    this.smooth()
    return { x: this.smoothed.x, y: this.smoothed.y }
  }

  consumeInteract(): boolean {
    if (this.interactPending) {
      this.interactPending = false
      return true
    }
    return false
  }

  onInteract(cb: () => void): () => void {
    this.interactSubs.add(cb)
    return () => this.interactSubs.delete(cb)
  }

  // ---- Movement math ------------------------------------------------------

  private updateFromKeys(): void {
    // If a touch joystick is active, it owns the target; skip keyboard.
    if (this.joyPointerId !== null) return

    let x = 0
    let y = 0
    if (this.keys.has('left')) x -= 1
    if (this.keys.has('right')) x += 1
    if (this.keys.has('up')) y += 1
    if (this.keys.has('down')) y -= 1

    this.setTarget(x, y)
  }

  private setTarget(x: number, y: number): void {
    // Clamp magnitude to 1.
    const mag = Math.hypot(x, y)
    if (mag > 1) {
      x /= mag
      y /= mag
    }
    this.target = { x, y }
  }

  private smooth(): void {
    this.smoothed.x += (this.target.x - this.smoothed.x) * DAMP
    this.smoothed.y += (this.target.y - this.smoothed.y) * DAMP
    // Snap tiny residuals to zero so it fully rests on release.
    if (Math.abs(this.smoothed.x) < 0.001) this.smoothed.x = 0
    if (Math.abs(this.smoothed.y) < 0.001) this.smoothed.y = 0
  }

  // ---- Interact -----------------------------------------------------------

  private fireInteract(): void {
    this.interactPending = true
    for (const cb of this.interactSubs) {
      try {
        cb()
      } catch {
        /* a subscriber error must not break input */
      }
    }
  }

  // ---- Keyboard -----------------------------------------------------------

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key
    switch (key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.keys.add('left')
        e.preventDefault()
        break
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.keys.add('right')
        e.preventDefault()
        break
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.keys.add('up')
        e.preventDefault()
        break
      case 'ArrowDown':
      case 's':
      case 'S':
        this.keys.add('down')
        e.preventDefault()
        break
      case ' ':
      case 'Spacebar':
      case 'Enter':
        e.preventDefault()
        if (!e.repeat) this.fireInteract()
        break
      default:
        break
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.keys.delete('left')
        break
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.keys.delete('right')
        break
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.keys.delete('up')
        break
      case 'ArrowDown':
      case 's':
      case 'S':
        this.keys.delete('down')
        break
      default:
        break
    }
  }

  // ---- Touch controls (DOM) ----------------------------------------------

  private injectControls(): void {
    this.injectStyle()

    const root = document.createElement('div')
    root.className = 'dino-input-root'

    const joystick = document.createElement('div')
    joystick.className = 'dino-joystick'

    const knob = document.createElement('div')
    knob.className = 'dino-joystick-knob'
    joystick.appendChild(knob)

    const actionBtn = document.createElement('div')
    actionBtn.className = 'dino-action-btn'
    actionBtn.setAttribute('role', 'button')
    actionBtn.setAttribute('aria-label', 'Doen')
    actionBtn.textContent = '⭐'

    root.appendChild(joystick)
    root.appendChild(actionBtn)
    this.touchLayer.appendChild(root)

    joystick.addEventListener('pointerdown', this.onJoyDown)
    joystick.addEventListener('pointermove', this.onJoyMove)
    joystick.addEventListener('pointerup', this.onJoyUp)
    joystick.addEventListener('pointercancel', this.onJoyUp)
    actionBtn.addEventListener('pointerdown', this.onActionDown)

    this.root = root
    this.joystick = joystick
    this.knob = knob
    this.actionBtn = actionBtn
  }

  private removeControls(): void {
    if (this.joystick) {
      this.joystick.removeEventListener('pointerdown', this.onJoyDown)
      this.joystick.removeEventListener('pointermove', this.onJoyMove)
      this.joystick.removeEventListener('pointerup', this.onJoyUp)
      this.joystick.removeEventListener('pointercancel', this.onJoyUp)
    }
    if (this.actionBtn) {
      this.actionBtn.removeEventListener('pointerdown', this.onActionDown)
    }
    if (this.root && this.root.parentNode) {
      this.root.parentNode.removeChild(this.root)
    }
    this.root = null
    this.joystick = null
    this.knob = null
    this.actionBtn = null
  }

  private injectStyle(): void {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = STYLE
    document.head.appendChild(style)
  }

  private handleJoyDown(e: PointerEvent): void {
    if (this.joyPointerId !== null) return
    this.joyPointerId = e.pointerId
    try {
      this.joystick?.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    this.updateJoy(e)
    e.preventDefault()
  }

  private handleJoyMove(e: PointerEvent): void {
    if (e.pointerId !== this.joyPointerId) return
    this.updateJoy(e)
    e.preventDefault()
  }

  private handleJoyUp(e: PointerEvent): void {
    if (e.pointerId !== this.joyPointerId) return
    this.joyPointerId = null
    try {
      this.joystick?.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    this.setTarget(0, 0)
    this.resetKnob()
    e.preventDefault()
  }

  private updateJoy(e: PointerEvent): void {
    if (!this.joystick) return
    const rect = this.joystick.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = e.clientX - cx
    let dy = e.clientY - cy

    // Normalize to -1..1 against the joystick radius.
    let nx = dx / JOY_RADIUS
    let ny = dy / JOY_RADIUS
    const mag = Math.hypot(nx, ny)
    if (mag > 1) {
      nx /= mag
      ny /= mag
    }

    // Screen y is down-positive; forward is up → invert y.
    this.setTarget(nx, -ny)

    // Move the knob (clamped travel).
    const knobMag = Math.min(KNOB_MAX, Math.hypot(dx, dy))
    const ang = Math.atan2(dy, dx)
    const kx = Math.cos(ang) * knobMag
    const ky = Math.sin(ang) * knobMag
    if (this.knob) {
      this.knob.style.transform = `translate(${kx}px, ${ky}px)`
    }
  }

  private resetKnob(): void {
    if (this.knob) this.knob.style.transform = 'translate(0px, 0px)'
  }

  private handleActionDown(e: PointerEvent): void {
    this.fireInteract()
    e.preventDefault()
  }
}
