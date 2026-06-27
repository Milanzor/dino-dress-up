/**
 * CharacterCreator — the dress-up workshop.
 *
 * Layout is deliberately edge-hugging: a vertical category rail on the LEFT and
 * a bottom sheet of big option buttons. The center/right stays clear so the live
 * 3D dino preview (rendered on the canvas behind us) is always visible. Every
 * edit mutates a local draft, speaks the option's Dutch label, and fires
 * onChange immediately so the preview re-applies in real time. The big "Klaar!"
 * button commits the draft via onConfirm.
 *
 * No reading required: categories and options are icons / colour swatches; the
 * label text is decorative and backed by audio.
 */

import type { AudioService } from '@/audio/AudioService'
import {
  ACCESSORIES,
  BELLY_COLORS,
  BODY_COLORS,
  PATTERNS,
  RIGS,
  type AccessorySlot,
  type CharacterConfig,
  type Pattern,
  type Species,
} from '@/character/CharacterConfig'

export interface CharacterCreatorOpts {
  initial: CharacterConfig
  onChange: (draft: CharacterConfig) => void
  onConfirm: (final: CharacterConfig) => void
}

type CategoryId = 'soort' | 'kleur' | 'buik' | 'patroon' | 'spullen'

interface Category {
  id: CategoryId
  labelNl: string
  emoji: string
}

const CATEGORIES: Category[] = [
  { id: 'soort', labelNl: 'Soort', emoji: '🦖' },
  { id: 'kleur', labelNl: 'Kleur', emoji: '🎨' },
  { id: 'buik', labelNl: 'Buik', emoji: '🫧' },
  { id: 'patroon', labelNl: 'Patroon', emoji: '✨' },
  { id: 'spullen', labelNl: 'Spullen', emoji: '🎒' },
]

const SPECIES_LABEL: Record<Species, string> = {
  rex: 'Rex',
  trike: 'Trix',
  bronto: 'Bronto',
}

const SPECIES_EMOJI: Record<Species, string> = {
  rex: '🦖',
  trike: '🦕',
  bronto: '🦴',
}

const SLOT_EMOJI: Record<AccessorySlot, string> = {
  head: '👒',
  back: '🎒',
  neck: '🧣',
}

const PATTERN_EMOJI: Record<Pattern, string> = {
  none: '⬜',
  spots: '🔵',
  stripes: '🦓',
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
  explorerpack: '🎒',
  scarf: '🧣',
  none: '🚫',
}

/** Builds an icon visual: an <img> that falls back to a coloured emoji tile. */
function iconVisual(iconId: string, emoji: string, color?: string): HTMLElement {
  const wrap = document.createElement('span')
  wrap.className = 'ui-icon'

  const fallback = document.createElement('span')
  fallback.className = 'ui-icon-fallback'
  fallback.textContent = emoji
  if (color) fallback.style.background = color

  const img = document.createElement('img')
  img.className = 'ui-icon-img'
  img.alt = ''
  img.src = `/icons/${iconId}.svg`
  img.addEventListener('error', () => img.remove())

  // Fallback sits underneath; the img (if it loads) paints over it.
  wrap.append(fallback, img)
  return wrap
}

export class CharacterCreator {
  private readonly el: HTMLElement
  private readonly sheetBody: HTMLElement
  private readonly audio: AudioService
  private readonly opts: CharacterCreatorOpts

  private draft: CharacterConfig
  private active: CategoryId = 'soort'
  private readonly railButtons = new Map<CategoryId, HTMLButtonElement>()

  constructor(
    root: HTMLElement,
    audio: AudioService,
    opts: CharacterCreatorOpts,
  ) {
    this.audio = audio
    this.opts = opts
    this.draft = structuredClone(opts.initial)

    this.el = document.createElement('div')
    this.el.className = 'ui-panel creator'

    // ── Left category rail ────────────────────────────────────────────────
    const rail = document.createElement('nav')
    rail.className = 'creator-rail'
    for (const cat of CATEGORIES) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'rail-btn'
      const ic = document.createElement('span')
      ic.className = 'rail-icon'
      ic.textContent = cat.emoji
      const lbl = document.createElement('span')
      lbl.className = 'rail-label'
      lbl.textContent = cat.labelNl
      btn.append(ic, lbl)
      btn.addEventListener('click', () => {
        this.audio.speak(cat.labelNl)
        this.setActive(cat.id)
      })
      rail.appendChild(btn)
      this.railButtons.set(cat.id, btn)
    }

    // ── Bottom sheet of options ───────────────────────────────────────────
    const sheet = document.createElement('section')
    sheet.className = 'creator-sheet'
    this.sheetBody = document.createElement('div')
    this.sheetBody.className = 'sheet-body'

    const klaar = document.createElement('button')
    klaar.type = 'button'
    klaar.className = 'big-btn klaar-btn'
    const klaarIcon = document.createElement('span')
    klaarIcon.textContent = '✅'
    const klaarLabel = document.createElement('span')
    klaarLabel.textContent = 'Klaar!'
    klaar.append(klaarIcon, klaarLabel)
    klaar.addEventListener('click', () => {
      this.audio.sfx('confirm')
      this.opts.onConfirm(structuredClone(this.draft))
    })

    sheet.append(this.sheetBody, klaar)
    this.el.append(rail, sheet)
    root.appendChild(this.el)

    this.setActive('soort')
    // Welcome narration when the workshop opens.
    void this.audio.narrate('creator_intro')
  }

  private setActive(id: CategoryId): void {
    this.active = id
    for (const [catId, btn] of this.railButtons) {
      btn.classList.toggle('active', catId === id)
    }
    this.renderOptions()
  }

  /** Push the current draft to the live 3D preview. */
  private emitChange(): void {
    this.opts.onChange(structuredClone(this.draft))
  }

  /** Rebuild the sheet body for the active category. */
  private renderOptions(): void {
    const body = this.sheetBody
    body.replaceChildren()

    switch (this.active) {
      case 'soort':
        body.appendChild(this.buildSpecies())
        break
      case 'kleur':
        body.appendChild(
          this.buildSwatches(
            BODY_COLORS,
            () => this.draft.bodyColor,
            (sw) => {
              this.draft.bodyColor = sw.hex
            },
          ),
        )
        break
      case 'buik':
        body.appendChild(
          this.buildSwatches(
            BELLY_COLORS,
            () => this.draft.bellyColor,
            (sw) => {
              this.draft.bellyColor = sw.hex
            },
          ),
        )
        break
      case 'patroon':
        body.appendChild(this.buildPatterns())
        break
      case 'spullen':
        body.appendChild(this.buildAccessories())
        break
    }
  }

  private optionRow(): HTMLElement {
    const row = document.createElement('div')
    row.className = 'sheet-options'
    return row
  }

  private buildSpecies(): HTMLElement {
    const row = this.optionRow()
    for (const species of Object.keys(RIGS) as Species[]) {
      const label = SPECIES_LABEL[species]
      const btn = this.optionButton(
        iconVisual(species, SPECIES_EMOJI[species]),
        label,
        () => this.draft.species === species,
        () => {
          this.draft.species = species
        },
      )
      row.appendChild(btn)
    }
    return row
  }

  private buildSwatches(
    swatches: { id: string; hex: string; labelNl: string }[],
    current: () => string | undefined,
    apply: (sw: { hex: string; labelNl: string }) => void,
  ): HTMLElement {
    const row = this.optionRow()
    for (const sw of swatches) {
      const chip = document.createElement('span')
      chip.className = 'swatch'
      chip.style.background = sw.hex
      const btn = this.optionButton(
        chip,
        sw.labelNl,
        () => current() === sw.hex,
        () => apply(sw),
      )
      row.appendChild(btn)
    }
    return row
  }

  private buildPatterns(): HTMLElement {
    const row = this.optionRow()
    for (const pat of PATTERNS) {
      const btn = this.optionButton(
        iconVisual(`pattern-${pat.id}`, PATTERN_EMOJI[pat.id]),
        pat.labelNl,
        () => this.draft.pattern === pat.id,
        () => {
          this.draft.pattern = pat.id
        },
      )
      row.appendChild(btn)
    }
    return row
  }

  private buildAccessories(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'sheet-groups'

    const slots: AccessorySlot[] = ['head', 'back', 'neck']
    for (const slot of slots) {
      const group = document.createElement('div')
      group.className = 'sheet-group'

      const head = document.createElement('span')
      head.className = 'group-head'
      head.textContent = SLOT_EMOJI[slot]
      head.setAttribute('aria-hidden', 'true')
      group.appendChild(head)

      const row = this.optionRow()
      const inSlot = ACCESSORIES.filter((a) => a.slot === slot)
      // Always offer a "niets" (none) option per slot.
      const hasNone = inSlot.some((a) => a.id === 'none')
      if (!hasNone) {
        inSlot.unshift({ id: 'none', slot, labelNl: 'niets', color: '#dfe7ef' })
      }
      for (const acc of inSlot) {
        const emoji = ICON_EMOJI[acc.id] ?? '🎀'
        const btn = this.optionButton(
          iconVisual(acc.id, emoji, acc.id === 'none' ? undefined : acc.color),
          acc.labelNl,
          () => this.accessoryId(slot) === acc.id,
          () => this.setAccessory(slot, acc.id),
        )
        row.appendChild(btn)
      }
      group.appendChild(row)
      container.appendChild(group)
    }
    return container
  }

  private accessoryId(slot: AccessorySlot): string {
    return this.draft.accessories.find((a) => a.slot === slot)?.id ?? 'none'
  }

  private setAccessory(slot: AccessorySlot, id: string): void {
    const entry = this.draft.accessories.find((a) => a.slot === slot)
    if (entry) entry.id = id
    else this.draft.accessories.push({ slot, id })
  }

  /**
   * A big (>=96px) tappable option. `isSelected` decides the initial visual;
   * `apply` mutates the draft. Every tap speaks the label and emits a change so
   * the 3D preview updates live.
   */
  private optionButton(
    visual: HTMLElement,
    labelNl: string,
    isSelected: () => boolean,
    apply: () => void,
  ): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'opt-btn'
    btn.classList.toggle('selected', isSelected())

    const lbl = document.createElement('span')
    lbl.className = 'opt-label'
    lbl.textContent = labelNl

    btn.append(visual, lbl)
    btn.addEventListener('click', () => {
      apply()
      // Refresh selected state across the visible row.
      const siblings = btn.parentElement?.querySelectorAll('.opt-btn')
      siblings?.forEach((s) => s.classList.remove('selected'))
      btn.classList.add('selected')
      this.audio.sfx('pop')
      void this.audio.speak(labelNl)
      this.emitChange()
    })
    return btn
  }

  destroy(): void {
    // Listeners are bound to elements we are about to remove; dropping the
    // subtree releases them for GC. No timers held.
    this.el.remove()
  }
}
