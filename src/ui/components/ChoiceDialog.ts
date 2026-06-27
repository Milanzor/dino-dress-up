/**
 * ChoiceDialog — the modal-ish picture-choice row.
 *
 * A bottom-centered row of BIG picture buttons (one per choice). It is the only
 * interactive surface (its own pointer-events) but it never fully blacks out the
 * dino behind it.
 *
 * Interaction (tap-to-hear / tap-to-confirm) keeps pre-readers safe from
 * accidental commits:
 *   1. First tap on a button  → play its prompt + glow/pulse it (clear others).
 *   2. Second tap on the SAME glowing button → confirm sfx + onChoose(index).
 *   3. Tap a DIFFERENT button → just switch selection (re-hear, no commit).
 * Kids can re-listen as often as they like; nothing commits by accident.
 */

import type { AudioService } from '@/audio/AudioService'
import type { PictureChoice } from '@/story/events'

export interface ChoiceDialogOpts {
  onChoose: (index: number) => void
}

/** Friendly emoji fallbacks for known icon ids (when the SVG is missing). */
const ICON_EMOJI: Record<string, string> = {
  ball: '⚽',
  butterfly: '🦋',
  meadow: '🌸',
  river: '💦',
  hat: '👒',
  sunhat: '👒',
  cape: '🧥',
  raincape: '🧥',
  crown: '👑',
  stones: '🪨',
  bronto: '🦕',
  search: '🔍',
}

function iconVisual(iconId: string): HTMLElement {
  const wrap = document.createElement('span')
  wrap.className = 'ui-icon'

  const fallback = document.createElement('span')
  fallback.className = 'ui-icon-fallback'
  fallback.textContent = ICON_EMOJI[iconId] ?? iconId.charAt(0).toUpperCase()

  const img = document.createElement('img')
  img.className = 'ui-icon-img'
  img.alt = ''
  img.src = `/icons/${iconId}.svg`
  img.addEventListener('error', () => img.remove())

  wrap.append(fallback, img)
  return wrap
}

export class ChoiceDialog {
  private readonly el: HTMLElement
  private readonly audio: AudioService
  private readonly opts: ChoiceDialogOpts
  private readonly buttons: HTMLButtonElement[] = []
  private selected: number | null = null

  constructor(
    root: HTMLElement,
    audio: AudioService,
    choices: PictureChoice[],
    opts: ChoiceDialogOpts,
  ) {
    this.audio = audio
    this.opts = opts

    this.el = document.createElement('div')
    this.el.className = 'ui-panel choice-dialog'

    const row = document.createElement('div')
    row.className = 'choice-row'

    choices.forEach((choice) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'big-btn choice-btn'
      btn.append(iconVisual(choice.iconId))
      btn.addEventListener('click', () => this.onTap(choice, btn))
      row.appendChild(btn)
      this.buttons.push(btn)
    })

    this.el.appendChild(row)
    root.appendChild(this.el)
  }

  private onTap(choice: PictureChoice, btn: HTMLButtonElement): void {
    if (this.selected === choice.index) {
      // Second tap on the already-glowing button → commit.
      this.audio.sfx('confirm')
      this.opts.onChoose(choice.index)
      return
    }

    // First tap (or switching): select, re-hear, no commit.
    this.selected = choice.index
    this.audio.sfx('pop')
    void this.audio.prompt(choice.audioClip)

    for (const b of this.buttons) b.classList.toggle('selected', b === btn)
  }

  destroy(): void {
    this.el.remove()
  }
}
