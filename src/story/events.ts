/**
 * Story event contract — the typed bridge between inkjs and the 3D/audio/UI.
 *
 * StoryEngine parses Ink's *tags* (never its visible text — pre-readers can't
 * read) into these events. GameApp's story loop reacts to them. This file has
 * no inkjs or Three.js imports so every layer can share the vocabulary.
 *
 * Tag conventions authored in story.ink:
 *   # scene:meadow            → Beat.sceneId
 *   # narrate:meadow_intro    → Beat.narrateClip
 *   # ambient:birds           → Beat.ambient (optional override)
 *   On choices:
 *   * [ ] ... # icon:ball # audio:choice_searchgrass   → PictureChoice
 */

/** A single narrative beat surfaced between choices. */
export interface Beat {
  /** If set, switch to this scene before narrating. */
  sceneId?: string
  /** Dutch narration clip to play for this beat. */
  narrateClip?: string
  /** Optional ambient loop override for this beat. */
  ambient?: string
  /** Raw Ink tags for this beat (escape hatch for bespoke directives). */
  tags: string[]
}

/** One picture-choice button (no text shown; icon + Dutch audio only). */
export interface PictureChoice {
  /** Index into Ink's current choice list — pass back to choose(). */
  index: number
  /** Icon asset id (public/icons/<id>.svg|png). */
  iconId: string
  /** Dutch prompt clip id played on first tap (tap-to-hear). */
  audioClip: string
}

/**
 * What StoryEngine.next() yields each step:
 *  - 'beat'   → a narrative beat to present
 *  - 'choices'→ a modal picture-choice point
 *  - 'end'    → the story reached an ending (carries the ending variant id)
 */
export type StoryStep =
  | { kind: 'beat'; beat: Beat }
  | { kind: 'choices'; choices: PictureChoice[] }
  | { kind: 'end'; endingId: string }

/** A recorded choice, for the album/recap and debugging. */
export interface ChoiceRecord {
  sceneId: string
  iconId: string
  index: number
}
