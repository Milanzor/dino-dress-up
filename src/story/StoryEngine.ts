/**
 * StoryEngine — the runtime bridge between inkjs and the rest of the game.
 *
 * Pre-readers can't read, so Ink's visible TEXT is ignored entirely. Meaning is
 * carried by TAGS: this engine drives Continue() and maps the tags on each line
 * into the typed Beat / PictureChoice / StoryStep events the game loop consumes.
 *
 * Runtime uses the light inkjs build (`inkjs`); the JSON is compiled ahead of
 * time by tools/compile-ink.mjs (`npm run compile-ink`).
 */

import { Story } from 'inkjs'
import storyJson from './story.json'
import type { Beat, PictureChoice, StoryStep } from './events'

/** Split an Ink tag like "narrate:nest_intro" into ['narrate', 'nest_intro']. */
function parseTag(tag: string): { key: string; value: string } {
  const idx = tag.indexOf(':')
  if (idx === -1) return { key: tag.trim(), value: '' }
  return { key: tag.slice(0, idx).trim(), value: tag.slice(idx + 1).trim() }
}

/** Read whatever tag array inkjs exposes on a choice, defensively. */
function choiceTags(choice: { tags?: string[] | null }): string[] {
  return Array.isArray(choice.tags) ? choice.tags : []
}

export class StoryEngine {
  private story: Story

  /**
   * Ending id captured from an `ending:` tag on a beat. Surfaced as a
   * {kind:'end'} step once the story can no longer continue and has no choices.
   */
  private pendingEnding: string | null = null

  constructor() {
    this.story = new Story(storyJson)
  }

  /** Reset to a fresh story state (new playthrough). */
  reset(): void {
    this.story.ResetState()
    this.pendingEnding = null
  }

  /**
   * Advance the story. Runs Continue() until it captures one content-bearing
   * beat (a line with tags and/or visible text), skipping blank lines. Each
   * narrate clip is its own line, so successive beats arrive over successive
   * next() calls. When no content remains, yields choices or the ending.
   */
  next(): StoryStep {
    const beat: Beat = { tags: [] }
    let captured = false

    while (this.story.canContinue) {
      const text = this.story.Continue() ?? ''
      const tags = this.story.currentTags ?? []

      for (const raw of tags) {
        beat.tags.push(raw)
        const { key, value } = parseTag(raw)
        switch (key) {
          case 'scene':
            beat.sceneId = value
            break
          case 'narrate':
            beat.narrateClip = value
            break
          case 'ambient':
            beat.ambient = value
            break
          case 'ending':
            this.pendingEnding = value
            break
        }
      }

      if (tags.length > 0 || text.trim().length > 0) {
        captured = true
        break
      }
    }

    if (captured) {
      return { kind: 'beat', beat }
    }

    const choices = this.currentChoices()
    if (choices.length > 0) {
      return { kind: 'choices', choices }
    }

    if (this.pendingEnding !== null) {
      return { kind: 'end', endingId: this.pendingEnding }
    }

    return { kind: 'end', endingId: 'done' }
  }

  /** Pick a choice by its PictureChoice.index. */
  choose(index: number): void {
    this.story.ChooseChoiceIndex(index)
  }

  /** Current picture choices (empty when not at a choice point). */
  currentChoices(): PictureChoice[] {
    const choices = this.story.currentChoices ?? []
    return choices.map((choice) => {
      let iconId = '?'
      let audioClip = ''
      for (const raw of choiceTags(choice)) {
        const { key, value } = parseTag(raw)
        if (key === 'icon') iconId = value
        else if (key === 'audio') audioClip = value
      }
      if (!audioClip) audioClip = `choice_${choice.index}`
      return { index: choice.index, iconId, audioClip }
    })
  }

  canContinue(): boolean {
    return this.story.canContinue
  }

  /** Serialize Ink's full runtime state for the save envelope. */
  saveState(): string {
    return this.story.state.ToJson()
  }

  /** Restore from a serialized state string; fail-soft (false on bad data). */
  loadState(state: string): boolean {
    try {
      this.story.state.LoadJson(state)
      return true
    } catch {
      return false
    }
  }

  /** Read an Ink variable (friend, outfit, …) for the album/recap. */
  getVar(name: string): unknown {
    try {
      return this.story.variablesState.$(name)
    } catch {
      return undefined
    }
  }
}
