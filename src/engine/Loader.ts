/**
 * Loader — GLTFLoader (+ DRACO/KTX2) with a small asset cache.
 *
 * v1 ships procedural placeholder dinos, so loadGLTF is optional infrastructure
 * that's ready the moment real CC0 glTF packs drop into public/models/. The
 * cache returns the same parsed glTF per url; callers clone with SkeletonUtils
 * (see DinoFactory) so skinned/animated meshes stay independent.
 */

import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import type * as THREE from 'three'

export class Loader {
  private gltf: GLTFLoader
  private cache = new Map<string, Promise<GLTF>>()

  constructor(renderer?: THREE.WebGLRenderer) {
    this.gltf = new GLTFLoader()

    // DRACO + KTX2 decoders served from CDN-free local paths when present.
    // Three's decoders can also be pointed at a CDN; we keep it local-friendly.
    const draco = new DRACOLoader()
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
    this.gltf.setDRACOLoader(draco)

    if (renderer) {
      const ktx2 = new KTX2Loader()
      ktx2.setTranscoderPath('https://unpkg.com/three@0.171.0/examples/jsm/libs/basis/')
      ktx2.detectSupport(renderer)
      this.gltf.setKTX2Loader(ktx2)
    }
  }

  /** Load (and cache) a glTF by url. Throws if the asset is missing. */
  loadGLTF(url: string): Promise<GLTF> {
    let pending = this.cache.get(url)
    if (!pending) {
      pending = this.gltf.loadAsync(url)
      this.cache.set(url, pending)
    }
    return pending
  }

  /** Whether a url has already been requested (cache hit available). */
  has(url: string): boolean {
    return this.cache.has(url)
  }

  dispose(): void {
    this.cache.clear()
  }
}
