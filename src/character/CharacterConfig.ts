/**
 * CharacterConfig — the serializable description of a child's dino.
 *
 * This is the single source of truth for "what does my dino look like". It is
 * stored verbatim in the save envelope (see save/schema.ts) and consumed by
 * DinoFactory to build/recolor/accessorize a 3D actor.
 *
 * The RIGS manifest at the bottom is the one file that absorbs per-species
 * model quirks: which material slots to recolor, which bones carry accessories,
 * the socket offsets, and the semantic animation clip names. Swapping the
 * procedural placeholder dino for a real Quaternius glTF is a change *here*
 * (and in DinoFactory's loader path), nowhere else.
 */

/** Species available in the creator. v1 ships one; the manifest scales to more. */
export type Species = 'rex' | 'trike' | 'bronto'

/** Body pattern overlay. Authored tiling textures live in public/textures/. */
export type Pattern = 'none' | 'spots' | 'stripes'

/** Where an accessory can mount. Maps to a bone via the RIGS manifest. */
export type AccessorySlot = 'head' | 'back' | 'neck'

export interface AccessoryChoice {
  slot: AccessorySlot
  /** Accessory id; 'none' means nothing mounted in that slot. */
  id: string
}

export interface CharacterConfig {
  species: Species
  /** Hex string, e.g. '#7ed957'. Applied to the body material slot. */
  bodyColor: string
  /** Optional belly tint; falls back to a lightened bodyColor when absent. */
  bellyColor?: string
  pattern: Pattern
  accessories: AccessoryChoice[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Authoring palettes — what the CharacterCreator renders as icon buttons.
// Kept here (not in the UI) so the model layer and UI agree on valid values.
// ─────────────────────────────────────────────────────────────────────────────

export interface ColorSwatch {
  id: string
  hex: string
  /** Dutch label, used for the audio narration clip lookup. */
  labelNl: string
}

/** Bright, friendly, high-contrast colors — pre-reader palette. */
export const BODY_COLORS: ColorSwatch[] = [
  { id: 'green', hex: '#7ed957', labelNl: 'groen' },
  { id: 'blue', hex: '#4ea8ff', labelNl: 'blauw' },
  { id: 'pink', hex: '#ff8fc8', labelNl: 'roze' },
  { id: 'orange', hex: '#ff9f43', labelNl: 'oranje' },
  { id: 'purple', hex: '#b07cff', labelNl: 'paars' },
  { id: 'yellow', hex: '#ffd93d', labelNl: 'geel' },
]

export const BELLY_COLORS: ColorSwatch[] = [
  { id: 'cream', hex: '#fff3d6', labelNl: 'roomwit' },
  { id: 'white', hex: '#ffffff', labelNl: 'wit' },
  { id: 'peach', hex: '#ffd9b8', labelNl: 'perzik' },
  { id: 'mint', hex: '#c8f7d4', labelNl: 'mint' },
]

export const PATTERNS: { id: Pattern; labelNl: string }[] = [
  { id: 'none', labelNl: 'effen' },
  { id: 'spots', labelNl: 'stippen' },
  { id: 'stripes', labelNl: 'strepen' },
]

export interface AccessoryDef {
  id: string
  slot: AccessorySlot
  labelNl: string
  /** Default tint for the accessory mesh (procedural placeholder). Absent for 'none'. */
  color?: string
}

/**
 * Accessories selectable at creation (the festival/story can grant more later,
 * which simply append to this list as additional ids).
 */
export const ACCESSORIES: AccessoryDef[] = [
  { id: 'none', slot: 'head', labelNl: 'niets' },
  { id: 'sunhat', slot: 'head', labelNl: 'zonnehoed', color: '#ffd93d' },
  { id: 'crown', slot: 'head', labelNl: 'kroontje', color: '#ffcf40' },
  { id: 'raincape', slot: 'back', labelNl: 'regencape', color: '#4ea8ff' },
  { id: 'explorerpack', slot: 'back', labelNl: 'rugzak', color: '#a86b3c' },
  { id: 'scarf', slot: 'neck', labelNl: 'sjaal', color: '#ff6b6b' },
]

// ─────────────────────────────────────────────────────────────────────────────
// RIGS — per-species model manifest. The seam between CC0 assets and our code.
// ─────────────────────────────────────────────────────────────────────────────

export interface SocketOffset {
  position: [number, number, number]
  rotation: [number, number, number] // euler radians
  scale: number
}

export interface RigManifest {
  /** glTF url when using real assets; null → DinoFactory builds a placeholder. */
  url: string | null
  /** Approx standing height in world units; used by camera + accessory scaling. */
  height: number
  /** Material slot name → list of mesh/material names in the glTF to recolor. */
  materialSlots: {
    body: string[]
    belly: string[]
  }
  /** Accessory slot → bone name to parent to (real assets). */
  bones: Record<AccessorySlot, string>
  /** Accessory slot → placement offset relative to that bone/socket. */
  sockets: Record<AccessorySlot, SocketOffset>
  /** Semantic clip name → glTF animation clip name. */
  clips: {
    idle: string
    walk: string
    happy: string
  }
}

export const RIGS: Record<Species, RigManifest> = {
  rex: {
    url: null,
    height: 1.6,
    materialSlots: { body: ['body'], belly: ['belly'] },
    bones: { head: 'Head', back: 'Spine', neck: 'Neck' },
    sockets: {
      head: { position: [0, 1.45, 0.25], rotation: [0, 0, 0], scale: 1 },
      back: { position: [0, 1.05, -0.15], rotation: [0, 0, 0], scale: 1 },
      neck: { position: [0, 1.1, 0.18], rotation: [0, 0, 0], scale: 1 },
    },
    clips: { idle: 'Idle', walk: 'Walk', happy: 'Jump' },
  },
  trike: {
    url: null,
    height: 1.4,
    materialSlots: { body: ['body'], belly: ['belly'] },
    bones: { head: 'Head', back: 'Spine', neck: 'Neck' },
    sockets: {
      head: { position: [0, 1.2, 0.55], rotation: [0, 0, 0], scale: 1.1 },
      back: { position: [0, 1.0, -0.2], rotation: [0, 0, 0], scale: 1 },
      neck: { position: [0, 0.95, 0.3], rotation: [0, 0, 0], scale: 1 },
    },
    clips: { idle: 'Idle', walk: 'Walk', happy: 'Jump' },
  },
  bronto: {
    url: null,
    height: 2.2,
    materialSlots: { body: ['body'], belly: ['belly'] },
    bones: { head: 'Head', back: 'Spine', neck: 'Neck' },
    sockets: {
      head: { position: [0, 2.1, 0.6], rotation: [0, 0, 0], scale: 1 },
      back: { position: [0, 1.4, -0.2], rotation: [0, 0, 0], scale: 1.2 },
      neck: { position: [0, 1.6, 0.4], rotation: [0, 0, 0], scale: 1 },
    },
    clips: { idle: 'Idle', walk: 'Walk', happy: 'Jump' },
  },
}

/** A sensible starting dino for a brand-new player. */
export const DEFAULT_CHARACTER: CharacterConfig = {
  species: 'rex',
  bodyColor: '#7ed957',
  bellyColor: '#fff3d6',
  pattern: 'none',
  accessories: [
    { slot: 'head', id: 'none' },
    { slot: 'back', id: 'none' },
    { slot: 'neck', id: 'none' },
  ],
}
