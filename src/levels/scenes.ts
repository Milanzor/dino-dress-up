/**
 * scenes.ts — the data-driven SceneDescriptor registry.
 *
 * StoryEngine references scenes by id (via `# scene:<id>` Ink tags); this map is
 * the single place that turns those ids into a buildable environment. Ids here
 * MUST match the ones authored in story.ink and the ambient clip ids in the
 * AudioManifest.
 */

import type { SceneDescriptor } from '@/story/SceneDescriptor'

export const SCENES: Record<string, SceneDescriptor> = {
  // Chapter 1: Thuis — home nest (title backdrop + creator stage).
  nest: {
    id: 'nest',
    environment: 'nest',
    lighting: 'day',
    spawn: { position: [0, 0, 2], rotationY: Math.PI },
    bounds: { x: 10, z: 10 },
    ambient: 'ambient_home',
    palette: { ground: '#9bd67a', accent: '#b08a5a' },
  },
  // Chapter 2: De Wijde Wereld In — goodbye + the fork.
  wereld: {
    id: 'wereld',
    environment: 'meadow',
    lighting: 'day',
    spawn: { position: [0, 0, 4], rotationY: Math.PI },
    bounds: { x: 11, z: 11 },
    ambient: 'ambient_meadow',
    palette: { ground: '#8fd96a', accent: '#ffd93d' },
    zones: [
      { id: 'path_meadow', position: [-5, 0, -3], radius: 1.6 },
      { id: 'path_river', position: [5, 0, -3], radius: 1.6 },
    ],
  },
  // Chapter 3: Bloemenwei — help Trix + the shell.
  wei: {
    id: 'wei',
    environment: 'meadow',
    lighting: 'day',
    spawn: { position: [0, 0, 5], rotationY: Math.PI },
    bounds: { x: 12, z: 12 },
    ambient: 'ambient_meadow',
    palette: { ground: '#86d96a', accent: '#ff7ab6' },
  },
  // Chapter 4: Rivier — crossing + baby Ptera.
  rivier: {
    id: 'rivier',
    environment: 'river',
    lighting: 'day',
    spawn: { position: [0, 0, 5], rotationY: Math.PI },
    bounds: { x: 12, z: 9 },
    ambient: 'ambient_river',
    palette: { ground: '#a9d98a', accent: '#5fb8ff' },
  },
  // Chapter 5a: Fluisterbos — cozy woods.
  bos: {
    id: 'bos',
    environment: 'forest',
    lighting: 'day',
    spawn: { position: [0, 0, 5], rotationY: Math.PI },
    bounds: { x: 12, z: 12 },
    ambient: 'ambient_forest',
    palette: { ground: '#5fa85a', accent: '#7fd07a' },
  },
  // Chapter 5b: Glittergrotten — crystal colour match.
  grot: {
    id: 'grot',
    environment: 'cave',
    lighting: 'cave',
    spawn: { position: [0, 0, 5], rotationY: Math.PI },
    bounds: { x: 10, z: 10 },
    ambient: 'ambient_cave',
    palette: { ground: '#3a3358', accent: '#b48cff' },
  },
  // Chapter 6: De Verrassing — sudden rain.
  regen: {
    id: 'regen',
    environment: 'meadow',
    lighting: 'rain',
    spawn: { position: [0, 0, 5], rotationY: Math.PI },
    bounds: { x: 11, z: 11 },
    ambient: 'ambient_rain',
    palette: { ground: '#7bbf6a', accent: '#9fc6e8' },
  },
  // Chapter 7: Klaarmaken — pick your act.
  klaar: {
    id: 'klaar',
    environment: 'festival',
    lighting: 'sunset',
    spawn: { position: [0, 0, 6], rotationY: Math.PI },
    bounds: { x: 12, z: 12 },
    ambient: 'ambient_festival',
    palette: { ground: '#9bd67a', accent: '#ffb86b' },
  },
  // Chapter 8: Het Grote Dino Feest — the finale.
  festival: {
    id: 'festival',
    environment: 'festival',
    lighting: 'sunset',
    spawn: { position: [0, 0, 6], rotationY: Math.PI },
    bounds: { x: 12, z: 12 },
    ambient: 'ambient_festival',
    palette: { ground: '#9bd67a', accent: '#ff6b6b' },
  },
}

/** A safe fallback so an unknown scene id never crashes the loop. */
export const FALLBACK_SCENE_ID = 'nest'

export function getScene(id: string | null | undefined): SceneDescriptor {
  if (id && SCENES[id]) return SCENES[id]
  return SCENES[FALLBACK_SCENE_ID]
}
