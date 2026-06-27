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

// Real assets: Quaternius "Animated Dinosaurs" pack (CC0). Each is a single
// skinned mesh sharing a 29-bone rig with bones named Head/Back/Neck and clips
// named `Armature|<Species>_<Idle|Walk|Run|Jump|Attack|Death>`. DinoFactory
// normalizes each model's native height (rex≈14.7, trike≈8.9, bronto≈11.0 units)
// down to `height` below, so these are the desired *world* heights (as with the
// procedural path). Socket `scale` inverts the ~32x (bronto ~60x) bone world
// scale so the procedural accessory meshes mount at roughly unit size; the
// socket positions are approximate nudges in bone-local space — tune visually.
export const RIGS: Record<Species, RigManifest> = {
  rex: {
    url: 'models/rex.glb',
    height: 1.6,
    // Trex materials: LightGreen/Green(body), LightYellow(belly), Black(eyes),
    // Red(mouth/claws). Body recolors; belly tints; eyes/mouth are kept.
    materialSlots: { body: ['LightGreen', 'Green'], belly: ['LightYellow'] },
    bones: { head: 'Head', back: 'Back', neck: 'Neck' },
    sockets: {
      head: { position: [0, 0.008, 0.002], rotation: [0, 0, 0], scale: 0.031 },
      back: { position: [0, 0.006, 0], rotation: [0, 0, 0], scale: 0.031 },
      neck: { position: [0, 0.004, 0.003], rotation: [0, 0, 0], scale: 0.031 },
    },
    clips: { idle: 'Armature|TRex_Idle', walk: 'Armature|TRex_Walk', happy: 'Armature|TRex_Jump' },
  },
  trike: {
    url: 'models/trike.glb',
    height: 1.4,
    // Triceratops: 'Purple' is the main body area (recolors); Brown/LightBrown
    // (horns/beak/feet) are kept as darker accents.
    materialSlots: { body: ['Purple'], belly: [] },
    bones: { head: 'Head', back: 'Back', neck: 'Neck' },
    sockets: {
      head: { position: [0, 0.008, 0.004], rotation: [0, 0, 0], scale: 0.032 },
      back: { position: [0, 0.006, 0], rotation: [0, 0, 0], scale: 0.032 },
      neck: { position: [0, 0.004, 0.003], rotation: [0, 0, 0], scale: 0.032 },
    },
    clips: { idle: 'Armature|Triceratops_Idle', walk: 'Armature|Triceratops_Walk', happy: 'Armature|Triceratops_Jump' },
  },
  bronto: {
    url: 'models/bronto.glb',
    height: 2.2,
    // Apatosaurus: 'Brown' is the main body (recolors); 'Material' is the
    // lighter underside → belly tint.
    materialSlots: { body: ['Brown'], belly: ['Material'] },
    bones: { head: 'Head', back: 'Back', neck: 'Neck' },
    sockets: {
      head: { position: [0, 0.004, 0.002], rotation: [0, 0, 0], scale: 0.017 },
      back: { position: [0, 0.004, 0], rotation: [0, 0, 0], scale: 0.017 },
      neck: { position: [0, 0.003, 0.002], rotation: [0, 0, 0], scale: 0.017 },
    },
    clips: { idle: 'Armature|Apatosaurus_Idle', walk: 'Armature|Apatosaurus_Walk', happy: 'Armature|Apatosaurus_Jump' },
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
