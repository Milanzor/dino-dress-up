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
  nest: {
    id: 'nest',
    environment: 'nest',
    lighting: 'day',
    spawn: { position: [0, 0, 2], rotationY: Math.PI },
    bounds: { x: 10, z: 10 },
    ambient: 'ambient_home',
    palette: { ground: '#9bd67a', accent: '#b08a5a' },
  },
  fork: {
    id: 'fork',
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
  meadow: {
    id: 'meadow',
    environment: 'meadow',
    lighting: 'day',
    spawn: { position: [0, 0, 5], rotationY: Math.PI },
    bounds: { x: 12, z: 12 },
    ambient: 'ambient_meadow',
    palette: { ground: '#86d96a', accent: '#ff7ab6' },
  },
  river: {
    id: 'river',
    environment: 'river',
    lighting: 'day',
    spawn: { position: [0, 0, 5], rotationY: Math.PI },
    bounds: { x: 12, z: 9 },
    ambient: 'ambient_river',
    palette: { ground: '#a9d98a', accent: '#5fb8ff' },
  },
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
