/**
 * DinoFactory — turns a CharacterConfig into a live DinoActor.
 *
 * v1 builds a cute procedural placeholder dino from primitives; the glTF branch
 * (clone with SkeletonUtils, map materials/bones via the RIGS manifest, build
 * an AnimationMixer) is written and dormant until real assets land in
 * public/models — flip a RIG's `url` from null to a path and it activates.
 *
 * This is the single file that absorbs model quirks for recolor/patterns/
 * accessory-mounting, exactly as the plan requires.
 */

import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import type { Loader } from '@/engine/Loader'
import {
  RIGS,
  type CharacterConfig,
  type Species,
} from './CharacterConfig'
import { makeToonMaterial, applyRecolor } from './Recolor'
import { syncAccessories, type SocketMap } from './AccessoryMounter'
import { DinoActor, type DinoParts } from './DinoActor'

const REF_HEIGHT = 1.6 // the canonical procedural dino's height

export class DinoFactory {
  constructor(private loader: Loader) {}

  /** Build a fresh actor for a config (async because the glTF path loads). */
  async build(config: CharacterConfig): Promise<DinoActor> {
    const rig = RIGS[config.species]
    const parts = rig.url
      ? await this.buildFromGLTF(config.species, rig.url)
      : this.buildProcedural(config.species)

    applyRecolor(parts, config)
    syncAccessories(parts.sockets, config.accessories)
    return new DinoActor(parts)
  }

  /** Re-apply color/belly/pattern/accessories in place (creator live preview).
   *  Returns false if the species changed and a rebuild is required. */
  apply(actor: DinoActor, config: CharacterConfig): boolean {
    if (actor.parts.species !== config.species) return false
    applyRecolor(actor.parts, config)
    syncAccessories(actor.parts.sockets, config.accessories)
    return true
  }

  // ── Procedural placeholder dino ───────────────────────────────────────────
  private buildProcedural(species: Species): DinoParts {
    const rig = RIGS[species]
    const root = new THREE.Object3D()
    root.name = `dino:${species}`

    const bodyMat = makeToonMaterial('#7ed957')
    const bellyMat = makeToonMaterial('#fff3d6')
    const eyeWhite = makeToonMaterial('#ffffff')
    const eyeDark = makeToonMaterial('#26303a')

    // bodyNode carries the whole visible dino so a walk-bob moves it as one.
    const bodyNode = new THREE.Object3D()
    root.add(bodyNode)

    // Torso — a friendly egg.
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 16), bodyMat)
    torso.scale.set(1.0, 0.9, 1.45)
    torso.position.y = 1.05
    bodyNode.add(torso)

    // Belly — lighter patch on the lower front.
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 14), bellyMat)
    belly.scale.set(0.85, 0.85, 1.0)
    belly.position.set(0, 0.92, 0.35)
    bodyNode.add(belly)

    // Head — its own node so it can sway/nod.
    const headNode = new THREE.Object3D()
    headNode.position.set(0, 1.3, 0.95)
    bodyNode.add(headNode)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 16), bodyMat)
    headNode.add(head)
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.4), bodyMat)
    snout.position.set(0, -0.06, 0.34)
    headNode.add(snout)
    for (const sx of [-1, 1]) {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), eyeWhite)
      white.position.set(0.18 * sx, 0.12, 0.3)
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), eyeDark)
      pupil.position.set(0.2 * sx, 0.12, 0.37)
      headNode.add(white, pupil)
    }

    // Tail — cone tapering back, its own node to swish.
    const tailNode = new THREE.Object3D()
    tailNode.position.set(0, 1.0, -0.7)
    bodyNode.add(tailNode)
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.0, 14), bodyMat)
    tail.rotation.x = -Math.PI / 2
    tail.position.z = -0.45
    tailNode.add(tail)

    // Legs — two stcompy biped legs.
    const makeLeg = (sx: number) => {
      const node = new THREE.Object3D()
      node.position.set(0.28 * sx, 0.5, 0.05)
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.4, 6, 10), bodyMat)
      leg.position.y = -0.25
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.4), bodyMat)
      foot.position.set(0, -0.5, 0.1)
      node.add(leg, foot)
      bodyNode.add(node)
      return node
    }
    const legL = makeLeg(-1)
    const legR = makeLeg(1)

    // Little arms.
    const makeArm = (sx: number) => {
      const node = new THREE.Object3D()
      node.position.set(0.5 * sx, 1.05, 0.4)
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.22, 4, 8), bodyMat)
      arm.position.y = -0.12
      node.add(arm)
      bodyNode.add(node)
      return node
    }
    const armL = makeArm(-1)
    const armR = makeArm(1)

    // Sockets derived from geometry (the RIGS sockets drive the glTF path).
    const headSocket = new THREE.Object3D()
    headSocket.position.set(0, 0.42, 0.0) // top of head, head-local
    headNode.add(headSocket)
    const neckSocket = new THREE.Object3D()
    neckSocket.position.set(0, 1.02, 0.66)
    bodyNode.add(neckSocket)
    const backSocket = new THREE.Object3D()
    backSocket.position.set(0, 1.45, -0.1)
    bodyNode.add(backSocket)
    const sockets: SocketMap = { head: headSocket, back: backSocket, neck: neckSocket }

    // Species sizing via uniform scale (sockets/anim scale with it).
    root.scale.setScalar(rig.height / REF_HEIGHT)

    root.traverse((o) => {
      o.castShadow = true
      o.receiveShadow = false
    })

    return {
      root,
      species,
      bodyMaterials: [bodyMat],
      bellyMaterials: [bellyMat],
      sockets,
      height: rig.height,
      animNodes: { body: bodyNode, head: headNode, tail: tailNode, legL, legR, armL, armR },
    }
  }

  // ── glTF path (dormant until RIGS.url is set) ─────────────────────────────
  private async buildFromGLTF(species: Species, url: string): Promise<DinoParts> {
    const rig = RIGS[species]
    // url has no leading slash; resolve against the deploy base (BASE_URL is
    // '/' in dev and '/dino-dress-up/' on GitHub Pages) so it loads in both.
    const gltf: GLTF = await this.loader.loadGLTF(import.meta.env.BASE_URL + url)
    const root = cloneSkinned(gltf.scene) as THREE.Object3D
    root.name = `dino:${species}`

    // Normalize the model's native height to the rig's target world height —
    // the glTF analog of the procedural path's rig.height/REF_HEIGHT scaling —
    // so real assets (authored tens of units tall) drop in at the scale the
    // camera, world and accessory sockets expect.
    root.updateMatrixWorld(true)
    const bounds = new THREE.Box3().setFromObject(root, true)
    const nativeHeight = bounds.max.y - bounds.min.y
    if (nativeHeight > 1e-4) root.scale.setScalar(rig.height / nativeHeight)

    // Map each source material by NAME → recolorable body/belly toon material,
    // or a "kept" toon material that preserves the model's original colour
    // (eyes, mouth, frill, claws). This keeps the Quaternius dinos' built-in
    // multi-tone charm while still recolouring the body to the child's choice.
    // (Clone-on-edit: we build fresh toon materials, never mutate the cache.)
    const bodyMaterials: THREE.MeshToonMaterial[] = []
    const bellyMaterials: THREE.MeshToonMaterial[] = []
    const wantBody = new Set(rig.materialSlots.body)
    const wantBelly = new Set(rig.materialSlots.belly)
    const hasSlots = wantBody.size > 0 || wantBelly.size > 0
    root.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      const srcMats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      const mapped = srcMats.map((orig) => {
        const name = (orig as THREE.Material)?.name ?? ''
        if (wantBelly.has(name)) {
          const t = makeToonMaterial('#ffffff')
          bellyMaterials.push(t)
          return t
        }
        if (wantBody.has(name) || !hasSlots) {
          const t = makeToonMaterial('#ffffff')
          bodyMaterials.push(t)
          return t
        }
        // Kept material — toon-ify but preserve its authored colour.
        const c = (orig as THREE.MeshStandardMaterial)?.color
        return makeToonMaterial(c ? `#${c.getHexString()}` : '#cccccc')
      })
      mesh.material = Array.isArray(mesh.material) ? mapped : mapped[0]
    })

    // Bones → sockets (accessories follow animation for free).
    const sockets = {} as SocketMap
    ;(Object.keys(rig.bones) as (keyof typeof rig.bones)[]).forEach((slot) => {
      const socket = new THREE.Object3D()
      const off = rig.sockets[slot]
      socket.position.set(...off.position)
      socket.rotation.set(...off.rotation)
      socket.scale.setScalar(off.scale)
      const bone = root.getObjectByName(rig.bones[slot])
      ;(bone ?? root).add(socket)
      sockets[slot] = socket
    })

    // Animations → semantic actions.
    let mixer: THREE.AnimationMixer | undefined
    const actions: Partial<Record<'idle' | 'walk' | 'happy', THREE.AnimationAction>> = {}
    if (gltf.animations.length) {
      mixer = new THREE.AnimationMixer(root)
      const find = (clipName: string) =>
        gltf.animations.find((c) => c.name === clipName) ?? null
      const idle = find(rig.clips.idle)
      const walk = find(rig.clips.walk)
      const happy = find(rig.clips.happy) ?? idle // fallback per plan
      if (idle) actions.idle = mixer.clipAction(idle)
      if (walk) actions.walk = mixer.clipAction(walk)
      if (happy) actions.happy = mixer.clipAction(happy)
    }

    return { root, species, bodyMaterials, bellyMaterials, sockets, height: rig.height, mixer, actions }
  }
}
