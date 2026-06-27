/**
 * TitleScreen — the first thing a child sees.
 *
 * One giant "Tik om te spelen" button (this tap doubles as the audio-unlock
 * gesture — GameApp calls audio.unlock() inside onStart, not us). When a save
 * exists, the same button continues the adventure and a small, parent-gated
 * "opnieuw beginnen" control appears: it requires a 3-second long-press so a
 * pre-reader can't wipe the save by accident.
 */

import type { AudioService } from '@/audio/AudioService'

/**
 * A "real but simple" parent gate: the child must hold the control down for
 * `holdMs` continuously. A fill bar visualises progress; releasing early aborts.
 * Returns a cleanup that removes all listeners and clears the pending timer.
 */
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
    // Drive the fill over the full hold duration.
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

export interface TitleScreenOpts {
  hasSave: boolean
  onStart: () => void
  onReset: () => void
}

export class TitleScreen {
  private readonly el: HTMLElement
  private readonly cleanups: Array<() => void> = []

  constructor(root: HTMLElement, audio: AudioService, opts: TitleScreenOpts) {
    this.el = document.createElement('div')
    this.el.className = 'ui-panel title-screen'

    // Playful, layered title.
    const heading = document.createElement('h1')
    heading.className = 'title-heading'
    for (const word of ['Dino', 'Dagje', 'Uit']) {
      const span = document.createElement('span')
      span.className = 'title-word'
      span.textContent = word
      heading.appendChild(span)
    }
    const dino = document.createElement('div')
    dino.className = 'title-mascot'
    dino.textContent = '🦕'
    dino.setAttribute('aria-hidden', 'true')

    // The one giant call-to-action.
    const play = document.createElement('button')
    play.type = 'button'
    play.className = 'big-btn title-play'
    const playIcon = document.createElement('span')
    playIcon.className = 'title-play-icon'
    playIcon.textContent = '▶'
    const playLabel = document.createElement('span')
    playLabel.className = 'title-play-label'
    playLabel.textContent = opts.hasSave ? 'Verder spelen' : 'Tik om te spelen'
    play.append(playIcon, playLabel)
    play.addEventListener('click', () => {
      // Audio is still locked here; GameApp unlocks inside onStart.
      opts.onStart()
    })

    this.el.append(dino, heading, play)

    // Parent-gated reset, only when there is something to reset.
    if (opts.hasSave) {
      const gate = document.createElement('div')
      gate.className = 'reset-gate'

      const resetBtn = document.createElement('button')
      resetBtn.type = 'button'
      resetBtn.className = 'reset-btn'
      const fill = document.createElement('span')
      fill.className = 'hold-fill'
      const label = document.createElement('span')
      label.className = 'reset-label'
      label.textContent = '↺ opnieuw'
      const hint = document.createElement('span')
      hint.className = 'reset-hint'
      hint.textContent = 'voor ouders — 3 sec. vasthouden'
      resetBtn.append(fill, label)
      gate.append(resetBtn, hint)
      this.el.appendChild(gate)

      this.cleanups.push(
        attachHoldGate(resetBtn, fill, 3000, () => {
          audio.sfx('confirm')
          opts.onReset()
        }),
      )
    }

    root.appendChild(this.el)
  }

  destroy(): void {
    for (const c of this.cleanups) c()
    this.cleanups.length = 0
    this.el.remove()
  }
}
