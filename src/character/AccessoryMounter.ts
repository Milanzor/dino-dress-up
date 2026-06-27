/**
 * AccessoryMounter — attaches accessory meshes to a dino's per-slot sockets.
 *
 * Sockets are Object3D nodes positioned by DinoFactory from the RIGS manifest
 * (on real glTF they hang off skeleton bones, so accessories follow head/back
 * animation for free). v1 accessories are tiny procedural meshes built here;
 * dropping in real Kenney .glb props later means changing only `buildMesh`.
 */

import * as THREE from 'three'
import {
  ACCESSORIES,
  type AccessoryChoice,
  type AccessorySlot,
} from './CharacterConfig'
import { makeToonMaterial } from './Recolor'

export type SocketMap = Record<AccessorySlot, THREE.Object3D>

function defFor(id: string) {
  return ACCESSORIES.find((a) => a.id === id)
}

/** Build a small procedural mesh for an accessory id, or null for 'none'. */
function buildMesh(id: string): THREE.Object3D | null {
  const def = defFor(id)
  if (!def || id === 'none') return null
  const color = def.color ?? '#ffd93d'
  const mat = makeToonMaterial(color)
  const group = new THREE.Group()
  group.name = `accessory:${id}`

  switch (id) {
    case 'sunhat': {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 20), mat)
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.3, 20), mat)
      top.position.y = 0.16
      group.add(brim, top)
      break
    }
    case 'crown': {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 16, 1, true), mat)
      group.add(band)
      const spikes = 8
      for (let i = 0; i < spikes; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 8), mat)
        const a = (i / spikes) * Math.PI * 2
        spike.position.set(Math.cos(a) * 0.3, 0.14, Math.sin(a) * 0.3)
        group.add(spike)
      }
      break
    }
    case 'raincape': {
      const cape = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 16, 1, true, 0, Math.PI), mat)
      cape.rotation.x = Math.PI / 2
      cape.rotation.z = Math.PI
      mat.side = THREE.DoubleSide
      group.add(cape)
      break
    }
    case 'explorerpack': {
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.25), mat)
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.27), makeToonMaterial('#7a4e2a'))
      flap.position.y = 0.16
      group.add(pack, flap)
      break
    }
    case 'scarf': {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.09, 10, 20), mat)
      ring.rotation.x = Math.PI / 2
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.05), mat)
      tail.position.set(0.1, -0.2, 0.18)
      group.add(ring, tail)
      break
    }
    default:
      return null
  }
  group.traverse((o) => {
    o.castShadow = true
  })
  return group
}

/** Remove whatever is mounted in a socket (sockets hold only accessories). */
function clearSocket(socket: THREE.Object3D): void {
  for (let i = socket.children.length - 1; i >= 0; i--) {
    const child = socket.children[i]
    socket.remove(child)
    child.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
    })
  }
}

/**
 * Sync the mounted accessories to match the config: clears every slot, then
 * mounts the chosen non-'none' accessories. Cheap enough to run live in the
 * creator on every edit.
 */
export function syncAccessories(
  sockets: SocketMap,
  accessories: AccessoryChoice[],
): void {
  // Clear all known slots first so deselecting removes the mesh.
  ;(Object.keys(sockets) as AccessorySlot[]).forEach((slot) => clearSocket(sockets[slot]))

  for (const choice of accessories) {
    if (choice.id === 'none') continue
    const socket = sockets[choice.slot]
    if (!socket) continue
    const mesh = buildMesh(choice.id)
    if (mesh) socket.add(mesh)
  }
}
