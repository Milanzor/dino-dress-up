#!/usr/bin/env node
// Generate Dutch voiceover .ogg files for each manifest clip using Piper TTS.
//
// Usage:
//   node tools/generate-vo.mjs
//
// Requires (downloaded into /tmp, NOT committed):
//   - Piper binary + shared libs   (PIPER_BIN, default /tmp/piper/piper/piper)
//   - A Dutch .onnx voice model     (PIPER_MODEL, default /tmp/piper/voice/model.onnx)
//   - ffmpeg on PATH
//
// It reads the Dutch `text` for every clip out of src/audio/AudioManifest.ts,
// synthesises a WAV with Piper, then transcodes to a small mono OGG Vorbis
// file at public/audio/<id>.ogg. Clips without text (ambient_*/sfx_*) are
// skipped. Existing CLIPS shape/exports are never modified by this script.

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, existsSync, statSync, rmSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolvePath(__dirname, '..')

// --- Configuration (override via env vars) ---------------------------------
const PIPER_BIN = process.env.PIPER_BIN || '/tmp/piper/piper/piper'
const PIPER_MODEL = process.env.PIPER_MODEL || '/tmp/piper/voice/model.onnx'
const PIPER_LIB_DIR = process.env.PIPER_LIB_DIR || dirname(PIPER_BIN)
const MANIFEST = resolvePath(repoRoot, 'src/audio/AudioManifest.ts')
const OUT_DIR = resolvePath(repoRoot, 'public/audio')
const TMP_WAV = '/tmp/piper-vo.wav'

// --- Sanity checks ---------------------------------------------------------
for (const [label, p] of [['Piper binary', PIPER_BIN], ['Voice model', PIPER_MODEL]]) {
  if (!existsSync(p)) {
    console.error(`ERROR: ${label} not found at ${p}. Set the matching env var.`)
    process.exit(1)
  }
}

// --- Extract clip id + Dutch text from the manifest ------------------------
const source = readFileSync(MANIFEST, 'utf8')

// Match `id: { ... text: '...' ... }` across one clip object (no nested braces
// occur inside a clip, so a non-greedy [^}]* body is sufficient here).
const clipRe = /(\w+):\s*\{[^}]*?text:\s*'((?:[^'\\]|\\.)*)'[^}]*?\}/g
const clips = []
let m
while ((m = clipRe.exec(source)) !== null) {
  const id = m[1]
  // Un-escape any escaped quotes captured from the TS string literal.
  const text = m[2].replace(/\\'/g, "'").trim()
  if (text) clips.push({ id, text })
}

if (clips.length === 0) {
  console.error('ERROR: no clips with text found in manifest — aborting.')
  process.exit(1)
}

mkdirSync(OUT_DIR, { recursive: true })

const env = { ...process.env, LD_LIBRARY_PATH: `${PIPER_LIB_DIR}:${process.env.LD_LIBRARY_PATH || ''}` }

let generated = 0
const failed = []

for (const { id, text } of clips) {
  const outOgg = resolvePath(OUT_DIR, `${id}.ogg`)
  try {
    // 1) Piper: text on stdin -> WAV.
    execFileSync(PIPER_BIN, ['-m', PIPER_MODEL, '-f', TMP_WAV], {
      input: text,
      env,
      stdio: ['pipe', 'ignore', 'ignore'],
    })

    // 2) ffmpeg: WAV -> small mono OGG Vorbis.
    execFileSync(
      'ffmpeg',
      ['-y', '-i', TMP_WAV, '-ac', '1', '-ar', '22050', '-c:a', 'libvorbis', '-q:a', '3', outOgg],
      { stdio: 'ignore' },
    )

    const size = statSync(outOgg).size
    generated++
    console.log(`  ok  ${id}.ogg  (${(size / 1024).toFixed(1)} KB)`)
  } catch (err) {
    failed.push(id)
    console.error(`  FAIL ${id}: ${err.message?.split('\n')[0] ?? err}`)
  }
}

try {
  rmSync(TMP_WAV, { force: true })
} catch {}

const totalText = clips.length
const skipped = (source.match(/(ambient_\w+|sfx_\w+):/g) || []).length
console.log('')
console.log(`Generated: ${generated}/${totalText} clips with text`)
console.log(`Skipped (no text, ambient_*/sfx_*): ${skipped}`)
if (failed.length) console.log(`Failed: ${failed.join(', ')}`)
console.log(`Clip ids: ${clips.map((c) => c.id).join(' ')}`)
