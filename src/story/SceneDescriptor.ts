/**
 * SceneDescriptor — pure data describing one 3D location ("scene"/level).
 *
 * SceneManager consumes this to build/tear down the active environment. It is
 * deliberately declarative (no Three.js types) so levels/scenes.ts stays a
 * readable registry and StoryEngine can reference scenes by id alone.
 */

export type EnvironmentKind =
  | 'nest' // home
  | 'meadow' // bloemenwei
  | 'river' // rivier
  | 'forest' // fluisterbos
  | 'cave' // glittergrotten
  | 'festival' // het grote dino feest

export type LightingPreset = 'day' | 'sunset' | 'cave' | 'rain'

export interface InteractionZone {
  /** Stable id; StoryEngine matches `interact` against this. */
  id: string
  /** World-space position the glowing zone sits at. */
  position: [number, number, number]
  radius: number
}

export interface SceneDescriptor {
  id: string
  environment: EnvironmentKind
  lighting: LightingPreset
  /** Where the dino spawns/stands when this scene loads. */
  spawn: { position: [number, number, number]; rotationY: number }
  /** Soft-bound rectangle (half-extents on x/z) the dino is nudged back into. */
  bounds: { x: number; z: number }
  /** Ambient audio loop clip id (see AudioManifest), if any. */
  ambient?: string
  /** Optional glowing interaction zones the child can step into. */
  zones?: InteractionZone[]
  /** Accent/ground color hints the environment builder may use. */
  palette?: { ground?: string; accent?: string }
}
