/**
 * inspect-glb.mjs — list the names that the RIGS manifest needs to reference.
 *
 * Parses a binary glTF (.glb) container WITHOUT a browser or three.js: reads the
 * 12-byte header, walks the chunks, and decodes the first (JSON) chunk. Prints
 * materials, meshes, nodes, skin joints (bone names) and animations, plus a
 * rough world-space bounding box / height estimated from accessor min/max.
 *
 * Usage: node tools/inspect-glb.mjs public/models/rex.glb [more.glb ...]
 */

import { readFileSync } from 'node:fs'

function parseGlb(path) {
  const buf = readFileSync(path)
  const magic = buf.toString('ascii', 0, 4)
  if (magic !== 'glTF') throw new Error(`${path}: not a glb (magic=${magic})`)
  const version = buf.readUInt32LE(4)
  const totalLen = buf.readUInt32LE(8)

  let offset = 12
  let json = null
  while (offset < totalLen) {
    const chunkLen = buf.readUInt32LE(offset)
    const chunkType = buf.toString('ascii', offset + 4, offset + 8)
    const start = offset + 8
    if (chunkType === 'JSON') {
      json = JSON.parse(buf.toString('utf8', start, start + chunkLen))
    }
    offset = start + chunkLen
  }
  if (!json) throw new Error(`${path}: no JSON chunk`)
  return { version, json }
}

/** Estimate a world-space bbox from POSITION accessor min/max (node transforms
 *  ignored — good enough to eyeball the model's height in its own units). */
function estimateHeight(json) {
  let lo = [Infinity, Infinity, Infinity]
  let hi = [-Infinity, -Infinity, -Infinity]
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      const a = json.accessors?.[prim.attributes?.POSITION]
      if (!a?.min || !a?.max) continue
      for (let i = 0; i < 3; i++) {
        lo[i] = Math.min(lo[i], a.min[i])
        hi[i] = Math.max(hi[i], a.max[i])
      }
    }
  }
  if (!isFinite(lo[0])) return null
  return { min: lo, max: hi, size: hi.map((h, i) => +(h - lo[i]).toFixed(3)) }
}

for (const path of process.argv.slice(2)) {
  const { version, json } = parseGlb(path)
  console.log(`\n=========== ${path}  (glTF v${version}) ===========`)

  console.log('materials:', (json.materials ?? []).map((m) => m.name))
  console.log('meshes:', (json.meshes ?? []).map((m) => m.name))

  const nodes = json.nodes ?? []
  console.log('nodes:', nodes.map((n) => n.name))

  for (const [i, skin] of (json.skins ?? []).entries()) {
    const joints = (skin.joints ?? []).map((j) => nodes[j]?.name ?? `#${j}`)
    console.log(`skin[${i}] joints (${joints.length}):`, joints)
  }

  console.log('animations:', (json.animations ?? []).map((a) => a.name))

  const bbox = estimateHeight(json)
  if (bbox) console.log('bbox size [x,y,z]:', bbox.size, ' (height≈', bbox.size[1], ')')
}
