/**
 * HUD — the deliberately tiny in-story overlay.
 *
 * Just one unobtrusive corner button that opens the parent menu. Like the reset
 * on the title screen it is parent-gated: a 3-second long-press (a child won't
 * stumble into it) drives a fill ring before firing onMenu.
 */

import type { AudioService } from '@/audio/AudioService'

export interface HUDOpts {
  onMenu?: () => void
}

/** Hold-to-activate gate; returns a cleanup for all listeners/timers. */
function attachHoldGate(
  btn: HTMLElement,
  fill: HTMLElement,
  holdMs: number,
  onComplete: () => void,
): () => void {
  let timer: number | null = null

  const reset = (): void => {
    if (timer !== null) {
      window.clearTimeout(timer)
      timer = null
    }
    fill.style.transition = 'width 200ms ease'
    fill.style.width = '0%'
    btn.classList.remove('holding')
  }

  const start = (ev: Event): void => {
    ev.preventDefault()
    if (timer !== null) return
    btn.classList.add('holding')
    fill.style.transition = `width ${holdMs}ms linear`
    fill.style.width = '100%'
    timer = window.setTimeout(() => {
      timer = null
      reset()
      onComplete()
    }, holdMs)
  }

  btn.addEventListener('pointerdown', start)
  btn.addEventListener('pointerup', reset)
  btn.addEventListener('pointerleave', reset)
  btn.addEventListener('pointercancel', reset)

  return () => {
    reset()
    btn.removeEventListener('pointerdown', start)
    btn.removeEventListener('pointerup', reset)
    btn.removeEventListener('pointerleave', reset)
    btn.removeEventListener('pointercancel', reset)
  }
}

export class HUD {
  private readonly el: HTMLElement
  private readonly cleanups: Array<() => void> = []

  constructor(root: HTMLElement, audio: AudioService, opts: HUDOpts) {
    this.el = document.createElement('div')
    this.el.className = 'ui-panel hud'

    const menu = document.createElement('button')
    menu.type = 'button'
    menu.className = 'hud-menu-btn'
    const fill = document.createElement('span')
    fill.className = 'hold-fill'
    const icon = document.createElement('span')
    icon.className = 'hud-menu-icon'
    icon.textContent = '☰'
    menu.append(fill, icon)
    this.el.appendChild(menu)

    this.cleanups.push(
      attachHoldGate(menu, fill, 3000, () => {
        audio.sfx('confirm')
        opts.onMenu?.()
      }),
    )

    root.appendChild(this.el)
  }

  destroy(): void {
    for (const c of this.cleanups) c()
    this.cleanups.length = 0
    this.el.remove()
  }
}
