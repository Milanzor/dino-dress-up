/**
 * compile-ink.mjs — compile the authored Ink source to JSON.
 *
 * Uses inkjs's bundled compiler (the `inkjs/full` build). The story is a single
 * file (no INCLUDEs), so a plain single-file compile is sufficient. Run via
 * `npm run compile-ink` (also wired to predev/prebuild).
 *
 * Reads:  src/story/ink/story.ink
 * Writes: src/story/story.json
 */

import { Compiler } from 'inkjs/full'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const INPUT = resolve(ROOT, 'src/story/ink/story.ink')
const OUTPUT = resolve(ROOT, 'src/story/story.json')

try {
  const source = readFileSync(INPUT, 'utf8')

  const story = new Compiler(source).Compile()
  const json = story.ToJson()
  if (!json) {
    throw new Error('Compiler produced empty JSON output')
  }

  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, json, 'utf8')

  const bytes = Buffer.byteLength(json, 'utf8')
  console.log(`✓ Ink compiled: ${INPUT} → ${OUTPUT} (${bytes} bytes)`)
} catch (err) {
  console.error('✗ Ink compilation failed:')
  console.error(err instanceof Error ? (err.stack ?? err.message) : String(err))
  process.exit(1)
}
